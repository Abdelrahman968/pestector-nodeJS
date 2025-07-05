// --- START OF MERGED subscribe.js ---

const apiBaseUrl = "/api/subscribe"; // subscribe.js specific
const scanApiBaseUrl = "/api/classify"; // subscribe.js specific

// DOM Elements
// Common elements (from header.js and subscribe.js)
const profileDropdownBtn = document.getElementById("profileDropdownBtn"); // `profileBtn` in header.js
const profileDropdown = document.getElementById("profileDropdown");
const logoutBtn = document.getElementById("logoutBtn");

// Header specific DOM Elements (from header.js)
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const moreMenuToggle = document.getElementById("moreMenuToggle");
const moreMenuMobile = document.getElementById("moreMenuMobile");
const userLoggedIn = document.getElementById("userLoggedIn");
const userNotLoggedIn = document.getElementById("userNotLoggedIn");
const welcomeMessage = document.getElementById("welcomeMessage");

// Subscribe.js specific DOM Elements
const currentPlan = document.getElementById("currentPlan");
const currentStatus = document.getElementById("currentStatus");
const expiresAt = document.getElementById("expiresAt");
const autoRenew = document.getElementById("autoRenew");
const scanLimit = document.getElementById("scanLimit");
const scansRemaining = document.getElementById("scansRemaining");
const prioritySupport = document.getElementById("prioritySupport");
const prioritySupportIcon = document.getElementById("prioritySupportIcon");
const prioritySupportNoIcon = document.getElementById("prioritySupportNoIcon");
const advancedAnalytics = document.getElementById("advancedAnalytics");
const advancedAnalyticsIcon = document.getElementById("advancedAnalyticsIcon");
const advancedAnalyticsNoIcon = document.getElementById(
  "advancedAnalyticsNoIcon"
);
const apiAccess = document.getElementById("apiAccess");
const apiAccessIcon = document.getElementById("apiAccessIcon");
const apiAccessNoIcon = document.getElementById("apiAccessNoIcon");
const renewSubscriptionBtn = document.getElementById("renewSubscriptionBtn");
const toggleAutoRenewBtn = document.getElementById("toggleAutoRenewBtn");
const cancelSubscriptionBtn = document.getElementById("cancelSubscriptionBtn");
const plansContainer = document.getElementById("plansContainer");
const logsContainer = document.getElementById("logsContainer");
const noLogsMessage = document.getElementById("noLogsMessage");

// --- Utility Functions ---

