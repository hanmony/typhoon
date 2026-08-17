
# 台风防台智策平台 — 智能体建设项目

> 为上海轨道交通防汛防台指挥平台建设 AI 智能体。
> 本 README 是**任务规划总纲**：每一步任务有编号，按编号发指令即可执行。
> 执行进度记录在 [WORKLOG.md](WORKLOG.md)，详细技术方案在 [server/docs/AGENT_IMPLEMENTATION_PLAN.md](server/docs/AGENT_IMPLEMENTATION_PLAN.md)。

---

## 一、项目背景与目标

平台（Angular 19 + NestJS 10 + MongoDB + Qdrant）已具备完整 AI 基础设施（LLM 多模型路由、RAG 知识库、意图编排聊天、单智能体 tool loop）。本项目在此基础上建设两个智能体：

| 方向 | 目标 |
|---|---|
| **A. 增强指挥 Agent** | 把现有 `/agent/stream` 从「3 个有效工具 + 1 个占位」升级为覆盖指挥全数据域（台风/预警/事件/运营/值班/消息/巡道/历史）的防台助手，并补服务端会话持久化 |
| **B. 智能告警研判 Agent** | 台风/预警变化时自动「解读 → 逐线路影响研判 → 应急响应等级建议 → 相似历史案例 → 研判报告（SSE 流式）」 |

## 二、工作方式约定

1. **用户按步骤编号发指令**（如「开始步骤 2」），我执行该步骤并**只做该步骤**。
2. 每步完成后我执行标准收尾动作（见第六节）：更新 WORKLOG → 编译验证 → git 提交 → 推送 GitHub。
3. 每个步骤的"验收标准"是该步完成的定义；未达标则继续修，不进入下一步。

## 三、关键文档索引

| 文档 | 内容 |
|---|---|
| `WORKLOG.md` | 项目进度日志（每步做了什么、改了哪些文件、提交记录） |
| `server/docs/AGENT_IMPLEMENTATION_PLAN.md` | 详细技术方案（方向 A/B、里程碑 M1–M6、风险清单、验收标准模板） |
| `server/CLAUDE.md` / `client/CLAUDE.md` | 前后端编码规范（导入路径、模块结构、SSE 协议、响应格式等） |
| `DEPLOY.md` | Windows 部署/更新流程（打包、覆盖更新、保留项） |

## 四、开发环境速查

```bash
# 后端（首次）
cd server && npm install && npm run build      # 编译；npm run start:dev 开发运行
# 前端（首次）
cd client && npm install && npm start          # 开发服务器，proxy → http://127.0.0.1:3000
# 运行依赖：MongoDB（副本集 rs0）、Qdrant、LLM/Embedding 外部 API（配置见 server/.env）
# git：提交后 git push origin main（需本机代理 127.0.0.1:7892 运行中）
```

---

## 五、任务规划（步骤编号 = 执行顺序）

### 阶段一 M1：指挥工具补全 —— Agent 覆盖全部指挥数据域

| 步骤 | 任务 | 状态 |
|---|---|---|
| 步骤 1 | 实现 `get_typhoon_history`（占位桩补全 + 修复 getHistory 年份 bug） | ✅ 完成（2026-08-17） |
| 步骤 2 | 新增 `get_duty_info` 值班查询工具 | ✅ 完成（2026-08-17） |
| 步骤 3 | 新增 `get_messages` 指挥消息工具 | ✅ 完成（2026-08-17） |
| 步骤 4 | 新增 `get_severe_weather_history` 预警历史工具 | ⬜ 待做 |
| 步骤 5 | 新增 `get_patrolling_tours` 巡道记录工具 | ⬜ 待做 |
| 步骤 6 | M1 集成收尾：prompt 统一检查 + 前端 `TOOL_DISPLAY_NAMES` 映射 + 构建验证 + 评估 | ⬜ 待做 |

