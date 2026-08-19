/**
 * case-matcher-check.js — M3 步骤 11 真实数据验证脚本（开发用，入库）
 *
 * 前置：本地 MongoDB 运行中（mongo-typhoon-test，库 schooltyphoon）；已 npm run build。
 * 用法：cd server && node scripts/case-matcher-check.js
 *
 * 验证逻辑：
 *  1. 用「2022梅花」的真实路径点作为"当前台风"输入 → 期望梅花排第 1（自匹配分数接近 1）
 *  2. 用「2021烟花」的路径作为输入 → 期望烟花排第 1
 *  3. 用「梅花路径整体东移 10 度」的合成台风 → 观察排名变化（应偏向烟花或保持合理）
 */
const path = require("path");
process.chdir(path.resolve(__dirname, "..")); // 保证 .env 可加载
require("dotenv").config();

const mongoose = require("mongoose");

async function main() {
    const uri = process.env.DATABASE_URI || "mongodb://127.0.0.1:27017/schooltyphoon";
    await mongoose.connect(uri);
    console.log("已连接:", uri.split("@").pop());

    // 直接用集合名绑定 schema 无关模型（模拟 RepoService 的三个模型）
    const pathInfos = mongoose.model("PathInfo", new mongoose.Schema({}, { strict: false }), "pathinfos");
    const actions = mongoose.model("Action", new mongoose.Schema({}, { strict: false }), "actions");
    const cases = mongoose.model("Case", new mongoose.Schema({}, { strict: false }), "cases");
    const repo = { pathInfos, actions, cases };

    const { CaseMatcherService } = require("../dist/alert-analyzer/service/case-matcher.service.js");
    const matcher = new CaseMatcherService(repo);

    const loadTrack = async name => {
        const pts = await pathInfos.find({ caseId: name }).sort({ time: 1 }).lean();
        return pts.map(p => ({ longitude: p.longitude, latitude: p.latitude, time: p.time, power: p.power }));
    };

    const show = async (label, track) => {
        console.log("\n===== " + label + " =====");
        const result = await matcher.match(track, 3);
        for (const r of result) {
            console.log(
                `  ${r.caseName}  分数=${r.score}  路径平均最近=${r.meanNearestKm}km  最强时刻相距=${r.landfallKm}km  点数=${r.pathPointCount}`,
            );
            console.log(`    → ${r.reason}`);
            console.log(`    时间线: ${r.timeline.map(t => `${t.category}×${t.count}`).join("、")}`);
            if (r.summary.length) {
                console.log(`    处置要点样例: ${r.summary[0]}`);
            }
        }
    };

    // 1. 梅花路径自匹配
    const meihua = await loadTrack("2022梅花");
    await show("当前台风 = 2022梅花（期望梅花第一）", meihua);

    // 2. 烟花路径匹配
    const yanhua = await loadTrack("2021烟花");
    await show("当前台风 = 2021烟花（期望烟花第一）", yanhua);

    // 3. 梅花路径东移 10 度（合成"陌生台风"）
    const shifted = meihua.map(p => ({ ...p, longitude: p.longitude + 10 }));
    await show("当前台风 = 梅花路径东移10度（合成台风）", shifted);

    await mongoose.disconnect();
    console.log("\n验证完成");
}

main().catch(err => {
    console.error("脚本异常:", err);
    process.exit(1);
});
