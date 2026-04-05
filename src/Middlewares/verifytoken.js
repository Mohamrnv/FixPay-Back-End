import Jwt from "jsonwebtoken";
import { AppError } from "../Utils/Errors/AppError.js";  // Update this path
import * as httpStatus from "../Utils/Http/httpStatusText.js";  // Update this path
import blackListedTokenModel from '../Models/blackListedToken.model.js'
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
            req.currentUser = {
                ...decoded,
                _id: decoded.userId
            };

            console.log({ user: req.currentUser._id });

            next();
        } catch (err) {
            return next(new AppError("The token is invalid", 401, httpStatus.FAIL));
        }
    } catch (error) {
        return next(new AppError("An error occurred while verifying the token", 500, httpStatus.FAIL));
    }
};
