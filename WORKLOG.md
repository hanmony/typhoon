
# 项目工作日志（WORKLOG）

> 记录本项目每一步工作：日期、做了什么、改了哪些文件、提交记录。
> **维护规则：每完成一步工作 → 追加一条记录 → 本地 git 提交并推送 GitHub。**

---

## 2026-08-17

### 步骤 1：平台全面梳理（探索）
- **目的**：弄清平台架构与现状，为"制作智能体"做准备
- **做了什么**：
  - 阅读 `DEPLOY.md`、`server/README.md`、`client/README.md`、`server/CLAUDE.md`、`client/CLAUDE.md`、`server/docs/ARCHITECTURE.md`、`server/docs/AI_MODULE_AUDIT.md`
  - 派出 3 个探索代理并行梳理：① 后端业务模块与数据模型 ② 已有 AI/Agent 能力 ③ 前端页面与功能
- **结论**：
  - 平台 = 上海轨道交通防汛防台应急指挥平台（Angular 19 + NestJS 10 + MongoDB + Qdrant）
  - 已有完整 AI 基础设施：`LlmService`（多模型路由/SSE/tool calling）、RAG 知识库、`chat` 意图编排、`agent` 单智能体 tool loop（`POST /agent/stream`，4 工具中 1 个占位）
  - 前端已有 AI UI：COCC 悬浮聊天面板（Agent 模式+工具步骤条）、案例库 AI 机器人、管理后台知识库问答
- **文件改动**：无（只读探索）

### 步骤 2：智能体方案选型
- **产出**：7 类可做智能体清单（指挥助手增强 / 告警研判 / 相似案例推荐 / 复盘报告 / 主动巡查简报 / 运营调整建议 / 多智能体编排）
- **决策（用户选定）**：① 增强现有指挥 Agent ② 智能告警研判 Agent

### 步骤 3：制定详细实施计划
- **产出**：`server/docs/AGENT_IMPLEMENTATION_PLAN.md`
- **内容**：方向 A（补全 5 个指挥工具 + 服务端会话持久化）、方向 B（新建 `alert-analyzer` 模块：线路影响研判 + 相似案例匹配 + 研判报告 SSE）、里程碑 M1–M6、验收标准、风险清单
- **关键事实验证**：
  - `TyphoonService.getHistory(year)` 已存在（`typhoon.service.ts:364`），占位工具可直接实现
  - 后端无线路空间数据（实体中 `line` 均为字符串）；前端 `metro.2026.data` 有完整线路坐标可迁移
  - TODO 引用的 `docs/design/AI告警增强方案.md` 不在仓库中，需自行落地设计

### 步骤 4：建立 git 工作流与工作日志
- **新增文件**：`.gitignore`（排除本地配置/密钥/构建产物）、`WORKLOG.md`（本文件）
- **提交并推送**：GitHub `hanmony/typhoon`（走本机代理 127.0.0.1:7892，代理未启动时提交保留在本地）

### 步骤 5：M1-1 实现 `get_typhoon_history` 工具（占位桩补全）
- **修复 bug**：`server/src/typhoon/service/typhoon.service.ts:368` —— `getHistory(year)` 原来永远用当前年份（`new Date().getFullYear() || year`），改为 `year || new Date().getFullYear()`，同时修复了 `GET /typhoon/history?year` 生产接口
- **重写**：`server/src/agent/tools/get-typhoon-history.tool.ts`
  - 注入 `TyphoonService`（`TyphoonModule` 已在 agent.module.ts 导入，无需改模块）
  - schema 按计划：`year`（必填，number）+ `tfid`（可选，string）
  - 结果摘要化：台风列表返回 tfid/名称/起止时间/登陆点列表/峰值风力气压；tfid 模式额外返回路径摘要（首末点 + 均匀采样 ≤8 个中间点，注明"详细路径可在大屏查看"）
  - 无数据返回明确文案（"XX 年无历史台风记录"），失败走 try-catch 兜底
- **更新**：`server/src/agent/prompt/agent.prompt.ts` 第 4 条工具说明（参数改为 year 必填 + tfid 可选）
- **验证**：dev 环境无 node_modules → `npm install` → `npm run build` ✅ 编译通过（`dist/agent/tools/get-typhoon-history.tool.js` 已生成）
- **提交**：见 git 历史（feat(agent): 实现 get_typhoon_history 工具并编写任务规划 README，含步骤 6 的 README 产出）；推送失败——7892 代理未运行，待代理启动后重推

