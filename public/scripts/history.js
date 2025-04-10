const apiBaseUrl = "/api";
let currentPage = 1;
const limit = 12;
let feedbackSubmitted = new Set();

// DOM Elements
const historyContainer = document.getElementById("historyContainer");
const paginationContainer = document.getElementById("paginationContainer");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");
const noHistoryMessage = document.getElementById("noHistoryMessage");
const logoutBtn = document.getElementById("logoutBtn");
const searchInput = document.getElementById("searchInput");
const dateFilter = document.getElementById("dateFilter");
const severityFilter = document.getElementById("severityFilter");
const profileDropdownBtn = document.getElementById("profileDropdownBtn");
const profileDropdown = document.getElementById("profileDropdown");
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
function showMessage(message, isError = false) {
  const statusMessageContainer = document.getElementById(
    "statusMessageContainer"
  );
  const statusMessage = document.getElementById("statusMessage");
  statusMessageContainer.classList.remove("slide-in-down", "fade-out-up");
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

// Fetch and display history
async function fetchHistory(page, filters = {}) {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login.html";
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
      historyContainer.innerHTML = "";
      paginationContainer.classList.add("hidden");
      noHistoryMessage.classList.remove("hidden");
    }
  } catch (error) {
    showMessage(error.message || "Error fetching history", true);
    historyContainer.innerHTML = "";
    paginationContainer.classList.add("hidden");
    noHistoryMessage.classList.remove("hidden");
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
  historyContainer.innerHTML = "";
  noHistoryMessage.classList.add("hidden");
  paginationContainer.classList.remove("hidden");

  history.forEach((item, index) => {
    const severityClass = getSeverityClass(
      item.classification.prediction.disease_info.severity
    );
    const formattedDate = formatDate(item.timestamp);
    const hasFeedback = feedbackSubmitted.has(item._id);

    const card = document.createElement("div");
    card.className = `bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    card.innerHTML = `
                    <div class="h-40 bg-gray-200 relative overflow-hidden">
                        <img src="${item.imageUrl}" alt="${
      item.filename
    }" class="w-full h-full object-cover">
                        <div class="absolute top-3 right-3">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityClass}">
                                ${
                                  item.classification.prediction.disease_info
                                    .severity
                                } severity
                            </span>
                        </div>
                    </div>
                    <div class="p-5">
                        <div class="flex justify-between items-start mb-3">
                            <h3 class="text-lg font-semibold text-gray-900 truncate">${
                              item.classification.prediction.plant
                            }</h3>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                ${Math.round(
                                  item.classification.prediction.confidence
                                )}%
                            </span>
                        </div>
                        <p class="text-sm font-medium text-gray-700 mb-1">${
                          item.classification.prediction.condition
                        }</p>
                        <p class="text-xs text-gray-500 mb-3">${formattedDate}</p>
                        <div class="text-sm text-gray-600 mb-3 line-clamp-2">
                            ${
                              item.classification.prediction.disease_info
                                .descriptions[0] || "No description available"
                            }
                        </div>
                        <div class="border-t border-gray-100 pt-3 mt-3">
                            <details class="text-sm">
                                <summary class="font-medium text-indigo-600 cursor-pointer hover:text-indigo-800">Treatment recommendations</summary>
                                <p class="mt-2 text-gray-600 text-sm">${
                                  item.classification.prediction
                                    .treatment_recommendations
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

// Preload feedback to populate feedbackSubmitted
async function preloadFeedback() {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
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
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login.html";
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

// Generate report for a single classification
async function generateReport(historyId) {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login.html";
      return;
    }
    console.log(`Generating report for historyId: ${historyId}`);

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
    const token = localStorage.getItem("token") || getTokenFromCookies();
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
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login.html";
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
      feedbackContainer.classList.remove("hidden");
      noFeedbackMessage.classList.add("hidden");
      hideFeedbackBtn.classList.remove("hidden");
    } else {
      feedbackContainer.innerHTML = "";
      feedbackContainer.classList.add("hidden");
      noFeedbackMessage.classList.remove("hidden");
      hideFeedbackBtn.classList.add("hidden");
    }
  } catch (error) {
    showMessage(error.message || "Error fetching feedback history", true);
    feedbackContainer.innerHTML = "";
    feedbackContainer.classList.add("hidden");
    noFeedbackMessage.classList.remove("hidden");
    hideFeedbackBtn.classList.add("hidden");
  }
}

