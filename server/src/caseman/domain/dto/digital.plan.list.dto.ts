import { ApiProperty } from "@nestjs/swagger";
import { DigitalPlanDto } from "./digital.plan.dto";

export class DigitalPlanListDto {
    @ApiProperty({ description: "ID", type: [DigitalPlanDto] })
    list: DigitalPlanDto[] = [];

    @ApiProperty({ description: "ID", type: Number })
    total: number;
}
