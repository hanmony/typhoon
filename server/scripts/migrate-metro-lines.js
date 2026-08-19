/**
 * migrate-metro-lines.js — M4 步骤 15：迁移前端 metro.2026.data 线路坐标到后端 assets
 *
 * 源：client/src/app/pages/case-detail/services/metro.2026.data.ts
 * 目标：server/assets/line/metro-2026.json（后端 turf 风圈×线路相交计算使用，部署随 assets/ 交付）
 *
 * 格式：前端"坐标: '纬度,经度'"字符串 → 后端 { lng, lat }（lng 在前，与 wind-circle 经纬度口径一致）
 * 幂等：直接覆盖写入；运行后打印校验（线路数/点数/抽查）。
 *
 * 用法：cd server && node scripts/migrate-metro-lines.js
 */
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(__dirname, "../../client/src/app/pages/case-detail/services/metro.2026.data.ts");
const OUT = path.resolve(__dirname, "../assets/line/metro-2026.json");

function main() {
    if (!fs.existsSync(SRC)) {
        console.error("❌ 源文件不存在:", SRC);
        process.exit(1);
    }
    const src = fs.readFileSync(SRC, "utf8");

    // 1. 提取每条线路的坐标块（键可能带引号如 '1号线'，也可能不带引号如 机场联络线）
    const lines = {};
    const blockRe = /(?:'([^']+)'|([^\s:'\[]+)):\s*\[([\s\S]*?)\],/g;
    let m;
    while ((m = blockRe.exec(src)) !== null) {
        const name = m[1] || m[2];
        const block = m[3];
        const points = [];
        const coordRe = /坐标:\s*'([^']+)'/g;
        let c;
        while ((c = coordRe.exec(block)) !== null) {
            const [latStr, lngStr] = c[1].split(",").map(s => s.trim());
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                console.error(`❌ ${name} 坐标解析失败: "${c[1]}"`);
                process.exit(1);
            }
            points.push({ lng, lat });
        }
        if (!points.length) {
            console.error(`❌ ${name} 无坐标点`);
            process.exit(1);
        }
        lines[name] = points;
    }

    if (Object.keys(lines).length === 0) {
        console.error("❌ 未解析到任何线路（源文件格式可能变化）");
        process.exit(1);
    }

    // 2. 写资产
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const asset = {
        version: "2026",
        source: "client/src/app/pages/case-detail/services/metro.2026.data.ts",
        generatedBy: "scripts/migrate-metro-lines.js",
        note: "坐标 = { lng, lat }（经纬度，与 wind-circle 口径一致）；点按源文件序号有序；站点与线路点均包含",
        lines,
        meta: {
            lineCount: Object.keys(lines).length,
            pointCount: Object.values(lines).reduce((sum, p) => sum + p.length, 0),
        },
    };
    fs.writeFileSync(OUT, JSON.stringify(asset, null, 1), "utf8");

    // 3. 校验
    console.log("✅ 已写入:", OUT);
    console.log(`   线路数: ${asset.meta.lineCount}  坐标点总数: ${asset.meta.pointCount}`);
    const first = lines["1号线"][0];
    console.log(`   抽查 1号线 首点: lng=${first.lng} lat=${first.lat}（期望 121.385377 / 31.111226，莘庄站）`);
    const last = lines[Object.keys(lines).pop()];
    console.log(`   末条线路: ${Object.keys(lines).pop()}（${last.length} 点）`);
    const recheck = JSON.parse(fs.readFileSync(OUT, "utf8"));
    console.log(
        `   回读校验: ${recheck.meta.lineCount} 条线 / ${recheck.meta.pointCount} 点 / 线路样例 ${Object.keys(recheck.lines).slice(0, 3).join(",")}…`,
    );
}

main();
