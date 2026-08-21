# M6 阶段 A 报告：冻结当前状态 + 备份 + 恢复验证（2026-08-19）

> 对应 `M6_LOCAL_IMPROVEMENT_TEST_PLAN.md` 阶段 A。只做版本清单、数据备份与恢复验证，未改任何业务代码。
> 备份位置：`C:\data\backup-m6-20260819\`（本机目录，**不入 Git**）。
> 红线遵守：全程未打印/提交任何密码、SM3 摘要、API Key、私钥。

## 一、版本清单

| 组件 | 版本 | 备注 |
|---|---|---|
| Git（m2-session-persistence） | `6c3e722` | codex 的 M6 改进计划提交 |
| Node.js | v24.15.0 | |
| npm | 11.12.1 | |
| nginx | 1.28.0 | `C:\nginx\nginx-1.28.0`（与学校服务器同版本） |
| MongoDB（Docker `mongo-typhoon-test`） | mongo:7，服务端 7.0.40 | 端口 27017 |
| Qdrant（Docker `qdrant-typhoon`） | `qdrant/qdrant:latest`，服务端 1.19.0 | 端口 6333/6334；**npm 客户端 @qdrant/js-client-rest 为 1.17.x，存在版本不兼容告警（已知问题，阶段 C 固定版本）** |
| Docker | Docker Desktop（WSL2 后端，27017/6333 经 wslrelay 转发） | |

## 二、数据计数（备份前冻结快照）

| 数据 | 计数 |
|---|---|
| MongoDB `schooltyphoon.kbdocuments` | **72** |
| MongoDB `schooltyphoon.kbchunks` | **3002** |
| Qdrant `knowledge_base` 点数 | **3002**（向量维度 1024） |
| MongoDB `cases`（status=0）/ `actions` / `pathinfos` | 6 / 946 / 722 |
| MongoDB `llmmodels`（无下划线，平台实际读取） | 3（deepseek-v4-flash 为 default-large） |
| MongoDB `schooltyphoon_codex_audit.cases` | 6 |

## 三、备份清单（C:\data\backup-m6-20260819\）

| 备份项 | 内容 | 大小 |
|---|---|---|
| `mongo\dump\schooltyphoon\` | mongodump 全库（51 个集合文件） | 合计约 0.63 MB |
| `mongo\dump\schooltyphoon_codex_audit\` | mongodump 复查库（cases/actions/pathinfos） | 同上合计 |
| `qdrant\knowledge_base.snapshot` | Qdrant 集合 API 快照（48.67 MB） | 48.67 MB |
| `qdrant\storage\` | Qdrant storage 目录全量拷贝（360.21 MB） | 360.21 MB |
| `server-files\assets\` | 后端 assets（含 line/metro-2026.json、shape） | 396.9 KB |
| `server-files\upload\` | 上传目录（当前为空） | 0 KB |
| `server-files\.env` | 后端运行配置（**含密钥，仅存本机备份目录**） | — |

> 备份包未进入 Git；`.env` 含密钥，备份目录需纳入本机保密管理。

## 四、恢复验证结果

### 4.1 MongoDB 恢复（mongorestore → 临时库 schooltyphoon_restore_test）

| 集合 | 源计数 | 恢复后计数 | 结论 |
|---|---|---|---|
| kbdocuments | 72 | 72 | ✅ |
| kbchunks | 3002 | 3002 | ✅ |
| cases | 6 | 6 | ✅ |
| actions | 946 | 946 | ✅ |
| pathinfos | 722 | 722 | ✅ |

验证后已删除临时库（仅剩 schooltyphoon / schooltyphoon_codex_audit）。

### 4.2 Qdrant 恢复（快照 → 临时集合 kb_restore_test）

- 恢复方式：`PUT /collections/kb_restore_test/snapshots/recover`（**该版本接口为 PUT，POST 返回 404**；快照文件需置于目标集合的快照目录）
- 恢复后：`points_count = 3002`，维度 1024 ✅ 与源一致
- 验证后已删除临时集合（仅剩 knowledge_base）。

### 4.3 结论

**MongoDB 与 Qdrant 备份均可完整恢复，计数与源一致（72/3002/3002）。** 恢复演练通过。

## 五、运行端口与启动命令（冻结时）

| 端口 | 进程 | 启动命令 |
|---|---|---|
| 12080 | nginx（PID 33044） | `C:\nginx\nginx-1.28.0\nginx.exe -p C:\nginx\nginx-1.28.0` |
| 3000 | node 后端（PID 6852） | `node _launcher8.js`（**注意：当前从工作区 dist 启动，非发布目录**——阶段 B 待修复） |
| 27017 | wslrelay（Docker 转发） | MongoDB 容器 |
| 6333/6334 | wslrelay（Docker 转发） | Qdrant 容器 |

## 六、观察到的已知问题（记录，不修复）

1. **Qdrant 版本不兼容告警**：npm 客户端 1.17.x vs 服务端 1.19.0（`latest` 镜像）——阶段 C 固定版本。
2. **后端从工作区 dist 启动**（`_launcher8.js` 临时文件），`C:\data\sch-typhoon\server` 发布目录不存在——阶段 B 建立可复现发布。
3. **nginx 配置仅在本机**，未入仓库模板——阶段 B 补 `deploy/nginx.conf.example`。
4. 管理员初始化缺陷（`main.ts` 每次启动重置 admin 密码）——阶段 C2 修复，本阶段未动。

## 七、阶段 A 结论

✅ 版本清单完整、数据计数冻结、备份齐全、Mongo 与 Qdrant 恢复验证通过。
下一步：阶段 B（可复现发布）需 Codex 审核本报告后按计划推进。
