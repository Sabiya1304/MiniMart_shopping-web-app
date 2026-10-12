
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Category = require("./models/Category");

// Load environment variables from backend/.env
dotenv.config();

// Approved MiniMart main categories and subcategories.
// Main category names must match the existing MongoDB records.
const categoryData = {
    "Fashion": [
        "Men's Clothing",
        "Women's Clothing",
        "Ethnic Wear",
        "Western Wear",
        "Kids' Clothing",
        "Winter Wear",
        "Innerwear & Sleepwear"
    ],

    "Beauty & Personal Care": [
        "Skincare",
        "Makeup",
        "Haircare",
        "Bath & Body",
        "Fragrances",
        "Men's Grooming",
        "Beauty Tools & Accessories"
    ],

    "Electronics": [
        "Mobiles",
        "Laptops",
        "Tablets",
        "Headphones & Earphones",
        "Smartwatches",
        "Cameras",
        "Computer Accessories",
        "Speakers & Audio"
    ],

    "Footwear": [
        "Men's Footwear",
        "Women's Footwear",
        "Kids' Footwear",
        "Sports Shoes",
        "Sandals & Slippers",
        "Formal Shoes"
    ],

    "Jewellery & Accessories": [
        "Necklaces & Chains",
        "Earrings",
        "Rings",
        "Bracelets",
        "Watches",
        "Bags & Wallets",
        "Sunglasses",
        "Belts & Hair Accessories"
    ],

    "Home & Living": [
        "Home Decor",
        "Furniture",
        "Kitchen & Dining",
        "Bedding & Furnishing",
        "Lighting",
        "Storage & Organizers",
        "Bathroom Accessories",
        "Cleaning Supplies"
    ],

    "Grocery & Food": [
        "Staples & Grains",
        "Snacks & Biscuits",
        "Beverages",
        "Dairy Products",
        "Packaged Food",
        "Cooking Essentials",
        "Personal & Household Essentials"
    ],

    "Kids & Toys": [
        "Educational Toys",
        "Soft Toys",
        "Action Figures & Dolls",
        "Board Games & Puzzles",
        "Baby Care",
        "Baby Clothing",
        "Building Blocks"
    ],

    "Sports & Fitness": [
        "Fitness Equipment",
        "Yoga Accessories",
        "Outdoor Sports",
        "Indoor Games",
        "Sportswear",
        "Cycling Accessories",
        "Sports Shoes & Accessories"
    ],

    "Books & Stationery": [
        "Academic Books",
        "Competitive Exam Books",
        "Fiction & Novels",
        "Office Stationery",
        "School Supplies",
        "Art & Craft Supplies",
        "Notebooks & Writing Supplies"
    ],

    "Automotive & Travel": [
        "Car Accessories",
        "Bike Accessories",
        "Car Care",
        "Travel Bags & Luggage",
        "Travel Accessories",
        "Vehicle Electronics"
    ],

    "Pet Supplies": [
        "Dog Supplies",
        "Cat Supplies",
        "Pet Food",
        "Pet Grooming",
        "Pet Toys",
        "Pet Beds & Accessories",
        "Pet Health & Hygiene"
    ]
};

async function seedSubcategories() {
    let connected = false;

    try {
        // Connect using the existing project database configuration
        await connectDB();
        connected = true;

        let createdCount = 0;
        let existingCount = 0;
        const missingParents = [];

        for (const [parentName, subcategories] of
            Object.entries(categoryData)) {

            // Find the existing main category
            const parentCategory = await Category.findOne({
                name: parentName,
                parent: null
            });

            // Never create a subcategory without its main category
            if (!parentCategory) {
                console.log(`Main category not found: ${parentName}`);
                missingParents.push(parentName);
                continue;
            }

            for (let i = 0; i < subcategories.length; i++) {
                const subcategoryName = subcategories[i];

                // Insert only if this child category does not exist.
                // $setOnInsert protects existing category data.
                const result = await Category.updateOne(
                    {
                        name: subcategoryName,
                        parent: parentCategory._id
                    },
                    {
                        $setOnInsert: {
                            name: subcategoryName,
                            description:
                                `${subcategoryName} products`,
                            imageUrl: "",
                            parent: parentCategory._id,
                            sortOrder: i + 1,
                            isActive: true
                        }
                    },
                    { upsert: true }
                );

                if (result.upsertedCount > 0) {
                    createdCount++;
                    console.log(
                        `Created: ${parentName} > ${subcategoryName}`
                    );
                } else {
                    existingCount++;
                    console.log(
                        `Already exists: ${parentName} > ${subcategoryName}`
                    );
                }
            }
        }

        console.log("\n========== SEED SUMMARY ==========");
        console.log(`New subcategories: ${createdCount}`);
        console.log(`Existing subcategories skipped: ${existingCount}`);
        console.log(`Missing main categories: ${missingParents.length}`);

        if (missingParents.length > 0) {
            console.log("Please check:", missingParents.join(", "));
        }

        console.log("==================================");
    } catch (error) {
        console.error("Subcategory seeding failed:", error.message);
        process.exitCode = 1;
    } finally {
        // Close only after the seeding operation finishes
        if (connected) {
            await mongoose.disconnect();
        }
    }
}

seedSubcategories();
