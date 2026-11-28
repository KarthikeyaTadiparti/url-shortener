import { z } from "zod";

export const createUrlSchema = z.object({
    originalUrl: z.url("Invalid URL"),
});

export const redirectUrlParamsSchema = z.object({
    shortcode: z
        .string()
        .min(1, "Short code is required")
        .max(10, "Short code cannot exceed 10 characters")
        .regex(/^[a-zA-Z0-9]+$/, "Invalid short code"),
});
