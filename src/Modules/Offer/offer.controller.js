import Offer from "../../Models/Offer.model.js";
import Task from "../../Models/Task.model.js";
import { AppError } from "../../Utils/Errors/AppError.js";
import * as httpStatus from "../../Utils/Http/httpStatusText.js";
import { validationResult } from "express-validator";
import { asyncWrapper } from "../../Utils/Errors/ErrorWrapper.js";
import { TaskStatus } from "../../Utils/enums/taskStatus.js";

export const createOffer = asyncWrapper(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new AppError("Validation Error", 400, httpStatus.FAIL, errors.array()));
    }

    const { taskId, price, message } = req.body;
    const workerId = req.currentUser._id;

    // Check if task exists and is open
    const task = await Task.findById(taskId);
    if (!task) {
        return next(new AppError("Task not found", 404, httpStatus.FAIL));
    }

    if (task.status !== TaskStatus.OPEN) {
        return next(new AppError("Cannot submit offer for a task that is not open", 400, httpStatus.FAIL));
    }

    // Check if worker already submitted an offer
    const existingOffer = await Offer.findOne({ taskId, workerId });
    if (existingOffer) {
        return next(new AppError("You have already submitted an offer for this task", 400, httpStatus.FAIL));
    }

    const newOffer = new Offer({
        taskId,
        workerId,
        price,
        message
    });

    await newOffer.save();

    res.status(201).json({
        status: httpStatus.SUCCESS,
        data: { offer: newOffer }
    });
});