#### 步骤 1：实现 `get_typhoon_history` 工具 ✅
- **内容**：注入 `TyphoonService.getHistory(year)`；schema 改为 `year`（必填）+ `tfid`（可选）；结果摘要化（首末点/峰值风力气压/登陆点列表/采样路径概览）；无数据返回明确文案。
- **附带修复**：`typhoon.service.ts:368` 的 `getHistory` 年份参数 bug（原来永远查当前年份），同时修复生产接口 `GET /typhoon/history?year`。
- **改动文件**：`server/src/agent/tools/get-typhoon-history.tool.ts`、`server/src/agent/prompt/agent.prompt.ts`、`server/src/typhoon/service/typhoon.service.ts`。

#### 步骤 2：新增 `get_duty_info` 值班查询工具
- **数据源**：值班 Service（`/typhoonDuty`，见 `server/src/typhoon/service/`）。
- **schema**：无必填参数（可选 `date` 查询指定日期）。
- **返回**：当前指挥值班表（部门/责任人/日期），按日期分组，≤20 条；无指挥时返回"当前无指挥"。
- **改动文件**：新建 `server/src/agent/tools/get-duty-info.tool.ts`；`agent.module.ts` 注册（provider + 工厂 + inject）；`agent.prompt.ts` 工具说明。
- **验收**：问"今天谁值班"→ 工具被调用且数据与 `/typhoonDuty/list` 一致。
- **预估工作量**：0.5 天。

#### 步骤 3：新增 `get_messages` 指挥消息工具
- **数据源**：极端天气消息 Service（`/extreme/message`）。
- **schema**：无必填参数（可选 `limit`，默认 10）。
- **返回**：指挥消息（标题/内容/类型/线路/发布时间），按时间倒序 ≤10 条，长内容截断。
- **改动文件**：新建 `server/src/agent/tools/get-messages.tool.ts` + 注册 + prompt。
- **验收**：问"有哪些最新消息"→ 工具被调用且数据与 `/extreme/message/all` 一致。
- **预估工作量**：0.5 天。

#### 步骤 4：新增 `get_severe_weather_history` 预警历史工具
- **数据源**：`TyphoonService.getSevereWeatherhistory()`（已存在）。
- **schema**：无必填参数。
- **返回**：本次指挥预警历史（等级/发布时间/结束状态），按时间排序全量（体量小）。
- **改动文件**：新建 `server/src/agent/tools/get-severe-weather-history.tool.ts` + 注册 + prompt。
- **验收**：问"本次指挥发过哪些预警"→ 工具被调用且与 `/typhoon/severe-weather-history` 一致。
- **预估工作量**：0.5 天。

#### 步骤 5：新增 `get_patrolling_tours` 巡道记录工具
- **数据源**：巡道 Service（`/patrolling/tour`）。
- **schema**：无必填参数（可选 `line` 按线路过滤）。
- **返回**：巡道记录（线路/区段/起止时间/速度），按线路分组 ≤10 条。
- **改动文件**：新建 `server/src/agent/tools/get-patrolling-tours.tool.ts` + 注册 + prompt。
- **验收**：问"巡道情况如何"→ 工具被调用且与 `/patrolling/tour/list` 一致。
- **预估工作量**：0.5 天。

#### 步骤 6：M1 集成收尾
- 检查 `agent.prompt.ts` 中 5 个工具说明与 schema 一致（参数名、必填性）。
- 前端 `client/src/app/common.component/chat-panel/chat-panel.component.ts` 的 `TOOL_DISPLAY_NAMES` 增加新工具中文名（值班信息/指挥消息/预警历史/巡道记录）。
- 后端 `npm run build` + 前端 `npm run build` 编译验证。
- 用计划文档"验收标准"第 1–3、6 条做回归测试（20 条问题集）。
- **预估工作量**：0.5 天。

---

### 阶段二 M2：服务端会话持久化

| 步骤 | 任务 | 状态 |
|---|---|---|
| 步骤 7 | 新增 `ChatSessionEntity` 并注册到 DatabaseModule | ⬜ 待做 |
| 步骤 8 | 会话 CRUD 接口（创建/列表/详情/删除） | ⬜ 待做 |
| 步骤 9 | `/chat/stream`、`/agent/stream` 支持可选 `sessionId`（向后兼容） | ⬜ 待做 |
| 步骤 10 | 前端 localStorage 历史迁移到服务端会话（二期可选） | ⬜ 待做 |

