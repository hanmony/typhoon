/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Replays the Phase E 50-question KB set against the hybrid retriever without
 * calling an embedding API. Semantic candidates come from the frozen v2.1 run;
 * lexical candidates come from the current MongoDB snapshot.
 */
const fs = require("fs");
const path = require("path");
require("ts-node/register");
require("tsconfig-paths/register");
const mongoose = require("mongoose");
const { RagService } = require("../../src/knowledge-base/service/rag.service");

function loadDatabaseUri() {
    if (process.env.DATABASE_URI) return process.env.DATABASE_URI;
    const envPath = path.join(__dirname, "../../.env");
    if (!fs.existsSync(envPath)) throw new Error("DATABASE_URI is not set and server/.env does not exist");
    const line = fs
        .readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .find(item => /^\s*DATABASE_URI\s*=/.test(item));
    if (!line) throw new Error("DATABASE_URI is not configured");
    return line.split("=").slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
}

function matchesGold(result, gold) {
    const source = gold.expectedSources || {};
    return result.documentName === source.doc && Number(result.chunkIndex) === Number(source.chunk);
}

async function main() {
    const gold = fs
        .readFileSync(path.join(__dirname, "gold-set.v2.jsonl"), "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .filter(item => item.category === "kb");
    const frozen = require("./results/phase-e-raw-v21.json").results;
    const semanticByQuestion = new Map();
    for (const item of frozen) {
        if (item.category !== "kb" || item.iter !== 1 || !item.kb?.top) continue;
        semanticByQuestion.set(
            Number(item.qid),
            item.kb.top.map((source, index) => ({
                id: `frozen-${item.qid}-${index}`,
                score: Number(source.score || 0),
                content: "",
                documentId: `frozen:${source.documentName}`,
                documentName: source.documentName,
                chunkIndex: Number(source.chunkIndex),
            })),
        );
    }

    const connection = await mongoose.createConnection(loadDatabaseUri()).asPromise();
    const docs = connection.model("HybridCheckDocument", new mongoose.Schema({}, { strict: false }), "kbdocuments");
    const chunks = connection.model("HybridCheckChunk", new mongoose.Schema({}, { strict: false }), "kbchunks");
    const docRows = await docs.find({ status: 3 }).exec();
    const documentIdByName = new Map(docRows.map(item => [item.name, item._id.toString()]));
    for (const sources of semanticByQuestion.values()) {
        for (const source of sources) source.documentId = documentIdByName.get(source.documentName) || source.documentId;
    }
    const repo = { kbDocuments: docs, kbChunks: chunks };
    const embedding = { embedQuery: async () => [0] };
    let currentQuestionId = 0;
    const qdrant = { search: async () => semanticByQuestion.get(currentQuestionId) || [] };
    const service = new RagService(embedding, qdrant, {}, repo);

    const failures = [];
    const durations = [];
    for (const question of gold) {
        currentQuestionId = Number(question.id);
        const startedAt = Date.now();
        const results = await service.retrieve(question.question, 5);
        durations.push(Date.now() - startedAt);
        if (!results.some(result => matchesGold(result, question))) {
            failures.push({
                id: question.id,
                expected: question.expectedSources,
                top: results.map(result => ({ documentName: result.documentName, chunkIndex: result.chunkIndex })),
            });
        }
    }
    await connection.close();

    const hit = gold.length - failures.length;
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95 = sortedDurations[Math.max(0, Math.ceil(sortedDurations.length * 0.95) - 1)];
    console.log(`Hybrid KB Hit@5: ${hit}/${gold.length} = ${(hit / gold.length).toFixed(3)}`);
    console.log(
        `Hybrid retrieval timing: avg=${(durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1)}ms p95=${p95}ms (includes first cache load)`,
    );
    if (failures.length) console.log(JSON.stringify(failures, null, 2));
    process.exitCode = hit / gold.length >= 0.9 ? 0 : 1;
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
