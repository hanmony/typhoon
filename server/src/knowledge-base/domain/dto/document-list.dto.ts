import { ApiProperty } from "@nestjs/swagger";
import { DocumentDto } from "./document.dto";

export class DocumentListDto {
    @ApiProperty({ type: [DocumentDto] })
    list: DocumentDto[];

    @ApiProperty()
    total: number;
}
