import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class X5AuthGuard extends AuthGuard("x5") {}
