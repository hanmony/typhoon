import { Module } from "@nestjs/common";
import { X5Service } from "./service/x5/x5.service";

@Module({
    imports: [],
    providers: [X5Service],
    exports: [X5Service],
})
export class X5Module {}
