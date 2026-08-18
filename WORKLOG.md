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

## M3 前奏：台风案例数据清洗脚本 clean_data.py

- **目的**：把 `%APPDATA%\JetBrains\PyCharm2026.1\extensions\台风资料` 中的新台风案例数据导入 MongoDB/Qdrant 前的第一步——清理日期格式、处理缺失值、统一字段名；先做案例数据，文献（PDF）后续再处理。不修改核心业务代码。
- **文件盘点**：`台风资料` 目录存在 3 层嵌套的同名子目录（外层两层与最内层字节级重复）→ 按（文件名+文件大小）去重，49 个 Excel 中丢弃 25 个副本；27 个参与清洗，22 个过滤：
  - 过滤理由：旧版模板（01-26 修订版，被 3 月修正版取代）、重复数据（梅花数据(1)）、设计文档（台风案例库字段/6.29 台风事件字段）、值班表/联系方式（敏感信息不导入）、地铁坐标配置表与线路站名（M4 阶段用）、系统测试用例、项目进度表、防汛汇编附件等
- **字段结构分析（3 类格式）**：
  1. `案例台账`（202212台风梅花数据等）：「总览信息」sheet（类型/分类/值 三列）+ 11 类事件 sheet（与仓库 CaseImportService 的 ActionCategory 完全一致）
  2. `事件集`（2022梅花台风事件集）：日期、时间两列分开，Excel 序列日期（45181+0.4583 → 2022-09-12 11:00）
  3. `录入表`（调度各区域×6 区域）：同一台风 6 个文件需合并 + 精确去重
  4. `路径数据`：传统格式（时间/中心位置/风速风力/中心气压/风圈半径/登陆信息，日期无年份「09月08日08时」）与 JSON 结构化格式（time/lng/lat/power/speed/pressure/radius7|10|12/login）
- **清洗规则**：
  - 日期：序列日期（1900 体系）转 ISO；「MM月DD日HH时」补台风年度；「YYYY年M月D日」中文年月日归一；日期+时间两列合并；**年份纠错**：日期年份与台风年度不符且差 ≤2 年 → 校正为台风年度（如贝碧嘉文件里误写 2022-09-15 → 2024-09-15；梅花事件集序列日期解析成 2023 → 2022），共 205 处
  - 缺失值：空行/全空行丢弃；表头自动探测（前 5 行找表头）；行首空列跳过（梅花路径文件前两列为空）
  - 字段名统一：中文列名 → 英文（对齐仓库 caseman 实体：cases/actions/pathinfos），未映射列保留原名并告警
  - 告警：所有清洗动作写入 `cleaning_report.json`（按类别聚合计数）
- **实测结果**：6 个台风案例（利奇马/烟花/灿都/轩岚诺/梅花/贝碧嘉/普拉桑——7 台风名，6 案例）；梅花 20 总览项/312 事件，贝碧嘉 42/241，普拉桑 42/75，灿都 41/34，烟花 41/220，轩岚诺 41/66；路径 7 条共 722 个点（利奇马 134/烟花 147/灿都 44/轩岚诺 122/梅花 97/贝碧嘉 102/普拉桑 76）；告警 91 类共 238 处（year_fix 205、date 30、track 1、dedupe_track 2），抽查输出值全部正确
- **产出文件**：仓库根目录 `clean_data.py`（722 行，独立脚本，依赖 pandas+openpyxl）；输出 `clean_output/{cases,tracks,infra,cleaning_report}.json`（构建产物，已 gitignore，不入库）
- **用法**：`python clean_data.py [数据根目录] [输出目录]`（默认值见脚本顶部常量）
- **下一步**：文献 PDF 清洗（等用户确认）；清洗后 JSON 按仓库 caseman 结构导入 MongoDB
- **提交**：见 git 历史

