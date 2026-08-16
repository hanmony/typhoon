import { SettingsService } from "./settings.service";

export class ExchangeSettings {
    constructor(private readonly settings: SettingsService) {}

    /**
     * 最大天数
     */
    public get maxDays(): number {
        return this.settings.getNumber("exchange-max-days") ?? 30;
    }

    /**
     * 换班目标天数跨度
     */
    public get range(): number {
        return this.settings.getNumber("exchange-target-range") ?? 30;
    }

    /**
     * 最晚提交时间 (Hour)
     */
    public get minHour(): number {
        return this.settings.getNumber("exchange-min-hour") ?? 13;
    }

    /**
     * 交接班审批超时时间
     */
    public get approvalTimeout(): number {
        return this.settings.getNumber("exchange-approval-timeout") ?? 30;
    }
}
