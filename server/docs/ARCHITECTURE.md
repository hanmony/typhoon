# Typhoon Server - 架构与数据描述

本文档基于仓库源码分析，概述项目的数据架构、API 结构与服务器架构，便于快速理解系统设计与部署要点。

## 项目概览

- 项目基于 NestJS 构建，为台风信息与应急管理提供后端服务（Typhoon Server）。
- 使用 MongoDB（通过 Mongoose）作为主要数据存储。
- 支持 Swagger 文档（`/doc`）、全局认证（JWT）、角色鉴权、定时任务（Cron）与日志（Winston）。

## 技术栈

- **运行时：Node.js + NestJS**

    - Node.js 提供高性能异步 I/O，适合高并发场景。
    - NestJS 基于 TypeScript，支持依赖注入、模块化开发，易于维护和扩展。

- **Web 框架：NestJS**

    - 采用 MVC 架构，Controller/Service/Module 分层清晰。
    - 丰富的装饰器和中间件机制，便于实现复杂业务逻辑。
    - 支持全局管道、守卫、拦截器，提升安全性和可测试性。

- **数据库：MongoDB（Mongoose）**

    - MongoDB 为文档型数据库，灵活扩展，适合存储结构多变的数据。
    - Mongoose ODM 提供 Schema 校验、关系映射、钩子等功能，简化数据操作。

- **HTTP 客户端：@nestjs/axios**

    - 基于 Axios，支持 Promise 和拦截器，便于调用外部 API。
    - 与 NestJS 集成，支持依赖注入和全局配置。

- **调度：@nestjs/schedule**

    - 支持 Cron 表达式，便于实现定时任务和周期性数据同步。
    - 与 NestJS 生命周期集成，任务管理灵活。

- **认证/鉴权：JWT + RolesGuard**

    - JWT 无状态认证，安全高效，易于扩展多端登录。
    - RolesGuard 支持细粒度角色权限控制，提升系统安全性。

- **日志：Winston**

    - 支持多种日志级别和输出格式，便于问题追踪和运维。
    - 可扩展日志存储（如文件、数据库、远程服务）。

- **安全中间件：helmet**
    - 自动设置多种 HTTP 头，防止常见 Web 安全漏洞（如 XSS、CSRF、点击劫持等）。
    - 配置简单，提升整体安全性。

## 服务器架构

- 入口

    - `src/main.ts`：应用入口，创建 Nest 应用，配置全局 logger、helmet、Swagger（`/doc`）、启用 shutdown hooks、并读取配置服务中的 `HOST` / `PORT` 来监听。
    - 应用在启动后执行 `afterAppStarted` 初始化逻辑（如确保 admin 账号存在、初始化值班信息等）。

- 全局管线与守卫

    - 全局 `ValidationPipe`（通过 `APP_PIPE` 注入）。
    - 全局 `JwtAuthGuard` 与 `RolesGuard`（通过 `APP_GUARD` 注入），因此大多数路由需要带有 Bearer token 或有角色授权。

- 中间件与附加配置

    - `helmet()`：增强 HTTP 头安全性。
    - `trust proxy`：允许反向代理时获取真实客户端 IP。
    - Swagger：自动生成 API 文档并暴露在 `/doc`。

- 调度/后台任务

    - 使用 `@nestjs/schedule` 与 `@Cron` 定时任务，重要的任务示例：`TyphoonService` 每 5 分钟刷新台风活动并保存历史。

- 日志与错误处理
    - 使用 `WinstonLogger` 替换 Nest 默认 logger。
    - 监听 `uncaughtException` 并记录错误。

## 配置与启动

- 使用 `@nestjs/config`（`ConfigModule.forRoot()`）读取环境变量或配置文件。
- 关键环境变量：
    - `DATABASE_URI`：MongoDB 连接字符串（用于 `MongooseModule.forRootAsync`）。
    - `HOST` / `PORT`：应用监听地址与端口（在 `main.ts` 中使用 `ConfigService` 获取）。

## AI 模块架构

### 模块概览

