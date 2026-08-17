# Typhoon 台风防台智策平台 — 部署文档（Windows）

> 适用环境：Windows Server 2019/2022（本机已部署验证，`172_17_16_17`）
> 架构：nginx 前端静态托管 + 反向代理 → Node.js(NestJS) 后端 → MongoDB / Qdrant 向量库

---

## 1. 总体架构与端口

```
浏览器
  │  http://<host>:12080
  ▼
nginx (C:\nginx-1.28.0)  ← 监听 12080
  ├── /             → 前端静态文件  C:\data\sch-typhoon\client
  ├── /api/         → 反代后端  http://localhost:3000  （rewrite 去掉 /api 前缀）
  └── /socket.io    → WebSocket 反代后端 :3000（socket.io 实时推送）
                          │
                          ▼
后端 NestJS (C:\data\sch-typhoon\server)  监听 3000  ← 由 nodemon dist/main 维持
  ├── MongoDB   mongodb://127.0.0.1:27017/schooltyphoon   （副本集 rs0，单机）
  ├── Qdrant    http://localhost:6333                     （向量库，集合 knowledge_base）
  └── 外部 AI 服务（Embedding 向量化 / LLM 对话）
```

| 组件 | 端口 | 数据/配置位置 | 启动方式 |
|---|---|---|---|
| nginx | 12080 | `C:\nginx-1.28.0\conf\nginx.conf` | Windows 服务 / 手动 |
| 后端 | 3000 | `C:\data\sch-typhoon\server` | `nodemon dist/main`（开机需自启） |
| MongoDB | 27017 | `C:\mongodb_data\db` | Windows 服务 `MongoDB`（Automatic） |
| Qdrant | 6333/6334 | `C:\data\qdrant\storage` | 计划任务 `Qdrant`（开机自启） |

---

## 2. 环境依赖（已装好，重装/新机参考）

| 软件 | 版本 | 说明 |
|---|---|---|
| Node.js | v22.x LTS | 前后端构建与运行；Node 20 已结束安全维护，Node 24 不受 Angular 19 支持 |
| npm | 10.x | 源建议用 `http://mirrors.cloud.tencent.com/npm/`（内网快） |
| MongoDB | 8.2.2 | **必须以副本集模式运行**（`--replSet rs0`），否则事务接口报错 |
| Qdrant | 1.17.0 | Windows 原生版，`C:\data\qdrant\qdrant.exe` |
| nginx | 1.28.0 | `C:\nginx-1.28.0\nginx.exe` |

### Qdrant 安装与自启（Windows 原生版，无需 Docker/WSL）
```powershell
# 解压 qdrant.exe 到 C:\data\qdrant，配置：
#   C:\data\qdrant\config.yaml：
#     storage:
#         storage_path: C:\data\qdrant\storage
#     service:
#         http_port: 6333
#         grpc_port: 6334
#         host: "0.0.0.0"

# 注册开机自启（计划任务）
schtasks /Create /TN "Qdrant" /TR "\"C:\data\qdrant\qdrant.exe\" --config-path C:\data\qdrant\config.yaml" /SC ONLOGON /RL HIGHEST /F

# 手动启动/验证
C:\data\qdrant\qdrant.exe --config-path C:\data\qdrant\config.yaml
curl http://127.0.0.1:6333/collections   # 期望 {"result":{"collections":[]},"status":"ok"}
```
> 版本注意：qdrant 服务端版本需与 `@qdrant/js-client-rest`（package.json 中为 1.17.0）**大版本一致、小版本差 ≤1**，否则启动会打印版本不兼容告警（仅告警不阻断，但建议对齐）。

### MongoDB 副本集（事务必需）
```powershell
# mongod.cfg / 服务命令行需含 --replSet rs0
# 首次启动后初始化：
mongosh --eval 'rs.initiate({_id:"rs0", members:[{_id:0, host:"localhost"}]})'
# 验证：db.hello().setName  → rs0
```
> 本机数据目录 `C:\mongodb_data\db`（库名 `schooltyphoon`）。磁盘写满会导致 mongod 因诊断文件写入失败而崩溃，**务必保证 C 盘有富余空间**。

---

## 3. 目录结构（部署机）

```
C:\data\sch-typhoon\
├── client\              前端构建产物（nginx root，勿放源码）
├── server\              后端：dist\  + node_modules\ + 配置文件 + upload\ + assets\
├── start-typhoon.bat    启动脚本
├── stop-typhoon.bat     停止脚本
└── DEPLOY.md            本文档
```

后端关键文件：
```
server\
├── dist\main.js         编译产物（启动入口）
├── node_modules\        依赖
├── .env                 运行时配置（密钥在这里，勿提交/勿外发）
├── assets\shape\        上海边界 shapefile（WindCircleService 启动时读取）
├── upload\              上传附件（shp 等）
├── config\              yml 配置（log4js 等）
└── logs\                winston 运行日志
```

---

## 4. 配置项（server\.env）