**要点**：`sessionId` 可选、默认无状态，不破坏现有前端协议；服务端自动截断历史（最近 20 条），替换"前端回传 ≤10 条"限制。

---

### 阶段三 M3：研判最小链路（无空间计算）

| 步骤 | 任务 | 状态 |
|---|---|---|
| 步骤 11 | `case-matcher.service`：历史案例轨迹相似度匹配 | ⬜ 待做 |
| 步骤 12 | `alert-analyzer` 模块骨架 + SSE 事件协议（新增 `analysis` 结构化事件） | ⬜ 待做 |
| 步骤 13 | 研判编排（解读 + 应急响应等级建议 + 相似案例）+ 防编造 prompt | ⬜ 待做 |
| 步骤 14 | M3 评估（10 组场景） | ⬜ 待做 |

**要点**：用 `path-infos`（案例路径点）与当前台风 `tracks` 做轨迹相似度（同时间段最近点距离/登陆点距离），Top-3 返回事件时间线与处置摘要；所有 LLM 调用走 `LlmService`（研判用大模型）。

---

### 阶段四 M4：线路空间研判

| 步骤 | 任务 | 状态 |
|---|---|---|
| 步骤 15 | 迁移前端 `metro.2026.data` 线路坐标到后端 assets | ⬜ 待做 |
| 步骤 16 | `line-impact.service`：turf 风圈 × 线路相交研判（受影响线路 + 影响时间窗口） | ⬜ 待做 |
| 步骤 17 | 研判编排集成线路影响结果 + 评估 | ⬜ 待做 |

**要点**：放 `server/assets/line/metro-2026.json`，仿 `wind-circle.service.ts` 的 `onModuleInit` 启动加载模式；坐标系统与 wind-circle 一致；部署时 `assets/` 随发布包交付。

---

### 阶段五 M5：前端集成

| 步骤 | 任务 | 状态 |
|---|---|---|
| 步骤 18 | COCC 悬浮面板「一键研判」按钮 + `analysis` 事件渲染研判卡片 | ⬜ 待做 |
| 步骤 19 | 方向 A/B 综合评估测试（验收标准第 1–6 条） | ⬜ 待做 |

---

### 阶段六 M6：部署

| 步骤 | 任务 | 状态 |
|---|---|---|
| 步骤 20 | 打包（DEPLOY.md 7.3 发布物清单）+ 部署机覆盖更新（DEPLOY.md 6）+ 验证 | ⬜ 待做 |

**要点**：保留 `.env`/`upload`/`assets`/`logs`；前端模型管理页确认默认大/小模型；知识库按需上传预案/案例文档。

---

## 六、每步完成后的标准收尾动作（由我执行）

1. 更新 `WORKLOG.md`：追加该步骤记录（做了什么 / 结论 / 文件改动）。
2. 编译验证：后端改动 → `cd server && npm run build`；前端改动 → `cd client && npm run build`。
3. `git add` + `git commit`（message 描述该步骤，结尾含 `Co-Authored-By: Claude <noreply@anthropic.com>`）+ `git push origin main`（代理未运行时提交保留本地并告知）。
4. 更新本 README 对应步骤状态（⬜ → ✅）。
5. 若该步含验收标准，附上验证结果。

## 七、风险与依赖（详见计划文档）

- **推送依赖**：本机代理 127.0.0.1:7892 须运行，否则提交停留在本地。
- **外部台风 API**：APISpace 限流/故障时工具返回失败文案（dummy 模拟源兜底仅限指挥模拟场景）。
- **线路坐标准确性**：M4 迁移后需用真实台风做人工比对。
- **数据真实性**：所有 AI 回答必须引用工具/接口真实数据，禁止编造（prompt + 评估集双重保障）。
