import { body } from "express-validator";

export const offerValidationSchema = [
    body("taskId")
        .notEmpty().withMessage("Task ID is required")
        .isMongoId().withMessage("Invalid Task ID"),
    body("price")
        .notEmpty().withMessage("Price is required")
        .isNumeric().withMessage("Price must be a number")
        .custom((value) => value > 0).withMessage("Price must be a positive number"),
    body("message")
        .notEmpty().withMessage("Message is required")
        .isLength({ min: 5 }).withMessage("Message must be at least 5 characters")
];
