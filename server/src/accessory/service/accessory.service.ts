import * as fs from "fs";
import * as mime from "mime-types";
import * as path from "path";
import * as sharpModule from "sharp";
import type { Sharp } from "sharp";

import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { createReadStream } from "fs";
import { Connection, Types, mongo } from "mongoose";
import { pipeline } from "stream/promises";
import { accessoryUploadPath } from "../domain/accessory.constants";
import { AccessoryDto } from "../domain/accessory.dto";
import { AccessoryMetaDto } from "../domain/accessory.meta.dto";

type SharpFactory = (input?: Buffer) => Sharp;
const sharp = ((sharpModule as unknown as { default?: SharpFactory }).default ?? sharpModule) as SharpFactory;

@Injectable()
export class AccessoryService {
    constructor(@InjectConnection() connection: Connection) {
        this.bucket = new mongo.GridFSBucket(connection.db, { bucketName: "accessory" });
    }

    private readonly bucket: mongo.GridFSBucket;
    private readonly maxFileSizeM = 10;

    /**
     *
     * @param file 获取文件的mime类型
     * @returns
     */
    getFileMime(file: string): string {
        return mime.lookup(file);
    }

    /**
     * 批量上传
     * @param hostType
     * @param hostId
     * @param items
     */
    async batchUpload(hostType: string, hostId: string, items: AccessoryDto[]): Promise<AccessoryDto[]> {
        const ret: AccessoryDto[] = [];
        for (const iterator of items) {
            const item = await this.upload(hostType, hostId, iterator);
            ret.push(item);
        }
        return ret;
    }

    /**
     * 上传一个附件
     * @param data
     */
    async upload(hostType: string, hostId: string, data: AccessoryDto): Promise<AccessoryDto> {
        const acc = new AccessoryDto();
        acc.aid = new Types.ObjectId().toString();
        acc.filename = data.filename;
        const localPath = path.join(accessoryUploadPath, data.aid);
        const size = await this.getFileSize(localPath);
        if (size > this.maxFileSizeM * 1024 ** 2) {
            throw new Error(`文件大小超过限制: ${this.maxFileSizeM}M`);
        }
        const metadata = AccessoryMetaDto.create(hostType, hostId, data);
        // create thumbnail
        if (metadata.mime.includes("image")) {
            const thumbnail = await this.getThumbnail(localPath);
            acc.thumbnail = thumbnail.toString("base64");
        } else {
            acc.thumbnail = "";
        }
        await pipeline(
            createReadStream(localPath),
            this.bucket.openUploadStream(acc.aid, {
                chunkSizeBytes: 1048576,
                metadata,
            }),
        );
        return acc;
    }

    /**
     * 下载一个附件
     * @param approval
     * @param filename
     * @returns
     */
    public download(name: string): mongo.GridFSBucketReadStream {
        const stream = this.bucket.openDownloadStreamByName(name);
        return stream;
    }

    /**
     * 获取meta信息
     * @param filename
     * @returns
     */
    async getMeta(filename: string): Promise<AccessoryMetaDto> {
        const cursor = this.bucket.find({ filename });
        for await (const doc of cursor) {
            return doc.metadata as AccessoryMetaDto;
        }
        throw new Error(`找不到附件 (${filename})`);
    }

    private async getFileSize(filepath: string): Promise<number> {
        const stat = await new Promise<fs.Stats>((resolve, reject) => {
            fs.stat(filepath, (err, stat) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stat);
                }
            });
        });
        return stat.size;
    }

    private async getThumbnail(filepath: string): Promise<Buffer> {
        const filebuf = await this.getFileBuff(filepath);
        const buf = await sharp(filebuf).resize(64, 64).toBuffer();
        return buf;
    }

    public async getFileBuff(filepath: string): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            fs.readFile(filepath, (err, data) => {
                if (err) {
                    logger.error("getFileBuff failed: ", err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }
}

const logger = new Logger(AccessoryService.name);
