import { Injectable, OnModuleInit } from "@nestjs/common";
import { assign, pick } from "lodash";
import { Model } from "mongoose";
import { SettingDto } from "../../domain/dto/setting.dto";
import { InitService } from "../init/init.service";
import { ExchangeSettings } from "./exchange.settings";
import { HandoverSettings } from "./handover.settings";
import { LeaveSettings } from "./leave.settings";
import { SettingEntity } from "src/database/entity/settings.schema";
import { RepoService } from "src/database/service/repo/repo.service";

@Injectable()
export class SettingsService implements OnModuleInit {
    constructor(
        private readonly initor: InitService,
        private readonly repo: RepoService,
    ) {
        this.handover = new HandoverSettings(this);
        this.exchange = new ExchangeSettings(this);
        this.leave = new LeaveSettings(this);
    }

    private settings = new Map<string, SettingDto>();

    public readonly handover: HandoverSettings;
    public readonly exchange: ExchangeSettings;
    public readonly leave: LeaveSettings;

    async onModuleInit() {
        await this.initor.state.waitForReady(SettingsService.name);
        const items = await this.repo.settings.find().exec();
        for (const item of items) {
            const dto = new SettingDto();
            assign(dto, pick(item, "name", "label", "value", "group", "description"));
            this.settings.set(item.name, dto);
        }
    }

    all(): SettingEntity[] {
        return Array.from(this.settings.values());
    }

    getTyphoonCommandInfo(): SettingEntity {
        return this.settings.get("typhoon-command");
    }

    getString(name: string): string | undefined {
        return this.settings.get(name)?.value;
    }

    getNumber(name: string): number | undefined {
        const str = this.getString(name);
        if (!str) {
            return undefined;
        }
        return Number(str);
    }

    async typhoonCommandUpdate(value: string) {
        const setting = this.getTyphoonCommandInfo();
        await this.setValue(setting.name, value);
    }

    async setValue(name: string, value: string) {
        this.settings.get(name).value = String(value);
        await this.repo.settings.updateOne({ name }, { value }).exec();
    }
}
