import { TyphoonPatrollingTourEntity } from "./../../entity/typhoon.extreme.tour.schema";
import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";
import { ActionEntity } from "src/database/entity/action.schema";
import { CaseEntity } from "src/database/entity/case.schema";
import { PathInfoEntity } from "src/database/entity/path.info.schema";
import { SettingEntity } from "src/database/entity/settings.schema";
import { StaffEntity } from "src/database/entity/staff.schema";
import { TyphoonCommandEntity } from "src/database/entity/typhoon.command.schema";
import { TyphoonExtremeEventEntity } from "src/database/entity/typhoon.extreme.event.schema";
import { TyphoonExtremeOperationEntity } from "src/database/entity/typhoon.extreme.operation.schema";
import { TyphoonEntity } from "src/database/entity/typhoon.schema";
import { TyphoonDutyEntity } from "src/database/entity/typhoon.duty.schema";
import { InjectEntityModel } from "src/database/lib/model.defination";
import { MailEntity } from "src/database/entity/mail.schema";
import { TyphoonExtremeMessageEntity } from "src/database/entity/typhoon.extreme.message.schema";
import { UserLogEntity } from "src/database/entity/user.log.schema";
import { TyphoonSevereWeatherNewHistoryEntity } from "src/database/entity/typhoon.severe.weather.new.history.schema";
import { TyphoonExtremeOpDetailEntity } from "src/database/entity/typhoon.extreme.op.detail.schema";
import { ShpEntity } from "src/database/entity/shp.schema";
import { DigitalPlanEntity } from "src/database/entity/digital.plan.schema";
import { KbDocumentEntity } from "src/database/entity/kb-document.schema";
import { KbChunkEntity } from "src/database/entity/kb-chunk.schema";
import { LlmModelEntity } from "src/database/entity/llm-model.schema";
import { TyphoonNewEntity } from "src/database/entity/typhoon.new.schema";
import { TyphoonTwoEntity } from "src/database/entity/typhoon.two.schema";
import { TyphoonSevereWeatherHistoryEntity } from "src/database/entity/typhoon.severe.weather.history.schema";

@Injectable()
export class RepoService {
    constructor(
        @InjectConnection() public readonly connection: Connection,
        @InjectEntityModel(StaffEntity) public readonly staffs: Model<StaffEntity>,
        @InjectEntityModel(CaseEntity) public readonly cases: Model<CaseEntity>,
        @InjectEntityModel(CaseEntity) public readonly mails: Model<MailEntity>,
        @InjectEntityModel(PathInfoEntity) public readonly pathInfos: Model<PathInfoEntity>,
        @InjectEntityModel(ActionEntity) public readonly actions: Model<ActionEntity>,
        @InjectEntityModel(TyphoonEntity) public readonly typhoons: Model<TyphoonEntity>,
        @InjectEntityModel(TyphoonNewEntity) public readonly typhoonNews: Model<TyphoonNewEntity>,
        @InjectEntityModel(TyphoonTwoEntity) public readonly typhoonTwos: Model<TyphoonTwoEntity>,
        @InjectEntityModel(SettingEntity) public readonly settings: Model<SettingEntity>,
        @InjectEntityModel(TyphoonCommandEntity) public readonly typhoonCommands: Model<TyphoonCommandEntity>,
        @InjectEntityModel(TyphoonDutyEntity) public readonly typhoonDuty: Model<TyphoonDutyEntity>,
        @InjectEntityModel(TyphoonExtremeEventEntity)
        public readonly typhoonExtremeEvents: Model<TyphoonExtremeEventEntity>,
        @InjectEntityModel(TyphoonExtremeOperationEntity)
        public readonly typhoonExtremeOperations: Model<TyphoonExtremeOperationEntity>,
        @InjectEntityModel(TyphoonExtremeOpDetailEntity)
        public readonly typhoonExtremeOpDetails: Model<TyphoonExtremeOpDetailEntity>,
        @InjectEntityModel(TyphoonExtremeMessageEntity)
        public readonly typhoonExtremeMessages: Model<TyphoonExtremeMessageEntity>,
        @InjectEntityModel(TyphoonPatrollingTourEntity)
        public readonly typhoonPatrollingTour: Model<TyphoonPatrollingTourEntity>,
        @InjectEntityModel(UserLogEntity)
        public readonly userLogs: Model<UserLogEntity>,
        @InjectEntityModel(TyphoonSevereWeatherHistoryEntity)
        public readonly typhoonSevereWeathers: Model<TyphoonSevereWeatherHistoryEntity>,
        @InjectEntityModel(TyphoonSevereWeatherNewHistoryEntity)
        public readonly typhoonSevereWeatherNews: Model<TyphoonSevereWeatherNewHistoryEntity>,
        @InjectEntityModel(ShpEntity) public readonly shp: Model<ShpEntity>,
        @InjectEntityModel(DigitalPlanEntity) public readonly digitalPlans: Model<DigitalPlanEntity>,
        @InjectEntityModel(KbDocumentEntity) public readonly kbDocuments: Model<KbDocumentEntity>,
        @InjectEntityModel(KbChunkEntity) public readonly kbChunks: Model<KbChunkEntity>,
        @InjectEntityModel(LlmModelEntity) public readonly llmModels: Model<LlmModelEntity>,
    ) {}
}
