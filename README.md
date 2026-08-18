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

### 阶段〇：数据导入（案例数据 → MongoDB · 文献 → Qdrant）

> **总原则（用户红线）**：本阶段**不修改任何核心业务代码**——`server/`、`client/` 一律不动。
> 所有工作都是**仓库根目录下的独立 Python 脚本**（与 `clean_data.py` 同一模式，依赖 pandas/openpyxl 等），输出产物不入库（已 gitignore）。
> **背景**：把 `%APPDATA%\JetBrains\PyCharm2026.1\extensions\台风资料` 里的新案例数据与文献导入平台——案例数据供 M3 相似案例匹配使用，文献供 RAG 知识库问答使用。

| 步骤 | 任务 | 状态 |
|---|---|---|
| 步骤 D0 | 案例数据清洗 `clean_data.py`（日期/缺失值/字段名统一） | ✅ 完成（2026-08-17） |
| 步骤 D1 | 案例数据导入 MongoDB（cases / actions / pathinfos） | ✅ 完成（2026-08-18） |
| 步骤 D2 | 文献与文档盘点：过滤清单（剔除敏感/无关文件） | ⬜ 待做 |
| 步骤 D3 | 文本提取：PDF / docx → 纯文本 | ⬜ 待做 |
| 步骤 D4 | 文本清洗：页眉页脚 / 断行 / 乱码 | ⬜ 待做 |
| 步骤 D5 | 切片（chunking）：按平台 4 类预设切块 | ⬜ 待做 |
| 步骤 D6 | 向量化 + 写入 Qdrant + MongoDB 知识库表 | ⬜ 待做 |
| 步骤 D7 | 检索验证：抽样提问核对命中结果 | ⬜ 待做 |
| 步骤 D8 | 收尾：清理临时文件 + 提交推送 | ⬜ 待做 |

**概念小课堂（零基础必读，每步开工前先读懂对应条目）**

- **MongoDB**：文档型数据库。数据组织为「数据库 → 集合（collection，相当于表）→ 文档（document，相当于一行 JSON）」。平台里的集合有 `cases`（案例）、`actions`（案例事件）、`pathinfos`（路径点）、`kb-documents`（知识库文档）、`kb-chunks`（知识库切片）等。
- **Qdrant**：向量数据库，专门存「向量 + 附带文字」。它不靠关键词检索，而是把问题也变成向量，找"语义上最相近"的内容（余弦相似度 Cosine）。平台配置的集合名 `knowledge_base`、维度 1024（见 `server/.env.example` 的 `QDRANT_COLLECTION_NAME` / `EMBEDDING_DIMENSION`）。
- **向量（embedding）**：把一段文字交给 Embedding 模型（平台默认 `EMBEDDING_MODEL`，见 `.env`），模型返回一串数字（如 1024 个小数），这段数字就是这段文字的"语义指纹"——意思相近的文字，向量在空间里也靠得近。这是 RAG 问答能"听懂意思"的根基。
- **切片（chunk）**：一整篇 PDF 太长，不能直接塞给模型（模型有输入长度限制，且大段混在一起检索不精准）。所以把长文按 500～800 字切成小段，每段之间留一点重叠（overlap，如 50 字），保证切断处的句子信息不丢。每片切片单独向量化、单独存 Qdrant。
- **为什么切片参数要抄平台的**：平台已有切片预设（`server/src/knowledge-base/service/chunk.service.ts` 的 `CATEGORY_CHUNK_PRESETS`，4 类文档各自一套参数）和检索代码。我们用**完全相同的分类、字段名、参数**离线切好、直接写库，平台管理后台的知识库问答就能**零改动**检索到这些新数据。

**前置条件（D1 与 D6 开工前检查）**

1. 本机 MongoDB 运行中（`mongodb://127.0.0.1:27017`，副本集 `rs0`）；Qdrant 运行中（`./scripts/start-qdrant.sh` 启动，`curl http://localhost:6333/healthz` 验证）。
2. `server/.env` 中 Embedding 三件套为真实值：`EMBEDDING_MODEL`、`EMBEDDING_BASE_URL`、`EMBEDDING_API_KEY`（模型输出的向量维度必须与 `EMBEDDING_DIMENSION=1024` 一致，否则 Qdrant 会拒绝写入）。
3. **敏感数据红线**：`领导身份证.pdf`、值班表、联系方式/联络表类文件**一律不进库、不进 git**，脚本里硬编码排除清单。

---

