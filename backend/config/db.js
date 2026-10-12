const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load database configuration from the .env file
dotenv.config();

const connectDB = async () => {
    try {
        // Connect to the local MongoDB database
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected successfully!");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1); // Stop the backend if the database connection fails
    }
};

// Export the function so server.js can use it
module.exports = connectDB;