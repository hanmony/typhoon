# M6 阶段 B 报告：可复现的本机智能体发布（2026-08-19）

> 对应 `M6_LOCAL_IMPROVEMENT_TEST_PLAN.md` 阶段 B。目标：智能体从"工作区 dist + 临时启动器"脱离，
> 建立独立、可重启、可复现的本机发布。未改任何业务代码，未动管理员密码/公网安全等范围外事项。

## 一、发布目录清单

### 后端 `C:\data\sch-typhoon\server`（217.2 MB，其中 node_modules 为主）

| 目录/文件 | 内容 | 说明 |
|---|---|---|
| `dist\` | 后端编译产物（6.3 MB） | `npm run build` 产出 |
| `assets\` | `line\metro-2026.json`（21 线/3539 点）+ `shape\Shanghai-2020-simple.zip` | 智能体空间研判与边界数据 |
| `config\` | config.yml / log4js.yml 等 | 运行时配置 |
| `qweather\` | ed25519-public.pem（公钥） | 外部台风数据源备用（未配置凭据） |
| `package.json` / `package-lock.json` | 依赖清单 | 供 `npm install --omit=dev` |
| `node_modules\` | 生产依赖（502 包） | `npm install --omit=dev` 安装 |
| `.env` | 运行时配置（含密钥，仅本机） | **不入 Git**；从工作区 server/.env 复制 |
| `upload\` / `logs\` | 上传/日志目录 | 运行时生成 |
| `start-typhoon.bat` / `stop-typhoon.bat` | 启停脚本 | 位于 `C:\data\sch-typhoon\` |

**排除**：`src`、`test`、`scripts`、`docs`、`node_modules`（安装而非打包）、`.env`（运行时单独配置）、私钥。

### 前端 `C:\data\sch-typhoon\client`（97.9 MB）

- `dist/typhoon` 构建产物（57 文件）；由 nginx 12080 提供静态服务。

### 本机 nginx `C:\nginx\nginx-1.28.0`

- 1.28.0（与学校同版本）；`conf/nginx.conf` = 12080 前端 + `/api` 反代 3000（SSE 关缓冲）+ WebSocket + `/tiles`。
- **仓库模板已提交**：`deploy/nginx.conf.example`（占位符版，部署机按实际路径填写）。

## 二、构建结果

| 项 | 结果 |
|---|---|
| 后端 `npm run build`（m2 分支，先停占用 dist 的进程） | ✅ exit 0 |
| 发布包组装（dist/package*/assets/config/qweather/.env） | ✅ |
| 发布目录 `npm install --omit=dev` | ✅ 502 包，29s |
| 前端 `npm run build` → client 部署 | ✅（此前完成） |

## 三、启动方式（受控，不再依赖临时启动器）

```powershell
# 启动后端（cwd 必须是发布目录，.env 与 assets 按 cwd 解析）
cd C:\data\sch-typhoon\server
node dist\main            # 或运行 C:\data\sch-typhoon\start-typhoon.bat
# 停止：C:\data\sch-typhoon\stop-typhoon.bat（或按端口 3000 结束进程）
# nginx：C:\nginx\nginx-1.28.0\nginx.exe -p C:\nginx\nginx-1.28.0
# 日志：C:\data\sch-typhoon\server\logs\stdout.log / stderr.log
```

## 四、独立性验证

- 3000 后端进程由发布目录启动（`node dist\main`，cwd=`C:\data\sch-typhoon\server`）。
- 启动日志确认资产从发布目录加载：
  `加载上海行政边界: C:\data\sch-typhoon\server\assets\shape\Shanghai-2020-simple.zip`、
  `线路资产已加载：21 条线 / 27 段`、`运行在 http://0.0.0.0:3000`。
- 工作区不再运行任何后端进程；`_launcher8.js` 临时启动器已弃用。

## 五、经 nginx 的智能体冒烟测试结果（12080）

| 检查项 | 结果 |
|---|---|
| 登录（/api/auth/login） | ✅ |
| chat 问答（真 LLM） | ✅ 真实回答 109 字 |
| 一键研判（/api/alert-analyzer/stream） | ✅ 研判卡片（affectedLines）+ 报告 1144 字 + `[DONE]` |
| kb 问答（/api/kb/query/stream） | ✅ sources=3 + 回答 2239 字 + `[DONE]`（kb 为 flat 格式 `{content}`） |

**冒烟结论：✅ 发布目录后端 + nginx 的智能体全链路通过。**

## 六、观察记录

1. kb 接口正文为 **flat 格式**（`{"content":"..."}`），非 typed `{"type":"token"}`——冒烟脚本需按接口格式解析（已修正）。
2. 真模型 reasoning 较长（kb 查询产生数百个 thinking 事件）——性能/稳定性属阶段 F 决策范围。
3. QWEATHER 台风数据源仍未配置（Agent 如实提示，功能受限）——待学校凭据。

## 七、交 Codex 审查

请复核：发布目录清单完整性、敏感文件排除（无 .env/私钥/密钥入库）、构建与启动方式可复现性、独立性证据、冒烟测试口径（含 kb flat 格式）。
