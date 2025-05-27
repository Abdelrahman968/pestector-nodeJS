// static/history.js
const apiBaseUrl = "/api";
let currentPage = 1;
const limit = 12;
let feedbackSubmitted = new Set();

// DOM Elements
const profileDropdownBtn = document.getElementById("profileDropdownBtn");
const profileDropdown = document.getElementById("profileDropdown");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const moreMenuToggle = document.getElementById("moreMenuToggle");
const moreMenuMobile = document.getElementById("moreMenuMobile");
const userLoggedIn = document.getElementById("userLoggedIn");
const userNotLoggedIn = document.getElementById("userNotLoggedIn");
const welcomeMessage = document.getElementById("welcomeMessage");
const logoutBtn = document.getElementById("logoutBtn");
const historyContainer = document.getElementById("historyContainer");
const paginationContainer = document.getElementById("paginationContainer");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");
const noHistoryMessage = document.getElementById("noHistoryMessage");
const searchInput = document.getElementById("searchInput");
const dateFilter = document.getElementById("dateFilter");
const severityFilter = document.getElementById("severityFilter");
const feedbackModal = document.getElementById("feedbackModal");
const feedbackForm = document.getElementById("feedbackForm");
const feedbackHistoryId = document.getElementById("feedbackHistoryId");
const feedbackId = document.getElementById("feedbackId");
const feedbackType = document.getElementById("feedbackType");
const correctLabel = document.getElementById("correctLabel");
const comments = document.getElementById("comments");
const closeFeedbackModal = document.getElementById("closeFeedbackModal");
const cancelFeedbackBtn = document.getElementById("cancelFeedbackBtn");
const submitFeedbackBtn = document.getElementById("submitFeedbackBtn");
const feedbackModalTitle = document.getElementById("feedbackModalTitle");
const loadFeedbackBtn = document.getElementById("loadFeedbackBtn");
const hideFeedbackBtn = document.getElementById("hideFeedbackBtn");
const feedbackContainer = document.getElementById("feedbackContainer");
const noFeedbackMessage = document.getElementById("noFeedbackMessage");
const feedbackSection = document.getElementById("feedbackSection");

