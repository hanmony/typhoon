import { FailedException } from "./failed.exception";

export class Failed {
    public static check<T>(condition: T): T;
    public static check<T>(condition: T, message: string): T;
    public static check<T>(condition: T, message: string, code: number): T;
    public static check<T>(condition: T, message: string, code: number, extra: unknown): T;
    public static check<T>(condition: T, message?: string, code?: number, extra?: unknown): T {
        if (condition) {
            return condition;
        }
        code = code ?? -1;
        message = message ?? "failed";
        Failed.throw(message, code, extra);
    }
    public static throw(message: string, code?: number, extra?: unknown): never {
        code = code ?? -1;
        const failed = new FailedException(code, message, extra);
        throw failed;
    }
}
