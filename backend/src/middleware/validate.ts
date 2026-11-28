import type { RequestHandler } from "express";
import type { z } from "zod";

type RequestSource = "body" | "params" | "query";

const validate = (schema: z.ZodType, source: RequestSource = "body"): RequestHandler => {
    return (req, _res, next) => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            return next(result.error);
        }

        req[source] = result.data;
        next();
    };
};

export default validate;