// Show status message
function showMessage(message, isError = false, duration = 5000) {
  let statusMessageContainer = document.getElementById(
    "statusMessageContainer"
  );
  let statusMessage = document.getElementById("statusMessage");

  if (!statusMessageContainer) {
    statusMessageContainer = document.createElement("div");
    statusMessageContainer.id = "statusMessageContainer";
    statusMessageContainer.classList.add("mb-6", "hidden");
    statusMessage = document.createElement("div");
    statusMessage.id = "statusMessage";
    statusMessageContainer.appendChild(statusMessage);
    document.querySelector("main")?.prepend(statusMessageContainer);
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

// Get token
function getToken() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  return cookie ? cookie.split("=")[1] : localStorage.getItem("token") || null;
}

// Fetch user profile
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
        userLoggedIn?.classList.remove("hidden");
        userNotLoggedIn?.classList.add("hidden");
        if (welcomeMessage) welcomeMessage.textContent = `${username}`;
      } else {
        throw new Error("Invalid token");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      localStorage.removeItem("token");
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      userLoggedIn?.classList.add("hidden");
      userNotLoggedIn?.classList.remove("hidden");
      showMessage("Error fetching user profile. Please log in again.", true);
      window.location.href = "/login";
    }
  } else {
    userLoggedIn?.classList.add("hidden");
    userNotLoggedIn?.classList.remove("hidden");
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

// Fetch and display history
async function fetchHistory(page, filters = {}) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    let url = `${apiBaseUrl}/history?page=${page}&limit=${limit}`;
    if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
    if (filters.date && filters.date !== "all") url += `&date=${filters.date}`;
    if (filters.severity && filters.severity !== "all")
      url += `&severity=${filters.severity}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to fetch history");

    if (data.status === "success" && data.history.length > 0) {
      renderHistory(data.history);
      updatePagination(data.pagination);
    } else {
      if (historyContainer) historyContainer.innerHTML = "";
      if (paginationContainer) paginationContainer.classList.add("hidden");
      if (noHistoryMessage) noHistoryMessage.classList.remove("hidden");
    }
  } catch (error) {
    showMessage(error.message || "Error fetching history", true);
    if (historyContainer) historyContainer.innerHTML = "";
    if (paginationContainer) paginationContainer.classList.add("hidden");
    if (noHistoryMessage) noHistoryMessage.classList.remove("hidden");
  }
}

// Get severity class
function getSeverityClass(severity) {
  switch (severity?.toLowerCase()) {
    case "low":
      return "severity-low";
    case "medium":
      return "severity-medium";
    case "high":
      return "severity-high";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// Format date
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

// Render history items
function renderHistory(history) {
  if (!historyContainer) return;
  historyContainer.innerHTML = "";
  if (noHistoryMessage) noHistoryMessage.classList.add("hidden");
  if (paginationContainer) paginationContainer.classList.add("hidden"); // Hide pagination for single item view

  history.forEach((item, index) => {
    // Safely access nested properties with fallbacks
    const classification = item.classification || {};
    const prediction = classification.overall_best_prediction || {};
    const diseaseInfo = prediction.disease_info || {};
    const severity = diseaseInfo.severity || "N/A";
    const severityClass = getSeverityClass(severity);
    const formattedDate = formatDate(item.timestamp);
    const hasFeedback = feedbackSubmitted.has(item._id);

    const card = document.createElement("div");
    card.className = `w-full bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    card.innerHTML = `
      <div class="h-40 bg-gray-200 relative overflow-hidden">
        <img src="${item.imageUrl || "/static/img/placeholder.jpg"}" alt="${
      item.filename || "Plant image"
    }" class="w-full h-full object-cover">
        <div class="absolute top-3 right-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityClass}">
            ${severity} severity
          </span>
        </div>
      </div>
      <div class="p-5">
        <div class="flex justify-between items-start mb-3">
          <h3 class="text-lg font-semibold text-gray-900 truncate">${
            prediction.plant || "Unknown Plant"
          }</h3>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            ${Math.round(prediction.confidence_percent || 0)}%
          </span>
        </div>
        <p class="text-sm font-medium text-gray-700 mb-1">${
          prediction.condition || "Unknown Condition"
        }</p>
        <p class="text-xs text-gray-500 mb-3">${formattedDate}</p>
        <div class="text-sm text-gray-600 mb-3 line-clamp-2">
          ${diseaseInfo.descriptions?.[0] || "No description available"}
        </div>
        <div class="border-t border-gray-100 pt-3 mt-3">
          <details class="text-sm">
            <summary class="font-medium text-indigo-600 cursor-pointer hover:text-indigo-800">Treatment recommendations</summary>
            <p class="mt-2 text-gray-600 text-sm">${
              prediction.treatment_recommendations || "Not available"
            }</p>
          </details>
        </div>
        ${
          item.notes
            ? `<div class="mt-3 bg-gray-50 p-2 rounded"><p class="text-xs text-gray-500"><strong>Notes:</strong> ${item.notes}</p></div>`
            : ""
        }
        <div class="mt-3 flex space-x-2">
          <button 
            onclick="openFeedbackModal('${item._id}')" 
            class="flex-1 flex items-center justify-center px-4 py-2 text-white rounded-md ${
              hasFeedback
                ? "bg-green-500 hover:bg-green-600"
                : "bg-blue-500 hover:bg-blue-600"
            }" 
            ${hasFeedback ? "disabled" : ""}>
            <i class="fas fa-comment mr-2"></i>${
              hasFeedback ? "Done" : "Feedback"
            }
          </button>
          <button onclick="removeHistoryItem('${
            item._id
          }')" class="flex-1 flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
            <i class="fas fa-trash mr-2"></i>Remove
          </button>
          <button onclick="generateReport('${
            item._id
          }')" class="flex-1 flex items-center justify-center px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">
            <i class="fas fa-file-alt mr-2"></i>PDF
          </button>
        </div>
      </div>
    `;
    historyContainer.appendChild(card);
  });
}