### 步骤 6：编写 README 任务规划总纲
- **产出**：根目录 `README.md` —— 智能体建设项目任务规划：工作方式约定、关键文档索引、开发环境速查、步骤 1–20 详细任务（每步含数据源/schema/改动文件/验收标准/预估工作量）、每步标准收尾动作、风险与依赖
- **使用方式**：用户按步骤编号发指令（如"开始步骤 2"），每步只做该步骤
- **当前状态**：步骤 1 已完成；步骤 2–20 待用户按编号发指令

### 步骤 7：M1-2 新增 `get_duty_info` 值班查询工具（README 步骤 2）
- **数据源**：`TyphoonDutyService.list()`（当前指挥 5 天值班表，无指挥返回空数组）
- **改动文件**：
  - 新建 `server/src/agent/tools/get-duty-info.tool.ts`：schema 无必填参数（可选 `date` YYYY-MM-DD）；按日期分组，只保留已安排值班人的条目 + 未安排部门数量汇总（unfilledCount），上限 20 条；无指挥/日期不在范围/该日未安排均返回明确文案
  - `server/src/typhoon/typhoon.module.ts`：exports 补上 `TyphoonDutyService`（原来只在 providers 未导出）
  - `server/src/agent/agent.module.ts`：注册第 5 个工具（provider + 工厂 + inject，日志改为 "All 5 agent tools registered"）
  - `server/src/agent/prompt/agent.prompt.ts`：新增第 5 条工具说明
- **验证**：`npm run build` ✅ 编译通过（`dist/agent/tools/get-duty-info.tool.js` 已生成）
- **提交**：见 git 历史

### 步骤 8：M1-3 新增 `get_messages` 指挥消息工具（README 步骤 3）
- **数据源**：`TyphoonExtremeMessageService.getAll()`（当前指挥消息，按时间倒序，无指挥返回空）
- **改动文件**：
  - 新建 `server/src/agent/tools/get-messages.tool.ts`：schema 无必填参数（可选 `limit`，默认 10，最大 20）；返回标题/类型/内容（超 200 字截断）/线路/发布时间（YYYY-MM-DD HH:mm），带 total 与截断提示；无指挥返回明确文案
  - `server/src/typhoon/typhoon.module.ts`：exports 补上 `TyphoonExtremeMessageService`
  - `server/src/agent/agent.module.ts`：注册第 6 个工具（"All 6 agent tools registered"）
  - `server/src/agent/prompt/agent.prompt.ts`：新增第 6 条工具说明
- **验证**：`npm run build` ✅ 编译通过（`dist/agent/tools/get-messages.tool.js` 已生成）
- **提交**：见 git 历史

### 步骤 9：M1-4 新增 `get_severe_weather_history` 预警历史工具（README 步骤 4）
- **数据源**：`TyphoonService.getSevereWeatherhistory()`（已存在，当前指挥预警历史，无指挥返回空）
- **改动文件**：
  - 新建 `server/src/agent/tools/get-severe-weather-history.tool.ts`：schema 无参数；按发布时间升序返回预警时间线（名称/事件类型/等级中文映射蓝色黄橙红/发布更新解除映射/发布生效失效时间/是否结束及结束时间），兜底上限 50 条；无指挥返回明确文案
  - `server/src/agent/agent.module.ts`：注册第 7 个工具（"All 7 agent tools registered"）
  - `server/src/agent/prompt/agent.prompt.ts`：新增第 7 条工具说明
- **验证**：`npm run build` ✅ 编译通过（`dist/agent/tools/get-severe-weather-history.tool.js` 已生成）
- **提交**：见 git 历史

### 步骤 10：M1-5 新增 `get_patrolling_tours` 巡道记录工具（README 步骤 5）
- **数据源**：`TyphoonPatrollingService.getTours()`（当前指挥巡道记录；无指挥时该方法抛"当前指挥已结束"，工具内捕获转为明确文案）
- **改动文件**：
  - 新建 `server/src/agent/tools/get-patrolling-tours.tool.ts`：schema 无必填参数（可选 `line` 按线路过滤，精确匹配失败后模糊匹配）；按线路分组返回区段/开始时间/速度，上限 10 条；线路不存在时列出有记录的线路
  - `server/src/typhoon/typhoon.module.ts`：exports 补上 `TyphoonPatrollingService`
  - `server/src/agent/agent.module.ts`：注册第 8 个工具（"All 8 agent tools registered"）
  - `server/src/agent/prompt/agent.prompt.ts`：新增第 8 条工具说明
