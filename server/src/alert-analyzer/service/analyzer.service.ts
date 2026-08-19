import { Injectable } from "@nestjs/common";
import { Observable, Subscription } from "rxjs";
import { RepoService } from "src/database/service/repo/repo.service";
import { LlmService } from "src/llm";
import { TyphoonService } from "src/typhoon/service/typhoon.service";
import { TyphoonTwoDto } from "src/typhoon/domain/typhoon.two.dto";
import { WindCircleService } from "src/typhoon/alert/wind-circle.service";
import { TyphoonStateDto } from "src/typhoon/alert/dto/alert.dto";
import { AlertAnalyzerDto } from "../domain/alert-analyzer.dto";
import { AnalyzerEvent, AnalysisLineImpact } from "../domain/alert-analyzer.types";
import { CaseMatcherService, CaseTrackPoint } from "./case-matcher.service";
import { LineImpactService, LineImpactResult, WindCircleRadiusIndex } from "./line-impact.service";
import { buildAnalyzerMessages } from "./analyzer.prompt";

/**
 * 研判编排服务（M3 步骤 13 + M4 步骤 17）
 *
 * 流水线：获取当前台风（dto.tfid → typhoontwos 集合；否则取当前指挥关联台风）
 *  → case-matcher 相似案例匹配（Top-3）
 *  → line-impact 线路空间研判（7/10/12 级风圈分级，按线路命中的最高等级定风险）
 *  → 先发 analysis 结构化事件（研判卡片：affectedLines + similarCases）
 *  → 组装防编造 prompt → LlmService 流式生成（透传 thinking/token/usage）。
 *
 * 已知限制（步骤 11/16 审查结论，勿回退）：
 *  - 相似案例是参考，不是确定性研判；短轨迹可能误排。
 *  - **进入 7 级风圈仅表示可能受影响，不能直接等同于高风险或停运建议**；
 *    风险等级仅供调度参考，最终决策由调度人员结合实际情况作出。
 *  - 实时模式必须先经 getPredictPath() 取得预报状态再分析；只对历史 tracks 加
 *    fromTime 不会凭空产生未来轨迹。
 */
@Injectable()
export class AnalyzerService {
    constructor(
        private readonly llmService: LlmService,
        private readonly caseMatcher: CaseMatcherService,
        private readonly typhoonService: TyphoonService,
        private readonly repo: RepoService,
        private readonly lineImpact: LineImpactService,
        private readonly windCircle: WindCircleService,
    ) {}

    /** 风圈等级与风险标签：12 级→高风险、10 级→中风险、仅 7 级→可能受影响（非停运建议） */
    private static readonly RISK_BY_RADIUS_INDEX: Record<WindCircleRadiusIndex, string> = {
        0: "可能受影响（7级风圈）",
        1: "中风险（10级风圈）",
        2: "高风险（12级风圈）",
    };
    /** 分级顺序：从最高等级（12 级）向低找命中 */
    private static readonly RADIUS_LEVELS: { index: WindCircleRadiusIndex; level: 7 | 10 | 12 }[] = [
        { index: 2, level: 12 },
        { index: 1, level: 10 },
        { index: 0, level: 7 },
    ];

    /** 研判 SSE 流 */
    streamAnalysis(dto: AlertAnalyzerDto): Observable<AnalyzerEvent> {
        return new Observable(subscriber => {
            let cancelled = false;
            let llmSubscription: Subscription | undefined;
            (async () => {
                try {
                    // 1. 获取当前台风
                    subscriber.next({ type: "status", data: "正在获取当前台风信息…" });
                    const typhoon = await this.resolveTyphoon(dto);
                    if (cancelled || subscriber.closed) return;
                    if (!typhoon) {
                        throw new Error("未找到当前台风：请传入 tfid 或先建立指挥后再研判");
                    }
                    const trackPoints = this.extractTrackPoints(typhoon);
                    if (cancelled || subscriber.closed) return;
                    if (!trackPoints.length) {
                        throw new Error("当前台风轨迹为空，无法进行案例匹配研判");
                    }

                    // 2. 相似案例匹配
                    subscriber.next({ type: "status", data: "正在匹配历史相似案例…" });
                    const similarCases = await this.caseMatcher.match(trackPoints, 3);
                    if (cancelled || subscriber.closed) return;

                    // 3. 线路空间研判（7/10/12 级分级，按最高等级定风险）
                    subscriber.next({ type: "status", data: "正在研判线路影响…" });
                    const affectedLines = this.computeLineImpact(typhoon);
                    if (cancelled || subscriber.closed) return;

                    // 4. 先发 analysis 结构化事件（研判卡片）
                    subscriber.next({
                        type: "analysis",
                        data: {
                            affectedLines,
                            levelSuggestion: null,
                            similarCases: similarCases.map(c => ({
                                caseId: c.caseId,
                                caseName: c.caseName,
                                score: c.score,
                                reason: c.reason,
                            })),
                        },
                    });

                    // 5. 组装防编造 prompt 并流式生成
                    subscriber.next({ type: "status", data: "正在生成研判报告…" });
                    if (dto.autoRun === false) {
                        subscriber.complete();
                        return;
                    }
                    const messages = buildAnalyzerMessages(typhoon, similarCases, affectedLines, dto.question);
                    const stream$ = this.llmService.chatStream(messages);
                    llmSubscription = stream$.subscribe({
                        next: ev => {
                            // 研判不调用工具：丢弃 tool_call 事件，其余（thinking/token/usage）透传
                            if (ev.type === "tool_call") return;
                            subscriber.next(ev);
                        },
                        error: err => subscriber.error(err),
                        complete: () => subscriber.complete(),
                    });
                } catch (err) {
                    if (!cancelled && !subscriber.closed) subscriber.error(err);
                }
            })();
            return () => {
                cancelled = true;
                llmSubscription?.unsubscribe();
            };
        });
    }