// Main showMessage function (uses existing DOM elements, consistent with other pages)
function showMessage(message, isError = false) {
  const statusMessageContainer = document.getElementById(
    "statusMessageContainer"
  );
  const statusMessage = document.getElementById("statusMessage");

  if (!statusMessageContainer || !statusMessage) {
    console.warn(
      "Status message DOM elements not found for showMessage. Using alert as fallback."
    );
    alert((isError ? "Error: " : "Info: ") + message);
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
  statusMessageContainer.classList.remove("hidden");
  statusMessageContainer.classList.add("slide-in-down");
  setTimeout(() => {
    statusMessageContainer.classList.remove("slide-in-down");
    statusMessageContainer.classList.add("fade-out-up");
    setTimeout(() => statusMessageContainer.classList.add("hidden"), 500);
  }, 5000);
}

// Toast message helper (creates dynamic toast, from subscribe.js)
function showToastMessage(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
    isError ? "bg-red-500" : "bg-green-500"
  } text-white text-sm font-medium transform transition-all duration-300 opacity-0 translate-y-2`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Fade in and slide up
  setTimeout(() => {
    toast.classList.remove("opacity-0", "translate-y-2");
    toast.classList.add("opacity-100", "translate-y-0");
  }, 10);

  // Fade out, slide down and remove
  setTimeout(() => {
    toast.classList.remove("opacity-100", "translate-y-0");
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 5000);
}

// Get token from cookies or localStorage (comprehensive version from header.js)
function getToken() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  const tokenFromCookie = cookie ? cookie.split("=")[1] : null;
  return tokenFromCookie || localStorage.getItem("token");
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
        // Only redirect if not on login/register page
        if (!["/login", "/register"].includes(window.location.pathname)) {
          window.location.href = "/login";
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (userLoggedIn) userLoggedIn.classList.add("hidden");
      if (userNotLoggedIn) userNotLoggedIn.classList.remove("hidden");
      // Use the main showMessage for general page errors if DOM is ready
      // showMessage("Error fetching user profile. Please log in again.", true);
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
        showToastMessage("Logout successful!", false); // Use toast for this feedback
      } else {
        const data = await response.json().catch(() => ({}));
        showToastMessage(
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
      showToastMessage("Error logging out. Cleared session locally.", true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }
  } else {
    window.location.href = "/login"; // If no token, just redirect
  }
}

// Fetch and display current subscription with scan stats
// Fetch and display current subscription with scan stats
async function fetchSubscription() {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    // Fetch subscription details
    const subResponse = await fetch(`${apiBaseUrl}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const subData = await subResponse.json();

    if (!subResponse.ok) {
      throw new Error(subData.message || "Failed to fetch subscription");
    }

    if (subData.status === "success" && subData.subscription) {
      const sub = subData.subscription;

      // Update status with appropriate icon color
      const statusIcon = document.getElementById("statusIcon");
      if (statusIcon) {
        switch (sub.status?.toLowerCase()) {
          case "active":
            statusIcon.style.color = "#10B981"; // green
            break;
          case "pending":
            statusIcon.style.color = "#F59E0B"; // yellow
            break;
          case "canceled":
          case "expired":
            statusIcon.style.color = "#EF4444"; // red
            break;
          default:
            statusIcon.style.color = "#6B7280"; // gray
        }
      }

      if (currentPlan) currentPlan.textContent = sub.currentPlan || "Free";
      if (currentStatus) currentStatus.textContent = sub.status || "Active";
      if (expiresAt) {
        expiresAt.textContent = sub.expiresAt
          ? new Date(sub.expiresAt).toLocaleDateString("en-GB")
          : "N/A";
      }
      if (autoRenew) autoRenew.textContent = sub.autoRenew ? "Yes" : "No";
      if (scanLimit) {
        scanLimit.textContent = sub.features?.scanLimit || "N/A";
      }
      if (scansRemaining) {
        const remaining = sub.features?.scanLimit - (sub.scanUsage || 0);
        scansRemaining.textContent = remaining >= 0 ? remaining : "0";
      }

      // Update feature indicators
      const features = sub.features || {};
      if (prioritySupport) {
        prioritySupport.textContent = features.prioritySupport ? "Yes" : "No";
        if (prioritySupportIcon) {
          prioritySupportIcon.classList.toggle(
            "hidden",
            !features.prioritySupport
          );
        }
        if (prioritySupportNoIcon) {
          prioritySupportNoIcon.classList.toggle(
            "hidden",
            features.prioritySupport
          );
        }
      }

      if (advancedAnalytics) {
        advancedAnalytics.textContent = features.advancedAnalytics
          ? "Yes"
          : "No";
        if (advancedAnalyticsIcon) {
          advancedAnalyticsIcon.classList.toggle(
            "hidden",
            !features.advancedAnalytics
          );
        }
        if (advancedAnalyticsNoIcon) {
          advancedAnalyticsNoIcon.classList.toggle(
            "hidden",
            features.advancedAnalytics
          );
        }
      }

      if (apiAccess) {
        apiAccess.textContent = features.apiAccess ? "Yes" : "No";
        if (apiAccessIcon) {
          apiAccessIcon.classList.toggle("hidden", !features.apiAccess);
        }
        if (apiAccessNoIcon) {
          apiAccessNoIcon.classList.toggle("hidden", features.apiAccess);
        }
      }

      // Update action buttons visibility
      if (renewSubscriptionBtn && toggleAutoRenewBtn && cancelSubscriptionBtn) {
        const isActiveNonFree =
          sub.status === "active" && sub.currentPlan !== "free";
        renewSubscriptionBtn.classList.toggle("hidden", !isActiveNonFree);
        toggleAutoRenewBtn.classList.toggle("hidden", !isActiveNonFree);
        if (isActiveNonFree) {
          toggleAutoRenewBtn.innerHTML = `<i class="fas fa-toggle-${
            sub.autoRenew ? "on" : "off"
          } mr-2"></i>Toggle Auto-Renew`;
        }
        cancelSubscriptionBtn.classList.toggle("hidden", !isActiveNonFree);
      }
    } else {
      throw new Error(subData.message || "Subscription data not found.");
    }
  } catch (error) {
    console.error("Error fetching subscription:", error);
    showMessage(error.message || "Error fetching subscription", true);
  }
}

