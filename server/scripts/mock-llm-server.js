/**
 * mock-llm-server.js — 本地假 LLM 服务器（OpenAI 兼容协议）
 *
 * 用途：后端集成测试/评估时替代真实 LLM API（如 key 失效、无外网、需确定性回答）。
 * 行为：
 *   - POST /v1/chat/completions 非流式 → 固定返回 JSON 数组 []（供意图分类器解析为"无数据源"）
 *   - 流式 → 检查 messages 历史里是否出现过「我叫小明」：
 *       有 → 逐 token 回复「你叫小明，我记住啦！」；无 → 回复「我是测试用的假大模型。」
 *   - 每次请求的完整 messages 追加写入 ./mock-llm.log，用于验证服务端传参（含会话历史）
 *
 * 启动：node scripts/mock-llm-server.js   （默认 127.0.0.1:8123）
 * 接入：系统管理 → 模型管理 新增 { baseUrl: "http://127.0.0.1:8123/v1", apiKey: "mock", model: "mock-chat" } 并设为默认大模型
 */
const http = require("http");
const fs = require("fs");

const PORT = 8123;
const LOG_FILE = __dirname + "/mock-llm.log";

function logRequest(messages) {
    const line =
        JSON.stringify({
            time: new Date().toISOString(),
            roles: messages.map(m => m.role),
            userTexts: messages.filter(m => m.role === "user").map(m => String(m.content).slice(0, 80)),
        }) + "\n";
    fs.appendFileSync(LOG_FILE, line);
}

function sseChunk(obj) {
    return `data: ${JSON.stringify(obj)}\n\n`;
}

const server = http.createServer((req, res) => {
    if (req.method !== "POST" || !req.url.endsWith("/chat/completions")) {
        res.writeHead(404);
        res.end();
        return;
    }

    let raw = "";
    req.on("data", c => (raw += c));
    req.on("end", () => {
        let body;
        try {
            body = JSON.parse(raw);
        } catch {
            res.writeHead(400);
            res.end();
            return;
        }

        const messages = body.messages || [];
        logRequest(messages);

        const userTexts = messages.filter(m => m.role === "user").map(m => String(m.content));
        const remembered = userTexts.some(t => t.includes("我叫小明"));
        const answer = remembered ? "你叫小明，我记住啦！" : "我是测试用的假大模型。";
        const tokens = answer.split("");

        const usage = {
            prompt_tokens: Math.max(1, Math.round(raw.length / 4)),
            completion_tokens: tokens.length,
            total_tokens: Math.max(1, Math.round(raw.length / 4)) + tokens.length,
        };

        if (body.stream) {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            });
            for (const t of tokens) {
                res.write(sseChunk({ id: "mock", choices: [{ index: 0, delta: { content: t } }] }));
            }
            res.write(sseChunk({ choices: [{ delta: {} }], usage }));
            res.write("data: [DONE]\n\n");
            res.end();
        } else {
            // 非流式：意图分类固定返回空数组（= 无数据源 → 自由回答），兼容带 tools 的调用
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
                JSON.stringify({
                    choices: [{ message: { content: "[]" } }],
                    usage,
                }),
            );
        }
    });
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(`mock-llm-server listening on http://127.0.0.1:${PORT} (log: ${LOG_FILE})`);
});
