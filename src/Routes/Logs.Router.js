import express from "express";
import { verifyToken } from "../Middlewares/verifytoken.js";

import { allowedTo } from "../Middlewares/allowedTo.js";
import { Roles } from "../Utils/enums/usersRoles.js";
import { SystemLogger } from "../Utils/Errors/SystemLogger.js";

const logsRouter = express.Router();

/**
 * GET /api/logs
 * Returns recent log entries from the in-memory ring buffer.
 *
 * Query params:
 *   level  — filter by "error" | "warn" | "info"  (optional)
 *   limit  — max number of entries (default 100, max 200)
 *
 * Protected: admin only.
 */
logsRouter.get(
    "/",
    verifyToken,
    allowedTo(Roles.admin),
    (req, res) => {
        const { level, limit } = req.query;
        const safeLimit = Math.min(parseInt(limit) || 100, 200);

        const logs = SystemLogger.getLogs({ level, limit: safeLimit });

        return res.status(200).json({
            status  : "success",
            count   : logs.length,
            data    : { logs }
        });
    }
);

/**
 * GET /api/logs/today
 * Reads and returns the full today's log file from disk.
 * Slower than /api/logs but returns the complete daily history.
 *
 * Query params:
 *   level  — filter by "error" | "warn" | "info"  (optional)
 *
 * Protected: admin only.
 */
logsRouter.get(
    "/today",
    verifyToken,
    allowedTo(Roles.admin),
    async (req, res, next) => {
        try {
            const { level } = req.query;
            let logs = await SystemLogger.readTodayLogs();

            if (level) logs = logs.filter(e => e.level === level);

            return res.status(200).json({
                status : "success",
                count  : logs.length,
                data   : { logs }
            });
        } catch (err) {
            next(err);
        }
    }
);

export default logsRouter;
