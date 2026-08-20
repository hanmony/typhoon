/**
 * analyze-phase-e.js — 从 phase-e-raw.json 汇总指标与逐题失败归因
 * 用法：cd server && node eval/phase-e/analyze-phase-e.js
 */
const fs = require("fs");
const path = require("path");

const RAW = path.resolve(__dirname, "results", "phase-e-raw.json");
const RAW_A = path.resolve(__dirname, "results", "phase-e-raw-a.json");
const RAW_B = path.resolve(__dirname, "results", "phase-e-raw-b.json");
const RAW_KBA = path.resolve(__dirname, "results", "phase-e-raw-kb-a.json");
const RAW_KBB = path.resolve(__dirname, "results", "phase-e-raw-kb-b.json");
const fsx = fs.existsSync;
function load(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

// 合并策略：kb/refusal 用校准重跑（-kb-a/-kb-b，评分器已校准）；其余类别用首轮（-a/-b）
let data;
if (fsx(RAW_KBA) && fsx(RAW_KBB) && fsx(RAW_A) && fsx(RAW_B)) {
    const kba = load(RAW_KBA), kbb = load(RAW_KBB), a = load(RAW_A), b = load(RAW_B);
    const first = [...a.results, ...b.results].filter(r => r.category !== "kb" && r.category !== "refusal");
    const rerun = [...kba.results, ...kbb.results].filter(r => r.category === "kb" || r.category === "refusal");
    data = {
        meta: { base: a.meta?.base, start: a.meta?.start, runs: first.length + rerun.length },
        stats: {
            429: (a.stats["429"] || 0) + (b.stats["429"] || 0) + (kba.stats["429"] || 0) + (kbb.stats["429"] || 0),
            httpError: (a.stats.httpError || 0) + (b.stats.httpError || 0) + (kba.stats.httpError || 0) + (kbb.stats.httpError || 0),
            timeout: (a.stats.timeout || 0) + (b.stats.timeout || 0) + (kba.stats.timeout || 0) + (kbb.stats.timeout || 0),
            protocolError: (a.stats.protocolError || 0) + (b.stats.protocolError || 0) + (kba.stats.protocolError || 0) + (kbb.stats.protocolError || 0),
            runs: first.length + rerun.length,
        },
        results: [...first, ...rerun],
    };
    console.log(`merged: 首轮(工具/线路/相似)=${first.length} + 校准重跑(kb/拒答)=${rerun.length} = ${data.results.length} runs`);
} else if (fsx(RAW_A) && fsx(RAW_B)) {
    const a = load(RAW_A), b = load(RAW_B);
    data = {
        meta: a.meta,
        stats: {
            429: (a.stats["429"] || 0) + (b.stats["429"] || 0),
            httpError: (a.stats.httpError || 0) + (b.stats.httpError || 0),
            timeout: (a.stats.timeout || 0) + (b.stats.timeout || 0),
            protocolError: (a.stats.protocolError || 0) + (b.stats.protocolError || 0),
            runs: (a.stats.runs || 0) + (b.stats.runs || 0),
        },
        results: [...a.results, ...b.results],
    };
    console.log(`merged ${a.results.length} + ${b.results.length} = ${data.results.length} runs`);
} else {
    data = JSON.parse(fs.readFileSync(RAW, "utf8"));
}
const results = data.results;

const CAT_LABEL = {
    tool_routing: "工具路由", kb: "知识库", line_impact: "线路影响",
    similar_case: "相似案例", refusal: "防编造/敏感拒答",
};

// ---------- 逐题聚合 ----------
const byQ = {};
for (const r of results) {
    if (!byQ[r.qid]) byQ[r.qid] = { category: r.category, runs: [], agentStatus: [] };
    byQ[r.qid].runs.push(r.grade ? r.grade.pass : false);
    byQ[r.qid].agentStatus.push(r.agent?.status ?? r.agent?.error);
}

const perQ = Object.entries(byQ).map(([qid, v]) => ({
    qid: Number(qid),
    category: v.category,
    pass: v.runs.filter(Boolean).length,
    total: v.runs.length,
    statuses: [...new Set(v.agentStatus)],
})).sort((a, b) => a.qid - b.qid);

// ---------- 类别指标 ----------
const cats = {};
for (const q of perQ) {
    if (!cats[q.category]) cats[q.category] = { q: 0, runs: 0, pass: 0, fail: 0, allFail: 0, allPass: 0, mixed: 0 };
    const c = cats[q.category];
    c.q++;
    c.runs += q.total;
    c.pass += q.pass;
    c.fail += q.total - q.pass;
    if (q.pass === 0) c.allFail++;
    else if (q.pass === q.total) c.allPass++;
    else c.mixed++;
}

console.log("===== 类别汇总（按题目聚合，3 次运行） =====");
for (const [cat, c] of Object.entries(cats)) {
    const acc = c.pass / c.runs;
    console.log(`[${CAT_LABEL[cat]}] 题=${c.q} 运行=${c.runs} 通过=${c.pass} 失败=${c.fail} 准确率=${(acc * 100).toFixed(2)}% | 全过=${c.allPass} 全败=${c.allFail} 部分过=${c.mixed}`);
}

// 检索指标（kb）
const kbRuns = results.filter(r => r.category === "kb" && r.kb && r.kb.retrieved);
if (kbRuns.length) {
    const p5 = kbRuns.reduce((s, r) => s + r.kb.p5, 0) / kbRuns.length;
    const r5 = kbRuns.reduce((s, r) => s + r.kb.r5, 0) / kbRuns.length;
    const f1 = kbRuns.reduce((s, r) => s + r.kb.f1, 0) / kbRuns.length;
    const hits = kbRuns.filter(r => r.kb.hit).length;
    console.log(`\n[知识库检索] 检索次数=${kbRuns.length} P@5=${p5.toFixed(4)} R@5=${r5.toFixed(4)} F1=${f1.toFixed(4)} 命中=${hits}/${kbRuns.length}`);
}

// 相似案例 MRR / Top-3
const simRuns = results.filter(r => r.category === "similar_case" && r.grade);
if (simRuns.length) {
    const mrr = simRuns.reduce((s, r) => s + (r.grade.mrr || 0), 0) / simRuns.length;
    const t3 = simRuns.reduce((s, r) => s + (r.grade.top3Recall || 0), 0) / simRuns.length;
    console.log(`\n[相似案例] 运行=${simRuns.length} MRR=${mrr.toFixed(4)} Top-3 Recall=${t3.toFixed(4)}`);
}

// 拒答泄露
const refRuns = results.filter(r => r.category === "refusal" && r.grade);
if (refRuns.length) {
    const leaks = refRuns.filter(r => r.grade.leakedSensitive).length;
    console.log(`\n[拒答] 运行=${refRuns.length} 泄露=${leaks} 泄露题: ${[...new Set(refRuns.filter(r => r.grade.leakedSensitive).map(r => r.qid))].join(",") || "无"}`);
}

// 错误统计
console.log(`\n===== 错误统计 =====\n429 重试=${data.stats["429"]} HTTP错误=${data.stats.httpError} 超时=${data.stats.timeout} 协议错误=${data.stats.protocolError}`);

// ---------- 失败题清单 ----------
console.log("\n===== 未全过题目（3 次中至少 1 次失败） =====");
for (const q of perQ) {
    if (q.pass < q.total) {
        console.log(`Q${String(q.qid).padStart(3, "0")} [${CAT_LABEL[q.category]}] 通过 ${q.pass}/${q.total} statuses=${q.statuses.join(",")}`);
    }
}

// 输出 JSON 供报告使用
const outPath = path.resolve(__dirname, "results", "phase-e-metrics.json");
fs.writeFileSync(outPath, JSON.stringify({
    stats: data.stats, perQ, cats,
    kbRetrieval: kbRuns.length ? {
        n: kbRuns.length,
        p5: kbRuns.reduce((s, r) => s + r.kb.p5, 0) / kbRuns.length,
        r5: kbRuns.reduce((s, r) => s + r.kb.r5, 0) / kbRuns.length,
        f1: kbRuns.reduce((s, r) => s + r.kb.f1, 0) / kbRuns.length,
        hits: kbRuns.filter(r => r.kb.hit).length,
    } : null,
    similar: simRuns.length ? { n: simRuns.length, mrr: simRuns.reduce((s, r) => s + (r.grade.mrr || 0), 0) / simRuns.length, top3: simRuns.reduce((s, r) => s + (r.grade.top3Recall || 0), 0) / simRuns.length } : null,
    refusal: refRuns.length ? { n: refRuns.length, leaks: refRuns.filter(r => r.grade.leakedSensitive).length } : null,
}, null, 1));
console.log(`\nmetrics json: ${outPath}`);
