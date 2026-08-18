/**
 * session-e2e-test.js — M2 会话持久化端到端验证脚本
 *
 * 前置：后端服务运行中（默认 http://127.0.0.1:3000）、MongoDB 就绪、
 *       mock-llm-server.js 运行中且已设为默认大模型（或使用真实 LLM）。
 *
 * 用法：
 *   node scripts/session-e2e-test.js [BASE_URL] [TOKEN]
 *   - 不传 TOKEN 时用用户名密码登录（默认 m2test / M2test123!，用户名和密码可作为第 3、4 个位置参数传入）
 *
 * 验证点（M2 验收）：
 *   1. 创建/列表/详情/删除 会话 CRUD
 *   2. 带 sessionId 的 chat stream：历史加载（第 2 轮能"记住"第 1 轮）、问答落库、自动标题
 *   3. 带 sessionId 的 agent stream：问答落库
 *   4. 非法/不存在的 sessionId → SSE error 事件（会话不存在），不 500
 *   5. 回归：不带 sessionId 的 stream 行为不变（无状态、不落库）
 */
const BASE = process.argv[2] || "http://127.0.0.1:3000";
let TOKEN = process.argv[3] || "";
const USER = process.argv[4] || "m2test";
const PASS = process.argv[5] || "M2test123!";

const results = [];
const check = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  → " + detail : ""}`);
};

const api = async (path, { method = "GET", body, token = TOKEN } = {}) => {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    return res;
};

const apiJson = async (path, opts = {}) => {
    const res = await api(path, opts);
    return res.json();
};

/** 读 SSE 响应：收集 token 文本与事件类型，直到 [DONE] 或 error 事件 */
const readSse = async res => {
    const text = await res.text();
    const tokens = [];
    let errorMsg = "";
    let done = false;
    for (const line of text.split("\n")) {
        const t = line.trim();
        if (t === "data: [DONE]") {
            done = true;
            continue;
        }
        if (t.startsWith("data: ")) {
            try {
                const ev = JSON.parse(t.slice(6));
                if (ev.type === "token") tokens.push(ev.data);
            } catch {
                /* 忽略无法解析的行 */
            }
        }
        if (t.startsWith("event: error")) {
            errorMsg = "";
        }
        if (errorMsg === "" && t.startsWith("data: ") && text.includes("event: error")) {
            try {
                const ev = JSON.parse(t.slice(6));
                if (ev.message) errorMsg = ev.message;
            } catch {
                /* 忽略 */
            }
        }
    }
    return { answer: tokens.join(""), errorMsg, done };
};

const stream = (path, body) => api(path, { method: "POST", body });

async function main() {
    console.log(`目标: ${BASE}`);

    // 0. 登录（未提供 token 时）
    if (!TOKEN) {
        const resp = await apiJson("/auth/login", {
            method: "POST",
            token: "",
            body: { username: USER, password: PASS },
        });
        TOKEN = resp.token || "";
        check("登录获取 token", !!TOKEN, TOKEN ? "OK" : JSON.stringify(resp));
        if (!TOKEN) {
            console.log("登录失败，终止。");
            return summarize();
        }
    }

    // 1. CRUD
    const created = await apiJson("/chat/sessions", { method: "POST", body: { type: "chat", from: "cocc" } });
    const sid = created._id;
    check(
        "创建会话",
        !!sid && created.user === USER && created.type === "chat",
        sid ? `id=${sid}` : JSON.stringify(created),
    );

    const list = await apiJson("/chat/sessions");
    check("会话列表包含新会话", Array.isArray(list) && list.some(s => s.id === sid));

    const detail = await apiJson(`/chat/sessions/${sid}`);
    check("会话详情可读", detail._id === sid && Array.isArray(detail.messages));

    // 2. chat stream 第 1 轮（带 sessionId）
    const r1 = await readSse(await stream("/chat/stream", { question: "我叫小明，请记住这个名字", sessionId: sid }));
    check("第 1 轮流式返回 token 且完成", r1.done && r1.answer.length > 0, `answer="${r1.answer.slice(0, 20)}..."`);

    const d1 = await apiJson(`/chat/sessions/${sid}`);
    check("第 1 轮落库（2 条消息）", d1.messages.length === 2, `${d1.messages.length} 条`);
    check(
        "自动标题取问题前 30 字",
        d1.title === "我叫小明，请记住这个名字".slice(0, 30),
        `title=${JSON.stringify(d1.title)}`,
    );

    // 3. chat stream 第 2 轮（历史应被加载 → 假模型能"记住"名字）
    const r2 = await readSse(await stream("/chat/stream", { question: "我刚才说我叫什么？", sessionId: sid }));
    check("第 2 轮召回历史（答案含'小明'）", r2.answer.includes("小明"), `answer="${r2.answer}"`);
    const d2 = await apiJson(`/chat/sessions/${sid}`);
    check("第 2 轮落库（4 条消息）", d2.messages.length === 4, `${d2.messages.length} 条`);

    // 4. agent stream（带 sessionId）
    const r3 = await readSse(await stream("/agent/stream", { question: "你好", sessionId: sid }));
    check("agent 流式返回 token 且完成", r3.done && r3.answer.length > 0, `answer="${r3.answer.slice(0, 20)}..."`);
    const d3 = await apiJson(`/chat/sessions/${sid}`);
    check("agent 轮落库（6 条消息）", d3.messages.length === 6, `${d3.messages.length} 条`);

    // 5. 非法 sessionId → SSE error 事件
    const r4 = await readSse(await stream("/chat/stream", { question: "你好", sessionId: "000000000000000000000000" }));
    check("不存在的 sessionId → SSE 错误事件", r4.errorMsg.includes("会话不存在"), `error="${r4.errorMsg}"`);
    const r5 = await readSse(await stream("/chat/stream", { question: "你好", sessionId: "not-valid" }));
    check("非法格式 sessionId → SSE 错误事件", r5.errorMsg.includes("会话不存在"), `error="${r5.errorMsg}"`);

    // 6. 回归：不带 sessionId → 无状态、不落库
    const before = (await apiJson(`/chat/sessions/${sid}`)).messages.length;
    const r6 = await readSse(await stream("/chat/stream", { question: "你好" }));
    check("无 sessionId 流式正常（回归）", r6.done && r6.answer.length > 0, `answer="${r6.answer.slice(0, 20)}..."`);
    const after = (await apiJson(`/chat/sessions/${sid}`)).messages.length;
    check("无 sessionId 不落库（会话消息数不变）", before === after, `${before} → ${after}`);

    // 7. 删除
    const del = await apiJson(`/chat/sessions/${sid}`, { method: "DELETE" });
    check("删除会话", del.code === 0, JSON.stringify(del));
    const gone = await apiJson(`/chat/sessions/${sid}`).catch(e => e);
    check("删除后详情报'会话不存在'", gone && gone.message === "会话不存在", JSON.stringify(gone));

    return summarize();
}

function summarize() {
    const failed = results.filter(r => !r.ok);
    console.log(`\n========== 结果：${results.length - failed.length}/${results.length} 通过 ==========`);
    if (failed.length) {
        failed.forEach(f => console.log(`FAIL: ${f.name}`));
        process.exitCode = 1;
    }
}

main().catch(err => {
    console.error("E2E 脚本异常:", err);
    process.exitCode = 1;
});
