import { ExecutionContext, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

const IS_PUBLIC_KEY = "isPublic";

/**
 * Public标记，用于标记当前接口是否为公开接口
 * 如果有此标记，则该接口不会进行任何权限验证
 * @returns
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * 判断当前上下文中是否有PUBLIC标记
 * @param reflector
 * @param context
 * @returns
 */
export function isPublicContext(reflector: Reflector, context: ExecutionContext): boolean {
    const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    return isPublic;
}
