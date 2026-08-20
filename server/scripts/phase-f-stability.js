/**
 * phase-f-stability.js — M6 阶段 F 真实模型稳定性/性能测试（修订版，Codex 审查后）
 *
 * 目的：真实 LLM（当前默认 MiniMax-M2.1）下，对智能体四类接口
 *   chat / agent / kb / alert-analyzer(一键研判) 连续运行 ≥30 次正式样本，
 *   测量：首 token 时延、总时延、工具轮数、超时/错误；1/2/3/5 并发短测；
 *   区分冷启动与预热；报告 P50/P95、SSE 中断率、重复 token、协议 error、
 *   超时率、请求失败率。
 *
 * 修订要点（对应 Codex 审查）：
 * 1) P50/P95/成功率只统计 30 次正式样本；2 次预热单独展示（含冷启动首测）。
 * 2) 并发档位默认 1/2/3/5（补测并发 2）；并发段前等待 65s 排空节流窗口，
 *    使各档成功率只反映该档本身，不叠加前面类别的余量。
 * 3) SSE 判定强化：成功必须满足 HTTP 201 + Content-Type text/event-stream +
 *    [DONE] + 无协议 error 事件 + 无 malformed 事件 + 期望内容出现
 *    （typed 类至少 1 个 token 事件；研判另需 analysis 卡片；kb 需 sources + content）。
 *    失败分类：timeout / stream_error / http_<状态码> / ct_not_sse /
 *    proto_error / malformed / no_done / empty。
 * 4) 重复 token 检测范围说明：主指标 adjDupPairs = 相邻且内容完全相同的
 *    token/content 事件对数（检测 SSE 协议层重复发送缺陷，非 LLM 文本重复用词）；
 *    辅助指标 dupTotal = 任意位置重复出现的相同事件数（信息性，可能含正常重复字）。
 *
 * 依赖：仅运行中的发布后端（经 nginx/API）+ Node 18+ 内置 fetch。
 * 不读取任何工作区 src。
 *
 * 用法：
 *   node server/scripts/phase-f-stability.js
 *   环境变量：M5_BASE_URL（默认 http://127.0.0.1:12080/api）、PF_N（默认 30）、
 *     PF_CONC（默认 "1,2,3,5"）、PF_ROUNDS（默认 5）、PF_SKIP_CONC=1 跳过并发
 */
const fs = require("fs");
const path = require("path");

const BASE = process.env.M5_BASE_URL || "http://127.0.0.1:12080/api";
const N = parseInt(process.env.PF_N || "30", 10);
const CONC_LEVELS = (process.env.PF_CONC || "1,2,3,5").split(",").map(s => parseInt(s, 10));
const CONC_ROUNDS = parseInt(process.env.PF_ROUNDS || "5", 10);
const SKIP_CONC = process.env.PF_SKIP_CONC === "1";
const DRAIN_MS = 65_000; // 并发段前排空节流窗口

const WARMUP = 2; // 预热次数（不计入统计，单独展示）
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
 * 真流式读取 SSE：逐行解析事件。
 * 返回原始测量（不含成败分类，由 classify() 统一判定）。
 */
