import { TyphoonDutyEntity } from "src/database/entity/typhoon.duty.schema";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ActionEntity } from "./entity/action.schema";
import { CaseEntity } from "./entity/case.schema";
import { PathInfoEntity } from "./entity/path.info.schema";
import { StaffEntity } from "./entity/staff.schema";
import { defineMongoFeature } from "./lib/model.defination";
import { RepoService } from "./service/repo/repo.service";
import { TyphoonEntity } from "./entity/typhoon.schema";
import { SettingEntity } from "./entity/settings.schema";
import { TyphoonCommandEntity } from "./entity/typhoon.command.schema";
import { TyphoonExtremeEventEntity } from "./entity/typhoon.extreme.event.schema";
import { TyphoonExtremeOperationEntity } from "./entity/typhoon.extreme.operation.schema";
import { TyphoonPatrollingTourEntity } from "./entity/typhoon.extreme.tour.schema";
import { TyphoonExtremeMessageEntity } from "./entity/typhoon.extreme.message.schema";
import { UserLogEntity } from "./entity/user.log.schema";
import { TyphoonSevereWeatherHistoryEntity } from "./entity/typhoon.severe.weather.history.schema";
import { TyphoonExtremeOpDetailEntity } from "./entity/typhoon.extreme.op.detail.schema";
import { ShpEntity } from "./entity/shp.schema";
import { DigitalPlanEntity } from "./entity/digital.plan.schema";
import { KbDocumentEntity } from "./entity/kb-document.schema";
import { KbChunkEntity } from "./entity/kb-chunk.schema";
import { LlmModelEntity } from "./entity/llm-model.schema";
import { TyphoonNewEntity } from "./entity/typhoon.new.schema";
import { TyphoonTwoEntity } from "./entity/typhoon.two.schema";
import { TyphoonSevereWeatherNewHistoryEntity } from "./entity/typhoon.severe.weather.new.history.schema";

@Module({
    imports: [
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configs: ConfigService) => ({ uri: configs.get<string>("DATABASE_URI") }),
        }),
        MongooseModule.forFeature([
            defineMongoFeature(StaffEntity),
            defineMongoFeature(CaseEntity),
            defineMongoFeature(PathInfoEntity),
            defineMongoFeature(ActionEntity),
            defineMongoFeature(TyphoonEntity),
            defineMongoFeature(TyphoonNewEntity),
            defineMongoFeature(TyphoonTwoEntity),
            defineMongoFeature(SettingEntity),
            defineMongoFeature(TyphoonCommandEntity),
            defineMongoFeature(TyphoonDutyEntity),
            defineMongoFeature(TyphoonExtremeEventEntity),
            defineMongoFeature(TyphoonExtremeOperationEntity),
            defineMongoFeature(TyphoonExtremeOpDetailEntity),
            defineMongoFeature(TyphoonExtremeMessageEntity),
            defineMongoFeature(TyphoonPatrollingTourEntity),
            defineMongoFeature(UserLogEntity),
            defineMongoFeature(TyphoonSevereWeatherHistoryEntity),
            defineMongoFeature(TyphoonSevereWeatherNewHistoryEntity),
            defineMongoFeature(ShpEntity),
            defineMongoFeature(DigitalPlanEntity),
            defineMongoFeature(KbDocumentEntity),
            defineMongoFeature(KbChunkEntity),
            defineMongoFeature(LlmModelEntity),
        ]),
    ],
    providers: [RepoService],
    exports: [RepoService],
})
export class DatabaseModule {}
