// START OF MERGED recommendations.js

// --- DOM ELEMENTS ---
// Elements primarily from header context, and status message elements.
// These are assumed to exist in the HTML where this script is used.
const profileBtn = document.getElementById("profileDropdownBtn");
const profileDropdown = document.getElementById("profileDropdown");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const moreMenuToggle = document.getElementById("moreMenuToggle");
const moreMenuMobile = document.getElementById("moreMenuMobile");
const userLoggedIn = document.getElementById("userLoggedIn");
const userNotLoggedIn = document.getElementById("userNotLoggedIn");
const welcomeMessage = document.getElementById("welcomeMessage");
const logoutBtn = document.getElementById("logoutBtn");

// Status Message Elements - These must exist in the HTML.
const statusMessageContainer = document.getElementById(
  "statusMessageContainer"
);
const statusMessage = document.getElementById("statusMessage");

// --- AUTHENTICATION AND UTILITY FUNCTIONS ---

/**
 * Gets the authentication token from cookies or localStorage.
 * Prefers cookie if both exist.
 * @returns {string|null} The token or null if not found.
 */
function getToken() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));

  let lsToken = null;
  try {
    // Check if localStorage is available and not null
    if (typeof localStorage !== "undefined" && localStorage !== null) {
      lsToken = localStorage.getItem("token");
    }
  } catch (e) {
    console.warn("localStorage is not available or accessible.", e);
  }
  return cookie ? cookie.split("=")[1] : lsToken;
}

/**
 * Displays a status message to the user.
 * Assumes statusMessageContainer and statusMessage elements exist in the DOM.
 * @param {string} message - The message to display.
 * @param {boolean} [isError=false] - True if the message is an error, false for success.
 * @param {number} [duration=5000] - How long to display the message in ms. 0 for indefinite.
 */
function showMessage(message, isError = false, duration = 5000) {
  if (!statusMessageContainer || !statusMessage) {
    console.error(
      "Status message DOM elements (statusMessageContainer or statusMessage) not found. Message not shown:",
      message
    );
    return;
  }

  const iconHtml = isError
    ? `<i class="fas fa-exclamation-circle mr-2"></i>`
    : `<i class="fas fa-check-circle mr-2"></i>`;
  statusMessage.innerHTML = `${iconHtml}${message}`;

  let baseClasses =
    "py-3 px-4 rounded-md text-sm font-medium flex items-center"; // Common classes
  let typeClasses = "";

  if (isError) {
    typeClasses = "bg-red-100 text-red-700 border border-red-200";
  } else {
    // recommendations.js used indigo for success, header.js used green. Sticking with indigo.
    typeClasses = "bg-indigo-100 text-indigo-700 border border-indigo-200";
  }
  statusMessage.className = `${baseClasses} ${typeClasses}`;

  statusMessageContainer.classList.remove("hidden", "fade-out-up");
  statusMessageContainer.classList.add("slide-in-down");

  // Clear any existing timeouts to prevent multiple hide operations
  if (statusMessageContainer.dataset.hideTimeoutId) {
    clearTimeout(parseInt(statusMessageContainer.dataset.hideTimeoutId));
  }

  if (duration > 0) {
    const timeoutId = setTimeout(() => {
      statusMessageContainer.classList.remove("slide-in-down");
      statusMessageContainer.classList.add("fade-out-up");
      setTimeout(() => {
        statusMessageContainer.classList.add("hidden");
      }, 500); // Duration of fade-out animation
    }, duration);
    statusMessageContainer.dataset.hideTimeoutId = timeoutId.toString();
  }
}

/**
 * Handles authentication errors by clearing token, updating UI, showing message, and redirecting to login.
 */
function handleAuthError() {
  localStorage.removeItem("token");
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  if (userLoggedIn) userLoggedIn.classList.add("hidden");
  if (userNotLoggedIn) userNotLoggedIn.classList.remove("hidden");
  if (welcomeMessage) welcomeMessage.textContent = "";

  showMessage("Please log in to view recommendations.", true, 3000);
  setTimeout(() => {
    window.location.href = "/login";
  }, 3000);
}

