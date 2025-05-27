const apiBaseUrl = "/api";
let currentPage = 1;
const limit = 12;

// DOM Elements
// From treatment.js
const treatmentContainer = document.getElementById("treatmentContainer");
const paginationContainer = document.getElementById("paginationContainer");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo"); // Present in treatment.js
const noTreatmentMessage = document.getElementById("noTreatmentMessage");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const saveAsPdfBtn = document.getElementById("saveAsPdfBtn");
const treatmentForm = document.getElementById("treatmentForm");
const diseaseStatsSection = document.getElementById("diseaseStatsSection");
const statsContainer = document.getElementById("statsContainer");
const noStatsMessage = document.getElementById("noStatsMessage");
const loadStatsBtn = document.getElementById("loadStatsBtn");
const hideStatsBtn = document.getElementById("hideStatsBtn");

// From header.js (and common elements)
const profileDropdownBtn = document.getElementById("profileDropdownBtn"); // `profileBtn` from header.js is this element
const profileDropdown = document.getElementById("profileDropdown");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const moreMenuToggle = document.getElementById("moreMenuToggle");
const moreMenuMobile = document.getElementById("moreMenuMobile");
const userLoggedIn = document.getElementById("userLoggedIn");
const userNotLoggedIn = document.getElementById("userNotLoggedIn");
const welcomeMessage = document.getElementById("welcomeMessage");
const logoutBtn = document.getElementById("logoutBtn"); // Common element

// --- Utility Functions ---

// Show status message (from treatment.js, similar to plant.js)
function showMessage(message, isError = false, duration = 5000) {
  const statusMessageContainer = document.getElementById(
    "statusMessageContainer"
  );
  const statusMessage = document.getElementById("statusMessage");

  if (!statusMessageContainer || !statusMessage) {
    console.error("Status message elements not found for showMessage.");
    alert(message); // Fallback
    return;
  }

  statusMessageContainer.classList.remove(
    "slide-in-down",
    "fade-out-up",
    "hidden"
  );
  statusMessage.innerHTML = isError
    ? `<i class="fas fa-exclamation-circle mr-2"></i>${message}`
    : `<i class="fas fa-check-circle mr-2"></i>${message}`;
  statusMessage.className = `py-3 px-4 rounded-md text-sm font-medium ${
    isError
      ? "bg-red-100 text-red-700 border border-red-200"
      : "bg-green-100 text-green-700 border border-green-200"
  }`;
  statusMessageContainer.classList.add("slide-in-down");
  setTimeout(() => {
    statusMessageContainer.classList.remove("slide-in-down");
    statusMessageContainer.classList.add("fade-out-up");
    setTimeout(() => statusMessageContainer.classList.add("hidden"), 500);
  }, duration);
}

// Get token from cookies or localStorage (from header.js - comprehensive version)
function getToken() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  const tokenFromCookie = cookie ? cookie.split("=")[1] : null;
  return tokenFromCookie || localStorage.getItem("token");
}

// Debounce function (from treatment.js)
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Format date (from treatment.js)
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

