import { Injectable, StreamableFile } from "@nestjs/common";
import { join } from "path";
import { ShpDo } from "src/caseman/domain/do/shp.do";
import { ShpListDto } from "src/caseman/domain/dto/shp.list.dto";
import { ShpSearchDto } from "src/caseman/domain/dto/shp.search.dto";
import { RepoService } from "src/database/service/repo/repo.service";
import { Failed } from "src/diagnostics/lib/failed";
import { createReadStream, existsSync } from "fs";
import * as fs from "fs";
import { ShpDto } from "src/caseman/domain/dto/shp.dto";

@Injectable()
export class ShpService {
    constructor(private readonly repo: RepoService) {}

    private readonly uploadDir = join(process.cwd(), "upload", "shp");

    async list(loginStaffId, filter: ShpSearchDto): Promise<ShpListDto> {
        const $and: any[] = [];
        if (filter.name) {
            $and.push({ name: { $regex: filter.name } });
        }
        if (filter.url) {
            $and.push({ url: { $regex: filter.url } });
        }
        if (filter.period‌) {
            $and.push({
                createdAt: {
                    $gte: new Date(filter.period‌[0]),
                    $lte: new Date(filter.period‌[1]),
                },
            });
        }
        const query: any = {};
        if ($and.length > 0) {
            query.$and = $and;
        }
        const list = await this.repo.shp
            .find(query)
            .sort({ createdAt: -1 })
            .skip((filter.page - 1) * filter.pageSize)
            .limit(filter.pageSize)
            .exec();
        const ret = new ShpListDto();
        ret.list = list.map(e => new ShpDo(e).dto());
        ret.total = await this.repo.shp.countDocuments(query);
        return ret;
    }

    async importShp(file: Express.Multer.File): Promise<ShpDto> {
        const shpDoc = new this.repo.shp();
        shpDoc.name = file.filename;
        shpDoc.url = file.mimetype;
        shpDoc.status = 0;
        shpDoc.createdAt = new Date();
        shpDoc.updatedAt = new Date();
        await shpDoc.save();
        return new ShpDo(shpDoc).dto();
    }

    /**
     * 下载一个附件
     * @param filename
     * @returns
     */
    public async downloadShpFile(filename: string): Promise<StreamableFile> {
        filename = decodeURI(filename);
        // 构造文件完整路径
        const filePath = join(this.uploadDir, filename);
        // 检查文件是否存在
        if (!existsSync(filePath)) {
            Failed.throw("文件不存在");
        }
        // 创建文件读取流
        const stream = createReadStream(filePath);
        // 获取文件状态（用于文件大小等信息）
        const stats = fs.statSync(filePath);
        return new StreamableFile(stream, {
            disposition: `attachment; filename="${encodeURI(filename)}"`,
            length: stats.size,
        });
    }

    async remove(id: string) {
        await this.repo.shp.deleteOne({ _id: id }).exec();
    }
}
