import { ApiProperty } from "@nestjs/swagger";

export class FailedItemDto {
    @ApiProperty({ description: "失败的文档 ID" })
    id: string;

    @ApiProperty({ description: "失败的文档名" })
    name: string;

    @ApiProperty({ description: "失败原因（错误 message，不含堆栈）" })
    error: string;
}

export class GenerateAllMetadataResponseDto {
    @ApiProperty({ description: "成功处理的文档数量" })
    processed: number;

    @ApiProperty({
        description: "失败的文档明细（无失败时省略）",
        type: [FailedItemDto],
        required: false,
    })
    failed?: FailedItemDto[];
}
