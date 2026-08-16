import { ApiProperty } from "@nestjs/swagger";

export class ChunkDto {
    @ApiProperty({ description: "片段内容" })
    content: string;

    @ApiProperty({ description: "来源文档名" })
    documentName: string;

    @ApiProperty({ description: "片段序号" })
    chunkIndex: number;

    @ApiProperty({ description: "相似度分数" })
    score: number;
}
