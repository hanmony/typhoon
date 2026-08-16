import { SettingsService } from "./settings.service";

export class HandoverSettings {
    constructor(private readonly settings: SettingsService) {}

    /**
     * 交接班最大分钟数
     */
    public get maxMinutes(): number {
        return this.settings.getNumber("handover-max-minutes") ?? 120;
    }

    /**
     * 交接班最晚提交时间 (Minutes)
     */
    public get minTime(): number {
        return this.settings.getNumber("handover-min-time") ?? 180;
    }

    /**
     * 交接班审批超时时间
     */
    public get approvalTimeout(): number {
        return this.settings.getNumber("handover-approval-timeout") ?? 30;
    }
}
