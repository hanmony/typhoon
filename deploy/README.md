# deploy/ 部署验证与脚本说明（中文）

本目录存放"发布版验证"与"启停脚本模板"，对应 `server/docs/M6_PHASE_B_REPORT.md` 第八节。

## 文件清单

| 文件 | 作用 |
|---|---|
| `release-verify.js` | **发布版智能体验证脚本**：7 项检查全部通过 HTTP 调用本机 3000 端口（登录 → chat → 一键研判 → kb 问答 → 影响线路一致性），不读取任何工作区源码，独立可复现。 |
| `start-typhoon.bat.example` | **后端启动脚本模板**：端口占用检查 + 启动就绪检查（轮询 /doc 最长 60 秒）。复制到目标机改名 `start-typhoon.bat`，替换 `{{SERVER_DIR}}`、`{{PORT}}`、`{{WAIT_SEC}}` 即可。 |
| `stop-typhoon.bat.example` | **后端停止脚本模板**：结束占用端口进程 + 确认端口已释放。同上替换 `{{PORT}}`。 |
| `nginx.conf.example` | nginx 反代配置模板（12080 前端 + /api SSE 反代 + WebSocket + /tiles）。 |

## 快速使用

```bat
:: 1. 把两个 .bat.example 复制到目标机，改名为 start-typhoon.bat / stop-typhoon.bat
:: 2. 用记事本打开，把 {{SERVER_DIR}} 换成发布目录（如 C:\data\sch-typhoon\server）
::    ，把 {{PORT}} 换成后端端口（默认 3000），{{WAIT_SEC}} 保持 60
:: 3. 双击 start-typhoon.bat 启动，看到 "Backend READY ... returned 200" 即成功
:: 4. 双击 stop-typhoon.bat 停止，看到 "Port 3000 released" 即已停止
```

## 脚本做了什么（给非开发同学）

- **启动脚本 start-typhoon.bat**：
  1. 先检查发布产物在不在（`dist\main.js`），不在就报错退出，避免"启动了个空壳"；
  2. 再检查端口 3000 有没有被别的程序占用，被占用就报错退出（防止两个后端打架）；
  3. 然后才启动后端，并每秒轮询一次 `http://127.0.0.1:3000/doc`，最多等 60 秒，看到 200 才提示"就绪"。
- **停止脚本 stop-typhoon.bat**：找到占用 3000 端口的进程并结束，然后确认端口真的释放了；没释放会告警。

## ⚠️ 编码约定（务必遵守）

批处理文件（.bat）由 cmd.exe 按**系统代码页**解析——中文 Windows 是 GBK（cp936）。若把脚本保存成 UTF-8（含中文），解析会错乱（实测报 `"xx" was unexpected at this time`）。
**因此所有 .bat 脚本一律只用英文 ASCII 字符**。中文说明请看本 README 与 M6 报告，不要写进 .bat。
另外 `{{SERVER_DIR}}` 路径不要含空格（批处理引号规则限制）。

## 验证记录（2026-08-20 实机）

1. 后端运行中执行 start → `ERROR: port 3000 is already in use`，exit 1（端口占用保护生效）；
2. 执行 stop → 结束进程、确认 `Port 3000 released`，exit 0；
3. 再执行 start → 约 2 秒 `Backend READY: http://127.0.0.1:3000/doc returned 200`，exit 0；
4. 随后 `release-verify.js` 复跑 7/7 PASS（Node 22 + MiniMax-M2.1）。
