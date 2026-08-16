import { Prop, Schema } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class StaffEntity {
    // 用户名
    @Prop({ unique: true })
    username: string;
    // 密码
    @Prop()
    password: string;
    // 密码错误次数，超过5次，就锁定账号
    @Prop()
    passwordError: number;
    // 角色
    @Prop()
    roles: string[] = [];
    // 显示名字
    @Prop({ index: true })
    nickname: string;
    // 状态, 0: 在职, 1: 禁用(锁定), -1: 删除（离职）
    @Prop({ type: Number })
    status = 0;
    //部门
    @Prop()
    department: string;
    //岗位
    @Prop()
    job: string;
    //线路
    @Prop()
    line: string;
}

export type StaffDocument = StaffEntity & Document<unknown, unknown, StaffEntity>;
