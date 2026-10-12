const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");

const router = express.Router();

// GET /api/products
// Fetch active products with optional search and filters
router.get("/", async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice } = req.query;

        const filter = { isActive: true };

        // Search by product name, description, or brand
        if (search && search.trim()) {
            const searchTerm = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            filter.$or = [
                { name: { $regex: searchTerm, $options: "i" } },
                { description: { $regex: searchTerm, $options: "i" } },
                { brand: { $regex: searchTerm, $options: "i" } }
            ];
        }

        // Filter by category or its subcategories
        if (category) {
            if (!mongoose.Types.ObjectId.isValid(category)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category ID"
                });
            }

            const selectedCategory = await Category.findById(category)
                .select("_id parent");

            if (!selectedCategory) {
                return res.status(400).json({
                    success: false,
                    message: "Category not found"
                });
            }

            // A main category includes its direct subcategories.
            const categoryIds = [selectedCategory._id];

            if (!selectedCategory.parent) {
                const subcategories = await Category.find({
                    parent: selectedCategory._id,
                    isActive: true
                }).select("_id");

                categoryIds.push(...subcategories.map(item => item._id));
            }

            filter.category = { $in: categoryIds };
        }

        // Validate and apply the price range
        const hasMinPrice = minPrice !== undefined && minPrice !== "";
        const hasMaxPrice = maxPrice !== undefined && maxPrice !== "";

        if (hasMinPrice || hasMaxPrice) {
            const min = Number(minPrice);
            const max = Number(maxPrice);

            if (
                (hasMinPrice && (!Number.isFinite(min) || min < 0)) ||
                (hasMaxPrice && (!Number.isFinite(max) || max < 0)) ||
                (hasMinPrice && hasMaxPrice && min > max)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid price range"
                });
            }

            filter.price = {};

            if (hasMinPrice) filter.price.$gte = min;
            if (hasMaxPrice) filter.price.$lte = max;
        }

        // Fetch products and populate their category names
        const products = await Product.find(filter)
            .populate("category", "name parent")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error("Error fetching products:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch products"
        });
    }
});

// GET /api/products/:id
// Fetch one active product by its MongoDB ID
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const product = await Product.findOne({
            _id: req.params.id,
            isActive: true
        }).populate("category", "name parent");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error("Error fetching product:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch product"
        });
    }
});

/**
 * POST /api/products
 * Create a product using the existing Product model and MongoDB category.
 * NOTE: This is suitable for local development only until admin
 * authentication is implemented.
 */
router.post("/", async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            originalPrice,
            imageUrl,
            images,
            category,
            brand,
            stock,
            rating,
            isActive
        } = req.body;

        // Check all required product fields.
        if (
            !name?.trim() ||
            !description?.trim() ||
            price === undefined ||
            !imageUrl?.trim() ||
            !category
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, description, price, image URL, and category are required."
            });
        }

        // Validate numeric values before saving.
        const sellingPrice = Number(price);
        const parsedOriginalPrice =
            originalPrice === "" || originalPrice === undefined ||
            originalPrice === null
                ? null
                : Number(originalPrice);

        const parsedStock = stock === undefined ? 0 : Number(stock);
        const parsedRating = rating === undefined ? 0 : Number(rating);

        if (
            !Number.isFinite(sellingPrice) ||
            sellingPrice < 0 ||
            (parsedOriginalPrice !== null &&
                (!Number.isFinite(parsedOriginalPrice) ||
                    parsedOriginalPrice < sellingPrice)) ||
            !Number.isInteger(parsedStock) ||
            parsedStock < 0 ||
            !Number.isFinite(parsedRating) ||
            parsedRating < 0 ||
            parsedRating > 5
        ) {
            return res.status(400).json({
                success: false,
                message: "Please check the price, original price, stock, and rating."
            });
        }

        // Confirm that the selected category exists and is active.
        if (!mongoose.Types.ObjectId.isValid(category)) {
            return res.status(400).json({
                success: false,
                message: "Invalid category ID."
            });
        }

        const selectedCategory = await Category.findOne({
            _id: category,
            isActive: true
        });

        if (!selectedCategory) {
            return res.status(400).json({
                success: false,
                message: "The selected category does not exist or is inactive."
            });
        }

        // Save the product in MongoDB.
        const product = await Product.create({
            name: name.trim(),
            description: description.trim(),
            price: sellingPrice,
            originalPrice: parsedOriginalPrice,
            imageUrl: imageUrl.trim(),
            images: Array.isArray(images) ? images : [],
            category: selectedCategory._id,
            brand: typeof brand === "string" ? brand.trim() : "",
            stock: parsedStock,
            rating: parsedRating,
            isActive: isActive === undefined ? true : isActive === true
        });

        // Return the saved product with its category details.
        await product.populate("category", "name parent");

        return res.status(201).json({
            success: true,
            message: "Product created successfully.",
            data: product
        });
    } catch (error) {
        console.error("Error creating product:", error);

        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to create product."
        });
    }
});


module.exports = router;
