// frontend/js/products.js

// Find the HTML elements used by this page.
const productsGrid = document.getElementById("products-grid");
const productsCount = document.getElementById("products-count");
const pageTitle = document.getElementById("page-title");
const searchInput = document.getElementById("product-search");
const categoryFilter = document.getElementById("category-filter");
const subcategoryFilter = document.getElementById("subcategory-filter");
const minPriceInput = document.getElementById("min-price");
const maxPriceInput = document.getElementById("max-price");
const filterForm = document.getElementById("product-filter-form");
const resetButton = document.getElementById("reset-filters");

// These elements will display the selected category's subcategory cards.
const subcategorySection = document.getElementById("subcategory-section");
const subcategoryGrid = document.getElementById("subcategory-grid");

// Read the selected main category from the URL.
// Example: products.html?category=MAIN_CATEGORY_ID
const urlParams = new URLSearchParams(window.location.search);
const initialCategoryId = urlParams.get("category");

// Store loaded categories so we can reuse them without duplicate options.
let mainCategories = [];
let currentSubcategories = [];

// Prevent API text from being interpreted as HTML.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Format prices using Indian currency.
function formatPrice(price) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(price) || 0);
}

// Allow only HTTP/HTTPS image URLs.
function getSafeImageUrl(url) {
    try {
        const parsedUrl = new URL(String(url || ""), window.location.href);

        if (
            parsedUrl.protocol === "http:" ||
            parsedUrl.protocol === "https:"
        ) {
            return parsedUrl.href;
        }
    } catch (error) {
        // Use the no-image display if the URL is invalid.
    }

    return "";
}

// Add a safe image or a simple fallback without a random placeholder image.
function createImageMarkup(url, altText, className) {
    const safeUrl = getSafeImageUrl(url);

    if (!safeUrl) {
        return `
            <div class="${className} image-unavailable">
                <span>No image available</span>
            </div>
        `;
    }

    return `
        <img
            class="${className}"
            src="${escapeHTML(safeUrl)}"
            alt="${escapeHTML(altText)}"
            loading="lazy"
            onerror="
                this.onerror=null;
                this.style.display='none';
                this.insertAdjacentHTML(
                    'afterend',
                    '<span class=&quot;image-fallback&quot;>No image available</span>'
                );
            "
        >
    `;
}

// Load only main categories from the existing backend API.
async function loadCategories() {
    try {
        const categories = await window.getCategories();

        // Remove duplicate IDs and duplicate names.
        // This prevents the same main category name appearing twice.
        const seenIds = new Set();
        const seenNames = new Set();

        mainCategories = (categories || []).filter(category => {
            const id = String(category._id || "");
            const normalizedName = String(category.name || "")
                .trim()
                .toLowerCase();

            if (!id || !normalizedName) return false;
            if (seenIds.has(id) || seenNames.has(normalizedName)) {
                return false;
            }

            seenIds.add(id);
            seenNames.add(normalizedName);
            return true;
        });

        // Keep the URL-selected category first if duplicate records exist.
        if (initialCategoryId) {
            const selectedCategory = (categories || []).find(
                category => String(category._id) === initialCategoryId
            );

            if (
                selectedCategory &&
                !mainCategories.some(
                    category =>
                        String(category._id) === initialCategoryId
                )
            ) {
                mainCategories.unshift(selectedCategory);
            }
        }

        // Rebuild the dropdown so options cannot be appended repeatedly.
        categoryFilter.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "All Main Categories";
        categoryFilter.appendChild(defaultOption);

        mainCategories.forEach(category => {
            const option = document.createElement("option");
            option.value = category._id;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });

        // Restore the main category supplied by the index page.
        if (
            initialCategoryId &&
            mainCategories.some(
                category => String(category._id) === initialCategoryId
            )
        ) {
            categoryFilter.value = initialCategoryId;
            await loadSubcategories(initialCategoryId);
        } else {
            await loadSubcategories("");
        }

        updatePageTitle();
    } catch (error) {
        console.error("Could not load categories:", error);
        showSubcategoryMessage("Could not load subcategories.");
    }
}

