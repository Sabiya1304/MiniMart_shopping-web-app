const mongoose = require("mongoose");

// Define the structure of products stored in MongoDB
const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        // Current selling price displayed on product cards
        price: {
            type: Number,
            required: true,
            min: 0
        },

        // Original price, used to calculate the discount automatically
        originalPrice: {
            type: Number,
            min: 0,
            default: null,
            validate: {
                validator: function (value) {
                    return value === null ||
                        value === undefined ||
                        value >= this.price;
                },
                message: "Original price must be greater than or equal to selling price."
            }
        },

        // Main product image displayed on compact product cards
        imageUrl: {
            type: String,
            required: true,
            trim: true
        },

        // Additional images for the product details page
        images: {
            type: [String],
            default: []
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true
        },

        brand: {
            type: String,
            trim: true,
            default: ""
        },

        stock: {
            type: Number,
            default: 0,
            min: 0
        },

        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        // Automatically save creation and update dates
        timestamps: true
    }
);

// Calculate discount percentage instead of storing duplicate data
productSchema.virtual("discountPercentage").get(function () {
    if (
        !this.originalPrice ||
        this.originalPrice <= 0 ||
        this.originalPrice <= this.price
    ) {
        return 0;
    }

    return Math.round(
        ((this.originalPrice - this.price) / this.originalPrice) * 100
    );
});

// Include the calculated discount when converting products to JSON
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

// Reuse the existing model if it has already been registered
module.exports =
    mongoose.models.Product ||
    mongoose.model("Product", productSchema);

