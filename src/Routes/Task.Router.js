import { Router } from "express";
import { verifyToken } from "../Middlewares/verifytoken.js";
import { taskValidationSchema } from "../Modules/Task/task.validation.js";
import { createTask, getOpenTasks, updateTask, deleteTask, getWorkerTasks, getCustomerTasks, getRecommendedWorkers, getWorkerAssignedTasks, getCompletedTasks, rateTaskParticipant, completeTask } from "../Modules/Task/task.controller.js";
import { getTaskOffers } from "../Modules/Offer/offer.controller.js";
import { allowedTo } from "../Middlewares/allowedTo.js";
import { Roles } from "../Utils/enums/usersRoles.js";
import { memoryFileUpload } from "../multer/multer.js";

const router = Router();

router.get("/open", verifyToken, getOpenTasks);
router.get("/worker", verifyToken, allowedTo(Roles.worker), getWorkerTasks);
router.get("/worker/assigned", verifyToken, allowedTo(Roles.worker), getWorkerAssignedTasks);
router.get("/customer", verifyToken, allowedTo(Roles.customer), getCustomerTasks);
router.get("/completed", verifyToken, getCompletedTasks);
router.get("/:taskId/offers", verifyToken, allowedTo(Roles.customer, Roles.admin), getTaskOffers);
router.get("/:taskId/recommend-workers", verifyToken, allowedTo(Roles.customer, Roles.admin), getRecommendedWorkers);
router.post("/",
    verifyToken,
    allowedTo(Roles.customer),
    memoryFileUpload().array("images", 5),
    taskValidationSchema,
    createTask
);

router.post("/:taskId/rate",
    verifyToken,
    rateTaskParticipant
);

router.patch("/:taskId/complete",
    verifyToken,
    allowedTo(Roles.customer),
    completeTask
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
