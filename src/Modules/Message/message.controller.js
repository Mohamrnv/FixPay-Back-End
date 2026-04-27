import Message from "../../Models/Message.model.js";
import Task from "../../Models/Task.model.js";
import Offer from "../../Models/Offer.model.js";
import { AppError } from "../../Utils/Errors/AppError.js";
import * as httpStatus from "../../Utils/Http/httpStatusText.js";
import { asyncWrapper } from "../../Utils/Errors/ErrorWrapper.js";

/**
 * Send a message within the context of a task
 * Only task owners and workers with active offers can chat
 */
export const sendMessage = asyncWrapper(async (req, res, next) => {
    const { taskId, receiverId, content } = req.body;
    const senderId = req.currentUser._id;

    if (!taskId || !receiverId || !content) {
        return next(new AppError("Task ID, Receiver ID, and Content are required", 400, httpStatus.FAIL));
    }

    // 1. Verify Task exists
    const task = await Task.findById(taskId);
    if (!task) return next(new AppError("Task not found", 404, httpStatus.FAIL));

    // 2. Authorization Security Check
    // The sender must be either the Task owner or the Worker
    const isOwner = task.customerId.toString() === senderId.toString();
    const isReceiverOwner = task.customerId.toString() === receiverId.toString();

    // Ensure worker has an offer before starting chat
    const workerId = isOwner ? receiverId : senderId;
    const offer = await Offer.findOne({ taskId, workerId });

    if (!offer) {
        return next(new AppError("Chat is only allowed after an offer has been submitted", 403, httpStatus.FAIL));
    }

    const newMessage = new Message({
        taskId,
        senderId,
        receiverId,
        content
    });

    await newMessage.save();

    res.status(201).json({
        status: httpStatus.SUCCESS,
        data: { message: newMessage }
    });
});

/**
 * Get conversation history between two users for a specific task
 */
export const getConversation = asyncWrapper(async (req, res, next) => {
    const { taskId, otherUserId } = req.params;
    const currentUserId = req.currentUser._id;

    if (!taskId || !otherUserId) {
        return next(new AppError("Task ID and Other User ID are required", 400, httpStatus.FAIL));
    }

    const messages = await Message.find({
        taskId,
        $or: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId }
        ]
    }).sort({ createdAt: 1 });

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: { messages }
    });
});
