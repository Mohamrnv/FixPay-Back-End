import mongoose from "mongoose";
import { OfferStatus } from "../Utils/enums/offerStatus.js";

import { encrypt, decrypt } from "../Utils/Encrypt/crypt.js";

const offerSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: [true, "Task ID is required"]
    },
    workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: [true, "Worker ID is required"]
    },
    price: {
        type: Number,
        required: [true, "Price is required"],
        min: [1, "Price must be at least 1"]
    },
    message: {
        type: String,
        required: [true, "Message is required"],
        trim: true,
        minLength: [5, "Message must be at least 5 characters"],
        set: (v) => encrypt(v),
        get: (v) => decrypt(v)
    },
    status: {
        type: String,
        enum: Object.values(OfferStatus),
        default: OfferStatus.PENDING
    },
    negotiationHistory: [{
        price: { type: Number, required: true },
        message: { type: String },
        bidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;
