import { Request } from "express";

export class OpLogDto {
    module: string;
    title: string;
    url: string;
    agent: string;
    req: Request;
    data: unknown;
}