| 变量 | 说明 | 当前值 |
|---|---|---|
| `SERVER_HOST` / `PORT` | 监听地址/端口 | `0.0.0.0` / `3000` |
| `DATABASE_URI` | MongoDB 连接串 | `mongodb://127.0.0.1:27017/schooltyphoon` |
| `EMBEDDING_MODEL` | 向量化模型 | `Qwen/Qwen3-Embedding-8B` |
| `EMBEDDING_API_KEY` | 向量化服务密钥 | 由部署者填入 |
| `EMBEDDING_BASE_URL` | 向量化服务地址 | `https://api.wukaijin.com/v1` |
| `EMBEDDING_DIMENSION` | 向量维度 | `1024` |
| `QDRANT_URL` / `QDRANT_COLLECTION_NAME` | 向量库地址/集合 | `http://localhost:6333` / `knowledge_base` |
| `LLM_MODEL` / `LLM_API_KEY` / `LLM_BASE_URL` | 对话模型（仅首次迁移用） | deepseek 占位 |
| `KB_UPLOAD_DIR` 等 | 知识库上传/切分参数 | 默认即可 |

> **密钥传递方式**：代码通过 `ConfigService` 读取环境变量，**不在源码中写死**。
> 优先级：系统环境变量 > `.env.local` > `.env`。密钥放 `.env` 即可（已被 .gitignore 忽略）。
> **LLM 对话**的 key 不用 env：启动时若数据库 `llmmodels` 集合为空，会把 env 中 LLM_* 迁入数据库（default-large）；之后在「系统管理 → LLM 模型」页面管理，页面配置优先。

---

## 5. 首次部署步骤

```powershell
# 0) 前置：Node、MongoDB(副本集)、Qdrant、nginx 就绪（见第 2 节）

# 1) 解压发布包
Expand-Archive typhoon-server.zip -DestinationPath C:\data\sch-typhoon\server
Expand-Archive typhoon-client.zip -DestinationPath C:\data\_tmp_client
Copy-Item C:\data\_tmp_client\typhoon-client\dist\typhoon\* C:\data\sch-typhoon\client -Recurse

# 2) 后端依赖 + 构建
cd C:\data\sch-typhoon\server
npm install --no-audit --no-fund
npm run build            # → dist\

# 3) 配置 .env（DATABASE_URI、EMBEDDING_* 等，见第 4 节）

# 4) 启动后端（nodemon 维持）
Start-Process cmd -ArgumentList '/c','cd /d C:\data\sch-typhoon\server && nodemon dist/main > nodemon.log 2> nodemon_error.log' -WindowStyle Hidden
# 或直接双击 start-typhoon.bat

# 5) 启动 nginx
cd C:\nginx-1.28.0; .\nginx.exe

# 6) 验证
curl http://127.0.0.1:3000/                      # 后端
curl http://127.0.0.1:12080/                     # 前端
curl -X POST http://127.0.0.1:12080/api/auth/login   # 登录（admin / 296admin296）
```

### 常用命令
```powershell
# 启动后端
start-typhoon.bat
# 停止后端
stop-typhoon.bat
# 查看后端日志
Get-Content C:\data\sch-typhoon\server\nodemon.log -Tail 50
# nginx 重载（改配置后）
cd C:\nginx-1.28.0; .\nginx.exe -t; .\nginx.exe -s reload
# 进程查找
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' }
```

---

## 6. 覆盖更新流程（开发发来新 zip 后）

> 原则：**只替换代码，不覆盖数据/配置/上传内容**。以下文件/目录必须保留：
> - `server\.env`（数据库与密钥配置）
> - `server\upload\`（上传附件）
> - `server\assets\`（边界 shapefile）
> - `server\logs\`（运行日志）
> - 前端 `client\maps\`（地图瓦片，如存在）
> - MongoDB 数据 `C:\mongodb_data\db`（不碰）

```powershell
# 1) 停服
stop-typhoon.bat
# nginx 可保持，或：cd C:\nginx-1.28.0; .\nginx.exe -s stop

# 2) 备份当前版本（重要，可回滚）
$ts = Get-Date -Format yyyyMMdd-HHmm
Copy-Item C:\data\sch-typhoon\server C:\data\backup-$ts\server -Recurse
Copy-Item C:\data\sch-typhoon\client C:\data\backup-$ts\client -Recurse

# 3) 解压新包（覆盖 server；client 源码需先构建再覆盖产物）
Expand-Archive typhoon-server.zip -DestinationPath C:\data\sch-typhoon\server -Force   # 会覆盖 dist 等
# 注意：如果 zip 是 dist+package 结构，覆盖前先确认不删 .env / upload / assets
#       —— 推荐：把 zip 解到临时目录，手工把 dist、node_modules、package.json 拷进 server\

# 4) 还原被覆盖的保留项（如有）
#    若解压覆盖把 .env 冲掉 → 从备份拷回 server\.env

# 5) 依赖 + 构建（新代码有 src 时）
cd C:\data\sch-typhoon\server
npm install --no-audit --no-fund
npm run build