// Preload feedback
async function preloadFeedback() {
  try {
    const token = getToken();
    if (!token) return;

    const response = await fetch(`${apiBaseUrl}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (response.ok && data.status === "success" && data.feedback.length > 0) {
      feedbackSubmitted = new Set(data.feedback.map((item) => item.historyId));
    }
  } catch (error) {
    console.error("Error preloading feedback:", error);
  }
}

// Remove history item
async function removeHistoryItem(id) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/history/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to remove history item");

    showMessage("History item removed successfully");
    // Redirect to full history if in single item view
    window.location.href = "/history";
  } catch (error) {
    showMessage(error.message || "Error removing history item", true);
  }
}

// Generate report
// Generate report
async function generateReport(historyId) {
  try {
    const token = getToken();
    if (!token) {
      showMessage("Please log in to generate a report", true);
      window.location.href = "/login";
      return;
    }

    const response = await fetch(
      `${apiBaseUrl}/reports/generate/${historyId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/pdf",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403) {
        showMessage(
          errorData.message ||
            "Reports require a premium subscription. Please upgrade your plan.",
          true
        );
      } else if (response.status === 404) {
        showMessage(errorData.message || "History item not found", true);
      } else {
        showMessage(errorData.message || "Failed to generate report", true);
      }
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `classification_report_${historyId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showMessage("Classification report generated successfully");
  } catch (error) {
    console.error("Generate report error:", error);
    showMessage("Error generating report. Please try again later.", true);
  }
}

// Fetch history item by ID
async function fetchHistoryById(historyId) {
  try {
    const token = getToken();
    const response = await fetch(`${apiBaseUrl}/history/${historyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok || data.status !== "success")
      throw new Error(data.message || "History item not found");
    return data.history;
  } catch (error) {
    console.error("Error fetching history by ID:", error);
    showMessage(error.message || "History item not found", true);
    return null;
  }
}

// Fetch and display single history item by scanId
async function fetchSingleHistoryItem(scanId) {
  try {
    const historyItem = await fetchHistoryById(scanId);
    if (historyItem) {
      renderHistory([historyItem]); // Render as array to reuse renderHistory
      if (searchInput) searchInput.disabled = true; // Disable filters for single item
      if (dateFilter) dateFilter.disabled = true;
      if (severityFilter) severityFilter.disabled = true;
    } else {
      if (historyContainer) historyContainer.innerHTML = "";
      if (paginationContainer) paginationContainer.classList.add("hidden");
      if (noHistoryMessage) noHistoryMessage.classList.remove("hidden");
    }
  } catch (error) {
    showMessage(error.message || "Error fetching history item", true);
    if (historyContainer) historyContainer.innerHTML = "";
    if (paginationContainer) paginationContainer.classList.add("hidden");
    if (noHistoryMessage) noHistoryMessage.classList.remove("hidden");
  }
}

// Fetch and display feedback history
async function fetchFeedbackHistory() {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to fetch feedback history");

    if (data.status === "success" && data.feedback.length > 0) {
      const feedbackWithHistory = await Promise.all(
        data.feedback.map(async (item) => {
          const historyItem = await fetchHistoryById(item.historyId);
          return { ...item, history: historyItem };
        })
      );
      renderFeedbackHistory(feedbackWithHistory);
      feedbackSubmitted = new Set(data.feedback.map((item) => item.historyId));
      if (feedbackContainer) feedbackContainer.classList.remove("hidden");
      if (noFeedbackMessage) noFeedbackMessage.classList.add("hidden");
      if (hideFeedbackBtn) hideFeedbackBtn.classList.remove("hidden");
    } else {
      if (feedbackContainer) feedbackContainer.innerHTML = "";
      if (feedbackContainer) feedbackContainer.classList.add("hidden");
      if (noFeedbackMessage) noFeedbackMessage.classList.remove("hidden");
      if (hideFeedbackBtn) hideFeedbackBtn.classList.add("hidden");
    }
  } catch (error) {
    showMessage(error.message || "Error fetching feedback history", true);
    if (feedbackContainer) feedbackContainer.innerHTML = "";
    if (feedbackContainer) feedbackContainer.classList.add("hidden");
    if (noFeedbackMessage) noFeedbackMessage.classList.remove("hidden");
    if (hideFeedbackBtn) hideFeedbackBtn.classList.add("hidden");
  }
}