| 模块 | 职责 | 关键文件 | 端点 |
|------|------|---------|------|
| `llm` | LLM 基础设施层 | `LlmService`, `SseParser`, `types.ts` | 无（内部服务） |
| `chat` | 意图分类 + 数据聚合聊天 | `IntentClassifier`, `DataAggregator`, `PromptBuilder` | `POST /chat/stream` |
| `agent` | Tool-calling Agent 循环 | `AgentService`, `ToolRegistry`, 4 个 tool 实现 | `POST /agent/stream` |
| `knowledge-base` | RAG 知识库（文档管道 + 检索） | `RagService`, `EmbeddingService`, `QdrantService`, `DocumentService` | `/kb/document/*`, `/kb/query` |

### 模块依赖

```
LlmModule (LlmService + SseParser + 共享类型)
     ↑          ↑          ↑
     │          │          │
AgentModule  ChatModule  KnowledgeBaseModule
```

- LlmModule 是所有 LLM 调用的唯一入口
- Chat 和 Agent 互不依赖，各自独立
- KnowledgeBase 只保留 RAG 管道（文档摄入 + 向量检索）

### Chat 数据流

```
用户问题 → IntentClassifier（关键词 + LLM fallback）
         → DataAggregator（并行获取 alert/rag/events/operations）
         → PromptBuilder（构建结构化 system prompt）
         → LlmService.chatStream() → SSE 流式输出
```

数据源映射：

| 数据源 | 说明 | 来源服务 |
|--------|------|---------|
| `alert` | 台风实时数据（位置、风圈、预警、登陆预测） | `AlertService.getCurrentAlerts()` |
| `rag` | 防汛知识库（预案、应急措施、历史案例） | `RagService.query()` |
| `command-active` | 当前活跃的事件和运营调整 | `EventService.getActive()` + `OperationService.getActive()` |
| `command-all` | 本次指挥的全部事件和运营调整 | `EventService.getAll()` + `OperationService.getAll()` |

### Agent 数据流

```
用户问题 → AgentService.chatStream()
         → LlmService.chatStreamWithTools()（带 function calling）
         → ToolRegistry.execute()（根据 tool_calls 执行工具）
         → 结果回传 LLM → 最多 5 轮 → 最终文本 SSE 输出
```

已实现的工具：
- `GetCurrentStatusTool` → 当前台风预警状态
- `GetOperationsTool` → 活跃/全部事件和运营调整
- `SearchDocumentsTool` → RAG 知识库检索
- `GetTyphoonHistoryTool` → 历史台风查询（占位）

### LlmService 能力

| 方法 | 模式 | 用途 |
|------|------|------|
| `chat()` | 非流式 | 简单问答、意图分类 fallback |
| `chatStream()` | 流式 | Chat 模块的流式输出 |
| `chatWithTools()` | 非流式 + tool_calls | Agent 非流式场景 |
| `chatStreamWithTools()` | 流式 + tool_calls | Agent 主流程 |

`SseParser` 是框架无关的 SSE 流解析工具，合并了流式方法中的重复解析逻辑。

## 数据架构（MongoDB + Mongoose）

数据库模块位于 `src/database/database.module.ts`，通过 `MongooseModule.forFeature([...])` 注册各个实体（collection）。核心实体包括（但不限于）：

- `StaffEntity`（员工/用户）
- `CaseEntity`（案件）

# Typhoon Server 系统架构说明

- `ActionEntity`（操作日志）
- `TyphoonEntity`（台风主数据）
- `TyphoonCommandEntity`（台风/命令/指挥信息）
- `TyphoonDutyEntity`（值班信息）
- `TyphoonSevereWeatherHistoryEntity`（严重天气历史）
- name: string
- enname: string
- isactive: string
- warnlevel: string
- starttime: string
- endtime: string
- centerlat/centerlng: string
- points: TyphoonPointDto[]

- `user`：用户管理相关接口（`src/userman/controller/user/user.controller.ts`）

    - `GET /user/all`：获取所有用户
    - `POST /user/list`：按条件查询用户列表
    - `GET /user/my-info`：获取当前用户信息