/**
 * Fetches user profile to check login status and update UI.
 * @returns {Promise<boolean>} True if user is logged in and profile fetched, false otherwise.
 */
async function checkUserProfile() {
  const token = getToken();
  if (token) {
    try {
      const response = await fetch("/api/auth/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const username = data.user.username;
        if (userLoggedIn) userLoggedIn.classList.remove("hidden");
        if (userNotLoggedIn) userNotLoggedIn.classList.add("hidden");
        if (welcomeMessage) welcomeMessage.textContent = `${username}`;
        return true;
      } else {
        console.warn(`Profile fetch failed with status: ${response.status}`);
        handleAuthError();
        return false;
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      showMessage(
        "Error fetching user profile. Please ensure you are connected and try logging in again.",
        true,
        4000
      );
      // Fallback to handleAuthError to clear session and redirect
      handleAuthError();
      return false;
    }
  } else {
    if (userLoggedIn) userLoggedIn.classList.add("hidden");
    if (userNotLoggedIn) userNotLoggedIn.classList.remove("hidden");
    if (welcomeMessage) welcomeMessage.textContent = "";
    return false;
  }
}

/**
 * Logs out the current user.
 */
async function logoutUser() {
  const token = getToken();
  // Always clear client-side token and update UI immediately for responsiveness
  localStorage.removeItem("token");
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  if (userLoggedIn) userLoggedIn.classList.add("hidden");
  if (userNotLoggedIn) userNotLoggedIn.classList.remove("hidden");
  if (welcomeMessage) welcomeMessage.textContent = "";

  if (token) {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // Send the token for the server to invalidate session
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        showMessage("Logout successful!", false, 2000);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Server logout failed." }));
        console.error(
          "Logout API error:",
          errorData.message || response.statusText
        );
        showMessage(
          errorData.message ||
            "Error logging out on server. Client session cleared.",
          true,
          3000
        );
      }
    } catch (error) {
      console.error("Error during logout fetch:", error);
      showMessage(
        "Error logging out due to network issue. Client session cleared.",
        true,
        3000
      );
    }
  } else {
    // No token, but user clicked logout.
    showMessage("You were not logged in. Client session cleared.", false, 2000);
  }
  // Redirect after a delay to allow message to be read
  setTimeout(
    () => {
      window.location.href = "/login";
    },
    token ? 2000 : 2000
  ); // Adjust delay as needed
}

// --- RECOMMENDATION-SPECIFIC STATE AND FUNCTIONS ---

let currentFilters = {
  strategy: null, // Default will be set by active button or first fetch
  viewed: "all",
  limit: 20,
};

/**
 * Fetches recommendations based on current filters.
 * @returns {Promise<Object|null>} Recommendation data or null on error.
 */
async function fetchRecommendations() {
  const token = getToken();
  const params = new URLSearchParams();

  if (currentFilters.limit) params.append("limit", currentFilters.limit);
  if (currentFilters.strategy)
    params.append("strategy", currentFilters.strategy);
  if (currentFilters.viewed !== "all")
    params.append("viewed", currentFilters.viewed);

  // Show skeleton loader
  const container = document.getElementById("recommendationsContainer");
  const skeletonHTML = `
    <div class="skeleton-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${Array(currentFilters.limit)
          .fill(0)
          .map(
            () => `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                <div class="w-full h-48 bg-gray-300"></div>
                <div class="p-6">
                    <div class="h-4 bg-gray-300 rounded w-1/4 mb-3"></div>
                    <div class="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-gray-300 rounded w-full mb-1"></div>
                    <div class="h-4 bg-gray-300 rounded w-5/6 mb-4"></div>
                    <div class="flex items-center justify-between">
                        <div class="h-4 bg-gray-300 rounded w-1/3"></div>
                        <div class="h-10 bg-gray-400 rounded w-1/4"></div>
                    </div>
                </div>
            </div>
        `
          )
          .join("")}
    </div>`;
  if (container) container.innerHTML = skeletonHTML;

  try {
    const response = await fetch(`/api/recommendations?${params.toString()}`, {
      method: "GET",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }), // Conditionally add Auth header
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      displayRecommendations(data.recommendations || []);
      return data;
    } else {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error fetching recommendations." }));
      showMessage(errorData.message || "Error fetching recommendations", true);
      displayRecommendations([]); // Show empty state
      return null;
    }
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    showMessage("Network error fetching recommendations", true);
    displayRecommendations([]); // Show empty state
    return null;
  }
}

