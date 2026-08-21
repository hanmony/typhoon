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

---

## 八、部署验证三项（2026-08-20 增补）

> 应"部署验证"要求补充三项可复现验证。本阶段未改任何业务代码；LLM 模型选择（见第 2 项）属阶段 F 前的必要决策，仅改 `llmmodels` 集合默认配置，未动代码。

### 1️⃣ Node 22 / npm 10 全新安装并验证发布

| 项 | 结果 |
|---|---|
| 运行时 | 便携版 Node v22.23.2 + npm 10.x（`C:\tools\node22\...`，与 DEPLOY.md 生产目标一致；系统 Node 为 v24，不用于发布运行） |
| 发布目录重装 | `C:\data\sch-typhoon\server` 以 Node 22 运行 `node dist\main` ✅（PID 可查、/doc 200） |
| 全链路验证 | `deploy/release-verify.js` 7/7 PASS（登录 / chat 145 字 / 一键研判 177 字 + 研判卡片 + [DONE] / kb sources=3 回答 2371 字 / 影响线路 21/21 一致） |
| 模型 | 默认大模型已切至 **MiniMax-M2.1**（`llmmodels` 集合 `default-large`；deepseek-v4-flash 推理过长、触发 LlmService 60s 空闲超时，已降级备用） |

### 2️⃣ 发布版本智能体验证独立于工作区 src

- `deploy/release-verify.js`：7 项检查全部通过 HTTP 调用 3000 端口（登录→chat→研判→kb→线路一致性），**不 import 任何工作区 src**；
- 脚本首行 `process.chdir(RELEASE_DIR)` 后才触发 `LineImpactService.onModuleInit()`，确保线路/边界资产从**发布目录** `assets\` 解析（发布目录 vs 工作区 src 双路径同一套 21 线数据）；
- 验证结论：发布版本与工作区最新代码行为一致（线路集合严格相等 21/21），独立于 src 可复现。

### 3️⃣ 启停脚本：端口占用检查 + 启动就绪检查

- `C:\data\sch-typhoon\start-typhoon.bat`：①发布产物检查（缺 `dist\main.js` 即中止）→ ②端口占用检查（`netstat` 查 `:3000 LISTENING`，被占用即中止、exit 1）→ ③启动就绪检查（轮询 `http://127.0.0.1:3000/doc`，最长 60s，返回 200 才算成功、exit 0）；
- `C:\data\sch-typhoon\stop-typhoon.bat`：①结束占用 3000 的 LISTENING 进程（按 PID taskkill）→ ②确认端口已释放，仍占用则告警、exit 1；
- **实机三连测全部通过**：后端运行中执行 start → 端口占用中止 exit 1；执行 stop → 结束进程并确认端口释放 exit 0；再执行 start → 就绪检查 ~2 秒返回 200 exit 0；
- 模板已入仓库：`deploy/start-typhoon.bat.example` / `deploy/stop-typhoon.bat.example`（`{{SERVER_DIR}}/{{PORT}}/{{WAIT_SEC}}` 占位符，部署机替换即可）；
- **编码约定（重要）**：批处理文件在系统代码页（中文 Windows 为 GBK/cp936）下解析，UTF-8 中文会破坏解析（实测报 "xx was unexpected at this time"）。因此脚本**强制 ASCII-only**，中文说明见 `deploy/README.md`。

### 部署验证结论

✅ 三项验证全部通过：Node22 全新运行发布版、验证脚本独立于工作区 src、启停脚本带端口与就绪双检查且实机通过。