- **数据说明**：巡道 DTO 实际只有 `startTime` 无 `endTime`（计划文档"起止时间"以实际数据为准，返回开始时间）
- **验证**：`npm run build` ✅ 编译通过（`dist/agent/tools/get-patrolling-tours.tool.js` 已生成）
- **提交**：见 git 历史

### 步骤 11：M1 集成收尾（README 步骤 6）
- **prompt 一致性检查**：`agent.prompt.ts` 8 条工具说明逐一与各 tool schema 比对（参数名/必填性/默认值），✅ 一致，无需修改
- **前端工具中文名**：`client/src/app/common.component/chat-panel/chat-panel.component.ts` 的 `TOOL_DISPLAY_NAMES` 增加 4 个新工具映射（值班信息/指挥消息/预警历史/巡道记录），共 8 个
- **编译验证**：
  - 后端 `npm run build` ✅ 通过（SERVER BUILD OK）
  - 前端 `npm run build` ✅ 通过（CLIENT BUILD OK；initial bundle 超预算 111.79 kB 为既有警告，非本次改动引入）
- **回归测试（20 条问题集）**：产出 `server/docs/AGENT_EVAL_SET.md`（A 工具正确性 8 条 / B 数据真实性 4 条 / C 指挥上下文 3 条 / D 回归 5 条，对应验收标准第 1–3、6 条）
  - ⚠️ 本机 MongoDB(27017)/Qdrant(6333) 未运行，且无活跃指挥数据，**实机执行推迟到部署环境**（或本地启动数据库后）；测试集已作为文档交付，含执行前提、逐条期望行为、通过标准与记录表模板
- **改动文件**：`client/.../chat-panel.component.ts`（TOOL_DISPLAY_NAMES）、新增 `server/docs/AGENT_EVAL_SET.md`
- **提交**：见 git 历史

### 步骤 12：M2 开工准备——收编 codex 梳理成果 + 切 M2 分支
- **背景**：M1 代码交由 codex 梳理，工作区留下一批未提交改动（M1 工具单测/依赖升级/密钥移出 git 等）
- **做了什么**：
  - 经用户确认：codex 梳理成果先提交到 main（独立提交 `1d35a49`），推送 GitHub 成功（7892 代理正常）
  - 从干净的 main 切出 M2 独立分支 `m2-session-persistence`，M2 所有改动在该分支进行，codex 审查后合并回 main
  - 经用户确认 M2 范围：本轮只做后端（步骤 7–9），步骤 10（前端迁移）留到二期
- **安全确认**：`server/.env` 与 qweather 私钥已被 .gitignore 拦截并移出 git 历史（`.env.example` 保留）

### 步骤 13：M2-7 新增 `ChatSessionEntity` 并注册 DatabaseModule（README 步骤 7）
- **实体设计**（`server/src/database/entity/chat-session.schema.ts`）：
  - `user`（归属用户，取 JWT payload.id 即登录用户名，index）/ `type`（chat|agent，index）/ `from`（cocc|library|manager）/ `title` / `messages[]`（嵌入 `{role, content}`，_id:false）
  - `@Schema({ timestamps: true })` 自动提供 createdAt/updatedAt（符合计划文档 schema）
- **改动文件**：
  - 新建 `server/src/database/entity/chat-session.schema.ts`（ChatSessionEntity + ChatSessionMessageEntity）
  - `server/src/database/database.module.ts`：注册 `defineMongoFeature(ChatSessionEntity)`
  - `server/src/database/service/repo/repo.service.ts`：注入 `chatSessions` Model
- **验证**：`npm run build` ✅ 编译通过（`dist/database/entity/chat-session.schema.js` 已生成）
- **提交**：见 git 历史

### 步骤 14：M2-8 会话 CRUD 接口（README 步骤 8）
- **接口**（挂在 `chat` 模块下，全部按当前登录用户隔离）：
  - `POST /chat/sessions` 创建（type/from/title 均可选，默认 chat+cocc）
  - `GET /chat/sessions?type=` 列表（摘要：id/type/from/title/messageCount/时间，按 updatedAt 倒序，上限 50）
  - `GET /chat/sessions/:id` 详情（含完整消息列表；不存在或非本人会话抛"会话不存在/无权访问该会话"）
  - `DELETE /chat/sessions/:id` 删除（同上校验）
- **改动文件**：
  - 新建 `server/src/chat/domain/dto/chat-session.dto.ts`（CreateChatSessionDto / ListChatSessionQueryDto）
  - 新建 `server/src/chat/service/chat-session.service.ts`（create/list/get/remove + findOwned 归属校验，供步骤 9 复用）
  - 新建 `server/src/chat/controller/chat-session.controller.ts`（@User() 取当前用户，写操作加 @ActionLog）
  - `server/src/chat/chat.module.ts`：imports 补 DatabaseModule，注册 controller/service，exports ChatSessionService（步骤 9 供 AgentModule 用）
  - `server/src/database/entity/chat-session.schema.ts`：补 createdAt/updatedAt 类型声明（timestamps 运行时自动维护，仓库既有惯例见 case.schema.ts）