/**
 * Fetches recommendation statistics.
 */
async function fetchStats() {
  const token = getToken();
  try {
    const response = await fetch("/api/recommendations/stats", {
      method: "GET",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      displayStats(data.stats);
    } else {
      console.warn("Could not fetch stats, server returned:", response.status);
      // Optionally display a default or empty stats state
      displayStats({}); // Display empty/default stats
    }
  } catch (error) {
    console.error("Error fetching stats:", error);
    // Optionally display a default or empty stats state
    displayStats({}); // Display empty/default stats
  }
}

/**
 * Displays recommendation statistics on the page.
 * @param {Object} stats - The statistics object.
 */
function displayStats(stats = {}) {
  const container = document.getElementById("statsContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center">
            <div class="p-3 bg-blue-100 rounded-lg mr-4">
                <i class="fas fa-chart-pie text-blue-600 text-xl"></i>
            </div>
            <div>
                <p class="text-2xl font-bold text-gray-900">${
                  stats.totalRecommendations || 0
                }</p>
                <p class="text-sm text-gray-600">Total Recommendations</p>
            </div>
        </div>
    </div>
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center">
            <div class="p-3 bg-indigo-100 rounded-lg mr-4">
                <i class="fas fa-eye text-indigo-600 text-xl"></i>
            </div>
            <div>
                <p class="text-2xl font-bold text-gray-900">${
                  stats.viewedRecommendations || 0
                }</p>
                <p class="text-sm text-gray-600">Viewed</p>
            </div>
        </div>
    </div>
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center">
            <div class="p-3 bg-yellow-100 rounded-lg mr-4">
                <i class="fas fa-eye-slash text-yellow-600 text-xl"></i>
            </div>
            <div>
                <p class="text-2xl font-bold text-gray-900">${
                  stats.unviewedRecommendations || 0
                }</p>
                <p class="text-sm text-gray-600">Unviewed</p>
            </div>
        </div>
    </div>
  `;
}

/**
 * Displays recommendations on the page.
 * @param {Array} recommendations - Array of recommendation objects.
 */
function displayRecommendations(recommendations) {
  const container = document.getElementById("recommendationsContainer");
  const emptyState = document.getElementById("emptyState");
  const generateEmptyBtn = document.getElementById("generateEmptyBtn"); // Button on empty state

  if (!container || !emptyState) return;

  // Remove skeleton if present
  const skeleton = container.querySelector(".skeleton-container");
  if (skeleton) skeleton.remove();

  if (!recommendations || recommendations.length === 0) {
    container.innerHTML = ""; // Clear any previous content
    emptyState.classList.remove("hidden");
    if (generateEmptyBtn) generateEmptyBtn.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  if (generateEmptyBtn) generateEmptyBtn.classList.add("hidden");

  container.innerHTML = recommendations
    .map((rec) => {
      const title =
        rec.classification?.overall_best_prediction?.plant ||
        rec.contentType ||
        "Recommendation";
      const description =
        rec.classification?.overall_best_prediction?.condition ||
        rec.reason ||
        "No description available.";
      const imageUrl = rec.imageUrl || "/placeholder.png";
      const type =
        rec.contentType ||
        (rec.classification?.overall_best_prediction?.plant
          ? "Plant"
          : "Content");
      const typeClass =
        type.toLowerCase() === "plant"
          ? "bg-indigo-100 text-indigo-800"
          : "bg-blue-100 text-blue-800";
      const iconClass =
        type.toLowerCase() === "plant" ? "fa-leaf" : "fa-lightbulb";
      const dateString = rec.createdAt
        ? new Date(rec.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "N/A";

      return `
        <div class="recommendation-card bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col" data-id="${
          rec.id
        }">
            ${
              imageUrl !== "/placeholder.png"
                ? `<img src="${imageUrl}" alt="${title}" class="w-full h-48 object-cover">`
                : `<div class="w-full h-48 bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center">
                    <i class="fas ${iconClass} text-white text-4xl"></i>
                 </div>`
            }
            <div class="p-6 flex flex-col flex-grow">
                <div class="flex items-center justify-between mb-3">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${typeClass}">
                        ${type}
                    </span>
                    ${
                      rec.wasViewed
                        ? `<span class="text-xs text-gray-500 flex items-center" title="Viewed">
                            <i class="fas fa-eye mr-1"></i>Viewed
                         </span>`
                        : `<span class="text-xs text-gray-400 flex items-center" title="Not Viewed Yet">
                            <i class="far fa-eye mr-1"></i>Unviewed
                         </span>`
                    }
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">${title}</h3>
                <p class="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">${description}</p>
                <div class="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                    <div class="flex items-center text-xs text-gray-500">
                        <i class="fas fa-clock mr-1"></i>
                        ${dateString}
                    </div>
                    <button class="view-recommendation-btn bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors" data-id="${
                      rec.id
                    }">
                        View Details
                    </button>
                </div>
            </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll(".view-recommendation-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      viewRecommendationDetails(btn.dataset.id);
    });
  });
}

