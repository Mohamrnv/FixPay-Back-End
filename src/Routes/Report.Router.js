import { Router } from "express";
import { verifyToken } from "../Middlewares/verifytoken.js";
import { allowedTo } from "../Middlewares/allowedTo.js";
import { Roles } from "../Utils/enums/usersRoles.js";
import {
    createReport,
    getMyReports,
    getAllReports,
    getReportById,
    updateReportStatus,
    banUser,
    unbanUser
} from "../Modules/Report/report.controller.js";

const router = Router();

// ─── User/Worker Endpoints ──────────────────────────────────────
router.post("/", verifyToken, createReport);
router.get("/my-reports", verifyToken, getMyReports);

// ─── Admin Endpoints ────────────────────────────────────────────
router.get("/", verifyToken, allowedTo(Roles.admin), getAllReports);
router.get("/:id", verifyToken, allowedTo(Roles.admin), getReportById);
router.patch("/:id/status", verifyToken, allowedTo(Roles.admin), updateReportStatus);
router.post("/ban/:id", verifyToken, allowedTo(Roles.admin), banUser);
router.post("/unban/:id", verifyToken, allowedTo(Roles.admin), unbanUser);

export default router;
