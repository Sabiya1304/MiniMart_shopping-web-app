const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/Category");

const router = express.Router();

// GET /api/categories
// Fetch active categories, including their parent category information.
router.get("/", async (req, res) => {
    try {
        // Optional filters:
        // ?parent=null returns main categories
        // ?parent=<MongoDB ObjectId> returns subcategories
        const { parent } = req.query;

        const filter = { isActive: true };

        if (parent === "null") {
            // Fetch only main categories
            filter.parent = null;
        } else if (parent) {
            // Validate the supplied MongoDB ObjectId
            if (!mongoose.isValidObjectId(parent)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid parent category ID"
                });
            }

            // Fetch subcategories of the selected main category
            filter.parent = parent;
        }

        const categories = await Category.find(filter)
            .select("name description imageUrl sortOrder parent")
            .populate("parent", "name")
            .sort({ sortOrder: 1, name: 1 });

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        console.error("Error fetching categories:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch categories"
        });
    }
});

module.exports = router;
