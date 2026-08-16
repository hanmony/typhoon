import {
    applyDecorators,
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    SetMetadata,
    UseInterceptors,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { events } from "src/common/lib/event.types";
import { OpLogDto } from "src/log/domain/dto/oplog.dto";
import { parse as urlParse } from "url";

@Injectable()
export class ActionLoggerInterceptor implements NestInterceptor {
    constructor(
        private readonly emitter: EventEmitter2,
        private reflector: Reflector,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            tap(data => {
                const ctx = context.switchToHttp();
                const req = ctx.getRequest<Request>();
                if (req.user) {
                    // const path = urlParse(req.url).pathname;
                    // const url = new URL(req.url);
                    const path = req.url;
                    const title = this.reflector.getAllAndOverride<string>("action-title", [
                        context.getHandler(),
                        context.getClass(),
                    ]);
                    const module = this.reflector.getAllAndOverride<string>("action-module", [
                        context.getHandler(),
                        context.getClass(),
                    ]);
                    const agent = req.headers["user-agent"] || "unknown agent";

                    const args: OpLogDto = {
                        module,
                        title,
                        req,
                        agent,
                        url: path,
                        data,
                    };
                    this.emitter.emit(events.opLog, args);
                }
            }),
        );
    }
}

/**
 * Create a event logger decorator
 * @returns
 */
export function ActionLog(module: string, title: string) {
    return applyDecorators(
        SetMetadata("action-module", module),
        SetMetadata("action-title", title),
        UseInterceptors(ActionLoggerInterceptor),
    );
}