// Render feedback history
function renderFeedbackHistory(feedback) {
  feedbackContainer.innerHTML = "";
  noFeedbackMessage.classList.add("hidden");

  feedback.forEach((item, index) => {
    const history = item.history || {};
    const severityClass = getSeverityClass(
      history?.classification?.prediction?.disease_info?.severity
    );
    const card = document.createElement("div");
    card.className = `bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    card.innerHTML = `
                    <div class="p-5">
                        <div class="flex justify-between items-start mb-3">
                            <h3 class="text-lg font-semibold text-gray-900 truncate">${
                              history?.classification?.prediction?.plant ||
                              "Unknown Plant"
                            }</h3>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityClass}">
                                ${
                                  history?.classification?.prediction
                                    ?.disease_info?.severity || "N/A"
                                } severity
                            </span>
                        </div>
                        <p class="text-sm font-medium text-gray-700 mb-1">${
                          history?.classification?.prediction?.condition ||
                          "Unknown Condition"
                        }</p>
                        <p class="text-xs text-gray-500 mb-3">History ID: ${
                          item.historyId
                        }</p>
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
                            <button onclick="openEditFeedbackModal('${
                              item._id
                            }', '${item.historyId}', '${item.feedbackType}', '${
      item.correctLabel
    }', '${
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
  feedbackModalTitle.textContent = "Submit Feedback";
  feedbackHistoryId.value = historyId;
  feedbackId.value = "";
  feedbackType.value = "";
  correctLabel.value = "";
  comments.value = "";
  submitFeedbackBtn.textContent = "Submit";
  feedbackModal.classList.remove("hidden");
}

// Open feedback modal for editing
function openEditFeedbackModal(
  feedbackIdVal,
  historyId,
  feedbackTypeVal,
  correctLabelVal,
  commentsVal
) {
  feedbackModalTitle.textContent = "Edit Feedback";
  feedbackHistoryId.value = historyId;
  feedbackId.value = feedbackIdVal;
  feedbackType.value = feedbackTypeVal;
  correctLabel.value = correctLabelVal;
  comments.value = commentsVal;
  submitFeedbackBtn.textContent = "Update";
  feedbackModal.classList.remove("hidden");
}

// Close feedback modal
function closeFeedbackModalFunc() {
  feedbackModal.classList.add("hidden");
}

// Submit or update feedback
async function submitFeedback(event) {
  event.preventDefault();

  const token = localStorage.getItem("token") || getTokenFromCookies();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const feedbackData = {
    historyId: feedbackHistoryId.value,
    feedbackType: feedbackType.value,
    correctLabel: correctLabel.value,
    comments: comments.value,
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
    const isEdit = feedbackId.value;
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
    fetchHistory(currentPage, getCurrentFilters());
    fetchFeedbackHistory();
  } catch (error) {
    showMessage(
      error.message ||
        `Error ${feedbackId.value ? "updating" : "submitting"} feedback`,
      true
    );
  }
}

// Hide feedback section
function hideFeedbackSection() {
  feedbackContainer.classList.add("hidden");
  noFeedbackMessage.classList.add("hidden");
  hideFeedbackBtn.classList.add("hidden");
}

// Update pagination
function updatePagination(pagination) {
  currentPage = pagination.page;
  document.getElementById("startPage").textContent = pagination.start;
  document.getElementById("endPage").textContent = pagination.end;
  document.getElementById("totalResults").textContent = pagination.total;
  prevPageBtn.disabled = pagination.page === 1;
  nextPageBtn.disabled = pagination.page === pagination.pages;
}

// Get current filters
function getCurrentFilters() {
  return {
    search: searchInput.value.trim(),
    date: dateFilter.value,
    severity: severityFilter.value,
  };
}

// Event listeners
prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) fetchHistory(currentPage - 1, getCurrentFilters());
});
nextPageBtn.addEventListener("click", () => {
  fetchHistory(currentPage + 1, getCurrentFilters());
});
searchInput.addEventListener(
  "input",
  debounce(() => fetchHistory(1, getCurrentFilters()), 500)
);
dateFilter.addEventListener("change", () =>
  fetchHistory(1, getCurrentFilters())
);
severityFilter.addEventListener("change", () =>
  fetchHistory(1, getCurrentFilters())
);
closeFeedbackModal.addEventListener("click", closeFeedbackModalFunc);
cancelFeedbackBtn.addEventListener("click", closeFeedbackModalFunc);
feedbackForm.addEventListener("submit", submitFeedback);
loadFeedbackBtn.addEventListener("click", fetchFeedbackHistory);
hideFeedbackBtn.addEventListener("click", hideFeedbackSection);
profileDropdownBtn.addEventListener("click", () =>
  profileDropdown.classList.toggle("hidden")
);
document.addEventListener("click", (event) => {
  if (
    !profileDropdownBtn.contains(event.target) &&
    !profileDropdown.contains(event.target)
  ) {
    profileDropdown.classList.add("hidden");
  }
});
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = "/login.html";
});

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

// Get token from cookies
function getTokenFromCookies() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  return cookie ? cookie.split("=")[1] : null;
}

// Check authentication and load history
async function checkAuth() {
  const token = localStorage.getItem("token") || getTokenFromCookies();
  if (!token) {
    window.location.href = "/login.html";
  } else {
    await preloadFeedback();
    fetchHistory(currentPage);
  }
}

// Initial check
checkAuth();
