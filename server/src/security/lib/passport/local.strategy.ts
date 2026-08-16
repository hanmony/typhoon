import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { compare } from "bcryptjs";
import { Strategy } from "passport-local";
import { isEmpty } from "lodash";
import { StaffDocument } from "src/database/entity/staff.schema";
import { RepoService } from "src/database/service/repo/repo.service";
import { AuthService } from "../../service/auth/auth.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly repo: RepoService,
        private readonly auth: AuthService,
    ) {
        super();
    }

    // validate return user id if succ
    async validate(
        username: string,
        password: string,
    ): Promise<{ id: string; name: string; roles: string[]; department: string }> {
        const user = await this.repo.staffs.findOne({ username });
        if (!user) {
            logger.error(`${username} not found in database`);
            throw new HttpException("用户名或密码错误", HttpStatus.BAD_REQUEST);
        }
        if (user.status != 0) {
            logger.error(`${username} has been locked`);
            throw new HttpException("此账号已经被锁定，请联系管理员解锁", HttpStatus.BAD_REQUEST);
        }

        if (isEmpty(user.password)) {
            if (password != this.auth.getDefaultPassword(user.username)) {
                return this.passwordFailed(user);
            }
        } else {
            const result = await compare(password, user.password);
            if (!result) {
                return this.passwordFailed(user);
            }
        }

        user.passwordError = 0;
        await user.save();
        return { id: user.username, name: user.nickname, roles: user.roles, department: user.department };
    }

    private async passwordFailed(user: StaffDocument): Promise<never> {
        user.passwordError = user.passwordError || 0;
        user.passwordError++;
        await user.save();
        throw new HttpException("用户名或密码错误", HttpStatus.BAD_REQUEST);
    }
}

const logger = new Logger(LocalStrategy.name);