- **验证**：`npm run build` ✅ 编译通过（首轮报 createdAt/updatedAt 类型缺失，按仓库惯例在实体类补声明后通过）
- **提交**：见 git 历史

### 步骤 15：M2-9 `/chat/stream`、`/agent/stream` 支持可选 `sessionId`（README 步骤 9）
- **兼容策略落地**：两个 DTO 均新增**可选** `sessionId`——不传保持原有无状态行为（前端回传 ≤10 条历史，老前端零改动）；传入则：
  - 开局从服务端读最近 20 条历史（`ChatSessionService.loadHistory`，替代前端 history，且放宽到 20 条）
  - 流结束后原子写回本轮问答（`appendExchange`：$push user+assistant 两条 + $slice 自动截断只留 20 条；标题为空自动取问题前 30 字；写库失败仅告警不中断响应）
  - 会话不存在/无权访问 → 按既有 Failed 异常走 SSE error 事件；会话 ID 非法（非 ObjectId）同样返回"会话不存在"
- **改动文件**：
  - `server/src/chat/service/chat-session.service.ts`：新增 `loadHistory` / `appendExchange`（原子 $push+$slice，findOwned 增加 isValidObjectId 校验，导出 SESSION_MAX_MESSAGES=20）
  - `server/src/chat/domain/dto/chat.dto.ts`、`server/src/agent/domain/agent.dto.ts`：新增可选 sessionId
  - `server/src/chat/controller/chat.controller.ts`、`server/src/agent/agent.controller.ts`：注入 @User()，向 service 传 sessionId+userId
  - `server/src/chat/service/chat.service.ts`：开局 loadHistory（历史上限 10→20 仅会话模式）、subscribeStream 累积 assistant 文本并在 complete 时写回
  - `server/src/agent/agent.service.ts`：同 chat；finalAnswer 收集（末轮 content / 兜底文案），结束前写回会话
  - `server/src/agent/agent.module.ts`：imports 补 ChatModule（复用 ChatSessionService）
- **验证**：`npm run build` ✅ 编译通过
- **提交**：见 git 历史

### 步骤 16：M2 集成验证（Docker MongoDB + 假 LLM 全链路 e2e）
- **环境搭建**（本机无真实 MongoDB/LLM key，全部本地化）：
  - Docker Desktop 起 `mongo:7` 容器 `mongo-typhoon-test`（端口 27017，库 schooltyphoon），无副本集参数可跑通
  - 测试用户 `m2test` 直接 mongosh 插入（InitService 只种 settings 不种用户）
  - 真实 LLM key 失效（deepseek 401）→ 写本地假 LLM `server/scripts/mock-llm-server.js`（OpenAI 兼容，8123 端口，可确定性回答+记录请求 roles 用于验证历史加载），通过 `/llm-models` API 设为默认大模型，模型切换无需改代码
- **e2e 脚本**：`server/scripts/session-e2e-test.js`（Node fetch，避免 Windows Git Bash 中文 GBK 乱码）
  - **16/16 全部通过**：CRUD 4 项 / 第 1 轮流式+落库 2 条+自动标题 / 第 2 轮召回历史（答案含"小明"）+落库 4 条 / agent 流式+落库 6 条 / 不存在与非法格式 sessionId → SSE `event: error` 返回"会话不存在" / 回归：无 sessionId 流式正常且不落库 / 删除后 404
- **过程中发现并修复 1 个 bug**：`chat.service.ts` 的 `loadHistory` await 原本在 try 块外——sessionId 无效时异常成为未捕获 Promise 拒绝，SSE 响应永不关闭（客户端挂起）。已移入 try 块走 `subscriber.error` → SSE error 事件正常收尾（agent.service.ts 无此问题）
- **改动文件**：`server/src/chat/service/chat.service.ts`（bug 修复）、新增 `server/scripts/mock-llm-server.js`、`server/scripts/session-e2e-test.js`
- **验证**：`npm run build` ✅ 编译通过；e2e 16/16 ✅
- **提交**：见 git 历史

