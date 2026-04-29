import { asyncWrapper } from "../../Utils/Errors/ErrorWrapper.js";
import * as httpStatus from "../../Utils/Http/httpStatusText.js";
import { AppError } from "../../Utils/Errors/AppError.js";
import User from "../../Models/User.model.js";
import { ReportReasons, ReportStatus } from "../../Models/Report.model.js";
import * as Services from "./report.service.js";

// ─── User/Worker Endpoints ──────────────────────────────────────

const createReport = asyncWrapper(async (req, res, next) => {
    const { reportedUser, reason, description } = req.body;
    const reportedBy = req.currentUser._id;

    if (!reportedUser || !reason || !description) {
        return next(new AppError("reportedUser, reason, and description are required", 400, httpStatus.FAIL));
    }

    // Validate reason
    if (!Object.values(ReportReasons).includes(reason)) {
        return next(new AppError(
            `Invalid reason. Must be one of: ${Object.values(ReportReasons).join(", ")}`,
            400, httpStatus.FAIL
        ));
    }

    // Validate description length
    if (description.length < 10 || description.length > 500) {
        return next(new AppError("Description must be between 10 and 500 characters", 400, httpStatus.FAIL));
    }

    // Can't report yourself
    if (reportedBy.toString() === reportedUser.toString()) {
        return next(new AppError("You cannot report yourself", 400, httpStatus.FAIL));
    }

    // Check if reported user exists
    const targetUser = await User.findById(reportedUser);
    if (!targetUser) {
        return next(new AppError("Reported user not found", 404, httpStatus.FAIL));
    }

    // Check for duplicate pending report
    const duplicateReport = await Services.checkDuplicateReportService(reportedBy, reportedUser);
    if (duplicateReport) {
        return next(new AppError("You already have a pending report against this user", 409, httpStatus.FAIL));
    }

    const report = await Services.createReportService({
        reportedBy,
        reportedUser,
        reason,
        description
    });

    res.status(201).json({
        status: httpStatus.SUCCESS,
        message: "Report submitted successfully",
        data: { report }
    });
});

const getMyReports = asyncWrapper(async (req, res, next) => {
    const userId = req.currentUser._id;
    const reports = await Services.getMyReportsService(userId);

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: { reports }
    });
});

// ─── Admin Endpoints ────────────────────────────────────────────

const getAllReports = asyncWrapper(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { status, reason } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (reason) filters.reason = reason;

    const result = await Services.getAllReportsService(filters, page, limit);

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: result
    });
});

const getReportById = asyncWrapper(async (req, res, next) => {
    const { id } = req.params;

    const report = await Services.getReportByIdService(id);
    if (!report) {
        return next(new AppError("Report not found", 404, httpStatus.FAIL));
    }

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: { report }
    });
});

const updateReportStatus = asyncWrapper(async (req, res, next) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = req.currentUser._id;

    if (!status) {
        return next(new AppError("Status is required", 400, httpStatus.FAIL));
    }

    if (!Object.values(ReportStatus).includes(status)) {
        return next(new AppError(
            `Invalid status. Must be one of: ${Object.values(ReportStatus).join(", ")}`,
            400, httpStatus.FAIL
        ));
    }

    const report = await Services.getReportByIdService(id);
    if (!report) {
        return next(new AppError("Report not found", 404, httpStatus.FAIL));
    }

    const updatedReport = await Services.updateReportStatusService(id, status, adminNotes, adminId);

    res.status(200).json({
        status: httpStatus.SUCCESS,
        message: `Report status updated to '${status}'`,
        data: { report: updatedReport }
    });
});

const banUser = asyncWrapper(async (req, res, next) => {
    const { id } = req.params;
    const { banReason } = req.body;

    if (!id) {
        return next(new AppError("User ID is required", 400, httpStatus.FAIL));
    }

    const user = await User.findById(id);
    if (!user) {
        return next(new AppError("User not found", 404, httpStatus.FAIL));
    }

    if (user.isBanned) {
        return next(new AppError("User is already banned", 400, httpStatus.FAIL));
    }

    // Prevent banning admins
    if (user.role === "admin") {
        return next(new AppError("Cannot ban an admin user", 403, httpStatus.FAIL));
    }

    const bannedUser = await Services.banUserService(id, banReason || "No reason provided");

    res.status(200).json({
        status: httpStatus.SUCCESS,
        message: "User has been banned successfully",
        data: { user: bannedUser }
    });
});

const unbanUser = asyncWrapper(async (req, res, next) => {
    const { id } = req.params;

    if (!id) {
        return next(new AppError("User ID is required", 400, httpStatus.FAIL));
    }

    const user = await User.findById(id);
    if (!user) {
        return next(new AppError("User not found", 404, httpStatus.FAIL));
    }

    if (!user.isBanned) {
        return next(new AppError("User is not banned", 400, httpStatus.FAIL));
    }

    const unbannedUser = await Services.unbanUserService(id);

    res.status(200).json({
        status: httpStatus.SUCCESS,
        message: "User has been unbanned successfully",
        data: { user: unbannedUser }
    });
});

export {
    createReport,
    getMyReports,
    getAllReports,
    getReportById,
    updateReportStatus,
    banUser,
    unbanUser
};
