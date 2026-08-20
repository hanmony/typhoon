/**
 * release-verify.js — 发布版智能体验证（不依赖工作区 src）
 *
 * 用途：M6 阶段 B 部署验证项②。只依赖：
 *   - 运行中的发布后端（经 nginx/API，M5_BASE_URL 或默认 12080/api）
 *   - 发布目录 dist（RELEASE_DIR，默认 C:\data\sch-typhoon\server）及其 node_modules
 * 不读取/require 任何工作区（typhoon-m2-review）的 src。
 *
 * 用法：
 *   node deploy/release-verify.js
 *   环境变量：M5_BASE_URL（默认 http://127.0.0.1:12080/api）、RELEASE_DIR（默认 C:\data\sch-typhoon\server）
 */
const path = require("path");
const fs = require("fs");

const BASE = process.env.M5_BASE_URL || "http://127.0.0.1:12080/api";
const RELEASE_DIR = process.env.RELEASE_DIR || "C:\\data\\sch-typhoon\\server";
const DIST_DIR = path.join(RELEASE_DIR, "dist");

const results = [];
const check = (id, ok, detail) => {
    results.push({ id, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
};

function assertReleaseExists() {
    const main = path.join(DIST_DIR, "main.js");
    const lineImpact = path.join(DIST_DIR, "alert-analyzer/service/line-impact.service.js");
    const windCircle = path.join(DIST_DIR, "typhoon/alert/wind-circle.service.js");
    if (!fs.existsSync(main)) throw new Error(`发布目录无效，缺少 dist/main.js: ${main}`);
    if (!fs.existsSync(lineImpact)) throw new Error(`缺少 line-impact 编译产物: ${lineImpact}`);
    if (!fs.existsSync(windCircle)) throw new Error(`缺少 wind-circle 编译产物: ${windCircle}`);
    check("发布目录 dist 产物完整", true, "main/line-impact/wind-circle 均存在");
}

async function login() {
    const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "m2test", password: "M2test123!" }),
    });
    const json = await res.json();
    if (!json.token) throw new Error("登录失败: " + JSON.stringify(json).slice(0, 120));
    return json.token;
}

async function sse(token, pathName, body) {
    const res = await fetch(`${BASE}${pathName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });
    return { status: res.status, text: await res.text() };
}

const typedTokens = text => {
    const re = /"type":"token","data":"((?:[^"\\]|\\.)*)"/g;
    let out = "", m;
    while ((m = re.exec(text)) !== null) out += m[1];
    return out;
};

async function main() {
    console.log(`发布验证目标: ${BASE}  发布目录: ${RELEASE_DIR}`);
    assertReleaseExists();

    const token = await login();
    check("登录（经 nginx/API）", true, "OK");

    // 1. chat / agent / kb / analyze HTTP 冒烟
    const chat = await sse(token, "/chat/stream", { question: "你好", from: "cocc" });
    const chatT = typedTokens(chat.text);
    check("chat 真实回答", chat.status === 201 && chatT.length > 0 && chat.text.includes("[DONE]"), `token ${chatT.length} 字`);

    const agent = await sse(token, "/agent/stream", { question: "你好", from: "cocc" });
    const agentT = typedTokens(agent.text);
    check("agent 回答", agent.status === 201 && agentT.length > 0 && agent.text.includes("[DONE]"), `token ${agentT.length} 字`);

    const kb = await sse(token, "/kb/query/stream", { question: "台风期间线路停运的判定条件是什么？", topK: 3 });
    const srcMatch = kb.text.match(/"sources":\[((?:[^\[\]]|\[[^\]]*\])*)\]/);
    const srcCount = srcMatch ? (srcMatch[1].match(/\{/g) || []).length : 0;
    const kbContent = (kb.text.match(/"content":"((?:[^"\\]|\\.)*)"/g) || [])
        .map(m => m.replace(/^"content":"|"$/g, "")).filter(s => !s.includes("prompt_tokens")).join("");
    check("kb 非空 sources + 回答", kb.status === 201 && srcCount > 0 && kbContent.length > 0 && kb.text.includes("[DONE]"), `sources=${srcCount} 回答 ${kbContent.length} 字`);

    const ana = await sse(token, "/alert-analyzer/stream", { tfid: "202212", autoRun: true });
    const anaT = typedTokens(ana.text);
    const cardBlock = ana.text.match(/"analysis","data":\{[^}]*\}/g) ? ana.text : "";
    const hasCard = ana.text.includes('"affectedLines"');
    check("研判流 卡片 + 报告 + [DONE]", ana.status === 201 && hasCard && anaT.length > 0 && ana.text.includes("[DONE]"), `报告 ${anaT.length} 字`);

    // 2. 线路验证：analysis 事件 affectedLines ↔ 发布 dist 直接空间计算（不依赖工作区 src）
    // 注意：LineImpactService.onModuleInit 按 cwd 解析 assets——必须先切到发布目录
    const previousCwd = process.cwd();
    process.chdir(RELEASE_DIR);
    const mongoose = require(path.join(RELEASE_DIR, "node_modules/mongoose"));
    const { LineImpactService } = require(path.join(DIST_DIR, "alert-analyzer/service/line-impact.service.js"));
    const { WindCircleService } = require(path.join(DIST_DIR, "typhoon/alert/wind-circle.service.js"));

    await mongoose.connect(process.env.DATABASE_URI || "mongodb://127.0.0.1:27017/schooltyphoon");
    const twos = mongoose.model("TyphoonTwo", new mongoose.Schema({}, { strict: false }), "typhoontwos");
    const doc = await twos.findOne({ tfid: "202212" }).lean();

    const wc = new WindCircleService();
    const li = new LineImpactService(wc);
    await li.onModuleInit(); // 从发布目录 assets 加载线路资产
    process.chdir(previousCwd);

    const points = wc.transformActiveTyphoonToPoints(doc);
    const states = wc.transformPointsToStates(points);
    const levels = [li.analyzeStates(states, { radiusIndex: 0 }), li.analyzeStates(states, { radiusIndex: 1 }), li.analyzeStates(states, { radiusIndex: 2 })];

    const affectedLines = (() => {
        const m = ana.text.match(/"affectedLines":\[((?:[^\[\]]|\[[^\]]*\])*)\]/);
        if (!m) return [];
        const re = /"line":"([^"]+)"[^}]*?"riskLevel":"([^"]+)"/g;
        const out = [];
        let mm;
        while ((mm = re.exec(m[1])) !== null) out.push({ line: mm[1], riskLevel: mm[2] });
        return out;
    })();

    const bad = [];
    for (const l of affectedLines) {
        const idx = l.riskLevel.includes("12级") ? 2 : l.riskLevel.includes("10级") ? 1 : 0;
        if (!levels[idx].some(r => r.line === l.line)) bad.push(`${l.line}→${l.riskLevel}`);
    }
    check("线路一致性（发布 dist 计算 ↔ 卡片）", affectedLines.length > 0 && bad.length === 0, bad.length ? bad.join(",") : `${affectedLines.length} 条全部命中对应风圈等级`);

    await mongoose.disconnect();

    const pass = results.filter(r => r.ok).length;
    console.log(`\n===== 发布验证汇总: ${pass}/${results.length} 通过 =====`);
    if (pass < results.length) process.exit(1);
}

main().catch(err => {
    console.error("脚本异常:", err.message);
    process.exit(1);
});
