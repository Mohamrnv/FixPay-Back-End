import { AppError } from "../Utils/Errors/AppError.js";
import * as httpStatus from "../Utils/Http/httpStatusText.js";

export const allowedTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.currentUser.role)) {
            return next(new AppError("You do not have permission to perform this action", 403, httpStatus.FAIL));
        }
        next();
    };
};
