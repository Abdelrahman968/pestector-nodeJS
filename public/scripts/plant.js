// --- START OF MERGED plant.js ---

const apiBaseUrl = "/api";
let currentPage = 1;
const limit = 12;

// DOM Elements
// From plant.js
const plantsContainer = document.getElementById("plantsContainer");
const paginationContainer = document.getElementById("paginationContainer");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo"); // Declared in original plant.js, kept.
const noPlantsMessage = document.getElementById("noPlantsMessage");
const searchInput = document.getElementById("searchInput");
const dateFilter = document.getElementById("dateFilter");
const healthFilter = document.getElementById("healthFilter");
const saveAsPdfBtn = document.getElementById("saveAsPdfBtn");
const plantModal = document.getElementById("plantModal");
const plantForm = document.getElementById("plantForm");
const plantId = document.getElementById("plantId");
const nameInput = document.getElementById("name");
const speciesInput = document.getElementById("species");
const locationInput = document.getElementById("location");
const acquisitionDateInput = document.getElementById("acquisitionDate");
const imageInput = document.getElementById("image");
const closePlantModal = document.getElementById("closePlantModal");
const cancelPlantBtn = document.getElementById("cancelPlantBtn");
const submitPlantBtn = document.getElementById("submitPlantBtn");
const plantModalTitle = document.getElementById("plantModalTitle");
const addPlantBtn = document.getElementById("addPlantBtn");

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

// Enhanced showMessage function (from header.js, assumes #statusMessageContainer and #statusMessage exist in HTML)
function showMessage(message, isError = false, duration = 5000) {
  // Matched plant.js duration
  const container = document.getElementById("statusMessageContainer");
  const statusMsg = document.getElementById("statusMessage");

  if (!container || !statusMsg) {
    console.error("Status message elements not found in DOM for showMessage");
    alert(message); // Fallback
    return;
  }

  container.classList.remove("slide-in-down", "fade-out-up", "hidden");

  // Set message text and icon
  statusMsg.innerHTML = isError
    ? `<i class="fas fa-exclamation-circle mr-2"></i>${message}`
    : `<i class="fas fa-check-circle mr-2"></i>${message}`;

  // Apply appropriate styling based on message type
  statusMsg.className = `py-3 px-4 rounded-md text-sm font-medium shadow-sm border-l-4 flex items-center`; // Base classes
  if (isError) {
    statusMsg.classList.add("bg-red-100", "text-red-700", "border-red-500"); // plant.js had border-red-200
  } else {
    statusMsg.classList.add(
      "bg-green-100",
      "text-green-700",
      "border-green-500"
    ); // plant.js had border-green-200
  }

  // Show the container
  container.classList.add("slide-in-down");

  // Auto-hide after duration
  if (duration > 0) {
    setTimeout(() => {
      container.classList.remove("slide-in-down");
      container.classList.add("fade-out-up");
      setTimeout(() => container.classList.add("hidden"), 500); // Match plant.js hide animation
    }, duration);
  }
}

// Get token from cookies or localStorage (from header.js)
function getToken() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  const tokenFromCookie = cookie ? cookie.split("=")[1] : null;
  return tokenFromCookie || localStorage.getItem("token");
}

// Debounce function (from plant.js)
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

// Format date (from plant.js)
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
    });
  }
}

