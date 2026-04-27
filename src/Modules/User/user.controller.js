import { validationResult } from "express-validator";
import User from "../../Models/User.model.js";
import Jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import 'dotenv/config';
import { asyncWrapper } from "../../Utils/Errors/ErrorWrapper.js";
import * as httpStatus from "../../Utils/Http/httpStatusText.js";
import * as httpMessage from "../../Utils/Http/HttpDataText.js";
import { AppError } from "../../Utils/Errors/AppError.js";
import * as Services from "./user.service.js";
import { generateHash, CompareHash } from '../../Utils/Encrypt/hashing.js';
import { OtpTypesEnum, Roles } from '../../Utils/enums/usersRoles.js';
import { localEmmiter, htmlOtpTemp, htmlResetPasswordOtpTemp } from '../../Utils/Services/sendEmail.service.js';
import blackListedTokenModel from '../../Models/blackListedToken.model.js';
import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from "nanoid";
import cloudinary from "../../Utils/cloud/cloudinary.js";
import fs from "fs";
import { ServiceErrorsEnum } from "../../Utils/Errors/errormessages/UserServiceErrors.js";
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import axios from "axios";
import FormData from "form-data";
const generateOtp = customAlphabet('0123456789', 6);
const PYTHON_API_URL = process.env.PYTHON_API_URL ?? "http://localhost:5000";
const verifyIdentity = asyncWrapper(async (req, res, next) => {
    const { id_image, live_image } = req.files;
    if (!id_image || !live_image) return next(new AppError("Images required", 400));

    // Fetch user from DB to get sensitive data (SSN, DOB) which aren't in the token
    const user = await User.findById(req.currentUser._id).select("+ssn +dateOfBirth");
    if (!user) return next(new AppError("User not found", 404));

    try {
        const form = new FormData();
        form.append("id_image", id_image[0].buffer, { filename: "id.jpg" });
        form.append("live_image", live_image[0].buffer, { filename: "live.jpg" });

        const { data } = await axios.post(`${PYTHON_API_URL}/verify`, form, {
            headers: form.getHeaders(),
            timeout: 40000
        });
        
        const isSsnMatch = String(user.ssn).trim() === String(data.extracted_data.national_id).trim();

        const userBirthDate = new Date(user.dateOfBirth).toISOString().split('T')[0];
        const isBirthMatch = userBirthDate === data.extracted_data.birth_date;

        const isOverallValid = data.match && isSsnMatch && isBirthMatch;

        const updateData = isOverallValid ? {
            "identityVerification.status": "verified",
            "identityVerification.verifiedAt": new Date(),
            "identityVerification.similarity": data.similarity,
            "identityVerification.liveness": data.liveness,
            "identityVerification.failReason": null
        } : {
            "identityVerification.status": "failed",
            "identityVerification.failReason": !isSsnMatch ? "ID Number Mismatch" : "Face Mismatch"
        };

        await User.findByIdAndUpdate(req.currentUser._id, updateData);

        return res.status(200).json({
            status: "success",
            match: isOverallValid,
            details: { ssnMatch: isSsnMatch, faceMatch: data.match }
        });

    } catch (err) {
        return next(new AppError("Verification Service Error", 503));
    }
});

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);
const googleLogin = asyncWrapper(async (req, res, next) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Google token is required' });
    }

    const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const {
        sub: googleId,
        email,
        given_name,
        family_name,
        picture,
        email_verified
    } = payload;

    let user = await User.findOne({ email });
    if (user) {
        if (!user.googleId) {
            user.googleId = googleId;
            if (!user.avatar) user.avatar = picture;
            if (!user.verifiedAt && email_verified) user.verifiedAt = Date.now();
            await user.save();
        }
    } else {
        const baseUserName = email.split('@')[0];
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const uniqueUserName = `${baseUserName}${randomSuffix}`;

        user = new User({
            googleId,
            name: {
                first: given_name,
                last: family_name || ''
            },
            userName: uniqueUserName,
            email,
            avatar: picture,
            verifiedAt: email_verified ? Date.now() : null,
            role: 'user'
        });
        await user.save();
    }

    const systemToken = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_KEY,
        { expiresIn: '30d' }
    );

    const needsPhoneNumber = user.phoneNumber ? false : true;
    const needsSSn = user.ssn ? false : true;
    res.status(200).json({
        message: 'Login successful',
        token: systemToken,
        needsPhoneNumber,
        needsSSn,
        user: {
            id: user._id,
            userName: user.userName,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            avatar: user.avatar,
            role: user.role
        },
    });
});
const completeProfile = asyncWrapper(async (req, res, next) => {
    const { phoneNumber, ssn } = req.body;
    const userId = req.currentUser._id;
    console.log({ user: req.currentUser });

    if (!phoneNumber) {
        return next(new AppError("Phone number is required", 400, httpStatus.FAIL));
    }
    if (!ssn) {
        return next(new AppError("Phone number is required", 400, httpStatus.FAIL));
    }
    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
        return next(new AppError("Phone number is already in use", 409, httpStatus.FAIL));
    }
    const existingSSN = await User.findOne({ ssn });
    if (existingSSN) {
        return next(new AppError("SSN is already in use", 409, httpStatus.FAIL));
    }
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { phoneNumber: phoneNumber, ssn: ssn },
        { new: true, runValidators: true }
    );

    if (!updatedUser) {
        return next(new AppError("User not found", 404, httpStatus.FAIL));
    }
    res.status(200).json({
        status: httpStatus.SUCCESS,
        message: 'Profile completed successfully',
        data: {
            user: {
                _id: updatedUser._id,
                userName: updatedUser.userName,
                name: updatedUser.name,
                email: updatedUser.email,
                phoneNumber: updatedUser.phoneNumber,
                ssn: updatedUser.ssn,
                avatar: updatedUser.avatar,
                role: updatedUser.role
            }
        }
    });
});
const getAllUsers = asyncWrapper(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new AppError(httpMessage.BAD_REQUEST, 400, httpStatus.FAIL, errors.array())
        );
    }

    const users = await Services.getAllUsersService();

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: { users },
    });
});
const getUserById = asyncWrapper(async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        return next(new AppError(httpMessage.BAD_REQUEST, 400, httpStatus.FAIL));
    }
    const user = await Services.getUserByIdService(id);

    if (!user) {
        return next(new AppError(httpMessage.NOT_FOUND, 404, httpStatus.FAIL));
    }

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: user,
    });
});
const register = asyncWrapper(async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError("Validation failed", 400, httpStatus.FAIL, errors.array()));

    const { name, userName, dateOfBirth, gender, phoneNumber, email, password, role, avatar, ssn, address, categoryId } = req.body;

    const existingUser = await Services.findUserByService({ email, phoneNumber, userName, ssn });

    if (existingUser) {
        return next(new AppError("Registration failed. Information unavailable.", 400, httpStatus.FAIL));
    }


    let parsedDateOfBirth = null;
    if (dateOfBirth) {
        const [day, month, year] = dateOfBirth.split("-");
        parsedDateOfBirth = new Date(year, month - 1, day);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const otp = generateOtp();
    const hashOtp = generateHash(otp);

    if (process.env.NODE_ENV !== 'production') {
        console.log(' Registration OTP:', otp);
    }

    const newUser = new User({
        name: {
            first: name.first.trim(),
            last: name.last.trim()
        },
        userName: userName.trim(),
        dateOfBirth: parsedDateOfBirth,
        gender,
        phoneNumber: phoneNumber,
        email: email,
        password: hashedPassword,
        role,
        avatar,
        ssn,
        address: address ? {
            government: address.government?.trim(),
            city: address.city?.trim(),
            street: address.street?.trim()
        } : undefined,
        otp: {
            value: hashOtp,
            createdAt: new Date(),
            expiresAt: Date.now() + (10 * 60 * 1000),
            otpType: OtpTypesEnum.CONFIRMATION
        },
        categoryId: role === Roles.worker ? categoryId : undefined
    });

    try {
        const user = await Services.registerService(newUser);

        const token = Jwt.sign(
            { email: user.email, _id: user._id, role: user.role, jti: uuidv4() },
            process.env.JWT_KEY,
            { expiresIn: '30m' }
        );

        localEmmiter.emit('sendEmail', {
            to: user.email,
            subject: "OTP for Account Verification",
            content: htmlOtpTemp(otp)
        });

        res.status(201).json({
            status: httpStatus.SUCCESS,
            message: "Registration successful. Please verify your email.",
            data: {
                user: {
                    _id: user._id,
                    email: user.email,
                    userName: user.userName,
                    role: user.role
                },
                token: token
            }
        });

    } catch (err) {
        if (err.code === 11000) {
            const errorMessage = process.env.NODE_ENV === 'production'
                ? "Registration failed. Please review your information."
                : `Duplicate field error: ${Object.keys(err.keyValue)[0]}`;
            return next(new AppError(errorMessage, 400, httpStatus.FAIL));
        }
        next(err);
    }
});
const login = asyncWrapper(async (req, res, next) => {
    const { email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new AppError(httpMessage.BAD_REQUEST, 400, httpStatus.FAIL, errors.array()));
    }
    const user = await Services.loginService(email);

    if (!user) {
        return next(new AppError("Invalid email or password", 401, httpStatus.FAIL));
    }

    const passwordMatched = await bcrypt.compare(password, user.password);

    if (passwordMatched) {
        const token = Jwt.sign(
            { email: user.email, _id: user._id, role: user.role, jti: uuidv4() },
            process.env.JWT_KEY,
            { expiresIn: '30m' }
        );

        if (user.suspendedUntil && user.suspendedUntil > Date.now()) {
            return next(
                new AppError(
                    `Your account is suspended until ${user.suspendedUntil.toLocaleString()}. Reason: ${user.suspensionReason || 'No reason provided'}`,
                    403,
                    httpStatus.FAIL
                )
            );
        }

        if (user.deleted) {
            if (Date.now() <= user.restoreUntil.getTime()) {

                const restored = await Services.restoreDeletedUserService(user._id);
                if (!restored) {
                    return next(new AppError("Invalid email or password", 401, httpStatus.FAIL));
                }
            } else {

                return next(
                    new AppError("Your account can no longer be restored", 403, httpStatus.FAIL)
                );
            }
        }

        return res.status(200).json({
            status: httpStatus.SUCCESS,
            data: user.email,
            message: "successfully signed",
            token: token
        });
    }

    return res.status(400).json({
        status: httpStatus.FAIL,
        data: null,
        message: "email and password doesn't match",
        details: null
    });
});
const confirmEmail = asyncWrapper(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(
            new AppError(
                httpMessage.BAD_REQUEST,
                400,
                httpStatus.FAIL,
                errors.array()
            )
        );
    }

    const { otp } = req.body;
    const user = await User.findById(req.currentUser._id).select("+otp");

    if (!user) {
        return next(
            new AppError("User not found", 404, httpStatus.FAIL)
        );
    }

    if (user.verifiedAt) {
        return next(
            new AppError("Email is already verified", 400, httpStatus.FAIL)
        );
    }


    if (user.otp.expiresAt < Date.now()) {
        return next(
            new AppError("OTP has expired. Please request a new one", 400, httpStatus.FAIL)
        );
    }

    if (user.otp.otpType !== OtpTypesEnum.CONFIRMATION) {
        return next(
            new AppError("Invalid OTP type", 400, httpStatus.FAIL)
        );
    }

    const isOtpMatch = await CompareHash(otp, user.otp.value);

    if (!isOtpMatch) {
        return next(
            new AppError("Invalid OTP", 401, httpStatus.FAIL)
        );
    }

    await User.findByIdAndUpdate(
        user._id,
        {
            verifiedAt: Date.now(),
            $unset: { otp: "" }
        }
    );

    return res.status(200).json({
        status: httpStatus.SUCCESS,
        message: "Your email has been verified successfully",
    });
});
const resendConfirmationOtp = asyncWrapper(async (req, res, next) => {
    const RESEND_COOLDOWN_MS = 60 * 1000;

    const user = await User.findById(req.currentUser._id).select("+otp");

    if (!user) {
        return next(new AppError("User not found", 404, httpStatus.FAIL));
    }

    if (user.verifiedAt) {
        return next(new AppError("Email is already verified", 400, httpStatus.FAIL));
    }

    if (user.otp?.createdAt && user.otp?.expiresAt > Date.now()) {
        const timeSince = Date.now() - new Date(user.otp.createdAt).getTime();

        if (timeSince < RESEND_COOLDOWN_MS) {
            const timeLeft = Math.ceil((RESEND_COOLDOWN_MS - timeSince) / 1000);
            return next(
                new AppError(
                    `Please wait ${timeLeft} seconds before requesting a new OTP.`,
                    429,
                    httpStatus.FAIL
                )
            );
        }
    }

    const otp = generateOtp();
    const hashedOtp = generateHash(otp);

    if (process.env.NODE_ENV !== "production") {
        console.log("New Confirmation OTP:", otp);
    }

    user.otp = {
        value: hashedOtp,
        createdAt: new Date(),
        expiresAt: Date.now() + 10 * 60 * 1000,
        otpType: OtpTypesEnum.CONFIRMATION,
    };

    await user.save();

    localEmmiter.emit("sendEmail", {
        to: user.email,
        subject: "Your New Account Verification OTP",
        content: htmlOtpTemp(otp),
    });

    return res.status(200).json({
        status: httpStatus.SUCCESS,
        message: "A new verification OTP has been sent to your email.",
    });
});
const logout = asyncWrapper(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new AppError(httpMessage.BAD_REQUEST, 400, httpStatus.FAIL, errors.array())
        );
    }
    const token = req.currentUser
    console.log({ tokenJTI: token.jti });

    const data = await blackListedTokenModel.create({
        tokenId: req.currentUser.jti,
        expiresAt: new Date(Date.now())
    });

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: data,
        message: "logged out successfully"
    });
});
const editUser = asyncWrapper(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new AppError(httpMessage.BAD_REQUEST, 400, httpStatus.FAIL, errors.array())
        );
    }

    const { id } = req.params;
    const { body } = req;
    if (!id || !body) {
        return next(new AppError(httpMessage.BAD_REQUEST, 400, httpStatus.FAIL));
    }
    const updated = await Services.editUserService(id, body);

    if (!updated) {
        return next(new AppError(httpMessage.NOT_FOUND, 404, httpStatus.FAIL));
    }

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: updated,
    });
});
const deleteUser = asyncWrapper(async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        return next(new AppError(httpMessage.BAD_REQUEST, 400, httpStatus.FAIL));
    }
    const deleted = await Services.deleteUserService(id);

    if (!deleted) {
        return next(new AppError(httpMessage.NOT_FOUND, 404, httpStatus.FAIL));
    }
    const token = req.currentUser
    console.log({ tokenJTI: token.jti });

    const data = await blackListedTokenModel.create({
        tokenId: req.currentUser.jti,
        expiresAt: new Date(Date.now())
    });

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: deleted,
        token: data,
        days: "you have 30 days to restore your account",
        restore_until: deleted.restoreUntil
    });
});
const restoreDeletedAccount = asyncWrapper(async (req, res, next) => {
    const userId = req.currentUser._id;
    const restored = Services.restoreDeletedUserService(userId);

    if (!restored) return next(new AppError(httpMessage.NOT_FOUND, 404, httpStatus.NOT_FOUND));

    return res.status(200).json({
        status: httpStatus.SUCCESS,
        message: "Your account has been restored successfully",
        data: {
            _id: restored._id,
            email: restored.email,
            userName: restored.userName
        }
    });
});
const forgotPassword = asyncWrapper(async (req, res, next) => {
    const errors = validationResult(req);
    const STRICT_COOLDOWN_MS = 60 * 1000;
    const { email } = req.body;

    if (!errors.isEmpty()) {
        return next(
            new AppError(httpMessage.BAD_REQUEST, 400, httpStatus.FAIL, errors.array())
        );
    }

    const existingUser = await User.findOne({ email }).select("+resetPassword");

    if (existingUser && existingUser.resetPassword?.createdAt) {


        const otpExpired = existingUser.resetPassword.expiresAt &&
            existingUser.resetPassword.expiresAt < Date.now();

        if (!otpExpired) {
            const lastRequestTime = new Date(existingUser.resetPassword.createdAt).getTime();
            const timeSinceLastRequest = Date.now() - lastRequestTime;

            if (timeSinceLastRequest < STRICT_COOLDOWN_MS) {
                const timeLeft = Math.ceil((STRICT_COOLDOWN_MS - timeSinceLastRequest) / 1000);
                return next(
                    new AppError(
                        `Password reset requested too soon. Please wait ${timeLeft} seconds.`,
                        429,
                        httpStatus.FAIL
                    )
                );
            }
        }
    }

    try {
        const { resetOtp, user } = await Services.forgotPasswordService(email);

        if (!user) {
            return res.status(200).json({
                status: httpStatus.SUCCESS,
                message: "If the email exists and is verified, a reset OTP has been sent"
            });
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log("🔑 Reset Password OTP:", resetOtp);
        }

        localEmmiter.emit('sendEmail', {
            to: email,
            subject: "إعادة تعيين كلمة المرور",
            content: htmlResetPasswordOtpTemp(resetOtp)
        });

        return res.status(200).json({
            status: httpStatus.SUCCESS,
            message: "Reset OTP has been sent to your email"
        });

    } catch (error) {
        if (error.message === "Email must be verified before requesting password reset") {
            return next(new AppError("Please verify your email before requesting a password reset", 403, httpStatus.FAIL));
        }

        console.error("Forgot password error:", error);
        return next(new AppError("An error occurred while processing your request", 500, httpStatus.ERROR));
    }
});
const resetPassword = asyncWrapper(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new AppError(httpMessage.BAD_REQUEST, 400, httpStatus.FAIL, errors.array())
        );
    }

    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return next(new AppError("Email, OTP and new password are required", 400, httpStatus.FAIL));
    }

    try {
        await Services.resetPasswordService(email, otp, newPassword);

        res.status(200).json({
            status: httpStatus.SUCCESS,
            message: "Password reset successfully"
        });
    } catch (error) {
        return next(new AppError(error.message, 400, httpStatus.FAIL));
    }
});
const resendResetPasswordOtp = asyncWrapper(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new AppError(httpMessage.BAD_REQUEST, 400, httpStatus.FAIL, errors.array())
        );
    }

    const { email } = req.body;
    const RESEND_COOLDOWN_MS = 60 * 1000;

    const user = await User.findOne({ email }).select("+resetPassword");

    if (!user) {
        return res.status(200).json({
            status: httpStatus.SUCCESS,
            message: "If the email exists and is verified, a reset OTP has been sent."
        });
    }

    if (user.resetPassword?.createdAt && user.resetPassword?.expiresAt > Date.now()) {
        const timeSince = Date.now() - new Date(user.resetPassword.createdAt).getTime();

        if (timeSince < RESEND_COOLDOWN_MS) {
            const timeLeft = Math.ceil((RESEND_COOLDOWN_MS - timeSince) / 1000);
            return next(
                new AppError(
                    `Please wait ${timeLeft} seconds before requesting a new OTP.`,
                    429,
                    httpStatus.FAIL
                )
            );
        }
    }

    try {
        const { resetOtp, user: updatedUser } = await Services.forgotPasswordService(email);

        if (!updatedUser) {
            return res.status(200).json({
                status: httpStatus.SUCCESS,
                message: "If the email exists and is verified, a reset OTP has been sent."
            });
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log('Resent Password OTP:', resetOtp);
        }

        localEmmiter.emit('sendEmail', {
            to: email,
            subject: "إعادة تعيين كلمة المرور",
            content: htmlResetPasswordOtpTemp(resetOtp)
        });

        return res.status(200).json({
            status: httpStatus.SUCCESS,
            message: "New reset OTP has been sent to your email."
        });

    } catch (error) {
        if (error.message === "Email must be verified before requesting password reset") {
            return next(
                new AppError("Please verify your email before requesting a password reset", 403, httpStatus.FAIL)
            );
        }

        console.error("Resend password error:", error);
        return next(new AppError("An error occurred while processing your request", 500, httpStatus.ERROR));
    }
});
const profileImage = asyncWrapper(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError("No file uploaded", 400, httpStatus.FAIL));
    }

    const localFilePath = req.file.path;
    const result = await cloudinary.uploader.upload(localFilePath, {
        folder: `FixPay/users/${req.currentUser._id}`

    });

    //  fs.unlink(localFilePath, () => {});

    console.log(result.secure_url);

    const user = await User.findByIdAndUpdate(
        req.currentUser._id,
        { avatar: result.secure_url },
        { new: true }
    );

    return res.status(200).json({
        message: "Profile image updated successfully",
        file: user
    });
});
const assignAdmin = asyncWrapper(async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        return next(new AppError(httpMessage.BAD_REQUEST, 400, httpStatus.FAIL));
    }

    const updatedUser = await User.findByIdAndUpdate(
        id,
        { role: Roles.admin },
        { new: true, select: "-password -__v" }
    );

    if (!updatedUser) {
        return next(new AppError(httpMessage.NOT_FOUND, 404, httpStatus.FAIL));
    }

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: { user: updatedUser },
        message: "User promoted to admin successfully"
    });
});

const suspendUser = asyncWrapper(async (req, res, next) => {
    const { id } = req.params;
    const { suspendUntil, suspensionReason } = req.body;

    if (!id || !suspendUntil) {
        return next(new AppError("User ID and suspension end date are required", 400, httpStatus.FAIL));
    }

    const updatedUser = await Services.suspendUserService(id, suspendUntil, suspensionReason);

    if (!updatedUser) {
        return next(new AppError(httpMessage.NOT_FOUND, 404, httpStatus.FAIL));
    }

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: { user: updatedUser },
        message: `User suspended until ${new Date(suspendUntil).toLocaleString()}`
    });
});

export {
    getAllUsers,
    getUserById,
    register,
    editUser,
    login,
    deleteUser,
    confirmEmail,
    resendConfirmationOtp,
    logout,
    forgotPassword,
    resetPassword,
    resendResetPasswordOtp,
    profileImage,
    restoreDeletedAccount,
    assignAdmin,
    googleLogin,
    completeProfile,
    verifyIdentity,
    suspendUser
};
