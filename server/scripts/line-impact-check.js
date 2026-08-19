/**
 * line-impact-check.js — M4 步骤 16 真实数据验证（开发用，入库）
 *
 * 前置：已 npm run build；cwd 为 server（资产路径相对 cwd 解析）。
 * 用法：cd server && node scripts/line-impact-check.js
 *
 * 数据：dummy 梅花源（2022 梅花真实路径 + 真实 radius7 风圈，旧 schema points）。
 * 期望：梅花 2022-09-14/15 登陆上海奉贤沿海，南侧/沿海线路（5号线、16号线、
 *      浦江线、磁浮线、机场联络线等）应进入受影响列表。
 */
const path = require("path");
process.chdir(path.resolve(__dirname, "..")); // server 目录（资产相对路径 + .env）
require("dotenv").config();
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

async function main() {
    const { WindCircleService } = require("../src/typhoon/alert/wind-circle.service.ts");
    const { LineImpactService } = require("../src/alert-analyzer/service/line-impact.service.ts");
    const { getDummyTyphoonSource } = require("../src/dummy/typhoon.source.ts");

    const windCircle = new WindCircleService();
    const lineImpact = new LineImpactService(windCircle);
    await lineImpact.onModuleInit();

    const loaded = lineImpact.getLoadedLines();
    console.log(`线路资产: ${loaded.length} 条线`);
    if (!loaded.length) {
        console.error("❌ 资产未加载（请确认在 server 目录运行）");
        process.exit(1);
    }

    const typhoon = getDummyTyphoonSource("梅花");
    console.log(`当前台风: ${typhoon.name}（${typhoon.points?.length ?? 0} 个轨迹点）`);

    const result = lineImpact.analyze(typhoon);
    console.log(`\n===== 受影响线路（按命中点数排序）=====`);
    if (!result.length) {
        console.log("（无线路命中——请检查风圈半径数据与资产坐标）");
    }
    for (const r of result) {
        const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 16).replace("T", " ") : "-");
        console.log(`  ${r.line.padEnd(6)} 命中 ${r.hitCount} 个轨迹时刻  窗口: ${fmt(r.windowStart)} ~ ${fmt(r.windowEnd)}`);
    }

    // 合理性断言：至少命中 1 条线；梅花登陆上海，预期覆盖奉贤/浦东方向的线路
    const ok = result.length > 0;
    console.log(`\n${ok ? "✅ 验证通过" : "❌ 无线路命中"}（命中 ${result.length} 条）`);

    // 判别力验证：台风在远海（前 5 个轨迹点，约 132°E）时，命中线路应显著减少或为 0
    const farSea = { ...typhoon, points: typhoon.points.slice(0, 5) };
    const farResult = lineImpact.analyze(farSea);
    console.log(
        `判别力检查：远海阶段命中 ${farResult.length} 条线（期望 < 10 条，与全轨迹 ${result.length} 条形成区分）`,
    );
    if (farResult.length >= 10) {
        console.error("❌ 远海阶段命中过多——相交判定可能异常（坐标框架或风圈口径问题）");
        process.exit(1);
    }
    console.log("✅ 判别力检查通过");
    if (!ok) process.exit(1);
}

main().catch(err => {
    console.error("脚本异常:", err.message);
    process.exit(1);
});
