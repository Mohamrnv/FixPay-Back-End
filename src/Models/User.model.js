import mongoose from "mongoose";
import validator from "validator";
import { Roles } from "../Utils/enums/usersRoles.js";
import { OtpTypesEnum } from '../Utils/enums/usersRoles.js'
import { encrypt, decrypt } from "../Utils/Encrypt/crypt.js";

const usersSchema = new mongoose.Schema({
    name: {
        first: { type: String, set: (v) => encrypt(v), get: (v) => decrypt(v) },
        last: { type: String, set: (v) => encrypt(v), get: (v) => decrypt(v) }
    },
    userName: {
        type: String,
        unique: true,
        set: (v) => encrypt(v),
        get: (v) => decrypt(v)
    },
    dateOfBirth: {
        type: String,
        set: (v) => encrypt(v),
        get: (v) => decrypt(v)
    },
    gender: {
        type: Boolean // false = male, true = female
    },

    email: {
        type: String,
        unique: true,
        set: (v) => encrypt(v),
        get: (v) => decrypt(v)
    },
    password: {
        type: String,
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    role: {
        type: String,
        enum: [...Object.values(Roles)],
        default: Roles.user
    },
    avatar: {
        type: String
    },
    rating: {
        type: Number, //{1->5}
        default: 5
    },
    ssn: {
        type: String,
        unique: true,
        sparse: true,
        select: false,
        set: (v) => encrypt(v),
        get: (v) => decrypt(v)
    },
    address: {
        government: { type: String, set: (v) => encrypt(v), get: (v) => decrypt(v) },
        city: { type: String, set: (v) => encrypt(v), get: (v) => decrypt(v) },
        street: { type: String, set: (v) => encrypt(v), get: (v) => decrypt(v) },
    },
    locationCoords: {
        lat: { type: Number },
        lng: { type: Number }
    },
    otp: {
        value: { type: String, select: false },
        createdAt: { type: Date, select: false },
        expiresAt: { type: Date, select: false },
        otpType: {
            type: String,
            enum: [...Object.values(OtpTypesEnum)],
            select: false
        }
    }
    ,
    verifiedAt: {
        type: Date
    },
    resetPassword: {
        value: { type: String, select: false },
        createdAt: { type: Date, select: false },
        expiresAt: { type: Date, select: false },
        otpType: {
            type: String,
            enum: [...Object.values(OtpTypesEnum)],
            select: false
        }
    },
    deletedAt: {
        type: Date
    },
    restoreUntil: {
        type: Date
    },
    deleted: {
        type: Boolean,
        default: false
    },
    phoneNumber: {
        type: String,
        unique: true,
        sparse: true,
        set: (v) => encrypt(v),
        get: (v) => decrypt(v)
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
        select: false
    },
    identityVerification: {
        status: {
            type: String,
            enum: ["unverified", "pending", "verified", "failed"],
            default: "unverified"
        },
        similarity: { type: Number },
        confidence: { type: String },
        liveness: { type: Boolean },
        verifiedAt: { type: Date },
        failReason: { type: String },
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    suspendedUntil: {
        type: Date
    },
    suspensionReason: {
        type: String
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    bannedAt: {
        type: Date
    },
    banReason: {
        type: String
    }

}, {
    toJSON: { getters: true },
    toObject: { getters: true }
});

const User = mongoose.model("Users", usersSchema, "Users");
export default User;
