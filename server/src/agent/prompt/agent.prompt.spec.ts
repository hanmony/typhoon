import { AgentPromptBuilder } from "./agent.prompt";

describe("AgentPromptBuilder", () => {
    const prompt = AgentPromptBuilder.buildSystemPrompt();

    it("documents the two case-data tools and their distinct contracts", () => {
        expect(prompt).toContain("get_case_actions");
        expect(prompt).toContain("get_case_metadata");
        expect(prompt).toContain("不是当前决策");
        expect(prompt).toContain("不计算轨迹相似度");
    });

    it("forces the real-time, historical and regulation routing boundaries", () => {
        expect(prompt).toContain("当前、现在、实时、最新");
        expect(prompt).toContain("询问历史年份、编号、名称、登陆和路径时必须使用");
        expect(prompt).toContain("制度或规则问题即使看似常识，也必须检索");
    });

    it("requires explicit refusal and covers fabrication boundaries", () => {
        expect(prompt).toContain("必须先用“不能”“拒绝”或“无法”明确拒绝");
        expect(prompt).toContain("不得编造停运时段、登陆点、负责人、预警等级");
        expect(prompt).toContain("不得隐藏来源");
        expect(prompt).toContain("占位值不能冒充真实值");
        expect(prompt).toContain("重复记录须去重");
        expect(prompt).toContain("不得把历史措施直接改写成当前驾驶、限速或停运指令");
    });
});
