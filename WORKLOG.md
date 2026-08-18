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

### 步骤 D2：文献与文档盘点——过滤清单
- **工作分支**：从本步起，数据库构建全部在 codex 新建的 `data-database-audit` 分支（独立 worktree 目录 `typhoon-data-db-audit`）上进行，不再动 main；codex 已在该分支先行审查加固了 D0/D1 脚本（`server/docs/DATABASE_DATA_AUDIT.md` 有 12 项修复说明）
- **目的**：对 `台风资料` 全量文件做盘点，产出过滤清单（剔除敏感/无关文件），供 D3 文本提取直接读取；不修改核心业务代码
- **产出**：
  - `docs_import/scan_docs.py`（独立脚本）：规则表驱动分类 7 类 + SHA-256 去重 + 未归类兜底退出码 1；敏感文件只记录路径/大小/理由，绝不读取内容
  - `docs_import/filter_manifest.json`：结构化清单（D3 直接读取）
  - `docs_import/盘点清单.md`：人类可读清单
- **全量重扫结果**：
  - ✅ 保留 A 学术文献 26 篇（`文献/`，平台分类 `other`）
  - ✅ 保留 B 官方文档 34 份 = PDF 26（防汛汇编预案/处置方案 8、管理规定 2、通知 7、工作指令 7；基础数据 1；轩岚诺/梅花防御通知 2）+ docx 8（防御报告/保障要求/事件汇总/限速区段/存车方案/汇总表等）
  - ⛔ 排除敏感 18：领导身份证.pdf、梅花值班表 10、轨交支援人员联系方式、汇编附件 1–6 联络名单/应急联络表
  - ⛔ 排除无关 66：开题答辩与画图代码、会议纪要、系统建设文档、软著材料、现场照片/视频、目录索引、zip 副本等（逐条有理由）
  - ⚠️ 待定 17：.doc 老格式 12（梅花速报 9/停运预报 2/轩岚诺防御通知 1）、工作总结 docx 3、.xls 规章 1、文件名不明 `梅花.docx` 1 → D3 再定
  - 📁 M4 材料 29：地铁线路站点 shapefile/rar、坐标配置表、站名、停运行车交路
  - 🗂️ D0 领域 54：Excel 表格（clean_data.py 处理范围）
  - 去重 3（哈希相同跨目录副本）、未归类 0
- **与 README 预扫的差异**：官方 PDF 实为 26 份而非预估 27（其中 2 份与汇编目录内文件哈希相同，按内容去重）；另纳入官方 docx 8 份 → 保留清单实际 60 份（26 PDF 学术 + 26 PDF 官方 + 8 docx 官方）
- **安全红线**：敏感文件 18 份全程未读取内容、未进 git（清单只含文件名与理由）
- **改动文件**：`docs_import/scan_docs.py`（新增）、`docs_import/filter_manifest.json`、`docs_import/盘点清单.md`、`README.md`（D2 状态 ✅ + 执行结果）
- **提交**：见 git 历史

### 步骤 D3：文本提取（PDF / docx / .doc / .xls → 纯文本）
- **目的**：按 D2 过滤清单把保留文档逐份提取为纯文本，供 D4 清洗、D5 切片；不修改核心业务代码
- **产出**：`docs_import/extract_docs.py`（只读清单、绝不自行遍历源目录——敏感文件碰不到）+ `docs_import/text/`（77 份 txt，已 gitignore）+ `docs_import/extract_metadata.json`（已 gitignore）
- **提取方案**：
  - PDF：pdfplumber 主提取 → PyPDF2 降级；docx：python-docx（段落+表格按文档顺序）
  - `.doc` 老格式：MS Word COM（本机 Word 16，中文保真度完美，冒烟测试验证）→ antiword（Git mingw64 自带）降级
  - `.xls` 老格式：pandas + xlrd
- **执行结果**：
  - keep 批次 60 份：ok 57、suspect_scan 3（两份沪汛办红头通知为扫描图片版仅 2–3 字；一篇 14 页英文论文剔除重复水印后正文为空——判定逻辑含"剔除出现 ≥3 次的重复行后仍不足 200 字符"的水印启发式）
  - 学术论文 26 篇字数/页数全部合理（例如 37 页论文 97236 字；2 页会议论文 5557 字）
  - 待定批次 17 份：**全部提取成功**（12 份 .doc 经 Word COM、1 份 .xls 经 pandas、4 份 docx）——`梅花.docx` 确认为「上海轨道交通防汛防台信息快报」（22129 字），建议归 `regulation` 入库，待用户确认
  - 失败 0、跳过 0；keep 任何一份失败脚本退出码 1（兜底验收）
