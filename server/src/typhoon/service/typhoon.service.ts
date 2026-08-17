import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { catchError, lastValueFrom, map, of } from "rxjs";
import { RepoService } from "src/database/service/repo/repo.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TyphoonCommandService } from "./typhoon.command.service";
import { TyphoonSevereWeatherNewHistoryDto } from "../domain/typhoon.severe.weather.new.history.dto";
import { TyphoonSevereWeatherNewHistoryEntity } from "src/database/entity/typhoon.severe.weather.new.history.schema";
import { TyphoonCommandDocument } from "src/database/entity/typhoon.command.schema";
import { importPKCS8, SignJWT } from "jose";
import { Failed } from "src/diagnostics/lib/failed";
import { TyphoonTwoDto } from "../domain/typhoon.two.dto";
import { TyphoonSevereWeatherNewDto } from "../domain/typhoon.severe.weather.new.dto";

@Injectable()
export class TyphoonService {
    constructor(
        private readonly repo: RepoService,
        private readonly http: HttpService,
        private readonly typhoonCommand: TyphoonCommandService,
    ) {}

    protected readonly apiHost: string = "https://eolink.o.apispace.com";

    protected readonly apiToken: string = "KK58WTUG3Y";

    protected readonly YourPrivateKey = `-----BEGIN PRIVATE KEY-----
    MC4CAQAwBQYDK2VwBCIEIEIVD0OVFpZ4mULsCiWmVNP6D0vghDv6LG7suEy/YV6M
    -----END PRIVATE KEY-----`;

    protected readonly YOUR_KEY_ID = "KNB287JR8B";

    protected readonly YOUR_PROJECT_ID = "2D88FF95CK";

    protected historySaving = false;

    protected currentData: TyphoonTwoDto[] = [];

    protected refreshDate: Date = new Date();

    protected JWT_TOKEN: string;

    protected jwtExpireTime: number = 0;

    async login() {
        const now = Math.floor(Date.now() / 1000);
        // 如果 token 还有效（比如剩余超过 5 分钟），直接返回
        if (this.JWT_TOKEN && this.jwtExpireTime > now + 300) {
            return;
        }

        try {
            const privateKey = await importPKCS8(this.YourPrivateKey, "EdDSA");
            const iat = now - 30;
            const exp = iat + 900;
            const customPayload = {
                sub: this.YOUR_PROJECT_ID,
                iat: iat,
                exp: exp,
            };

            this.JWT_TOKEN = await new SignJWT(customPayload)
                .setProtectedHeader({ alg: "EdDSA", kid: this.YOUR_KEY_ID })
                .sign(privateKey);

            this.jwtExpireTime = exp;
            console.log("JWT generated, expires at:", new Date(exp * 1000));
        } catch (error) {
            console.error("JWT generation error:", error);
            throw error;
        }
    }

    async getActivity(): Promise<TyphoonTwoDto[]> {
        // const entity = await this.typhoonCommand.getCurrentCommand();
        // if (!entity) {
        //     return [];
        // }
        const now = new Date();
        if (now.getTime() < this.refreshDate.getTime()) {
            return this.currentData;
        }
        this.refreshDate = new Date(now.getTime() + 5 * 60 * 1000);

        const data: TyphoonTwoDto[] = [];

        // 获取台风列表
        const res: any = await this.sendRaw("/typhoon-info/list", {
            active: 1,
            year: new Date().getFullYear(),
        });

        if (!res || !res.result || !Array.isArray(res.result.typhons)) {
            Failed.throw("返回结构错误");
        }

        const activeStorms = res.result.typhons;

        if (activeStorms.length >= 0) {
            //使用 Promise.allSettled 替代 Promise.all，避免单个失败影响整体
            const stormTrackResults = await Promise.allSettled(
                activeStorms.map(async storm => {
                    // 台风实况和路径API提供全球主要海洋流域的台风实时位置、等级、气压、风速以及活跃台风的轨迹路径。
                    const res2 = await this.sendRaw(`/typhoon-info/reaatime-typhoon`, {
                        tfid: storm.tfid, // 可能需要调整具体的 API 路径
                    });
                    return res2;
                }),
            );
            for (let i = 0; i < stormTrackResults.length; i++) {
                const trackResult = stormTrackResults[i];
                const activeStorm = activeStorms[i];
                if (trackResult.status === "fulfilled") {
                    const storm = trackResult.value.result;
                    const dto = new TyphoonTwoDto();
                    dto.tfid = storm.tfid;
                    dto.name = storm.name;
                    dto.name_en = storm.name_en;
                    dto.starttime = storm.starttime;
                    dto.endtime = storm.endtime;
                    dto.is_active = activeStorm.is_active;
                    dto.tracks = storm.tracks;
                    dto.forecasts = storm.forecasts.cn;
                    dto.lands = storm.lands;
                    data.push(dto);
                }
            }

            data.forEach(async item => {
                await this.update(item);
            });
        }

        this.currentData = data;
        return data;
    }

