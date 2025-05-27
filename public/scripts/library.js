// Combined JavaScript File: app.js

// DOM Elements
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
const searchInput = document.getElementById("searchInput");
const filterPlant = document.getElementById("filterPlant");
const diseaseLibrary = document.getElementById("diseaseLibrary");
const plantSections = document.querySelectorAll(".plant-section");
const accordionToggles = document.querySelectorAll(".accordion-toggle");

// Show status message
function showMessage(message, isError = false, duration = 3000) {
  let statusMessageContainer = document.getElementById(
    "statusMessageContainer"
  );
  if (!statusMessageContainer) {
    statusMessageContainer = document.createElement("div");
    statusMessageContainer.id = "statusMessageContainer";
    statusMessageContainer.classList.add("mb-6");
    document.querySelector("main").prepend(statusMessageContainer);
  }

  let statusMessage = document.getElementById("statusMessage");
  if (!statusMessage) {
    statusMessage = document.createElement("div");
    statusMessage.id = "statusMessage";
    statusMessageContainer.appendChild(statusMessage);
  }

  statusMessage.textContent = message;
  statusMessage.className = `py-3 px-4 rounded-md text-sm font-medium shadow-sm border-l-4 flex items-center ${
    isError
      ? "bg-red-50 text-red-800 border-red-500"
      : "bg-green-50 text-green-800 border-green-500"
  }`;
  statusMessageContainer.classList.remove(
    "hidden",
    "slide-in-down",
    "fade-out-up"
  );
  statusMessageContainer.classList.add("slide-in-down");

  if (duration > 0) {
    setTimeout(() => {
      statusMessageContainer.classList.remove("slide-in-down");
      statusMessageContainer.classList.add("fade-out-up");
      setTimeout(() => statusMessageContainer.classList.add("hidden"), 500);
    }, duration);
  }
}

// Get token from cookies or localStorage
function getToken() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  const token = cookie ? cookie.split("=")[1] : localStorage.getItem("token");
  return token;
}

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
        userLoggedIn.classList.remove("hidden");
        userNotLoggedIn.classList.add("hidden");
        welcomeMessage.textContent = `${username}`;
      } else {
        localStorage.removeItem("token");
        document.cookie =
          "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        userLoggedIn.classList.add("hidden");
        userNotLoggedIn.classList.remove("hidden");
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      userLoggedIn.classList.add("hidden");
      userNotLoggedIn.classList.remove("hidden");
      showMessage("Error fetching user profile. Please log in again.", true);
      localStorage.removeItem("token");
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = "/login";
    }
  } else {
    userLoggedIn.classList.add("hidden");
    userNotLoggedIn.classList.remove("hidden");
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

      if (response.ok) {
        localStorage.removeItem("token");
        document.cookie =
          "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        showMessage("Logout successful!", false);
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        showMessage("Error logging out. Please try again.", true);
      }
    } catch (error) {
      console.error("Error during logout:", error);
      showMessage("Error logging out. Please try again.", true);
    }
  }
}

// Filter and Search Functionality
function filterAndSearch() {
  const searchTerm = searchInput?.value.toLowerCase() || "";
  const selectedPlant = filterPlant?.value || "";

  plantSections.forEach((section) => {
    const plantName = section.getAttribute("data-plant").toLowerCase();
    const diseases = section.querySelectorAll("h4");
    let matchesSearch = false;

    // Check if plant name or any disease name matches the search term
    if (searchTerm) {
      matchesSearch = plantName.includes(searchTerm);
      diseases.forEach((disease) => {
        const diseaseName = disease.textContent.toLowerCase();
        if (diseaseName.includes(searchTerm)) {
          matchesSearch = true;
        }
      });
    } else {
      matchesSearch = true; // If no search term, show all
    }

    // Check if plant matches the filter
    const matchesFilter = selectedPlant
      ? plantName === selectedPlant.toLowerCase()
      : true;

    // Show or hide the section
    if (matchesSearch && matchesFilter) {
      section.classList.remove("hidden");
    } else {
      section.classList.add("hidden");
    }
  });
}

// Accordion Functionality for FAQs
function setupAccordion() {
  accordionToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const content = toggle.nextElementSibling;
      const icon = toggle.querySelector("i");
      const isOpen = content.classList.contains("open");

      // Close all other accordions
      accordionToggles.forEach((otherToggle) => {
        const otherContent = otherToggle.nextElementSibling;
        const otherIcon = otherToggle.querySelector("i");
        if (otherToggle !== toggle) {
          otherContent.classList.remove("open");
          otherIcon.classList.remove("fa-chevron-up");
          otherIcon.classList.add("fa-chevron-down");
        }
      });

      // Toggle the clicked accordion
      content.classList.toggle("open");
      icon.classList.toggle("fa-chevron-down");
      icon.classList.toggle("fa-chevron-up");
    });
  });
}

// Event listeners
if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    profileDropdown.classList.toggle("hidden");
  });
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden");
  });
}

if (moreMenuToggle) {
  moreMenuToggle.addEventListener("click", () => {
    moreMenuMobile.classList.toggle("hidden");
  });
}

if (searchInput) {
  searchInput.addEventListener("input", filterAndSearch);
}

if (filterPlant) {
  filterPlant.addEventListener("change", filterAndSearch);
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    logoutUser();
  });
}

document.addEventListener("click", (event) => {
  if (
    profileBtn &&
    profileDropdown &&
    !profileBtn.contains(event.target) &&
    !profileDropdown.contains(event.target)
  ) {
    profileDropdown.classList.add("hidden");
  }
  if (
    mobileMenuBtn &&
    mobileMenu &&
    !mobileMenuBtn.contains(event.target) &&
    !mobileMenu.contains(event.target)
  ) {
    mobileMenu.classList.add("hidden");
  }
  if (
    moreMenuToggle &&
    moreMenuMobile &&
    !moreMenuToggle.contains(event.target) &&
    !moreMenuMobile.contains(event.target)
  ) {
    moreMenuMobile.classList.add("hidden");
  }
});

// Initial setup
checkUserProfile();
setupAccordion();
