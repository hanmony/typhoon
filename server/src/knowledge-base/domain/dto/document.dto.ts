import { ApiProperty } from "@nestjs/swagger";

export class DocumentDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    fileType: string;

    @ApiProperty()
    fileSize: number;

    @ApiProperty({ description: "0=pending, 1=parsing, 2=chunked, 3=indexed, -1=error" })
    status: number;

    @ApiProperty()
    statusMessage: string;

    @ApiProperty()
    chunkCount: number;

    @ApiProperty({ enum: ["typhoon_case", "regulation", "emergency_plan", "other"], description: "知识分类" })
    category: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