    // async getActivityOld(): Promise<TyphoonNewDto[]> {
    //     const now = new Date();
    //     if (now.getTime() < this.refreshDate.getTime()) {
    //         return this.currentData;
    //     }
    //     this.refreshDate = new Date(now.getTime() + 5 * 60 * 1000);

    //     const data: TyphoonNewDto[] = [];

    //     // 获取台风列表
    //     const res: any = await this.sendRaw("/v7/tropical/storm-list", {
    //         basin: "NP", // 西北太平洋
    //         year: new Date().getFullYear(),
    //     });

    //     if (!res || !res.storm || !Array.isArray(res.storm)) {
    //         Failed.throw("返回结构错误");
    //     }

    //     // ✅ 只获取活跃台风（isActive = "1"）
    //     // const activeStorms = res.storm.filter(item => item.isActive === "1");

    //     // TODO 临时测试
    //     const activeStorms = res.storm.filter(item => item.id === "NP_2601");

    //     if (activeStorms.length >= 0) {
    //         //使用 Promise.allSettled 替代 Promise.all，避免单个失败影响整体
    //         const stormTrackResults = await Promise.allSettled(
    //             activeStorms.map(async storm => {
    //                 // 台风实况和路径API提供全球主要海洋流域的台风实时位置、等级、气压、风速以及活跃台风的轨迹路径。
    //                 const res2 = await this.sendRaw(`/v7/tropical/storm-track`, {
    //                     stormid: storm.id, // 可能需要调整具体的 API 路径
    //                 });
    //                 return res2;
    //             }),
    //         );
    //         const stormForecastResults = await Promise.allSettled(
    //             activeStorms.map(async storm => {
    //                 // 台风预报API提供全球主要海洋流域的台风预测位置、等级、气压、风速等。
    //                 const res3 = await this.sendRaw(`/v7/tropical/storm-forecast`, {
    //                     stormid: storm.id, // 可能需要调整具体的 API 路径
    //                 });
    //                 return res3;
    //             }),
    //         );
    //         for (let i = 0; i < stormTrackResults.length; i++) {
    //             const trackResult = stormTrackResults[i];
    //             const forecastResult = stormForecastResults[i];
    //             const activeStorm = activeStorms[i];
    //             if (trackResult.status === "fulfilled") {
    //                 const storm = trackResult.value;
    //                 const dto = new TyphoonNewDto();
    //                 dto.tfid = activeStorm.id;
    //                 dto.name = activeStorm.name;
    //                 dto.year = activeStorm.year;
    //                 dto.basin = activeStorm.basin;
    //                 dto.isactive = activeStorm.isactive;
    //                 dto.now = storm.now ?? [];
    //                 dto.track = storm.track;
    //                 if (forecastResult.status === "fulfilled") {
    //                     dto.forecast = forecastResult.value.forecast;
    //                 } else {
    //                     dto.forecast = [];
    //                 }
    //                 data.push(dto);
    //             }
    //         }

    //         data.forEach(async item => {
    //             await this.update(item);
    //         });
    //     }

    //     this.currentData = data;
    //     return data;
    // }

