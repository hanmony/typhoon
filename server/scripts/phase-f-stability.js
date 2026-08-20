/**
 * phase-f-stability.js — M6 阶段 F 真实模型稳定性/性能测试
 *
 * 目的：在真实 LLM（当前默认 MiniMax-M2.1）下，对智能体四类接口
 *   chat / agent / kb / alert-analyzer(一键研判) 连续运行 ≥30 次，
 *   测量：首 token 时延、总时延、工具轮数、超时/错误；
 *   另做 1/3/5 并发短测；区分冷启动与预热；报告 P50/P95、
 *   SSE 中断率、重复 token、协议 error、请求失败率。
 *
 * 依赖：仅运行中的发布后端（经 nginx/API）+ Node 18+ 内置 fetch。
 * 不读取任何工作区 src（与 release-verify.js 同一口径）。
 *
 * 用法：
 *   node server/scripts/phase-f-stability.js
 *   环境变量：
 *     M5_BASE_URL  默认 http://127.0.0.1:12080/api
 *     PF_N         默认 30（每类连续运行次数）
 *     PF_CONC      默认 "1,3,5"（并发档位）
 *     PF_ROUNDS    默认 5（每档并发轮数）
 *     PF_SKIP_CONC 设 1 跳过并发测试
 */
const fs = require("fs");
const path = require("path");

const BASE = process.env.M5_BASE_URL || "http://127.0.0.1:12080/api";
const N = parseInt(process.env.PF_N || "30", 10);
const CONC_LEVELS = (process.env.PF_CONC || "1,3,5").split(",").map(s => parseInt(s, 10));
const CONC_ROUNDS = parseInt(process.env.PF_ROUNDS || "5", 10);
const SKIP_CONC = process.env.PF_SKIP_CONC === "1";

const WARMUP = 2; // 预热次数（不计入统计）
const T_OUT = { chat: 60000, agent: 60000, kb: 60000, analyzer: 120000 };
const QUESTIONS = {
    chat: "台风天坐地铁通勤有什么需要注意的？",
    agent: "台风来了，上海地铁会不会停运？",
    kb: "台风期间线路停运的判定条件是什么？",
};
const ANALYZER_TFID = "202212";

// ---------- 登录 ----------
async function login() {
    const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "m2test", password: "M2test123!" }),
    });
    const json = await res.json();
    if (!json.token) throw new Error("登录失败: " + JSON.stringify(json).slice(0, 160));
    return json.token;
}

/**
 * 真流式读取 SSE：逐行解析事件，记录首个内容事件时延、kb sources 到达时延、
 * 研判 analysis 卡片到达时延与工具轮数。
 * 返回 { status, text, firstContentMs, sourcesMs, analysisMs, toolCalls, errType }
 */
