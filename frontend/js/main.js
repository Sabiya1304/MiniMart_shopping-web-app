// =====================================================
// MINIMART — Main Frontend JavaScript
// Handles categories, backend status, login, and search
// =====================================================

// Check whether the backend is available
async function checkBackendStatus() {
    try {
        const result = await window.apiRequest("/health");
        console.log("MiniMart backend connected:", result.message);
    } catch (error) {
        console.error("Backend connection failed:", error.message);
    }
}

// Load categories from MongoDB and display them on the page
async function loadCategories() {
    const categoryNav = document.getElementById("category-list");
    const categoryGrid = document.getElementById("category-grid");

    try {
        // Fetch categories through the API helper
        const categories = await window.getCategories();

        // Clear existing HTML category links and cards
        // so category information is not duplicated or hardcoded.
        if (categoryNav) categoryNav.replaceChildren();
        if (categoryGrid) categoryGrid.replaceChildren();

        // Keep the Explore All link in the navigation
        if (categoryNav) {
            const exploreLink = document.createElement("a");
            exploreLink.href = "#categories";
            exploreLink.className = "nav-highlight";
            exploreLink.textContent = "Explore all";
            categoryNav.appendChild(exploreLink);
        }

        // Show a message if there are no categories in the database
        if (categories.length === 0) {
            if (categoryGrid) {
                categoryGrid.textContent = "No categories available.";
            }
            return;
        }

        // These classes control appearance only.
        // The category names and descriptions still come from MongoDB.
        
        // Assign a consistent CSS class to each category by its name.
        // This prevents category colours from changing when their order changes.
        const categoryStyleMap = {
            "Fashion": "category-fashion",
            "Beauty & Personal Care": "category-beauty",
            "Electronics": "category-electronics",
            "Footwear": "category-footwear",
            "Jewellery & Accessories": "category-jewellery",
            "Home & Living": "category-home",
            "Grocery & Food": "category-grocery",
            "Kids & Toys": "category-kids",
            "Sports & Fitness": "category-sports",
            "Books & Stationery": "category-books",
            "Automotive & Travel": "category-automotive",
            "Pet Supplies": "category-pets"
        };


        // Create navigation links and category cards from database data
        categories.forEach((category) => {
            // -------------------------------
            // 1. Create a top navigation link
            // -------------------------------
            if (categoryNav) {
                const navLink = document.createElement("a");

                navLink.href =
                    `products.html?category=${encodeURIComponent(category._id)}`;

                navLink.textContent = category.name;

                categoryNav.appendChild(navLink);
            }

            // -------------------------------
            // 2. Create a category grid card
            // -------------------------------
            if (categoryGrid) {
                const card = document.createElement("a");

                card.className = "category-card";

                
                // Apply the correct colour class based on the category name
                const categoryClass = categoryStyleMap[category.name];

                if (categoryClass) {
                    card.classList.add(categoryClass);
                }


                // Clicking a card opens the selected category
                card.href =
                    `products.html?category=${encodeURIComponent(category._id)}`;

                // Show the category image if the database has an image URL
                if (category.imageUrl) {
                    const image = document.createElement("img");

                    image.src = category.imageUrl;
                    image.alt = category.name;
                    image.loading = "lazy";

                    card.appendChild(image);
                } else {
                    // Use a decorative symbol when no image is available
                    const symbol = document.createElement("span");

                    symbol.className = "category-symbol";
                    symbol.setAttribute("aria-hidden", "true");
                    symbol.textContent = "✦";

                    card.appendChild(symbol);
                }

                // Display the name received from MongoDB
                const title = document.createElement("strong");
                title.textContent = category.name;
                card.appendChild(title);

                // Display the database description when available
                if (category.description) {
                    const description = document.createElement("span");

                    description.textContent = category.description;
                    card.appendChild(description);
                }

                categoryGrid.appendChild(card);
            }
        });

        // Keep a More link at the end of the navigation
        if (categoryNav) {
            const moreLink = document.createElement("a");

            moreLink.href = "#categories";
            moreLink.textContent = "More ↓";

            categoryNav.appendChild(moreLink);
        }

        console.log(`Loaded ${categories.length} categories from MongoDB.`);
    } catch (error) {
        // Display a friendly message if the API request fails
        if (categoryGrid) {
            categoryGrid.textContent =
                "Unable to load categories. Please try again later.";
        }

        console.error("Category loading failed:", error.message);
    }
}

// Open the login dialog when an account link is clicked
function setupLoginDialog() {
    const authDialog = document.getElementById("auth-dialog");

    if (!authDialog) return;

    const accountLinks = document.querySelectorAll(
        '.header-action[href*="account"], .header-action[data-action="account"], #footer-account-link'
    );

    accountLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            if (typeof authDialog.showModal === "function") {
                event.preventDefault();
                authDialog.showModal();
            }
        });
    });

    // Close the dialog when its close button is clicked
    const closeButton = authDialog.querySelector(".dialog-close");

    if (closeButton) {
        closeButton.addEventListener("click", () => {
            authDialog.close();
        });
    }
}

// Handle the search form
function setupSearch() {
    const searchForm = document.querySelector(".search-bar");

    if (!searchForm) return;

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const searchInput = searchForm.querySelector("input");
        const searchTerm = searchInput?.value.trim();

        if (!searchTerm) {
            searchInput?.focus();
            return;
        }

        // Product search will be connected to the product API next
        console.log("Search requested:", searchTerm);
    });
}

// Update the footer year automatically
function setupCurrentYear() {
    const yearElement = document.getElementById("current-year");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// Start homepage features after the HTML has loaded
document.addEventListener("DOMContentLoaded", () => {
    checkBackendStatus();
    loadCategories();
    setupLoginDialog();
    setupSearch();
    setupCurrentYear();
});