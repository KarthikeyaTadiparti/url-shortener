import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import logger from "../config/logger.js";

const httpLogger = pinoHttp({
    logger,

    genReqId: (_req, res) => {
        const requestId = randomUUID();

        res.setHeader("X-Request-Id", requestId);

        return requestId;
    },

    customLogLevel: () => "info",
});

export default httpLogger;