/**
 * Generates new recommendations.
 */
async function generateRecommendations() {
  const token = getToken();
  const generateBtn = document.getElementById("generateBtn"); // Main button
  const generateEmptyBtn = document.getElementById("generateEmptyBtn"); // Button on empty state
  const originalText = generateBtn ? generateBtn.innerHTML : "Generate New";
  const originalEmptyText = generateEmptyBtn
    ? generateEmptyBtn.innerHTML
    : "Generate Recommendations";

  if (generateBtn) {
    generateBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
    generateBtn.disabled = true;
  }
  if (generateEmptyBtn) {
    generateEmptyBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
    generateEmptyBtn.disabled = true;
  }

  try {
    const response = await fetch("/api/recommendations/generate", {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        limit: currentFilters.limit, // Use current limit from filters
        strategy: currentFilters.strategy || "balanced", // Default strategy if not set
      }),
    });

    if (response.ok) {
      const data = await response.json();
      showMessage(`Generated ${data.count || 0} new recommendations!`, false);
      // Refresh data
      await Promise.all([fetchRecommendations(), fetchStats()]);
    } else {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Error generating recommendations." }));
      showMessage(
        errorData.message || "Error generating recommendations",
        true
      );
    }
  } catch (error) {
    console.error("Error generating recommendations:", error);
    showMessage("Network error generating recommendations", true);
  } finally {
    if (generateBtn) {
      generateBtn.innerHTML = originalText;
      generateBtn.disabled = false;
    }
    if (generateEmptyBtn) {
      generateEmptyBtn.innerHTML = originalEmptyText;
      generateEmptyBtn.disabled = false;
    }
  }
}

/**
 * Clears all viewed recommendations.
 */
async function clearViewedRecommendations() {
  const token = getToken();
  const clearBtn = document.getElementById("clearViewedBtn");
  if (!clearBtn) return;
  const originalText = clearBtn.innerHTML;

  clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Clearing...';
  clearBtn.disabled = true;

  try {
    const response = await fetch("/api/recommendations", {
      method: "DELETE",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deleteViewed: true }), // API expects this payload
    });

    if (response.ok) {
      const data = await response.json();
      showMessage(
        `Cleared ${data.deletedCount || 0} viewed recommendations!`,
        false
      );
      await Promise.all([fetchRecommendations(), fetchStats()]);
    } else {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Error clearing recommendations." }));
      showMessage(errorData.message || "Error clearing recommendations", true);
    }
  } catch (error) {
    console.error("Error clearing recommendations:", error);
    showMessage("Network error clearing recommendations", true);
  } finally {
    clearBtn.innerHTML = originalText;
    clearBtn.disabled = false;
  }
}

/**
 * Fetches and displays details for a specific recommendation in a modal.
 * @param {string} recommendationId - The ID of the recommendation.
 */
