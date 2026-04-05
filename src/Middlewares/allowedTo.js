import { AppError } from "../Utils/Errors/AppError.js";
import * as httpStatus from "../Utils/Http/httpStatusText.js";

export const allowedTo = (...roles) => {
    return (req, res, next) => {
        const isOwner = req.params.id && req.currentUser._id.toString() === req.params.id;
        const hasRole = roles.includes(req.currentUser.role);

        if (!isOwner && !hasRole) {
            return next(new AppError("You do not have permission to perform this action", 403, httpStatus.FAIL));
        }
        next();
    };
};
