
 // MiniMart API Helper
// Uses fetch() to communicate with the Node.js backend.

const API_BASE_URL = "http://localhost:5000/api";

// Send requests to the backend and handle API errors.
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message || `Request failed with status ${response.status}`
            );
        }

        return data;
    } catch (error) {
        console.error("API request failed:", error.message);
        throw error;
    }
}

// Fetch only main categories (Fashion, Electronics, etc.).
async function getCategories() {
    const result = await apiRequest("/categories?parent=null");
    return result.data || [];
}

// Fetch subcategories belonging to one main category.
async function getSubcategories(parentCategoryId) {
    if (!parentCategoryId) {
        throw new Error("A parent category ID is required.");
    }

    const result = await apiRequest(
        `/categories?parent=${encodeURIComponent(parentCategoryId)}`
    );

    return result.data || [];
}

// Keep the existing backend health-check function.
async function checkBackendConnection() {
    try {
        const result = await apiRequest("/health");
        console.log("MiniMart backend connected successfully:", result);
        return true;
    } catch (error) {
        console.error(
            "Backend connection failed. Check whether the backend is running on port 5000."
        );
        return false;
    }
}

// Make the functions available to main.js and other frontend scripts.
window.apiRequest = apiRequest;
window.getCategories = getCategories;
window.getSubcategories = getSubcategories;
window.checkBackendConnection = checkBackendConnection;
