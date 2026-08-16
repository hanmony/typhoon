import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare as compareHash, hash } from "bcryptjs";
import { sm3 } from "src/common/lib/crypto.helper";

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) {}

    /**
     * 为用户签发token
     * @param userId userId
     * @param roles roles
     * @returns
     */
    async sign(payload: object): Promise<string> {
        const token = await this.jwtService.signAsync(payload);
        return token;
    }

    async getUserIdBysign(token: string) {
        const userId = await this.jwtService.decode(token);
        return userId;
    }

    /**
     * 获取密码hash值
     * @param password md5 后的密码
     * @returns
     */
    async getPasswordHash(password: string): Promise<string> {
        return await hash(password, 10);
    }

    /**
     * 生成初始密码
     * @param userid
     * @returns
     */
    getDefaultPassword(userid: string): string {
        const passwordPrefix = "Tf24@";
        return sm3(`${passwordPrefix}${userid.substring(userid.length - 3)}`);
    }

    /**
     * 比较密码
     * @param password
     * @param hash
     * @returns
     */
    async compare(password: string, hash: string): Promise<boolean> {
        return await compareHash(password, hash);
    }
}
