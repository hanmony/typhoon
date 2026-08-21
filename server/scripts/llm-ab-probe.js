/**
 * llm-ab-probe.js — 真模型思考参数 A/B 探测（不修改平台）
 *
 * 目的：确定 wukaijin 网关(MiniMax-M2.1)上"关闭/降低思考"的请求参数写法，
 * 为阶段 F 性能优化提供依据。只读 llmmodels 集合取 baseUrl/model/apiKey
 * （密钥仅内存使用，绝不打印），直接调用 /chat/completions 测量：
 *   首内容 token 时延 / 总时延 / thinking 事件数 / 内容长度
 *
 * 用法：node server/scripts/llm-ab-probe.js
 *   需在发布目录（含 mongodb 依赖）运行，或设置 NODE_PATH
 */
const fs = require("fs");
const path = require("path");

const BASE_DIR = process.env.RELEASE_DIR || "C:\\data\\sch-typhoon\\server";
const MongoClient = require(path.join(BASE_DIR, "node_modules/mongodb")).MongoClient;

const PROMPT_CHAT = [
    { role: "system", content: "你是防汛智策助手，服务于地铁防汛防台应急指挥。请用中文回答，简洁。" },
    { role: "user", content: "台风天坐地铁通勤有什么需要注意的？" },
];

const VARIANTS = [
    { label: "baseline", params: {} },
    { label: "thinking_off", params: { thinking: { type: "disabled" } } },
    { label: "thinking_on", params: { thinking: { type: "enabled" } } },
    { label: "reasoning_low", params: { reasoning_effort: "low" } },
    { label: "enable_thinking_false", params: { enable_thinking: false } },
];

async function probeOnce(cfg, params) {
    const url = `${cfg.baseUrl}/chat/completions`;
    const t0 = Date.now();
    let firstContentMs = -1;
    let thinkEvents = 0;
    let content = "";
    let err = null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120000);
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: cfg.model, messages: PROMPT_CHAT, stream: true, ...params }),
            signal: ctrl.signal,
        });
        if (!res.ok) {
            const t = await res.text();
            err = `http_${res.status} ${t.slice(0, 200)}`;
        } else {
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                // 按行提取 SSE data
                let idx;
                while ((idx = buf.indexOf("\n")) >= 0) {
                    const line = buf.slice(0, idx).trim();
                    buf = buf.slice(idx + 1);
                    if (!line.startsWith("data:")) continue;
                    const data = line.slice(5).trim();
                    if (data === "[DONE]") continue;
                    let j;
                    try { j = JSON.parse(data); } catch { continue; }
                    const delta = j.choices?.[0]?.delta || {};
                    if (delta.reasoning_content || delta.thinking || delta.reasoning) {
                        thinkEvents++;
                    } else if (typeof delta.content === "string") {
                        if (firstContentMs < 0) firstContentMs = Date.now() - t0;
                        content += delta.content;
                    }
                }
            }
        }
    } catch (e) {
        err = e.name === "AbortError" ? "timeout" : e.message;
    } finally {
        clearTimeout(timer);
    }
    return { firstContentMs, totalMs: Date.now() - t0, thinkEvents, contentLen: content.length, contentHead: content.slice(0, 40), err };
}

async function main() {
    const c = new MongoClient("mongodb://127.0.0.1:27017");
    await c.connect();
    const doc = await c.db("schooltyphoon").collection("llmmodels").findOne({ role: "default-large" });
    if (!doc) throw new Error("未找到 default-large 模型配置");
    const cfg = { baseUrl: doc.baseUrl, model: doc.model, apiKey: doc.apiKey };
    console.log(`模型: ${cfg.model}  baseUrl: ${cfg.baseUrl}  (apiKey 不打印)`);

    for (const v of VARIANTS) {
        const row = { label: v.label };
        for (let k = 0; k < 2; k++) {
            const r = await probeOnce(cfg, v.params);
            row[`run${k + 1}`] = r;
            console.log(
                `[${v.label}] run${k + 1}: first=${r.firstContentMs}ms total=${r.totalMs}ms think=${r.thinkEvents} len=${r.contentLen} err=${r.err || "ok"}  "${r.contentHead}..."`,
            );
        }
    }
    await c.close();
}

main().catch(e => { console.error("异常:", e.message); process.exit(1); });