- **环境备注**：pdfminer 对个别 PDF 刷配色警告，已静音（不影响提取）；提取依赖 pdfplumber/PyPDF2/python-docx/xlrd（清华镜像安装）
- **改动文件**：`docs_import/extract_docs.py`（新增）、`.gitignore`（text/ 与 metadata 为构建产物）、`README.md`（D3 状态 ✅ + 执行结果）
- **提交**：见 git 历史

### 步骤 D2/D3 修订：17 份待定全部纳入、3 份疑似扫描件剔除（用户决策）
- **背景**：D3 完成后向用户报告，用户决策：① 17 份待定**全部纳入**；② 3 份疑似扫描件**不保留**
- **执行**：
  - `scan_docs.py`：4 条 pending 规则改为 `keep_official`（regulation）；新增 3 条 `exclude_scan` 规则（沪汛办 40 号/30 号/气候论文，理由注明"用户确认不保留，OCR 后可恢复"）；新增 `exclude_scan` 桶（manifest scope=scan）；删除被遮蔽的 40 号旧 keep 规则；规则表文档同步改为 8 类
  - 重跑 D2：保留 A 25、保留 B 49（34+17−2）、排除扫描件 3、待定 0、未归类 0——与预期完全一致
  - 删除 3 份扫描件残留 txt，重跑 D3：keep 74 份全部 ok（ok=74、suspect_scan 0），验收通过
- **改动文件**：`docs_import/scan_docs.py`、`docs_import/filter_manifest.json`、`docs_import/盘点清单.md`、`docs_import/extract_metadata.json`（已 gitignore）、`README.md`（D2/D3 执行结果改为修订后终态）
- **codex 审查状态**：D2、D3 及本次修订**尚未提交 codex 审查**（用户已知悉，审查建议已写入本步报告）
- **提交**：见 git 历史

### 步骤 D4：文本清洗（页眉页脚 / 断行 / 乱码）——codex 审查 D2/D3 后继续
- **背景**：codex 已审查并加固 D2/D3 脚本（提交 72b5741：scan_docs.py 敏感路径拦截/扫描件可逆开关/确定性遍历；extract_docs.py 预检 SHA-256 比对/resolve_under 越界防护/Word COM DispatchEx）。本步在 codex 版本之上做外科手术式修补（不重写），全部补丁带「2026-08-18 修订」注释与理由
- **D3 前置补丁（本步发现的两个数据质量问题）**：
  1. **docx 三倍重复根因**：本批 12 份 docx 的 XML 不规范——文本直挂 `w:p`/`w:r` 元素（规范 OOXML 文本只在 `w:t`），`itertext()` 把每句收 3 遍。修复=提取只取 `w:t`（实测全部 docx 行数不变、字数精确降至 1/3；梅花.docx 22129→7571 字；顺带剔除 posOffset 图片定位垃圾）
  2. **扫描检测漏洞**：`effective_body_chars` 只剔除频率最高 1 类水印行，漏判多类数字碎片交替的无文字层扫描件。修复=剔除全部 ≥3 次重复行 → 揪出第 4、5 份扫描件：交办运函（2023）794 号、沪汛办（2023）31 号（全文"8 8 8 8/0 0 0 0"类循环，清洗后为空触发 D4 空输出闸门）
