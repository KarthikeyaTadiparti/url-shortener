import express from "express";
import { pool } from "./config/database.js";
import httpLogger from "./middleware/httpLogger.js";
import errorHandler from "./middleware/errorHandler.js";
import urlRouter from "./modules/url-creation/url-creation.routes.js";

const app = express();

//middlewares
app.use(httpLogger);
app.use(express.json());

//routes
app.get("/", (_req, res) => {
    res.send("Welcome to url-shortener api");
});

app.use("/urls", urlRouter);

app.get("/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({
            status: "ok",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Health check failed:", error);

        res.status(503).json({
            status: "error",
            database: "disconnected",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    }
});

//error handler
app.use(errorHandler);

export default app;
