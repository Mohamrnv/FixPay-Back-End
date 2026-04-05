import Category from "../../Models/Category.model.js";
import { AppError } from "../../Utils/Errors/AppError.js";
import * as httpStatus from "../../Utils/Http/httpStatusText.js";
import { validationResult } from "express-validator";

export const getAllCategories = async (req, res, next) => {
    try {
        const categories = await Category.find({}, { __v: 0 });
        res.status(200).json({
            status: httpStatus.SUCCESS,
            data: { categories }
        });
    } catch (error) {
        next(new AppError(error.message, 500, httpStatus.ERROR));
    }
};

export const getCategoryById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id, { __v: 0 });
        if (!category) {
            return next(new AppError("Category not found", 404, httpStatus.FAIL));
        }
        res.status(200).json({
            status: httpStatus.SUCCESS,
            data: { category }
        });
    } catch (error) {
        next(new AppError("Invalid ID or Category not found", 400, httpStatus.FAIL));
    }
};

export const createCategory = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new AppError("Validation Error", 400, httpStatus.FAIL, errors.array()));
        }

        const { name } = req.body;
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return next(new AppError("Category already exists", 400, httpStatus.FAIL));
        }

        const newCategory = new Category({ name });
        await newCategory.save();

        res.status(201).json({
            status: httpStatus.SUCCESS,
            data: { category: newCategory }
        });
    } catch (error) {
        next(new AppError(error.message, 500, httpStatus.ERROR));
    }
};