- **执行**：
  - `scan_docs.py` 新增 2 条 `exclude_scan` 规则（794 号/31 号，restore_bucket=keep_official、restore_category=regulation，按用户扫描件政策可逆）；重跑 D2 → 终态 keep 72（学术 25 + 官方 47）、排除扫描件 5、敏感 18、无关 66、M4 29、D0 54、去重 3、待定 0
  - 重跑 D3：72 份全部 ok（codex 版预检/残留清理正常运作，旧 2 份扫描件 txt 自动清除）
  - 新建 `docs_import/clean_docs_text.py`（六条规则，参数全部来自 72 份 txt 噪声普查）：
    - R1 行内清理：`(cid:N)` 乱码剔除；含 ≥3 处且剩余可读字 <20 的整行删；CJK 相邻空格删；全角数字字母→半角
    - R2 页码：纯数字+空格 ≤16 字符出现 ≥3 次全删；罗马数字 ≥2 次全删；与长页眉相邻的裸页码连坐删（相邻关系用删除前快照判断）
    - R3 近重复：短行（key≤14）≥3 次留 1；长行（key≥15）≥5 次留 1；编号列表项（`1、`/`（一）`/`a)` 等）跨章节重复是合法语境，不参与去重
    - R4 断行合并：行尾无句末标点 + 下行首字非大写/数字编号/列表标记 → 合并；行尾连字符+下行小写 → 去连字符；短行≤20 后接长行≥40 视为标题+正文不合并；表格行（含" | "）与"==="sheet 行不合并；合并上限 1000 字
    - R5 空行压缩；R6 参考文献保留
  - **执行中发现并修复 2 个 bug**：① 邻页眉检查在页眉行已标记删除后进行，找不到邻居（修复=删除前快照，邻页眉 0→114）；② 长行近重复原为"全删"，梅花快报实测 `1、积水渗水…`×20 与固定结束语 ×15 均为正文被误删（修复=留 1 + 列表项豁免，R3 长行 344→293）
  - **最终数字**：72 份全部清洗成功，30628→11763 行、1546223→1459924 字；R1 剔 (cid) 2151 处/整行删 569；R2 页码 3059+邻页眉 114；R3 短行 1634/长行 293；R4 合并 13081；空输出退出码 1（fail-loud）
- **验收（README 抽查要求）**：✅ 学术论文（页眉留 1、cid 全清、参考文献保留、双栏交错为 D3 层已记录局限）；✅ 预案（文件编号页眉留 1 并并入前言段、正文完整）；✅ 通知（段落完整、附件清单保留）；✅ 梅花.docx 端到端单一副本；✅ 72 份全部有内容
- **改动文件**：`docs_import/clean_docs_text.py`（新增）、`docs_import/scan_docs.py`（+2 exclude_scan 规则）、`docs_import/extract_docs.py`（docx w:t-only + 扫描检测强化）、`docs_import/filter_manifest.json`、`docs_import/盘点清单.md`、`.gitignore`（text_clean/、clean_report.json）、`README.md`（D4 状态 ✅ + 执行结果 + D2/D3 终态数字）
- **codex 审查状态**：D4 及 D3 补丁已送 codex 审查，修复见下一条目
- **提交**：见 git 历史

### D4 codex 审查：修复清洗截断与产物边界（codex 提交 8cc901f，已合入）
- **审查范围**：`clean_docs_text.py` + D3 补丁（docx w:t-only / 扫描检测）+ `scan_docs.py` 文案
- **修复 5 类**（均保留原文案，仅补丁）：
  1. **R4 超长合并截断正文**（最严重）：原实现合并结果 >1000 字时 `out[-1][:MERGE_CAP]` 直接砍掉尾部——codex 改为拒绝合并、两行原样保留（`test_r4_cap_never_truncates_content` 覆盖）
  2. 表格/`=== sheet` 边界：原来只查当前行，改为两侧均不合并
  3. 空行计入 R3 去重的统计噪声：空行交给 R5（短行去重 1634→1495）
  4. 预检加固：元数据敏感路径正则拦截（命中退出码 1）+ 输出路径冲突检测 + TypeError 捕获
  5. **产物边界**：只清 `text_clean/` 内清单外旧 txt（含越界链接防护），其他文件不碰——首次运行实删 2 份已排除扫描件的残留 txt
- **附带修复**：`extract_docs.py` 的 `effective_body_chars` 改为只统计非重复行字符（换行/空行噪声不再垫高扫描件判定）；`scan_docs.py` help 文案去掉"3 份"硬编码
- **新增测试**：`docs_import/test_d4_boundaries.py`（12 项虚构边界测试，不读真实资料/敏感源文件）——本机全部通过（Ran 12 tests OK）
- **验证**：测试全绿；真实数据重跑无回归；两次运行汇总数字逐项一致（30628→11842 行、1546223→1466488 字）——超长合并修复救回 6564 字正文；`clean_report.md` 仅时间戳与 stale 计数（2→0 中间态→终态）差异
- **改动文件**：`docs_import/clean_docs_text.py`、`docs_import/extract_docs.py`、`docs_import/scan_docs.py`、`docs_import/test_d4_boundaries.py`（新增）、`docs_import/clean_report.md`、`README.md`（D4 节同步终态数字与审查结果）
- **提交**：8cc901f（codex）+ 本条目对应文档同步提交（见 git 历史）

