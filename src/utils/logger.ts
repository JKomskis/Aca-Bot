import * as winston from "winston";
const { combine, timestamp, printf, colorize, json, splat } = winston.format;

export class Logger {
    private logger: winston.Logger;

    constructor(loggerLabel: string) {
        this.logger = winston.createLogger({
            format: combine(
                colorize(),
                json(),
                timestamp({
                    format: "YYYY-MM-DD HH:mm:ss",
                }),
                splat(),
                printf((info) => `${info.timestamp} [${info.level}] ${loggerLabel}: ${info.message}`),
            ),
            level: "debug",
            transports: [new winston.transports.Console()],
        });
    }

    public error(message: string, ...meta: any[]) {
        this.logger.error(message, ...meta);
    }
    public warn(message: string, ...meta: any[]) {
        this.logger.warn(message, ...meta);
    }
    public info(message: string, ...meta: any[]) {
        this.logger.info(message, ...meta);
    }
    public debug(message: string, ...meta: any[]) {
        this.logger.debug(message, ...meta);
    }
}
