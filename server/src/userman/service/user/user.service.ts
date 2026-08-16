import { Injectable, Logger } from "@nestjs/common";
import { compare } from "bcryptjs";
import { sm3, sm4Decrypt } from "src/common/lib/crypto.helper";
import { isNullOrEmpty } from "src/common/lib/string.helper";
import { ExcelService } from "src/common/service/excel/excel.service";
import { RepoService } from "src/database/service/repo/repo.service";
import { Failed } from "src/diagnostics/lib/failed";
import { RoleType } from "src/security/domain/role.type";
import { AuthService } from "src/security/service/auth/auth.service";
import { ChangePasswordDto } from "src/userman/domain/change.password.dto";
import { CreateUserDto } from "src/userman/domain/create.user.dto";
import { EncryptionParamDto } from "src/userman/domain/encryption.param.dto";
import { UserDataDto } from "src/userman/domain/user.data.dto";
import { UserSearchDto } from "src/userman/domain/user.search.dto";
import { UsernameDto } from "src/userman/domain/username.dto";
import * as crypto from "crypto";
import validator from "validator";
import { StaffDocument } from "src/database/entity/staff.schema";

@Injectable()
export class UserService {
    constructor(
        private readonly repo: RepoService,
        private auth: AuthService,
        private excels: ExcelService,
    ) {}

    userEncryptionParamMap = new Map<string, EncryptionParamDto>();

    passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^]{8,16}$/;

    /**
     * 获取所有正常状态的用户
     * @returns
     */
    async getAll(): Promise<UserDataDto[]> {
        const users = await this.repo.staffs.find({ status: 0, roles: { $nin: [RoleType.admin] } });
        return users.map(u => UserDataDto.fromDoc(u));
    }

    /**
     * 获取所有正常状态的用户
     * @returns
     */
    async getList(query: UserSearchDto): Promise<UserDataDto[]> {
        const $and: any[] = [];
        $and.push({ roles: { $nin: [RoleType.admin] } });
        if (query.id) {
            $and.push({ username: { $regex: query.id } });
        }
        if (query.name) {
            $and.push({ nickname: { $regex: query.name } });
        }
        if (query.role) {
            $and.push({ roles: { $in: query.role } });
        }
        if (query.department) {
            $and.push({ department: { $regex: query.department } });
        }
        if (query.line) {
            $and.push({ line: query.line });
        }
        const searchQuery: any = { $and };
        let sortQuery = {};
        if (query.sortPath != "") {
        } else {
            sortQuery = { _id: -1 };
        }
        const users = await this.repo.staffs
            .find(searchQuery)
            .sort(sortQuery)
            // .skip((query.page - 1) * query.pageSize)
            // .limit(query.pageSize)
            .exec();
        return users.map(u => UserDataDto.fromDoc(u));
    }

    /**
     * 创建用户
     * @param data
     * @returns
     */
    async create(data: CreateUserDto): Promise<UserDataDto> {
        const old = await this.repo.staffs.exists({ username: data.username }).exec();
        Failed.check(!old, "用户名已存在");
        const user = new this.repo.staffs();
        user.username = data.username;
        user.nickname = data.nickname;
        user.department = data.department;
        user.job = data.job;
        user.line = data.line;
        user.password = ""; //tf+工号后六位
        user.roles = data.roles.filter(i => i != RoleType.admin); // 不允许创建admin用户
        user.status = 0;
        await user.save();
        return {
            id: user.id,
            name: user.username,
            roles: user.roles,
            department: user.department,
            job: user.job,
            line: user.line,
        };
    }

    /**
     * 从excel导入用户
     * @param file
     */
    async importFromExcel(file: string) {
        const excel = this.excels.open(file);
        const users: CreateUserDto[] = [];
        const userList = await this.repo.staffs.find().exec();
        const userIds = userList.map(i => i.username);
        const userMap = new Map<string, StaffDocument>();
        userList.map(i => {
            userMap.set(i.username, i);
        });
        const excelUsers = [];
        const maxPage = excel.getSheetNames().length;
        for (let page = 0; page < maxPage; page++) {
            excel.use(page, { keyRow: 0 });
            const department = excel.getSheetNames()[page];
            while (excel.next()) {
                const user = new CreateUserDto();
                excel.parseTo(user);
                if (!user.username && !user.usernameTwo) {
                    continue;
                }
                if (user.username && user.username.length === 10) {
                    user.username = "0" + user.username;
                }
                if (user.usernameTwo) {
                    user.username = user.usernameTwo;
                }
                if (user.nicknameTwo) {
                    user.nickname = user.nicknameTwo;
                }
                let password = "";
                if (user.username == "01020005102") {
                    user.roles = [RoleType.manager];
                } else {
                    password = await this.auth.getPasswordHash(sm3("st2025"));
                    if (user.role == "occ管理") {
                        user.roles = [RoleType.OCC管理员];
                    } else if (user.role == "cocc管理") {
                        user.roles = [RoleType.COCC管理员];
                    } else if (user.role == "应急指挥员") {
                        user.roles = [RoleType.应急指挥员];
                    } else if (user.role == "集团管理员") {
                        user.roles = [RoleType.集团管理员];
                    } else {
                        user.roles = [RoleType.user];
                        password = "";
                    }
                }
                user.department = department;
                user.status = 0;
                user.password = password;
                if (user.username && !userIds.includes(user.username)) {
                    if (!excelUsers[user.username] || excelUsers[user.username] != user.nickname) {
                        excelUsers[user.username] = user.nickname;
                        users.push(user);
                    }
                } else {
                    const userInfo = userMap.get(user.username);
                    userInfo.password = password;
                    await userInfo.save();
                }
            }
        }
        if (users.length > 0) {
            Logger.log(`导入 ${users.length} 个用户`);
            await this.repo.staffs.insertMany(users);
        }
    }

    /**
     * 删除用户
     * @param data
     * @returns
     */
    async remove(data: UsernameDto): Promise<boolean> {
        const old = await this.repo.staffs.findOne({ username: data.username }).exec();
        Failed.check(old, "用户名不存在" + data.username);
        Failed.check(data.username !== "admin", "admin用户不允许删除");
        await old.deleteOne();
        return true;
    }

    /**
     * 修改密码
     * @param data
     */
    async changePassword(user: UserDataDto, data: ChangePasswordDto): Promise<boolean> {
        const staff = await this.repo.staffs.findOne({ username: user.id });
        Failed.check(staff, "找不到用户 " + user.id);
        const result = await compare(data.oldPassword, staff.password);
        Failed.check(result, "旧密码错误");
        const userEncryptionParam = this.userEncryptionParamMap.get(user.id);
        Failed.check(userEncryptionParam, "页面已失效，请重新打开");
        this.userEncryptionParamMap.delete(user.id);
        const newPassword = sm4Decrypt(data.newPassword, userEncryptionParam.key, userEncryptionParam.iv);
        Failed.check(this.passwordPattern.test(newPassword), "密码8~16位, 需要包含数字和大小写字母!");
        staff.password = await this.auth.getPasswordHash(sm3(newPassword));
        await staff.save();
        return true;
    }

    async fetchEncryptionParam(user: UserDataDto) {
        const key = crypto.randomBytes(16).toString("hex"); // 16字节 = 128位
        const iv = crypto.randomBytes(16).toString("hex");
        const dto = new EncryptionParamDto();
        dto.key = key;
        dto.iv = iv;
        this.userEncryptionParamMap.set(user.id, dto);
        return dto;
    }

    /**
     * 设置初始密码
     * @param data
     */
    async initPassword(user: UserDataDto, data: ChangePasswordDto): Promise<boolean> {
        const staff = await this.repo.staffs.findOne({ username: user.id });
        Failed.check(staff, "找不到用户 " + user.id);
        Failed.check(isNullOrEmpty(staff.password), "用户已经设置过密码");
        const userEncryptionParam = this.userEncryptionParamMap.get(user.id);
        Failed.check(userEncryptionParam, "页面已失效，请重新打开");
        this.userEncryptionParamMap.delete(user.id);
        const newPassword = sm4Decrypt(data.newPassword, userEncryptionParam.key, userEncryptionParam.iv);
        Failed.check(this.passwordPattern.test(newPassword), "密码8~16位, 需要包含数字和大小写字母!");
        staff.password = await this.auth.getPasswordHash(sm3(newPassword));
        await staff.save();
        return true;
    }

    /**
     * 重置为初始密码
     * @param data
     */
    async resetPassword(data: UsernameDto): Promise<boolean> {
        const staff = await this.repo.staffs.findOne({ username: data.username });
        Failed.check(staff, "找不到用户 " + data.username);
        staff.password = "";
        await staff.save();
        return true;
    }

    /**
     * 设置用户权限
     * @param username
     * @param roles
     */
    async setRoles(author: UserDataDto, username: string, roles: RoleType[]) {
        Failed.check(author, "没有权限");
        const staff = await this.repo.staffs.findOne({ username });
        Failed.check(staff, "找不到用户 " + username);
        if (staff.roles.includes(RoleType.admin)) {
            Failed.throw("不能修改超管的权限");
        }
        staff.roles = roles;
        await staff.save();
    }
}
