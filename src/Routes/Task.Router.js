import { Router } from "express";
import { verifyToken } from "../Middlewares/verifytoken.js";
import { taskValidationSchema } from "../Modules/Task/task.validation.js";
import { createTask } from "../Modules/Task/task.controller.js";

const router = Router();

router.post("/", verifyToken, taskValidationSchema, createTask);

export default router;
