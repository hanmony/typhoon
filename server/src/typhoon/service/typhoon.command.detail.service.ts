import { Injectable, Logger } from "@nestjs/common";
import { TyphoonDutyService } from "./typhoon.duty.service";
import { TyphoonExtremeEventService } from "./typhoon.extreme.event.service";
import { TyphoonExtremeMessageService } from "./typhoon.extreme.message.service";
import { TyphoonExtremeOperationService } from "./typhoon.extreme.operation.service";
import { TyphoonPatrollingService } from "./typhoon.extreme.patrolling.service";
import { TyphoonCommandService } from "./typhoon.command.service";
import { TyphoonCommandDetailDto } from "../domain/typhoon.command.detail.dto";
import { TyphoonService } from "./typhoon.service";
@Injectable()
export class TyphoonCommandDetailService {
    constructor(
        private typhoonCommands: TyphoonCommandService,
        private typhoonDutys: TyphoonDutyService,
        private typhoonExtremeEvents: TyphoonExtremeEventService,
        private typhoonExtremeMessages: TyphoonExtremeMessageService,
        private typhoonExtremeOperations: TyphoonExtremeOperationService,
        private typhoonPatrollings: TyphoonPatrollingService,
        private typhoons: TyphoonService,
    ) {}

    async getDetail(): Promise<TyphoonCommandDetailDto> {
        const dto = new TyphoonCommandDetailDto();
        const typhoon = await this.typhoonCommands.getInfo();
        dto.doc = typhoon[0];
        dto.typhoonDutys = await this.typhoonDutys.list();
        dto.typhoonExtremeEvents = await this.typhoonExtremeEvents.getAll();
        dto.typhoonExtremeMessages = await this.typhoonExtremeMessages.getAll();
        dto.typhoonExtremeOperations = await this.typhoonExtremeOperations.getAll();
        dto.typhoonPatrollings = await this.typhoonPatrollings.getTours();
        dto.severeWeathers = await this.typhoons.getSevereWeatherhistory();
        dto.typhoon = await this.typhoons.getCommandTyphoon();
        return dto;
    }
}

export const logger = new Logger("TyphoonCommandDetailService");