#### 步骤 D0：案例数据清洗 `clean_data.py` ✅
- **产出**：仓库根目录 `clean_data.py`（独立脚本）；运行后生成 `clean_output/{cases,tracks,infra,cleaning_report}.json`。
- **结果**：6 个台风案例（梅花 312 条事件 / 贝碧嘉 241 / 烟花 220 / 普拉桑 75 / 轩岚诺 66 / 灿都 34）+ 7 条路径 722 个点；日期全部 ISO 化、205 处年份笔误已校正、字段名对齐仓库实体；全部清洗动作记录在 `cleaning_report.json`。
- **验收**：✅ 输出 JSON 抽查值与原始 Excel 逐项比对正确。

#### 步骤 D1：案例数据导入 MongoDB
- **教学内容**：先读仓库 `server/src/database/entity/case.schema.ts`、`action.schema.ts`、`path.info.schema.ts`，看懂三个集合的字段含义（对照 `clean_output/` 的 JSON 结构，两者上一轮已对齐）。
- **做法**：新建根目录 `import_cases_to_mongo.py`——读 `clean_output/cases.json`、`tracks.json`，用 `pymongo` 写入 `cases` / `actions` / `pathinfos` 三个集合。脚本要点：
  - **可重复执行**：先按 `name`（或 caseId）删除该案例旧文档再插入（幂等），避免重复导入产生脏数据；
  - **不覆盖业务库其他数据**：只操作这三个集合，绝不碰其他集合；
  - 每条案例的 `values` 按仓库 `CaseConfigItem` 结构（key/type/value/editorType/editorOptions）写入。
- **改动文件**：新增 `import_cases_to_mongo.py`（业务代码零改动）。
- **验收**：MongoDB 中 6 个案例、7 条路径（722 点）计数正确；抽查「梅花」案例在管理后台案例库页可见、路径大屏可画。
- **预估工作量**：0.5 天。

**执行结果（2026-08-18）**
- **产出**：根目录 `import_cases_to_mongo.py`（独立脚本，依赖 pymongo）；导入报告 `clean_output/import_report.json`。
- **数据落库**（`mongodb://127.0.0.1:27017/schooltyphoon`，Docker 容器 `mongo-typhoon-test`）：
  - `cases` 6 条（status=0 案例库可见；name=「台风命名」值；values 按 CaseConfigItem 结构）；
  - `actions` 946 条（caseId=案例 _id、items 用中文列名对齐前端详情页、空结束时间→3000 年、自由文本时间尽力解析共 100 条近似值全部记入报告）；
  - `pathinfos` 722 点 / 7 条（caseId=案例名；power 拼回「18米/秒,8级」、贝碧嘉/普拉桑 4 段管道风圈展开为七级/十级/十二级文本——前端 `getPower`/`formatRadius` 正则对全部点校验通过）；
  - 「舆情及敏感信息」2 行跳过（不在 ActionCategory 枚举，内容已存在于总览 values）；利奇马无案例台账，其 134 个路径点按源 case_id `201908利奇马` 保留。
- **幂等**：按 name 先删旧案例+其事件、按 caseId 删旧路径再插入，重复执行结果不变（实测连跑 3 次计数稳定）。
- **验收**：✅ 计数一致（6/946/722）；✅ 其他集合零触碰；✅ 前端查询语义复现（getCases(status=0)、getPathInfos(name)、getEvents(caseId,category)）；⚠️ 管理后台页面为登录态页面，本机无账号密码，页面可见性待用户登录后人工确认（数据层已验证）。
- **环境备注**：本机 Windows 重装后 MongoDB 已不存在，本次使用 Docker 容器（mongo:7）恢复；容器未配置 `--replSet rs0`，平台事务接口（案例导入/编辑）需副本集，仅影响后台手动导入流程，D1 数据读写不受影响。

#### 步骤 D2：文献与文档盘点：过滤清单
- **盘点结果（已探明，写进脚本）**：
  - ✅ **保留 A——学术文献 26 篇**：`文献/` 目录下全部 PDF（台风路径预报、地铁洪水韧性、列车侧风稳定性等）→ 平台分类 `other`；
  - ✅ **保留 B——官方预案/规定 27 份**：`台风案例基础数据/` 4 份、`2023年防汛汇编/` 的预案 6 份、规定 2 份、通知 6 份、工作指令 7 份、轩岚诺/梅花防御通知 2 份 → 平台分类 `emergency_plan`（预案/处置方案）或 `regulation`（规定/通知/指令）；
  - ⛔ **排除——敏感**：`领导身份证.pdf`、值班表（xls/xlsx）、各单位联系方式/联络表、轨交支援人员联系方式——涉及个人信息，不进库；
  - ⛔ **排除——无关**：开题报告/开题答辩（学生作业 pptx/docx）、会议纪要（系统建设过程文档）、`.idea/` 与画图代码（开发工程文件）、`新建 文本文档 (2).txt`（只是数据清单说明，留作人工核对用）；
  - ⚠️ **待定**：防汛汇编中的 `.doc` 老格式速报、工作总结 docx——第 D3 步看 Word 是否可用再决定；
  - 📁 **留作 M4**：`上海市地铁线路和站点（最新）(1)` 目录与 rar——属于 M4 线路空间研判，本阶段不处理。
