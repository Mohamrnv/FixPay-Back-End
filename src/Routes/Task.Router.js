import { Router } from "express";
import { verifyToken } from "../Middlewares/verifytoken.js";
import { taskValidationSchema } from "../Modules/Task/task.validation.js";
import { createTask, getOpenTasks } from "../Modules/Task/task.controller.js";
import { allowedTo } from "../Middlewares/allowedTo.js";
import { Roles } from "../Utils/enums/usersRoles.js";
import { memoryFileUpload } from "../multer/multer.js";

const router = Router();

router.get("/open", verifyToken, getOpenTasks);
router.post("/", 
    verifyToken, 
    allowedTo(Roles.customer),
    memoryFileUpload().array("images", 5),
    taskValidationSchema, 
    createTask
);

export default router;
