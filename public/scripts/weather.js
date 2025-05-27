// --- START OF MERGED weather.js (Guest Enabled) ---

// Constants
const apiBaseUrl = "/api/weather";
const apiBaseUrlAuth = "/api";

// DOM Elements from weather.js
const latInput = document.getElementById("latInput");
const lngInput = document.getElementById("lngInput");
const cityInput = document.getElementById("cityInput");
const countryInput = document.getElementById("countryInput");
const fetchWeatherBtn = document.getElementById("fetchWeatherBtn");
const detectLocationBtn = document.getElementById("detectLocationBtn");
const weatherContainer = document.getElementById("weatherContainer");
const noWeatherMessage = document.getElementById("noWeatherMessage");
const currentTemp = document.getElementById("currentTemp");
const currentCondition = document.getElementById("currentCondition");
const currentHumidity = document.getElementById("currentHumidity");
const currentIcon = document.getElementById("currentIcon");
const recommendationsList = document.getElementById("recommendationsList");

// DOM Elements common or from header.js
const profileDropdownBtn = document.getElementById("profileDropdownBtn");
const profileDropdown = document.getElementById("profileDropdown");
const logoutBtnHeader = document.getElementById("logoutBtn"); // Assuming this is the header logout
const logoutBtnDropdown = document.getElementById("logoutBtnDropdown"); // If there's a separate one in dropdown

// DOM Elements specifically from header.js
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const moreMenuToggle = document.getElementById("moreMenuToggle");
const moreMenuMobile = document.getElementById("moreMenuMobile");
const userLoggedIn = document.getElementById("userLoggedIn"); // Container for logged-in user info in header
const userNotLoggedIn = document.getElementById("userNotLoggedIn"); // Container for login/register links
const welcomeMessage = document.getElementById("welcomeMessage"); // e.g., "Welcome, Username"

// Map Initialization
let map; // Declare map variable
let marker = null;

if (document.getElementById("map")) {
  // Initialize map only if element exists
  map = L.map("map").setView([20, 0], 2); // Default to a wider view, centered roughly
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      ' <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>  Pestector contributors',
  }).addTo(map);
}

// --- Helper Functions ---

