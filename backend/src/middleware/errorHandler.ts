import type { ErrorRequestHandler } from "express";
import type { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";
import { ZodError } from "zod";

const errorHandler: ErrorRequestHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    // Response has already started
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof AppError) {
        // Operational error
        req.log.warn({ err, statusCode: err.statusCode }, "Operational error");

        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            requestId: req.id,
        });
    }

    if (err instanceof ZodError) {
        // Validation error
        req.log.warn({ err, statusCode: 400 }, "Validation error");

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: err.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    // Unexpected programming or system error
    req.log.error({ err }, "Unexpected application error");

    // Send safe response
    return res.status(500).json({
        success: false,
        message: "Internal server error",
        requestId: req.id,
    });
};

export default errorHandler;
