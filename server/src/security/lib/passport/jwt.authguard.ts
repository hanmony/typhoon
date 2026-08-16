import { ExecutionContext, HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { isPublicContext } from "../decorator/public.decorator";
import { TokenExpiredError } from "@nestjs/jwt";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        if (isPublicContext(this.reflector, context)) {
            return true;
        }
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: Error) {
        if (info instanceof TokenExpiredError) {
            // token expired
            throw new HttpException("token expired", HttpStatus.UNAUTHORIZED);
        }
        if (err || !user) {
            throw err || new UnauthorizedException();
        }
        return user;
    }
}
