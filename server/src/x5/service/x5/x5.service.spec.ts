import { HttpModule } from "@nestjs/axios";
import { Test, TestingModule } from "@nestjs/testing";
import { AppConfigService } from "src/module/appconfig/service/appconfig/appconfig.service";
import { ActionType } from "src/module/database/entity/action.schema";
import { AdjustAttendDto } from "../../domain/adjust.attend.dto";
import { AskForLeaveDto } from "../../domain/ask.for.leave.dto";
import { X5Service } from "./x5.service";

describe("X5Service", () => {
    let service: X5Service;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [HttpModule],
            providers: [X5Service, AppConfigService],
        })
            .overrideProvider(AppConfigService)
            .useValue({
                x5Config: {
                    publicHost: "https://x5.shmetro.com:9091/timer",
                    privateHost: "http://172.20.41.45/timer",
                },
            })
            .compile();

        service = module.get<X5Service>(X5Service);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    it("解码用户信息", async () => {
        const test =
            //"eyJ1c2VyTmFtZSI6InRlc3RhbGsiLCJ1c2VyQ29kZSI6InRlc3RhbGsiLCJkZXB0TmFtZSI6Iuiwg%2BW6puaMh%2BaMpemDqCIsImRlcHRDb2RlIjoiMTYiLCJwb3NOYW1lIjoi5Yqe5LqL5ZGYIiwicG9zQ29kZSI6IlAxNjMiLCJ0aW1lc3RhbXAiOjE2OTk1MDk2NjA5NDZ9";
            "ewogICJ1c2VyTmFtZSI6ICJ0ZXN0YWxrIiwKICAidXNlckNvZGUiOiAidGVzdGFsayIsCiAgImRlcHROYW1lIjogIuiwg%2bW6puaMh%2baMpemDqCIsCiAgImRlcHRDb2RlIjogIjE2IiwKICAicG9zTmFtZSI6ICLlip7kuovlkZgiLAogICJwb3NDb2RlIjogIlAxNjMiLAogICJ0aW1lc3RhbXAiOiAxNzAzNTgwODg4MDAwCn0%3d";
        const ret = await service.decodeUserInfo(test);
        expect(ret).toBeDefined();
        expect(ret.userCode).toEqual("testalk");
    });

    // 不需要了
    // it("用户验证", async () => {
    //     const ret = await service.checkLogin({
    //         user: "01000000122",
    //         password: "111",
    //         DDUserID: "",
    //         timestamp: Math.ceil(new Date().getTime()).toString(),
    //     });
    //     expect(ret).toBeDefined();
    //     expect(ret.status).toEqual("1");
    // });

    it("请假接口", async () => {
        const data: AskForLeaveDto = {
            fID: "abcdefgh",
            psnName: "陈志钧",
            psnCode: "01000000097",
            deptName: "隆德控制中心",
            deptCode: "110",
            posName: "线路运营调度员",
            posCode: " P1026",
            type: "公休",
            yearMonth: "202312",
            createTime: "2023-12-09",
            createPsnCode: "01000000122",
            createPsnName: "陈志钧",
            beginDate: "2023-12-09",
            endDate: "2023-12-09",
            days: "1.5",
            reasons: "公休请假",
            remark: "",
            attrs: [
                {
                    attrName: "附件 1",
                    attrPath: "XXXXX",
                },
                {
                    attrName: "附件 2",
                    attrPath: "XXXXX",
                },
            ],
        };
        const ret = await service.askForLeave(data);
        expect(ret).toBeDefined();
        expect(ret.status).toEqual("1");
    });

    it("剩余公休天数查询接口", async () => {
        const ret = await service.queryPersonReNums("01000000122");
        expect(ret.status).toEqual("1");
    });

    it("排班记录接口", async () => {
        const ret = await service.signAttend([
            { psnCode: "01000000097", psnName: "陈志钧", type: ActionType.dayShift, signDate: "2023-12-25" },
            { psnCode: "01000000104", psnName: "董猛", type: ActionType.dayShift, signDate: "2023-12-25" },
            { psnCode: "01000000216", psnName: "吴俊", type: ActionType.dayShift, signDate: "2023-12-25" },
        ]);
        expect(ret.status).toEqual("1");
    });

    it("调整排班记录接口", async () => {
        const data: AdjustAttendDto = {
            adjustPsnName: " 张三",
            adjustPsnCode: " 000000000000",
            type: " 日班",
            signDate: "2019-12-09",
            psnName: "李四",
            psnCode: "000000000001",
        };
        const ret = await service.adjustSignAttend(data);
        expect(ret.status).toEqual("1");
    });
});
