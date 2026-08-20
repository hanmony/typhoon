/**
 * kb-cache-ab.js — 阶段 F 缓存 A/B 测试（Codex 审查项 5）
 *
 * 目的：验证 Embedding LRU 缓存前后 / 禁用缓存前后的 kb 检索结果一致：
 *   sources（documentName/chunkIndex/score/排序/content）必须完全一致，
 *   回答必须非空且正常返回（回答文本由 LLM 每次生成，非确定性，故只断言存在性）。
 *
 * 前置：两个后端实例
 *   A（缓存开）：本机 3000（默认配置 EMBEDDING_CACHE_SIZE=256）
 *   B（缓存关）：3001（启动时 EMBEDDING_CACHE_SIZE=0）
 *
 * 用法：
 *   node server/scripts/kb-cache-ab.js
 *   环境变量：PF_AB_BASE_A（默认 http://127.0.0.1:3000/api）、
 *             PF_AB_BASE_B（默认 http://127.0.0.1:3001/api）
 */
const fs = require("fs");
const path = require("path");

const BASE_A = process.env.PF_AB_BASE_A || "http://127.0.0.1:3000";
const BASE_B = process.env.PF_AB_BASE_B || "http://127.0.0.1:3001";
const Q = "台风期间线路停运的判定条件是什么？";
const RUNS = 3;

async function login(base) {
    const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "m2test", password: "M2test123!" }),
    });
    const j = await res.json();
    if (!j.token) throw new Error(`登录失败 ${base}: ${JSON.stringify(j).slice(0, 160)}`);
    return j.token;
}

async function kbQuery(base, token) {
    const t0 = Date.now();
    const res = await fetch(`${base}/kb/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: Q, topK: 3 }),
    });
    const j = await res.json();
    return {
        ms: Date.now() - t0,
        status: res.status,
        sources: (j.sources || []).map(s => ({
            documentName: s.documentName,
            chunkIndex: s.chunkIndex,
            score: Math.round((s.score || 0) * 1e6) / 1e6,
            content: s.content,
        })),
        answer: typeof j.answer === "string" ? j.answer : "",
    };
}

function sameSources(a, b, opts = {}) {
    // opts.exactScore: 要求 score 完全相等（用于缓存命中 vs 冷启动——缓存返回同一向量）
    // 否则 score 允许 ±0.001 容差（独立 embedding 调用间存在 ~1e-4 量级非确定性，非缓存差异）
    if (a.length !== b.length) return { ok: false, why: `sources 数量 ${a.length} != ${b.length}` };
    for (let i = 0; i < a.length; i++) {
        const x = a[i], y = b[i];
        if (x.documentName !== y.documentName) return { ok: false, why: `第${i}个 documentName 不同: ${x.documentName} vs ${y.documentName}` };
        if (x.chunkIndex !== y.chunkIndex) return { ok: false, why: `第${i}个 chunkIndex 不同: ${x.chunkIndex} vs ${y.chunkIndex}` };
        if (x.content !== y.content) return { ok: false, why: `第${i}个 content 不同` };
        if (opts.exactScore ? x.score !== y.score : Math.abs(x.score - y.score) > 0.001) {
            return { ok: false, why: `第${i}个 score 不同: ${x.score} vs ${y.score}${opts.exactScore ? "（要求精确相等）" : "（容差0.001内）"}` };
        }
    }
    return { ok: true, why: `sources 一致（数量/顺序/字段${opts.exactScore ? "/score精确" : "/score容差0.001"}）` };
}

async function collect(base, label) {
    const token = await login(base);
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
        const r = await kbQuery(base, token);
        runs.push(r);
        console.log(`  [${label}] run${i + 1}: status=${r.status} ms=${r.ms} sources=${r.sources.length} answerLen=${r.answer.length}`);
    }
    return runs;
}

async function main() {
    console.log(`kb 缓存 A/B   A(缓存开)=${BASE_A}  B(缓存关)=${BASE_B}  问题="${Q}"  每端 ${RUNS} 次`);
    const runsA = await collect(BASE_A, "A-缓存开");
    const runsB = await collect(BASE_B, "B-缓存关");

    const checks = [];
    // A 内部：run1(冷) vs run2/3(缓存命中) 必须完全一致（score 精确相等=缓存返回同一向量）
    for (let i = 1; i < runsA.length; i++) checks.push({ id: `A内部 run1 vs run${i + 1}(缓存命中)`, ...sameSources(runsA[0].sources, runsA[i].sources, { exactScore: true }) });
    // B 内部（缓存关）：每次重算，score 允许 embedding 非确定性容差
    for (let i = 1; i < runsB.length; i++) checks.push({ id: `B内部 run1 vs run${i + 1}(缓存关)`, ...sameSources(runsB[0].sources, runsB[i].sources) });
    // A vs B：缓存开/关 跨实例一致（score 容差）
    for (let i = 0; i < RUNS; i++) checks.push({ id: `跨实例 A-run${i + 1} vs B-run${i + 1}`, ...sameSources(runsA[i].sources, runsB[i].sources) });
    // 回答：全部非空且 HTTP 200/201
    const allOkAnswers = [...runsA, ...runsB].every(r => (r.status === 200 || r.status === 201) && r.answer.length > 0);
    checks.push({ id: "回答非空且 HTTP 200/201", ok: allOkAnswers, why: allOkAnswers ? "全部非空" : "存在空回答或非200/201" });

    let pass = 0;
    for (const c of checks) {
        console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.id}  ${c.why}`);
        if (c.ok) pass++;
    }
    console.log(`\n===== kb 缓存 A/B 汇总: ${pass}/${checks.length} 通过 =====`);

    fs.writeFileSync(
        path.join(__dirname, "..", "docs", "M6_PHASE_F_KB_AB.json"),
        JSON.stringify({ baseA: BASE_A, baseB: BASE_B, question: Q, runsA, runsB, checks }, null, 2),
        "utf8",
    );
    console.log("结果已保存: server/docs/M6_PHASE_F_KB_AB.json");

    if (pass < checks.length) process.exit(1);
}

main().catch(e => { console.error("脚本异常:", e); process.exit(1); });