// Render feedback history
function renderFeedbackHistory(feedback) {
  if (!feedbackContainer) return;
  feedbackContainer.innerHTML = "";
  if (noFeedbackMessage) noFeedbackMessage.classList.add("hidden");

  feedback.forEach((item, index) => {
    const history = item.history || {};
    const classification = history.classification || {};
    const prediction = classification.overall_best_prediction || {};
    const diseaseInfo = prediction.disease_info || {};
    const severity = diseaseInfo.severity || "N/A";
    const severityClass = getSeverityClass(severity);

    const feedbackCard = document.createElement("div");
    card.className = `w-full bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    card.innerHTML = `
      <div class="p-5">
        <div class="flex justify-between items-start mb-3">
          <h3 class="text-lg font-semibold text-gray-900 truncate">${
            prediction.plant || "Unknown Plant"
          }</h3>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityClass}">
            ${severity} severity
          </span>
        </div>
        <p class="text-sm font-medium text-gray-700 mb-1">${
          prediction.condition || "Unknown Condition"
        }</p>
        <p class="text-xs text-gray-500 mb-3">History ID: ${item.historyId}</p>
        <p class="text-sm text-gray-600 mb-2"><strong>Feedback Type:</strong> ${
          item.feedbackType
        }</p>
        <p class="text-sm text-gray-600 mb-2"><strong>Correct Label:</strong> ${
          item.correctLabel
        }</p>
        ${
          item.comments
            ? `<p class="text-sm text-gray-600 mb-2"><strong>Comments:</strong> ${item.comments}</p>`
            : ""
        }
        <p class="text-xs text-gray-500">Submitted: ${formatDate(
          item.createdAt
        )}</p>
        <div class="mt-3">
          <button onclick="openEditFeedbackModal('${item._id}', '${
      item.historyId
    }', '${item.feedbackType}', '${item.correctLabel}', '${
      item.comments || ""
    }')" class="flex items-center justify-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">
            <i class="fas fa-edit mr-2"></i>Edit Feedback
          </button>
        </div>
      </div>
    `;
    feedbackContainer.appendChild(card);
    const formattedDate = formatDate(item.timestamp);
    const hasFeedback = feedbackSubmitted.has(item._id);

    const card = document.createElement("div");
    card.className = `w-full bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    card.innerHTML = `
      <div class="h-40 bg-gray-200 relative overflow-hidden">
        <img src="${item.imageUrl || "/static/img/placeholder.jpg"}" alt="${
      item.filename || "Plant image"
    }" class="w-full h-full object-cover">
        <div class="absolute top-3 right-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityClass}">
            ${severity} severity
          </span>
        </div>
      </div>
      <div class="p-5">
        <div class="flex justify-between items-start mb-3">
          <h3 class="text-lg font-semibold text-gray-900 truncate">${
            prediction.plant || "Unknown Plant"
          }</h3>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            ${Math.round(prediction.confidence_percent || 0)}%
          </span>
        </div>
        <p class="text-sm font-medium text-gray-700 mb-1">${
          prediction.condition || "Unknown Condition"
        }</p>
        <p class="text-xs text-gray-500 mb-3">${formattedDate}</p>
        <div class="text-sm text-gray-600 mb-3 line-clamp-2">
          ${diseaseInfo.descriptions?.[0] || "No description available"}
        </div>
        <div class="border-t border-gray-100 pt-3 mt-3">
          <details class="text-sm">
            <summary class="font-medium text-indigo-600 cursor-pointer hover:text-indigo-800">Treatment recommendations</summary>
            <p class="mt-2 text-gray-600 text-sm">${
              prediction.treatment_recommendations || "Not available"
            }</p>
          </details>
        </div>
        ${
          item.notes
            ? `<div class="mt-3 bg-gray-50 p-2 rounded"><p class="text-xs text-gray-500"><strong>Notes:</strong> ${item.notes}</p></div>`
            : ""
        }
        <div class="mt-3 flex space-x-2">
          <button 
            onclick="openFeedbackModal('${item._id}')" 
            class="flex-1 flex items-center justify-center px-4 py-2 text-white rounded-md ${
              hasFeedback
                ? "bg-green-500 hover:bg-green-600"
                : "bg-blue-500 hover:bg-blue-600"
            }" 
            ${hasFeedback ? "disabled" : ""}>
            <i class="fas fa-comment mr-2"></i>${
              hasFeedback ? "Done" : "Feedback"
            }
          </button>
          <button onclick="removeHistoryItem('${
            item._id
          }')" class="flex-1 flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
            <i class="fas fa-trash mr-2"></i>Remove
          </button>
          <button onclick="generateReport('${
            item._id
          }')" class="flex-1 flex items-center justify-center px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">
            <i class="fas fa-file-alt mr-2"></i>Report
          </button>
        </div>
      </div>
    `;
    historyContainer.appendChild(card);
  });
}

