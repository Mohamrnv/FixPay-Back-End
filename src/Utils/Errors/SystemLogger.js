import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Logs go to: <project-root>/logs/
const LOGS_DIR = path.resolve(__dirname, "../../../../logs");

// In-memory ring buffer — keeps the latest N entries for fast API reads
const MAX_BUFFER = 200;
const logBuffer  = [];

/**
 * Returns the path to today's log file.
 * Pattern: logs/YYYY-MM-DD.log
 */
function todayLogFile() {
    const today = new Date().toISOString().slice(0, 10); // "2025-01-15"
    return path.join(LOGS_DIR, `${today}.log`);
}

/**
 * Ensures the logs directory exists.
 */
function ensureLogsDir() {
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
}

/**
 * Builds a structured log entry.
 */
function buildEntry(level, message, meta = {}) {
    return {
        timestamp : new Date().toISOString(),
        level,          // "error" | "warn" | "info"
        message,
        ...meta         // e.g. { statusCode, path, method, stack }
    };
}

/**
 * Core write function — appends to daily file & pushes to ring buffer.
 */
function write(level, message, meta = {}) {
    const entry = buildEntry(level, message, meta);
    const line  = JSON.stringify(entry) + "\n";

    // 1. Ring buffer (non-blocking)
    logBuffer.push(entry);
    if (logBuffer.length > MAX_BUFFER) logBuffer.shift();

    // 2. Disk (non-blocking, fire-and-forget)
    ensureLogsDir();
    fs.appendFile(todayLogFile(), line, (err) => {
        if (err) console.error("[SystemLogger] Failed to write log file:", err.message);
    });

    // 3. Also mirror to console so nodemon still shows it
    if (level === "error") {
        console.error(`[${entry.timestamp}] [ERROR] ${message}`);
    } else if (level === "warn") {
        console.warn(`[${entry.timestamp}] [WARN]  ${message}`);
    } else {
        console.log(`[${entry.timestamp}] [INFO]  ${message}`);
    }
}

/**
 * Public API
 */
export const SystemLogger = {
    error : (message, meta = {}) => write("error", message, meta),
    warn  : (message, meta = {}) => write("warn",  message, meta),
    info  : (message, meta = {}) => write("info",  message, meta),

    /**
     * Returns all in-memory log entries, optionally filtered by level.
     * @param {object} opts
     * @param {string} [opts.level]   Filter to "error" | "warn" | "info"
     * @param {number} [opts.limit]   Max entries to return (default 100)
     */
    getLogs({ level, limit = 100 } = {}) {
        let entries = [...logBuffer].reverse(); // newest first
        if (level) entries = entries.filter(e => e.level === level);
        return entries.slice(0, limit);
    },

    /**
     * Reads and parses today's log file from disk (slower, for full history).
     * Returns an array of parsed log entries.
     */
    async readTodayLogs() {
        const filePath = todayLogFile();
        if (!fs.existsSync(filePath)) return [];

        const raw   = await fs.promises.readFile(filePath, "utf8");
        const lines = raw.split("\n").filter(Boolean);
        return lines.map(line => {
            try   { return JSON.parse(line); }
            catch { return { raw: line };    }
        }).reverse(); // newest first
    }
};
