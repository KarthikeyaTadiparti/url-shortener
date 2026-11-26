import type { ErrorRequestHandler } from "express";
import type { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";

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