function showMessage(message, isError = false, duration = 5000) {
  const statusMessageContainer = document.getElementById(
    "statusMessageContainer"
  );
  const statusMessage = document.getElementById("statusMessage");

  if (!statusMessageContainer || !statusMessage) {
    console.warn(
      "Status message elements not found in the DOM. Using alert fallback."
    );
    if (isError) {
      alert(`Error: ${message}`);
    } else {
      alert(message);
    }
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
  statusMessage.className = `py-3 px-4 rounded-md text-sm font-medium shadow-md ${
    isError
      ? "bg-red-100 text-red-700 border border-red-300"
      : "bg-green-100 text-green-700 border border-green-300"
  }`;
  statusMessageContainer.classList.add("slide-in-down");

  if (statusMessageContainer.hideTimeout) {
    clearTimeout(statusMessageContainer.hideTimeout);
  }
  if (statusMessageContainer.finalHideTimeout) {
    clearTimeout(statusMessageContainer.finalHideTimeout);
  }

  const animationDuration = 500; // Duration of the fade-out animation
  statusMessageContainer.hideTimeout = setTimeout(
    () => {
      statusMessageContainer.classList.remove("slide-in-down");
      statusMessageContainer.classList.add("fade-out-up");
      statusMessageContainer.finalHideTimeout = setTimeout(() => {
        statusMessageContainer.classList.add("hidden");
        statusMessageContainer.classList.remove("fade-out-up"); // Reset for next time
      }, animationDuration);
    },
    duration - animationDuration > 0 ? duration - animationDuration : duration
  ); // Adjust if duration is shorter than animation
}

function getToken() {
  let token = localStorage.getItem("token");
  if (!token) {
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="));
    if (cookie) {
      token = cookie.split("=")[1];
    }
  }
  return token;
}

// --- UI Setup for LoggedIn/Guest States ---
function setupGuestUI() {
  if (userLoggedIn) userLoggedIn.classList.add("hidden");
  if (userNotLoggedIn) userNotLoggedIn.classList.remove("hidden");
  if (profileDropdownBtn) profileDropdownBtn.classList.add("hidden"); // Hide profile UI
  if (profileDropdown) profileDropdown.classList.add("hidden");

  // Ensure weather section is ready for guest input
  if (noWeatherMessage) noWeatherMessage.classList.remove("hidden");
  if (weatherContainer) weatherContainer.classList.add("hidden");
  if (latInput) latInput.value = "";
  if (lngInput) lngInput.value = "";
  if (cityInput) cityInput.value = "";
  if (countryInput) countryInput.value = "";
  if (map && marker) {
    marker.remove();
    marker = null;
    map.setView([20, 0], 2); // Reset map view for guests
  }
}

function setupLoggedInUI(user) {
  if (userLoggedIn) userLoggedIn.classList.remove("hidden");
  if (userNotLoggedIn) userNotLoggedIn.classList.add("hidden");
  if (profileDropdownBtn) profileDropdownBtn.classList.remove("hidden");
  if (welcomeMessage && user.username)
    welcomeMessage.textContent = `${user.username}`;
}

// --- Core Application Logic ---

// Function to generate recommendations based on weather data
function generateWeatherBasedRecommendations(weatherData) {
  const recommendations = [];
  const temp = parseFloat(weatherData.current.temp);
  const humidity = parseFloat(weatherData.current.humidity);
  const condition = weatherData.current.condition.toLowerCase();
  const wind_kph = parseFloat(weatherData.current.wind_kph); // Assuming wind speed is available

  // Temperature-based recommendations
  if (temp > 35) {
    recommendations.push(
      "🌡️ Extreme heat! Water deeply early morning or late evening. Provide shade for vulnerable plants."
    );
  } else if (temp > 30) {
    recommendations.push(
      "☀️ Hot weather. Ensure consistent watering. Check soil moisture before watering again."
    );
  } else if (temp < 5) {
    recommendations.push(
      "🥶 Very cold! Protect sensitive plants from frost. Bring potted plants indoors if possible."
    );
  } else if (temp < 10) {
    recommendations.push(
      "❄️ Cool temperatures. Reduce watering frequency. Monitor for signs of cold stress."
    );
  }

  // Humidity-based recommendations
  if (humidity > 85) {
    recommendations.push(
      "💧 High humidity. Ensure good air circulation to prevent fungal issues. Avoid overhead watering."
    );
  } else if (humidity < 30) {
    recommendations.push(
      "🌵 Low humidity. Mist indoor plants or use a humidifier. Group plants together to increase local humidity."
    );
  }

  // Condition-based recommendations
  if (condition.includes("rain") || condition.includes("shower")) {
    recommendations.push(
      "🌧️ Rain expected/occurring. Check plant drainage. You may skip watering today."
    );
  } else if (condition.includes("sunny") || condition.includes("clear")) {
    recommendations.push(
      "☀️ Sunny day. Ensure sun-loving plants get enough light, but protect shade-lovers from direct sun."
    );
  } else if (condition.includes("cloudy") || condition.includes("overcast")) {
    recommendations.push(
      "☁️ Cloudy weather. Light levels are lower; adjust plant positioning if needed."
    );
  }

  // Wind-based recommendations (assuming wind_kph is available)
  if (wind_kph > 30) {
    recommendations.push(
      "💨 Windy conditions. Secure tall or unstable plants. Check for windburn or dehydration."
    );
  }

  // Default/General recommendations if few specific ones match
  if (recommendations.length < 2) {
    recommendations.push("🌱 Check soil moisture regularly before watering.");
    recommendations.push(
      "🐛 Inspect plants for pests or diseases periodically."
    );
  }

  // Limit to a reasonable number, e.g., 4-5
  return recommendations.slice(0, 5);
}

async function reverseGeocode(latitude, longitude) {
  if (!cityInput || !countryInput) return; // Element not on this page
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
    );
    const data = await response.json();
    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.municipality || // Added municipality
      data.address.county || // Added county
      "Unknown";
    const country = data.address.country || "Unknown";
    cityInput.value = city;
    countryInput.value = country;
  } catch (error) {
    console.error("Error during reverse geocoding:", error);
    cityInput.value = "N/A";
    countryInput.value = "N/A";
  }
}

