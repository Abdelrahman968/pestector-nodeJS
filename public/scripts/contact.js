// combined.js
const apiBaseUrl = "/api";

// DOM Elements
const contactForm = document.getElementById("contactForm");
const profileDropdownBtn = document.getElementById("profileDropdownBtn");
const profileDropdown = document.getElementById("profileDropdown");
const logoutBtn = document.getElementById("logoutBtn");
const submitButton = document.getElementById("submitButton");
const buttonText = document.getElementById("buttonText");
const loadingSpinner = document.getElementById("loadingSpinner");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const moreMenuToggle = document.getElementById("moreMenuToggle");
const moreMenuMobile = document.getElementById("moreMenuMobile");
const userLoggedIn = document.getElementById("userLoggedIn");
const userNotLoggedIn = document.getElementById("userNotLoggedIn");
const welcomeMessage = document.getElementById("welcomeMessage");

// Show status message
function showMessage(message, isError = false, duration = 5000) {
  let statusMessageContainer = document.getElementById(
    "statusMessageContainer"
  );
  let statusMessage = document.getElementById("statusMessage");

  // Create container if it doesn't exist
  if (!statusMessageContainer) {
    statusMessageContainer = document.createElement("div");
    statusMessageContainer.id = "statusMessageContainer";
    statusMessageContainer.classList.add("mb-6", "hidden");
    statusMessage = document.createElement("div");
    statusMessage.id = "statusMessage";
    statusMessageContainer.appendChild(statusMessage);
    document.querySelector("main").prepend(statusMessageContainer);
  }

  statusMessageContainer.classList.remove("slide-in-down", "fade-out-up");
  statusMessage.innerHTML = isError
    ? `<i class="fas fa-exclamation-circle mr-2"></i>${message}`
    : `<i class="fas fa-check-circle mr-2"></i>${message}`;
  statusMessage.className = `py-3 px-4 rounded-md text-sm font-medium shadow-sm border-l-4 ${
    isError
      ? "bg-red-50 text-red-800 border-red-500"
      : "bg-green-50 text-green-800 border-green-500"
  }`;

  statusMessageContainer.classList.remove("hidden");
  statusMessageContainer.classList.add("slide-in-down");

  if (duration > 0) {
    setTimeout(() => {
      statusMessageContainer.classList.remove("slide-in-down");
      statusMessageContainer.classList.add("fade-out-up");
      setTimeout(() => statusMessageContainer.classList.add("hidden"), 500);
    }, duration);
  }
}

// Toggle loading state
function toggleLoading(isLoading) {
  if (!submitButton) return; // Guard for pages without contact form
  if (isLoading) {
    submitButton.disabled = true;
    buttonText.classList.add("hidden");
    loadingSpinner.classList.add("spinner");
    loadingSpinner.classList.remove("hidden");
  } else {
    submitButton.disabled = false;
    buttonText.classList.remove("hidden");
    loadingSpinner.classList.add("hidden");
    loadingSpinner.classList.remove("spinner");
  }
}

// Get token from cookies or localStorage
function getToken() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  return cookie ? cookie.split("=")[1] : localStorage.getItem("token") || null;
}

// Submit contact form
async function submitContactForm(event) {
  event.preventDefault();

  const formData = new FormData(contactForm);
  const data = Object.fromEntries(formData);
  console.log("Form Data:", data);

  try {
    toggleLoading(true);

    const token = getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${apiBaseUrl}/contact`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (!response.ok)
      throw new Error(result.message || "Failed to send message");

    showMessage("Message sent successfully! We will reply to your email soon.");
    contactForm.reset();
  } catch (error) {
    showMessage(error.message || "Error sending message", true);
  } finally {
    toggleLoading(false);
  }
}

// Fetch user profile to check login status and get username
async function checkUserProfile() {
  const token = getToken();
  if (token) {
    try {
      const response = await fetch(`${apiBaseUrl}/auth/profile`, {
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
        throw new Error("Invalid token");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      localStorage.removeItem("token");
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      userLoggedIn.classList.add("hidden");
      userNotLoggedIn.classList.remove("hidden");
      showMessage("Error fetching user profile. Please log in again.", true);
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
      const response = await fetch(`${apiBaseUrl}/auth/logout`, {
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
        showMessage("Logout successful!", false, 2000);
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

// Event listeners
if (contactForm) {
  contactForm.addEventListener("submit", submitContactForm);
}

if (profileDropdownBtn) {
  profileDropdownBtn.addEventListener("click", () =>
    profileDropdown.classList.toggle("hidden")
  );
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", () =>
    mobileMenu.classList.toggle("hidden")
  );
}

if (moreMenuToggle) {
  moreMenuToggle.addEventListener("click", () =>
    moreMenuMobile.classList.toggle("hidden")
  );
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", logoutUser);
}

document.addEventListener("click", (event) => {
  if (
    profileDropdownBtn &&
    profileDropdown &&
    !profileDropdownBtn.contains(event.target) &&
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

// Initial checks
checkUserProfile();
toggleLoading(false); // Ensure loading is off on page load
