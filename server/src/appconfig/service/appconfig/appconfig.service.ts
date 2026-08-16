import { Injectable } from "@nestjs/common";
import { systemRoles as definedSystemGroups } from "../../lib/system.roles";

@Injectable()
export class AppConfigService {
    // constructor(private readonly configs: ConfigService) {}

    /**
     * 系统内置的组
     */
    get systemGroups() {
        return definedSystemGroups;
    }

    // /**
    //  * 当前的环境
    //  */
    // public get env(): string {
    //     return this.configs.get<string>("env");
    // }

    // /**
    //  * 服务器secret
    //  */
    // public get secret(): string {
    //     return this.configs.get<string>("server.secret");
    // }

    // /**
    //  * 服务器token过期时间
    //  */
    // public get expiresIn(): string {
    //     return this.configs.get<string>("server.expiresIn");
    // }

    // /**
    //  * 当前数据库路径
    //  */
    // public get db(): string {
    //     return this.configs.get<string>("db");
    // }

    // /**
    //  * X5 config
    //  */
    // public get x5Config(): { sync: boolean; privateHost: string; publicHost: string } {
    //     return this.configs.get<{ sync: boolean; privateHost: string; publicHost: string }>("x5");
    // }
}