async function viewRecommendationDetails(recommendationId) {
  if (
    !recommendationId ||
    typeof recommendationId !== "string" ||
    recommendationId.trim() === ""
  ) {
    console.error(
      "viewRecommendationDetails called with invalid ID:",
      recommendationId
    );
    showMessage("Cannot view details: Invalid recommendation ID.", true);
    return;
  }
  const token = getToken();

  try {
    const response = await fetch(`/api/recommendations/${recommendationId}`, {
      method: "GET",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      showRecommendationModal(data.recommendation);
      await markAsViewed(recommendationId); // Mark as viewed after successfully fetching
    } else {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Error fetching recommendation details." }));
      showMessage(
        errorData.message || "Error fetching recommendation details",
        true
      );
    }
  } catch (error) {
    console.error("Error fetching recommendation details:", error);
    showMessage("Network error fetching recommendation details", true);
  }
}

/**
 * Marks a recommendation as viewed.
 * @param {string} recommendationId - The ID of the recommendation.
 */
async function markAsViewed(recommendationId) {
  if (
    !recommendationId ||
    typeof recommendationId !== "string" ||
    recommendationId.trim() === ""
  ) {
    console.error("markAsViewed called with invalid ID:", recommendationId);
    return; // Silently fail or show a less critical error
  }
  const token = getToken();

  try {
    const response = await fetch(
      `/api/recommendations/${recommendationId}/viewed`,
      {
        method: "PUT",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      // Update UI optimistically or after confirmation
      const card = document.querySelector(
        `.recommendation-card[data-id="${recommendationId}"]`
      );
      if (card) {
        const viewedStatusSpan = card.querySelector(
          "span[title='Not Viewed Yet'], span[title='Viewed']"
        );
        if (
          viewedStatusSpan &&
          viewedStatusSpan.textContent.includes("Unviewed")
        ) {
          viewedStatusSpan.innerHTML = `<i class="fas fa-eye mr-1"></i>Viewed`;
          viewedStatusSpan.title = "Viewed";
          viewedStatusSpan.classList.remove("text-gray-400");
          viewedStatusSpan.classList.add("text-gray-500");
          viewedStatusSpan.querySelector("i")?.classList.replace("far", "fas");
        }
      }
      // Optionally, re-fetch stats if viewed count is critical to display immediately
      // await fetchStats();
    } else {
      console.warn(
        `Failed to mark recommendation ${recommendationId} as viewed. Status: ${response.status}`
      );
    }
  } catch (error) {
    console.error("Error marking as viewed:", error);
  }
}

/**
 * Displays recommendation details in a modal.
 * @param {Object} recommendation - The recommendation object.
 */
function showRecommendationModal(recommendation) {
  const modal = document.getElementById("detailModal");
  const titleElement = document.getElementById("modalTitle");
  const contentElement = document.getElementById("modalContent");

  if (!modal || !titleElement || !contentElement) {
    console.error("Modal elements not found.");
    return;
  }

  const title =
    recommendation.classification?.overall_best_prediction?.plant ||
    recommendation.contentType ||
    "Recommendation Details";
  const description =
    recommendation.classification?.overall_best_prediction?.condition ||
    "No specific condition noted.";
  const imageUrl = recommendation.imageUrl || null;
  const type =
    recommendation.contentType ||
    (recommendation.classification?.overall_best_prediction?.plant
      ? "Plant"
      : "Content");
  const typeClass =
    type.toLowerCase() === "plant"
      ? "bg-indigo-100 text-indigo-800"
      : "bg-blue-100 text-blue-800";
  const score = recommendation.relevanceScore
    ? `${recommendation.relevanceScore.toFixed(0)}%`
    : "N/A";
  const date = new Date(recommendation.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const reason =
    recommendation.reason ||
    "General recommendation based on your profile and activity.";

  titleElement.textContent = title;
  contentElement.innerHTML = `
    <div class="space-y-4">
        ${
          imageUrl
            ? `<img src="${imageUrl}" alt="${title}" class="w-full h-64 object-cover rounded-lg mb-4 shadow-md">`
            : `<div class="w-full h-64 bg-gray-200 flex items-center justify-center rounded-lg mb-4">
                <i class="fas fa-image text-gray-400 text-5xl"></i>
             </div>`
        }
        
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 pb-2 border-b border-gray-200">
            <span class="px-3 py-1 text-xs font-semibold rounded-full ${typeClass}">
                ${type}
            </span>
            <span>Relevance: <strong class="text-gray-800">${score}</strong></span>
            <span>Date: <strong class="text-gray-800">${date}</strong></span>
        </div>
        
        <div>
            <h3 class="text-md font-semibold text-gray-800 mb-1">Condition / Summary</h3>
            <p class="text-gray-700 text-sm">${description}</p>
        </div>
        
        <div>
            <h3 class="text-md font-semibold text-gray-800 mb-1">Recommendation Basis</h3>
            <p class="text-gray-700 text-sm">${reason}</p>
        </div>
        
        ${
          recommendation.classification?.details ||
          Object.keys(recommendation.metadata || {}).length > 0
            ? `<div>
                <h3 class="text-md font-semibold text-gray-800 mb-1">Additional Details</h3>
                <pre class="text-xs bg-gray-50 p-3 rounded-md overflow-auto max-h-40 border border-gray-200">${JSON.stringify(
                  recommendation.classification?.details ||
                    recommendation.metadata,
                  null,
                  2
                )}</pre>
             </div>`
            : ""
        }

        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
            <button id="closeModalBtnInside" class="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm">
                Close
            </button>
        </div>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.focus(); // For accessibility

  const closeModalBtnInside = document.getElementById("closeModalBtnInside");
  if (closeModalBtnInside) {
    const newBtn = closeModalBtnInside.cloneNode(true); // To remove old listeners
    closeModalBtnInside.parentNode.replaceChild(newBtn, closeModalBtnInside);
    newBtn.addEventListener("click", () => modal.classList.add("hidden"));
  }
}

// --- FILTERING AND UI INTERACTIONS ---

/**
 * Sets up event listeners for filter controls.
 */
function setupFilterEventListeners() {
  document.querySelectorAll(".strategy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".strategy-btn")
        .forEach((b) =>
          b.classList.remove("active", "bg-indigo-600", "text-white")
        );
      document
        .querySelectorAll(".strategy-btn")
        .forEach((b) => b.classList.add("bg-gray-200", "text-gray-700"));
      btn.classList.add("active", "bg-indigo-600", "text-white");
      btn.classList.remove("bg-gray-200", "text-gray-700");
      currentFilters.strategy =
        btn.dataset.strategy === "all" ? null : btn.dataset.strategy;
      Promise.all([fetchRecommendations(), fetchStats()]);
    });
  });

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".view-btn")
        .forEach((b) =>
          b.classList.remove("active", "bg-indigo-600", "text-white")
        );
      document
        .querySelectorAll(".view-btn")
        .forEach((b) => b.classList.add("bg-gray-200", "text-gray-700"));
      btn.classList.add("active", "bg-indigo-600", "text-white");
      btn.classList.remove("bg-gray-200", "text-gray-700");
      currentFilters.viewed = btn.dataset.viewed;
      fetchRecommendations();
    });
  });

  const limitSelect = document.getElementById("limitSelect");
  if (limitSelect) {
    limitSelect.addEventListener("change", (e) => {
      currentFilters.limit = parseInt(e.target.value);
      fetchRecommendations();
    });
  }
}

/**
 * Updates the visual state of filter buttons.
 */
function updateFilterButtons() {
  document.querySelectorAll(".strategy-btn").forEach((btn) => {
    btn.classList.remove("active", "bg-indigo-600", "text-white");
    btn.classList.add("bg-gray-200", "text-gray-700");
    const strategyForButton =
      btn.dataset.strategy === "all" ? null : btn.dataset.strategy;
    if (strategyForButton === currentFilters.strategy) {
      btn.classList.add("active", "bg-indigo-600", "text-white");
      btn.classList.remove("bg-gray-200", "text-gray-700");
    }
  });

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.classList.remove("active", "bg-indigo-600", "text-white");
    btn.classList.add("bg-gray-200", "text-gray-700");
    if (btn.dataset.viewed === currentFilters.viewed) {
      btn.classList.add("active", "bg-indigo-600", "text-white");
      btn.classList.remove("bg-gray-200", "text-gray-700");
    }
  });

  const limitSelect = document.getElementById("limitSelect");
  if (limitSelect) limitSelect.value = currentFilters.limit.toString();
}

// --- MAIN EVENT LISTENERS SETUP ---

/**
 * Sets up all general event listeners for the page.
 */
function setupEventListeners() {
  // Header interactions (using global consts for elements)
  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle("hidden");
    });
  }

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle("hidden");
    });
  }

  if (moreMenuToggle && moreMenuMobile) {
    moreMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      moreMenuMobile.classList.toggle("hidden");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }

  // Close dropdowns/menus when clicking outside
  document.addEventListener("click", (event) => {
    if (
      profileDropdown &&
      !profileDropdown.classList.contains("hidden") &&
      profileBtn &&
      !profileBtn.contains(event.target) &&
      !profileDropdown.contains(event.target)
    ) {
      profileDropdown.classList.add("hidden");
    }
    if (
      mobileMenu &&
      !mobileMenu.classList.contains("hidden") &&
      mobileMenuBtn &&
      !mobileMenuBtn.contains(event.target) &&
      !mobileMenu.contains(event.target)
    ) {
      mobileMenu.classList.add("hidden");
    }
    if (
      moreMenuMobile &&
      !moreMenuMobile.classList.contains("hidden") &&
      moreMenuToggle &&
      !moreMenuToggle.contains(event.target) &&
      !moreMenuMobile.contains(event.target)
    ) {
      moreMenuMobile.classList.add("hidden");
    }
  });

  // Recommendation page specific buttons (fetched by ID)
  const generateBtnEl = document.getElementById("generateBtn");
  if (generateBtnEl)
    generateBtnEl.addEventListener("click", generateRecommendations);

  const generateEmptyBtnEl = document.getElementById("generateEmptyBtn");
  if (generateEmptyBtnEl)
    generateEmptyBtnEl.addEventListener("click", generateRecommendations);

  const clearViewedBtnEl = document.getElementById("clearViewedBtn");
  if (clearViewedBtnEl)
    clearViewedBtnEl.addEventListener("click", clearViewedRecommendations);

  // Modal controls
  const modal = document.getElementById("detailModal");
  const closeModalBtnPageLevel = document.getElementById("closeModalBtn"); // Main close button on modal frame

  if (modal && closeModalBtnPageLevel) {
    closeModalBtnPageLevel.addEventListener("click", () =>
      modal.classList.add("hidden")
    );
    // Close modal when clicking on the overlay (modal itself)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });
    // Close modal with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        modal.classList.add("hidden");
      }
    });
  }

  setupFilterEventListeners();
}

// --- PAGE INITIALIZATION ---

/**
 * Initializes the page: checks auth, sets up listeners, loads initial data.
 */
async function initializePage() {
  // Set default strategy from the active button or first button if none active
  const activeStrategyBtn =
    document.querySelector(".strategy-btn.active") ||
    document.querySelector(".strategy-btn");
  if (activeStrategyBtn) {
    currentFilters.strategy =
      activeStrategyBtn.dataset.strategy === "all"
        ? null
        : activeStrategyBtn.dataset.strategy;
  }

  const isLoggedIn = await checkUserProfile();

  if (!isLoggedIn) {
    // If user is not logged in, some functionalities might be disabled or hidden by CSS/server.
    // recommendations.js handles redirection via handleAuthError if API calls fail due to auth.
    // For guest access to recommendations (if supported by API), this allows page to load.
    console.log(
      "User not authenticated. Some features may be limited or require login."
    );
    // If API requires auth for recommendations, fetchRecommendations will likely trigger handleAuthError.
  }

  setupEventListeners();
  updateFilterButtons(); // Ensure UI reflects currentFilters after potential async ops or defaults

  // Initial data load
  // If not logged in and API needs auth, these will likely fail and show messages/redirect.
  await Promise.all([fetchRecommendations(), fetchStats()]);
}

// Start the application once the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializePage);
