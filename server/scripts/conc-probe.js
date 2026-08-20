/** conc-probe.js — 并发失败原因定位（阶段 F） */
const BASE = process.env.M5_BASE_URL || "http://127.0.0.1:12080/api";

async function login() {
    const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "m2test", password: "M2test123!" }),
    });
    const j = await res.json();
    return j.token;
}

async function one(token, i, level) {
    const t0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
        const res = await fetch(`${BASE}/chat/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ question: "台风天坐地铁通勤有什么需要注意的？", from: "cocc" }),
            signal: ctrl.signal,
        });
        if (res.status !== 201) {
            const t = await res.text();
            return { i, level, status: res.status, ms: Date.now() - t0, body: t.slice(0, 300) };
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let text = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            text += dec.decode(value, { stream: true });
        }
        const hasDone = text.includes("[DONE]");
        const hasErr = text.includes('"error"') || text.includes('"message"');
        return { i, level, status: res.status, ms: Date.now() - t0, ok: hasDone, hasErr, tail: text.slice(-200) };
    } catch (e) {
        return { i, level, err: e.name + ":" + e.message, ms: Date.now() - t0 };
    } finally {
        clearTimeout(timer);
    }
}

async function main() {
    const token = await login();
    console.log("登录 OK");
    for (const level of [3, 5, 5]) {
        console.log(`\n=== 并发 ${level} ===`);
        const rs = await Promise.all(Array.from({ length: level }, (_, i) => one(token, i, level)));
        for (const r of rs) console.log(JSON.stringify(r));
        const ok = rs.filter(r => r.ok).length;
        console.log(`成功率: ${ok}/${level}`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