### 步骤 D5：切片（chunking）——按平台 4 类预设切块
- **目的**：把 72 份清洗后 txt 按平台切片预设切成小块，供 D6 向量化入库；不修改核心业务代码
- **做法**：新建 `docs_import/chunk_docs.py`——切片算法逐行照抄 `chunk.service.ts`：
  - `CATEGORY_CHUNK_PRESETS` 四类预设（typhoon_case 800/80、regulation 500/50、emergency_plan 600/60、other 500/50，段落/滑窗策略）
  - `chunkByParagraph`（按空行分段累积、超长段回退滑窗、上一块尾部 overlap 字符带进下一块）
  - `chunkText`（定长滑窗 + `findBreakPoint` 断点对齐 ±20% 容忍、`trim()` 边界行为）
  - 按 TypeScript 语义移植（含 `text[end]` 越界等价跳过、`Math.floor` 取整）；**BMP 字符切片行为与平台一致**，非 BMP 字符因 JS UTF-16 码元 vs Python Unicode 字符计数差异边界可能少量偏移（实测全量 25 个，正文完整保留，报告可核对）
  - 预检沿用 D4 加固：敏感路径正则拦截、`resolve_under` 越界防护、未知分类报错、txt 缺失报错
- **执行结果**：72 份 → **3002 片**（other 25 份 2608 片滑窗、emergency_plan 9 份 175 片、regulation 38 份 219 片；typhoon_case 本次无文档——案例数据 D1 已入 MongoDB）；平均 42 片/份；空切片退出码 1
- **验收**：✅ 72 份全部有切片；✅ 抽查 3 份各取前 3 片：内容连贯、句号边界完整、相邻片重叠 48~60 字（±2 字符差为 `trim()` 吃掉边界换行所致，与平台行为一致）；✅ 报告可核对
- **产出**：`docs_import/chunks.jsonl`（已 gitignore）+ `chunk_report.json`（已 gitignore）+ `chunk_report.md`（入库）
- **改动文件**：`docs_import/chunk_docs.py`（新增）、`.gitignore`（chunks.jsonl/chunk_report.json）、`README.md`（D5 状态 ✅ + 执行结果）
- **codex 审查状态**：D5 已送 codex 审查，修复见下一条目
- **提交**：见 git 历史

### D5 codex 审查：加固切片与 D6 映射契约（codex 提交 b8b1880，已合入）
- **修复/加固**：
  1. 文档表述修正：算法移植**仅对 BMP 字符行为一致**——JS 按 UTF-16 码元、Python 按 Unicode 字符计数，非 BMP 字符（数学符号/emoji）相关切片边界可能少量偏移；新增 `NON_BMP_RE` 统计，实测全量 **25 个非 BMP 字符**（正文完整保留），写入报告并终端 WARN
  2. `chunks.jsonl` 新增 `sourceRelpath` 字段（带扩展名统一分隔符相对路径）；新增 `source_document_id`/`source_document_name`（统一分隔符，跨平台稳定）
  3. `int()` → `math.floor`（贴 JS `Math.floor` 语义）；预检新增空元数据报错、documentId 冲突检测（casefold，fail loud）
  4. **D6 契约 5 条**（已写入 README D6 节）：documentId 是临时来源键，D6 必须把 Mongo `_id` 字符串写入 kb-chunks.documentId 与 Qdrant payload.documentId；幂等匹配优先 sourceRelpath；kb-chunks 只写 documentId/chunkIndex/content/qdrantPointId 四字段；filePath 不得指向 D8 会删的临时目录；删旧数据前先验 Embedding 连通性与 1024 维
- **新增测试**：`docs_import/test_d5_boundaries.py`（10 项：预设一致/断点边界/滑窗重叠/段落切分/超长回退/非 BMP 保留/jsonl 映射/冲突 fail-loud/敏感拦截）——本机 22 项全量（D4 12 + D5 10）通过
- **验证**：重跑 D5 与 codex 产物一致（72 份 → 3002 片、非 BMP 25 个 WARN 正常）
- **改动文件**：`docs_import/chunk_docs.py`、`docs_import/test_d5_boundaries.py`（新增）、`docs_import/chunk_report.md`、`README.md`（D5/D6 节同步）
- **提交**：b8b1880（codex）+ 本条目对应文档同步提交（见 git 历史）

