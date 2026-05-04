import mongoose from "mongoose";
import { TaskStatus } from "../Utils/enums/taskStatus.js";

const taskSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: [true, "Customer ID is required"]
    },
    workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    title: {
        type: String,
        required: [true, "Task title is required"],
        trim: true,
        minLength: [5, "Title must be at least 5 characters"],
        maxLength: [100, "Title cannot exceed 100 characters"]
    },
    description: {
        type: String,
        required: [true, "Task description is required"],
        trim: true,
        minLength: [10, "Description must be at least 10 characters"]
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: [true, "Category ID is required"]
    },
    budget: {
        type: Number,
        required: [true, "Budget is required"],
        min: [1, "Budget must be a positive number"]
    },
    location: {
        type: String,
        required: [true, "Location is required"],
        trim: true
    },
    locationCoords: {
        lat: { type: Number },
        lng: { type: Number }
    },
    status: {
        type: String,
        enum: Object.values(TaskStatus),
        default: TaskStatus.OPEN
    },
    images: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

const Task = mongoose.model("Task", taskSchema);

export default Task;
