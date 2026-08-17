# 智能体实施计划（增强指挥 Agent + 智能告警研判 Agent）

> 依据 2026-08-17 代码库探索结果制定。基础事实：
> - 平台已有完整 AI 基础设施：`LlmService`（多模型路由/SSE/tool calling）、RAG 知识库（Qdrant）、`chat`（意图编排）、`agent`（单智能体 tool loop，`POST /agent/stream`）。
> - `get_typhoon_history` 工具为占位桩（`src/agent/tools/get-typhoon-history.tool.ts:35`），但 `TyphoonService.getHistory(year)` 已存在（`src/typhoon/service/typhoon.service.ts:364`）。
> - `alert.service.ts:250-252` 有 TODO 指向 `docs/design/AI告警增强方案.md`（该文档不在仓库中，需自行落地设计）。
> - 后端**无线路空间数据**（实体中 `line` 均为字符串字段）；前端有完整线路坐标（`client/src/app/pages/case-detail/services/metro.2026.data`）。
> - chat/agent 均无服务端会话持久化，历史靠前端回传（≤10 条）。

---

## 方向 A：增强现有指挥 Agent

**目标**：把 `/agent/stream` 从「3 个有效工具 + 1 个占位」升级为覆盖指挥全数据域的防台助手，并补上服务端会话持久化。

### A1. 实现 `get_typhoon_history` 工具（占位桩补全）

- 注入 `TyphoonService`，调用现成的 `getHistory(year)`；如 `agent.module.ts` 未 imports `TyphoonModule` 则补上。
- 工具 schema：
  ```ts
  get_typhoon_history: {
    description: "查询指定年份的历史台风列表（台风编号、名称、起止时间、登陆信息）",
    parameters: {
      year: { type: "number", description: "年份，如 2024" },   // 必填
      tfid: { type: "string", description: "台风编号，可选，传入则返回该台风的路径摘要" },
    },
  }
  ```
- **返回结果必须摘要化**：路径点可能数百个，直接回传会撑爆 token。只返回：首末点、关键拐点（可选）、登陆点列表、起止时间、最大风力/气压，并注明"详细路径可在大屏查看"。
- 无数据时返回明确文案（如"该年份无历史台风记录"），不要返回空 JSON。

### A2. 新增 4 个指挥数据域工具

按 `src/agent/tools/` 现有模式（实现 `IToolExecutor`）各写一个 `.tool.ts`：

| 工具名 | 数据来源 Service | 功能 | 结果摘要策略 |
|---|---|---|---|
| `get_duty_info` | `TyphoonDutyService` | 当前指挥值班表（部门/责任人/日期） | 按日期分组返回，≤20 条 |
| `get_messages` | 消息 Service（`extreme/message`） | 指挥消息（标题/内容/类型/线路/发布时间） | 按时间倒序，≤10 条，长内容截断 |
| `get_severe_weather_history` | `TyphoonService.getSevereWeatherhistory()` | 本次指挥的预警历史（等级/发布时间/结束状态） | 按时间排序全量（体量小） |
| `get_patrolling_tours` | 巡道 Service（`patrolling/tour`） | 巡道记录（线路/区段/起止时间/速度） | 按线路分组，≤10 条 |

统一要求：
- 执行失败走 `tool.registry.ts` 的异常兜底，返回 `{success:false, message}`，不让 LLM 看到堆栈。
- 所有时间格式化为 `YYYY-MM-DD HH:mm`，避免时区歧义。
- 工具 description 用中文、明确"查询对象是当前指挥（commandId）还是全局"，防止 LLM 误用。

### A3. 服务端会话持久化

- 新增实体 `ChatSessionEntity`（注册到 DatabaseModule）：
  `user / type(chat|agent) / from(cocc|library|manager) / title / messages[] / createdAt / updatedAt`
- 新增 `chat-session.controller.ts`（或并入现有模块）：
  - `POST /chat/sessions` 创建会话；`GET /chat/sessions?type=agent` 列表；`GET /chat/sessions/:id` 详情；`DELETE /chat/sessions/:id` 删除。
- 兼容策略：`/chat/stream`、`/agent/stream` 请求 DTO 增加**可选** `sessionId` 字段——不传则保持现有无状态行为，前端逐步切换，**不破坏现有协议**。
- 服务端自动截断历史（如保留最近 20 条），替换现在"前端回传 ≤10 条"的限制。
- 前端（二期）：`chat-panel` / `library-chat` 的 localStorage 历史迁移到服务端会话，多端一致。