- `typhoon`：台风基础数据与相关查询（`src/typhoon/controller/typhoon.controller.ts`）
- `typhoonCommand`：台风指挥/命令相关接口
  Swagger
- 自动生成的 Swagger 文档位于 `/doc`，包含请求/响应 DTO 的定义（通过 `@ApiResponse`、`@ApiBody` 注解）。

示例流程（台风数据获取）

- 后端定时从外部 API 抓取台风活动（`TyphoonService.sendRaw()`），将台风数据写入 `typhoons` 集合，并把严重天气写入 `typhoonSevereWeathers` 历史集合。

- HTTPS/反向代理：在反向代理（Nginx）后面运行时启用 `trust proxy`（代码已启用）。

## 发现与注意点

## 参考文件

- `src/app.module.ts`
- `src/database/database.module.ts`
- `src/database/entity/typhoon.schema.ts`
- `src/userman/controller/user/user.controller.ts`
- `src/typhoon/typhoon.module.ts`
- `src/typhoon/service/typhoon.service.ts`

## 详细 API 清单

下面按照模块/控制器列出项目中的主要路由、HTTP 方法、路径、请求 DTO（如果有）、响应类型以及是否需要鉴权。

- **认证（`auth`）** (`src/security/controller/auth/auth.controller.ts`)

    - `POST /auth/login` — Local 登录（Public）
        - 请求: `AuthLoginDto` (body)
        - 响应: `AuthLoginRespDto` (token, name, roles, password)
    - `POST /auth/login-x5` — X5 登录（Public）
        - 响应: `AuthLoginRespDto`
    - `POST /auth/logout` — 注销（需鉴权）
        - 响应: `CommonRespDto`

- **用户（`user`）** (`src/userman/controller/user/user.controller.ts`)

    - `GET /user/all` — 获取所有用户（需鉴权）
        - 响应: `UserDataDto[]`
    - `POST /user/list` — 条件查询用户（需鉴权，需角色）
        - 请求: `UserSearchDto`
        - 响应: `UserDataDto[]`
    - `GET /user/my-info` — 当前用户信息（需鉴权）
        - 响应: `UserDataDto`
    - `POST /user/create` — 创建用户（需角色）
        - 请求: `CreateUserDto`
        - 响应: `UserDataDto`
    - `POST /user/import` — 上传批量导入（文件）
        - 请求: multipart file (`file`)
        - 响应: `CommonRespDto`
    - `POST /user/remove`、`POST /user/change-password`、`POST /user/init-password`、`POST /user/reset-password`、`POST /user/set-roles`
        - 请求/响应: 各自 DTO (`UsernameDto`, `ChangePasswordDto`, `SetRolesDto`) / `CommonRespDto`

- **台风（`typhoon`）** (`src/typhoon/controller/typhoon.controller.ts`)

    - `GET /typhoon/activity` — 实时台风列表（需鉴权）
        - 响应: `TyphoonDto[]`
    - `GET /typhoon/history?year={year}` — 历史台风列表（需鉴权）
        - 响应: `TyphoonDto[]`
    - `GET /typhoon/passTime` — 当前指挥过境时间（需鉴权）
        - 响应: `Date[]`
    - `GET /typhoon/severe-weather` — 严重天气列表（需鉴权）
        - 响应: `TyphoonSevereWeatherDto[]`
    - `GET /typhoon/severe-weather-history` — 当前指挥天气历史（需鉴权）
        - 响应: `TyphoonSevereWeatherHistoryDto[]`

- **台风指挥（`typhoonCommand`）** (`src/typhoon/controller/typhoon.command.controller.ts`)

    - `GET /typhoonCommand/info` — 返回指挥列表（需鉴权）
        - 响应: `TyphoonCommandDto[]`
    - `POST /typhoonCommand/add` — 开始新指挥（需鉴权）
        - 请求: `TyphoonCommandCreateDto`
        - 响应: `CommonRespDto`
    - `POST /typhoonCommand/updateEmergencyResponse` — 更新应急信息（需鉴权）
        - 请求: `Partial<TyphoonCommandDto>`
        - 响应: `CommonRespDto`
    - `GET /typhoonCommand/close` — 关闭指挥（需鉴权）
        - 响应: `CommonRespDto`