// Get health status class (from plant.js)
function getHealthClass(status) {
  switch (status?.toLowerCase()) {
    case "healthy":
      return "status-healthy";
    case "concerning":
      return "status-concerning";
    case "diseased":
      return "status-diseased";
    case "recovering":
      return "status-recovering";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// --- Plant Specific Functions ---

// Fetch and display plants
async function fetchPlants(page, filters = {}) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    let url = `${apiBaseUrl}/plants?page=${page}&limit=${limit}`;
    if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
    if (filters.date && filters.date !== "all") url += `&date=${filters.date}`;
    if (filters.health && filters.health !== "all")
      url += `&health=${filters.health}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Failed to fetch plants");

    if (plantsContainer && paginationContainer && noPlantsMessage) {
      // Check if elements exist
      if (data.status === "success" && data.plants.length > 0) {
        renderPlants(data.plants);
        updatePagination(data.pagination);
        noPlantsMessage.classList.add("hidden");
        paginationContainer.classList.remove("hidden");
      } else {
        plantsContainer.innerHTML = "";
        paginationContainer.classList.add("hidden");
        noPlantsMessage.classList.remove("hidden");
      }
    } else {
      console.warn("Plant display elements not found. Skipping render.");
    }
  } catch (error) {
    showMessage(error.message || "Error fetching plants", true);
    if (plantsContainer) plantsContainer.innerHTML = "";
    if (paginationContainer) paginationContainer.classList.add("hidden");
    if (noPlantsMessage) noPlantsMessage.classList.remove("hidden");
  }
}

// Render plants
function renderPlants(plants) {
  if (!plantsContainer || !noPlantsMessage || !paginationContainer) return;

  plantsContainer.innerHTML = "";
  noPlantsMessage.classList.add("hidden");
  paginationContainer.classList.remove("hidden");

  plants.forEach((plant, index) => {
    const healthStatus =
      plant.healthHistory[plant.healthHistory.length - 1]?.status || "healthy";
    const healthClass = getHealthClass(healthStatus);
    const formattedDate = plant.acquisitionDate
      ? formatDate(plant.acquisitionDate)
      : "Unknown";

    const card = document.createElement("div");
    card.className = `bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    // Using backticks for easier readability of plant._id in onclick handlers.
    // Ensuring all string arguments to onclick handlers are properly quoted.
    card.innerHTML = `
        <div class="h-40 bg-gray-200 relative overflow-hidden">
            <img src="${plant.imageUrl || "/img/plant-background.jpg"}" alt="${
      plant.name
    }" class="w-full h-full object-cover">
            <div class="absolute top-3 right-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthClass} status-badge">
                    ${healthStatus} 
                </span>
            </div>
        </div>
        <div class="p-5">
            <h3 class="text-lg font-semibold text-gray-900 truncate">${
              plant.name
            }</h3>
            <p class="text-sm font-medium text-gray-700 mb-1">${
              plant.species
            }</p>
            <p class="text-xs text-gray-500 mb-1">Location: ${
              plant.location
            }</p>
            <p class="text-xs text-gray-500 mb-3">Added: ${formattedDate}</p>
            <div class="mb-3">
                <label for="status-${
                  plant._id
                }" class="block text-sm font-medium text-gray-700 mb-1">Change Status</label>
                <select id="status-${
                  plant._id
                }" class="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" onchange="updatePlantStatus('${
      plant._id
    }', this.value)">
                    <option value="healthy" ${
                      healthStatus === "healthy" ? "selected" : ""
                    }>Healthy</option>
                    <option value="concerning" ${
                      healthStatus === "concerning" ? "selected" : ""
                    }>Concerning</option>
                    <option value="diseased" ${
                      healthStatus === "diseased" ? "selected" : ""
                    }>Diseased</option>
                    <option value="recovering" ${
                      healthStatus === "recovering" ? "selected" : ""
                    }>Recovering</option>
                </select>
            </div>
            <div class="mt-3 flex space-x-2">
                <button onclick="openEditPlantModal('${
                  plant._id
                }', '${plant.name.replace(
      /'/g,
      "\\'"
    )}', '${plant.species.replace(/'/g, "\\'")}', '${plant.location.replace(
      /'/g,
      "\\'"
    )}', '${
      plant.acquisitionDate ? plant.acquisitionDate.split("T")[0] : ""
    }')" class="flex-1 flex items-center justify-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">
                    <i class="fas fa-edit mr-2"></i>Edit
                </button>
                <button onclick="removePlant('${
                  plant._id
                }')" class="flex-1 flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                    <i class="fas fa-trash mr-2"></i>Remove
                </button>
            </div>
        </div>
    `;
    plantsContainer.appendChild(card);
  });
}

// Update plant status
async function updatePlantStatus(plantId, newStatus) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/plants/${plantId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to update plant status");

    showMessage("Plant status updated successfully");
    fetchPlants(currentPage, getCurrentFilters());
  } catch (error) {
    showMessage(error.message || "Error updating plant status", true);
  }
}

// Remove plant
async function removePlant(id) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/plants/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Failed to remove plant");

    showMessage("Plant removed successfully");
    fetchPlants(currentPage, getCurrentFilters());
  } catch (error) {
    showMessage(error.message || "Error removing plant", true);
  }
}

