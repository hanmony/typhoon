import { AnalysisPayload, fetchSSEStream } from "./sse-stream";

describe("fetchSSEStream analysis events", () => {
  it("forwards a typed analysis event to onAnalysis before completion", (done) => {
    const payload: AnalysisPayload = {
      affectedLines: [
        {
          line: "16号线",
          period: "09-14 04:00 ~ 09-15 04:00",
          riskLevel: "最高空间风险：高（12级风圈）",
        },
      ],
      levelSuggestion: null,
      similarCases: [
        {
          caseId: "case-1",
          caseName: "2022梅花",
          score: 0.51,
          reason: "路径接近",
        },
      ],
    };
    const body = `data: ${JSON.stringify({ type: "analysis", data: payload })}\n\ndata: [DONE]\n\n`;
    spyOn(window, "fetch").and.resolveTo(new Response(body, { status: 200 }));

    let received: AnalysisPayload | undefined;
    fetchSSEStream(
      {
        onToken: () => undefined,
        onAnalysis: (data) => {
          received = data;
        },
        onError: (error) => done.fail(error),
        onComplete: () => {
          expect(received).toEqual(payload);
          done();
        },
      },
      {
        url: "/alert-analyzer/stream",
        body: { autoRun: true },
        token: undefined,
        format: "typed",
      },
    );
  });
});