### A4. Prompt 与前端映射更新

- `src/agent/prompt/agent.prompt.ts`：补充 5 个新工具的使用说明 + 原则（例：「查询值班/消息前，先确认当前是否处于指挥中，无指挥时如实说明」）。
- 前端 `chat-panel.component.ts` 的 `TOOL_DISPLAY_NAMES` 增加新工具中文名映射（值班信息/指挥消息/预警历史/巡道记录/历史台风）。

### A5. 评估（验收清单见文末）

---

## 方向 B：智能告警研判 Agent

**目标**：台风/预警变化时，自动完成「解读 → 逐线路影响研判 → 应急响应等级建议 → 相似历史案例 → 研判报告（SSE 流式）」，研判结果可推送到指挥消息/WebSocket。

### B0. 前置决策（两个数据依赖，必须先定）

**B0-1 线路空间数据（研判的基础）**

后端没有线路 GIS 数据。二选一：

- **方案 1（推荐，准确）**：把前端 `metro.2026.data`（含站点/车辆段坐标，已做偏移修正）迁移为后端资产：
  - 放 `server/assets/line/metro-2026.json`，仿 `wind-circle.service.ts` 的 `onModuleInit` 模式启动加载；
  - 用 `@turf/turf` 把线路点串成 LineString + buffer（如 500m），与台风风圈（wind-circle 现成的风圈多边形）做 `booleanOverlap/intersect`，输出「受影响线路 + 预计影响时间窗口」。
  - 注意：坐标系统与现有 wind-circle 一致（经纬度，EPSG:4490 近似平面运算，与上海边界 shapefile 同源），部署时 `assets/` 需随包覆盖。
- **方案 2（轻量，先跑通）**：不做空间计算，用「事件/运营数据 + 预案 RAG + 历史案例」做经验式研判，影响线路从当前事件分布推断。准确度受限，但零新数据。

建议：M3 先用方案 2 跑通链路，M4 换方案 1 提升准确性（两者互不冲突）。

**B0-2 相似历史案例数据源**

案例库在 MongoDB（`cases`/`actions`/`path-infos`），两条路：

- **结构化匹配（推荐先做）**：用 `path-infos`（台风路径点）与当前台风做轨迹相似度（同时间段最近点距离 / 登陆点距离），Top-3 案例返回其事件时间线（`actions` 按 category 分组）与处置措施摘要。实现简单，不依赖 embedding。
- **向量化（后补）**：把案例总结报告（GridFS 中的 docx）上传知识库 `typhoon_case` 分类，走现有 RAG 管道检索。

### B1. 新模块 `alert-analyzer`（参照 `chat` 模块结构）

```
src/alert-analyzer/
  alert-analyzer.module.ts        # imports Llm/KnowledgeBase/Alert/Typhoon/Caseman/Websocket
  controller/alert-analyzer.controller.ts   # POST /alert-analyzer/stream (SSE)
  domain/
    alert-analyzer.dto.ts         # question?/autoRun?/commandId?
    alert-analyzer.types.ts       # 研判事件协议
  service/
    line-impact.service.ts        # B0-1 风圈×线路研判（turf 空间计算）
    case-matcher.service.ts       # B0-2 相似历史案例匹配
    analyzer.service.ts           # 编排：聚合 → prompt → LlmService 流式
    analyzer.prompt.ts            # 研判报告 prompt（含防编造规则）
```

**编排方式选型**：研判是「多步结构化流水线」（空间计算→案例匹配→LLM 生成），适合 `chat` 式聚合编排，而不是塞进 agent 的 tool loop——空间计算放 service，LLM 只负责解读与成文。所有 LLM 调用必须走 `LlmService`（研判用大模型，轻任务用 `purpose:"light"`）。

**SSE 事件协议**（沿用现有 typed 格式 + 新增一个结构化事件）：

```
data: {"type":"status","data":"正在研判线路影响…"}
data: {"type":"analysis","data":{受影响线路:[{line,影响时段,风险等级}],等级建议:...,相似案例:[...]}}   ← 新增，前端渲染研判卡片
data: {"type":"token","data":"…"}   / {"type":"thinking"} / {"type":"usage"}
data: [DONE]
```

