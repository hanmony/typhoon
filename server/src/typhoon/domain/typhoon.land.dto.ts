import { ApiProperty } from "@nestjs/swagger";

export class TyphoonLandDto {
    info: string = "";
    landaddress: string = "";
    landtime: string = "";
    lat: string = "";
    lng: string = "";
    strong: string = "";
}
