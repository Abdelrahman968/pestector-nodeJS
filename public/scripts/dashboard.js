// Combined JavaScript File: app.js

const apiBaseUrl = "/api";

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
const scansByMonthChart = document.getElementById("scansByMonthChart");
const commonDiseasesList = document.getElementById("commonDiseasesList");
const remindersList = document.getElementById("remindersList");
const subscriptionInfo = document.getElementById("subscriptionInfo");
const userInfo = document.getElementById("userInfo");

// Icons for care types
const careTypeIcons = {
  water: "fas fa-tint",
  fertilize: "fas fa-seedling",
  prune: "fas fa-cut",
  repot: "fas fa-archive",
  inspect: "fas fa-search",
};

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
  } else {
    window.location.href = "/login";
  }
}

// Helper function to format month and year
function formatMonthYear(year, month) {
  const date = new Date(year, month - 1);
  return date.toLocaleString("en", { month: "long", year: "numeric" });
}

// Generic error handler
function handleFetchError(error, elementId, message) {
  console.error(`Error: ${message}`, error);
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<p class="text-sm text-red-600">${message}: ${
      error.message || "Unknown error"
    }</p>`;
  } else {
    console.error(`Element with ID '${elementId}' not found`);
  }
}

// Fetch and display analytics
async function fetchAnalytics() {
  try {
    const token = getToken();
    if (!token) {
      console.warn("No token found, redirecting to login");
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/analytics/user`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();

    const scansByMonth = data.analytics.scansByMonth;
    const labels = scansByMonth.map((item) =>
      formatMonthYear(item._id.year, item._id.month)
    );
    const values = scansByMonth.map((item) => item.count);

    new Chart(scansByMonthChart, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Scans by Month",
            data: values,
            backgroundColor: "rgba(79, 70, 229, 0.6)",
            borderColor: "rgba(79, 70, 229, 1)",
            borderWidth: 1,
            hoverBackgroundColor: "rgba(79, 70, 229, 0.8)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Number of Scans" },
          },
          x: { title: { display: true, text: "Month" } },
        },
        plugins: {
          legend: { position: "top" },
          tooltip: { backgroundColor: "rgba(0, 0, 0, 0.8)" },
        },
      },
    });

    const commonDiseases = data.analytics.commonConditions; // Corrected property name
    if (commonDiseases && Array.isArray(commonDiseases)) {
      commonDiseasesList.innerHTML =
        commonDiseases
          .map(
            (disease) => `
                        <li class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                            <span class="font-medium text-gray-800">${disease._id}</span>
                            <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${disease.count}</span>
                        </li>
                    `
          )
          .join("") ||
        '<li class="text-sm text-gray-500">No diseases detected.</li>';
    } else {
      commonDiseasesList.innerHTML =
        '<li class="text-sm text-gray-500">Could not load common diseases.</li>';
      console.warn(
        "commonConditions data is not an array or is undefined:",
        commonDiseases
      );
    }
  } catch (error) {
    handleFetchError(error, "commonDiseasesList", "Failed to load analytics");
  }
}

