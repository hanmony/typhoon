# M6 阶段 E 金标准数据集 v1

> 冻结日期：2026-08-20 | 分支：`m2-session-persistence`

## 一、数据集文件

| 文件 | 说明 |
|---|---|
| `gold-set.v1.jsonl` | 210 题金标准（210 行 JSON，UTF-8） |
| `gold-set.schema.json` | 数据集 JSON Schema |
| `audit-pdf-goldset.py` | PDF 解析/审计/金标准生成脚本（只读 PDF，不提交 PDF 原文） |
| `phase-e-precheck.json` | 题集预检报告（题数/分类/标签完整性/敏感扫描） |

## 二、版本与哈希（冻结记录）

| 项 | 值 |
|---|---|
| PDF 文件名 | 台风案例库_210道安全题库_去敏版.pdf |
| PDF SHA-256 | `EFBEF73BD6108DE458AE596579BD2AE40A9F6559CF63F1DD5A6B7721DC7FF632` |
| PDF 页数 | 27 |
| gold-set.v1.jsonl SHA-256 | `69290BEB003D7CF5D6A411EA636575823C270D624146FC330F21573F9B60F6C7` |
| 题数 | 210（编号 001-210 连续） |
| 分类 | 工具路由 80 / 知识库 50 / 线路影响 20 / 相似案例 30 / 防编造·敏感拒答 30 |
| 金标准来源 | PDF 每题「标准答案 + 标注（文档/Chunk/线路/风险等级/时间窗口）」 |
| 交叉验证 | 与出题脚本 `build_question_bank.py`（台风资料/台风题库py代码）逐题比对：210 题全对齐，28 处差异均为 PDF 排版空白差异（"62 m/s"vs"62m/s"、时间窗空格），语义一致 |

## 三、派生字段口径（不新增事实，仅从 PDF 标注/答案派生）

| 字段 | 口径 |
|---|---|
| `expectedTool` | 工具路由题：标准答案中「路由到“X”」的 X（案例库 UI 功能名） |
| `expectedArguments` | PDF 未提供参数标签，本版一律 `[]`（如需参数级金标准需用户补充） |
| `expectedFacts` | = 标准答案原文 |
| `expectedSources` | = 标注「文档」「Chunk」（每题 1 个权威 chunk，PDF 未提供 0/1/2 多级相关度标签；检索指标按"权威 chunk 命中=相关、其余=不相关"的二元口径计算） |
| `expectedLines` | 线路影响题：标注「线路」 |
| `expectedRiskLevel` | 标注「风险等级」前缀（R1-R4/S3-S4/F2-F3；题库编制口径，非官方等级） |
| `expectedTimeWindow` | 标注「时间窗口」，按出题脚本规范格式补空格还原（如 `2021-09-13 06:00—2021-09-14 11:00`） |
| `expectedMeasure` | 线路影响题：从标准答案提取措施类型（停运/限速/巡道/交路调整/间隔调整/恢复运营/提前结束运营） |
| `expectedCases` | 相似案例题：从标准答案提取案例名（灿都/烟花/轩岚诺/贝碧嘉/梅花） |
| `refusalExpected` | 防编造/敏感拒答题（181-210）：全部 true |

## 四、环境快照（冻结时点，2026-08-20 16:0x）

| 项 | 值 |
|---|---|
| Git 提交 | 基线 `6c29dc9`（HEAD，阶段 E0 完成后）；金标准冻结提交见 WORKLOG |
| Prompt 版本 | `server/src/agent/prompt/agent.prompt.ts`（AgentPromptBuilder，随提交版本） |
| 默认大模型 | `MiniMax-M2.1`（`llmmodels` 集合 role=default-large，baseUrl api.wukaijin.com；注意计划文档记载 deepseek-v4-flash 为默认，实际 DB 以 MiniMax-M2.1 为准） |
| MongoDB | `schooltyphoon`：kbdocuments 72 / kbchunks 3002 / cases 6 / actions 946 / pathinfos 722 / llmmodels 4 |
| Qdrant | 集合 `knowledge_base`：3002 点，1024 维 |
| 台风接口快照 | `/api/typhoon/activity` @ 2026-08-20 16:08:38：tfid=202618（沙德尔，10 轨迹点，末点 2026-08-20 14:00）、tfid=2026（空） |
| 测试入口 | 本机 nginx `http://127.0.0.1:12080/api`（不绕过发布链路） |

## 五、冻结规则

- 金标准冻结后不得静默修改；确需修改时升为 `gold-set.v2.jsonl` 并记录变更原因。
- PDF 原文不提交（未获用户明确允许）。
- 不提交任何 API Key / Token / 密码 / 私钥 / 个人信息；本数据集不含上述内容（敏感扫描 0 命中）。