### 步骤 12：制定数据导入详细计划写入 README（阶段〇 D0–D8）
- **目的**：用户要求把"接下来要做的事"（案例导入 MongoDB、文献清洗、文献切片、向量化入库）制定成详细步骤写入 README，零基础可跟做，且不修改核心业务代码
- **前期探查（本步骤完成）**：
  - 文献盘点：`文献/` 目录 **26 篇学术论文 PDF**（台风路径预报/地铁洪水韧性/列车侧风稳定性等）；散落在资料夹的**官方文档 PDF 约 27 份**（防汛汇编预案 6/规定 2/通知 6/工作指令 7、台风案例基础数据 4、轩岚诺/梅花防御通知 2，跨目录重名需按文件名+大小去重）
  - 敏感文件排除：`领导身份证.pdf`、值班表、联系方式/联络表类——不进库不进 git
  - 无关文件排除：开题报告/答辩 pptx、会议纪要、`.idea/`、数据清单 txt（留作人工核对）
  - 平台对齐（读了 4 个核心文件）：Qdrant 集合 `knowledge_base`（维度 1024、Cosine，payload 字段 content/documentId/documentName/chunkIndex/category 对齐 `qdrant.service.ts` 的 search 返回）；MongoDB `kb-documents`/`kb-chunks` 结构照抄 `kb-document.schema.ts`/`kb-chunk.schema.ts`；切片参数照抄 `chunk.service.ts` 的 `CATEGORY_CHUNK_PRESETS`（typhoon_case 800/80、regulation 500/50、emergency_plan 600/60、other 500/50）；文档分类只用平台已有 4 类（typhoon_case/regulation/emergency_plan/other），不新增分类（避免改核心代码）
  - Embedding 配置：`server/.env` 的 `EMBEDDING_MODEL/BASE_URL/API_KEY`，维度须与 `EMBEDDING_DIMENSION=1024` 一致
- **改动文件**：`README.md`（新增「阶段〇：数据导入」章节：D0–D8 步骤表 + 概念小课堂 + 前置条件 + 每步做法/改动文件/验收标准/预估工作量）
- **提交**：见 git 历史

## 2026-08-18

### 步骤 D1：案例数据导入 MongoDB（cases / actions / pathinfos）
- **目的**：把 clean_data.py 清洗出的 `clean_output/{cases,tracks}.json` 按平台 caseman 结构导入 MongoDB `schooltyphoon` 库（不修改任何核心业务代码，server/、client/ 一律不动）
- **产出**：根目录 `import_cases_to_mongo.py`（独立脚本，依赖 pymongo；`python import_cases_to_mongo.py`，支持 --uri/--input/--report）
- **导入语义对齐**（读了 caseman 导入器与前端渲染代码后确定）：
  - `cases.name` = 总览「台风命名」值；`status=0`（normal，案例库页可见）；`values` 结构照抄 ExcelBaseDto（key/type/value/editorType/editorOptions）
  - `actions.caseId` = 案例 `_id`（ObjectId）；`items` 用中文键（前端 notification-template 按 `发布方式/工作要点/预警发布` 等读取）；`fromDate/toDate` 缺失结束时间用 3000-01-01（平台约定「无结束时间」）
  - `pathinfos.caseId` = 案例 **name**（前端 `getPathInfos(detail.name)` 按名字查）；`power` 拼成「18米/秒,8级」格式、风圈半径拼成「七级：东北x 东南y 西南z 西北w；…」三段式（东北|东南|西南|西北顺序），满足前端 `getPower`/`formatRadius` 正则
- **数据落库结果**：6 案例 / 946 事件 / 7 条路径 722 点（梅花 312 事件 97 点、贝碧嘉 241/102、烟花 220/147、轩岚诺 66/122、普拉桑 75/76、灿都 34/44、利奇马仅路径 134 点——无案例台账，按源 case_id「201908利奇马」保留）
- **处理要点**：
  - 幂等：按 name 先删旧 case（连带 actions/pathinfos）再插入；连跑 3 次计数稳定
  - 「舆情及敏感信息」事件不在平台 ActionCategory 枚举（11 类），跳过（内容已在案例总览 values 中）
  - 自由文本时间尽力解析（ISO 前缀+后缀「21时起」/「9月15日18:26」/纯时刻区间锚定同类事件 mode 日期），100 条近似值全部记入 `import_report.json` 告警可核对
  - 敏感数据红线：领导身份证.pdf、值班表、联系方式类文件全程未进库未进 git
