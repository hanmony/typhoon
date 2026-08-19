/**
 * m5-eval.js — M5 步骤 19 综合评估（验收标准 4/5/6 本机可验部分）
 *
 * 前置：mock-llm（8123）+ 后端（3001）运行中；Mongo/Qdrant 容器在线；已 npm run build。
 * 用法：cd server && node scripts/m5-eval.js
 *
 * 覆盖（验收标准）：
 *  6 回归：/chat/stream、/agent/stream、/kb/query/stream 冒烟（201 + [DONE] + 无 error 事件）
 *  4 研判一致性：analysis 事件 affectedLines 的每条线路都能在对应风圈等级的
 *     line-impact 直接空间计算中溯源（卡片线路非编造）
 *  5 性能：研判流 TTFT（首事件）< 3s、总时长 < 30s（mock LLM 口径，真模型需部署复核）
 *
 * 部署环境验收项（本机不可验，记录于报告）：
 *  1–3 工具正确性/数据真实性/指挥上下文（需真 LLM + 实时数据）
 *  4b  应急响应等级建议溯源预案条款（需真 LLM RAG 引用）
 *  人工点击「一键研判」检查真实卡片布局/滚动/小屏显示（需浏览器）
 */
const path = require("path");
process.chdir(path.resolve(__dirname, ".."));
require("dotenv").config();
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

const BASE = "http://127.0.0.1:3001";
const results = [];
const check = (id, ok, detail) => {
    results.push({ id, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
};

async function login() {
    const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "m2test", password: "M2test123!" }),
    });
    const json = await res.json();
    if (!json.token) throw new Error("登录失败: " + JSON.stringify(json));
    return json.token;
}

/** POST SSE 并测量 TTFT/总时长 */
async function ssePost(token, urlPath, body) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}${urlPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let ttft = null;
    let firstDataAt = null;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (firstDataAt === null && chunk.includes("data: ")) firstDataAt = Date.now();
        text += chunk;
    }
    return { status: res.status, text, ttft: firstDataAt === null ? null : firstDataAt - t0, total: Date.now() - t0 };
}

function parseAnalysis(text) {
    for (const block of text.split("\n\n")) {
        if (!block.startsWith("data: ")) continue;
        try {
            const ev = JSON.parse(block.slice(6));
            if (ev.type === "analysis") return ev;
        } catch { /* ignore */ }
    }
    return null;
}

async function main() {
    const token = await login();
    console.log("✅ 登录成功\n");

    // ── 验收标准 6：回归 ──
    const chat = await ssePost(token, "/chat/stream", { question: "你好", from: "cocc" });
    check("回归 /chat/stream", chat.status === 201 && chat.text.includes("[DONE]") && !chat.text.includes("event: error"), `HTTP ${chat.status} [DONE]=${chat.text.includes("[DONE]")}`);

    const agent = await ssePost(token, "/agent/stream", { question: "你好", from: "cocc" });
    check("回归 /agent/stream", agent.status === 201 && agent.text.includes("[DONE]") && !agent.text.includes("event: error"), `HTTP ${agent.status} [DONE]=${agent.text.includes("[DONE]")}`);

    const kb = await ssePost(token, "/kb/query/stream", { question: "台风期间线路停运的判定条件是什么？", topK: 3 });
    const kbSources = kb.text.includes('"type":"sources"') || kb.text.includes('"sources"');
    check("回归 /kb/query/stream", kb.status === 201 && kb.text.includes("[DONE]") && kbSources && !kb.text.includes("event: error"), `HTTP ${kb.status} 含sources=${kbSources} [DONE]=${kb.text.includes("[DONE]")}`);

    // ── 验收标准 5：性能（研判流）──
    const ana = await ssePost(token, "/alert-analyzer/stream", { tfid: "202212", autoRun: true });
    check("研判流完成", ana.status === 201 && ana.text.includes("[DONE]"), `HTTP ${ana.status} [DONE]=${ana.text.includes("[DONE]")}`);
    check("性能 研判首事件(TTFT) < 3s", ana.ttft !== null && ana.ttft < 3000, `${ana.ttft ?? "null"}ms（mock 口径，真模型部署复核）`);
    check("性能 研判总时长 < 30s", ana.total < 30000, `${ana.total}ms`);

    // ── 验收标准 4：研判一致性（卡片线路 ↔ 空间计算）──
    const analysisEvent = parseAnalysis(ana.text);
    if (!analysisEvent?.data?.affectedLines?.length) {
        check("研判一致性 卡片线路可溯源空间计算", false, "analysis 事件无 affectedLines");
    } else {
        const mongoose = require("mongoose");
        await mongoose.connect(process.env.DATABASE_URI || "mongodb://127.0.0.1:27017/schooltyphoon");
        const { WindCircleService } = require("../src/typhoon/alert/wind-circle.service.ts");
        const { LineImpactService } = require("../src/alert-analyzer/service/line-impact.service.ts");
        const twos = mongoose.model("TyphoonTwo", new mongoose.Schema({}, { strict: false }), "typhoontwos");
        const doc = await twos.findOne({ tfid: "202212" }).lean();
        const wc = new WindCircleService();
        const li = new LineImpactService(wc);
        await li.onModuleInit();
        const states = wc.transformPointsToStates(wc.transformActiveTyphoonToPoints(doc));
        const levels = [li.analyzeStates(states, { radiusIndex: 0 }), li.analyzeStates(states, { radiusIndex: 1 }), li.analyzeStates(states, { radiusIndex: 2 })];
        const bad = [];
        for (const line of analysisEvent.data.affectedLines) {
            const idx = line.riskLevel.includes("12级") ? 2 : line.riskLevel.includes("10级") ? 1 : 0;
            if (!levels[idx].some(r => r.line === line.line)) bad.push(`${line.line}→${line.riskLevel}`);
        }
        check("研判一致性 卡片线路可溯源空间计算", bad.length === 0, bad.length ? `异常: ${bad.join(", ")}` : `${analysisEvent.data.affectedLines.length} 条线路全部命中对应风圈等级`);
        check("研判一致性 卡片线路数与空间计算一致", analysisEvent.data.affectedLines.length === levels[0].length, `卡片 ${analysisEvent.data.affectedLines.length} / 空间计算(7级) ${levels[0].length}`);
        await mongoose.disconnect();
    }

    const pass = results.filter(r => r.ok).length;
    console.log(`\n===== 汇总: ${pass}/${results.length} 通过 =====`);
    if (pass < results.length) process.exit(1);
}

main().catch(err => {
    console.error("脚本异常:", err.message);
    process.exit(1);
});
