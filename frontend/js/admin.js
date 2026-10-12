
/* ========================================
   MiniMart Admin Dashboard
   Loads existing products and categories
   from the backend API.
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "http://localhost:5000/api";
    const LOW_STOCK_LIMIT = 5;

    // HTML elements used by the dashboard.
    const productsBody = document.getElementById("admin-products-body");
    const searchInput = document.getElementById("admin-product-search");
    const categoryFilter = document.getElementById("admin-category-filter");
    const stockFilter = document.getElementById("admin-stock-filter");
    const messageElement = document.getElementById("admin-products-message");

    let products = [];
    let categories = [];

    // Read JSON safely and support common API response formats.
    async function fetchApi(endpoint) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "The server request failed.");
        }

        return result;
    }

    // Extract arrays from common response formats without changing the backend.
    function extractArray(result, possibleKeys) {
        if (Array.isArray(result)) return result;

        for (const key of possibleKeys) {
            if (Array.isArray(result?.[key])) return result[key];
            if (Array.isArray(result?.data?.[key])) return result.data[key];
        }

        if (Array.isArray(result?.data)) return result.data;

        return [];
    }

    // Support category objects populated by MongoDB or returned as IDs.
    function getCategoryId(product) {
        const category = product.category;
        if (category && typeof category === "object") {
            return String(category._id || category.id || "");
        }
        return String(category || "");
    }

    function getCategoryName(product) {
        const category = product.category;

        if (category && typeof category === "object") {
            return category.name || "Uncategorized";
        }

        const matchingCategory = categories.find(
            item => String(item._id || item.id) === String(category || "")
        );

        return matchingCategory?.name || "Uncategorized";
    }

    function formatPrice(price) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(Number(price) || 0);
    }

    function escapeHTML(value) {
        // Prevent product values from being interpreted as HTML.
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    // Fill the category dropdown using existing database records.
    function renderCategoryOptions() {
        const previousValue = categoryFilter.value;

        categoryFilter.innerHTML =
            '<option value="">All Categories</option>';

        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = String(category._id || category.id || "");
            option.textContent = category.name || "Unnamed Category";
            categoryFilter.appendChild(option);
        });

        // Keep the selected category if it still exists.
        if ([...categoryFilter.options].some(
            option => option.value === previousValue
        )) {
            categoryFilter.value = previousValue;
        }
    }

    // Update overview cards using the product records returned by the API.
    function updateStatistics() {
        const totalProducts = products.length;
        const lowStock = products.filter(
            product => Number(product.stock) > 0 &&
                Number(product.stock) <= LOW_STOCK_LIMIT
        ).length;
        const outOfStock = products.filter(
            product => Number(product.stock) <= 0
        ).length;

        document.getElementById("total-products").textContent = totalProducts;
        document.getElementById("total-categories").textContent = categories.length;
        document.getElementById("low-stock-products").textContent = lowStock;
        document.getElementById("out-of-stock-products").textContent = outOfStock;
    }

    // Display the products that match the selected filters.
    function renderProducts() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedCategory = categoryFilter.value;
        const selectedStock = stockFilter.value;

        const filteredProducts = products.filter(product => {
            const name = String(product.name || "").toLowerCase();
            const brand = String(product.brand || "").toLowerCase();
            const stock = Number(product.stock) || 0;

            const matchesSearch =
                name.includes(searchTerm) || brand.includes(searchTerm);

            const matchesCategory =
                !selectedCategory ||
                getCategoryId(product) === selectedCategory;

            let matchesStock = true;

            if (selectedStock === "in-stock") {
                matchesStock = stock > LOW_STOCK_LIMIT;
            } else if (selectedStock === "low-stock") {
                matchesStock = stock > 0 && stock <= LOW_STOCK_LIMIT;
            } else if (selectedStock === "out-of-stock") {
                matchesStock = stock <= 0;
            }

            return matchesSearch && matchesCategory && matchesStock;
        });

        if (filteredProducts.length === 0) {
            productsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="admin-table-message">
                        No matching products found.
                    </td>
                </tr>
            `;
            return;
        }

        productsBody.innerHTML = filteredProducts.map(product => {
            const stock = Number(product.stock) || 0;
            const isActive = product.isActive !== false;

            let stockLabel = "In Stock";
            if (stock <= 0) stockLabel = "Out of Stock";
            else if (stock <= LOW_STOCK_LIMIT) stockLabel = "Low Stock";

            return `
                <tr>
                    <td>${escapeHTML(product.name || "Unnamed Product")}</td>
                    <td>${escapeHTML(product.brand || "—")}</td>
                    <td>${escapeHTML(getCategoryName(product))}</td>
                    <td>${formatPrice(product.price)}</td>
                    <td>${stock}</td>
                    <td>${isActive ? "Active" : "Inactive"}</td>
                    <td>
                        <span>${escapeHTML(stockLabel)}</span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // Load both resources from the existing backend.
    async function loadDashboard() {
        productsBody.innerHTML = `
            <tr>
                <td colspan="7" class="admin-table-message">
                    Loading products...
                </td>
            </tr>
        `;

        messageElement.textContent = "";

        try {
            const [productResult, categoryResult] = await Promise.all([
                fetchApi("/products"),
                fetchApi("/categories?parent=null")
            ]);

            products = extractArray(productResult, ["products", "items"]);
            categories = extractArray(categoryResult, ["categories", "items"]);

            renderCategoryOptions();
            updateStatistics();
            renderProducts();

            messageElement.textContent =
                `Loaded ${products.length} products from the backend.`;
        } catch (error) {
            console.error("Admin dashboard loading error:", error);

            productsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="admin-table-message">
                        Could not load products. Check that the backend is
                        running and the API response format is correct.
                    </td>
                </tr>
            `;

            messageElement.textContent = error.message;
        }
    }

    // Refresh the table when the user changes a filter.
    searchInput.addEventListener("input", renderProducts);
    categoryFilter.addEventListener("change", renderProducts);
    stockFilter.addEventListener("change", renderProducts);

    // The add-product button will be connected in the next step.
    document.getElementById("add-product-btn").addEventListener("click", () => {
        messageElement.textContent =
            "The add-product form will be implemented in the next step.";
    });

    // Add Product form elements
    const addProductButton = document.getElementById("add-product-btn");
    const addProductSection = document.getElementById("add-product-section");
    const addProductForm = document.getElementById("add-product-form");
    const productCategorySelect = document.getElementById("product-category");
    const addProductMessage = document.getElementById("add-product-message");
    const cancelAddProductButton = document.getElementById("cancel-add-product");

    // Open the form when the Add Product button is clicked
    addProductButton.addEventListener("click", async () => {
        addProductSection.hidden = false;
        addProductMessage.textContent = "Loading categories...";

        try {
            // Load active categories from your existing API
            const result = await fetchApi("/categories?parent=null");
            const mainCategories = extractArray(result, ["categories", "items"]);

            // // Also load each main category's subcategories
            // const subcategoryResults = await Promise.all(
            //     mainCategories.map(async (mainCategory) => {
            //         const mainId = mainCategory._id || mainCategory.id;
            //         const subResult = await fetchApi(
            //             `/categories?parent=${encodeURIComponent(mainId)}`
            //         );
            //         return extractArray(subResult, ["categories", "items"]);
            //     })
            // );

            const allCategories = [...mainCategories, ...subcategoryResults.flat()];

            productCategorySelect.innerHTML =
                '<option value="">Select a category</option>';

            allCategories.forEach((category) => {
                const option = document.createElement("option");
                option.value = category._id || category.id;
                option.textContent = category.parent
                    ? `↳ ${category.name}`
                    : category.name;
                productCategorySelect.appendChild(option);
            });

            addProductMessage.textContent = allCategories.length
                ? "Choose a category and enter the product details."
                : "No categories found. Please check your category data.";
        } catch (error) {
            console.error("Category loading error:", error);
            addProductMessage.textContent =
                "Could not load categories: " + error.message;
        }
    });

    // Close the form without saving
    cancelAddProductButton.addEventListener("click", () => {
        addProductSection.hidden = true;
        addProductMessage.textContent = "";
    });

    // Submit the new product to MongoDB through the backend API
    addProductForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        addProductMessage.textContent = "Saving product...";

        const formData = new FormData(addProductForm);
        const additionalImages = String(formData.get("images") || "")
            .split(/\r?\n/)
            .map((url) => url.trim())
            .filter(Boolean);

        const productData = {
            name: String(formData.get("name") || "").trim(),
            description: String(formData.get("description") || "").trim(),
            price: Number(formData.get("price")),
            originalPrice: formData.get("originalPrice")
                ? Number(formData.get("originalPrice"))
                : null,
            imageUrl: String(formData.get("imageUrl") || "").trim(),
            images: additionalImages,
            category: String(formData.get("category") || ""),
            brand: String(formData.get("brand") || "").trim(),
            stock: Number(formData.get("stock") || 0),
            rating: Number(formData.get("rating") || 0),
            isActive: addProductForm.querySelector('[name="isActive"]').checked
        };

        try {
            // Use the same API base URL as the existing dashboard
            const response = await fetch(`${API_BASE_URL}/products`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Could not save product.");
            }

            addProductMessage.textContent = "Product saved successfully!";
            addProductForm.reset();

            // Reload the product list and dashboard statistics
            await loadDashboard();

            addProductSection.hidden = true;
        } catch (error) {
            console.error("Product save error:", error);
            addProductMessage.textContent = error.message;
        }
    });

    loadDashboard();
});
