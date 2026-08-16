import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, Max, Min } from "class-validator";

export class SaveChunkConfigDto {
    @ApiProperty({
        description: "分段策略",
        enum: ["auto", "paragraph", "sliding_window"],
    })
    @IsIn(["auto", "paragraph", "sliding_window"])
    strategy: string;

    @ApiProperty({ description: "分段长度（字符数）", minimum: 100, maximum: 5000 })
    @IsInt()
    @Min(100)
    @Max(5000)
    chunkSize: number;

    @ApiProperty({ description: "重叠长度（字符数）", minimum: 0, maximum: 1000 })
    @IsInt()
    @Min(0)
    @Max(1000)
    overlap: number;
}
