import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { pool } from "./config/database.js";

const PORT = Number(process.env.PORT) || 3000;

// Create HTTP server
const server = createServer(app);

let isShuttingDown = false;

// Start application
async function startServer() {
  try {
    // Verify database connection
    await pool.query("SELECT 1");

    console.log("Database connected successfully.");

    // Start accepting HTTP connections
    server.listen(PORT);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

// Handle server errors
server.on("error", (error) => {
  console.error("Server error:", error);
  process.exit(1);
});

// Handle successful server startup
server.on("listening", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Graceful shutdown
async function shutdown(signal: string) {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log(`${signal} received. Shutting down...`);

  server.close(async (error) => {
    if (error) {
      console.error("Server shutdown failed:", error);
      process.exit(1);
    }

    try {
      await pool.end();

      console.log("Server and database connections closed.");
      process.exit(0);
    } catch (error) {
      console.error("Database shutdown failed:", error);
      process.exit(1);
    }
  });
}

// Handle termination signals
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

//start server
startServer();