- **教学**：平台知识库文档分类只有 4 种（`typhoon_case` / `regulation` / `emergency_plan` / `other`，见 `kb-document.schema.ts`），**不能自创新分类**（那要改核心代码），所以上面每份文档必须落进这 4 类之一。
- **改动文件**：本步产出过滤清单（写入 `docs_import/` 的计划文件或直接作为 D3 脚本的常量配置）。
- **验收**：清单总数 = 53 份 PDF（26 学术 + 27 官方，跨目录重名文件按文件名+大小去重后入库），排除清单逐条有理由。
- **预估工作量**：0.5 天。

#### 步骤 D3：文本提取（PDF / docx → 纯文本）
- **做法**：新建根目录 `extract_docs.py`——遍历过滤清单，逐份提取正文，输出 `docs_import/text/` 下每份文档一个 `.txt`（UTF-8）+ 一份 `metadata.json`（文件名、路径、大小、平台分类、提取方式、字数）。
  - PDF 用 `pdfplumber`（对双栏排版、公式论文比 PyPDF2 稳）；提取失败自动降级 `PyPDF2` 再试；
  - docx 用 `python-docx`（表格也提取，一行一单元格拼成一行文本）；
  - `.doc` 老格式（速报等）：脚本里先试 `textract`/`antiword`，不可用则**跳过并在报告里列出**（不阻塞整体进度）。
- **教学**：PDF 提取难在排版——学术论文常是双栏，按行抓文字会把左栏半句和右栏半句拼成乱句；扫描版 PDF 里根本没有文字（是图片），需要 OCR，本轮先标记"疑似扫描件"（提取结果几乎为空即判定）延后处理，不硬啃。
- **改动文件**：新增 `extract_docs.py`。
- **验收**：53 份文档全部有提取结果或明确标记（跳过原因/扫描件）；每份 txt 字数与 PDF 页数粗略匹配（如 10 页论文应 ≥ 5000 字）。
- **预估工作量**：1 天。

#### 步骤 D4：文本清洗
- **做法**：新建根目录 `clean_docs_text.py`（或并入 D3 脚本）——对每份 txt 做：
  - 删页眉页脚（重复出现的页码行、期刊名/卷期行，按"同一字符串出现 ≥3 次"自动识别）；
  - 修断行：行尾无标点 + 下一行首字非大写/非数字编号 → 与下一行合并（修复双栏提取的碎行）；
  - 删参考文献前的正文注记不删内容——参考文献**保留**（问答时可能问到引用）；
  - 压缩连续空行/空格；全角半角归一（可选，中文文献建议统一全角标点）；
  - 过滤近重复段落（同一段出现 ≥2 次只留 1 次）。
- **教学**：清洗的目标不是"改内容"，而是**去掉机器提取引入的噪声**——页眉、碎行、乱码。清洗规则全部记录到报告，方便你逐条看懂"为什么改"。
- **改动文件**：新增 `clean_docs_text.py`（或并入 D3）。
- **验收**：抽查 3 份 txt（1 学术 + 1 预案 + 1 通知）人工通读无碎行乱码；清洗报告可核对。
- **预估工作量**：0.5 天。

#### 步骤 D5：切片（chunking）
- **做法**：新建根目录 `chunk_docs.py`——按平台预设切片，参数**照抄** `chunk.service.ts` 的 `CATEGORY_CHUNK_PRESETS`：

  | 文档分类 | 策略 | 每片字数 | 重叠 |
  |---|---|---|---|
  | `typhoon_case` | paragraph（按段合并） | 800 | 80 |
  | `regulation` | paragraph | 500 | 50 |
  | `emergency_plan` | paragraph | 600 | 60 |
  | `other`（学术文献） | sliding_window（滑窗） | 500 | 50 |

  - 滑窗与按段的区别：滑窗是"定长窗口向前滚"，段与段边界不断开；按段是"以自然段为单位凑块"。中文官方文档结构规整用按段；论文长段落多用滑窗。
  - 输出 `docs_import/chunks.jsonl`：每行一个切片，字段 = `{documentId, documentName, category, chunkIndex, content, chunkConfig}`。