// Open plant modal for adding
function openAddPlantModal() {
  if (
    !plantModal ||
    !plantModalTitle ||
    !plantId ||
    !nameInput ||
    !speciesInput ||
    !locationInput ||
    !acquisitionDateInput ||
    !imageInput ||
    !submitPlantBtn
  )
    return;
  plantModalTitle.textContent = "Add New Plant";
  plantId.value = "";
  nameInput.value = "";
  speciesInput.value = "";
  locationInput.value = "";
  acquisitionDateInput.value = "";
  imageInput.value = "";
  submitPlantBtn.textContent = "Submit";
  plantModal.classList.remove("hidden");
}

// Open plant modal for editing
function openEditPlantModal(id, name, species, location, acquisitionDate) {
  if (
    !plantModal ||
    !plantModalTitle ||
    !plantId ||
    !nameInput ||
    !speciesInput ||
    !locationInput ||
    !acquisitionDateInput ||
    !imageInput ||
    !submitPlantBtn
  )
    return;
  plantModalTitle.textContent = "Edit Plant";
  plantId.value = id;
  nameInput.value = name;
  speciesInput.value = species;
  locationInput.value = location;
  acquisitionDateInput.value = acquisitionDate;
  imageInput.value = ""; // Reset file input (cannot prefill due to security)
  submitPlantBtn.textContent = "Update";
  plantModal.classList.remove("hidden");
}

// Close plant modal
function closePlantModalFunc() {
  if (plantModal) plantModal.classList.add("hidden");
}

