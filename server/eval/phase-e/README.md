# M6 阶段 E 金标准数据集（v1 / v2）

> 冻结记录：v1 2026-08-20（PDF 版）｜v2 2026-08-20（数据库重拟版）｜v2.2 纠错修订 2026-08-21
> 分支：`m2-session-persistence`

## 〇、版本说明（v1 → v2 升版原因）

- **v1**：解析《台风案例库_210道安全题库_去敏版.pdf》而来。审计发现题库引用的 8 类源文档
  （操作说明书/研究报告/四份台风信息表 xlsx/案例总览对照集/安全编制规范）不在本地知识库中，
  约 158/210 题无法由平台 agent 依据本地数据作答（详见 `server/docs/M6_PHASE_E_PREP_REPORT.md`）。
- **v2（本版）**：按用户指令（2026-08-20）**基于本地数据库已有内容重拟 210 题**：
  - 工具路由 80：平台 agent 工具场景（依据 `agent.prompt.ts` 工具清单；现有 10 个工具）；
  - 知识库 50：本地 KB 真实 chunk 内容（标注真实文档名+chunkIndex，检索指标按该 chunk 命中判定）；
  - 线路影响 20：`actions` 集合「线路行车措施」逐条记录（线路/措施/精确时间窗）；
  - 相似案例 30：`cases.values` 五案例（灿都/烟花/轩岚诺/贝碧嘉/梅花）特征；
  - 防编造/敏感拒答 30：行为规范。
  - **210/210 全部通过数据库核验**（`verify-goldset-v2.py`：工具名/知识点/KB chunk 包含性/actions 记录/案例特征）。
- 生成脚本：`build-question-bank-v2.py`（结构沿用原 `台风题库py代码/build_question_bank.py`，重写为数据库口径）。

## 一、数据集文件

| 文件 | 说明 |
|---|---|
| `gold-set.v2.jsonl` | **评估用冻结版**：210 题金标准（210 行 JSON，UTF-8） |
| `gold-set.v1.jsonl` | v1（PDF 解析版，审计用，已被 v2 取代） |
| `gold-set.schema.json` | 数据集 JSON Schema（v1/v2 通用） |
| `build-question-bank-v2.py` | v2 生成脚本（基于原出题脚本结构重写） |
| `audit-pdf-goldset.py` | v1 PDF 解析/审计脚本（只读 PDF，不提交 PDF 原文） |
| `verify-goldset-v2.py` | v2 金标准与数据库逐题核验脚本 |
| `phase-e-precheck.json` | 题集预检报告（v1 审计数据） |

## 二、版本与哈希（冻结记录）

### v2.2（当前评估基线，纠错修订）

| 项 | 值 |
|---|---|
| gold-set.v2.jsonl SHA-256 | `8009D79668C7A7284E53CFC239675F24F29E62CA57F949A5A48673866478611E` |
| 题数 | 210（编号 001-210 连续） |
| 分类 | 工具路由 80 / 知识库 50 / 线路影响 20 / 相似案例 30 / 防编造·敏感拒答 30 |
| 金标准来源 | 本地 MongoDB（schooltyphoon）：KB chunks / actions / cases.values / agent 工具清单 |
| 数据库核验 | 210/210 通过（verify-goldset-v2.py） |

v2.2 未增删题目，只修正可审计缺陷：新增 4 题受控等价工具；Q150 时间窗按
`actions` 的 `00:00—14:00` 修正；Q121/Q126/Q130 明确指定来源与概念边界；Q123
保留《历年台风影响事件》5 起的题目口径，同时明确另一份正式总结记 4 起的来源冲突。
旧 v2/v21/v22 原始结果不覆盖，正式成绩必须在 v2.2 上重新运行。

### v1（审计用，已被 v2 取代）

| 项 | 值 |
|---|---|
| PDF 文件名 | 台风案例库_210道安全题库_去敏版.pdf |
| PDF SHA-256 | `EFBEF73BD6108DE458AE596579BD2AE40A9F6559CF63F1DD5A6B7721DC7FF632` |
| PDF 页数 | 27 |
| gold-set.v1.jsonl SHA-256 | `69290BEB003D7CF5D6A411EA636575823C270D624146FC330F21573F9B60F6C7` |
| 交叉验证 | 与出题脚本 `build_question_bank.py` 逐题比对：210 题全对齐，28 处差异均为排版空白差异 |

## 三、派生字段口径（v2，不新增事实，仅从数据库内容/标注派生）

| 字段 | 口径 |
|---|---|
| `expectedTool` | 工具路由题：规范首选的平台 agent 工具；工具集扩展后仍保留用于解释 |
| `acceptableTools` | 可选。与 `expectedTool` 语义等价的受控备选工具；评分器对该数组做 OR 判定，避免把正确的新增能力判成错误 |
| `expectedArguments` | PDF/数据库未提供参数标签，本版一律 `[]`（如需参数级金标准需用户补充） |
| `expectedFacts` | = 标准答案原文 |
| `expectedSources` | 知识库题：**本地 KB 真实文档名 + chunkIndex**（检索指标按该 chunk 命中判定）；线路题：actions 集合（案例·线路行车措施）；相似题：cases 集合（五案例 values） |
| `expectedLines` | 线路影响题：`actions` 记录中的线路号（如 5号线、3号线4号线共线段） |
| `expectedRiskLevel` | 线路题按措施派生（题库编制口径）：停运=R4、限速/提前巡道=R2、交路调整/间隔调整=R3；知识库/工具路由=R1；拒答=S/F |
| `expectedTimeWindow` | 线路影响题：`actions` 记录精确时间窗（如 `2021-09-13 06:00—2021-09-14 11:00`） |
| `expectedMeasure` | 线路影响题：措施类型（停运/限速/提前巡道/交路调整/间隔调整） |
| `expectedCases` | 相似案例题：正确案例名列表（灿都/烟花/轩岚诺/贝碧嘉/梅花，五案例限定范围） |
| `refusalExpected` | 防编造/敏感拒答题（181-210）：全部 true |

## 四、环境快照（冻结时点，2026-08-20）

| 项 | 值 |
|---|---|
| Git 提交 | 基线 `6c29dc9`；v2 冻结提交见 WORKLOG |
| Prompt 版本 | `server/src/agent/prompt/agent.prompt.ts`（AgentPromptBuilder，随提交版本） |
| 默认大模型 | `MiniMax-M2.1`（`llmmodels` role=default-large，baseUrl api.wukaijin.com） |
| MongoDB | `schooltyphoon`：kbdocuments 72 / kbchunks 3002 / cases 6 / actions 946 / pathinfos 722 / llmmodels 4 |
| Qdrant | 集合 `knowledge_base`：3002 点，1024 维 |
| 台风接口快照 | `/api/typhoon/activity` @ 2026-08-20 16:08:38：tfid=202618（沙德尔）、tfid=2026（空） |
| 测试入口 | 本机 nginx `http://127.0.0.1:12080/api`（不绕过发布链路） |

## 五、冻结规则

- 金标准冻结后不得静默修改。事实纠错以小版本号、完整变更说明和新 SHA-256 留痕；题目范围或能力类别变化才升主版本。旧原始结果不得覆盖。
- PDF 原文不提交（未获用户明确允许）。
- 不提交任何 API Key / Token / 密码 / 私钥 / 个人信息；本数据集不含上述内容（敏感扫描 0 命中）。