- **验收**：计数核对 ✅（导入前后 MongoDB 计数一致）；其他集合零触碰 ✅（llmmodels/staffs/settings/chatsessions/userlogs 不变）；前端渲染正则全量校验 ✅（722 点 power 0 异常、radius 0 异常）；后端 `npm run start:prod` 启动且连上该库 ✅；⚠️ 管理后台案例库页/路径大屏为登录态页面，请用户登录后人工确认（admin 账号有已设置的密码，脚本无法代验）
- **环境备注**：本机 MongoDB 为 Docker 容器 `mongo-typhoon-test`（mongo:7，映射 27017，无 --replSet rs0——只影响平台手动导入/编辑的事务接口，D1 读写不受影响）
- **改动文件**：`import_cases_to_mongo.py`（新增）、`README.md`（D1 状态 ✅ + 执行结果附录）
- **提交**：见 git 历史

### 步骤 D2–D8：文献管线 + 检索验证 + 收尾（2026-08-18，data-database-audit 分支执行）
- **说明**：D2–D8 的实际工作全部在 **data-database-audit 分支**完成（本分支为计划总纲，状态同步至此）；详细执行/验收/codex 审查结论以 data 分支 `WORKLOG.md`、`README.md`、`docs_import/*_report.md` 为准。
- **摘要**：
  - D2–D4：文献盘点（保留 72 份、排除敏感 18 份/无关 66 份/扫描件 5 份）→ 提取 → 清洗（R1–R6 规则，敏感正文脱敏）
  - D5：切片 3002 片（codex 加固 b8b1880，边界测试 28/28）
  - D6：向量化入库 72/3002/3002（codex 加固 d6491ee：跨工作树幂等、--resume-missing、正文脱敏，滚动核对 0 错配）
  - D7：检索验证（5299aad + codex 审查 0622841）——主题召回 9/9 冒烟通过、敏感 0 命中；答案证据级 7/9，Q7/Q8 需在生产问答验收前补强（结论类/方法类片段检索或重排）
  - D8：清理中间产物（text/text_clean/__pycache__），验证 kbdocuments 72 条 filePath 全部指向 text_permanent
- **改动文件（本分支）**：`README.md`（D2–D8 状态 ✅ + 阶段〇完成注记）
- **提交**：data 分支 `36cd27c`（D8）/ `0622841`（D7 审查）/ `5299aad`（D7）/ `d6491ee`（D6 加固）/ `40b4a83`（D6）

---

## 待办（下一步）

- [x] M1：补全 5 个指挥工具——✅ 全部完成（历史台风/值班/消息/预警历史/巡道）；步骤 6 集成收尾 ✅（prompt 检查/前端映射/前后端构建通过）；20 条回归测试集已交付 `server/docs/AGENT_EVAL_SET.md`，实机执行待部署环境（本机 MongoDB 已就绪（Docker 容器）、Qdrant 待启动）
- [ ] M2：服务端会话持久化（`ChatSessionEntity` + 会话 CRUD + `sessionId` 可选兼容）
- [ ] M3：研判最小链路——相似历史案例结构化匹配 + `alert-analyzer` 模块编排
- [ ] M4：线路空间研判——迁移 `metro.2026.data` 到后端 + turf 风圈×线路相交计算
- [ ] M5：前端入口（COCC 一键研判按钮 + 研判卡片）+ 评估测试
- [ ] M6：打包部署（按 `DEPLOY.md` 流程）
