import Report from "../../Models/Report.model.js";
import User from "../../Models/User.model.js";

const createReportService = async (reportData) => {
    const report = await Report.create(reportData);
    return await Report.findById(report._id)
        .populate("reportedBy", "userName name avatar role")
        .populate("reportedUser", "userName name avatar role");
};

const getMyReportsService = async (userId) => {
    return await Report.find({ reportedBy: userId })
        .populate("reportedUser", "userName name avatar role")
        .sort({ createdAt: -1 });
};

const getAllReportsService = async (filters = {}, page = 1, limit = 10) => {
    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.reason) {
        query.reason = filters.reason;
    }

    const skip = (page - 1) * limit;

    const reports = await Report.find(query)
        .populate("reportedBy", "userName name avatar role")
        .populate("reportedUser", "userName name avatar role isBanned")
        .populate("resolvedBy", "userName name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalReports = await Report.countDocuments(query);

    return {
        reports,
        pagination: {
            totalReports,
            page,
            limit,
            totalPages: Math.ceil(totalReports / limit)
        }
    };
};

const getReportByIdService = async (id) => {
    return await Report.findById(id)
        .populate("reportedBy", "userName name avatar role email phoneNumber")
        .populate("reportedUser", "userName name avatar role email phoneNumber isBanned")
        .populate("resolvedBy", "userName name");
};

const updateReportStatusService = async (id, status, adminNotes, resolvedBy) => {
    const updateData = { status };

    if (adminNotes) {
        updateData.adminNotes = adminNotes;
    }

    if (status === "resolved" || status === "dismissed") {
        updateData.resolvedBy = resolvedBy;
        updateData.resolvedAt = new Date();
    }

    return await Report.findByIdAndUpdate(id, updateData, { new: true })
        .populate("reportedBy", "userName name avatar role")
        .populate("reportedUser", "userName name avatar role isBanned")
        .populate("resolvedBy", "userName name");
};

const checkDuplicateReportService = async (reportedBy, reportedUser) => {
    return await Report.findOne({
        reportedBy,
        reportedUser,
        status: "pending"
    });
};

const banUserService = async (userId, banReason) => {
    return await User.findByIdAndUpdate(userId, {
        $set: {
            isBanned: true,
            bannedAt: new Date(),
            banReason: banReason
        }
    }, { new: true, select: "-password -__v" });
};

const unbanUserService = async (userId) => {
    return await User.findByIdAndUpdate(userId, {
        $set: { isBanned: false },
        $unset: { bannedAt: "", banReason: "" }
    }, { new: true, select: "-password -__v" });
};

export {
    createReportService,
    getMyReportsService,
    getAllReportsService,
    getReportByIdService,
    updateReportStatusService,
    checkDuplicateReportService,
    banUserService,
    unbanUserService
};
