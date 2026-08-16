import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { X5Service } from "src/x5/service/x5/x5.service";
import { RoleType } from "src/security/domain/role.type";
import { RepoService } from "src/database/service/repo/repo.service";

@Injectable()
export class X5Strategy extends PassportStrategy(Strategy, "x5") {
    constructor(
        private readonly repo: RepoService,
        private readonly x5: X5Service,
    ) {
        super({ usernameField: "params", passwordField: "params" });
    }

    // validate return user id if succ
    async validate(info: string): Promise<{ id: string; name: string; roles: string[] }> {
        const data = await this.x5.decodeUserInfo(info);
        if (!data || !data.timestamp) {
            logger.error("invalid x5 info: ", info);
            throw new UnauthorizedException("登录失败");
        }
        const timestamp = Math.floor(Date.now());
        // 30 min timeout
        // if (Math.abs(timestamp - data.timestamp) > 1000 * 60 * 30) {
        //     logger.error("x5 info timestamp expired: ", data);
        //     throw new UnauthorizedException();
        // }

        if (!data.userCode) {
            logger.error("no userCode in x5 info: ", data);
            throw new UnauthorizedException();
        }

        let user = await this.repo.staffs.findOne({ username: data.userCode });
        if (!user) {
            // new user
            const newUser = new this.repo.staffs();
            newUser.username = data.userCode;
            newUser.nickname = data.userName;
            newUser.department = data.deptName;
            newUser.roles = [RoleType.user];
            newUser.status = 0;
            newUser.password = "";
            await newUser.save();
            logger.log("new user add", data.userCode);
            user = newUser;
        }
        return { id: user.username, name: user.nickname, roles: user.roles };
    }
}

const logger = new Logger("X5Strategy");