### 步骤 D6：向量化 + 写入 Qdrant + MongoDB 知识库表（README 步骤 D6）
- **环境**：用户提供 Embedding 三件套（`Qwen/Qwen3-Embedding-8B`，OpenAI 兼容 API）写入 `server/.env`（gitignored）；Mongo `mongo-typhoon-test`（27017）与 Qdrant `qdrant-typhoon`（6333）容器在线
- **执行**：先 `--dry-run` 预检全绿（Embedding 连通 + 1024 维 + Mongo/Qdrant 就绪 + 敏感路径拦截），再全量导入
- **过程中修复 2 个脚本 bug**（首次真实执行暴露）：
  1. `.env` 读取漏了 `EMBEDDING_BASE_URL`/`EMBEDDING_API_KEY` 两个无默认值键（`resolve_config` 只遍历 DEFAULTS）——已补入键列表
  2. `sourceRelpath` 保留原后缀（.docx/.pdf/.doc/.xls）而永久目录是 .txt——新增 `permanent_path()` 按「同 relpath 换 .txt」定位（72 份全部命中）
- **执行结果**：72 份 → **3002 片全量入库**：kb-documents 72 条（status=3）、kb-chunks 3002 条、Qdrant `knowledge_base` 3002 点，三处计数脚本自动核对一致；Embedding 中途 3 次网络抖动（1 超时 + 2 SSL 断连）重试自动恢复，无文档失败
- **验收抽查**：13 个 Qdrant 点——payload.documentId 全部为 Mongo `_id` 字符串（契约 1）、chunkIndex 与 kb-chunks 一致、向量 1024 维；kb-chunks 仅四字段 + timestamps（契约 3）；filePath 全部指向 text_permanent（契约 4）
- **产出**：`docs_import/text_permanent/`（72 份清洗文本固化进 git）+ `index_report.md`（入库）/`index_report.json`（gitignored）
- **改动文件**：`docs_import/index_docs.py`（修复 2 bug）、`README.md`（D6 状态 ✅ + 批量参数更正 16 片/重试 3 次 → 25 片/重试 2 次 + 验收记录）
- **codex 审查建议**：D6 脚本 2 处修复 + 入库数据契约值得送 codex 复核
- **提交**：见 git 历史

### D6 codex 审查：修复跨工作树幂等、正文脱敏与中断恢复（2026-08-18）
- **原 2 个 bug**：`.env` 补读 `EMBEDDING_BASE_URL` / `EMBEDDING_API_KEY` 合理；`sourceRelpath` 原后缀映射为永久 `.txt` 合理，72 份均能命中。
- **幂等缺陷与修复**：原实现把当前工作树绝对 `filePath` 当身份，只在同一路径重跑成立；现改为比较 `docs_import/text_permanent/` 后的稳定相对键，跨工作树/换机器仍按 filePath 语义删旧重建，同名不同路径文档互不覆盖。
- **中断恢复缺陷与修复**：全量复验时外部 Embedding 服务持续 SSL/超时，1 份/24 片在 2 次重试后失败并完整回滚；原提示“重跑仅重建失败文档”不实，实际会重建全部 72 份。新增 `--resume-missing`，dry-run 只选中缺失 1 份/24 片，实际补建成功并恢复 72/3002/3002；最终报告仍重建完整 72 行。
- **敏感信息处理**：72 份 `text_permanent` 中发现允许文档正文夹带公开论文邮箱、电话和一处明确联系人，共 25 份、59 处；永久 txt 与入库 chunk 共用同一脱敏规则，避免只改 Git 不改数据库。复扫 Git txt、Mongo、Qdrant：邮箱、身份证格式、手机号、带标签电话、明确联系人姓名均 0 命中；被排除的敏感源目录/文件未读取。
- **契约 1–5**：Mongo `_id` 字符串写入两端 documentId；稳定 filePath 键幂等；kbchunks 为 4 个业务字段 + schema 标准时间戳；72 个 filePath 全指向永久目录；删除旧数据前已做 Embedding 连通与 1024 维验证。README、脚本头注释、人读报告已同步真实口径。
- **全量验收**：kbdocuments 72（status=3 为 72）/ kbchunks 3002 / Qdrant 3002，向量维度 1024；滚动核对全部 3002 点，文档引用、点 ID、documentId、chunkIndex、content 错配 0，Mongo/Qdrant 双向孤儿 0。`index_report.md` 72 行、72 个唯一 Mongo ID、切片和 3002，与 gitignored JSON 结果一致。
- **测试**：D4–D6 边界测试 28/28 通过；新增 D6 6 条覆盖配置读取、后缀映射、跨工作树身份、正文脱敏、数字表格防误判、永久复制幂等。
- **范围**：仅改 `docs_import/`、`README.md`、`WORKLOG.md`；未改 `server/`、`client/`，未提交 `chunks.jsonl` / `index_report.json` / `text_clean/`。

