import express from 'express';
import userRouter from './Routes/User.Router.js';
import categoryRouter from './Routes/Category.Router.js';
import taskRouter from './Routes/Task.Router.js';
import offerRouter from './Routes/Offer.Router.js';
import messageRouter from './Routes/Message.Router.js';
import "dotenv/config";
import * as httpStatus from "./Utils/Http/httpStatusText.js"
import * as httpMessages from "./Utils/Http/HttpDataText.js"

const app = express();

app.use(express.json());

app.use('/api/user', userRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/offers', offerRouter);
app.use('/api/messages', messageRouter);

app.use((req, res) => {
    res.status(404).json({
        status: httpStatus.NOT_FOUND,
        data: null,
        message: httpMessages.NOT_FOUND
    });
});

app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
        status: err.statusText || "error",
        data: null,
        message: err.message || "Internal Server Error",
        details: err.details
    });
});

export default app;