// Get treatment status class (from treatment.js)
function getStatusClass(status) {
  switch (status?.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress": // Assuming 'in_progress' based on common patterns, adjust if needed
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// --- Auth/User Profile Functions (from header.js) ---

// Fetch user profile to check login status and get username
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
      } else {
        localStorage.removeItem("token");
        document.cookie =
          "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        if (userLoggedIn) userLoggedIn.classList.add("hidden");
        if (userNotLoggedIn) userNotLoggedIn.classList.remove("hidden");
        if (!["/login", "/register"].includes(window.location.pathname)) {
          window.location.href = "/login";
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (userLoggedIn) userLoggedIn.classList.add("hidden");
      if (userNotLoggedIn) userNotLoggedIn.classList.remove("hidden");
      // showMessage might not be ideal here if it relies on DOM fully loaded by treatment.js specific templates
      // console.error("Error fetching user profile. Please log in again.");
      localStorage.removeItem("token");
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      if (!["/login", "/register"].includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    }
  } else {
    if (userLoggedIn) userLoggedIn.classList.add("hidden");
    if (userNotLoggedIn) userNotLoggedIn.classList.remove("hidden");
  }
}

// Logout function
async function logoutUser() {
  const token = getToken();
  if (token) {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      localStorage.removeItem("token"); // Clear client-side token regardless
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      if (response.ok) {
        showMessage("Logout successful!", false);
      } else {
        const data = await response.json().catch(() => ({}));
        showMessage(
          data.message || "Logout completed client-side. Server error.",
          true
        );
      }
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (error) {
      console.error("Error during logout:", error);
      localStorage.removeItem("token"); // Ensure client-side token is cleared on error
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      showMessage("Error logging out. Cleared session locally.", true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }
  } else {
    window.location.href = "/login"; // If no token, just redirect
  }
}

// --- Treatment Specific Functions ---

// Fetch and display treatment plans
async function fetchTreatmentPlans(page, filters = {}) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    let url = `${apiBaseUrl}/treatment?page=${page}&limit=${limit}`;
    if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
    if (filters.status && filters.status !== "all")
      url += `&status=${filters.status}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to fetch treatment plans");

    if (treatmentContainer && paginationContainer && noTreatmentMessage) {
      // Ensure elements exist
      if (data.status === "success" && data.treatmentPlans.length > 0) {
        renderTreatmentPlans(data.treatmentPlans);
        if (paginationContainer && data.pagination)
          updatePagination(data.pagination);
        noTreatmentMessage.classList.add("hidden");
        if (paginationContainer) paginationContainer.classList.remove("hidden");
      } else {
        treatmentContainer.innerHTML = "";
        if (paginationContainer) paginationContainer.classList.add("hidden");
        noTreatmentMessage.classList.remove("hidden");
      }
    }
  } catch (error) {
    showMessage(error.message || "Error fetching treatment plans", true);
    if (treatmentContainer) treatmentContainer.innerHTML = "";
    if (paginationContainer) paginationContainer.classList.add("hidden");
    if (noTreatmentMessage) noTreatmentMessage.classList.remove("hidden");
  }
}

// Render treatment plans
function renderTreatmentPlans(plans) {
  if (!treatmentContainer || !noTreatmentMessage || !paginationContainer)
    return;

  treatmentContainer.innerHTML = "";
  noTreatmentMessage.classList.add("hidden");
  paginationContainer.classList.remove("hidden");

  plans.forEach((item, index) => {
    const statusClass = getStatusClass(item.status);
    const formattedCreatedAt = formatDate(item.createdAt);
    const formattedUpdatedAt = formatDate(item.updatedAt);

    const card = document.createElement("div");
    card.className = `bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    card.innerHTML = `
        <div class="p-5">
            <div class="flex justify-between items-start mb-3">
                <h3 class="text-lg font-semibold text-gray-900 truncate">${
                  item.plantName
                }</h3>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                    ${item.status.replace("_", " ")}
                </span>
            </div>
            <p class="text-sm font-medium text-gray-700 mb-1">${
              item.disease
            }</p>
            <p class="text-xs text-gray-500 mb-3">Created: ${formattedCreatedAt}</p>
            <p class="text-xs text-gray-500 mb-3">Updated: ${formattedUpdatedAt}</p>
            <div class="text-sm text-gray-600 mb-3 line-clamp-2">${
              item.treatment
            }</div>
            <div class="mt-3 flex space-x-2">
                <button onclick="updateTreatmentStatus('${
                  item._id
                }', 'completed')" class="flex-1 flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
                    <i class="fas fa-check mr-2"></i>Complete
                </button>
                 <button onclick="updateTreatmentStatus('${
                   item._id
                 }', 'failed')" class="flex-1 flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600">
                    <i class="fas fa-times mr-2"></i>Mark Failed
                </button>
                <button onclick="removeTreatmentPlan('${
                  item._id
                }')" class="flex-1 flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                    <i class="fas fa-trash mr-2"></i>Remove
                </button>
            </div>
        </div>
    `;
    treatmentContainer.appendChild(card);
  });
}

// Create treatment plan
async function createTreatmentPlan(event) {
  event.preventDefault();

  const token = getToken();
  if (!token) {
    window.location.href = "/login";
    return;
  }

  const plantNameEl = document.getElementById("plantName");
  const diseaseEl = document.getElementById("disease");
  const treatmentEl = document.getElementById("treatment");

  if (!plantNameEl || !diseaseEl || !treatmentEl) {
    showMessage("Form elements not found.", true);
    return;
  }

  const treatmentData = {
    plantName: plantNameEl.value,
    disease: diseaseEl.value,
    treatment: treatmentEl.value,
  };

  if (
    !treatmentData.plantName ||
    !treatmentData.disease ||
    !treatmentData.treatment
  ) {
    showMessage("Please fill in all fields", true);
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/treatment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(treatmentData),
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to create treatment plan");

    showMessage("Treatment plan created successfully");
    if (treatmentForm) treatmentForm.reset();
    fetchTreatmentPlans(currentPage, getCurrentFilters());
  } catch (error) {
    showMessage(error.message || "Error creating treatment plan", true);
  }
}

