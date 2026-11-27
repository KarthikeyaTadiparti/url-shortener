import type { RequestHandler } from "express";
import z from "zod";

const validate = (schema: z.ZodType): RequestHandler=> {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if(!result.success)
            return next(result.error);

        next();
    };
};

export default validate;