// Fetch and display reminders
async function fetchReminders() {
  try {
    const token = getToken();
    if (!token) {
      console.warn("No token found, redirecting to login");
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/reminders`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    remindersList.innerHTML =
      data.reminders
        .slice(0, 3)
        .map((reminder) => {
          const dueDate = new Date(reminder.nextDue);
          const now = new Date();
          const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          let statusClass, statusText;

          if (daysDiff < 0) {
            statusClass = "bg-red-50 border-l-4 border-red-400";
            statusText = `<span class="px-2 py-1 text-xs font-medium rounded bg-red-200 text-red-800">Overdue</span>`;
          } else if (daysDiff <= 5) {
            statusClass = "bg-yellow-50 border-l-4 border-yellow-400";
            statusText = `<span class="px-2 py-1 text-xs font-medium rounded bg-yellow-200 text-yellow-800">Due in ${daysDiff} day${
              daysDiff === 1 ? "" : "s"
            }</span>`;
          } else {
            statusClass = "bg-green-50 border-l-4 border-green-400";
            statusText = `<span class="px-2 py-1 text-xs font-medium rounded bg-green-200 text-green-800">Due in ${daysDiff} days</span>`;
          }

          return `
                        <div class="flex items-center p-4 ${statusClass} rounded-lg">
                            <div class="flex-shrink-0 mr-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 ${
                                  daysDiff < 0
                                    ? "text-red-500"
                                    : daysDiff <= 5
                                    ? "text-yellow-500"
                                    : "text-green-500"
                                }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
                                      daysDiff < 0
                                        ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    }" />
                                </svg>
                            </div>
                            <div class="flex-1">
                                <h4 class="text-md font-medium text-gray-900">${
                                  reminder.plantName
                                }</h4>
                                <p class="text-sm text-gray-600">Next Due: ${dueDate.toLocaleDateString(
                                  "en"
                                )}</p>
                            </div>
                            <div class="flex-shrink-0 ml-4">
                                ${statusText}
                            </div>
                        </div>
                    `;
        })
        .join("") || '<p class="text-sm text-gray-500">No reminders yet.</p>';
  } catch (error) {
    handleFetchError(error, "remindersList", "Failed to load reminders");
  }
}

// Mark a reminder as completed
async function markAsCompleted(reminderId) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(
      `${apiBaseUrl}/reminders/${reminderId}/complete`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    fetchReminders();
  } catch (error) {
    console.error("Error marking reminder as completed:", error);
    showMessage("Failed to mark reminder as completed: " + error.message, true);
  }
}

// Fetch and display subscription information
async function fetchSubscriptionInfo() {
  try {
    const token = getToken();
    if (!token) {
      console.warn("No token found, redirecting to login");
      window.location.href = "/login";
      return;
    }

    // Fetch subscription data
    const response = await fetch(`${apiBaseUrl}/subscribe`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    const subscription = data.subscription || {};

    // Fetch profile data
    const profileResponse = await fetch(`${apiBaseUrl}/auth/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileResponse.ok) {
      const errorData = await profileResponse.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${profileResponse.status}`
      );
    }

    const profileData = await profileResponse.json();
    const subscriptionStatus =
      profileData.user?.subscription?.status || "Active";
    const subscriptionInfoData = profileData.subscription_info || {
      scans_used: 0,
      scan_limit: 10,
    };
    const scanPercentage =
      (subscriptionInfoData.scans_used / subscriptionInfoData.scan_limit) * 100;

    document.getElementById("subscriptionStatus").textContent =
      subscriptionStatus;
    document.getElementById("currentPlan").textContent =
      subscription.currentPlan || "Not set";

    subscriptionInfo.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm font-medium text-gray-500 mb-1">Current Plan</p>
                <p id="currentPlan" class="text-lg font-medium text-gray-900 capitalize flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    ${subscription.currentPlan || "Not set"}
                </p>
                <p class="text-sm font-medium text-gray-500 mb-1">Scan Usage</p>
                <div class="relative pt-1">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-lg font-medium text-gray-900 inline-block">${
                              subscriptionInfoData.scans_used
                            } / ${subscriptionInfoData.scan_limit}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-sm font-semibold text-indigo-700">${scanPercentage.toFixed(
                              0
                            )}%</span>
                        </div>
                    </div>
                    <div class="overflow-hidden h-2 mt-2 text-xs flex rounded bg-indigo-200">
                        <div style="width: ${scanPercentage}%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"></div>
                    </div>
                </div>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm font-medium text-gray-500 mb-2">Features</p>
                <ul id="featureList" class="text-sm text-gray-700 space-y-2">
                    <li class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 ${
                          subscription.features?.scanLimit
                            ? "text-green-600"
                            : "text-gray-400"
                        }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Scan Limit: ${
                          subscription.features?.scanLimit || "Not set"
                        }
                    </li>
                    <li class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 ${
                          subscription.features?.prioritySupport
                            ? "text-green-600"
                            : "text-gray-400"
                        }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Priority Support: ${
                          subscription.features?.prioritySupport ? "Yes" : "No"
                        }
                    </li>
                    <li class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 ${
                          subscription.features?.advancedAnalytics
                            ? "text-green-600"
                            : "text-gray-400"
                        }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Advanced Analytics: ${
                          subscription.features?.advancedAnalytics
                            ? "Yes"
                            : "No"
                        }
                    </li>
                    <li class="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 ${
                          subscription.features?.apiAccess
                            ? "text-green-600"
                            : "text-gray-400"
                        }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        API Access: ${
                          subscription.features?.apiAccess ? "Yes" : "No"
                        }
                    </li>
                </ul>
            </div>
        `;
  } catch (error) {
    handleFetchError(
      error,
      "subscriptionInfo",
      "Failed to load subscription information"
    );
  }
}

