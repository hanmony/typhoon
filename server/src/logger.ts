import { ConsoleLogger, LogLevel } from "@nestjs/common";
import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf } = format;

const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level.toUpperCase()} ${message}`;
});

const wlog = createLogger({
    level: "info",
    format: combine(format.simple(), timestamp(), myFormat),
    transports: [
        new transports.File({ filename: "./logs/error.log", level: "error", maxFiles: 3, maxsize: 1024 ** 2 * 5 }),
        new transports.File({ filename: "./logs/info.log", maxFiles: 3, maxsize: 1024 ** 2 * 5 }),
    ],
});

export class WinstonLogger extends ConsoleLogger {
    protected printMessages(messages: unknown[], context?: string, logLevel?: LogLevel): void {
        super.printMessages(messages, context, logLevel);
        messages.forEach(message => {
            switch (logLevel) {
                case "debug":
                    wlog.debug(`[${context}] ${message}`);
                    break;
                case "verbose":
                    wlog.verbose(`[${context}] ${message}`);
                    break;
                case "log":
                    wlog.info(`[${context}] ${message}`);
                    break;
                case "warn":
                    wlog.warn(`[${context}] ${message}`);
                    break;
                case "error":
                case "fatal":
                    if (message instanceof Error) {
                        wlog.error(`[${context}] ${message.stack}`);
                    } else {
                        wlog.error(`[${context}] ${message}`);
                    }
                    break;
                default:
                    wlog.info(`[${context}(${logLevel})] ${message}`);
                    break;
            }
        });
    }
}
