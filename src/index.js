import express from 'express';
import userRouter from './Routes/User.Router.js';
import categoryRouter from './Routes/Category.Router.js';
import taskRouter from './Routes/Task.Router.js';
import "dotenv/config";
import dbConnection from './DB/db.connection.js';
import * as httpStatus from "./Utils/Http/httpStatusText.js"
import * as httpMessages from "./Utils/Http/HttpDataText.js"
const app = express();
const port = process.env.PORT;

dbConnection();

app.use(express.json());

app.use('/api/user',userRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/tasks', taskRouter);

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


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});