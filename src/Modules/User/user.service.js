import User from "../../Models/User.model.js";
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AppError } from "../../Utils/Errors/AppError.js";
import { generateHash, CompareHash, hashPII, comparePII } from '../../Utils/Encrypt/hashing.js';
import { OtpTypesEnum } from "../../Utils/enums/usersRoles.js";
import { ServiceErrorsEnum } from "../../Utils/Errors/errormessages/UserServiceErrors.js";

const getAllUsersService = async () => {
    return await User.find().select("+ssn +googleId").populate('categoryId', 'name');
};

const getUserByIdService = async (id) => {
    return await User.findById(id).select("+ssn +googleId").populate('categoryId', 'name');
};
const findUserByService = async (query) => {

    if (query.id && !query.email && !query.phoneNumber && !query.userName && !query.ssn) {
        return await User.findById(query.id);
    }

    const searchConditions = [];

    if (query.email) searchConditions.push({ email: query.email });
    if (query.phoneNumber) searchConditions.push({ phoneNumber: query.phoneNumber });
    if (query.userName) searchConditions.push({ userName: query.userName });
    if (query.ssn) searchConditions.push({ ssn: query.ssn });

    if (searchConditions.length === 0) return null;

    return await User.findOne({ $or: searchConditions });
};
const registerService = async (newUserData) => {
    const user = await User.create(newUserData);
    const cleanUser = await User.findById(user._id, {
        password: 0,
        __v: 0
    }).populate('categoryId', 'name');

    return cleanUser;
};

const loginService = async (email) => {
    const user = await User.findOne({ email }).select("+password");
    return user;
};

const editUserService = async (id, user) => {
    return await User.findByIdAndUpdate(id, { $set: user }, { new: true });
};

const forgotPasswordService = async (email) => {
    const user = await User.findOne({ email }).select("+resetPassword.createdAt +resetPassword.expiresAt");

    if (!user) {
        return { resetOtp: null, user: null };
    }

    if (!user.verifiedAt) {
        throw new Error("Email must be verified before requesting password reset");
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = generateHash(resetOtp);

    user.resetPassword = {
        value: hashedOtp,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        otpType: OtpTypesEnum.RESET_PASSWORD
    };

    await user.save();
    return { resetOtp, user };
};


const resetPasswordService = async (email, otp, newPassword) => {
    const user = await User.findOne({ email }).select("+password +resetPassword.value +resetPassword.otpType +resetPassword.expiresAt");

    if (!user || !user.resetPassword?.value) {
        throw new Error("Invalid or expired OTP");
    }

    if (user.resetPassword.expiresAt < Date.now()) {
        throw new Error("OTP has expired");
    }

    if (user.resetPassword.otpType !== OtpTypesEnum.RESET_PASSWORD) {
        throw new Error("Invalid OTP type");
    }

    const isValidOtp = await CompareHash(otp, user.resetPassword.value);

    if (!isValidOtp) {
        throw new Error("Invalid OTP");
    }

    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
        throw new Error("New password must be different from the old password");
    }

    user.password = await bcrypt.hash(newPassword, 10);

    user.resetPassword = undefined;

    await user.save();

    return user;
};

const suspendUserService = async (id, suspendUntil, suspensionReason, isPermanent = false) => {
    const updateData = {
        suspensionReason: suspensionReason
    };

    if (isPermanent) {
        updateData.isBanned = true;
        updateData.bannedAt = new Date();
        updateData.banReason = suspensionReason;
    } else {
        updateData.suspendedUntil = new Date(suspendUntil);
        updateData.isBanned = false; // Ensure it's unbanned if setting a temporary suspension
    }

    return await User.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};

export {
    getAllUsersService,
    getUserByIdService,
    registerService,
    loginService,
    editUserService,
    forgotPasswordService,
    resetPasswordService,
    findUserByService,
    suspendUserService
};
