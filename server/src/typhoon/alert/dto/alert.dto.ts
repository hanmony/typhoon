import { ApiProperty } from "@nestjs/swagger";

/** 风圈四象限半径（对应前端 ITyphoonRadius） */
export class TyphoonRadiusDto {
    ne: number = 0;
    se: number = 0;
    sw: number = 0;
    nw: number = 0;
}

/** 台风状态（对应前端 ITyphoonState，精简版） */
export class TyphoonStateDto {
    center: [number, number] = [0, 0];
    lon: number = 0;
    lat: number = 0;
    time: Date = new Date();
    timeString: string = "";
    speed: number = 0;
    level: number = 0;
    centerPressure: number = 0;
    radius: TyphoonRadiusDto[] = [];
    strong: string = "";
    tendency: string = "";
    direction: string = "";
    info: string = "";
    power: string = "";
}

/** 天气类型→英文标识映射 */
export const WEATHER_TYPE_MAP: Record<string, string> = {
    台风: "typhoon",
    暴雨: "rain",
    暴雪: "snow",
    大风: "wind",
    道路结冰: "ice",
    冰雹: "hail",
    霜冻: "frost",
    雷电: "thunder",
    大雾: "fog",
    寒潮: "cold",
    低温: "lowtemp",
    高温: "hightemp",
    霾: "haze",
};

/** 告警颜色等级 */
export type AlertLevel = "red" | "orange" | "yellow" | "blue" | "lift" | "unknown";

/** 告警条目 */
export class AlertItemDto {
    @ApiProperty({ description: "天气类型英文标识，如 typhoon/rain/snow" })
    type: string = "";

    @ApiProperty({ description: "天气类型中文标签" })
    typeLabel: string = "";

    @ApiProperty({ description: "颜色等级，如 red/orange/yellow/blue/lift" })
    level: AlertLevel = "unknown";

    @ApiProperty({ description: "颜色等级中文标签" })
    levelLabel: string = "";

    @ApiProperty({ description: "告警标题" })
    title: string = "";

    @ApiProperty({ description: "告警状态：active/lifted" })
    status: string = "active";

    @ApiProperty({ description: "发布时间" })
    issuedAt: string = "";

    @ApiProperty({ description: "解除时间，未解除为 null" })
    liftedAt: string | null = null;

    @ApiProperty({ description: "防御指引" })
    defenseGuideline: string = "";
}

/** 风圈状态 */
export class WindCircleStatusDto {
    @ApiProperty({ description: "风圈是否与上海重叠（当前最近轨迹点）" })
    isOverlapping: boolean = false;

    @ApiProperty({ description: "台风中心坐标 [lat, lng]" })
    center: [number, number] = [0, 0];

    @ApiProperty({ description: "历史路径中风圈是否曾经与上海重叠" })
    everOverlapped: boolean = false;
}

/** 台风信息 */
export class TyphoonInfoDto {
    @ApiProperty({ description: "台风中文名" })
    name: string = "";

    @ApiProperty({ description: "台风英文名" })
    enName: string = "";

    @ApiProperty({ description: "台风中心 [lat, lng]" })
    center: [number, number] = [0, 0];

    @ApiProperty({ description: "移动速度（公里/小时）" })
    speed: number = 0;

    @ApiProperty({ description: "移动方向" })
    direction: string = "";

    @ApiProperty({ description: "强度" })
    strong: string = "";

    @ApiProperty({ description: "中心气压（百帕）" })
    pressure: number = 0;

    @ApiProperty({ description: "七级风圈半径" })
    radius7: TyphoonRadiusDto = new TyphoonRadiusDto();

    @ApiProperty({ description: "十级风圈半径" })
    radius10: TyphoonRadiusDto = new TyphoonRadiusDto();

    @ApiProperty({ description: "十二级风圈半径" })
    radius12: TyphoonRadiusDto = new TyphoonRadiusDto();

    @ApiProperty({ description: "强度趋势" })
    tendency: string = "";
}

/** 预测摘要（精简版，供 Agent 生成自然语言） */
export class PredictionSummaryDto {
    @ApiProperty({ description: "台风中心 [lat, lng]" })
    center: [number, number] = [0, 0];

    @ApiProperty({ description: "预测时间" })
    time: string = "";

    @ApiProperty({ description: "移动速度（公里/小时）" })
    speed: number = 0;

    @ApiProperty({ description: "移动方向" })
    direction: string = "";

    @ApiProperty({ description: "强度" })
    strong: string = "";
}

/** 预测条目（登陆点或影响时间） */
export class PredictionItemDto {
    @ApiProperty({ description: "时态标记：future=尚未发生，past=已经过去" })
    status: "future" | "past" = "future";

    @ApiProperty({ description: "预测时间" })
    time: string = "";

    @ApiProperty({ description: "预测坐标 [lat, lng]，仅登陆点有" })
    point: [number, number] | null = null;

    @ApiProperty({ description: "预测时的台风状态摘要" })
    typhoonState: PredictionSummaryDto | null = null;
}

/** 预测信息 */
export class PredictionDto {
    @ApiProperty({ description: "预测登陆信息，台风不经过上海时为 null" })
    landing: PredictionItemDto | null = null;

    @ApiProperty({ description: "预测风圈影响时间，无重叠时为 null" })
    overlay: PredictionItemDto | null = null;
}

/** 时间上下文 */
export class TimeContextDto {
    @ApiProperty({ description: "查询时间" })
    queryTime: string = "";

    @ApiProperty({ description: "是否为模拟模式" })
    isSimulation: boolean = false;

    @ApiProperty({ description: "模拟开始时间（仅模拟模式）" })
    simulateStartTime: string | null = null;

    @ApiProperty({ description: "指挥开始时间" })
    commandStartTime: string = "";

    @ApiProperty({ description: "台风风圈是否已离开上海（当前未重叠且历史曾重叠）" })
    windCircleClearedShanghai: boolean = false;
}

/** GET /typhoon/alert/current 响应 */
export class AlertCurrentResponseDto {
    @ApiProperty({ description: "当前生效的告警列表", type: [AlertItemDto] })
    alerts: AlertItemDto[] = [];

    @ApiProperty({ description: "台风信息，无活跃台风时为 null" })
    typhoon: TyphoonInfoDto | null = null;

    @ApiProperty({ description: "风圈状态" })
    windCircle: WindCircleStatusDto = new WindCircleStatusDto();

    @ApiProperty({ description: "时间上下文" })
    timeContext: TimeContextDto = new TimeContextDto();

    @ApiProperty({ description: "预测信息（登陆点 + 影响时间），无预测时为 null" })
    prediction: PredictionDto | null = null;
}
