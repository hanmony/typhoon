import { Injectable, Logger } from "@nestjs/common";
import { TyphoonService } from "src/typhoon/service/typhoon.service";
import { TyphoonTwoDto } from "src/typhoon/domain/typhoon.two.dto";
import { TyphoonTwoTrackDto } from "src/typhoon/domain/typhoon.two.track.dto";
import { TyphoonTwoLandDto } from "src/typhoon/domain/typhoon.two.land.dto";
import { IToolDefinition, IToolExecutor } from "./tool.interface";
import { ToolExecutionResult } from "../domain/agent.types";

@Injectable()
export class GetTyphoonHistoryTool implements IToolExecutor {
    private readonly logger = new Logger(GetTyphoonHistoryTool.name);

    /** tfid 模式下路径概览最多返回的中间点数量 */
    private static readonly MAX_OVERVIEW_POINTS = 8;

    public static readonly definition: IToolDefinition = {
        type: "function",
        function: {
            name: "get_typhoon_history",
            description:
                "查询指定年份的历史台风列表（台风编号、名称、起止时间、登陆信息）。当用户询问历史台风、往年台风情况、特定台风编号的详细信息时使用此工具。",
            parameters: {
                type: "object",
                properties: {
                    year: {
                        type: "number",
                        description: "年份，如 2024",
                    },
                    tfid: {
                        type: "string",
                        description: "台风编号，可选，传入则只返回该台风的路径摘要",
                    },
                },
                required: ["year"],
            },
        },
    };

    constructor(private readonly typhoonService: TyphoonService) {}

    async execute(args: Record<string, any>): Promise<ToolExecutionResult> {
        try {
            const year = Number(args.year);
            if (!year || Number.isNaN(year)) {
                return {
                    success: false,
                    data: JSON.stringify({ message: "缺少有效的年份参数（year，如 2024）" }),
                };
            }

            const list = await this.typhoonService.getHistory(year);
            const tfid = args.tfid as string | undefined;
            const typhoons = tfid ? list.filter(t => t.tfid === tfid) : list;

            if (!typhoons || typhoons.length === 0) {
                return {
                    success: true,
                    data: JSON.stringify({
                        message: `${year} 年${tfid ? `（台风编号 ${tfid}）` : ""}无历史台风记录。`,
                    }),
                };
            }

            const summary = typhoons.map(t => this.summarizeTyphoon(t, !!tfid));
            return {
                success: true,
                data: JSON.stringify({
                    count: summary.length,
                    note: "台风路径点已做摘要处理（首末点与峰值点），详细路径可在大屏查看。",
                    typhoons: summary,
                }),
            };
        } catch (err) {
            this.logger.error(`get_typhoon_history error: ${(err as Error).message}`);
            return {
                success: false,
                data: JSON.stringify({ error: `查询历史台风失败: ${(err as Error).message}` }),
            };
        }
    }

    /**
     * 将单个台风摘要化为 LLM 可消费的结构。
     * 路径点可能数百个，只保留首末点、峰值点与（tfid 模式下）均匀采样的中间点。
     */
    private summarizeTyphoon(t: TyphoonTwoDto, includePath: boolean): Record<string, any> {
        const tracks = t.tracks || [];
        const peak = this.findPeak(tracks);
        const summary: Record<string, any> = {
            tfid: t.tfid,
            name: t.name,
            name_en: t.name_en,
            starttime: t.starttime,
            endtime: t.endtime,
            is_active: t.is_active,
            peak: peak,
            lands: (t.lands || []).map(l => this.summarizeLand(l)),
        };

        if (includePath && tracks.length > 0) {
            summary.path = {
                pointCount: tracks.length,
                first: this.summarizePoint(tracks[0]),
                last: this.summarizePoint(tracks[tracks.length - 1]),
                overview: this.sampleOverview(tracks),
            };
        }
        return summary;
    }

    /** 峰值信息：最大风速与最低气压（各取其所在时刻） */
    private findPeak(tracks: TyphoonTwoTrackDto[]): Record<string, any> | null {
        let maxWind: TyphoonTwoTrackDto | null = null;
        let minPressure: TyphoonTwoTrackDto | null = null;
        for (const tr of tracks) {
            const wind = parseFloat(tr.wind_speed);
            const pressure = parseFloat(tr.pressure);
            if (!Number.isNaN(wind) && (!maxWind || wind > parseFloat(maxWind.wind_speed))) {
                maxWind = tr;
            }
            if (!Number.isNaN(pressure) && (!minPressure || pressure < parseFloat(minPressure.pressure))) {
                minPressure = tr;
            }
        }
        if (!maxWind && !minPressure) {
            return null;
        }
        return {
            max_wind: maxWind
                ? {
                      wind_speed: maxWind.wind_speed,
                      wind_class: maxWind.wind_class,
                      level: maxWind.level,
                      time: maxWind.data_time,
                  }
                : null,
            min_pressure: minPressure
                ? {
                      pressure: minPressure.pressure,
                      time: minPressure.data_time,
                  }
                : null,
        };
    }

    /** 路径点摘要（经纬度、风级、气压、参考位置、时间） */
    private summarizePoint(tr: TyphoonTwoTrackDto): Record<string, any> {
        return {
            time: tr.data_time,
            lat: tr.lat,
            lon: tr.lon,
            wind_class: tr.wind_class,
            wind_speed: tr.wind_speed,
            pressure: tr.pressure,
            ck_position: tr.ck_position,
        };
    }

    /** 长路径均匀采样中间点（不含首末），用于描述大致走向 */
    private sampleOverview(tracks: TyphoonTwoTrackDto[]): Record<string, any>[] {
        const n = tracks.length;
        if (n <= 2) {
            return [];
        }
        const count = Math.min(GetTyphoonHistoryTool.MAX_OVERVIEW_POINTS, n - 2);
        const step = (n - 1) / (count + 1);
        const overview: Record<string, any>[] = [];
        for (let i = 1; i <= count; i++) {
            overview.push(this.summarizePoint(tracks[Math.round(i * step)]));
        }
        return overview;
    }

    private summarizeLand(l: TyphoonTwoLandDto): Record<string, any> {
        return {
            level: l.level,
            land_time: l.land_time,
            land_adr: l.land_adr,
            land_info: l.land_info,
        };
    }
}
