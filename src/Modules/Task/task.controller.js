import Task from "../../Models/Task.model.js";
import User from "../../Models/User.model.js";
import Category from "../../Models/Category.model.js";
import { AppError } from "../../Utils/Errors/AppError.js";
import * as httpStatus from "../../Utils/Http/httpStatusText.js";
import { validationResult } from "express-validator";
import { asyncWrapper } from "../../Utils/Errors/ErrorWrapper.js";
import { TaskStatus } from "../../Utils/enums/taskStatus.js";

import cloudinary from "../../Utils/cloud/cloudinary.js";

export const createTask = asyncWrapper(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new AppError("Validation Error", 400, httpStatus.FAIL, errors.array()));
    }

    const { title, description, categoryId, budget, location } = req.body;
    const customerId = req.currentUser._id;

    const newTask = new Task({
        customerId,
        title,
        description,
        categoryId,
        budget,
        location
    });

    await newTask.save();

    // Handle Image Uploads
    if (req.files && req.files.length > 0) {
        try {
            const uploadPromises = req.files.map((file, index) => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: `FixPay/users/${customerId}/tasks`,
                            public_id: `${newTask._id}-${index}`,
                            resource_type: "image"
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result.secure_url);
                        }
                    );
                    stream.end(file.buffer);
                });
            });

            const imageUrls = await Promise.all(uploadPromises);
            newTask.images = imageUrls;
            await newTask.save();
        } catch (uploadError) {
            // Optional: You might want to delete the created task if uploading fails,
            // or just proceed with a warning. For now, we'll continue with the task created.
            console.error("Cloudinary upload error:", uploadError);
        }
    }

    res.status(201).json({
        status: httpStatus.SUCCESS,
        data: { task: newTask }
    });
});

export const getOpenTasks = asyncWrapper(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tasks = await Task.find({ status: TaskStatus.OPEN })
        .populate("categoryId", "name")
        .populate("customerId", "userName name avatar")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    const totalTasks = await Task.countDocuments({ status: TaskStatus.OPEN });

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: {
            tasks,
            pagination: {
                totalTasks,
                page,
                limit,
                totalPages: Math.ceil(totalTasks / limit)
            }
        }
    });
});

export const updateTask = asyncWrapper(async (req, res, next) => {
    const { taskId } = req.params;
    const { title, description, categoryId, budget, location } = req.body;
    const customerId = req.currentUser._id;

    const task = await Task.findById(taskId);
    if (!task) {
        return next(new AppError("Task not found", 404, httpStatus.FAIL));
    }

    if (task.customerId.toString() !== customerId.toString() && req.currentUser.role !== "admin") {
        return next(new AppError("You are not authorized to edit this task", 403, httpStatus.FAIL));
    }

    task.title = title || task.title;
    task.description = description || task.description;
    task.categoryId = categoryId || task.categoryId;
    task.budget = budget || task.budget;
    task.location = location || task.location;

    // Handle new Images
    if (req.files && req.files.length > 0) {
        try {
            const uploadPromises = req.files.map((file, index) => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: `FixPay/users/${customerId}/tasks`,
                            public_id: `${task._id}-${Date.now()}-${index}`,
                            resource_type: "image"
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result.secure_url);
                        }
                    );
                    stream.end(file.buffer);
                });
            });

            const newImageUrls = await Promise.all(uploadPromises);
            task.images = task.images ? [...task.images, ...newImageUrls] : newImageUrls;
        } catch (uploadError) {
            console.error("Cloudinary upload error:", uploadError);
        }
    }

    await task.save();

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: { task }
    });
});

export const deleteTask = asyncWrapper(async (req, res, next) => {
    const { taskId } = req.params;
    const customerId = req.currentUser._id;

    const task = await Task.findById(taskId);
    if (!task) {
        return next(new AppError("Task not found", 404, httpStatus.FAIL));
    }

    if (task.customerId.toString() !== customerId.toString() && req.currentUser.role !== "admin") {
        return next(new AppError("You are not authorized to delete this task", 403, httpStatus.FAIL));
    }

    await Task.findByIdAndDelete(taskId);

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: null,
        message: "Task deleted successfully"
    });
});