async function streamOnce(token, pathName, body, timeoutMs) {
    const t0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const raw = {
        status: 0,
        ct: "",
        text: "",
        firstContentMs: -1,
        sourcesMs: -1,
        analysisMs: -1,
        toolCalls: 0,
        done: false,
        malformed: 0,
        protoErr: 0,
        contentPayloads: [],
        errType: null,
        totalMs: 0,
    };
    try {
        const res = await fetch(`${BASE}${pathName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
            signal: ctrl.signal,
        });
        raw.status = res.status;
        raw.ct = res.headers.get("content-type") || "";
        if (res.status !== 201) {
            raw.text = await res.text();
        } else {
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = dec.decode(value, { stream: true });
                raw.text += chunk;
                buf += chunk;
                let idx;
                while ((idx = buf.indexOf("\n")) >= 0) {
                    const line = buf.slice(0, idx).trim();
                    buf = buf.slice(idx + 1);
                    if (line.startsWith("event: error")) {
                        raw.protoErr++;
                        continue;
                    }
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6);
                    if (payload === "[DONE]") {
                        raw.done = true;
                        continue;
                    }
                    let parsed = null;
                    try {
                        parsed = JSON.parse(payload);
                    } catch {
                        raw.malformed++;
                        continue;
                    }
                    const isTypedError = parsed && parsed.type === "error";
                    const isTopError = parsed && parsed.error !== undefined;
                    if (isTypedError || isTopError) {
                        raw.protoErr++;
                        continue;
                    }
                    if (parsed && parsed.type === "token") {
                        if (raw.firstContentMs < 0) raw.firstContentMs = Date.now() - t0;
                        raw.contentPayloads.push(payload);
                    } else if (parsed && parsed.type === "tool" && parsed.data?.status === "executing") {
                        raw.toolCalls++;
                    } else if (parsed && parsed.type === "analysis") {
                        if (raw.analysisMs < 0) raw.analysisMs = Date.now() - t0;
                    } else if (parsed && parsed.sources !== undefined) {
                        if (raw.sourcesMs < 0) raw.sourcesMs = Date.now() - t0;
                    } else if (parsed && typeof parsed.content === "string") {
                        // kb flat 格式：回答内容事件
                        if (raw.firstContentMs < 0) raw.firstContentMs = Date.now() - t0;
                        raw.contentPayloads.push(payload);
                    }
                    // 其余 status/thinking/usage/tool_call 事件不参与判定
                }
            }
            const tail = dec.decode();
            raw.text += tail;
            buf += tail;
        }
    } catch (e) {
        raw.errType = e.name === "AbortError" ? "timeout" : "stream_error";
    } finally {
        clearTimeout(timer);
    }
    raw.totalMs = Date.now() - t0;
    return raw;
}

/**
 * 统一成败判定（Codex 审查项 3）：
 * 成功 = HTTP 201 + SSE Content-Type + [DONE] + 无协议 error + 无 malformed + 期望内容出现。
 */
function classify(raw, category) {
    if (raw.errType) return raw.errType; // timeout / stream_error
    if (raw.status !== 201) return "http_" + raw.status;
    if (!raw.ct.includes("text/event-stream")) return "ct_not_sse";
    if (raw.protoErr > 0) return "proto_error";
    if (raw.malformed > 0) return "malformed";
    if (!raw.done) return "no_done";
    const contentOk =
        category === "kb"
            ? raw.sourcesMs >= 0 && raw.firstContentMs >= 0
            : category === "analyzer"
              ? raw.analysisMs >= 0 && raw.firstContentMs >= 0
              : raw.firstContentMs >= 0;
    if (!contentOk) return "empty";
    return null; // 成功
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
    const trunc = rows.filter(r => r.errType === "no_done" || (r.errType === null && !r.done)).length;
    const dupAdj = rows.reduce((a, r) => a + r.adjDupPairs, 0);
    const dupTotal = rows.reduce((a, r) => a + r.dupTotal, 0);
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
        dupAdjacentPairs: dupAdj,
        dupTotalEvents: dupTotal,
        errors: byErr,
    };
}

function printSummary(sum, label) {
    const s = sum;
    console.log(
        `  ${label}: 成功率 ${s.successRate}  首token P50=${s.firstTokenMs.p50}ms P95=${s.firstTokenMs.p95}ms` +
            `${s.sourcesMs ? `  (sources P50=${s.sourcesMs.p50}ms)` : ""}` +
            `${s.analysisMs ? `  (卡片 P50=${s.analysisMs.p50}ms)` : ""}` +
            `  总时延 P50=${s.totalMs.p50}ms P95=${s.totalMs.p95}ms  工具轮均 ${s.toolCalls.avg}` +
            `  SSE截断 ${s.sseTruncated}  相邻重复 ${s.dupAdjacentPairs}  重复事件 ${s.dupTotalEvents}`,
    );
    console.log(`  错误分布: ${JSON.stringify(s.errors)}`);
}

// ---------- 主流程 ----------
async function runCategory(token, name, makeReq) {
    const all = [];
    for (let i = 0; i < N + WARMUP; i++) {
        const req = makeReq();
        const r = await streamOnce(token, req.path, req.body, T_OUT[name]);
        const errType = classify(r, name);
        // 重复检测：仅对内容事件（typed token / kb content）计算
        const payloads = r.contentPayloads;
        let adjDupPairs = 0;
        for (let k = 1; k < payloads.length; k++) if (payloads[k] === payloads[k - 1]) adjDupPairs++;
        const counts = new Map();
        for (const p of payloads) counts.set(p, (counts.get(p) || 0) + 1);
        let dupTotal = 0;
        for (const c of counts.values()) dupTotal += c - 1;
        const row = {
            idx: i + 1,
            warmup: i < WARMUP,
            cold: i === WARMUP,
            firstContentMs: r.firstContentMs,
            sourcesMs: r.sourcesMs,
            analysisMs: r.analysisMs,
            totalMs: r.totalMs,
            toolCalls: r.toolCalls,
            errType,
            status: r.status,
            ct: r.ct,
            done: r.done,
            malformed: r.malformed,
            protoErr: r.protoErr,
            adjDupPairs,
            dupTotal,
            truncated: errType === "no_done",
        };
        all.push(row);
        if (i % 5 === 0 || errType) console.log(`  [${name}] run ${i + 1}/${N + WARMUP} ${errType || "ok"} first=${r.firstContentMs}ms total=${r.totalMs}ms tool=${r.toolCalls}`);
    }
    return all;
}

async function runConcurrency(token, level) {
    const rounds = [];
    for (let rnd = 1; rnd <= CONC_ROUNDS; rnd++) {
        const t0 = Date.now();
        const rs = await Promise.all(
            Array.from({ length: level }, () => streamOnce(token, "/chat/stream", { question: QUESTIONS.chat, from: "cocc" }, T_OUT.chat)),
        );
        const errTypes = rs.map(r => classify(r, "chat"));
        const ok = errTypes.filter(e => e === null).length;
        rounds.push({ round: rnd, ok, total: rs.length, wallMs: Date.now() - t0, errTypes });
    }
    const okSum = rounds.reduce((a, r) => a + r.ok, 0);
    const totSum = rounds.reduce((a, r) => a + r.total, 0);
    return { level, rounds, successRate: (100 * okSum / totSum).toFixed(1) + "%" };
}

async function main() {
    console.log(`阶段F 稳定性测试(修订)  目标: ${BASE}  正式样本 ${N} 次/类 + 预热 ${WARMUP}  并发: ${SKIP_CONC ? "跳过" : CONC_LEVELS.join("/")}`);
    const token = await login();
    console.log("登录 OK");

    const out = {
        base: BASE,
        model: "llmmodels default-large (MiniMax-M2.1)",
        node: process.version,
        time: new Date().toISOString(),
        methodology: {
            formalSamplesPerCategory: N,
            warmupPerCategory: WARMUP,
            concurrencyLevels: CONC_LEVELS,
            concurrencyRounds: CONC_ROUNDS,
            drainBeforeConcurrencyMs: DRAIN_MS,
            successCriteria: "HTTP 201 + text/event-stream + [DONE] + 无协议error + 无malformed + 期望内容",
            dupScope: "adjDupPairs=相邻且内容完全相同的事件对数(协议层重复)；dupTotalEvents=任意位置重复事件数(信息性)",
        },
        categories: {},
        concurrency: [],
    };

    for (const [name, makeReq] of [
        ["chat", () => ({ path: "/chat/stream", body: { question: QUESTIONS.chat, from: "cocc" } })],
        ["agent", () => ({ path: "/agent/stream", body: { question: QUESTIONS.agent, from: "cocc" } })],
        ["kb", () => ({ path: "/kb/query/stream", body: { question: QUESTIONS.kb, topK: 3 } })],
        ["analyzer", () => ({ path: "/alert-analyzer/stream", body: { tfid: ANALYZER_TFID, autoRun: true } })],
    ]) {
        console.log(`\n=== 类别: ${name}（${N} 次正式 + ${WARMUP} 次预热）===`);
        const rows = await runCategory(token, name, makeReq);
        const measured = rows.filter(r => !r.warmup);
        const warmupRows = rows.filter(r => r.warmup);
        const sum = summarize(name, measured);
        const sumWarm = summarize(name, warmupRows);
        out.categories[name] = { summary: sum, warmupSummary: sumWarm, rows };
        printSummary(sum, `正式样本(${measured.length} 次)`);
        printSummary(sumWarm, `预热样本(${warmupRows.length} 次)`);
        const cold = warmupRows[0] || measured[0];
        if (cold) console.log(`  冷启动首测: first=${cold.firstContentMs}ms total=${cold.totalMs}ms err=${cold.errType || "ok"}`);
    }

    if (!SKIP_CONC) {
        console.log(`\n=== 等待 ${DRAIN_MS / 1000}s 排空节流窗口后开始并发短测（chat，每档 ${CONC_ROUNDS} 轮）===`);
        await new Promise(r => setTimeout(r, DRAIN_MS));
        for (const level of CONC_LEVELS) {
            const c = await runConcurrency(token, level);
            out.concurrency.push(c);
            console.log(`  并发 ${level}: 成功率 ${c.successRate}  各轮错误: ${c.rounds.map(r => r.errTypes.join("/")).join(" | ")}`);
        }
    }

    const reportPath = path.join(__dirname, "..", "docs", "M6_PHASE_F_RAW.json");
    fs.writeFileSync(reportPath, JSON.stringify(out, null, 2), "utf8");
    console.log(`\n原始数据已保存: ${reportPath}`);

    console.log("\n===== 阶段F 汇总（正式样本 P50/P95, ms）=====");
    for (const [name, v] of Object.entries(out.categories)) {
        const s = v.summary;
        console.log(
            `${name.padEnd(9)} 成功率 ${s.successRate.padStart(6)}  首token ${String(s.firstTokenMs.p50).padStart(5)}/${String(s.firstTokenMs.p95).padStart(5)}  总 ${String(s.totalMs.p50).padStart(5)}/${String(s.totalMs.p95).padStart(5)}  工具 ${s.toolCalls.avg}  截断 ${s.sseTruncated}  失败 ${s.n - s.success}`,
        );
    }
}

main().catch(err => {
    console.error("脚本异常:", err);
    process.exit(1);
});
