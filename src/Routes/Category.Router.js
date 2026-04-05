import { Router } from "express";
import { verifyToken } from "../Middlewares/verifytoken.js";
import { allowedTo } from "../Middlewares/allowedTo.js";
import { Roles } from "../Utils/enums/usersRoles.js";
import { createCategorySchema } from "../Modules/Category/category.validation.js";
import {
    getAllCategories,
    getCategoryById,
    createCategory,
    getAllWorkersByCategory
} from "../Modules/Category/category.controller.js";

const router = Router();

router.get("/", verifyToken, getAllCategories);
router.get("/:id/workers", verifyToken, getAllWorkersByCategory);
router.get("/:id", verifyToken, getCategoryById);


router.post(
    "/",
    verifyToken,
    allowedTo(Roles.admin),
    createCategorySchema,
    createCategory
);

export default router;