// Load the selected main category's subcategories from MongoDB.
async function loadSubcategories(parentCategoryId) {
    currentSubcategories = [];

    subcategoryFilter.replaceChildren();

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "All Subcategories";
    subcategoryFilter.appendChild(defaultOption);

    subcategoryFilter.disabled = true;

    if (subcategoryGrid) {
        subcategoryGrid.replaceChildren();
    }

    if (!parentCategoryId) {
        if (subcategorySection) {
            subcategorySection.hidden = true;
        }
        return;
    }

    try {
        const subcategories =
            await window.getSubcategories(parentCategoryId);

        // Avoid duplicate subcategory cards/options too.
        const seenIds = new Set();
        const seenNames = new Set();

        currentSubcategories = (subcategories || []).filter(subcategory => {
            const id = String(subcategory._id || "");
            const normalizedName = String(subcategory.name || "")
                .trim()
                .toLowerCase();

            if (!id || !normalizedName) return false;
            if (seenIds.has(id) || seenNames.has(normalizedName)) {
                return false;
            }

            seenIds.add(id);
            seenNames.add(normalizedName);
            return true;
        });

        // Populate the subcategory dropdown.
        currentSubcategories.forEach(subcategory => {
            const option = document.createElement("option");
            option.value = subcategory._id;
            option.textContent = subcategory.name;
            subcategoryFilter.appendChild(option);
        });

        subcategoryFilter.disabled = currentSubcategories.length === 0;

        // Show subcategory cards above the products grid.
        renderSubcategoryCards(currentSubcategories);

    } catch (error) {
        console.error("Could not load subcategories:", error);
        showSubcategoryMessage("Could not load subcategories.");
    }
}

// Display subcategory cards for the selected main category.
function renderSubcategoryCards(subcategories) {
    if (!subcategorySection || !subcategoryGrid) return;

    subcategoryGrid.replaceChildren();

    // Hide this section when no main category is selected.
    if (!categoryFilter.value) {
        subcategorySection.hidden = true;
        return;
    }

    subcategorySection.hidden = false;

    if (!subcategories.length) {
        showSubcategoryMessage("No subcategories are available.");
        return;
    }

    subcategoryGrid.innerHTML = subcategories.map(subcategory => {
        const id = escapeHTML(subcategory._id);
        const name = escapeHTML(subcategory.name);
        const image = createImageMarkup(
            subcategory.imageUrl,
            subcategory.name,
            "subcategory-card-image"
        );

        return `
            <button
                type="button"
                class="subcategory-card"
                data-subcategory-id="${id}"
                aria-label="View ${name} products"
            >
                ${image}
                <span class="subcategory-card-name">${name}</span>
            </button>
        `;
    }).join("");

    // Clicking a subcategory card selects the same dropdown option.
    subcategoryGrid.querySelectorAll(".subcategory-card").forEach(card => {
        card.addEventListener("click", () => {
            const subcategoryId = card.dataset.subcategoryId;

            subcategoryFilter.value = subcategoryId;

            // Highlight the selected card.
            subcategoryGrid.querySelectorAll(".subcategory-card")
                .forEach(item => {
                    item.classList.toggle("is-selected", item === card);
                });

            loadProducts();
        });
    });
}

// Display a message in the subcategory section.
function showSubcategoryMessage(message) {
    if (!subcategorySection || !subcategoryGrid) return;

    subcategorySection.hidden = false;
    subcategoryGrid.innerHTML = `
        <p class="products-message">${escapeHTML(message)}</p>
    `;
}

// Keep the heading matched to the selected main category.
function updatePageTitle() {
    const selectedOption =
        categoryFilter.options[categoryFilter.selectedIndex];

    pageTitle.textContent =
        categoryFilter.value && selectedOption
            ? selectedOption.textContent
            : "All Products";
}

