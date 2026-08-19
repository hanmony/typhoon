/**
 * m5-eval.js — M5 步骤 19 综合评估（验收标准 4/5/6 的本机可验部分）
 *
 * 前置：后端 + Mongo/Qdrant 在线；后端须配置可用的 LLM/Embedding。
 * 用法：cd server && node scripts/m5-eval.js
 * 可选：M5_BASE_URL=http://127.0.0.1:3001 M5_EVAL_USER=... M5_EVAL_PASSWORD=...
 *
 * 本脚本验证接口与当前生产空间计算服务的集成一致性，不替代 M4 已做的
 * shapefile/坐标精度交叉验证，也不代表真 LLM 的部署性能。
 */
const fs = require("fs");
const path = require("path");
process.chdir(path.resolve(__dirname, ".."));
require("dotenv").config();
require("ts-node/register/transpile-only");
require("tsconfig-paths/register");

const BASE = (process.env.M5_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, "");
const USER = process.env.M5_EVAL_USER || "m2test";
const PASSWORD = process.env.M5_EVAL_PASSWORD || "M2test123!";
const REQUEST_TIMEOUT_MS = Number(process.env.M5_REQUEST_TIMEOUT_MS || 60_000);
const TFID = process.env.M5_EVAL_TFID || "202212";
const results = [];