// Preload feedback
async function preloadFeedback() {
  try {
    const token = getToken();
    if (!token) return;

    const response = await fetch(`${apiBaseUrl}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (response.ok && data.status === "success" && data.feedback.length > 0) {
      feedbackSubmitted = new Set(data.feedback.map((item) => item.historyId));
    }
  } catch (error) {
    console.error("Error preloading feedback:", error);
  }
}

// Remove history item
async function removeHistoryItem(id) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/history/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to remove history item");

    showMessage("History item removed successfully");
    fetchHistory(currentPage, getCurrentFilters());
  } catch (error) {
    showMessage(error.message || "Error removing history item", true);
  }
}

// Generate report
async function generateReport(historyId) {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(
      `${apiBaseUrl}/reports/generate/${historyId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/pdf",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! Status: ${response.status}`
      );
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `classification_report_${historyId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showMessage("Classification report generated successfully");
  } catch (error) {
    console.error("Generate report error:", error);
    showMessage(error.message || "Error generating report", true);
  }
}

// Fetch history item by ID
async function fetchHistoryById(historyId) {
  try {
    const token = getToken();
    const response = await fetch(`${apiBaseUrl}/history/${historyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok || data.status !== "success")
      throw new Error(data.message || "History item not found");
    return data.history;
  } catch (error) {
    console.error("Error fetching history by ID:", error);
    return null;
  }
}

// Fetch and display feedback history
async function fetchFeedbackHistory() {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to fetch feedback history");

    if (data.status === "success" && data.feedback.length > 0) {
      const feedbackWithHistory = await Promise.all(
        data.feedback.map(async (item) => {
          const historyItem = await fetchHistoryById(item.historyId);
          return { ...item, history: historyItem };
        })
      );
      renderFeedbackHistory(feedbackWithHistory);
      feedbackSubmitted = new Set(data.feedback.map((item) => item.historyId));
      if (feedbackContainer) feedbackContainer.classList.remove("hidden");
      if (noFeedbackMessage) noFeedbackMessage.classList.add("hidden");
      if (hideFeedbackBtn) hideFeedbackBtn.classList.remove("hidden");
    } else {
      if (feedbackContainer) feedbackContainer.innerHTML = "";
      if (feedbackContainer) feedbackContainer.classList.add("hidden");
      if (noFeedbackMessage) noFeedbackMessage.classList.remove("hidden");
      if (hideFeedbackBtn) hideFeedbackBtn.classList.add("hidden");
    }
  } catch (error) {
    showMessage(error.message || "Error fetching feedback history", true);
    if (feedbackContainer) feedbackContainer.innerHTML = "";
    if (feedbackContainer) feedbackContainer.classList.add("hidden");
    if (noFeedbackMessage) noFeedbackMessage.classList.remove("hidden");
    if (hideFeedbackBtn) hideFeedbackBtn.classList.add("hidden");
  }
}

