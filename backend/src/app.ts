import express from "express";
import { pool } from "./config/database.js";

const app = express();

app.get("/", (_req, res) => {
    res.send("Welcom to url-shortener api");
});

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

export default app;