- **台风值班（`typhoonDuty`）** (`src/typhoon/controller/typhoon.duty.controller.ts`)

    - `GET /typhoonDuty/list` — 返回值班列表（需鉴权）
        - 响应: `TyphoonDutyDto[]`
    - `POST /typhoonDuty/batchUpdate` — 批量更新（需鉴权）
        - 请求: `TyphoonDutyDto[]`
        - 响应: `CommonRespDto`

- **台风事件（`extreme/event`）** (`src/typhoon/controller/typhoon.extreme.envent.controller.ts`)

    - `GET /extreme/event/info?line={line}` — 返回事件信息（需鉴权）
        - 响应: `TyphoonExtremeEventInfoDto`
    - `GET /extreme/event/all` — 返回事件列表（需鉴权）
        - 响应: `TyphoonExtremeEventDto[]`
    - `POST /extreme/event/add` — 新增事件（需鉴权）
        - 请求: `TyphoonExtremeEventCreateDto`
        - 响应: `CommonRespDto`
    - `POST /extreme/event/update` — 更新事件（需鉴权）
        - 请求: `TyphoonExtremeEventUpdateDto`
        - 响应: `CommonRespDto`
    - `POST /extreme/event/partial-update` — 部分更新（需鉴权）
        - 请求: `Partial<TyphoonExtremeEventUpdateDto> & { id: string }`
        - 响应: `CommonRespDto`
    - `POST /extreme/event/batch-partial-update` — 批量部分更新（需鉴权）
        - 请求: `BatchUpdateEventParams`
        - 响应: `CommonRespDto`
    - `GET /extreme/event/remove?id={id}` — 删除事件（需鉴权）
        - 响应: `CommonRespDto`

- **台风运营调整（`extreme/operation`）** (`src/typhoon/controller/typhoon.extreme.operation.controller.ts`)

    - `GET /extreme/operation/all` — 列表（需鉴权）
        - 响应: `TyphoonExtremeOperationDto[]`
    - `POST /extreme/operation/add` — 新增（需鉴权）
        - 请求: `TyphoonExtremeOperationCreateDto`
        - 响应: `CommonRespDto`
    - `POST /extreme/operation/update` — 更新（需鉴权）
        - 请求: `TyphoonExtremeOperationUpdateDto`
        - 响应: `CommonRespDto`
    - `POST /extreme/operation/partial-update` — 部分更新（需鉴权）
        - 请求: `Partial<TyphoonExtremeOperationUpdateDto> & { id: string }`
    - `POST /extreme/operation/batch-partial-update` — 批量部分更新（需鉴权）
        - 请求: `BatchUpdateOperationParams`
    - `GET /extreme/operation/remove?id={id}` — 删除（需鉴权）
    - 运营详情相关：`GET /extreme/operation/all-detail`, `POST /extreme/operation/add-detail`, `POST /extreme/operation/update-detail`, `GET /extreme/operation/remove-detail`（均为需鉴权，使用相应 DTO）

- **台风消息（`extreme/message`）** (`src/typhoon/controller/typhoon.extreme.message.controller.ts`)

    - `GET /extreme/message/padAll` — PAD 特殊列表（需鉴权）
    - `GET /extreme/message/all` — 列表（需鉴权）
    - `GET /extreme/message/read?id={id}` — 标记已读（需鉴权）
    - `POST /extreme/message/add` — 新增消息（需鉴权）
        - 请求: `TyphoonExtremeMessageCreateDto`
    - `POST /extreme/message/update` — 更新消息（需鉴权）
        - 请求: `TyphoonExtremeMessageUpdateDto`
    - `GET /extreme/message/remove?id={id}` — 删除消息（需鉴权）

