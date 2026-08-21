# M6 阶段 E 第 0 步报告：台风与 QWeather 数据源验收

执行日期：2026-08-20
分支：`m2-session-persistence`

## 一、范围与安全口径

本步骤只完成智能体所需台风/QWeather 数据源的配置整理、后端重启和接口验收。报告不记录 API Token、JWT、Key ID、Project ID、私钥内容、私钥绝对路径或登录凭据。

完成情况：

- 源码中的硬编码凭据已删除；
- 台风 API Host/Token 与 QWeather Host/Key ID/Project ID/私钥路径统一由 ConfigService 读取；
- 工作区和发布目录的 `.env` 均为 gitignored 文件；
- QWeather 私钥位于仓库外，访问权限仅保留给运行账户与 SYSTEM；
- 旧发布 `dist` 已保留为可回滚备份，本步骤未修改数据库和知识库。

## 二、代码与构建验证

| 项目 | 结果 |
|---|---|
| `typhoon.service.m1.spec.ts` | 3/3 通过 |
| 后端 `npm run build` | 通过 |
| 发布版后端健康检查 | 通过，3000 端口就绪 |
| `deploy/release-verify.js` | 7/7 通过 |

## 三、真实接口结果

所有请求均经本机 nginx `/api` 入口执行，仅保存脱敏统计。

| 接口 | HTTP | 结构与数量 | 结论 |
|---|---:|---|---|
| `/typhoon/activity` | 200 | 数组 2 条；首条含 `tfid`、10 个轨迹点，轨迹含 `lat/lon/data_time` | 当前台风接口通过 |
| `/typhoon/history?year=2024` | 200 | 数组 29 条；29 条均含轨迹；轨迹含风速与 7/10/12 级风圈字段 | 历史台风及 line-impact 输入契约通过 |
| `/typhoon/severe-weather` | 200 | 数组 1 条 | QWeather JWT 与当前预警接口通过 |
| `/typhoon/alert/current` | 200 | 对象包含 `alerts/typhoon/windCircle/timeContext` | 综合告警结构通过 |

首次验证时台风 API 返回 401。排查确认迁移的是源码中未使用的旧常量，而不是原 `sendRaw()` 实际调用 Token；随后从项目初始版本的原调用位置安全恢复正确配置，重启后当前与历史接口均为 200。整个排查过程未打印或写入报告任何凭据值。

## 四、结论与下一步

阶段 E 第 0 步通过，台风/QWeather 实时数据源不再阻塞质量评估。下一步建立并冻结阶段 E 金标准数据集，逐题记录标准答案、数据快照、TP/FP/FN，再计算 Accuracy、Precision、Recall 和 F1。
