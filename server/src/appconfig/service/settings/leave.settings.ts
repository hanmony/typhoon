import { SettingsService } from "./settings.service";

export class LeaveSettings {
    constructor(private readonly settings: SettingsService) {}

    /**
     * 最晚请假时间（小时）
     */
    public get minHours(): number {
        return this.settings.getNumber("leave-min-hours") ?? 4;
    }

    /**
     * 最大请假天数
     */
    public get maxDays(): number {
        return this.settings.getNumber("leave-max-days") ?? 7;
    }

    /**
     * 超时时间
     */
    public get timeout(): number {
        return this.settings.getNumber("leave-approval-timeout") ?? 60;
    }
}