- **台风巡道（`patrolling/tour`）** (`src/typhoon/controller/typhoon.extreme.patrolling.controller.ts`)

    - `GET /patrolling/tour/list` — 巡道列表（需鉴权）
    - `POST /patrolling/tour/add` — 新增巡道（需鉴权）
        - 请求: `TyphoonPatrollingTourCreateDto`
    - `GET /patrolling/tour/remove?id={id}` — 删除（需鉴权）
    - `GET /patrolling/tour/removeAllByLine?line={line}` — 按线路删除（需鉴权）

- **邮件（`mail`）** (`src/mail/controller/mail.controller.ts`)

    - `GET /mail/typhoonList` — 获取台风邮件列表（需鉴权）
    - `GET /mail/typhoonSend` — 发送台风邮件（需鉴权），请求 body: `MailTyphoonCreateDto`

- **日志（`log`）** (`src/log/controller/log.controller.ts`)

    - `POST /log/list` — 查询日志（需鉴权，需角色 admin/manager）
        - 请求: `LogSearchDto`
        - 响应: `LogListDto`

- **案例管理（`manager`）** (`src/caseman/controller/manager/manager.controller.ts`)

    - `GET /manager/cases?status={status}` — 获取案例列表（需鉴权）
    - `GET /manager/case?id={id}` — 获取指定案例（需鉴权）
    - `GET /manager/path-info?id={caseId}` — 获取案例路径点（需鉴权）
    - `GET /manager/next?case={caseId}&lastid={lastEventId}` — 获取下一个事件（需鉴权）
    - `GET /manager/events?caseId={caseId}&category={category}` — 获取事件列表（需鉴权）

- **案例导入（`manager`）** (`src/caseman/controller/case.importer/case.importer.controller.ts`)

    - `POST /manager/import` — 导入案例（文件，需角色）
    - `POST /manager/import-path-info?case={caseId}` — 导入路径信息（文件，需角色）

- **案例编辑（`manager/editor`）** (`src/caseman/controller/case.editor/case.editor.controller.ts`)

    - 多个接口用于开始/结束编辑、激活/下架、导入/下载报告、上传/下载/删除附件、更新事件/案例属性等（详见控制器注解与 DTO）。

- **文件上传（`uploadFile`）** (`src/accessory/controller/accessory.controller.ts`)
    - `POST /uploadFile/upload` — 上传附件（multipart file，最大 10MB）
        - 响应: `CommonRespDto`（返回文件下载 URL）
    - `GET /uploadFile/download?name={filename}` — 下载附件（Public）

## 数据库实体字段（详细）

下面列出 `src/database/entity` 中注册到 `DatabaseModule` 的实体及其字段（类型与说明）：

- `StaffEntity` (`staff.schema.ts`)

    - `username: string` — 用户名（unique）
    - `password: string` — 密码（hash 存储）
    - `passwordError: number` — 密码错误计数（超过 5 可锁定）
    - `roles: string[]` — 角色数组
    - `nickname: string` — 显示名（索引）
    - `status: number` — 状态（0 在职，1 禁用，-1 删除）
    - `department: string` — 部门
    - `job: string` — 岗位
    - `line: string` — 线路

- `CaseEntity` (`case.schema.ts`)

    - `_id: string` — 案例 ID
    - `name: string` — 案例名称（索引）
    - `values: Map<string, CaseConfigItem>` — 台风案例配置（Map）
    - `status: number` — 状态（枚举 CaseStatus）
    - `createdAt: Date` — 自动时间戳
    - `updatedAt: Date` — 自动时间戳
    - `CaseConfigItem` 子字段：`key, type, value, editorType, editorOptions`（均为字符串或字符串数组）

- `PathInfoEntity` (`path.info.schema.ts`)

    - `caseId: string` — 关联案例 ID（索引）
    - `time: Date` — 时间点
    - `longitude: number`, `latitude: number` — 经纬度
    - `power: string` — 风力/风速
    - `pressure: string` — 中心气压
    - `radius: string` — 风圈半径
    - `landing: string` — 登陆信息

