import { ApiProperty } from "@nestjs/swagger";

export class CaseDocDto {
    @ApiProperty({ description: "所属案例" })
    caseId: string;

    @ApiProperty({ description: "文件名" })
    filename: string;

    @ApiProperty({ description: "文件类型" })
    contentType: string;
}