// Update treatment status
async function updateTreatmentStatus(id, status) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/treatment/${id}`, {
      method: "PUT", // Or PATCH depending on API design
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to update treatment status");

    showMessage("Treatment status updated successfully");
    fetchTreatmentPlans(currentPage, getCurrentFilters());
  } catch (error) {
    showMessage(error.message || "Error updating treatment status", true);
  }
}

// Remove treatment plan
async function removeTreatmentPlan(id) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/treatment/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to remove treatment plan");

    showMessage("Treatment plan removed successfully");
    fetchTreatmentPlans(currentPage, getCurrentFilters()); // Refetch current page
  } catch (error) {
    showMessage(error.message || "Error removing treatment plan", true);
  }
}

// Fetch and display disease statistics
async function fetchDiseaseStats() {
  if (!statsContainer || !noStatsMessage || !hideStatsBtn) {
    console.warn("Statistics DOM elements not found.");
    return;
  }
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/analytics/user`, {
      // Assuming this endpoint provides disease stats
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to fetch disease statistics");

    if (
      data.status === "success" &&
      data.analytics &&
      data.analytics.commonConditions && // Changed from commonDiseases
      data.analytics.commonConditions.length > 0 // Changed from commonDiseases
    ) {
      renderDiseaseStats(data.analytics.commonConditions); // Changed from commonDiseases
      statsContainer.classList.remove("hidden");
      noStatsMessage.classList.add("hidden");
      hideStatsBtn.classList.remove("hidden");
      showMessage("Disease statistics loaded successfully");
    } else {
      statsContainer.innerHTML = "";
      statsContainer.classList.add("hidden");
      noStatsMessage.classList.remove("hidden");
      hideStatsBtn.classList.add("hidden");
      showMessage(
        "No disease statistics found or data is in unexpected format.",
        false
      );
    }
  } catch (error) {
    showMessage(error.message || "Error fetching disease statistics", true);
    statsContainer.innerHTML = "";
    statsContainer.classList.add("hidden");
    noStatsMessage.classList.remove("hidden");
    hideStatsBtn.classList.add("hidden");
  }
}

