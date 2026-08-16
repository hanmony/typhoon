import { Injectable, StreamableFile } from "@nestjs/common";
import { createReadStream } from "fs";
import { ClientSession, Types, mongo } from "mongoose";
import { CaseDocMeta } from "src/caseman/domain/case.doc.meta";
import { ActionAccessoryEntity } from "src/database/entity/action.schema";
import { CaseDocument, CaseStatus } from "src/database/entity/case.schema";
import { RepoService } from "src/database/service/repo/repo.service";
import { Failed } from "src/diagnostics/lib/failed";
import { pipeline } from "stream/promises";

@Injectable()
export class CaseEditorService {
    constructor(private readonly repo: RepoService) {
        this.bucket = new mongo.GridFSBucket(repo.connection.db, { bucketName: "doc" });
    }

    private readonly bucket: mongo.GridFSBucket;

    async deactiveCase(id: string): Promise<CaseDocument> {
        const doc = await this.repo.cases.findOne({ _id: id });
        Failed.check(doc, "找不到案例 " + id);
        Failed.check(doc.status == CaseStatus.normal, "案例当前不在上架状态");
        doc.status = CaseStatus.approving;
        await doc.save();
        return doc;
    }

    async activeCase(id: string): Promise<CaseDocument> {
        const doc = await this.repo.cases.findOne({ _id: id });
        Failed.check(doc, "找不到要上架的案例 " + id);
        Failed.check(doc.status == CaseStatus.approving, "案例当前不在待发布状态");
        doc.status = CaseStatus.normal;
        await this.repo.connection.transaction(async session => {
            // 删除任何同名的其他案例
            await this.repo.cases.updateMany(
                { name: doc.name, _id: { $ne: doc._id } },
                { $set: { status: CaseStatus.deleted } },
                { session },
            );
            const olds = await this.repo.cases.find({ name: doc.name, _id: { $ne: doc._id } }, {}, { session });
            for (const item of olds) {
                await this.deleteCase(item.id, true, session);
            }
            await doc.save({ session });
        });
        return doc;
    }

    async deleteCase(id: string, force: boolean, session?: ClientSession): Promise<void> {
        const doc = await this.repo.cases.findOne({ _id: id });
        Failed.check(doc, "找不到要删除的案例 " + id);
        if (!force) {
            Failed.check(doc.status != CaseStatus.normal, "已上架的案例不能删除，请先下架案例");
        }
        const fun = async (session: ClientSession) => {
            await doc.deleteOne({ session });
            await this.repo.actions.deleteMany({ caseId: id }, { session });

            const files = await this.bucket.find({ "metadata.caseId": id }).toArray();
            for (const item of files) {
                await this.bucket.delete(item._id);
            }
        };
        if (session) {
            await fun(session);
        } else {
            await this.repo.connection.transaction(async session => {
                await fun(session);
            });
        }
    }

    async startEdit(id: string): Promise<CaseDocument> {
        const doc = await this.repo.cases.findOne({ _id: id });
        Failed.check(doc, "找不到要编辑的案例 " + id);
        const now = await this.repo.cases.findOne({
            name: doc.name,
            status: { $in: [CaseStatus.editing, CaseStatus.approving] },
        });
        if (now) {
            if (now.status != CaseStatus.editing) {
                now.status = CaseStatus.editing;
                await now.save();
            }
            return now;
        }
        const newDoc = await this.copy(doc);
        return newDoc;
    }

    async finishEdit(id: string): Promise<CaseDocument> {
        const doc = await this.repo.cases.findOne({ _id: id });
        Failed.check(doc, "找不到要编辑的案例 " + id);
        Failed.check(doc.status == CaseStatus.editing, "案例当前不在编辑状态");
        doc.status = CaseStatus.approving;
        await doc.save();
        return doc;
    }

    async updateConfigProperty(caseId: string, property: string, value: unknown): Promise<void> {
        Failed.check(property, "property is required");
        Failed.check(property != "台风命名", "不能修改案例名称");
        const doc = await this.repo.cases.findOne({ _id: caseId });
        Failed.check(doc, `case (${caseId}) not found`);
        Failed.check(doc.status == CaseStatus.editing, "案例当前不在编辑状态");
        const valueItem = doc.values.get(property);
        Failed.check(valueItem, `property (${property}) not found`);
        valueItem.value = String(value);
        doc.markModified("values");
        await doc.save();
    }

    async updateActionProperty(eventId: string, property: string, value: unknown): Promise<void> {
        const doc = await this.repo.actions.findOne({ _id: eventId });
        Failed.check(doc, `case (${eventId}) not found`);
        if (property == "fromDate" || property == "toDate") {
            doc[property] = new Date(String(value));
        } else {
            doc.items[property] = String(value);
            doc.markModified("items");
        }

        await doc.save();
    }

