import pino from "pino";
import { env } from "./env.js";

const isProduction = env.NODE_ENV === "production";

const logger = pino({
    level: env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),

    ...(!isProduction && {
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                levelFirst: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
            },
        },
    }),
});

export default logger;
