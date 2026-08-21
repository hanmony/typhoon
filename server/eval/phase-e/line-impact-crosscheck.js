/**
 * line-impact-crosscheck.js — M6 阶段 E 线路影响「直接空间计算」对照
 *
 * 用途：按任务要求「线路影响必须同时调用直接空间计算作为真值」，用平台自身的
 * WindCircleService + LineImpactService 对历史台风（灿都 202114，typhoontwos 真实轨迹）
 * 计算 7/10/12 级风圈 × 线路的受影响线路集合/等级/时间窗，再与金标准（actions
 * 「线路行车措施」历史记录）对照。
 *
 * 说明（诚实口径）：金标准线路题记录的是历史行车措施（停运/限速/巡道等运营决策），
 * 空间计算给出的是风圈几何暴露；两者口径不同，对照结果用于说明差异，不作为线路题
 * 的评分依据（评分依据 actions 记录，见 verify-goldset-v2.py）。
 *
 * 用法：cd server && node eval/phase-e/line-impact-crosscheck.js
 */
const path = require("path");
process.chdir(path.resolve(__dirname, "..", "..")); // server 目录
require("dotenv").config();
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

async function main() {
    const { WindCircleService } = require("../../src/typhoon/alert/wind-circle.service.ts");
    const { LineImpactService } = require("../../src/alert-analyzer/service/line-impact.service.ts");
    const { TyphoonTwoDto } = require("../../src/typhoon/domain/typhoon.two.dto.ts");

    const mongoose = require("mongoose");
    await mongoose.connect(process.env.DATABASE_URI || "mongodb://127.0.0.1:27017/schooltyphoon");
    const openSchema = new mongoose.Schema({}, { strict: false });
    const typhoons = mongoose.model("CrossTyphoonTwo", openSchema, "typhoontwos");

    const windCircle = new WindCircleService();
    const lineImpact = new LineImpactService(windCircle);
    await lineImpact.onModuleInit();
    console.log(`线路资产: ${lineImpact.getLoadedLines().length} 条线`);

    const targets = [
        { tfid: "202114", label: "灿都(202114)" },
        { tfid: "202106", label: "烟花(202106)" },
        { tfid: "202212", label: "梅花(202212)" },
        { tfid: "202413", label: "贝碧嘉(202413)" },
    ];
    for (const t of targets) {
        const doc = await typhoons.findOne({ tfid: t.tfid });
        if (!doc) { console.log(`\n===== ${t.label}: typhoontwos 无记录，跳过 =====`); continue; }
        const typhoon = TyphoonTwoDto.fromDoc(doc);
        const points = windCircle.transformActiveTyphoonToPoints(typhoon);
        const states = windCircle
            .transformPointsToStates(points)
            .filter(s => Number.isFinite(s.time?.getTime()))
            .sort((a, b) => a.time.getTime() - b.time.getTime());
        if (!states.length) { console.log(`\n===== ${t.label}: 无有效轨迹状态 =====`); continue; }

        console.log(`\n===== ${t.label}: ${typhoon.name} 轨迹点=${states.length} =====`);
        for (const radiusIndex of [2, 1, 0]) {
            const level = radiusIndex === 2 ? "12级" : radiusIndex === 1 ? "10级" : "7级";
            const results = lineImpact.analyzeStates(states, { radiusIndex });
            const fmt = d => (d && Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 16).replace("T", " ") : "-");
            console.log(`  [${level}风圈] 命中 ${results.length} 条线:`);
            for (const r of results.slice(0, 25)) {
                console.log(`    ${r.line.padEnd(8)} ${fmt(r.windowStart)} ~ ${fmt(r.windowEnd)} 命中${r.hitCount}`);
            }
        }
    }

    console.log("\n说明：以上为风圈几何暴露；金标准线路题为历史行车措施（actions 记录），两者口径不同，对照结果仅作说明。");
    await mongoose.disconnect();
}

main().catch(e => { console.error("FATAL:", e.message); process.exitCode = 1; });