// NEW: Helper function to get City, Country from coordinates using Nominatim
async function getCityCountryFromCoords(lat, lon) {
  if (!lat || !lon) {
    return "Not set";
  }
  try {
    // It's good practice to include a User-Agent or Referer for Nominatim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
      {
        headers: {
          "User-Agent":
            "PestectorDashboard/1.0 (your-app-name-or-email@example.com)", // Replace with your app's info
          "Accept-Language": "en", // Request English results
        },
      }
    );
    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status}`);
      return `${lat.toFixed(4)}, ${lon.toFixed(
        4
      )} (Could not fetch city/country)`;
    }
    const data = await response.json();
    if (data && data.address) {
      const city =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.hamlet ||
        data.address.county ||
        "";
      const country = data.address.country || "";
      if (city && country) {
        return `${city}, ${country}`;
      } else if (country) {
        return country;
      } else if (city) {
        return city;
      }
    }
    return `${lat.toFixed(4)}, ${lon.toFixed(4)} (Location details not found)`;
  } catch (error) {
    console.error("Error fetching location details from Nominatim:", error);
    return `${lat.toFixed(4)}, ${lon.toFixed(4)} (Error fetching location)`;
  }
}

// Fetch and display user information
async function fetchUserInfo() {
  try {
    const token = getToken();
    if (!token) {
      console.warn("No token found, redirecting to login");
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/auth/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      } catch (e) {
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }
    }

    const data = await response.json();
    const user = data.user;

    let locationDisplay = "Not set";
    // Set the initial display before the async call
    userInfo.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm font-medium text-gray-500 mb-1"><i class="fa-solid fa-circle-user"></i> Username</p>
                <p id="username" class="text-lg font-medium text-gray-900">${
                  user.username || "Not set"
                }</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm font-medium text-gray-500 mb-1"><i class="fa-solid fa-envelope-circle-check"></i> Email</p>
                <p id="email" class="text-lg font-medium text-gray-900">${
                  user.email || "Not set"
                }</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm font-medium text-gray-500 mb-1"><i class="fa-solid fa-file-signature"></i> Full Name</p>
                <p id="fullName" class="text-lg font-medium text-gray-900">${
                  user.fullName || "Not set"
                }</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm font-medium text-gray-500 mb-1"><i class="fa-solid fa-mobile"></i> Phone Number</p>
                <p id="phoneNumber" class="text-lg font-medium text-gray-900">${
                  "+" + user.phoneNumber || "Not set"
                }</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <p class="text-sm font-medium text-gray-500 mb-1"><i class="fa-solid fa-location-dot"></i> Location</p>
                <p id="location" class="text-lg font-medium text-gray-900">Not set</p> 
            </div>
        `;

    // Now, if coordinates exist, fetch and update the location specifically
    if (user.location && user.location.latitude && user.location.longitude) {
      const locationElement = document.getElementById("location");
      if (locationElement) {
        locationElement.textContent = "Fetching location...";
      }

      getCityCountryFromCoords(user.location.latitude, user.location.longitude)
        .then((cityCountry) => {
          if (locationElement) {
            // Re-check in case the element was removed by other JS
            locationElement.textContent = cityCountry;
          }
        })
        .catch((err) => {
          // Catch errors from getCityCountryFromCoords
          if (locationElement) {
            locationElement.textContent = `${user.location.latitude.toFixed(
              4
            )}, ${user.location.longitude.toFixed(4)} (Error fetching details)`;
          }
          console.error("Location fetch error:", err);
        });
    }
  } catch (error) {
    handleFetchError(error, "userInfo", "Failed to load user information");
  }
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

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    logoutUser();
  });
}

// Initial fetch
Promise.all([
  checkUserProfile().catch((err) =>
    console.error("User profile check failed:", err)
  ),
  fetchAnalytics().catch((err) =>
    console.error("Analytics fetch failed:", err)
  ),
  fetchReminders().catch((err) =>
    console.error("Reminders fetch failed:", err)
  ),
  fetchSubscriptionInfo().catch((err) =>
    console.error("Subscription fetch failed:", err)
  ),
  fetchUserInfo().catch((err) => console.error("User info fetch failed:", err)),
])
  .then(() => console.log("All initial fetch attempts completed"))
  .catch((err) => console.error("Unexpected error in fetch promises:", err));