### 步骤 17：Codex 审查 M2 步骤 7–9
- **修复 2 个回归/逻辑问题**：
  - `AgentService` 新增 `ChatSessionService` 依赖后，M1 单测仍按旧构造参数实例化，导致测试编译失败；已补齐测试依赖。
  - 会话模式下最终 prompt 使用了服务端历史，但意图分类仍使用前端 `history`；已统一改为 `resolvedHistory`，确保追问分类和最终回答使用同一份服务端上下文。
- **补充自动化测试**：新增会话 CRUD 核心逻辑、用户隔离、最近 20 条截断、原子写回、chat/agent 持久化和无 `sessionId` 兼容性测试。
- **环境修复**：Docker Compose 的 Node 镜像由 20.11 对齐到项目声明的 Node 22。
- **验证**：服务端构建通过；M1+M2 相关测试 14/14 通过；ESLint 与 Docker Compose 配置校验通过；真实 MongoDB 临时库验证 24 条消息写入后准确保留最后 20 条，测试库已清理。

### 步骤 18：M2-10 前端 localStorage 历史迁移到服务端会话（README 步骤 10）
- **设计（双写回退，localStorage 回退必须保留）**：
  - 加载：优先服务端最新会话（`list → get`），失败回退 localStorage 历史（空则欢迎语）
  - 发送：无 `sessionId` 自动 `createSession`；创建失败 → 提示「会话创建失败，本轮对话仅保存在本地」+ 按原有无状态方式回传历史继续；服务端报「会话不存在/无权访问」→ 置空会话、下次自动重建
  - 双写：`onComplete`/`onError` 无条件 `saveHistory`，localStorage 始终镜像最近历史，任何时刻可降级
  - chat/agent 各自独立会话；模式切换加载对应最新会话（`sessionLoadSeq` 序号 + 类型双重防竞态）；清空 = 尽力删除服务端会话 + 清空本地
- **改动文件**：
  - `client/src/app/services/apis/chat.ts`：`QueryStreamOptions` 增可选 `sessionId`；新增 `ChatSessionSummary`/`ChatSessionDetail` 接口与 `createSession`/`listSessions`/`getSession`/`deleteSession` 四个方法（均 Silent 变体，错误不弹全局 toast、由调用方处理）
  - `client/src/app/common.component/chat-panel/chat-panel.component.ts`：迁移逻辑全量（见设计）
  - 新增 `client/src/app/common.component/chat-panel/chat-panel.component.spec.ts`（9 条用例）与 `client/tsconfig.spec.chatpanel.json`——仓库 259 个历史 spec 存在大量既有编译错误（引用不存在的导出，非本步引入），无法全量跑 karma；用 scoped tsconfig + `--include` 只编译运行本组件单测
- **验证**：
  - 服务端 e2e **17/17 通过**（Docker Mongo + mock LLM 模拟联调）；前端单测 **9/9 通过**；前后端 `npm run build` ✅
  - 单测踩坑：模板 `nz-icon` 需在 TestBed 静态注册 8 个 outline 图标（`NZ_ICONS`），否则动态加载异常被 zone 捕获导致用例误失败——已注册
  - **验收口径：模拟联调通过 ≠ 迁移验收完成**——MongoDB 实机联调（部署机）列为待办（见下）
- **提交**：见 git 历史

---

## 待办（下一步）

- [x] M1：补全 5 个指挥工具——✅ 全部完成（历史台风/值班/消息/预警历史/巡道）；步骤 6 集成收尾 ✅（prompt 检查/前端映射/前后端构建通过）；20 条回归测试集已交付 `server/docs/AGENT_EVAL_SET.md`，实机执行待部署环境（本机无 MongoDB/Qdrant）
- [x] M2：服务端会话持久化——✅ 步骤 7–9 后端完成并通过 Codex 审查（`ChatSessionEntity` + 会话 CRUD + `sessionId` 可选兼容），e2e 16/16、M1+M2 相关自动化测试 14/14 通过；步骤 10 前端迁移 ✅（双写回退保留 localStorage，模拟联调 e2e 17/17 + 前端单测 9/9）
- [ ] M2 实机联调（待办）：步骤 8～10 在部署机真实 MongoDB 上整体验收——会话 CRUD、流式落库（20 条截断）、前端历史迁移；未完成前不宣称「迁移验收完成」
- [ ] M3：研判最小链路——相似历史案例结构化匹配 + `alert-analyzer` 模块编排
- [ ] M4：线路空间研判——迁移 `metro.2026.data` 到后端 + turf 风圈×线路相交计算
- [ ] M5：前端入口（COCC 一键研判按钮 + 研判卡片）+ 评估测试
- [ ] M6：打包部署（按 `DEPLOY.md` 流程）
