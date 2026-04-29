import app from './app.js';
import dbConnection from './DB/db.connection.js';
import "dotenv/config";
import http from "http";
import { initSocket } from "./socket/socket.js";
import { SystemLogger } from "./Utils/Errors/SystemLogger.js";

const port = process.env.PORT || 3000;

dbConnection();

const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
    SystemLogger.info(`Server started on http://localhost:${port}`);
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Socket.io is also listening for events.`);
});

// ─── Process-level safety nets ────────────────────────────────────────────────
// These catch errors that escape all Express middleware (e.g. top-level async bugs).

process.on("uncaughtException", (err) => {
    SystemLogger.error(`[uncaughtException] ${err.message}`, {
        stack: err.stack,
        fatal: true
    });
    // Give the logger a moment to flush to disk before exiting
    setTimeout(() => process.exit(1), 500);
});

process.on("unhandledRejection", (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    SystemLogger.error(`[unhandledRejection] ${message}`, {
        stack,
        fatal: false
    });
});