// Render disease statistics
function renderDiseaseStats(diseases) {
  if (!statsContainer) return;
  statsContainer.innerHTML = "";
  const maxCount = Math.max(...diseases.map((d) => d.count)) || 1;

  diseases.forEach((disease, index) => {
    const percentage = (disease.count / maxCount) * 100;
    const card = document.createElement("div");
    card.className = `bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    card.innerHTML = `
        <div class="p-5">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-lg font-semibold text-gray-900">${disease._id}</h3>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    ${disease.count} Cases 
                </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-indigo-600 h-2.5 rounded-full" style="width: ${percentage}%; transition: width 0.5s ease;"></div>
            </div>
        </div>
    `;
    statsContainer.appendChild(card);
  });
}

// Hide stats section
function hideStatsSection() {
  if (statsContainer) statsContainer.classList.add("hidden");
  if (noStatsMessage) noStatsMessage.classList.add("hidden"); // Ensure this is also hidden
  if (hideStatsBtn) hideStatsBtn.classList.add("hidden");
}

// Update pagination
function updatePagination(pagination) {
  if (
    !prevPageBtn ||
    !nextPageBtn ||
    !document.getElementById("startPage") ||
    !document.getElementById("endPage") ||
    !document.getElementById("totalResults")
  )
    return;
  currentPage = pagination.page;
  document.getElementById("startPage").textContent = pagination.start;
  document.getElementById("endPage").textContent = pagination.end;
  document.getElementById("totalResults").textContent = pagination.total;
  prevPageBtn.disabled = pagination.page === 1;
  nextPageBtn.disabled = pagination.page === pagination.pages;
}

// Get current filters
function getCurrentFilters() {
  const filters = {};
  if (searchInput) filters.search = searchInput.value.trim();
  if (statusFilter) filters.status = statusFilter.value;
  return filters;
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  // Treatment specific listeners
  if (prevPageBtn)
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1)
        fetchTreatmentPlans(currentPage - 1, getCurrentFilters());
    });
  if (nextPageBtn)
    nextPageBtn.addEventListener("click", () => {
      fetchTreatmentPlans(currentPage + 1, getCurrentFilters());
    });
  if (searchInput)
    searchInput.addEventListener(
      "input",
      debounce(() => fetchTreatmentPlans(1, getCurrentFilters()), 500)
    );
  if (statusFilter)
    statusFilter.addEventListener("change", () =>
      fetchTreatmentPlans(1, getCurrentFilters())
    );
  if (treatmentForm)
    treatmentForm.addEventListener("submit", createTreatmentPlan);

  if (saveAsPdfBtn)
    saveAsPdfBtn.addEventListener("click", async () => {
      try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
          showMessage("PDF library (jsPDF) not loaded.", true);
          return;
        }
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Treatment Plans", 10, 10);

        let y = 20;
        const treatmentItems = document.querySelectorAll(
          "#treatmentContainer > div"
        );
        if (treatmentItems.length === 0) {
          showMessage("No treatment plans to save in PDF.", false);
          return;
        }
        treatmentItems.forEach((item, index) => {
          const plantName = item.querySelector("h3")?.textContent || "N/A";
          const disease = item.querySelector("p.text-sm")?.textContent || "N/A";
          const treatment =
            item.querySelector("div.text-sm")?.textContent.trim() || "N/A";
          const status =
            item.querySelector("span.rounded-full")?.textContent.trim() ||
            "N/A";

          doc.setFontSize(12);
          doc.text(`${index + 1}. Plant: ${plantName}`, 10, y);
          doc.text(`   Disease: ${disease}`, 10, y + 5);
          doc.text(`   Status: ${status}`, 10, y + 10);

          // Wrap treatment text
          const treatmentLines = doc.splitTextToSize(
            `   Treatment: ${treatment}`,
            180
          ); // 180 is width
          doc.text(treatmentLines, 10, y + 15);
          y += 15 + treatmentLines.length * 5 + 5; // Adjust y based on lines

          if (y > 280) {
            doc.addPage();
            y = 10;
          }
        });

        doc.save("treatment_plans.pdf");
        showMessage("Treatment plans saved as PDF successfully");
      } catch (error) {
        console.error("Error generating PDF:", error);
        showMessage("Error generating PDF. Check console for details.", true);
      }
    });

  if (loadStatsBtn) loadStatsBtn.addEventListener("click", fetchDiseaseStats);
  if (hideStatsBtn) hideStatsBtn.addEventListener("click", hideStatsSection);

  // Header specific listeners
  if (profileDropdownBtn)
    profileDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (profileDropdown) profileDropdown.classList.toggle("hidden");
    });
  if (mobileMenuBtn)
    mobileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (mobileMenu) mobileMenu.classList.toggle("hidden");
    });
  if (moreMenuToggle)
    moreMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (moreMenuMobile) moreMenuMobile.classList.toggle("hidden");
    });

  document.addEventListener("click", (event) => {
    if (
      profileDropdown &&
      profileDropdownBtn &&
      !profileDropdownBtn.contains(event.target) &&
      !profileDropdown.contains(event.target)
    ) {
      profileDropdown.classList.add("hidden");
    }
    if (
      mobileMenu &&
      mobileMenuBtn &&
      !mobileMenuBtn.contains(event.target) &&
      !mobileMenu.contains(event.target)
    ) {
      mobileMenu.classList.add("hidden");
    }
    if (
      moreMenuMobile &&
      moreMenuToggle &&
      !moreMenuToggle.contains(event.target) &&
      !moreMenuMobile.contains(event.target)
    ) {
      moreMenuMobile.classList.add("hidden");
    }
  });

  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);

  // Initial Calls
  checkUserProfile(); // Update header UI

  // Initialize treatment page specific content
  function initializeTreatmentPage() {
    const token = getToken();
    if (!token) {
      if (!["/login", "/register"].includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    } else {
      // Check if on treatment page before fetching
      if (document.getElementById("treatmentContainer")) {
        fetchTreatmentPlans(currentPage);
      }
    }
  }
  initializeTreatmentPage();
});

// Expose functions to global scope if they are called via inline HTML event attributes
window.updateTreatmentStatus = updateTreatmentStatus;
window.removeTreatmentPlan = removeTreatmentPlan;
