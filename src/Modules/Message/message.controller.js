import Message from "../../Models/Message.model.js";
import User from "../../Models/User.model.js";
import { AppError } from "../../Utils/Errors/AppError.js";
import * as httpStatus from "../../Utils/Http/httpStatusText.js";
import { asyncWrapper } from "../../Utils/Errors/ErrorWrapper.js";

/**
 * Send a direct message to a user
 */
export const sendMessage = asyncWrapper(async (req, res, next) => {
    const { receiverId, content } = req.body;
    const senderId = req.currentUser._id;

    if (!receiverId || !content) {
        return next(new AppError("Receiver ID and Content are required", 400, httpStatus.FAIL));
    }

    // Prevent sending messages to oneself
    if (senderId.toString() === receiverId.toString()) {
        return next(new AppError("You cannot send a message to yourself", 400, httpStatus.FAIL));
    }

    // Verify Receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) return next(new AppError("Receiver not found", 404, httpStatus.FAIL));

    const newMessage = new Message({
        senderId,
        receiverId,
        content
    });

    await newMessage.save();

    // ── Real-Time Socket Notification ──
    const { getIO, getSocketId } = await import("../../socket/socket.js");
    const receiverSocketId = getSocketId(receiverId);

    if (receiverSocketId) {
        getIO().to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json({
        status: httpStatus.SUCCESS,
        data: { message: newMessage }
    });
});

/**
 * Get conversation history between current user and another user
 */
export const getConversation = asyncWrapper(async (req, res, next) => {
    const { otherUserId } = req.params;
    const currentUserId = req.currentUser._id;

    if (!otherUserId) {
        return next(new AppError("Other User ID is required", 400, httpStatus.FAIL));
    }

    const messages = await Message.find({
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
