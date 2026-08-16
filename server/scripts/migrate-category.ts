/**
 * 迁移脚本：为已有的知识库文档补写 category 字段
 * 运行方式: npx ts-node scripts/migrate-category.ts
 *
 * 1. MongoDB: 为没有 category 字段的文档设置默认值 "other"
 * 2. Qdrant: 为没有 category 的向量点补写 payload
 */

import { MongoClient } from "mongodb";
import { QdrantClient } from "@qdrant/js-client-rest";

const MONGO_URI = process.env.MONGO_URI || "mongodb://192.168.0.164:27017/typhoon";
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const COLLECTION = process.env.QDRANT_COLLECTION_NAME || "knowledge_base";

async function main() {
    // 1. MongoDB migration
    const mongo = new MongoClient(MONGO_URI);
    await mongo.connect();
    const db = mongo.db();
    const docs = db.collection("kbdocuments");

    const result = await docs.updateMany({ category: { $exists: false } }, { $set: { category: "other" } });
    console.log(`MongoDB: updated ${result.modifiedCount} documents with category="other"`);

    // Get all document IDs with their categories
    const allDocs = await docs.find({}, { projection: { _id: 1, category: 1 } }).toArray();
    const docCategoryMap = new Map(allDocs.map(d => [d._id.toString(), d.category || "other"]));

    await mongo.close();

    // 2. Qdrant migration
    const qdrant = new QdrantClient({ url: QDRANT_URL });

    // Check collection exists
    try {
        await qdrant.getCollection(COLLECTION);
    } catch {
        console.log("Qdrant collection not found, skipping Qdrant migration");
        return;
    }

    // Scroll through all points, update those without category
    let offset: string | undefined;
    let updatedCount = 0;

    while (true) {
        const result = await qdrant.scroll(COLLECTION, {
            limit: 100,
            offset,
            with_payload: true,
        });

        for (const point of result.points) {
            const payload = point.payload || {};
            if (!payload.category) {
                const docId = payload.documentId as string;
                const category = docCategoryMap.get(docId) || "other";
                await qdrant.setPayload(COLLECTION, {
                    filter: {
                        must: [{ key: "id", match: { value: point.id } }],
                    },
                    payload: { category },
                });
                updatedCount++;
            }
        }

        if (!result.next_page_offset) break;
        offset = result.next_page_offset as string;
    }

    console.log(`Qdrant: updated ${updatedCount} points with category="other"`);
    console.log("Migration complete!");
}

main().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