### 步骤 D7：检索验证（2026-08-18，README 步骤 D7）
- **环境**：复用 D6 的 Mongo `mongo-typhoon-test`（27017）/ Qdrant `qdrant-typhoon`（6333）/ Embedding 三件套；data 分支 `server/.env`（gitignored）补齐缺失的 `DATABASE_URI`/`SECRET`/`PORT=3001`（值从 m2 分支本地配置静默复制，不外泄）；`llm_models` 注册 mock-chat 默认模型（本地测试库）；mock-llm（8123，m2 遗留进程）+ 本分支后端（3001）运行中
- **执行**：10 个领域问题（Q1 停运条件 / Q2 梅花台风 / Q3 淹水倒灌 / Q4 异物侵限 / Q5 气象灾害响应 / Q6 淹没韧性论文 / Q7 侧风稳定性论文 / Q8 台风路径预报论文 / Q9 台风客流论文 / Q10 敏感探测）走 `POST /kb/query`（topK=5，m2test 登录 JWT），命中片段落盘临时文件（已清理）
- **结果**：Q1–Q9 全部命中语义相关片段（顶配命中均指向对应专题文档：专项应急预案 8.1.3 风力分级限速条款、梅花防御报告/工作总结、淹水倒灌/异物侵限调度处置方案、防汛防台/气象灾害应急预案、武汉淹没韧性论文、侧风稳定性论文、4 篇路径预报论文、福州客流论文）；Q10 敏感探测 0 次命中实际敏感内容——仅命中「通讯录体系」制度性表述（无联系方式），出现的人名「耿凯亮」为文档起草人署名（修订记录元数据），非联系人/值班人员
- **验收**：✅ 9/9 领域问题命中相关片段（≥8/10 达标）；✅ 0 次敏感内容命中；✅ 原文回溯抽查 3 处（Q1/Q3 关键句在 `text_permanent/` 原文逐字命中、Q10 人名上下文核实为起草人），documentName/chunkIndex 与原文对应关系成立
- **说明**：回答文本来自本地 mock 假大模型（固定测试文本），D7 只评估检索命中不评估回答质量；管理后台知识库问答页面展示留待平台运行环境验证
- **产出**：`docs_import/d7_report.md`（新增，人读报告）
- **改动文件**：`docs_import/d7_report.md`（新增）、`README.md`（D7 状态 ✅ + 执行结果）、`WORKLOG.md`（本条目）；临时脚本/结果不入库，`server/.env` 仍 gitignored
- **codex 审查状态**：待送审（建议复核命中判定口径与报告）
- **提交**：见 git 历史

---

## 待办（下一步）

- [x] D7：检索验证——10 个领域问题走 `kb-query`/管理后台知识库问答，核对命中片段（✅ 9/9 命中相关片段、敏感 0 命中，2026-08-18，报告 `docs_import/d7_report.md`）
- [ ] D8：临时目录清理——清理 `text_clean`/`text/` 等临时产物，保留 `text_permanent/`（filePath 指向它）

- [x] M1：补全 5 个指挥工具——✅ 全部完成（历史台风/值班/消息/预警历史/巡道）；步骤 6 集成收尾 ✅（prompt 检查/前端映射/前后端构建通过）；20 条回归测试集已交付 `server/docs/AGENT_EVAL_SET.md`，实机执行待部署环境（本机 MongoDB 已就绪（Docker 容器）、Qdrant 待启动）
- [ ] M2：服务端会话持久化（`ChatSessionEntity` + 会话 CRUD + `sessionId` 可选兼容）
- [ ] M3：研判最小链路——相似历史案例结构化匹配 + `alert-analyzer` 模块编排
- [ ] M4：线路空间研判——迁移 `metro.2026.data` 到后端 + turf 风圈×线路相交计算
- [ ] M5：前端入口（COCC 一键研判按钮 + 研判卡片）+ 评估测试
- [ ] M6：打包部署（按 `DEPLOY.md` 流程）
