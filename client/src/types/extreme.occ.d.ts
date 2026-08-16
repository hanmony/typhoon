declare namespace ExtremeOcc {
  export interface EventAddParams {
    line: string;
    eventType: string;
    otherEvent: string;
    locationType: string;
    startStation: string;
    endStation: string;
    customPosition: string;
    direction: string;
    description: string;
    severity: number;
    urgentRepair: number;
    images: string[];
    startTime: string;
    effect: number;
    effectDuration: number;
    source: string;
  }

  export interface Event extends EventAddParams {
    id: string;
    createTime: string;
    isShow: boolean;
    urgentRepairStatus: number;
    commandId: string;
    updateTime: string;
    endTime: string;
    terminated: number;

    /** 抢修单位 */
    repairUnits: string[];
    /** 负责人 */
    responsiblePerson: string;
    /** 联系电话 */
    contactPhone: string;
    /** 督办 */
    supervision: boolean;
    /** 关联点 */
    associatedPoint: string;
    trainNumber: string;
  }

  export interface EventInfo {
    /**
     * 今日事件数量（isShow=1进行统计）
     */
    todayNumber: number;
    /**
     * 今日事件数量占比
     */
    todayPercentage: string;
    /**
     * 今日事件同比昨日
     */
    todayPercentageGreaterThanYesterday: string;
    /**
     * 今日事件同比昨日是否变多
     */
    todayGreaterThanYesterday: boolean;
    /**
     * 重点事件数量（isShow=1进行统计）
     */
    severityNumber: number;
    /**
     * 重点事件数量占比
     */
    severityPercentage: string;
    /**
     * 重点事件同比昨日
     */
    severityPercentageGreaterThanYesterday: string;
    /**
     * 重点事件同比昨日是否变多
     */
    severityGreaterThanYesterday: boolean;
    /**
     * 事件列表
     */
    list: Event[];
  }

  export interface OperationAddParams {
    line: string;
    actionType: string;
    locationType: string;
    startStation: string;
    endStation: string;
    customPosition: string;
    direction: string;
    description: string;
    // time: string;
    startTime: string;
    endTime: string;
    close: number;
    distance: number;
    limit: number;
    source: string; // OCC or COCC
    /** 计划恢复时间未定 */
    isEndTimeOptional: boolean;
  }

  export interface Operation extends OperationAddParams {
    id: string;
    createTime: string;
    isShow: boolean;
    commandId: string;
    /** 运营真实恢复时间 */
    actualEndTime: string;
  }

  interface EventChange {
    id: string;
    changes: Record<string, { old: any; new: any }>;
    entity: Event;
  }

  interface EventDiffResult {
    added: Event[];
    removed: Event[];
    changed: EventChange[];
  }

  interface OperationChange {
    id: string;
    changes: Record<string, { old: any; new: any }>;
  }

  interface OperationDiffResult {
    added: Operation[];
    removed: Operation[];
    changed: OperationChange[];
  }

  interface OpDetailAddParams {
    /** 线路 */
    line: string;
    /** 是否阻碍行车 */
    isObstructing: number;
    /** 运营详情 */
    detail: string;
  }

  interface OpDetail extends OpDetailAddParams {
    id: string;
    createTime: string;
    commandId: string;
    updateTime: string;
  }
}