// Fetch scan stats
// Fetch scan stats
async function fetchScanStats(token) {
  try {
    const response = await fetch(`${scanApiBaseUrl}/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch scan stats");
    }

    return {
      scansUsedToday: data.scanUsage || 0,
      scansRemainingToday: (data.scanLimit || 0) - (data.scanUsage || 0),
    };
  } catch (error) {
    console.error("Error fetching scan stats:", error.message);
    return { scansUsedToday: "N/A", scansRemainingToday: "N/A" };
  }
}

// Render subscription plans
function renderPlans() {
  if (!plansContainer) return;

  // Plan data should ideally come from an API, but using static as in original
  const plansData = {
    free: {
      name: "Free",
      price: "$0/mo",
      scanLimit: 10,
      prioritySupport: false,
      advancedAnalytics: false,
      apiAccess: false,
      highlight: false,
      features: [
        "Basic plant identification",
        "Limited plant addition",
        "Community support",
      ],
    },
    basic: {
      name: "Basic",
      price: "$5/mo",
      scanLimit: 50,
      prioritySupport: false,
      advancedAnalytics: true,
      apiAccess: false,
      highlight: true,
      features: [
        "All Free features",
        "Increased scan limit",
        "Access to basic analytics",
        "Email support",
      ],
    },
    premium: {
      name: "Premium",
      price: "$15/mo",
      scanLimit: 200,
      prioritySupport: true,
      advancedAnalytics: true,
      apiAccess: true,
      highlight: false,
      features: [
        "All Basic features",
        "Higher scan limit",
        "Priority support",
        "Full API access",
        "Advanced plant care guides",
      ],
    },
    enterprise: {
      name: "Enterprise",
      price: "Contact Us",
      scanLimit: "Custom",
      prioritySupport: true,
      advancedAnalytics: true,
      apiAccess: true,
      highlight: false,
      features: [
        "All Premium features",
        "Custom scan limits",
        "Dedicated account manager",
        "Custom integrations",
        "SLA",
      ],
    },
  };

  plansContainer.innerHTML = ""; // Clear existing plans

  Object.keys(plansData).forEach((planKey, index) => {
    const plan = plansData[planKey];
    const card = document.createElement("div");
    card.className = `bg-white rounded-lg shadow-xl overflow-hidden card-hover fade-in animate-delay-${
      index + 1
    } flex flex-col ${
      plan.highlight
        ? "border-2 border-indigo-500 transform scale-105"
        : "border border-gray-200"
    }`;

    let featuresHtml = plan.features
      .map(
        (feature) => `
        <li class="flex items-center space-x-3">
            <svg class="flex-shrink-0 w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
            <span>${feature}</span>
        </li>
    `
      )
      .join("");

    card.innerHTML = `
        <div class="p-6 text-center bg-gray-50 border-b ${
          plan.highlight ? "border-indigo-500" : "border-gray-200"
        }">
            <h4 class="text-2xl font-semibold text-gray-900 capitalize">${
              plan.name
            }</h4>
            <p class="mt-2 text-4xl font-extrabold text-gray-900">${
              plan.price
            }</p>
            ${
              plan.name === "Free"
                ? '<p class="text-sm text-gray-500">For personal use</p>'
                : ""
            }
            ${
              plan.name === "Basic"
                ? '<p class="text-sm text-indigo-600 font-semibold">Most popular</p>'
                : ""
            }
        </div>
        <div class="p-6 flex-grow">
            <ul role="list" class="space-y-3 text-sm text-gray-600">
                ${featuresHtml}
                <li class="flex items-center space-x-3">
                    <svg class="flex-shrink-0 w-5 h-5 ${
                      plan.scanLimit > 0 || plan.scanLimit === "Custom"
                        ? "text-green-500"
                        : "text-gray-400"
                    }" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                    <span>Daily Scan Limit: ${plan.scanLimit}</span>
                </li>
                 <li class="flex items-center space-x-3">
                    <svg class="flex-shrink-0 w-5 h-5 ${
                      plan.prioritySupport ? "text-green-500" : "text-gray-400"
                    }" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                    <span>Priority Support</span>
                </li>
                 <li class="flex items-center space-x-3">
                    <svg class="flex-shrink-0 w-5 h-5 ${
                      plan.advancedAnalytics
                        ? "text-green-500"
                        : "text-gray-400"
                    }" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                    <span>Advanced Analytics</span>
                </li>
                 <li class="flex items-center space-x-3">
                    <svg class="flex-shrink-0 w-5 h-5 ${
                      plan.apiAccess ? "text-green-500" : "text-gray-400"
                    }" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                    <span>API Access</span>
                </li>
            </ul>
        </div>
        <div class="p-6 mt-auto">
            <button onclick="requestPlanChange('${planKey}')" class="w-full px-4 py-3 text-lg font-semibold ${
      plan.highlight
        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
        : "bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50"
    } rounded-md transition-colors">
                ${plan.price === "Contact Us" ? "Contact Sales" : "Choose Plan"}
            </button>
        </div>
    `;
    plansContainer.appendChild(card);
  });
}

// Request plan change (requires admin approval)
// Request plan change (requires admin approval)
async function requestPlanChange(plan) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    // Show loading state
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;
    button.disabled = true;

    const response = await fetch(`${apiBaseUrl}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    });

    const data = await response.json();

    // Restore button state
    button.innerHTML = originalText;
    button.disabled = false;

    if (!response.ok) {
      throw new Error(data.message || "Failed to request plan change");
    }

    showToastMessage(
      data.message || `Request for ${plan} plan submitted for admin approval.`,
      false
    );

    // Refresh data
    await fetchSubscription();
    await fetchLogs();
  } catch (error) {
    console.error("Plan change error:", error);
    showToastMessage(
      error.message ||
        "Failed to request subscription. Please try again later.",
      true
    );

    // Restore button state in case of error
    const button = event.target;
    if (button) {
      button.innerHTML =
        button.getAttribute("data-original-text") || "Choose Plan";
      button.disabled = false;
    }
  }
}

