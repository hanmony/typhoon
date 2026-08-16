import { Injectable, Logger } from "@nestjs/common";
import { X5UserInfoDto } from "../../domain/x5.user.info.dto";

const logger = new Logger("X5Service");

@Injectable()
export class X5Service {
    constructor() {}

    /**
     * 解码用户信息
     * @param data
     * @returns
     */
    public async decodeUserInfo(data: string): Promise<X5UserInfoDto | undefined> {
        try {
            const decodedStr = Buffer.from(decodeURIComponent(data), "base64").toString();
            return JSON.parse(decodedStr);
        } catch (err) {
            logger.error("decode user info failed", err);
            logger.error("data is", data);
            return undefined;
        }
    }
}
