declare namespace ExtremeCommand {
  export interface InfoItem {
    name: string;
    startTime: string;
    status: number;
    isSimulated: number;
    /** 模拟开始时间 */
    simulateStartTime: string;
    /** 市级应急等级 */
    municipalDegree: string;
    /** 市级应急开关 */
    municipalFlag: number;
    /** 集团级应急等级 */
    corporateDegree: string;
    /** 集团级应急开关 */
    corporateFlag: number;
  }
  export type InfoResponse = InfoItem[];

  export interface TyphoonCommandDetail {
    // @ApiProperty({ description: "指挥基本信息" })
    doc: InfoItem;

    // @ApiProperty({ description: "灾害天气列表" })
    typhoon: ExternalTyphoonWeb.ActiveTyphoonInfo;

    // @ApiProperty({ description: "台风值班列表" })
    typhoonDutys: Extreme.DutyItem[];

    // @ApiProperty({ description: "台风事件列表" })
    typhoonExtremeEvents: ExtremeOcc.Event[];

    // @ApiProperty({ description: "台风消息列表" })
    typhoonExtremeMessages: Extreme.Notification[];

    // @ApiProperty({ description: "台风运营调整列表" })
    typhoonExtremeOperations: ExtremeOcc.Operation[];

    // @ApiProperty({ description: "台风巡道列表" })
    typhoonPatrollings: PatrollingType.TourDto[];

    // @ApiProperty({ description: "灾害天气列表" })
    severeWeathers: Extreme.WeatherAlertDto[];
  }
}
