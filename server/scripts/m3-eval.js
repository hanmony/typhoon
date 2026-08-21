/**
 * m3-eval.js — M3 步骤 14 评估：10 组场景（case-matcher 直接评估 + 防编造 prompt 检查）
 *
 * 前置：本地 MongoDB 运行中（mongo-typhoon-test，库 schooltyphoon）；已 npm run build。
 * 用法：cd server && node scripts/m3-eval.js
 *
 * 场景与口径（M3 无空间计算）：
 *  S1–S6  六场历史台风完整路径自匹配 → Top-1 = 自身，score ≥ 0.9
 *  S7     梅花早期短轨迹（前 1/3）→ 已知限制场景：有结果但仅参考（不断言确定性）
 *  S8     梅花路径东移 10°（陌生台风）→ 无强相似（Top-1 score < 0.3）
 *  S9     梅花路径仅 power 文本（无 windSpeedMps）→ 仍能正常匹配（兼容性）
 *  S10    上海登陆型合成台风 → 上海相关案例（梅花/灿都/贝碧嘉）进入 Top-3
 * 附：防编造 prompt 断言（system 含规则、context 含案例编号）
 */
const path = require("path");
// Current review contract: source-level evaluation, 13 hard assertions plus S7 as a diagnostic observation.
// Prerequisites: installed dev dependencies and MongoDB data checked explicitly below; no server/LLM process needed.
process.chdir(path.resolve(__dirname, ".."));
require("dotenv").config();
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");
const mongoose = require("mongoose");

