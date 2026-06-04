import Task from "../../Models/Task.model.js";
import User from "../../Models/User.model.js";
import Category from "../../Models/Category.model.js";
import Offer from "../../Models/Offer.model.js";
import { AppError } from "../../Utils/Errors/AppError.js";
import * as httpStatus from "../../Utils/Http/httpStatusText.js";
import { validationResult } from "express-validator";
import { asyncWrapper } from "../../Utils/Errors/ErrorWrapper.js";
import { TaskStatus } from "../../Utils/enums/taskStatus.js";
import { Roles } from "../../Utils/enums/usersRoles.js";
import { getHaversineDistance } from "../../Utils/geo.js";

import cloudinary from "../../Utils/cloud/cloudinary.js";

export const createTask = asyncWrapper(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new AppError("Validation Error", 400, httpStatus.FAIL, errors.array()));
    }

    const { title, description, categoryId, budget, location, locationCoords } = req.body;
    const customerId = req.currentUser._id;

    const newTask = new Task({
        customerId,
        title,
        description,
        categoryId,
        budget,
        location,
        locationCoords
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

    let filter = { status: TaskStatus.OPEN };

    // Apply restrictions based on role
    if (req.currentUser.role === Roles.worker) {
        if (req.currentUser.categoryId) {
            filter.categoryId = req.currentUser.categoryId;
        } else {
            return res.status(200).json({
                status: httpStatus.SUCCESS,
                data: {
                    tasks: [],
                    pagination: { totalTasks: 0, page, limit, totalPages: 0 }
                }
            });
        }
    } else if (req.currentUser.role === Roles.user) {
        filter.customerId = req.currentUser._id;
    }

    const tasks = await Task.find(filter)
        .populate("categoryId", "name")
        .populate("customerId", "userName name avatar")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    const totalTasks = await Task.countDocuments(filter);

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

export const getWorkerTasks = asyncWrapper(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const categoryId = req.currentUser.categoryId;

    if (!categoryId) {
        return next(new AppError("Worker has no assigned category", 400, httpStatus.FAIL));
    }

    const tasks = await Task.find({ 
        status: TaskStatus.OPEN, 
        categoryId: categoryId 
    })
    .populate("categoryId", "name")
    .populate("customerId", "userName name avatar")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

    const totalTasks = await Task.countDocuments({ 
        status: TaskStatus.OPEN, 
        categoryId: categoryId 
    });

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

export const getCustomerTasks = asyncWrapper(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tasks = await Task.find({ customerId: req.currentUser._id })
        .populate("categoryId", "name")
        .populate("customerId", "userName name avatar")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    const totalTasks = await Task.countDocuments({ customerId: req.currentUser._id });

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

export const getWorkerAssignedTasks = asyncWrapper(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const filter = { workerId: req.currentUser._id };
    if (status) {
        filter.status = status;
    }

    const tasks = await Task.find(filter)
        .populate("categoryId", "name")
        .populate("customerId", "userName name avatar")
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 });

    const totalTasks = await Task.countDocuments(filter);

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
    const { title, description, categoryId, budget, location, locationCoords } = req.body;
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
    if (locationCoords) task.locationCoords = locationCoords;

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

export const getRecommendedWorkers = asyncWrapper(async (req, res, next) => {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
        return next(new AppError("Task not found", 404, httpStatus.FAIL));
    }

    // Authorization: Only the owner of the task (customer) or admin can view recommended workers
    if (task.customerId.toString() !== req.currentUser._id.toString() && req.currentUser.role !== Roles.admin) {
        return next(new AppError("Not authorized to view recommendations for this task", 403, httpStatus.FAIL));
    }

    if (!task.locationCoords || typeof task.locationCoords.lat !== "number" || typeof task.locationCoords.lng !== "number") {
        return next(new AppError("Task does not have coordinates defined to calculate distances", 400, httpStatus.FAIL));
    }

    // Find offers for this task to extract workers
    const offers = await Offer.find({ taskId });
    const workerIds = offers.map(o => o.workerId);

    // Find active workers in the same category who have sent an offer
    const workers = await User.find({
        _id: { $in: workerIds },
        role: Roles.worker,
        deleted: { $ne: true },
        isBanned: { $ne: true },
        $or: [
            { suspendedUntil: { $exists: false } },
            { suspendedUntil: { $lte: new Date() } }
        ],
        "locationCoords.lat": { $exists: true, $ne: null },
        "locationCoords.lng": { $exists: true, $ne: null }
    }).select("userName name avatar rating address locationCoords");

    // Calculate straight-line distance for each worker and map with offer details
    const workersWithDistance = workers.map(worker => {
        const straightLineDistance = getHaversineDistance(
            { lat: task.locationCoords.lat, lng: task.locationCoords.lng },
            { lat: worker.locationCoords.lat, lng: worker.locationCoords.lng }
        );
        
        const workerOffer = offers.find(o => o.workerId.toString() === worker._id.toString());
        
        return {
            worker: {
                _id: worker._id,
                userName: worker.userName,
                name: worker.name,
                avatar: worker.avatar,
                rating: worker.rating,
                address: worker.address,
                locationCoords: worker.locationCoords
            },
            offer: workerOffer ? {
                price: workerOffer.price,
                message: workerOffer.message
            } : null,
            straightLineDistance: parseFloat(straightLineDistance.toFixed(2))
        };
    });

    // Sort by distance ascending
    workersWithDistance.sort((a, b) => a.straightLineDistance - b.straightLineDistance);

    // Limit to top 5/10 to fetch real driving directions using OSRM project router
    const limit = parseInt(req.query.limit) || 5;
    const topWorkers = workersWithDistance.slice(0, limit);

    // Fetch OSRM distance in parallel with timeouts/error handling
    const recommendations = await Promise.all(
        topWorkers.map(async (item) => {
            let drivingDistance = null;
            let drivingTime = null;

            try {
                const { default: axios } = await import("axios");
                const url = `http://router.project-osrm.org/route/v1/driving/${item.worker.locationCoords.lng},${item.worker.locationCoords.lat};${task.locationCoords.lng},${task.locationCoords.lat}?overview=false`;
                const response = await axios.get(url, { timeout: 3000 });
                if (response.data && response.data.routes && response.data.routes.length > 0) {
                    const route = response.data.routes[0];
                    drivingDistance = parseFloat((route.distance / 1000).toFixed(2)); // in km
                    drivingTime = Math.ceil(route.duration / 60); // in minutes
                }
            } catch (error) {
                console.error(`OSRM Routing Error for worker ${item.worker._id}:`, error.message);
            }

            return {
                ...item,
                drivingDistance,
                drivingTime
            };
        })
    );

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: {
            taskLocation: task.locationCoords,
            recommendations
        }
    });
});
