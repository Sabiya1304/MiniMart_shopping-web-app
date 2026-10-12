const mongoose = require("mongoose");

// Define the structure of main categories and subcategories
const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: "",
            trim: true
        },

        imageUrl: {
            type: String,
            default: ""
        },

        // null means main category; an ObjectId means subcategory
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            default: null
        },

        // Controls the display order on the website
        sortOrder: {
            type: Number,
            default: 0
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Prevent duplicate category names under the same parent.
// This allows the same subcategory name under different main categories.
categorySchema.index(
    { name: 1, parent: 1 },
    { unique: true }
);

// Export the Category model
module.exports =
    mongoose.models.Category ||
    mongoose.model("Category", categorySchema);
