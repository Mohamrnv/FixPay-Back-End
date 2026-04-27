import Jwt from "jsonwebtoken";
import { AppError } from "../Utils/Errors/AppError.js";  // Update this path
import * as httpStatus from "../Utils/Http/httpStatusText.js";  // Update this path
import blackListedTokenModel from '../Models/blackListedToken.model.js'
import User from '../Models/User.model.js';

export const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader) {
            return next(new AppError("The token is required", 401, httpStatus.FAIL));
        }

        if (!authHeader.startsWith("bearer ")) {
            return next(new AppError("The token is invalid", 401, httpStatus.FAIL));
        }

        const parts = authHeader.split(" ");
        if (parts.length !== 2 || !parts[1]) {
            return next(new AppError("The token is invalid", 401, httpStatus.FAIL));
        }

        const token = parts[1];

        const secret = process.env.JWT_KEY;
        if (!secret) {
            return next(new AppError("The server is not configured properly", 500, httpStatus.FAIL));
        }

        try {
            const decoded = Jwt.verify(token, secret);
            
            const isSessionEnded = await blackListedTokenModel.findOne({
                tokenId: decoded.jti
            });

            if (isSessionEnded) {
                return res.status(401).json({
                    status: "error",
                    message: "your session is ended"
                });
            }

            // Fetch user to check for current status (Deletion/Suspension)
            const user = await User.findById(decoded.userId || decoded._id);
            if (!user) {
                return next(new AppError("User no longer exists", 401, httpStatus.FAIL));
            }

            if (user.deleted) {
                return next(new AppError("This account has been deleted", 403, httpStatus.FAIL));
            }

            if (user.suspendedUntil && user.suspendedUntil > Date.now()) {
                return next(
                    new AppError(
                        `Account suspended until ${user.suspendedUntil.toLocaleString()}. Reason: ${user.suspensionReason || 'No reason provided'}`,
                        403,
                        httpStatus.FAIL
                    )
                );
            }

            req.currentUser = user.toObject();
            req.currentUser.jti = decoded.jti; // Preserve JTI for blacklisting logic
            req.currentUser.role = decoded.role; // Ensure role is accessible directly

            next();
        } catch (err) {
            return next(new AppError("The token is invalid", 401, httpStatus.FAIL));
        }
    } catch (error) {
        return next(new AppError("An error occurred while verifying the token", 500, httpStatus.FAIL));
    }
};
