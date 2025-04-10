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

// Show status message
function showMessage(message, isError = false) {
  const statusMessageContainer = document.createElement("div");
  statusMessageContainer.id = "statusMessageContainer";
  statusMessageContainer.classList.add("mb-6", "hidden");
  const statusMessage = document.createElement("div");
  statusMessage.id = "statusMessage";
  statusMessageContainer.classList.remove("slide-in-down", "fade-out-up");
  statusMessage.innerHTML = isError
    ? `<i class="fas fa-exclamation-circle mr-2"></i>${message}`
    : `<i class="fas fa-check-circle mr-2"></i>${message}`;
  statusMessage.className = `py-3 px-4 rounded-md text-sm font-medium ${
    isError
      ? "bg-red-100 text-red-700 border border-red-200"
      : "bg-green-100 text-green-700 border border-green-200"
  }`;
  statusMessageContainer.appendChild(statusMessage);
  document.querySelector("main").prepend(statusMessageContainer);
  statusMessageContainer.classList.remove("hidden");
  statusMessageContainer.classList.add("slide-in-down");
  setTimeout(() => {
    statusMessageContainer.classList.remove("slide-in-down");
    statusMessageContainer.classList.add("fade-out-up");
    setTimeout(() => statusMessageContainer.classList.add("hidden"), 500);
  }, 5000);
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
        window.location.href = "/login.html";
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      userLoggedIn.classList.add("hidden");
      userNotLoggedIn.classList.remove("hidden");
      showMessage("Error fetching user profile. Please log in again.", true);
      localStorage.removeItem("token");
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = "/login.html";
    }
  } else {
    userLoggedIn.classList.add("hidden");
    userNotLoggedIn.classList.remove("hidden");
  }
}

// Enhanced showMessage function
function showMessage(message, isError = false, duration = 3000) {
  const container = document.getElementById("statusMessageContainer");
  const statusMsg = document.getElementById("statusMessage");

  // Set message text
  statusMsg.textContent = message;

  // Apply appropriate styling based on message type
  statusMsg.className =
    "py-3 px-4 rounded-md text-sm font-medium shadow-sm border-l-4 flex items-center";

  if (isError) {
    statusMsg.classList.add("bg-red-50", "text-red-800", "border-red-500");
  } else {
    statusMsg.classList.add(
      "bg-green-50",
      "text-green-800",
      "border-green-500"
    );
  }

  // Show the container
  container.classList.remove("hidden");

  // Auto-hide after duration
  if (duration > 0) {
    setTimeout(() => {
      container.classList.add("hidden");
    }, duration);
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
          window.location.href = "/login.html";
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

// Helper function to get token (assumed to be defined elsewhere)
function getToken() {
  return localStorage.getItem("token");
}

// Event listeners
profileBtn.addEventListener("click", () => {
  profileDropdown.classList.toggle("hidden");
});

mobileMenuBtn.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

moreMenuToggle.addEventListener("click", () => {
  moreMenuMobile.classList.toggle("hidden");
});

document.addEventListener("click", (event) => {
  if (
    !profileBtn.contains(event.target) &&
    !profileDropdown.contains(event.target)
  ) {
    profileDropdown.classList.add("hidden");
  }
  if (
    !mobileMenuBtn.contains(event.target) &&
    !mobileMenu.contains(event.target)
  ) {
    mobileMenu.classList.add("hidden");
  }
  if (
    !moreMenuToggle.contains(event.target) &&
    !moreMenuMobile.contains(event.target)
  ) {
    moreMenuMobile.classList.add("hidden");
  }
});

logoutBtn.addEventListener("click", () => {
  logoutUser();
});

// Initial check for user profile
checkUserProfile();
