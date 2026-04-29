import express from 'express';
import cors from 'cors';
import userRouter from './Routes/User.Router.js';
import categoryRouter from './Routes/Category.Router.js';
import taskRouter from './Routes/Task.Router.js';
import offerRouter from './Routes/Offer.Router.js';
import messageRouter from './Routes/Message.Router.js';
import reportRouter from './Routes/Report.Router.js';
import logsRouter from './Routes/Logs.Router.js';
import "dotenv/config";
import * as httpStatus from "./Utils/Http/httpStatusText.js";
import * as httpMessages from "./Utils/Http/HttpDataText.js";
import { SystemLogger } from "./Utils/Errors/SystemLogger.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/user', userRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/offers', offerRouter);
app.use('/api/messages', messageRouter);
app.use('/api/reports', reportRouter);
app.use('/api/logs', logsRouter);

app.use((req, res) => {
    SystemLogger.warn(`Route not found: ${req.method} ${req.originalUrl}`, {
        method : req.method,
        path   : req.originalUrl,
        ip     : req.ip
    });
    res.status(404).json({
        status  : httpStatus.NOT_FOUND,
        data    : null,
        message : httpMessages.NOT_FOUND
    });
});

// Global error handler — logs every server error and sends a structured response.
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const statusText = err.statusText || httpStatus.ERROR;

    // Only log true server errors (5xx) or unknown errors as "error";
    // log client errors (4xx) as "warn" to keep noise low.
    const isServerError = statusCode >= 500 || !err.isOperational;
    const logLevel      = isServerError ? "error" : "warn";

    SystemLogger[logLevel](err.message || "Unknown error", {
        statusCode,
        method : req.method,
        path   : req.originalUrl,
        ip     : req.ip,
        // Include stack trace only for true server errors (never in production response)
        stack  : isServerError ? err.stack : undefined
    });

    return res.status(statusCode).json({
        status  : statusText,
        data    : null,
        message : err.message || "Internal Server Error",
        details : err.details || null
    });
});

export default app;
