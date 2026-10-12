
const express = require("express");
const cors = require("cors");

// Import API routes
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");

const app = express();

// Allow communication between frontend and backend
app.use(cors());

// Allow the backend to receive JSON data
app.use(express.json());

// Register category API
app.use("/api/categories", categoryRoutes);
// Register product API
app.use("/api/products", productRoutes);
// Test endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Shopping Website API is running"
    });
});

// Export the app for server.js
module.exports = app;
