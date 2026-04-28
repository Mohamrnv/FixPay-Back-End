import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: [true, "Sender ID is required"]
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: [true, "Receiver ID is required"]
    },
    content: {
        type: String,
        required: [true, "Message content is required"],
        trim: true
    },
    readAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for fast retrieval of conversation history between two users
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, senderId: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