# 6) 前端：若 zip 含源码 → npm install && npm run build，产物拷入 client\
#    若 zip 直接是 dist 产物 → 直接覆盖 client\

# 7) 重启并验证
start-typhoon.bat
curl http://127.0.0.1:3000/ ; curl http://127.0.0.1:12080/
```
> 注意：新版本若**新增了 MongoDB 集合/索引**，后端启动时会自动建（Mongoose 同步），无需手工迁移；
> 若新增了**上传/资产文件**，确保 zip 内的 `assets\` 有同步覆盖。

---

## 7. 开发侧注意项（Linux 上开发 → Windows 部署）

### 7.1 必须遵守的 Windows 兼容规则
1. **构建脚本不要用 `rm`/`mv` 等 Linux 命令**：Windows cmd 没有。示例：`package.json` 的 clean 已改为
   `node -e "require('fs').rmSync('dist',{recursive:true,force:true})"`。新增脚本同理。
2. **路径用相对路径 / `path.join`**：上传目录（`./upload`）、资产（`assets/shape/...`）都用相对 cwd，
   部署时**必须从 `server` 目录启动**，不要从别处 `node C:\...\dist\main.js`。
3. **`sharp` 需要平台二进制**：`npm install` 后若报 `Could not load the "sharp" module`，
   执行 `npm install --os=win32 --cpu=x64 sharp` 补装。
4. **shapefile 读取要显式关闭**（已修复，勿回退）：`shapefile.open()` 返回的 source 只 `read()` 一次，
   底层文件流在 Windows 上不自动关，导致临时目录删除失败（ENOTEMPTY）。读取后调用 `source.cancel()`，
   删除时 try/重试/兜底（见 `src/typhoon/alert/wind-circle.service.ts`）。
5. **不要提交 `.env.local`**：它是开发机本地覆盖（如指向内网 IP 的数据库），
   `.env.local` 优先级高于 `.env`，一旦带上会把生产库指向开发机导致连不上。`.gitignore` 已忽略 `*.local`。
6. **数据库必须副本集**：代码用 `connection.transaction()`（案例导入/编辑等），单机 mongod 需 `--replSet rs0` 并 init，否则事务报错。

### 7.2 密钥与配置
- **不要写死密钥**。后端用 `ConfigService`（环境变量 / `.env`），前端用 `src/environments/*.ts`。
- 新增可配置项：在 `.env` 增加变量 + 代码 `config.get("XXX")`，并在文档第 4 节登记。
- 前端环境：`environment.prod.ts` 的 `baseUrl: '/api'`、`socketUrl: ''`（同源走 nginx），
  构建用 `npm run build`（production 配置）。**socketUrl 留空即可**，nginx 已转发 `/socket.io`。

### 7.3 打包发布（给部署机/总包）
- 后端发布物：`dist/**` + `package.json` + `package-lock.json`（+ `assets/`、`config/`、`qdrant-config.yaml.example`）。
  - **不包含**：`node_modules`、`src`（如需源码交付另行包含）、`.env`、`upload/`、`logs/`、`qdrant-storage/`。
  - 参考 `gulpfile.mjs`：`srcfiles = ["dist/**/*", "package*.json"]`。
- 前端发布物：`dist/typhoon/**` 构建产物（**不包含** node_modules、src）。
- 部署机执行 `npm install --omit=dev`（或全量）后用 `dist/` 直接跑，无需在部署机编译。
- 若希望部署机保留源码以便二次构建，把 `src/` 一并放入，部署机 `npm run build` 前需 `npm install`（含 devDeps）。

### 7.4 交付检查单
- [ ] 无 `.env.local`、无密钥残留
- [ ] `package.json` 无 `rm -rf` 类 Linux 命令
- [ ] 新依赖是跨平台/有 Windows 二进制（sharp、qdrant 客户端等）
- [ ] 打包不含 node_modules/dist/logs/upload（除文档说明）
- [ ] README/CHANGELOG 更新

---

## 8. 常见问题

| 现象 | 排查 |
|---|---|
| 后端 3000 起不来，日志 `MODULE_NOT_FOUND` | `node_modules` 不完整 → `npm install` |
| 启动报 `sharp` 加载失败 | `npm install --os=win32 --cpu=x64 sharp` |
| 连不上数据库（ECONNREFUSED） | MongoDB 服务停止 / 磁盘写满崩溃 → `Start-Service MongoDB`，清理 C 盘 |
| 登录报「用户名或密码错误」 | 密码按 `sm3(296admin296)` 入库（首次启动自动初始化 admin） |
| `/socket.io` 握手失败 | nginx 配置缺 WebSocket 转发（见第 1 节，已配置） |
| 日志 `Client version ... incompatible with server version` | qdrant 版本与 js-client-rest 不匹配 → 对齐到 1.17.x |
| 边界加载失败 ENOTEMPTY | 见 7.1-4，确认使用修复后的 wind-circle.service.ts |
