import { GetCaseActionsTool } from "./get-case-actions.tool";
import { GetCaseMetadataTool } from "./get-case-metadata.tool";

const parseData = (result: { data: string }) => JSON.parse(result.data);
const query = (items: any[]) => ({ exec: jest.fn().mockResolvedValue(items) });
const sortedQuery = (items: any[]) => ({ sort: jest.fn().mockReturnValue(query(items)) });

describe("case data tools", () => {
    it("returns only historical driving fields and filters a fuzzy case/line name", async () => {
        const repo = {
            cases: {
                find: jest.fn().mockReturnValue(
                    query([{ _id: "case-1", name: "2021灿都", status: 0 }]),
                ),
            },
            actions: {
                find: jest.fn().mockReturnValue(
                    sortedQuery([
                        {
                            caseName: "2021灿都",
                            category: "线路行车措施",
                            items: new Map([
                                ["线路号", "5号线"],
                                ["区段", "全线"],
                                ["上下行", "上下行"],
                                ["行车措施", "停运"],
                                ["开始时间", "2021-09-13 06:00"],
                                ["结束时间", "2021-09-14 11:00"],
                                ["内部字段", "不得输出"],
                            ]),
                            accessories: [{ filename: "secret.pdf" }],
                        },
                        {
                            caseName: "2021灿都",
                            category: "线路行车措施",
                            items: { 线路号: "16号线", 行车措施: "停运" },
                        },
                    ]),
                ),
            },
        };

        const result = await new GetCaseActionsTool(repo as any).execute({ case_name: "灿都", line: "5号线" });
        const data = parseData(result);

        expect(result.success).toBe(true);
        expect(data.count).toBe(1);
        expect(data.actions[0]).toEqual({
            caseName: "2021灿都",
            line: "5号线",
            section: "全线",
            direction: "上下行",
            measure: "停运",
            startTime: "2021-09-13 06:00",
            endTime: "2021-09-14 11:00",
            remark: "",
        });
        expect(result.data).not.toContain("secret.pdf");
        expect(result.data).not.toContain("内部字段");
    });

    it("returns explicit no-data instead of guessing an unknown case", async () => {
        const repo = { cases: { find: jest.fn().mockReturnValue(query([])) }, actions: { find: jest.fn() } };
        const result = await new GetCaseActionsTool(repo as any).execute({ case_name: "不存在" });
        expect(result.success).toBe(true);
        expect(parseData(result).count).toBe(0);
        expect(repo.actions.find).not.toHaveBeenCalled();
    });

    it("supports Mongoose Map and plain object while enforcing the metadata whitelist", async () => {
        const cases = [
            {
                _id: "c1",
                name: "2021烟花",
                values: new Map([
                    ["台风年度", { value: "2021" }],
                    ["台风最大风力", { value: "42m/s" }],
                    ["联系人", { value: "不得输出" }],
                ]),
            },
            {
                _id: "c2",
                name: "2024贝碧嘉",
                values: {
                    台风年度: { value: "2024" },
                    台风走向: { value: "西北" },
                    停运线路数: { value: "9条" },
                    附件: { value: "private.xlsx" },
                },
            },
        ];
        const repo = { cases: { find: jest.fn().mockReturnValue(query(cases)) } };

        const result = await new GetCaseMetadataTool(repo as any).execute({ case_names: ["烟花", "贝碧嘉"] });
        const data = parseData(result);

        expect(data.count).toBe(2);
        expect(data.cases[0].metadata).toEqual({ 台风年度: "2021", 台风最大风力: "42m/s" });
        expect(data.cases[1].metadata).toEqual({ 台风年度: "2024", 台风走向: "西北", 停运线路数: "9条" });
        expect(result.data).not.toContain("联系人");
        expect(result.data).not.toContain("private.xlsx");
    });

    it("uses the fixed five-case comparison set by default and excludes a sixth case", async () => {
        const cases = ["灿都", "烟花", "轩岚诺", "贝碧嘉", "梅花", "普拉桑"].map((name, index) => ({
            _id: `c${index}`,
            name,
            values: { 台风年度: { value: `${2020 + index}` } },
        }));
        const repo = { cases: { find: jest.fn().mockReturnValue(query(cases)) } };
        const result = await new GetCaseMetadataTool(repo as any).execute({});
        const names = parseData(result).cases.map((item: any) => item.caseName);

        expect(names).toEqual(["灿都", "烟花", "轩岚诺", "贝碧嘉", "梅花"]);
        expect(names).not.toContain("普拉桑");
    });
});
