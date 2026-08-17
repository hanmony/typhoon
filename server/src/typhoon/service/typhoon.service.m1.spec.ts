import { ConfigService } from "@nestjs/config";
import { TyphoonService } from "./typhoon.service";

describe("TyphoonService M1 data adaptation", () => {
    const createService = () =>
        new TyphoonService({} as any, {} as any, {} as any, { get: jest.fn() } as unknown as ConfigService);

    it("unwraps result.typhons and result detail responses", async () => {
        const service = createService();
        jest.spyOn(service as any, "sendRaw")
            .mockResolvedValueOnce({
                result: {
                    typhons: [{ tfid: "2401", name: "list name", is_active: "0" }],
                },
            })
            .mockResolvedValueOnce({
                result: {
                    tfid: "2401",
                    name: "detail name",
                    name_en: "DETAIL",
                    starttime: "2024-01-01",
                    endtime: "2024-01-02",
                    is_active: "0",
                    tracks: [{ data_time: "2024-01-01 00:00" }],
                    forecasts: { cn: [{ data_time: "2024-01-01 06:00" }] },
                    lands: [],
                },
            });
        const update = jest.spyOn(service, "update").mockResolvedValue(undefined);

        const result = await service.getHistory(2024);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            tfid: "2401",
            name: "detail name",
            name_en: "DETAIL",
            is_active: "0",
        });
        expect(result[0].tracks).toHaveLength(1);
        expect(result[0].forecasts).toHaveLength(1);
        expect(update).toHaveBeenCalledWith(result[0]);
    });

    it("keeps list summaries when one history detail request fails", async () => {
        const service = createService();
        jest.spyOn(service as any, "sendRaw")
            .mockResolvedValueOnce({
                result: {
                    typhons: [
                        { tfid: "2401", name: "A", is_active: "0" },
                        { tfid: "2402", name: "B", is_active: "0" },
                    ],
                },
            })
            .mockRejectedValueOnce(new Error("detail unavailable"))
            .mockResolvedValueOnce({ result: { tfid: "2402", name: "B", forecasts: [], tracks: [], lands: [] } });
        jest.spyOn(service, "update").mockResolvedValue(undefined);

        const result = await service.getHistory(2024);

        expect(result.map(item => item.tfid)).toEqual(["2401", "2402"]);
        expect(result[0]).toMatchObject({ tfid: "2401", name: "A", tracks: [], forecasts: [], lands: [] });
    });

    it("keeps active-typhoon summaries and waits for cache updates", async () => {
        const service = createService();
        (service as any).refreshDate = new Date(0);
        jest.spyOn(service as any, "sendRaw")
            .mockResolvedValueOnce({
                result: { typhons: [{ tfid: "2601", name: "active", is_active: "1" }] },
            })
            .mockRejectedValueOnce(new Error("detail unavailable"));
        const update = jest.spyOn(service, "update").mockResolvedValue(undefined);

        const result = await service.getActivity();

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ tfid: "2601", name: "active", is_active: "1" });
        expect(update).toHaveBeenCalledTimes(1);
    });
});
