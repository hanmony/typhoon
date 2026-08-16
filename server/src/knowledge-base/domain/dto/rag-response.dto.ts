import { ApiProperty } from "@nestjs/swagger";
import { ChunkDto } from "./chunk.dto";

export class RagResponseDto {
    @ApiProperty({ description: "回答内容" })
    answer: string;

    @ApiProperty({ description: "引用的片段", type: [ChunkDto] })
    sources: ChunkDto[];
}