async function streamOnce(token, pathName, body, timeoutMs) {
    const t0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let text = "";
    let firstContentMs = -1;
    let sourcesMs = -1;
    let analysisMs = -1;
    let toolCalls = 0;
    let errType = null;
    let status = 0;
    try {
        const res = await fetch(`${BASE}${pathName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
            signal: ctrl.signal,
        });
        status = res.status;
        if (status !== 201) {
            text = await res.text();
            errType = "http_" + status;
        } else {
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = dec.decode(value, { stream: true });
                text += chunk;
                buf += chunk;
                let idx;
                while ((idx = buf.indexOf("\n")) >= 0) {
                    const line = buf.slice(0, idx).trim();
                    buf = buf.slice(idx + 1);
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6);
                    if (payload === "[DONE]") continue;
                    if (payload.includes('"type":"token"')) {
                        if (firstContentMs < 0) firstContentMs = Date.now() - t0;
                    } else if (payload.includes('"type":"tool"') && payload.includes('"status":"executing"')) {
                        toolCalls++;
                    } else if (payload.includes('"type":"tool_call"')) {
                        toolCalls++;
                    } else if (payload.includes('"type":"analysis"')) {
                        if (analysisMs < 0) analysisMs = Date.now() - t0;
                    } else if (payload.includes('"sources":')) {
                        if (sourcesMs < 0) sourcesMs = Date.now() - t0;
                    } else if (payload.includes('"content":')) {
                        // kb flat 格式：回答内容事件
                        if (firstContentMs < 0) firstContentMs = Date.now() - t0;
                    }
                }
            }
            const tail = dec.decode();
            text += tail;
            buf += tail;
        }
    } catch (e) {
        errType = e.name === "AbortError" ? "timeout" : "stream_error";
    } finally {
        clearTimeout(timer);
    }
    if (errType === null && firstContentMs < 0 && sourcesMs < 0) {
        // 有正文但没识别到内容事件：视协议异常
        if (text.length > 0 && status === 201) errType = "proto_no_content_event";
    }
    const totalMs = Date.now() - t0;
    return { status, text, firstContentMs, sourcesMs, analysisMs, toolCalls, errType, totalMs };
}

// ---------- 统计 ----------
const pct = (arr, p) => {
    if (!arr.length) return NaN;
    const s = [...arr].sort((a, b) => a - b);
    const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
    return s[i];
};
const avg = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN);

function summarize(name, rows) {
    const ok = rows.filter(r => !r.errType);
    const first = ok.map(r => r.firstContentMs).filter(v => v >= 0);
    const total = ok.map(r => r.totalMs);
    const sources = ok.map(r => r.sourcesMs).filter(v => v >= 0);
    const analysis = ok.map(r => r.analysisMs).filter(v => v >= 0);
    const trunc = rows.filter(r => r.truncated).length;
    const dup = rows.reduce((a, r) => a + r.dupPairs, 0);
    const byErr = {};
    for (const r of rows) byErr[r.errType || "ok"] = (byErr[r.errType || "ok"] || 0) + 1;
    const toolAll = rows.map(r => r.toolCalls);
    return {
        name,
        n: rows.length,
        success: ok.length,
        successRate: (100 * ok.length / rows.length).toFixed(1) + "%",
        firstTokenMs: { p50: Math.round(pct(first, 50)), p95: Math.round(pct(first, 95)), avg: Math.round(avg(first)) },
        sourcesMs: sources.length ? { p50: Math.round(pct(sources, 50)), p95: Math.round(pct(sources, 95)) } : null,
        analysisMs: analysis.length ? { p50: Math.round(pct(analysis, 50)), p95: Math.round(pct(analysis, 95)) } : null,
        totalMs: { p50: Math.round(pct(total, 50)), p95: Math.round(pct(total, 95)), avg: Math.round(avg(total)) },
        toolCalls: { avg: (avg(toolAll) || 0).toFixed(1) },
        sseTruncated: trunc,
        dupTokenPairs: dup,
        errors: byErr,
    };
}

// ---------- 主流程 ----------
async function runCategory(token, name, makeReq) {
    const all = [];
    for (let i = 0; i < N + WARMUP; i++) {
        const req = makeReq();
        const r = await streamOnce(token, req.path, req.body, T_OUT[name]);
        const typed = name === "kb" ? "" : (r.text.match(/"type":"token","data":"((?:[^"\\]|\\.)*)"/g) || []).join("");
        // 相邻重复 token 检测（typed 事件）
        let dupPairs = 0;
        if (typed) {
            const dataRe = /"data":"((?:[^"\\]|\\.)*)"/g;
            const datas = [];
            let m;
            while ((m = dataRe.exec(typed)) !== null) datas.push(m[1]);
            for (let k = 1; k < datas.length; k++) if (datas[k] === datas[k - 1]) dupPairs++;
        }
        const row = { idx: i + 1, cold: i === 0, warmup: i < WARMUP, firstContentMs: r.firstContentMs, sourcesMs: r.sourcesMs, analysisMs: r.analysisMs, totalMs: r.totalMs, toolCalls: r.toolCalls, errType: r.errType, status: r.status, dupPairs, truncated: !r.errType && !r.text.includes("[DONE]") };
        all.push(row);
        if (i % 5 === 0 || r.errType) console.log(`  [${name}] run ${i + 1}/${N + WARMUP} ${r.errType || "ok"} first=${r.firstContentMs}ms total=${r.totalMs}ms tool=${r.toolCalls}`);
    }
    return all;
}

async function runConcurrency(token, level) {
    const rounds = [];
    for (let rnd = 1; rnd <= CONC_ROUNDS; rnd++) {
        const t0 = Date.now();
        const rs = await Promise.all(
            Array.from({ length: level }, () => streamOnce(token, "/chat/stream", { question: QUESTIONS.chat, from: "cocc" }, T_OUT.chat))
        );
        const ok = rs.filter(r => !r.errType && r.text.includes("[DONE]")).length;
        rounds.push({ round: rnd, ok, total: rs.length, wallMs: Date.now() - t0 });
    }
    const okSum = rounds.reduce((a, r) => a + r.ok, 0);
    const totSum = rounds.reduce((a, r) => a + r.total, 0);
    return { level, rounds, successRate: (100 * okSum / totSum).toFixed(1) + "%" };
}

async function main() {
    console.log(`阶段F 稳定性测试  目标: ${BASE}  每类连续 ${N} 次 + 预热 ${WARMUP}  并发: ${SKIP_CONC ? "跳过" : CONC_LEVELS.join("/")}`);
    const token = await login();
    console.log("登录 OK");

    const out = { base: BASE, model: "llmmodels default-large (MiniMax-M2.1)", node: process.version, time: new Date().toISOString(), categories: {}, concurrency: [] };

    for (const [name, makeReq] of [
        ["chat", () => ({ path: "/chat/stream", body: { question: QUESTIONS.chat, from: "cocc" } })],
        ["agent", () => ({ path: "/agent/stream", body: { question: QUESTIONS.agent, from: "cocc" } })],
        ["kb", () => ({ path: "/kb/query/stream", body: { question: QUESTIONS.kb, topK: 3 } })],
        ["analyzer", () => ({ path: "/alert-analyzer/stream", body: { tfid: ANALYZER_TFID, autoRun: true } })],
    ]) {
        console.log(`\n=== 类别: ${name}（${N} 次测量 + ${WARMUP} 次预热）===`);
        const rows = await runCategory(token, name, makeReq);
        const sum = summarize(name, rows);
        out.categories[name] = { summary: sum, rows };
        console.log(`  结果: 成功率 ${sum.successRate}  首token P50=${sum.firstTokenMs.p50}ms P95=${sum.firstTokenMs.p95}ms${sum.sourcesMs ? `  (sources P50=${sum.sourcesMs.p50}ms)` : ""}${sum.analysisMs ? `  (卡片 P50=${sum.analysisMs.p50}ms)` : ""}  总时延 P50=${sum.totalMs.p50}ms P95=${sum.totalMs.p95}ms  工具轮均 ${sum.toolCalls.avg}  SSE截断 ${sum.sseTruncated}  重复对 ${sum.dupTokenPairs}`);
        console.log(`  错误分布: ${JSON.stringify(sum.errors)}`);
        // 冷启动（首测）单独展示
        const cold = rows.find(r => r.cold);
        if (cold) console.log(`  冷启动首测: first=${cold.firstContentMs}ms total=${cold.totalMs}ms err=${cold.errType || "ok"}`);
    }

    if (!SKIP_CONC) {
        console.log(`\n=== 并发短测（chat，每档 ${CONC_ROUNDS} 轮）===`);
        for (const level of CONC_LEVELS) {
            const c = await runConcurrency(token, level);
            out.concurrency.push(c);
            console.log(`  并发 ${level}: 成功率 ${c.successRate}`);
        }
    }

    const reportPath = path.join(__dirname, "..", "docs", "M6_PHASE_F_RAW.json");
    fs.writeFileSync(reportPath, JSON.stringify(out, null, 2), "utf8");
    console.log(`\n原始数据已保存: ${reportPath}`);

    // 汇总行
    console.log("\n===== 阶段F 汇总（P50/P95, ms）=====");
    for (const [name, v] of Object.entries(out.categories)) {
        const s = v.summary;
        console.log(`${name.padEnd(9)} 成功率 ${s.successRate.padStart(6)}  首token ${String(s.firstTokenMs.p50).padStart(5)}/${String(s.firstTokenMs.p95).padStart(5)}  总 ${String(s.totalMs.p50).padStart(5)}/${String(s.totalMs.p95).padStart(5)}  工具 ${s.toolCalls.avg}  截断 ${s.sseTruncated}  失败 ${s.n - s.success}`);
    }
}

main().catch(err => {
    console.error("脚本异常:", err);
    process.exit(1);
});
