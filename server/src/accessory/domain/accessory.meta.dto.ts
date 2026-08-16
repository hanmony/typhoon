import * as mimeTypes from "mime-types";
import { AccessoryDto } from "./accessory.dto";

export class AccessoryMetaDto {
    static create(hostType: string, hostId: string, item: AccessoryDto): AccessoryMetaDto {
        const ret = new AccessoryMetaDto();
        ret.hostType = hostType;
        ret.hostId = hostId;
        ret.file = item.filename;
        ret.mime = mimeTypes.lookup(item.filename);
        return ret;
    }

    hostType: string;
    hostId: string;
    file: string;
    mime: string;
}
