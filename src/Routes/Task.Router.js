import { Router } from "express";
import { verifyToken } from "../Middlewares/verifytoken.js";
import { taskValidationSchema } from "../Modules/Task/task.validation.js";
import { createTask, getOpenTasks, updateTask, deleteTask } from "../Modules/Task/task.controller.js";
import { getTaskOffers } from "../Modules/Offer/offer.controller.js";
import { allowedTo } from "../Middlewares/allowedTo.js";
import { Roles } from "../Utils/enums/usersRoles.js";
import { memoryFileUpload } from "../multer/multer.js";

const router = Router();

router.get("/open", verifyToken, getOpenTasks);
router.get("/:taskId/offers", verifyToken, allowedTo(Roles.customer, Roles.admin), getTaskOffers);
router.post("/",
    verifyToken,
    allowedTo(Roles.customer),
    memoryFileUpload().array("images", 5),
    taskValidationSchema,
    createTask
);

router.patch("/:taskId",
    verifyToken,
    allowedTo(Roles.customer, Roles.admin),
    memoryFileUpload().array("images", 5),
    updateTask
);

router.delete("/:taskId",
    verifyToken,
    allowedTo(Roles.customer, Roles.admin),
    deleteTask
);

export default router;
