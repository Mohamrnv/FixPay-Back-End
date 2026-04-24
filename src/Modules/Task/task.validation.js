import { body } from "express-validator";

export const taskValidationSchema = [
    body("title")
        .notEmpty().withMessage("Task title is required")
        .isLength({ min: 5 }).withMessage("Title must be at least 5 characters")
        .isLength({ max: 100 }).withMessage("Title cannot exceed 100 characters"),
    body("description")
        .notEmpty().withMessage("Task description is required")
        .isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),
    body("categoryId")
        .notEmpty().withMessage("Category ID is required")
        .isMongoId().withMessage("Invalid Category ID"),
    body("budget")
        .notEmpty().withMessage("Budget is required")
        .isNumeric().withMessage("Budget must be a number")
        .custom((value) => value > 0).withMessage("Budget must be a positive number"),
    body("location")
        .notEmpty().withMessage("Location is required")
];
