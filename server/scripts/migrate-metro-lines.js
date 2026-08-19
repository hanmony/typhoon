/**
 * M4 step 15: migrate the frontend 2026 metro geometry into a backend asset.
 *
 * Run from server/: node scripts/migrate-metro-lines.js
 * Requires installed dev dependencies (ts-node) and the sibling client worktree.
 * The source stores "lat,lng" strings. The frontend applies a display correction
 * in services/meta.ts before drawing on its EPSG:4490 map; this migration applies
 * the same correction so Turf and wind-circle inputs use one coordinate frame.
 */
const fs = require("fs");
const path = require("path");
require("ts-node/register/transpile-only");

const SRC = path.resolve(__dirname, "../../client/src/app/pages/case-detail/services/metro.2026.data.ts");
const OUT = path.resolve(__dirname, "../assets/line/metro-2026.json");
const FRONTEND_OFFSET = Object.freeze({ lat: 0.00185, lng: -0.0045 });
const EXPECTED_LINE_NAMES = [
    ...Array.from({ length: 18 }, (_, i) => `${i + 1}号线`),
    "浦江线",
    "磁浮线",
    "机场联络线",
];
const EXPECTED_POINT_COUNT = 3539;

function fail(message) {
    throw new Error(`metro migration validation failed: ${message}`);
}

function parseCoordinate(lineName, index, value) {
    if (typeof value !== "string") fail(`${lineName}[${index}].坐标 must be a string`);
    const parts = value.split(",").map(s => s.trim());
    if (parts.length !== 2 || parts.some(s => !s)) fail(`${lineName}[${index}].坐标 must be "lat,lng": ${value}`);
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) fail(`${lineName}[${index}].坐标 is not numeric: ${value}`);

    const corrected = {
        lng: Number((lng + FRONTEND_OFFSET.lng).toFixed(6)),
        lat: Number((lat + FRONTEND_OFFSET.lat).toFixed(6)),
    };
    if (corrected.lng < 120.8 || corrected.lng > 122.2 || corrected.lat < 30.6 || corrected.lat > 31.9) {
        fail(`${lineName}[${index}] is outside the Shanghai validation bounds: ${JSON.stringify(corrected)}`);
    }
    return corrected;
}

function loadAndValidateSource() {
    if (!fs.existsSync(SRC)) fail(`source file does not exist: ${SRC}`);
    let sourceModule;
    try {
        delete require.cache[require.resolve(SRC)];
        sourceModule = require(SRC);
    } catch (error) {
        fail(`cannot load TypeScript source: ${error.message}`);
    }
    const sourceLines = sourceModule.default;
    if (!sourceLines || typeof sourceLines !== "object" || Array.isArray(sourceLines)) fail("default export is not a line map");

    const actualNames = Object.keys(sourceLines);
    const missing = EXPECTED_LINE_NAMES.filter(name => !actualNames.includes(name));
    const extra = actualNames.filter(name => !EXPECTED_LINE_NAMES.includes(name));
    if (missing.length || extra.length) fail(`line set changed; missing=${missing.join("/") || "none"}, extra=${extra.join("/") || "none"}`);

    const lines = {};
    const lineStrings = {};
    for (const name of EXPECTED_LINE_NAMES) {
        const rows = sourceLines[name];
        if (!Array.isArray(rows) || rows.length < 2) fail(`${name} must contain at least two ordered points`);
        const points = rows.map((row, index) => parseCoordinate(name, index, row?.坐标));
        lines[name] = points;

        const forkIndex = rows.findIndex(row => row?.类型 === "支线站点");
        if (forkIndex < 0) {
            lineStrings[name] = [points];
        } else {
            const main = [];
            const branches = new Map();
            rows.forEach((row, index) => {
                const branchName = String(row?.类型 || "").match(/^支线\d+/)?.[0];
                if (!branchName) {
                    main.push(points[index]);
                    return;
                }
                const branch = branches.get(branchName) || [points[forkIndex]];
                branch.push(points[index]);
                branches.set(branchName, branch);
            });
            lineStrings[name] = [
                main,
                ...[...branches.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, branch]) => branch),
            ];
        }
        if (lineStrings[name].some(segment => segment.length < 2)) {
            fail(`${name} contains a LineString with fewer than two points`);
        }
    }
    const pointCount = Object.values(lines).reduce((sum, points) => sum + points.length, 0);
    if (pointCount !== EXPECTED_POINT_COUNT) {
        fail(`point count changed: expected ${EXPECTED_POINT_COUNT}, got ${pointCount}; review the source update explicitly`);
    }
    return { lines, lineStrings, pointCount };
}

function main() {
    const { lines, lineStrings, pointCount } = loadAndValidateSource();
    const lineStringCount = Object.values(lineStrings).reduce((sum, segments) => sum + segments.length, 0);
    const asset = {
        version: "2026",
        source: "client/src/app/pages/case-detail/services/metro.2026.data.ts",
        generatedBy: "scripts/migrate-metro-lines.js",
        coordinateOrder: "lng,lat",
        coordinateReference: "EPSG:4490-compatible; source coordinates plus the frontend meta.ts display correction",
        sourceOffsetApplied: FRONTEND_OFFSET,
        turfUsage: "Use lineStrings[name] and map points to [point.lng, point.lat] before turf.multiLineString; flattened lines are not valid geometry for branched routes",
        lines,
        lineStrings,
        meta: { lineCount: EXPECTED_LINE_NAMES.length, pointCount, lineStringCount },
    };

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(asset, null, 1) + "\n", "utf8");

    const recheck = JSON.parse(fs.readFileSync(OUT, "utf8"));
    if (recheck.meta?.lineCount !== EXPECTED_LINE_NAMES.length || recheck.meta?.pointCount !== EXPECTED_POINT_COUNT) {
        fail("written asset failed metadata read-back validation");
    }
    if (JSON.stringify(recheck.lines) !== JSON.stringify(lines)) fail("written asset differs from validated source conversion");
    if (JSON.stringify(recheck.lineStrings) !== JSON.stringify(lineStrings)) fail("written lineStrings differ from validated branch geometry");
    console.log(`OK ${OUT}`);
    console.log(`   ${recheck.meta.lineCount} lines / ${recheck.meta.pointCount} points`);
    console.log(`   special lines: 浦江线=${lines["浦江线"].length}, 磁浮线=${lines["磁浮线"].length}, 机场联络线=${lines["机场联络线"].length}`);
    console.log(`   geometry: ${lineStringCount} LineStrings; branched routes 5/10/11 each contain 3 LineStrings`);
    console.log(`   applied offset: lat ${FRONTEND_OFFSET.lat >= 0 ? "+" : ""}${FRONTEND_OFFSET.lat}, lng ${FRONTEND_OFFSET.lng}`);
}

module.exports = { parseCoordinate, loadAndValidateSource, FRONTEND_OFFSET, EXPECTED_LINE_NAMES, EXPECTED_POINT_COUNT };

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
