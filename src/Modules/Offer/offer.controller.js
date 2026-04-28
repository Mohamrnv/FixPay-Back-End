import Offer from "../../Models/Offer.model.js";
import Task from "../../Models/Task.model.js";
import User from "../../Models/User.model.js";
import { AppError } from "../../Utils/Errors/AppError.js";
import * as httpStatus from "../../Utils/Http/httpStatusText.js";
import { validationResult } from "express-validator";
import { asyncWrapper } from "../../Utils/Errors/ErrorWrapper.js";
import { TaskStatus } from "../../Utils/enums/taskStatus.js";
import { Roles } from "../../Utils/enums/usersRoles.js";
import { OfferStatus } from "../../Utils/enums/offerStatus.js";

// ... existing controllers ...

export const acceptOffer = asyncWrapper(async (req, res, next) => {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId);
    if (!offer) {
        return next(new AppError("Offer not found", 404, httpStatus.FAIL));
    }

    const task = await Task.findById(offer.taskId);
    if (!task) {
        return next(new AppError("Task related to this offer not found", 404, httpStatus.FAIL));
    }

    // Authorization: Only the owner of the task can accept offers
    if (task.customerId.toString() !== req.currentUser._id.toString()) {
        return next(new AppError("Not authorized to accept offers for this task", 403, httpStatus.FAIL));
    }

    if (task.status !== TaskStatus.OPEN) {
        return next(new AppError("Task is no longer open for accepting offers", 400, httpStatus.FAIL));
    }

    // Update statuses
    offer.status = OfferStatus.ACCEPTED;
    await offer.save();

    task.status = TaskStatus.ASSIGNED;
    task.workerId = offer.workerId;
    task.budget = offer.price; // Update task budget to the final agreed price
    await task.save();

    // Reject all other offers for this task
    await Offer.updateMany(
        { taskId: task._id, _id: { $ne: offerId } },
        { status: OfferStatus.REJECTED }
    );

    // Trigger Real-Time tracking socket event
    try {
        const { getIO, getSocketId } = await import("../../socket/socket.js");
        const io = getIO();
        const workerSocketId = getSocketId(offer.workerId);
        const customerSocketId = getSocketId(task.customerId);
        
        if (workerSocketId) {
            io.to(workerSocketId).emit("trackingStarted", { taskId: task._id, message: "Your offer was accepted, start tracking!" });
        }
        if (customerSocketId) {
            io.to(customerSocketId).emit("trackingStarted", { taskId: task._id, message: "Offer accepted, waiting for worker location!" });
        }
    } catch(err) {
        console.error("Socket error on trackingStart", err);
    }

    res.status(200).json({
        status: httpStatus.SUCCESS,
        message: "Offer accepted and worker assigned successfully at requested price",
        data: { task, acceptedOffer: offer }
    });
});

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

    const worker = await User.findById(workerId);
    let estimatedTime = null;
    let estimatedDistance = null;

    if (worker?.locationCoords?.lat && worker?.locationCoords?.lng && task?.locationCoords?.lat && task?.locationCoords?.lng) {
        try {
            const { default: axios } = await import("axios");
            const url = `http://router.project-osrm.org/route/v1/driving/${worker.locationCoords.lng},${worker.locationCoords.lat};${task.locationCoords.lng},${task.locationCoords.lat}?overview=false`;
            const response = await axios.get(url, { timeout: 5000 });
            if (response.data && response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                estimatedDistance = parseFloat((route.distance / 1000).toFixed(2)); // in km
                estimatedTime = Math.ceil(route.duration / 60); // in minutes
            }
        } catch (error) {
            console.error("OSRM Routing Error:", error.message);
        }
    }

    const newOffer = new Offer({
        taskId,
        workerId,
        price,
        message,
        estimatedTime,
        estimatedDistance,
        negotiationHistory: [{ price, message, bidBy: workerId }]
    });

    await newOffer.save();

    res.status(201).json({
        status: httpStatus.SUCCESS,
        data: { offer: newOffer }
    });
});

export const counterOffer = asyncWrapper(async (req, res, next) => {
    const { offerId } = req.params;
    const { price, message } = req.body;
    const customerId = req.currentUser._id;

    if (!price) return next(new AppError("Price is required for a counter-offer", 400, httpStatus.FAIL));

    const offer = await Offer.findById(offerId);
    if (!offer) return next(new AppError("Offer not found", 404, httpStatus.FAIL));

    const task = await Task.findById(offer.taskId);
    if (task.customerId.toString() !== customerId.toString()) {
        return next(new AppError("Only the task owner can counter an offer", 403, httpStatus.FAIL));
    }

    if (offer.status === OfferStatus.ACCEPTED || offer.status === OfferStatus.REJECTED) {
        return next(new AppError("Cannot counter an offer that has already been closed", 400, httpStatus.FAIL));
    }

    offer.price = price;
    offer.message = message || offer.message;
    offer.status = OfferStatus.COUNTERED;
    offer.negotiationHistory.push({ price, message, bidBy: customerId });

    await offer.save();

    res.status(200).json({
        status: httpStatus.SUCCESS,
        message: "Counter-offer sent to worker",
        data: { offer }
    });
});

export const respondToCounter = asyncWrapper(async (req, res, next) => {
    const { offerId } = req.params;
    const { price, message } = req.body;
    const workerId = req.currentUser._id;

    if (!price) return next(new AppError("Price is required to respond to a counter", 400, httpStatus.FAIL));

    const offer = await Offer.findById(offerId);
    if (!offer) return next(new AppError("Offer not found", 404, httpStatus.FAIL));

    if (offer.workerId.toString() !== workerId.toString()) {
        return next(new AppError("Only the worker who made the offer can respond", 403, httpStatus.FAIL));
    }

    if (offer.status !== OfferStatus.COUNTERED) {
        return next(new AppError("You can only respond to a countered offer", 400, httpStatus.FAIL));
    }

    offer.price = price;
    offer.message = message || offer.message;
    offer.status = OfferStatus.PENDING; 
    offer.negotiationHistory.push({ price, message, bidBy: workerId });

    await offer.save();

    res.status(200).json({
        status: httpStatus.SUCCESS,
        message: "Response sent to customer",
        data: { offer }
    });
});

export const getTaskOffers = asyncWrapper(async (req, res, next) => {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
        return next(new AppError("Task not found", 404, httpStatus.FAIL));
    }

    // Authorization: Only the owner of the task can view its offers
    if (task.customerId.toString() !== req.currentUser._id.toString() && req.currentUser.role !== Roles.admin) {
        return next(new AppError("Not authorized to view these offers", 403, httpStatus.FAIL));
    }

    const offers = await Offer.find({ taskId })
        .populate("workerId", "userName name avatar rating");

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: { offers }
    });
});
