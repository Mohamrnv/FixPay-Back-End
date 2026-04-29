import mongoose from "mongoose";

const ReportReasons = {
    FRAUD: "fraud",
    INAPPROPRIATE_BEHAVIOR: "inappropriate_behavior",
    POOR_SERVICE: "poor_service",
    SPAM: "spam",
    HARASSMENT: "harassment",
    OTHER: "other"
};

const ReportStatus = {
    PENDING: "pending",
    REVIEWED: "reviewed",
    RESOLVED: "resolved",
    DISMISSED: "dismissed"
};

const reportSchema = new mongoose.Schema({
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },
    reportedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },
    reason: {
        type: String,
        enum: [...Object.values(ReportReasons)],
        required: true
    },
    description: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 500
    },
    status: {
        type: String,
        enum: [...Object.values(ReportStatus)],
        default: ReportStatus.PENDING
    },
    adminNotes: {
        type: String
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    resolvedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Report = mongoose.model("Reports", reportSchema, "Reports");

export default Report;
export { ReportReasons, ReportStatus };