- **教学**：切片是 RAG 效果的**关键旋钮**——片太大检索不精准（一篇 2 万字论文整段命中，回答被无关内容淹没）；片太小语义不完整（一句话孤零零命中，缺上下文）。平台预设是既有调参结果，直接沿用最稳。
- **改动文件**：新增 `chunk_docs.py`。
- **验收**：53 份文档切片完成；切片数在合理区间（53 篇 × 平均每篇 10～50 片）；任取 3 片人工检查——内容连贯、重叠部分确实重复了上一片尾部 50 字。
- **预估工作量**：0.5 天。

#### 步骤 D6：向量化 + 写入 Qdrant + MongoDB 知识库表
- **做法**：新建根目录 `index_docs.py`，分三步：
  1. **向量化**：逐片调用 `.env` 里的 `EMBEDDING_BASE_URL`（OpenAI 兼容接口，请求体同 `embedding.service.ts`），批量 16 片/次，失败重试 3 次；
  2. **写 Qdrant**：写入 `knowledge_base` 集合。每点 = `{id: 切片唯一ID, vector: 1024 维, payload: {content, documentId, documentName, chunkIndex, category}}`——payload 字段**严格对齐** `qdrant.service.ts` 的 `search()` 返回字段，平台检索才拿得到内容；
  3. **写 MongoDB**：`kb-documents` 插入 1 条文档记录（name/fileType/filePath/fileSize/status=3(chunked+indexed)/chunkCount/category/chunkConfig），`kb-chunks` 插入每片 1 条（documentId/chunkIndex/content/qdrantPointId 指向 Qdrant 点 ID）——两个集合的结构照抄 `kb-document.schema.ts`、`kb-chunk.schema.ts`。
  - **幂等**：导入前按文件名查 `kb-documents` 是否已存在 → 存在则先删 Qdrant 中该 documentId 的点 + Mongo 旧记录再写。
- **教学**：这一步你第一次完整看到"一条数据的两条命"——文字存 MongoDB（给人看/管理用），向量存 Qdrant（给机器算相似度用），靠 `qdrantPointId` 互相关联。`status=3` 表示"已入库"，管理后台知识库列表就是读这个字段显示的。
- **改动文件**：新增 `index_docs.py`（业务代码零改动）。
- **验收**：Qdrant `knowledge_base` 点数 = chunks.jsonl 行数；`kb-documents` 53 条（重名去重后）；管理后台「知识库」页面能看到新文档、状态为已入库。
- **预估工作量**：1 天（含接口调试）。

#### 步骤 D7：检索验证
- **做法**：写 10 个领域问题（如「台风期间地铁线路停运的判定条件是什么」「历史上梅花台风对上海地铁的影响」「论文里如何评估地铁网络淹没韧性」），用管理后台知识库问答提问，或直接用 `POST /kb-query` 接口检索，核对返回的命中片段：
  - 命中片段与问题**语义相关**（不是关键词碰巧撞上）；
  - 返回的 documentName/chunkIndex 能回溯到原文档对应段落；
  - 敏感文档（身份证/值班表）**查不到**。
- **验收**：10 问中 ≥8 问命中相关片段；0 次命中敏感内容。
- **预估工作量**：0.5 天。

#### 步骤 D8：收尾
- 清理 `docs_import/` 中体积大的中间文件（txt 保留或压缩，chunks.jsonl 保留）；确认 `.gitignore` 覆盖所有产物目录。
- 更新本 README 状态（⬜ → ✅）、追加 WORKLOG、git 提交并推送（代理未运行则保留本地并告知）。
- **预估工作量**：0.5 天。

---

### 阶段一 M1：指挥工具补全 —— Agent 覆盖全部指挥数据域

| 步骤 | 任务 | 状态 |
|---|---|---|
| 步骤 1 | 实现 `get_typhoon_history`（占位桩补全 + 修复 getHistory 年份 bug） | ✅ 完成（2026-08-17） |
| 步骤 2 | 新增 `get_duty_info` 值班查询工具 | ✅ 完成（2026-08-17） |
| 步骤 3 | 新增 `get_messages` 指挥消息工具 | ✅ 完成（2026-08-17） |
| 步骤 4 | 新增 `get_severe_weather_history` 预警历史工具 | ✅ 完成（2026-08-17） |
| 步骤 5 | 新增 `get_patrolling_tours` 巡道记录工具 | ✅ 完成（2026-08-17） |
| 步骤 6 | M1 集成收尾：prompt 统一检查 + 前端 `TOOL_DISPLAY_NAMES` 映射 + 构建验证 + 评估 | ✅ 完成（2026-08-17） |

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
