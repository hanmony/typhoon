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

---

## 待办（下一步）

- [x] M1：补全 5 个指挥工具——✅ 全部完成（历史台风/值班/消息/预警历史/巡道）；步骤 6 集成收尾 ✅（prompt 检查/前端映射/前后端构建通过）；20 条回归测试集已交付 `server/docs/AGENT_EVAL_SET.md`，实机执行待部署环境（本机无 MongoDB/Qdrant）
- [ ] M2：服务端会话持久化（`ChatSessionEntity` + 会话 CRUD + `sessionId` 可选兼容）
- [ ] M3：研判最小链路——相似历史案例结构化匹配 + `alert-analyzer` 模块编排
- [ ] M4：线路空间研判——迁移 `metro.2026.data` 到后端 + turf 风圈×线路相交计算
- [ ] M5：前端入口（COCC 一键研判按钮 + 研判卡片）+ 评估测试
- [ ] M6：打包部署（按 `DEPLOY.md` 流程）