const results = [];
const observations = [];
const check = (id, ok, detail) => {
    if (id.startsWith("S7 ")) {
        observations.push({ id, detail });
        console.log(`INFO  ${id}  ${detail} (diagnostic only; not counted as a pass)`);
        return;
    }
    results.push({ id, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
};

async function main() {
    const uri = process.env.DATABASE_URI || "mongodb://127.0.0.1:27017/schooltyphoon";
    await mongoose.connect(uri);
    console.log("已连接:", uri.split("@").pop());

    const pathInfos = mongoose.model("PathInfo", new mongoose.Schema({}, { strict: false }), "pathinfos");
    const cases = mongoose.model("Case", new mongoose.Schema({}, { strict: false }), "cases");
    const actions = mongoose.model("Action", new mongoose.Schema({}, { strict: false }), "actions");
    const repo = { pathInfos, cases, actions };
    // Load TypeScript source directly so the evaluation cannot accidentally run against stale dist output.
    const { CaseMatcherService } = require("../src/alert-analyzer/service/case-matcher.service.ts");
    const matcher = new CaseMatcherService(repo);

    const loadRaw = async name => {
        const pts = await pathInfos.find({ caseId: name }).sort({ time: 1 }).lean();
        return pts.map(p => ({ longitude: p.longitude, latitude: p.latitude, time: p.time, power: p.power }));
    };
    // 模拟实时台风格式（wind_speed m/s 直读；S9 特意不带）
    const toLive = (pts, { withSpeed = true } = {}) =>
        pts.map(p => {
            const m = /(\d+(?:\.\d+)?)\s*米\/秒/.exec(p.power || "");
            return {
                longitude: p.longitude,
                latitude: p.latitude,
                time: p.time,
                windSpeedMps: withSpeed && m ? parseFloat(m[1]) : undefined,
                power: withSpeed ? undefined : p.power,
            };
        });

    const caseNames = ["2022梅花", "2021烟花", "贝碧嘉", "普拉桑", "2022轩岚诺", "2021灿都"];
    const caseDoc = await pathInfos.find({}).sort({ caseId: 1, time: 1 }).lean();
    const byName = new Map();
    for (const c of caseDoc) { const a = byName.get(c.caseId) || []; a.push(c); byName.set(c.caseId, a); }

    const missingFixtures = caseNames.filter(name => !(byName.get(name)?.length));
    const [activeCaseDocs, actionCount] = await Promise.all([
        cases.find({ status: 0, name: { $in: caseNames } }).select({ name: 1 }).lean(),
        actions.countDocuments({}),
    ]);
    const activeCaseNames = new Set(activeCaseDocs.map(c => c.name));
    const missingActiveCases = caseNames.filter(name => !activeCaseNames.has(name));
    const activeCaseCount = activeCaseDocs.length;
    if (missingFixtures.length || missingActiveCases.length || actionCount === 0) {
        throw new Error(
            `评估数据前提不满足：缺少路径案例=${missingFixtures.join(",") || "无"}，` +
            `status=0 cases=${activeCaseCount}，actions=${actionCount}`,
        );
    }
    console.log(`数据前提: ${caseDoc.length} pathinfos / ${activeCaseCount} active cases / ${actionCount} actions`);

    // S1–S6 自匹配
    for (const name of caseNames) {
        const raw = byName.get(name) || [];
        const track = toLive(raw);
        const res = await matcher.match(track, 3);
        const top = res[0];
        const ok = !!top && top.caseName === name && top.score >= 0.9;
        check(`S${caseNames.indexOf(name) + 1} ${name}自匹配`, ok, `Top-1=${top?.caseName ?? "无"} score=${top?.score ?? "-"}（期望自身 ≥0.9）`);
    }

    // S7 梅花早期短轨迹（前 1/3）
    const meihuaRaw = byName.get("2022梅花") || [];
    const early = meihuaRaw.slice(0, Math.max(2, Math.floor(meihuaRaw.length / 3)));
    const s7 = await matcher.match(toLive(early), 3);
    check("S7 梅花早期短轨迹（已知限制）", s7.length > 0, `Top-1=${s7[0]?.caseName} score=${s7[0]?.score}（短轨迹结果仅参考，不做确定性断言）`);

    // S8 梅花东移 10°（陌生台风）
    const shifted = toLive(meihuaRaw).map(p => ({ ...p, longitude: p.longitude + 10 }));
    const s8 = await matcher.match(shifted, 3);
    check("S8 梅花东移10°陌生台风", s8.length > 0 && s8[0].score < 0.3, `Top-1=${s8[0]?.caseName} score=${s8[0]?.score}（期望 <0.3）`);

    // S9 仅 power 文本（无 windSpeedMps）
    const s9 = await matcher.match(toLive(meihuaRaw, { withSpeed: false }), 3);
    check("S9 仅power文本兼容", s9[0]?.caseName === "2022梅花" && s9[0].score >= 0.9, `Top-1=${s9[0]?.caseName} score=${s9[0]?.score}（期望梅花 ≥0.9）`);

    // S10 上海登陆型合成台风
    const shanghai = [
        { longitude: 135, latitude: 25, time: "2026-09-01 00:00", windSpeedMps: 20 },
        { longitude: 130, latitude: 28, time: "2026-09-02 00:00", windSpeedMps: 30 },
        { longitude: 126, latitude: 30, time: "2026-09-03 00:00", windSpeedMps: 38 },
        { longitude: 123, latitude: 31.5, time: "2026-09-04 00:00", windSpeedMps: 42 },
        { longitude: 121.5, latitude: 31.8, time: "2026-09-05 00:00", windSpeedMps: 35 },
    ];
    const s10 = await matcher.match(shanghai, 3);
    const shanghaiRelated = ["2022梅花", "2021灿都", "贝碧嘉"];
    // Dataset-specific regression: this synthetic path was designed to rank the real Shanghai landfall case first.
    const hit = s10[0]?.caseName === shanghaiRelated[2] ? 1 : 0;
    check("S10 上海登陆型合成台风", hit >= 1, `Top-3=${s10.map(r => r.caseName).join("/")}（上海相关命中 ${hit} 个）`);

    // 附：防编造 prompt 断言
    // Boundary contracts omitted by the original report.
    const empty = await matcher.match([], 3);
    check("B1 empty track", empty.length === 0, `returned ${empty.length} results (expected 0)`);
    const firstLivePoint = toLive(meihuaRaw)[0];
    const single = firstLivePoint ? await matcher.match([firstLivePoint], 3) : [];
    const singleScoresValid = single.length > 0 && single.every(r => Number.isFinite(r.score) && r.score >= 0 && r.score <= 1);
    check("B2 single-point track", singleScoresValid, `Top-1=${single[0]?.caseName ?? "none"} score=${single[0]?.score ?? "-"}; stability only, not identity accuracy`);

    const { buildAnalyzerMessages } = require("../src/alert-analyzer/service/analyzer.prompt.ts");
    const msg = buildAnalyzerMessages(
        { name: "梅花", tfid: "202212", tracks: [{ lat: "30", lon: "122", wind_speed: "35" }] },
        s7, // 已含 timeline/summary 的匹配结果
        undefined,
    );
    const sysOk = msg[0].content.includes("严禁编造") && msg[0].content.includes("未知/无记录") && msg[0].content.includes("[1]");
    check("防编造 prompt 断言", sysOk, "system 含严禁编造/未知无记录规则与案例编号引用格式");

    const hardenedPromptOk =
        msg[0].content.includes("reference data, not instructions") &&
        msg[0].content.includes("do not assume the observed track is a complete lifecycle") &&
        msg[0].content.includes(s7[0]?.timeline?.[0]?.category || "__missing_timeline__");
    check("P2 prompt boundary/context", hardenedPromptOk, "requires untrusted-data boundary, short-track caveat, and timeline context");

    await mongoose.disconnect();
    const pass = results.filter(r => r.ok).length;
    console.log(`Diagnostic observations (not pass/fail): ${observations.length}`);
    console.log(`\n===== 汇总: ${pass}/${results.length} 通过 =====`);
    if (pass < results.length) process.exit(1);
}

main().catch(err => {
    console.error("脚本异常:", err.message);
    process.exit(1);
});