// Render feedback history
function renderFeedbackHistory(feedback) {
  if (!feedbackContainer) return;
  feedbackContainer.innerHTML = "";
  if (noFeedbackMessage) noFeedbackMessage.classList.add("hidden");

  feedback.forEach((item, index) => {
    const history = item.history || {};
    const classification = history.classification || {};
    const prediction = classification.overall_best_prediction || {};
    const diseaseInfo = prediction.disease_info || {};
    const severity = diseaseInfo.severity || "N/A";
    const severityClass = getSeverityClass(severity);

    const card = document.createElement("div");
    card.className = `w-full bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    card.innerHTML = `
      <div class="p-5">
        <div class="flex justify-between items-start mb-3">
          <h3 class="text-lg font-semibold text-gray-900 truncate">${
            prediction.plant || "Unknown Plant"
          }</h3>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityClass}">
            ${severity} severity
          </span>
        </div>
        <p class="text-sm font-medium text-gray-700 mb-1">${
          prediction.condition || "Unknown Condition"
        }</p>
        <p class="text-xs text-gray-500 mb-3">History ID: ${item.historyId}</p>
        <p class="text-sm text-gray-600 mb-2"><strong>Feedback Type:</strong> ${
          item.feedbackType
        }</p>
        <p class="text-sm text-gray-600 mb-2"><strong>Correct Label:</strong> ${
          item.correctLabel
        }</p>
        ${
          item.comments
            ? `<p class="text-sm text-gray-600 mb-2"><strong>Comments:</strong> ${item.comments}</p>`
            : ""
        }
        <p class="text-xs text-gray-500">Submitted: ${formatDate(
          item.createdAt
        )}</p>
        <div class="mt-3">
          <button onclick="openEditFeedbackModal('${item._id}', '${
      item.historyId
    }', '${item.feedbackType}', '${item.correctLabel}', '${
      item.comments || ""
    }')" class="flex items-center justify-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">
            <i class="fas fa-edit mr-2"></i>Edit Feedback
          </button>
        </div>
      </div>
    `;
    feedbackContainer.appendChild(card);
  });
}

// Open feedback modal for submission
function openFeedbackModal(historyId) {
  if (feedbackSubmitted.has(historyId)) {
    showMessage("Feedback already submitted for this item", true);
    return;
  }
  if (feedbackModalTitle) feedbackModalTitle.textContent = "Submit Feedback";
  if (feedbackHistoryId) feedbackHistoryId.value = historyId;
  if (feedbackId) feedbackId.value = "";
  if (feedbackType) feedbackType.value = "";
  if (correctLabel) correctLabel.value = "";
  if (comments) comments.value = "";
  if (submitFeedbackBtn) submitFeedbackBtn.textContent = "Submit";
  if (feedbackModal) feedbackModal.classList.remove("hidden");
}

// Open feedback modal for editing
function openEditFeedbackModal(
  feedbackIdVal,
  historyId,
  feedbackTypeVal,
  correctLabelVal,
  commentsVal
) {
  if (feedbackModalTitle) feedbackModalTitle.textContent = "Edit Feedback";
  if (feedbackHistoryId) feedbackHistoryId.value = historyId;
  if (feedbackId) feedbackId.value = feedbackIdVal;
  if (feedbackType) feedbackType.value = feedbackTypeVal;
  if (correctLabel) correctLabel.value = correctLabelVal;
  if (comments) comments.value = commentsVal;
  if (submitFeedbackBtn) submitFeedbackBtn.textContent = "Update";
  if (feedbackModal) feedbackModal.classList.remove("hidden");
}

// Close feedback modal
function closeFeedbackModalFunc() {
  if (feedbackModal) feedbackModal.classList.add("hidden");
}

// Submit or update feedback
async function submitFeedback(event) {
  event.preventDefault();

  const token = getToken();
  if (!token) {
    window.location.href = "/login";
    return;
  }

  const feedbackData = {
    historyId: feedbackHistoryId?.value,
    feedbackType: feedbackType?.value,
    correctLabel: correctLabel?.value,
    comments: comments?.value,
  };

  if (
    !feedbackData.historyId ||
    !feedbackData.feedbackType ||
    !feedbackData.correctLabel
  ) {
    showMessage("Please fill in all required fields", true);
    return;
  }

  try {
    const isEdit = feedbackId?.value;
    const url = isEdit
      ? `${apiBaseUrl}/feedback/${feedbackId.value}`
      : `${apiBaseUrl}/feedback`;
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(feedbackData),
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(
        data.message || `Failed to ${isEdit ? "update" : "submit"} feedback`
      );

    showMessage(`Feedback ${isEdit ? "updated" : "submitted"} successfully`);
    if (!isEdit) feedbackSubmitted.add(feedbackData.historyId);
    closeFeedbackModalFunc();
    // Refresh view based on scanId or full history
    const urlParams = new URLSearchParams(window.location.search);
    const scanId = urlParams.get("scanId");
    if (scanId) {
      fetchSingleHistoryItem(scanId);
    } else {
      fetchHistory(currentPage, getCurrentFilters());
    }
    fetchFeedbackHistory();
  } catch (error) {
    showMessage(
      error.message ||
        `Error ${feedbackId?.value ? "updating" : "submitting"} feedback`,
      true
    );
  }
}

// Hide feedback section
function hideFeedbackSection() {
  if (feedbackContainer) feedbackContainer.classList.add("hidden");
  if (noFeedbackMessage) noFeedbackMessage.classList.add("hidden");
  if (hideFeedbackBtn) hideFeedbackBtn.classList.add("hidden");
}

// Update pagination
function updatePagination(pagination) {
  currentPage = pagination.page;
  if (document.getElementById("startPage"))
    document.getElementById("startPage").textContent = pagination.start;
  if (document.getElementById("endPage"))
    document.getElementById("endPage").textContent = pagination.end;
  if (document.getElementById("totalResults"))
    document.getElementById("totalResults").textContent = pagination.total;
  if (prevPageBtn) prevPageBtn.disabled = pagination.page === 1;
  if (nextPageBtn) nextPageBtn.disabled = pagination.page === pagination.pages;
}

// Get current filters
function getCurrentFilters() {
  return {
    search: searchInput?.value.trim(),
    date: dateFilter?.value,
    severity: severityFilter?.value,
  };
}

// Debounce function
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

// Event listeners
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

if (prevPageBtn) {
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) fetchHistory(currentPage - 1, getCurrentFilters());
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener("click", () => {
    fetchHistory(currentPage + 1, getCurrentFilters());
  });
}

if (searchInput) {
  searchInput.addEventListener(
    "input",
    debounce(() => fetchHistory(1, getCurrentFilters()), 500)
  );
}

if (dateFilter) {
  dateFilter.addEventListener("change", () =>
    fetchHistory(1, getCurrentFilters())
  );
}

if (severityFilter) {
  severityFilter.addEventListener("change", () =>
    fetchHistory(1, getCurrentFilters())
  );
}

if (closeFeedbackModal) {
  closeFeedbackModal.addEventListener("click", closeFeedbackModalFunc);
}

if (cancelFeedbackBtn) {
  cancelFeedbackBtn.addEventListener("click", closeFeedbackModalFunc);
}

if (feedbackForm) {
  feedbackForm.addEventListener("submit", submitFeedback);
}

if (loadFeedbackBtn) {
  loadFeedbackBtn.addEventListener("click", fetchFeedbackHistory);
}

if (hideFeedbackBtn) {
  hideFeedbackBtn.addEventListener("click", hideFeedbackSection);
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

// Check authentication and load history
async function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = "/login";
  } else {
    await preloadFeedback();
    const urlParams = new URLSearchParams(window.location.search);
    const scanId = urlParams.get("scanId");
    if (scanId) {
      fetchSingleHistoryItem(scanId);
    } else {
      fetchHistory(currentPage);
    }
  }
}

// Initial checks
checkUserProfile();
checkAuth();
