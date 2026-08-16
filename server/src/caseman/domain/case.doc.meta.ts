import { ApiProperty } from "@nestjs/swagger";
import * as mimeTypes from "mime-types";

export class CaseDocMeta {
    static create(host: string, filename: string, isAccessory: boolean): CaseDocMeta {
        const ret = new CaseDocMeta();
        ret.caseId = host;
        ret.filename = filename;
        ret.contentType = mimeTypes.lookup(filename) || "application/octet-stream";
        ret.docType = isAccessory ? "accessory" : "doc";
        return ret;
    }

    @ApiProperty({ description: "所属案例" })
    caseId: string;

    @ApiProperty({ description: "文件名" })
    filename: string;

    @ApiProperty({ description: "文件类型" })
    contentType: string;

    @ApiProperty({ description: "文件类型" })
    docType: string;
}
