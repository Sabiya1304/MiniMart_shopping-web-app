
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const Category = require("./models/Category");
const Product = require("./models/Product");

// Candidate Unsplash images for initial demo data.
// These are broad category images, not verified photos of exact products.
// We should replace them with product-specific images before final submission.
const CATEGORY_IMAGES = {
    "Fashion": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
    "Beauty & Personal Care": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80",
    "Electronics": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
    "Home & Living": "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=600&q=80",
    "Footwear": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    "Jewellery & Accessories": "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=600&q=80",
    "Grocery & Food": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
    "Sports & Fitness": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=80",
    "Books & Stationery": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
    "Automotive & Travel": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=600&q=80",
    "Pet Supplies": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80",
    "Kids & Toys": "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=600&q=80"
};

// Brand names used only for this initial demo catalog.
// These are sample labels, not claims of actual product manufacturers.
const CATEGORY_BRANDS = {
    "Fashion": "StylePoint",
    "Beauty & Personal Care": "GlowCare",
    "Electronics": "TechNova",
    "Home & Living": "HomeNest",
    "Footwear": "StepUp",
    "Jewellery & Accessories": "LuxeLine",
    "Grocery & Food": "DailyChoice",
    "Sports & Fitness": "ActiveLife",
    "Books & Stationery": "LearnWell",
    "Automotive & Travel": "RoadMate",
    "Pet Supplies": "PetJoy",
    "Kids & Toys": "PlayNest"
};

// Base prices are adjusted by category to make the demo catalog realistic
// enough for UI testing. Replace sample values with researched products later.
const CATEGORY_BASE_PRICES = {
    "Fashion": 499,
    "Beauty & Personal Care": 299,
    "Electronics": 1499,
    "Home & Living": 399,
    "Footwear": 599,
    "Jewellery & Accessories": 249,
    "Grocery & Food": 99,
    "Sports & Fitness": 499,
    "Books & Stationery": 149,
    "Automotive & Travel": 349,
    "Pet Supplies": 199,
    "Kids & Toys": 299
};

function makeProductName(subcategoryName) {
    // Create a unique demo title for each subcategory.
    return `Everyday ${subcategoryName} Essential`;
}

function makeDescription(subcategoryName, mainCategoryName) {
    return (
        `Explore this sample ${subcategoryName.toLowerCase()} product ` +
        `from our ${mainCategoryName} collection. ` +
        `This description is demo content and should be replaced with ` +
        `accurate product specifications before final submission.`
    );
}

async function seedProducts() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing from the backend .env file.");
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully.");

        // Load all active subcategories and their parent categories.
        const subcategories = await Category.find({
            isActive: true,
            parent: { $ne: null }
        })
            .populate("parent", "name")
            .sort({ sortOrder: 1, name: 1 });

        // Stop rather than seed an incomplete or unexpected category catalog.
        if (subcategories.length !== 85) {
            throw new Error(
                `Expected 85 active subcategories but found ${subcategories.length}. ` +
                "No products were inserted. Check the category data first."
            );
        }

        let insertedCount = 0;
        let skippedCount = 0;

        for (const subcategory of subcategories) {
            if (!subcategory.parent) {
                console.warn(`Skipped "${subcategory.name}": parent category missing.`);
                skippedCount++;
                continue;
            }

            const mainCategoryName = subcategory.parent.name;
            const productName = makeProductName(subcategory.name);

            // Do not create another product if this subcategory already has one.
            // Existing products are left unchanged.
            const existingProduct = await Product.findOne({
                category: subcategory._id
            }).select("_id name");

            if (existingProduct) {
                console.log(
                    `Skipped "${subcategory.name}": already has product "${existingProduct.name}".`
                );
                skippedCount++;
                continue;
            }

            const imageUrl = CATEGORY_IMAGES[mainCategoryName];

            if (!imageUrl) {
                console.warn(
                    `Skipped "${subcategory.name}": no image configured for "${mainCategoryName}".`
                );
                skippedCount++;
                continue;
            }

            const priceBase = CATEGORY_BASE_PRICES[mainCategoryName] || 299;

            // Slightly vary prices so all demo cards do not look identical.
            const price = priceBase + ((insertedCount % 5) * 50);
            const originalPrice = price + Math.max(50, Math.round(price * 0.25));

            await Product.create({
                name: productName,
                description: makeDescription(subcategory.name, mainCategoryName),
                price,
                originalPrice,
                imageUrl,
                images: [imageUrl],
                category: subcategory._id,
                brand: CATEGORY_BRANDS[mainCategoryName] || "Everyday",
                stock: 10 + (insertedCount % 41),
                rating: Number((3.5 + ((insertedCount % 15) / 10)).toFixed(1)),
                isActive: true
            });

            insertedCount++;
            console.log(`Inserted: ${productName}`);
        }

        console.log("\n--- Product Seed Summary ---");
        console.log(`Active subcategories found: ${subcategories.length}`);
        console.log(`Products inserted: ${insertedCount}`);
        console.log(`Subcategories skipped: ${skippedCount}`);
        console.log("Existing products were not modified.");
    } catch (error) {
        console.error("\nProduct seeding failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log("MongoDB connection closed.");
    }
}

seedProducts();