const check = (id, ok, detail) => {
    results.push({ id, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
};

function parseSseBlock(block, atMs) {
    if (!block.trim()) return null;
    let event = "message";
    const dataLines = [];
    for (const line of block.split(/\r?\n/)) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) return null;
    const data = dataLines.join("\n");
    if (data === "[DONE]") return { event, data, done: true, atMs };
    try {
        return { event, data, payload: JSON.parse(data), done: false, atMs };
    } catch {
        return { event, data, done: false, atMs, malformed: true };
    }
}

function hasProtocolError(result) {
    return result.events.some(
        event => event.event === "error" || event.payload?.type === "error" || Boolean(event.payload?.error),
    );
}

function typedEvents(result, type) {
    return result.events.filter(event => event.payload?.type === type);
}

function validStream(result, requiredType) {
    return (
        result.status === 201 &&
        result.contentType.includes("text/event-stream") &&
        result.events.some(event => event.done) &&
        !hasProtocolError(result) &&
        typedEvents(result, requiredType).some(event => {
            const data = event.payload?.data;
            return typeof data === "string" ? data.length > 0 : data !== null && data !== undefined;
        })
    );
}

async function login() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const res = await fetch(`${BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: USER, password: PASSWORD }),
            signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || !json.token) throw new Error(`登录失败: HTTP ${res.status}`);
        return json.token;
    } finally {
        clearTimeout(timer);
    }
}

/** POST SSE；按完整事件边界解析，记录真正 token/analysis 的到达时间。 */
async function ssePost(token, urlPath, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const t0 = Date.now();
    const events = [];
    let buffer = "";
    try {
        const res = await fetch(`${BASE}${urlPath}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "text/event-stream",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!res.body) throw new Error(`${urlPath} HTTP ${res.status} 无响应体`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            while (true) {
                const boundary = buffer.match(/\r?\n\r?\n/);
                if (!boundary || boundary.index === undefined) break;
                const block = buffer.slice(0, boundary.index);
                buffer = buffer.slice(boundary.index + boundary[0].length);
                const event = parseSseBlock(block, Date.now() - t0);
                if (event) events.push(event);
            }
        }
        buffer += decoder.decode();
        const tail = parseSseBlock(buffer, Date.now() - t0);
        if (tail) events.push(tail);
        return {
            status: res.status,
            contentType: res.headers.get("content-type") || "",
            events,
            total: Date.now() - t0,
        };
    } catch (error) {
        if (error?.name === "AbortError") {
            throw new Error(`${urlPath} 超过 ${REQUEST_TIMEOUT_MS}ms 未完成`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

function formatWindow(start, end) {
    if (!start || !end) return "";
    const fmt = date => {
        const pad = value => String(value).padStart(2, "0");
        return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };
    return `${fmt(start)} ~ ${fmt(end)}`;
}

function mergeStates(...groups) {
    const unique = new Map();
    for (const state of groups.flat()) {
        const time = state.time?.getTime();
        if (!Number.isFinite(time)) continue;
        unique.set(`${time}|${state.center?.[0]}|${state.center?.[1]}`, state);
    }
    return [...unique.values()].sort((a, b) => a.time.getTime() - b.time.getTime());
}

async function buildExpectedLineCards(mongoose) {
    const { TyphoonTwoDto } = require("../src/typhoon/domain/typhoon.two.dto.ts");
    const { WindCircleService } = require("../src/typhoon/alert/wind-circle.service.ts");
    const { LineImpactService } = require("../src/alert-analyzer/service/line-impact.service.ts");
    const openSchema = new mongoose.Schema({}, { strict: false });
    const typhoons = mongoose.model("M5TyphoonTwo", openSchema, "typhoontwos");
    const commands = mongoose.model("M5TyphoonCommand", openSchema, "typhooncommands");
    const doc = await typhoons.findOne({ tfid: TFID });
    if (!doc) throw new Error(`缺少评估台风 tfid=${TFID}`);

    const typhoon = TyphoonTwoDto.fromDoc(doc);
    const wc = new WindCircleService();
    const li = new LineImpactService(wc);
    await li.onModuleInit();
    const points = wc.transformActiveTyphoonToPoints(typhoon);
    const historical = wc
        .transformPointsToStates(points)
        .filter(state => Number.isFinite(state.time?.getTime()))
        .sort((a, b) => a.time.getTime() - b.time.getTime());
    if (!historical.length) throw new Error(`评估台风 tfid=${TFID} 无有效轨迹`);

    const command = await commands.findOne({ status: 0 }).sort({ createTime: -1 });
    const isSimulated = Boolean(
        command &&
            command.name === typhoon.name &&
            command.isSimulated === 1 &&
            command.simulateStartTime &&
            command.startTime,
    );
    const queryTime = isSimulated
        ? wc.calcSimulateTime(command.simulateStartTime, command.startTime)
        : new Date();
    const currentState = isSimulated
        ? ([...historical].reverse().find(state => state.time <= queryTime) ?? historical[0])
        : historical[historical.length - 1];
    const future = wc.getPredictPath({ points }, isSimulated, queryTime);
    const states = mergeStates(currentState ? [currentState, ...future] : future);
    if (!states.length) throw new Error("评估上下文没有当前/未来台风状态");

    const radiusOrder = [2, 1, 0];
    const risks = {
        2: "最高空间风险：高（12级风圈）",
        1: "最高空间风险：中（10级风圈）",
        0: "可能受影响（仅7级风圈）",
    };
    const perLevel = radiusOrder.map(radiusIndex => ({
        radiusIndex,
        results: li.analyzeStates(states, { radiusIndex }),
    }));
    const names = new Set(perLevel.flatMap(level => level.results.map(result => result.line)));
    const expected = new Map();
    for (const name of names) {
        const hits = perLevel
            .map(level => ({
                radiusIndex: level.radiusIndex,
                hit: level.results.find(result => result.line === name),
            }))
            .filter(item => item.hit);
        const starts = hits.map(item => item.hit.windowStart).filter(date => date instanceof Date && Number.isFinite(date.getTime()));
        const ends = hits.map(item => item.hit.windowEnd).filter(date => date instanceof Date && Number.isFinite(date.getTime()));
        expected.set(name, {
            line: name,
            riskLevel: risks[hits[0].radiusIndex],
            period: formatWindow(
                starts.length ? new Date(Math.min(...starts.map(date => date.getTime()))) : undefined,
                ends.length ? new Date(Math.max(...ends.map(date => date.getTime()))) : undefined,
            ),
        });
    }
    return { expected, mode: isSimulated ? "simulated-command" : "realtime-explicit-tfid", stateCount: states.length };
}

function compareLineCards(actual, expected) {
    const problems = [];
    const names = actual.map(line => line?.line);
    if (names.some(name => typeof name !== "string" || !name)) problems.push("存在空线路名");
    if (new Set(names).size !== names.length) problems.push("存在重复线路");
    const actualMap = new Map(actual.map(line => [line.line, line]));
    const missing = [...expected.keys()].filter(name => !actualMap.has(name));
    const extra = [...actualMap.keys()].filter(name => !expected.has(name));
    if (missing.length) problems.push(`缺少: ${missing.join(",")}`);
    if (extra.length) problems.push(`多出: ${extra.join(",")}`);
    for (const [name, card] of actualMap) {
        const oracle = expected.get(name);
        if (!oracle) continue;
        if (card.riskLevel !== oracle.riskLevel) problems.push(`${name} 风险不符`);
        if (card.period !== oracle.period) problems.push(`${name} 时间窗不符`);
    }
    return problems;
}

async function main() {
    console.log(`M5 eval target: ${BASE}`);
    const token = await login();

    const chat = await ssePost(token, "/chat/stream", { question: "你好", from: "cocc" });
    check("回归 /chat/stream 有效 token + [DONE]", validStream(chat, "token"), `HTTP ${chat.status}`);

    const agent = await ssePost(token, "/agent/stream", { question: "你好", from: "cocc" });
    check("回归 /agent/stream 有效 token + [DONE]", validStream(agent, "token"), `HTTP ${agent.status}`);

    const kb = await ssePost(token, "/kb/query/stream", {
        question: "台风期间线路停运的判定条件是什么？",
        topK: 3,
    });
    // KB controller 保留旧 flat SSE：{sources:[...]} / {content:"..."}，不是 typed token 协议。
    const sourceEvent = kb.events.find(event => Array.isArray(event.payload?.sources));
    const sourceCount = sourceEvent?.payload?.sources?.length || 0;
    const hasKbContent = kb.events.some(
        event => typeof event.payload?.content === "string" && event.payload.content.length > 0,
    );
    const kbOk =
        kb.status === 201 &&
        kb.contentType.includes("text/event-stream") &&
        kb.events.some(event => event.done) &&
        !hasProtocolError(kb) &&
        sourceCount > 0 &&
        hasKbContent;
    check(
        "回归 /kb/query/stream 非空 sources + content + [DONE]",
        kbOk,
        `HTTP ${kb.status} sources=${sourceCount}`,
    );

    const ana = await ssePost(token, "/alert-analyzer/stream", { tfid: TFID, autoRun: true });
    const analysisEvents = typedEvents(ana, "analysis");
    check(
        "研判流 analysis + token + [DONE]",
        validStream(ana, "token") && analysisEvents.length === 1,
        `HTTP ${ana.status} analysis=${analysisEvents.length}`,
    );

    const firstChatToken = typedEvents(chat, "token")[0]?.atMs;
    check(
        "性能 常规问答首 token < 3s",
        Number.isFinite(firstChatToken) && firstChatToken < 3000,
        `${firstChatToken ?? "null"}ms（本地 mock，仅验证采集与预算门槛）`,
    );
    check(
        "性能 研判总时长 < 30s",
        ana.total < 30_000,
        `${ana.total}ms（本地 mock，不代表真模型部署性能）`,
    );

    const agentSource = fs.readFileSync(path.resolve("src/agent/agent.service.ts"), "utf8");
    const maxRoundsIsFive =
        /const\s+MAX_ROUNDS\s*=\s*5\s*;/.test(agentSource) &&
        /round\s*<\s*MAX_ROUNDS/.test(agentSource) &&
        /round\s*<\s*MAX_ROUNDS\s*-\s*1\s*\?\s*tools\s*:\s*\[\]/.test(agentSource);
    check("性能 tool loop 上限 ≤ 5", maxRoundsIsFive, "静态契约：MAX_ROUNDS=5，末轮禁用工具");

    const actualLines = analysisEvents[0]?.payload?.data?.affectedLines;
    check(
        "研判卡片结构",
        Array.isArray(actualLines) && actualLines.length > 0,
        `affectedLines=${Array.isArray(actualLines) ? actualLines.length : "invalid"}`,
    );

    const mongoose = require("mongoose");
    try {
        await mongoose.connect(process.env.DATABASE_URI || "mongodb://127.0.0.1:27017/schooltyphoon");
        const oracle = await buildExpectedLineCards(mongoose);
        const problems = Array.isArray(actualLines) ? compareLineCards(actualLines, oracle.expected) : ["卡片结构无效"];
        check(
            "研判一致性 线路集合/最高风圈等级/时间窗严格相等",
            problems.length === 0,
            problems.length
                ? problems.slice(0, 8).join("；")
                : `${actualLines.length}/${oracle.expected.size}，mode=${oracle.mode}，states=${oracle.stateCount}`,
        );
    } finally {
        await mongoose.disconnect();
    }

    const pass = results.filter(result => result.ok).length;
    console.log(`\n===== 汇总: ${pass}/${results.length} 通过 =====`);
    if (pass < results.length) process.exitCode = 1;
}

main().catch(error => {
    console.error("脚本异常:", error.message);
    process.exitCode = 1;
});