    async getPassTime(): Promise<Date[]> {
        const entity = await this.typhoonCommand.getCurrentCommand();
        if (entity && entity.isPass == 2) {
            return [entity.passTime];
        }
        return [];
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    // @Cron(CronExpression.EVERY_MINUTE)
    async setPassTime() {
        // console.log("setPassTime");
        const entity = await this.typhoonCommand.getCurrentCommand();
        if (entity) {
            const severeWeatherList = await this.getSevereWeather(entity);
            // let severeWeatherList: TyphoonSevereWeatherDto[] = [];
            // if (Array.isArray(res) && res.length > 0) {
            //     severeWeatherList.push(...(await Promise.all(res)));
            // }
            let includes = false;
            let needUpdate = false;
            severeWeatherList.forEach(item => {
                if (item.eventType.name.includes("台风")) {
                    includes = true;
                    if (entity.isPass != 1) {
                        entity.isPass = 1;
                        needUpdate = true;
                    }
                }
            });
            if (includes == false) {
                if (entity.isPass == 1) {
                    needUpdate = true;
                    entity.isPass = 2;
                    entity.passTime = new Date();
                }
            }
            if (needUpdate) {
                await entity.save();
            }
        }
    }

    async getSevereWeather(command: TyphoonCommandDocument = null): Promise<TyphoonSevereWeatherNewDto[]> {
        const res = (await this.getSevereWeatherList()) as { alerts: any[] };
        const severeWeatherList: TyphoonSevereWeatherNewDto[] = [];
        if (Array.isArray(res.alerts) && res.alerts.length > 0) {
            // 方法1：使用 map 转换每个 alert 对象
            const severeWeatherDtoList = res.alerts.map(alert => {
                const dto = new TyphoonSevereWeatherNewDto();
                dto.weatherId = alert.id; // 将 alert.id 赋值给 weatherId
                dto.senderName = alert.senderName;
                dto.issuedTime = alert.issuedTime;
                dto.messageType = alert.messageType;
                dto.eventType = alert.eventType;
                dto.urgency = alert.urgency;
                dto.severity = alert.severity;
                dto.certainty = alert.certainty;
                dto.icon = alert.icon;
                dto.color = alert.color;
                dto.effectiveTime = alert.effectiveTime;
                dto.onsetTime = alert.onsetTime;
                dto.expireTime = alert.expireTime;
                dto.headline = alert.headline;
                dto.description = alert.description;
                dto.criteria = alert.criteria;
                dto.instruction = alert.instruction;
                dto.responseTypes = alert.responseTypes;
                return dto;
            });
            severeWeatherList.push(...severeWeatherDtoList);
        }
        if (command != null && !this.historySaving) {
            this.historySaving = true;
            const needSaveHistory = [];
            const history = await this.getSevereWeatherhistoryDocument(command);
            const map: Map<string, TyphoonSevereWeatherNewDto> = new Map<string, TyphoonSevereWeatherNewDto>();
            severeWeatherList.forEach(severeWeather => {
                map.set(severeWeather.weatherId, severeWeather);
            });
            history.forEach(async entity => {
                if (map.get(entity.weatherId) == null) {
                    if (entity.isEnd == 0) {
                        entity.isEnd = 1;
                        entity.endtime = new Date();
                        await entity.save();
                    }
                } else {
                    map.delete(entity.weatherId);
                }
            });
            map.forEach(severeWeather => {
                const entity = new TyphoonSevereWeatherNewHistoryEntity();
                entity.commandId = command.id.toString();
                entity.weatherId = severeWeather.weatherId;
                entity.senderName = severeWeather.senderName;
                entity.issuedTime = severeWeather.issuedTime;
                entity.messageType = severeWeather.messageType;
                entity.eventType = severeWeather.eventType;
                entity.urgency = severeWeather.urgency;
                entity.severity = severeWeather.severity;
                entity.certainty = severeWeather.certainty;
                entity.icon = severeWeather.icon;
                entity.color = severeWeather.color;
                entity.effectiveTime = severeWeather.effectiveTime;
                entity.onsetTime = severeWeather.onsetTime;
                entity.expireTime = severeWeather.expireTime;
                entity.headline = severeWeather.headline;
                entity.description = severeWeather.description;
                entity.criteria = severeWeather.criteria;
                entity.instruction = severeWeather.instruction;
                entity.responseTypes = severeWeather.responseTypes;
                entity.isEnd = 0;
                entity.endtime = new Date();
                needSaveHistory.push(entity);
            });
            if (needSaveHistory.length > 0) {
                await this.repo.typhoonSevereWeatherNews.insertMany(needSaveHistory);
            }
            this.historySaving = false;
        }
        return severeWeatherList;
    }

    async getCommandTyphoon(): Promise<TyphoonTwoDto> {
        const entity = await this.typhoonCommand.getCurrentCommand();
        if (entity) {
            const res = await this.repo.typhoonTwos.find({ name: entity.name });
            if (res.length > 0) {
                return TyphoonTwoDto.fromDoc(res[res.length - 1]);
            }
        }
        return new TyphoonTwoDto();
    }

    async getSevereWeatherhistory(): Promise<TyphoonSevereWeatherNewHistoryDto[]> {
        const entity = await this.typhoonCommand.getCurrentCommand();
        if (entity) {
            const res = await this.repo.typhoonSevereWeatherNews.find({ commandId: entity.id.toString() });
            return res.map(it => TyphoonSevereWeatherNewHistoryDto.fromHistoryDoc(it));
        }
        return [];
    }

    async getSevereWeatherhistoryDocument(command: TyphoonCommandDocument) {
        const res = await this.repo.typhoonSevereWeatherNews.find({ commandId: command.id.toString() });
        return res;
    }

    async getHistory(year: number): Promise<TyphoonTwoDto[]> {
        // 获取台风列表
        const res: any = await this.sendRaw("/typhoon-info/list", {
            active: 0,
            year: year || new Date().getFullYear(),
        });

        if (!res || !res.storm || !Array.isArray(res.storm)) {
            Failed.throw("返回结构错误");
        }

        const histotyStorms = res.result.typhons;
        const data: TyphoonTwoDto[] = [];
        if (histotyStorms.length > 0) {
            // const tfidList = res.filter(item => item.name !== "未命名").map(item => item.tfid);
            // 使用 Promise.all 处理所有 tfid 的异步请求
            const stormTrackResults = await Promise.allSettled(
                histotyStorms.map(async storm => {
                    // 台风实况和路径API提供全球主要海洋流域的台风实时位置、等级、气压、风速以及活跃台风的轨迹路径。
                    const res2 = await this.sendRaw(`/typhoon-info/reaatime-typhoon`, {
                        tfid: storm.tfid, // 可能需要调整具体的 API 路径
                    });
                    return res2;
                }),
            );
            for (let i = 0; i < stormTrackResults.length; i++) {
                const trackResult = stormTrackResults[i];
                if (trackResult.status === "fulfilled") {
                    const storm = trackResult.value;
                    const dto = new TyphoonTwoDto();
                    dto.tfid = storm.tfid;
                    dto.name = storm.name;
                    dto.name_en = storm.name_en;
                    dto.starttime = storm.starttime;
                    dto.endtime = storm.endtime;
                    dto.is_active = storm.is_active;
                    dto.tracks = storm.tracks;
                    dto.forecasts = storm.forecasts.cn;
                    dto.lands = storm.lands;
                    data.push(dto);
                }
            }

            data.forEach(async item => {
                await this.update(item);
            });
        }
        // let data: TyphoonNewDto[] = [];
        // data = typhoonList.filter(item => {
        //     if (item !== "") {
        //         return true;
        //     }
        // });
        // data.forEach(async item => {
        //     await this.create(item);
        // });
        return data;
    }

    /**
     * 创建台风
     * @param data
     * @returns
     */
    async create(data: TyphoonTwoDto) {
        const old = await this.repo.typhoonTwos.exists({ tfid: data.tfid }).exec();
        if (!old) {
            const typhoon = new this.repo.typhoonTwos();
            typhoon.tfid = data.tfid;
            typhoon.name = data.name;
            typhoon.name_en = data.name_en;
            typhoon.is_active = data.is_active;
            typhoon.starttime = data.starttime;
            typhoon.endtime = data.endtime;
            typhoon.tracks = data.tracks;
            typhoon.forecasts = data.forecasts;
            typhoon.lands = data.lands;
            await typhoon.save();
        }
    }

    /**
     * 更新台风
     * @param data
     * @returns
     */
    async update(data: TyphoonTwoDto) {
        const old = await this.repo.typhoonTwos.findOne({ tfid: data.tfid });
        if (!old) {
            const typhoon = new this.repo.typhoonTwos();
            typhoon.tfid = data.tfid;
            typhoon.name = data.name;
            typhoon.name_en = data.name_en;
            typhoon.is_active = data.is_active;
            typhoon.starttime = data.starttime;
            typhoon.endtime = data.endtime;
            typhoon.tracks = data.tracks;
            typhoon.forecasts = data.forecasts;
            typhoon.lands = data.lands;
            await typhoon.save();
        } else {
            old.is_active = data.is_active;
            old.starttime = data.starttime;
            old.endtime = data.endtime;
            old.tracks = data.tracks;
            old.forecasts = data.forecasts;
            old.lands = data.lands;
            await old.save();
        }
    }

    private async sendRaw<T>(path: string, params?: Record<string, any>): Promise<T> {
        // 1. 先登录获取 JWT token
        // await this.login();

        const fullpath = `${this.apiHost}${path}`;

        const token = "whxcpn36cgcxktsl73u770xsc1jx9fa0";

        const ob = this.http
            .get(fullpath, {
                headers: {
                    "X-APISpace-Token": token, // ✅ 添加认证头
                },
                params: params, // ✅ 支持查询参数
            })
            .pipe(
                map(x => x.data),
                catchError(err => {
                    logger.error(`http failed (${err.message}): ${fullpath}`);
                    return of(undefined);
                }),
            );
        const ret = await lastValueFrom(ob);
        return ret;
    }

    private async getSevereWeatherList<T>(): Promise<T> {
        await this.login();
        const fullpath = "https://nc4gkkf7kx.re.qweatherapi.com/weatheralert/v1/current/31.24/121.49";
        const ob = this.http
            .get(fullpath, {
                headers: {
                    Authorization: `Bearer ${this.JWT_TOKEN}`, // ✅ 添加认证头
                },
            })
            .pipe(
                map(x => x.data),
                catchError(err => {
                    logger.error(`hppt failed (${err.code}): ${fullpath}`);
                    return of(undefined);
                }),
            );
        const ret = await lastValueFrom(ob);
        return ret;
    }
}

const logger = new Logger("TyphoonService");
