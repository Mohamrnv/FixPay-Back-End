import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Category name is required"],
        unique: true,
        trim: true,
        minLength: [2, "Category name must be at least 2 characters"],
        maxLength: [50, "Category name cannot exceed 50 characters"]
    }
}, {
    timestamps: true
});

const Category = mongoose.model("Category", categorySchema);

export default Category;
