import { Injectable } from "@nestjs/common";
import { Observable, Subscription } from "rxjs";
import { RepoService } from "src/database/service/repo/repo.service";
import { LlmService } from "src/llm";
import { TyphoonService } from "src/typhoon/service/typhoon.service";
import { TyphoonTwoDto } from "src/typhoon/domain/typhoon.two.dto";
import { AlertAnalyzerDto } from "../domain/alert-analyzer.dto";
import { AnalyzerEvent } from "../domain/alert-analyzer.types";
import { CaseMatcherService, CaseTrackPoint } from "./case-matcher.service";
import { buildAnalyzerMessages } from "./analyzer.prompt";

/**
 * 研判编排服务（M3 步骤 13）
 *
 * 流水线：获取当前台风（dto.tfid → typhoontwos 集合；否则取当前指挥关联台风）
 *  → case-matcher 相似案例匹配（Top-3）→ 先发 analysis 结构化事件（研判卡片）
 *  → 组装防编造 prompt → LlmService 流式生成（透传 thinking/token/usage）。
 *
 * 已知限制（步骤 11 审查结论，勿回退）：
 *  - 实时轨迹优先传含 wind_speed/speed（m/s）的完整轨迹；只传早期短轨迹时 case-matcher
 *    生命周期归一化可能误排——相似案例是参考，不是确定性研判。
 *  - affectedLines（线路空间研判）由 M4 填充，M3 阶段为空数组。
 */
@Injectable()
export class AnalyzerService {
    constructor(
        private readonly llmService: LlmService,
        private readonly caseMatcher: CaseMatcherService,
        private readonly typhoonService: TyphoonService,
        private readonly repo: RepoService,
    ) {}

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

                    // 3. 先发 analysis 结构化事件（研判卡片；affectedLines 由 M4 填充）
                    subscriber.next({
                        type: "analysis",
                        data: {
                            affectedLines: [],
                            levelSuggestion: null,
                            similarCases: similarCases.map(c => ({
                                caseId: c.caseId,
                                caseName: c.caseName,
                                score: c.score,
                                reason: c.reason,
                            })),
                        },
                    });

                    // 4. 组装防编造 prompt 并流式生成
                    subscriber.next({ type: "status", data: "正在生成研判报告…" });
                    if (dto.autoRun === false) {
                        subscriber.complete();
                        return;
                    }
                    const messages = buildAnalyzerMessages(typhoon, similarCases, dto.question);
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