// Submit or update plant
async function submitPlant(event) {
  event.preventDefault();

  const token = getToken();
  if (!token) {
    window.location.href = "/login";
    return;
  }

  if (
    !nameInput ||
    !speciesInput ||
    !locationInput ||
    !acquisitionDateInput ||
    !imageInput ||
    !plantId
  )
    return;

  const formData = new FormData();
  formData.append("name", nameInput.value);
  formData.append("species", speciesInput.value);
  formData.append("location", locationInput.value);
  if (acquisitionDateInput.value)
    formData.append("acquisitionDate", acquisitionDateInput.value);
  if (imageInput.files[0]) formData.append("image", imageInput.files[0]);

  try {
    const isEdit = plantId.value;
    const url = isEdit
      ? `${apiBaseUrl}/plants/${plantId.value}`
      : `${apiBaseUrl}/plants`;
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` }, // Content-Type is set by FormData
      body: formData,
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(
        data.message || `Failed to ${isEdit ? "update" : "add"} plant`
      );

    showMessage(`Plant ${isEdit ? "updated" : "added"} successfully`);
    closePlantModalFunc();
    fetchPlants(currentPage, getCurrentFilters());
  } catch (error) {
    showMessage(
      error.message || `Error ${plantId.value ? "updating" : "adding"} plant`,
      true
    );
  }
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
  if (dateFilter) filters.date = dateFilter.value;
  if (healthFilter) filters.health = healthFilter.value;
  return filters;
}

// --- User/Auth/Header Specific Functions ---

// Fetch user profile to check login status and get username (from header.js)
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
        // Only redirect if not already on login/register page
        if (!["/login", "/register"].includes(window.location.pathname)) {
          window.location.href = "/login";
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (userLoggedIn) userLoggedIn.classList.add("hidden");
      if (userNotLoggedIn) userNotLoggedIn.classList.remove("hidden");
      showMessage("Error fetching user profile. Please log in again.", true);
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
    // If on a page that requires auth (like plants), redirect. Otherwise, stay.
    // This logic is now handled by initializePage specific functions.
  }
}

// Logout function (from header.js)
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

      localStorage.removeItem("token"); // Remove token regardless of API response for faster UI update
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      if (response.ok) {
        showMessage("Logout successful!", false);
      } else {
        // Even if API logout fails, client-side tokens are cleared.
        // User will be effectively logged out.
        const data = await response.json().catch(() => ({})); // Try to get error message
        showMessage(
          data.message || "Logout completed client-side. Server-side issue.",
          true
        );
      }
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500); // Reduced delay slightly
    } catch (error) {
      console.error("Error during logout:", error);
      localStorage.removeItem("token"); // Ensure token is cleared on network error
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      showMessage("Error logging out. Cleared session locally.", true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }
  } else {
    // If no token, just redirect to login
    window.location.href = "/login";
  }
}

// --- Initialization Function for Plant Page ---
async function initializePlantPage() {
  const token = getToken();
  if (!token) {
    // If not on login/register, redirect to login for plant page
    if (!["/login", "/register"].includes(window.location.pathname)) {
      window.location.href = "/login";
    }
  } else {
    // Token exists, proceed to fetch plants if on the plants page
    // Check if crucial plant page elements exist before fetching
    if (plantsContainer && paginationContainer && noPlantsMessage) {
      fetchPlants(currentPage, getCurrentFilters());
    }
  }
}

// --- Event Listeners ---
// Document ready or DOMContentLoaded might be better for attaching listeners if elements are not guaranteed
document.addEventListener("DOMContentLoaded", () => {
  // Plant specific listeners
  if (prevPageBtn)
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) fetchPlants(currentPage - 1, getCurrentFilters());
    });
  if (nextPageBtn)
    nextPageBtn.addEventListener("click", () => {
      fetchPlants(currentPage + 1, getCurrentFilters());
    });
  if (searchInput)
    searchInput.addEventListener(
      "input",
      debounce(() => fetchPlants(1, getCurrentFilters()), 500)
    );
  if (dateFilter)
    dateFilter.addEventListener("change", () =>
      fetchPlants(1, getCurrentFilters())
    );
  if (healthFilter)
    healthFilter.addEventListener("change", () =>
      fetchPlants(1, getCurrentFilters())
    );
  if (closePlantModal)
    closePlantModal.addEventListener("click", closePlantModalFunc);
  if (cancelPlantBtn)
    cancelPlantBtn.addEventListener("click", closePlantModalFunc);
  if (plantForm) plantForm.addEventListener("submit", submitPlant);
  if (addPlantBtn) addPlantBtn.addEventListener("click", openAddPlantModal);

  if (saveAsPdfBtn)
    saveAsPdfBtn.addEventListener("click", async () => {
      try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
          showMessage("PDF library not loaded.", true);
          return;
        }
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("My Plants Collection", 10, 10);

        let y = 20;
        const plantItems = document.querySelectorAll("#plantsContainer > div");
        if (plantItems.length === 0) {
          showMessage("No plants to save in PDF.", false);
          return;
        }
        plantItems.forEach((item, index) => {
          const name = item.querySelector("h3")?.textContent || "N/A";
          const species = item.querySelector("p.text-sm")?.textContent || "N/A";
          const location =
            item
              .querySelector("p.text-xs:nth-of-type(2)")
              ?.textContent.replace("Location: ", "") || "N/A"; // Adjusted selector based on common card structure
          const date =
            item
              .querySelector("p.text-xs:nth-of-type(3)")
              ?.textContent.replace("Added: ", "") || "N/A"; // Adjusted selector
          const statusBadge = item.querySelector(".status-badge");
          const status = statusBadge ? statusBadge.textContent.trim() : "N/A";

          doc.setFontSize(12);
          doc.text(`${index + 1}. ${name} - ${species}`, 10, y);
          doc.text(`Location: ${location}`, 10, y + 5);
          doc.text(`Added: ${date}`, 10, y + 10);
          doc.text(`Status: ${status}`, 10, y + 15);
          y += 25;

          if (y > 280) {
            // Check for page overflow
            doc.addPage();
            y = 10; // Reset y position for new page
          }
        });

        doc.save("plants_collection.pdf");
        showMessage("Plants collection saved as PDF successfully");
      } catch (error) {
        console.error("Error generating PDF:", error);
        showMessage("Error generating PDF. Check console for details.", true);
      }
    });

  // Header specific listeners
  if (profileDropdownBtn)
    profileDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent document click listener from immediately closing it
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

  if (logoutBtn)
    logoutBtn.addEventListener("click", () => {
      logoutUser();
    });

  // Initial Calls
  checkUserProfile(); // Update header UI based on auth status

  // Determine if this is the main plants page and initialize it
  // This check helps if the script is included on other pages where plantsContainer might not exist.
  if (document.getElementById("plantsContainer")) {
    initializePlantPage();
  }
});

// Expose functions to global scope if they are called via inline HTML event attributes (onclick="...")
// This is generally not recommended, prefer addEventListener.
// However, original code uses inline handlers, so we need to ensure these functions are accessible.
window.updatePlantStatus = updatePlantStatus;
window.openEditPlantModal = openEditPlantModal;
window.removePlant = removePlant;

// --- END OF MERGED plant.js ---