function renderWeather(weather, recommendations, lat, lng) {
  if (!weatherContainer || !noWeatherMessage) return; // Elements not on this page

  weatherContainer.classList.remove("hidden");
  noWeatherMessage.classList.add("hidden");

  const temp = Number(weather.current.temp).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const humidity = Number(weather.current.humidity).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (latInput)
    latInput.value = Number(lat).toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  if (lngInput)
    lngInput.value = Number(lng).toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });

  if (currentTemp) currentTemp.textContent = `${temp}°C`;
  if (currentCondition)
    currentCondition.textContent = weather.current.condition;
  if (currentHumidity) currentHumidity.textContent = `Humidity: ${humidity}%`;
  if (currentIcon) currentIcon.src = `https:${weather.current.icon}`;

  if (recommendationsList) {
    recommendationsList.innerHTML = ""; // Clear previous recommendations
    const generatedRecs = generateWeatherBasedRecommendations(weather); // Generate new ones

    if (generatedRecs && generatedRecs.length > 0) {
      generatedRecs.forEach((rec) => {
        const li = document.createElement("li");
        // Add some basic styling for better readability
        li.className = "flex items-start space-x-2 text-sm text-gray-600 py-1";
        // Use innerHTML to render emojis correctly
        li.innerHTML = `<span class="w-5 text-center">${
          rec.split(" ")[0]
        }</span><span>${rec.substring(rec.indexOf(" ") + 1)}</span>`;
        recommendationsList.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.className = "text-sm text-gray-500 italic py-1";
      li.textContent = "No specific recommendations available at this time.";
      recommendationsList.appendChild(li);
    }
  }

  if (map) {
    map.setView([lat, lng], 13);
    if (marker) marker.remove();
    marker = L.marker([lat, lng])
      .addTo(map)
      .bindPopup(
        `Lat: ${Number(lat).toLocaleString("en-US", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        })}, Lng: ${Number(lng).toLocaleString("en-US", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        })}`
      )
      .openPopup();
  }
}

async function fetchWeather(lat, lng) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    console.log(
      "Fetching weather with lat:",
      lat,
      "lng:",
      lng,
      token ? "with token" : "as guest"
    );
    const response = await fetch(
      `${apiBaseUrl}/weather-recommendations?lat=${lat}&lng=${lng}`,
      { headers }
    );
    const data = await response.json();

    console.log("Weather Response:", response.status, data);
    if (!response.ok) {
      throw new Error(
        data.message || `Failed to fetch weather data (HTTP ${response.status})`
      );
    }

    if (data.status === "success" && data.weather && data.recommendations) {
      renderWeather(data.weather, data.recommendations, lat, lng);
      await reverseGeocode(lat, lng);
    } else {
      throw new Error(
        data.message || "No weather data available or malformed response"
      );
    }
  } catch (error) {
    console.error("Fetch Weather Error:", error);
    showMessage(error.message || "Error fetching weather data", true);
    if (weatherContainer) weatherContainer.classList.add("hidden");
    if (noWeatherMessage) noWeatherMessage.classList.remove("hidden");
    // Don't reset map if there was a previous valid location, just indicate error
    if (cityInput) cityInput.value = "Error";
    if (countryInput) countryInput.value = "Error";
  }
}

async function detectUserLocation() {
  if (!navigator.geolocation) {
    showMessage("Geolocation is not supported by your browser", true);
    return;
  }

  showMessage("Detecting location...", false, 2000); // Brief "loading" message
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      if (latInput)
        latInput.value = latitude.toLocaleString("en-US", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        });
      if (lngInput)
        lngInput.value = longitude.toLocaleString("en-US", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        });
      showMessage("Location detected successfully!", false);
      await fetchWeather(latitude, longitude);
    },
    (error) => {
      let message = "Error getting location: ";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message += "User denied the request for Geolocation.";
          break;
        case error.POSITION_UNAVAILABLE:
          message += "Location information is unavailable.";
          break;
        case error.TIMEOUT:
          message += "The request to get user location timed out.";
          break;
        default:
          message += "An unknown error occurred.";
          break;
      }
      showMessage(message, true);
      console.error("Geolocation error: ", error);
    }
  );
}

