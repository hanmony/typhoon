import { TyphoonDutyDto } from "./../domain/typhoon.duty.dto";
import { Injectable, Logger } from "@nestjs/common";
import { RepoService } from "src/database/service/repo/repo.service";
import { TyphoonCommandDocument } from "src/database/entity/typhoon.command.schema";

/** 值班天数：指挥开启当日 + 后 4 天 */
const DUTY_DAYS = 5;

/** 默认部门列表（按展示顺序） */
const DEFAULT_DEPARTMENTS = [
    "集团领导",
    "指挥中心",
    "运一公司",
    "运二公司",
    "运三公司",
    "运四公司",
    "磁浮公司",
    "申凯公司",
    "市域公司",
    "维保公司",
    "维保车辆",
    "维保通号",
    "维保工务",
    "维保供电",
    "维保后勤",
];

@Injectable()
export class TyphoonDutyService {
    constructor(private readonly repo: RepoService) {}

    private async getCurrentCommand(): Promise<TyphoonCommandDocument> {
        return await this.repo.typhoonCommands.findOne({ status: 0 }, {}, { createTime: -1 }).exec();
    }

    /** 指挥开启当日 + 后 4 天的日期列表（YYYY-MM-DD） */
    private getDates(command: TyphoonCommandDocument): string[] {
        const start = new Date(command.startTime);
        return Array.from({ length: DUTY_DAYS }, (_, i) => {
            const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
            const month = `${d.getMonth() + 1}`.padStart(2, "0");
            const day = `${d.getDate()}`.padStart(2, "0");
            return `${d.getFullYear()}-${month}-${day}`;
        });
    }

    private departmentIndex(department: string): number {
        const idx = DEFAULT_DEPARTMENTS.indexOf(department);
        return idx === -1 ? DEFAULT_DEPARTMENTS.length : idx;
    }

    /** 当前指挥无值班数据时，按默认部门初始化 5 天（值班人留空） */
    private async ensureData(command: TyphoonCommandDocument) {
        const commandId = command._id.toString();
        const count = await this.repo.typhoonDuty.countDocuments({ commandId }).exec();
        if (count > 0) return;
        const dates = this.getDates(command);
        await this.repo.typhoonDuty.insertMany(
            dates.flatMap(date =>
                DEFAULT_DEPARTMENTS.map(department => ({ commandId, date, department, responsible: "" })),
            ),
        );
    }

    async list(): Promise<TyphoonDutyDto[]> {
        const command = await this.getCurrentCommand();
        if (!command) return [];
        await this.ensureData(command);
        const list = await this.repo.typhoonDuty.find({ commandId: command._id.toString() }).exec();
        return list
            .sort(
                (a, b) =>
                    a.date.localeCompare(b.date) ||
                    this.departmentIndex(a.department) - this.departmentIndex(b.department),
            )
            .map(u => TyphoonDutyDto.fromDoc(u));
    }

    /** 5 天全量覆盖式更新，仅作用于当前指挥 */
    async updateAll(data: TyphoonDutyDto[]) {
        const command = await this.getCurrentCommand();
        if (!command) return;
        const commandId = command._id.toString();
        await this.repo.typhoonDuty.deleteMany({ commandId });
        if (data.length > 0) {
            await this.repo.typhoonDuty.insertMany(
                data.map(u => ({
                    commandId,
                    date: u.date,
                    department: u.department,
                    responsible: u.responsible,
                })),
            );
        }
    }
}

export const logger = new Logger("TyphoonDutyService");