**推送联动（二期）**：研判完成 → `WebSocketService.broadcastMessage("alertAnalysis", payload)` + 可选写入 `extreme/message`，指挥大屏弹研判卡片。

### B2. 前端入口

- COCC 页悬浮面板（`chat-panel`）增加「一键研判」快捷按钮 → 调 `/alert-analyzer/stream`；`analysis` 事件渲染为研判卡片（线路列表/等级建议/相似案例链接）。
- 或 `extreme-weather` 指挥台加「AI 研判」按钮生成报告弹窗。

### B3. 评估

- 用 `dummy/` 模拟台风（梅花/贝碧嘉）+ 真实预警历史构造 10 组场景，验收：影响线路判断与空间计算一致、响应等级建议与预案分级逻辑一致、相似案例匹配有意义、报告不含编造数据。

---

## 里程碑与排期（建议顺序）

| 里程碑 | 内容 | 工作量 | 依赖 |
|---|---|---|---|
| **M1** | A1 + A2：补全 5 个指挥工具 + prompt/前端映射 | 2–3 天 | 无，可立即开始 |
| **M2** | A3：服务端会话持久化 | 2 天 | M1 |
| **M3** | B0-2 + B1 最小链路：案例结构化匹配 + 研判编排（无空间计算） | 3 天 | 可并行于 M1 |
| **M4** | B0-1 + B1 完整：线路数据迁移 + 风圈×线路空间研判 | 3–4 天 | M3 |
| **M5** | B2 前端 + A/B 评估测试 | 2–3 天 | M3、M4 |
| **M6** | 打包部署（DEPLOY.md 流程） | 0.5 天 | M5 |

## 验收标准（评估集模板）

1. **工具正确性**：「2024 年有哪些台风影响上海？」→ 必须调用 `get_typhoon_history` 且返回真实台风（如贝碧嘉）；不得编造台风名。
2. **数据真实性**：所有回答中的台风/预警/事件/值班数据必须与接口返回一致，凡不在数据内的内容必须注明"未知/无记录"。
3. **指挥上下文**：无活跃指挥时问"现在值班是谁"→ 回答"当前无指挥"而非编造。
4. **研判一致性**：模拟台风梅花路径下，研判报告列出的受影响线路须与空间计算结果一致；应急响应等级建议须能溯源到预案条款（RAG 引用）。
5. **性能**：常规问答 TTFT < 3s；研判报告总时长 < 30s；tool loop ≤ 5 轮（现有上限）。
6. **回归**：`/chat/stream`、`/kb/query/stream`、`/agent/stream` 现有前端页面（COCC 面板/案例库机器人/管理后台问答）功能不回归。

## 风险清单

| 风险 | 应对 |
|---|---|
| 线路坐标迁移准确性（offset 修正、坐标系统） | 用现有 `metro.2026.data` 原样迁移，与 wind-circle 同坐标系；M4 用真实台风做人工比对 |
| 工具返回体量撑爆 token | 所有工具结果摘要化（截断+关键字段），见 A1/A2 |
| 外部台风 API 挂掉/限流 | 复用现有 dummy 模拟源兜底；研判提示"数据更新时间" |
| 会话持久化 schema 变更影响现有前端 | `sessionId` 可选、默认无状态，前端渐进迁移 |
| 研判 LLM 编造数据 | prompt 强制"无数据即声明未知"；评估集第 2、3 条专项验收 |

## 编码规范提醒（新增代码必须遵守）

- 导入路径用 `src/...` 绝对路径；模块结构 `{module}/controller + domain + service`。
- 实体用 `defineMongoFeature` 注册到 DatabaseModule；新 controller 默认走全局 JwtAuthGuard，Public 需显式 `@Public`。
- 响应用 `CommonRespDto.succ()/failed()`；断言用 `Failed.check()`；写操作加 `@ActionLog`。
- 所有 LLM 调用收口 `LlmService`；流式输出统一 SSE typed 事件协议；加限流（Throttler）与诊断埋点（TTFT/轮次/token）。
- Windows 兼容：不要用 `rm/mv` 脚本命令；新资产文件放 `assets/` 并随发布包交付（DEPLOY.md 第 7 节）。