- `ActionEntity` (`action.schema.ts`)

    - `caseId: ObjectId` — 关联案例（ObjectId, 索引）
    - `caseName: string` — 案例名称（索引）
    - `category: string` — 行为种类（索引，枚举）
    - `fromDate: Date`, `toDate: Date` — 时间范围
    - `items: Map<string,string>` — 行为数据（Map）
    - `accessories: ActionAccessoryEntity[]` — 附件数组（filename, originName, contentType, createdAt）

- `UserLogEntity` (`user.log.schema.ts`)

    - `user: string`, `name: string`, `dept: string`, `job: string`
    - `url: string`, `module: string`, `title: string`
    - `ip: string`, `useragent: string`
    - `request: string`, `response: string`
    - `createtime: Date`

- `TyphoonSevereWeatherHistoryEntity` (`typhoon.severe.weather.history.schema.ts`)

    - `commandId: string`, `alertlevel: string`, `alertlevels: string`, `alertname: string`, `alertnames: string`
    - `defenseguideline: string`, `forecaster: string`, `info: string`, `preupdatelevel: string`
    - `publishtime: string`, `publishtimes: string`, `title: string`, `warningstate: string`
    - `isEnd: number`, `endtime: Date`

- `TyphoonPatrollingTourEntity` (`typhoon.extreme.tour.schema.ts`)

    - `commandId: string`, `serialNumber: number`, `line: string`
    - `identifiers: string[]`, `startTime: Date`, `endTime: Date`, `speed: number`, `createTime: Date`

- `TyphoonExtremeOperationEntity` (`typhoon.extreme.operation.schema.ts`)

    - `commandId`, `actionType`, `close`, `customPosition`, `description`, `direction`, `distance`
    - `startStation`, `endStation`, `startTime`, `endTime`, `limit`, `line`, `locationType`, `time: Date[]`
    - `createTime`, `updateTime`, `isShow`, `source`, `actualEndTime`, `isEndTimeOptional`

- `TyphoonExtremeOpDetailEntity` (`typhoon.extreme.op.detail.schema.ts`)

    - `commandId`, `line`, `detail`, `isObstructing`, `createTime`, `updateTime`

- `TyphoonExtremeMessageEntity` (`typhoon.extreme.message.schema.ts`)

    - `commandId`, `title`, `content`, `createTime`, `updateTime`, `type`
    - `lines: string[]`, `eventIds: string[]`, `readUserIds: string[]`

- `TyphoonExtremeEventEntity` (`typhoon.extreme.event.schema.ts`)

    - `commandId`, `customPosition`, `description`, `direction`, `startStation`, `endStation`, `eventType`
    - `images: string[]`, `locationType`, `otherEvent`, `severity`, `line`
    - `urgentRepair`, `urgentRepairStatus`, `startTime`, `endTime`, `createTime`, `updateTime`, `isShow`, `terminated`
    - `effect`, `effectDuration`, `trainNumber`, `source`, `repairUnits: string[]`, `responsiblePerson`, `contactPhone`, `supervision`, `associatedPoint`

- `TyphoonDutyEntity` (`typhoon.duty.schema.ts`)

    - `department: string`, `responsible: string`

- `TyphoonCommandEntity` (`typhoon.command.schema.ts`)

    - `name: string`, `startTime: Date`, `endTime: Date`, `status: number`, `isSimulated: number`
    - `passTime: Date`, `isPass: number`
    - 市/集团应急字段：`municipalDegree`, `municipalFlag`, `corporateDegree`, `corporateFlag`

- `TyphoonEntity` (`typhoon.schema.ts`)

    - `tfid: string` (unique)
    - `name`, `enname`, `isactive`, `warnlevel`, `starttime`, `endtime`
    - `centerlat`, `centerlng`（字符串经纬度）
    - `land: TyphoonLandDto[]`, `points: TyphoonPointDto[]`

- `SettingEntity` (`settings.schema.ts`)

    - `name: string` (index, unique)
    - `label: string`, `group: string`, `description: string`, `value: string`

- 其他辅助实体（`mail.schema.ts` 等）
    - `MailEntity` 包含 `title, content, sender, receiver, createTime, readTime, isRead, type, subType, typhoonLines, typhoonEvents` 等字段。