// Create a compact product card using real API data.
function createProductCard(product) {
    const productId = encodeURIComponent(product._id);
    const productName = escapeHTML(product.name);
    const brand = escapeHTML(product.brand || "Brand not specified");

    // Use the first available image from the database.
    const productImage =
        product.imageUrl ||
        (Array.isArray(product.images) ? product.images[0] : "");

    const image = createImageMarkup(
        productImage,
        product.name,
        "product-image"
    );

    const price = Number(product.price) || 0;
    const originalPrice = Number(product.originalPrice) || 0;
    const rating = Math.max(0, Math.min(5, Number(product.rating) || 0));
    const stock = Number(product.stock) || 0;

    // Calculate the discount only when the database has a higher original price.
    const hasDiscount = originalPrice > price;
    const discount = hasDiscount
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    const detailsUrl = `product-details.html?id=${productId}`;

    return `
        <article class="product-card">
            <a
                class="product-image-link"
                href="${detailsUrl}"
                aria-label="View ${productName}"
            >
                ${image}

                <button
                    type="button"
                    class="wishlist-btn"
                    aria-label="Add ${productName} to wishlist"
                    title="Wishlist"
                    data-product-id="${escapeHTML(product._id)}"
                    onclick="event.preventDefault(); event.stopPropagation();"
                >
                    ♡
                </button>
            </a>

            <div class="product-info">
                <p class="product-brand">${brand}</p>

                <h2 class="product-title">
                    <a href="${detailsUrl}">${productName}</a>
                </h2>

                <div class="product-price">
                    <span class="current-price">${formatPrice(price)}</span>

                    ${
                        hasDiscount
                            ? `
                                <span class="old-price">
                                    ${formatPrice(originalPrice)}
                                </span>
                                <span class="discount">${discount}% off</span>
                            `
                            : ""
                    }
                </div>

                <p class="product-rating">
                    <span class="rating-badge">
                        ★ ${rating.toFixed(1)}
                    </span>
                </p>

                <p class="stock-status ${stock > 0 ? "in-stock" : "out-of-stock"}">
                    ${stock > 0 ? "In stock" : "Out of stock"}
                </p>

                <a class="view-product" href="${detailsUrl}">
                    View Details
                </a>
            </div>
        </article>
    `;
}

// Load products using the existing backend API and current filters.
async function loadProducts() {
    productsGrid.innerHTML =
        '<p class="products-message">Loading products...</p>';

    productsCount.textContent = "Loading products...";

    const params = new URLSearchParams();

    const search = searchInput.value.trim();

    // A selected subcategory takes priority.
    // Otherwise, the main category shows products from all its subcategories.
    const selectedCategory =
        subcategoryFilter.value || categoryFilter.value;

    const minPrice = minPriceInput.value.trim();
    const maxPrice = maxPriceInput.value.trim();

    if (search) params.set("search", search);
    if (selectedCategory) params.set("category", selectedCategory);
    if (minPrice !== "") params.set("minPrice", minPrice);
    if (maxPrice !== "") params.set("maxPrice", maxPrice);

    try {
        const result = await window.apiRequest(
            `/products?${params.toString()}`
        );

        const products = result.data || [];

        productsCount.textContent = `${products.length} product(s) found`;

        if (products.length === 0) {
            productsGrid.innerHTML = `
                <p class="products-message">
                    No products found. Try changing your filters.
                </p>
            `;
            return;
        }

        // The main-category API result includes products from its subcategories.
        // Do not filter these products by subcategory unless one is selected.
        productsGrid.innerHTML = products.map(createProductCard).join("");

    } catch (error) {
        console.error("Could not load products:", error);

        productsCount.textContent = "Unable to load products";

        productsGrid.innerHTML = `
            <p class="products-message">
                Could not load products. Please check the backend connection.
            </p>
        `;
    }
}

// Validate the filters before sending them to the backend.
filterForm.addEventListener("submit", event => {
    event.preventDefault();

    const min = minPriceInput.value.trim();
    const max = maxPriceInput.value.trim();

    if (
        (min !== "" && Number(min) < 0) ||
        (max !== "" && Number(max) < 0)
    ) {
        alert("Price cannot be negative.");
        return;
    }

    if (min !== "" && max !== "" && Number(min) > Number(max)) {
        alert("Minimum price cannot be greater than maximum price.");
        return;
    }

    updatePageTitle();
    loadProducts();
});

// When a main category changes, load its subcategories and all its products.
categoryFilter.addEventListener("change", async () => {
    await loadSubcategories(categoryFilter.value);

    subcategoryFilter.value = "";

    updatePageTitle();
    loadProducts();
});

// Update the product list when a subcategory is selected in the dropdown.
subcategoryFilter.addEventListener("change", () => {
    if (subcategoryGrid) {
        subcategoryGrid.querySelectorAll(".subcategory-card")
            .forEach(card => {
                card.classList.toggle(
                    "is-selected",
                    card.dataset.subcategoryId === subcategoryFilter.value
                );
            });
    }

    loadProducts();
});

// Reset all filters.
resetButton.addEventListener("click", async () => {
    searchInput.value = "";
    categoryFilter.value = "";
    minPriceInput.value = "";
    maxPriceInput.value = "";

    await loadSubcategories("");

    updatePageTitle();
    loadProducts();
});

// Start after the page elements are available.
async function initializeProductsPage() {
    await loadCategories();
    updatePageTitle();
    await loadProducts();
}

initializeProductsPage();