    /**
     * 线路空间研判：7/10/12 级风圈分别计算，按线路命中的最高等级定风险标签。
     * 实时模式先经 getPredictPath() 取预报状态再合并分析（只对历史 tracks 加 fromTime 无意义）。
     * 无轨迹/无风圈数据时返回 []。
     */
    private computeLineImpact(typhoon: TyphoonTwoDto): AnalysisLineImpact[] {
        // 统一转 points（新 schema tracks 或旧 schema points）
        let points: any[] = [];
        if (Array.isArray(typhoon.tracks)) {
            points = this.windCircle.transformActiveTyphoonToPoints(typhoon);
        } else if (Array.isArray((typhoon as any).points)) {
            points = (typhoon as any).points;
        }
        if (!points.length) return [];

        // 历史状态 + 预报状态（getPredictPath 失败时仅用历史，不阻断研判）
        const historical = this.windCircle.transformPointsToStates(points);
        let future: TyphoonStateDto[] = [];
        try {
            const withPoints = { ...typhoon, points };
            future = this.windCircle.getPredictPath(withPoints, false, new Date());
        } catch {
            future = [];
        }
        const states = [...historical, ...future];
        if (!states.length) return [];

        // 7/10/12 级各跑一次
        const perLevel: LineImpactResult[][] = AnalyzerService.RADIUS_LEVELS.map(({ index }) =>
            this.lineImpact.analyzeStates(states, { radiusIndex: index }),
        );
        const hitLines = new Set<string>();
        for (const results of perLevel) for (const r of results) hitLines.add(r.line);

        const affected: AnalysisLineImpact[] = [];
        for (const line of hitLines) {
            // RADIUS_LEVELS 已按 12→7 排序，第一个命中即最高等级
            for (let i = 0; i < perLevel.length; i++) {
                const hit = perLevel[i].find(r => r.line === line);
                if (!hit) continue;
                affected.push({
                    line,
                    period: this.formatWindow(hit.windowStart, hit.windowEnd),
                    riskLevel: AnalyzerService.RISK_BY_RADIUS_INDEX[AnalyzerService.RADIUS_LEVELS[i].index],
                });
                break;
            }
        }
        return affected;
    }

    private formatWindow(start?: Date, end?: Date): string {
        if (!start || !end) return "";
        const fmt = (d: Date) => {
            const pad = (n: number) => String(n).padStart(2, "0");
            return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        return `${fmt(start)} ~ ${fmt(end)}`;
    }

    /** 解析当前台风：优先 dto.tfid（typhoontwos 集合），否则当前指挥关联台风 */
    private async resolveTyphoon(dto: AlertAnalyzerDto): Promise<TyphoonTwoDto | null> {
        const requestedTfid = dto.tfid?.trim();
        if (requestedTfid) {
            const doc = await this.repo.typhoonTwos.findOne({ tfid: requestedTfid }).exec();
            if (doc) {
                return TyphoonTwoDto.fromDoc(doc);
            }
            // An explicit tfid is authoritative; never silently analyze a different command typhoon.
            return null;
        }
        const cmd = await this.typhoonService.getCommandTyphoon();
        if (cmd?.name) {
            return cmd;
        }
        return null;
    }

    /** 实时轨迹 → case-matcher 输入（lon/lat 字符串、wind_speed m/s 直读） */
    private extractTrackPoints(typhoon: TyphoonTwoDto): CaseTrackPoint[] {
        const toNumber = (value: unknown): number | null => {
            if (value === null || value === undefined) return null;
            if (typeof value === "string" && !value.trim()) return null;
            const n = typeof value === "number" ? value : Number(value);
            return Number.isFinite(n) ? n : null;
        };
        const points = (typhoon.tracks || [])
            .map(t => {
                const lon = toNumber(t.lon);
                const lat = toNumber(t.lat);
                const speed = toNumber(t.wind_speed);
                if (lon === null || lat === null || lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
                const point: CaseTrackPoint = {
                    longitude: lon,
                    latitude: lat,
                    time: t.data_time,
                    windSpeedMps: Number.isFinite(speed) ? speed : undefined,
                };
                return point;
            })
            .filter((p): p is CaseTrackPoint => p !== null);
        return points.sort((a, b) => {
            const ta = new Date(a.time as any).getTime();
            const tb = new Date(b.time as any).getTime();
            if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
            return 0;
        });
    }
}
