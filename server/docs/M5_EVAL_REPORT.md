# M5 综合评估报告（步骤 19，2026-08-19）

> 覆盖 `AGENT_IMPLEMENTATION_PLAN.md` 验收标准 1–6。Codex 审查后，本机自动化严格复验为
> **8/9 通过**；知识库回归因当前 Embedding API 返回 HTTP 404 未通过，步骤 19 暂不能标记全部完成。
>
> 执行：`node scripts/m5-eval.js`。脚本默认读取 `.env` 的 `PORT`，也可用
> `M5_BASE_URL=http://127.0.0.1:3001` 指定正在运行的后端。

## 一、本机严格复验（8/9）

| 验收标准 | 检查项 | 结果 |
|---|---|---|
| 6 回归 | `/chat/stream`：SSE、非空 token、无 error、`[DONE]` | ✅ |
| 6 回归 | `/agent/stream`：SSE、非空 token、无 error、`[DONE]` | ✅ |
| 6 回归 | `/kb/query/stream`：非空 sources、非空 content、无 error、`[DONE]` | ❌ Embedding 请求 HTTP 404 |
| 4 研判一致性 | `/alert-analyzer/stream`：唯一 analysis、非空 token、无 error、`[DONE]` | ✅ |
| 5 性能 | **常规问答首个 token** < 3s | ✅ 13ms（本地 mock 口径） |
| 5 性能 | 研判流总时长 < 30s | ✅ 82ms（本地 mock 口径） |
| 5 性能 | Agent tool loop 上限 ≤ 5 | ✅ 静态契约：`MAX_ROUNDS=5`，末轮禁用工具 |
| 4 研判一致性 | 卡片 `affectedLines` 结构非空 | ✅ 21 条 |
| 4 研判一致性 | 线路集合、最高风圈等级、时间窗与同一模拟上下文的直接空间计算严格相等 | ✅ 21/21，模拟模式，2 个当前/未来状态 |

原提交的“TTFT 7ms”实际测到的是研判接口最早的 status 事件，不是计划要求的“常规问答首字”；
原卡片核对也只做成员关系和数量比较，无法发现重复/遗漏、未知风险文案、最高等级错误或时间窗错误。
审查后的脚本按完整 SSE 事件边界采集真正 token，并对卡片执行严格集合与字段对照。

这里的线路核对证明的是“接口编排结果与当前生产 `LineImpactService` 输出一致”，不是一份独立 GIS
正确性证明；坐标与线路几何精度仍以 M4 的 shapefile/500m 容差交叉验证为依据。

## 二、Embedding 配置与复现风险

- Qdrant `knowledge_base` 当前健康，向量维度 1024、点数 **3002**。
- M2 与 data worktree 的 `EMBEDDING_BASE_URL`、`EMBEDDING_API_KEY`、`EMBEDDING_MODEL`
  当前值相同；密钥未打印、未进 Git。
- 复验时 `/kb/query/stream` 返回协议级 error：Embedding 请求 **HTTP 404**。因此原“8/8”
  是历史运行快照，当前不可复现，不能继续作为完成证据。
- 每个 Git worktree 都有独立且 gitignored 的 `.env`。从其他分支手工复制只能临时解决，
  后续仍会漂移；部署时应以受控的部署环境配置清单为唯一来源，并在启动后跑本脚本验证。
- data worktree 当前未显式设置 `EMBEDDING_DIMENSION`；M2 设置为 1024。部署配置必须显式固定
  模型、维度、Base URL 和密钥，并与已入库向量保持一致。

## 三、部署环境验收清单（M6）

| 类别 | 验收内容 | 通过条件 |
|---|---|---|
| 标准 1 工具正确性 | “2024 年有哪些台风影响上海？” | 真 LLM 调用 `get_typhoon_history`，返回真实台风且不编造 |
| 标准 2 数据真实性 | 台风/预警/事件/值班问答 | 与接口逐字段抽查一致；缺失内容明确“未知/无记录” |
| 标准 3 指挥上下文 | 无活跃指挥时询问当前值班 | 明确回答“当前无指挥”，不使用旧指挥数据 |
| 标准 4b 等级建议溯源 | 应急响应等级建议 | 真 LLM + RAG，引用可回溯的预案条款 `[n]` |
| 标准 5 真模型性能 | 常规问答首 token、研判总时长、真实工具循环 | TTFT <3s、研判 <30s、tool loop ≤5；记录模型与样本数 |
| 知识库链路 | Embedding + Qdrant + RAG | Embedding 无 4xx/5xx；固定问题返回非空 sources 和回答 |
| 实时台风数据 | 学校服务器台风接口 | 先修复当前返回结构错误，再验证实时台风、预测路径和指挥台风 |
| 后端发布物 | `npm run build` + 打包检查 | `dist/alert-analyzer` 可运行；发布包含 `assets/line/metro-2026.json` 和既有 shape/config |
| 前端发布物 | `npm run build` + nginx 实际产物 | `dist/typhoon` 部署后能看到“一键研判”及审查后的风险免责声明 |
| 配置与安全 | 部署机 `.env`/发布包 | DB、LLM、Embedding、Qdrant 配置齐全；发布包无密钥、mock 地址和测试凭据 |
| 浏览器人工检查 | Edge 打开部署地址并点击“一键研判” | 卡片字段完整、滚动正常、窄面板不溢出、取消后无迟到内容 |
| 部署后 API 冒烟 | 三个旧接口 + alert analyzer | 严格 SSE 校验全部通过，服务日志无 error |

## 四、结论

- Chat、Agent、研判接口以及严格线路卡片溯源通过。
- 本机 mock 的 13ms/82ms 仅证明采集方式和预算门槛有效，**不能代表真模型性能**。
- 知识库回归当前失败，因此 M5 步骤 19 状态为：**审查未完全通过，等待修复 Embedding 服务后复跑**。