async function fetchUserProfile() {
  const token = getToken();
  // This function is only called if a token exists (see checkAuth)
  // If it were callable without a token, we'd add: if (!token) { setupGuestUI(); return; }

  try {
    console.log("Fetching profile...");
    const response = await fetch(`${apiBaseUrlAuth}/auth/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    console.log("Profile Response:", response.status, data);

    if (response.ok && data.user) {
      setupLoggedInUI(data.user);

      if (
        data.user.location &&
        data.user.location.latitude &&
        data.user.location.longitude
      ) {
        const { latitude, longitude } = data.user.location;
        if (latInput)
          latInput.value = latitude.toLocaleString("en-US", {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          });
        if (lngInput)
          lngInput.value = longitude.toLocaleString("en-US", {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          });
        await fetchWeather(latitude, longitude);
      } else {
        // User logged in, but no default location in profile
        if (cityInput) cityInput.value = ""; // Clear any previous
        if (countryInput) countryInput.value = "";
        if (noWeatherMessage) noWeatherMessage.classList.remove("hidden");
        if (weatherContainer) weatherContainer.classList.add("hidden");
        if (map && marker) {
          marker.remove();
          marker = null;
        }
        if (map) map.setView([20, 0], 2); // Reset map if no location
        showMessage(
          "Welcome! Set your location or use detection.",
          false,
          7000
        );
      }
    } else {
      // Token was present but invalid (e.g., expired)
      throw new Error(
        data.message || "Failed to fetch profile or session expired"
      );
    }
  } catch (error) {
    console.error("Fetch Profile Error:", error);
    showMessage(error.message || "Session invalid. Please log in again.", true);
    clearTokenAndSetupGuestUI(true); // true to indicate redirect may be needed
  }
}

function clearTokenAndSetupGuestUI(redirectToLoginIfAppropriate = false) {
  localStorage.removeItem("token");
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  setupGuestUI();
  // Only redirect if on a page that requires auth and an error occurred
  // or if specifically told to. For now, let's not auto-redirect from here
  // to avoid redirect loops if login page itself has issues.
  // Let checkAuth handle initial page load redirection logic.
  // if (redirectToLoginIfAppropriate && !window.location.pathname.includes("/login")) {
  //    window.location.href = "/login";
  // }
}

async function logoutUser() {
  const token = getToken();
  if (token) {
    try {
      const response = await fetch(`${apiBaseUrlAuth}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      // API logout result doesn't strictly matter for client-side, we log out anyway
      if (!response.ok) {
        console.warn(
          "API logout failed or user was already logged out on server."
        );
      }
    } catch (error) {
      console.error("Error during API logout call:", error);
    }
  }
  // Always perform client-side logout
  localStorage.removeItem("token");
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  showMessage("Logout successful!", false, 2000);
  setTimeout(() => {
    window.location.href = "/login"; // Or to homepage "/"
  }, 1500);
}

// --- Event Listeners ---
// Ensure elements exist before adding listeners
if (fetchWeatherBtn) {
  fetchWeatherBtn.addEventListener("click", () => {
    if (!latInput || !lngInput) return;
    const lat = latInput.value.trim();
    const lng = lngInput.value.trim();
    if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      showMessage("Please enter valid latitude and longitude", true);
      return;
    }
    fetchWeather(parseFloat(lat), parseFloat(lng));
  });
}

if (detectLocationBtn) {
  detectLocationBtn.addEventListener("click", detectUserLocation);
}

if (profileDropdownBtn && profileDropdown) {
  profileDropdownBtn.addEventListener("click", (e) => {
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

// Handle logout from potentially multiple buttons
if (logoutBtnHeader) {
  logoutBtnHeader.addEventListener("click", logoutUser);
}
if (logoutBtnDropdown && logoutBtnDropdown !== logoutBtnHeader) {
  // if a separate dropdown logout exists
  logoutBtnDropdown.addEventListener("click", logoutUser);
}

document.addEventListener("click", (event) => {
  if (
    profileDropdown &&
    profileDropdownBtn &&
    !profileDropdown.classList.contains("hidden")
  ) {
    if (
      !profileDropdownBtn.contains(event.target) &&
      !profileDropdown.contains(event.target)
    ) {
      profileDropdown.classList.add("hidden");
    }
  }
  if (mobileMenu && mobileMenuBtn && !mobileMenu.classList.contains("hidden")) {
    if (
      !mobileMenuBtn.contains(event.target) &&
      !mobileMenu.contains(event.target)
    ) {
      mobileMenu.classList.add("hidden");
    }
  }
  if (
    moreMenuMobile &&
    moreMenuToggle &&
    !moreMenuMobile.classList.contains("hidden")
  ) {
    if (
      !moreMenuToggle.contains(event.target) &&
      !moreMenuMobile.contains(event.target)
    ) {
      moreMenuMobile.classList.add("hidden");
    }
  }
});

// --- Initial Auth Check ---
async function checkAuth() {
  const token = getToken();
  console.log("Auth Check - Token:", token);
  if (token) {
    await fetchUserProfile(); // This will validate token and setup UI
  } else {
    setupGuestUI();
    // For guests, if on main weather page, maybe prompt to detect location
    const isWeatherPage =
      window.location.pathname === "/" ||
      window.location.pathname.endsWith("index.html") ||
      window.location.pathname.includes("weather"); // Adjust as needed
    if (isWeatherPage && !latInput.value && !lngInput.value) {
      // If no coordinates yet
      // showMessage("Welcome, Guest! Detect your location or enter coordinates to see the weather.", false, 7000);
    }
  }
}

// Run initial check
// Ensure DOM is fully loaded, especially if script is in <head>
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkAuth);
} else {
  checkAuth(); // DOMContentLoaded has already fired
}

// --- END OF MERGED weather.js (Guest Enabled) ---