    async getDocMetas(caseId: string): Promise<CaseDocMeta[]> {
        const doc = await this.repo.cases.findOne({ _id: caseId });
        Failed.check(doc, "案例不存在");
        const files = await this.bucket
            .find({ "metadata.caseId": caseId, "metadata.docType": { $ne: "accessory" } })
            .toArray();
        return files.map(i => i.metadata as CaseDocMeta);
    }

    async getDocMeta(caseId: string, filename: string): Promise<CaseDocMeta> {
        const name = `${caseId}/doc/${filename}`;
        const file = await this.bucket.find({ filename: name }).toArray();
        Failed.check(file.length > 0, "文件不存在");
        return file[0].metadata as CaseDocMeta;
    }

    async uploadDoc(caseId: string, file: Express.Multer.File) {
        const doc = await this.repo.cases.findOne({ _id: caseId });
        Failed.check(doc, "案例不存在");

        const localPath = file.path;
        const metadata = CaseDocMeta.create(caseId, file.originalname, false);
        const filename = `${caseId}/doc/${file.originalname}`;

        await pipeline(
            createReadStream(localPath),
            this.bucket.openUploadStream(filename, {
                // chunkSizeBytes: 1048576,
                metadata,
            }),
        );
    }

    /**
     * 删除文档
     * @param caseId
     * @param filename
     */
    async deleteDoc(caseId: string, filename: string) {
        filename = `${caseId}/doc/${filename}`;
        const files = await this.bucket.find({ filename }).toArray();
        for (const item of files) {
            await this.bucket.delete(item._id);
        }
    }

    /**
     * 下载一个附件
     * @param approval
     * @param caseId
     * @param filename
     * @returns
     */
    public async downloadDoc(caseId: string, filename: string): Promise<StreamableFile> {
        const name = `${caseId}/doc/${filename}`;
        const meta = await this.getDocMeta(caseId, filename);
        const stream = this.bucket.openDownloadStreamByName(name);
        return new StreamableFile(stream, {
            disposition: `attachment; filename="${encodeURI(meta.filename)}"`,
            // length: meta.size,
        });
    }
    /**
     * 上传附件
     * @param caseId
     * @param actionId
     * @param file
     */
    public async uploadAccessory(
        caseId: string,
        actionId: string,
        file: Express.Multer.File,
    ): Promise<ActionAccessoryEntity[]> {
        const doc = await this.repo.cases.findOne({ _id: caseId });
        Failed.check(doc, "案例不存在");
        const action = await this.repo.actions.findOne({ _id: actionId });
        Failed.check(action, `事件${actionId}不存在`);

        const localPath = file.path;
        const filename = new Types.ObjectId().toString();
        const metadata = CaseDocMeta.create(caseId, file.originalname, true);

        await pipeline(
            createReadStream(localPath),
            this.bucket.openUploadStream(filename, {
                chunkSizeBytes: 1048576,
                metadata,
            }),
        );

        const accessory = new ActionAccessoryEntity();
        accessory.filename = filename;
        accessory.originName = file.originalname;
        accessory.contentType = file.mimetype;

        action.accessories.push(accessory);
        action.markModified("accessories");
        await action.save();
        return action.accessories;
    }

    /**
     * 下载一个附件
     * @param filename
     * @returns
     */
    public async downloadAccessory(filename: string): Promise<StreamableFile> {
        const items = await this.bucket.find({ filename }).toArray();
        Failed.check(items.length > 0, "文件不存在");
        const originName = items[0].metadata.filename;
        const stream = this.bucket.openDownloadStreamByName(filename);
        return new StreamableFile(stream, {
            disposition: `attachment; filename="${encodeURI(originName)}"`,
            length: items[0].length,
        });
    }

    /**
     * 删除附件
     * @param action
     * @param filename
     */
    public async deleteAccessory(action: string, filename: string) {
        const act = await this.repo.actions.findOne({ _id: action });
        Failed.check(act, "事件不存在");
        const items = await this.bucket.find({ filename }).toArray();
        for (const item of items) {
            await this.bucket.delete(item._id);
        }
        act.accessories = act.accessories.filter(i => i.filename != filename);
        act.markModified("accessories");
        await act.save();
        return act.accessories;
    }

    private async copy(doc: CaseDocument): Promise<CaseDocument> {
        let retDoc: CaseDocument;
        await this.repo.connection.transaction(async session => {
            const obj = doc.toObject();
            obj._id = undefined;
            obj.status = CaseStatus.editing;
            retDoc = new this.repo.cases(obj);
            await retDoc.save({ session });

            const events = await this.repo.actions.find({ caseId: doc.id });
            const newEvents = [];
            for (const item of events) {
                const evt = item.toObject();
                evt._id = undefined;
                evt.caseId = retDoc.id;
                newEvents.push(new this.repo.actions(evt));
            }
            await this.repo.actions.create(newEvents, { session });
        });
        return retDoc;
    }
}