// Renew subscription
async function renewSubscription() {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/renew`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to renew subscription");

    showToastMessage(data.message || "Subscription renewal processed.", false);
    fetchSubscription();
    fetchLogs();
  } catch (error) {
    showToastMessage(error.message || "Error renewing subscription", true);
  }
}

// Toggle auto-renewal
async function toggleAutoRenew() {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const currentAutoRenewState = autoRenew
      ? autoRenew.textContent === "Yes"
      : false;
    const enable = !currentAutoRenewState;

    const response = await fetch(`${apiBaseUrl}/auto-renew`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ enable }),
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to toggle auto-renewal");

    showToastMessage(
      data.message || `Auto-renewal ${enable ? "enabled" : "disabled"}.`,
      false
    );
    fetchSubscription();
    fetchLogs();
  } catch (error) {
    showToastMessage(error.message || "Error toggling auto-renewal", true);
  }
}

// Cancel subscription
async function cancelSubscription() {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/cancel`, {
      method: "POST", // Or DELETE, depending on API
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to cancel subscription");

    showToastMessage(
      data.message || "Subscription cancellation processed.",
      false
    );
    fetchSubscription();
    fetchLogs();
  } catch (error) {
    showToastMessage(error.message || "Error canceling subscription", true);
  }
}

// Fetch and display subscription logs
async function fetchLogs() {
  if (!logsContainer || !noLogsMessage) return;

  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    logsContainer.innerHTML = `
        <div class="flex justify-center items-center py-12">
            <svg class="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>`;
    noLogsMessage.classList.add("hidden");

    const response = await fetch(`${apiBaseUrl}/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to fetch subscription logs");

    if (data.status === "success" && data.logs && data.logs.length > 0) {
      logsContainer.innerHTML = ""; // Clear loader
      data.logs.forEach((log, index) => {
        const prevPlan = log.previousPlan || "None";
        const startDate = log.startDate
          ? new Date(log.startDate).toLocaleDateString("en-GB")
          : "N/A";
        const endDate = log.endDate
          ? new Date(log.endDate).toLocaleDateString("en-GB")
          : "N/A";
        const updatedAt = log.updatedAt
          ? new Date(log.updatedAt).toLocaleString("en-GB")
          : "N/A";

        let statusClass = "text-gray-800 bg-gray-100";
        switch (log.status?.toLowerCase()) {
          case "active":
            statusClass = "text-green-800 bg-green-100";
            break;
          case "pending":
            statusClass = "text-yellow-800 bg-yellow-100";
            break;
          case "cancelled":
          case "expired":
            statusClass = "text-red-800 bg-red-100";
            break;
        }

        const logEntry = document.createElement("div");
        logEntry.className = `p-4 md:p-6 border-b border-gray-200 transition duration-300 ease-in-out hover:bg-gray-50 opacity-0 animate-fade-in`;
        logEntry.style.animationDelay = `${index * 100}ms`;
        logEntry.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                <div class="flex-grow">
                    <div class="flex items-center space-x-3 mb-2">
                        <span class="text-lg font-semibold text-gray-900">${
                          log.plan
                        }</span>
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${
          log.status
        }</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                        <p>Previous Plan: <span class="font-medium text-gray-700">${prevPlan}</span></p>
                        <p>Start Date: <span class="font-medium text-gray-700">${startDate}</span></p>
                        <p>End Date: <span class="font-medium text-gray-700">${endDate}</span></p>
                        <p>Last Updated: <span class="text-gray-500">${updatedAt}</span></p>
                    </div>
                </div>
                ${
                  log.status?.toLowerCase() === "active" &&
                  log.plan?.toLowerCase() !== "free"
                    ? `
                    <div class="mt-4 md:mt-0 md:ml-4 flex-shrink-0">
                         <!-- <button class="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Manage
                        </button> -->
                    </div>`
                    : ""
                }
            </div>`;
        logsContainer.appendChild(logEntry);
        setTimeout(() => logEntry.classList.remove("opacity-0"), 10); // Trigger fade-in
      });
    } else {
      logsContainer.innerHTML = "";
      noLogsMessage.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Error fetching logs:", error);
    if (logsContainer) logsContainer.innerHTML = ""; // Clear loader on error
    if (noLogsMessage) noLogsMessage.classList.remove("hidden"); // Show no logs message
    showToastMessage(error.message || "Error fetching subscription logs", true);
  }
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  // Subscription specific listeners
  if (renewSubscriptionBtn)
    renewSubscriptionBtn.addEventListener("click", renewSubscription);
  if (toggleAutoRenewBtn)
    toggleAutoRenewBtn.addEventListener("click", toggleAutoRenew);
  if (cancelSubscriptionBtn)
    cancelSubscriptionBtn.addEventListener("click", cancelSubscription);

  // Header specific listeners (profile dropdown, mobile menu)
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

  // General click listener for closing dropdowns
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

  // Add this to the DOMContentLoaded event listener
  if (upgradeSubscriptionBtn) {
    upgradeSubscriptionBtn.addEventListener("click", () => {
      // Scroll to plans section
      document
        .getElementById("plansContainer")
        ?.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Logout button listener
  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);

  // Initial Calls
  checkUserProfile(); // For header UI

  // For subscription page specific content
  // This will run after DOM is ready and user profile is checked.
  function initializeSubscriptionPage() {
    const token = getToken();
    if (!token) {
      if (!["/login", "/register"].includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    } else {
      // Check if on subscription page by presence of a key element
      if (document.getElementById("currentPlan")) {
        fetchSubscription();
        renderPlans();
        fetchLogs();
      }
    }
  }
  initializeSubscriptionPage();
});

// Expose functions to global scope if they are called via inline HTML event attributes
window.requestPlanChange = requestPlanChange;
