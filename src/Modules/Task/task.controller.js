import Task from "../../Models/Task.model.js";
import { AppError } from "../../Utils/Errors/AppError.js";
import * as httpStatus from "../../Utils/Http/httpStatusText.js";
import { validationResult } from "express-validator";

export const createTask = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new AppError("Validation Error", 400, httpStatus.FAIL, errors.array()));
        }

        const { title, description, categoryId, budget, location } = req.body;
        const customerId = req.currentUser._id; // Matches 'verifyToken' middleware behavior

        const newTask = new Task({
            customerId,
            title,
            description,
            categoryId,
            budget,
            location
        });

        await newTask.save();

        res.status(201).json({
            status: httpStatus.SUCCESS,
            data: { task: newTask }
        });
    } catch (error) {
        next(new AppError(error.message, 500, httpStatus.ERROR));
    }
};
