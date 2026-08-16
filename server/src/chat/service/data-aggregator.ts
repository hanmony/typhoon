/**
 * DataAggregator -- 根据意图分类结果并行拉取数据
 *
 * 接收意图分类结果，决定查哪些数据源，并行获取后返回结构化的数据。
 */
import { Injectable, Logger } from "@nestjs/common";
import { AlertService } from "src/typhoon/alert/alert.service";
import { AlertCurrentResponseDto } from "src/typhoon/alert/dto/alert.dto";
import { RagService } from "src/knowledge-base/service/rag.service";
import { RagResponseDto } from "src/knowledge-base/domain/dto/rag-response.dto";
import { TyphoonExtremeEventService } from "src/typhoon/service/typhoon.extreme.event.service";
import { TyphoonExtremeEventDto } from "src/typhoon/domain/typhoon.extreme.event.dto";
import { TyphoonExtremeOperationService } from "src/typhoon/service/typhoon.extreme.operation.service";
import { TyphoonExtremeOperationDto } from "src/typhoon/domain/typhoon.extreme.operation.dto";

/** 数据聚合结果 */
export interface AggregatedData {
    alert: AlertCurrentResponseDto | null;
    ragResult: RagResponseDto | null;
    events: TyphoonExtremeEventDto[];
    operations: TyphoonExtremeOperationDto[];
}

@Injectable()
export class DataAggregator {
    private readonly logger = new Logger(DataAggregator.name);

    constructor(
        private readonly alertService: AlertService,
        private readonly ragService: RagService,
        private readonly eventService: TyphoonExtremeEventService,
        private readonly operationService: TyphoonExtremeOperationService,
    ) {}

    /**
     * 根据意图分类结果并行获取数据。
     * @param sources  需要查询的数据源 key 列表（已过滤）
     * @param question 用户原始问题（用于 RAG 检索）
     * @param fetchMetrics  每数据源耗时写入此对象
     */
    async fetch(sources: string[], question: string, fetchMetrics: Record<string, number>): Promise<AggregatedData> {
        const isCommandActive = sources.includes("command-active");
        const isCommandAll = sources.includes("command-all");

        const timedFetch = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
            const t = Date.now();
            try {
                return await fn();
            } finally {
                fetchMetrics[key] = Date.now() - t;
            }
        };

        const [alert, ragResult, events, operations] = await Promise.all([
            sources.includes("alert")
                ? timedFetch("台风", () =>
                      this.alertService.getCurrentAlerts().catch(err => {
                          this.logger.warn(`AlertService error: ${err.message}`);
                          return null;
                      }),
                  )
                : Promise.resolve(null),
            sources.includes("rag")
                ? timedFetch("知识库", () =>
                      this.ragService
                          .retrieve(question, 5)
                          .then(raw => ({
                              answer: "",
                              sources: raw.map(s => ({
                                  content: s.content,
                                  documentName: s.documentName,
                                  chunkIndex: s.chunkIndex,
                                  score: s.score,
                              })),
                          }))
                          .catch(err => {
                              this.logger.warn(`RagService error: ${err.message}`);
                              return null;
                          }),
                  )
                : Promise.resolve(null),
            isCommandActive || isCommandAll
                ? timedFetch("指挥事件", () =>
                      (isCommandActive ? this.eventService.getActive() : this.eventService.getAll()).catch(err => {
                          this.logger.warn(`EventService error: ${err.message}`);
                          return [];
                      }),
                  )
                : Promise.resolve([]),
            isCommandActive || isCommandAll
                ? timedFetch("运营调整", () =>
                      (isCommandActive ? this.operationService.getActive() : this.operationService.getAll()).catch(
                          err => {
                              this.logger.warn(`OperationService error: ${err.message}`);
                              return [];
                          },
                      ),
                  )
                : Promise.resolve([]),
        ]);

        return { alert, ragResult, events, operations };
    }
}
