const apiBaseUrl = "/api/admin";
let currentPage = 1;
const limit = 12;

// DOM Elements
const statsContainer = document.getElementById("statsContainer");
const usersContainer = document.getElementById("usersContainer");
const noUsersMessage = document.getElementById("noUsersMessage");
const notificationsContainer = document.getElementById(
  "notificationsContainer"
);
const noNotificationsMessage = document.getElementById(
  "noNotificationsMessage"
);
const historyContainer = document.getElementById("historyContainer");
const plantsContainer = document.getElementById("plantsContainer");
const guestsContainer = document.getElementById("guestsContainer");
const remindersContainer = document.getElementById("remindersContainer");
const feedbackContainer = document.getElementById("feedbackContainer");
const subscriptionsContainer = document.getElementById(
  "subscriptionsContainer"
);
const treatmentPlansContainer = document.getElementById(
  "treatmentPlansContainer"
);
const weatherStatsContainer = document.getElementById("weatherStatsContainer");
const logoutBtn = document.getElementById("logoutBtn");
const profileDropdownBtn = document.getElementById("profileDropdownBtn");
const profileDropdown = document.getElementById("profileDropdown");
const addUserModal = document.getElementById("addUserModal");
const addUserForm = document.getElementById("addUserForm");
const closeAddUserModal = document.getElementById("closeAddUserModal");
const cancelAddUserBtn = document.getElementById("cancelAddUserBtn");
const sendNotificationModal = document.getElementById("sendNotificationModal");
const sendNotificationForm = document.getElementById("sendNotificationForm");
const closeNotificationModal = document.getElementById(
  "closeNotificationModal"
);
const cancelNotificationBtn = document.getElementById("cancelNotificationBtn");

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

// Fetch and display system stats
async function fetchStats() {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) throw new Error("No authentication token found");

    const response = await fetch(`${apiBaseUrl}/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Failed to fetch stats");

    renderStats(data.stats);
  } catch (error) {
    showMessage(error.message || "Error fetching system stats", true);
  }
}

// Render system stats
function renderStats(stats) {
  statsContainer.innerHTML = `
    <div class="p-4 bg-gray-100 rounded-lg"><p class="font-medium p-4 bg-gray-200 rounded-lg">Total Users: ${stats.total_users}</p></div>
    <div class="p-4 bg-gray-100 rounded-lg"><p class="font-medium p-4 bg-gray-200 rounded-lg">Active Subscriptions: ${stats.active_subscriptions}</p></div>
    <div class="p-4 bg-gray-100 rounded-lg"><p class="font-medium p-4 bg-gray-200 rounded-lg">Total Plants: ${stats.total_plants}</p></div>
    <div class="p-4 bg-gray-100 rounded-lg"><p class="font-medium p-4 bg-gray-200 rounded-lg">Recent History: ${stats.recent_history_entries}</p></div>
    <div class="p-4 bg-gray-100 rounded-lg"><p class="font-medium p-4 bg-gray-200 rounded-lg">Total Guests: ${stats.total_guests}</p></div>
    <div class="p-4 bg-gray-100 rounded-lg"><p class="font-medium p-4 bg-gray-200 rounded-lg">Total Reminders: ${stats.total_reminders}</p></div>
    <div class="p-4 bg-gray-100 rounded-lg"><p class="font-medium p-4 bg-gray-200 rounded-lg">Total Feedback: ${stats.total_feedback}</p></div>
    <div class="p-4 bg-gray-100 rounded-lg"><p class="font-medium p-4 bg-gray-200 rounded-lg">Total Treatment Plans: ${stats.total_treatment_plans}</p></div>
  `;
}

// Fetch and display users
async function fetchUsers(page = currentPage) {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) throw new Error("No authentication token found");

    const response = await fetch(
      `${apiBaseUrl}/users?page=${page}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Failed to fetch users");

    if (data.status === "success" && data.users.length > 0) {
      renderUsers(data.users);
      noUsersMessage.classList.add("hidden");
    } else {
      usersContainer.innerHTML = "";
      noUsersMessage.classList.remove("hidden");
    }
  } catch (error) {
    showMessage(error.message || "Error fetching users", true);
    usersContainer.innerHTML = "";
    noUsersMessage.classList.remove("hidden");
  }
}

// Render users
function renderUsers(users) {
  usersContainer.innerHTML = "";
  users.forEach((user, index) => {
    const card = document.createElement("div");
    card.className = `bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    card.innerHTML = `
      <div class="p-5">
        <h3 class="text-lg font-semibold text-gray-900 truncate">${
          user.username
        }</h3>
        <p class="text-sm text-gray-500">${user.email}</p>
        <p class="text-sm text-gray-500">Role: ${user.role}</p>
        <p class="text-sm text-gray-500">Phone: ${user.phoneNumber || "N/A"}</p>
        <div class="mt-3 flex space-x-2">
          <button onclick="editUser('${
            user.id
          }')" class="flex-1 flex items-center justify-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">
            <i class="fas fa-edit mr-2"></i>Edit
          </button>
          <button onclick="deleteUser('${
            user.id
          }')" class="flex-1 flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
            <i class="fas fa-trash mr-2"></i>Delete
          </button>
        </div>
      </div>
    `;
    usersContainer.appendChild(card);
  });
}

// Fetch and display notifications
async function fetchNotifications() {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) throw new Error("No authentication token found");

    const response = await fetch(
      `${apiBaseUrl}/notifications?page=1&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to fetch notifications");

    if (data.status === "success" && data.notifications.length > 0) {
      renderNotifications(data.notifications);
      noNotificationsMessage.classList.add("hidden");
    } else {
      notificationsContainer.innerHTML = "";
      noNotificationsMessage.classList.remove("hidden");
    }
  } catch (error) {
    showMessage(error.message || "Error fetching notifications", true);
    notificationsContainer.innerHTML = "";
    noNotificationsMessage.classList.remove("hidden");
  }
}

// Render notifications
function renderNotifications(notifications) {
  notificationsContainer.innerHTML = "";
  notifications.forEach((notification, index) => {
    const card = document.createElement("div");
    card.className = `bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    card.innerHTML = `
      <div class="p-5">
        <p class="text-sm text-gray-600">${notification.message}</p>
        <p class="text-xs text-gray-500 mt-2">To: ${
          notification.userId?.username || "All Users"
        }</p>
        <p class="text-xs text-gray-500">Sent: ${formatDate(
          notification.createdAt
        )}</p>
      </div>
    `;
    notificationsContainer.appendChild(card);
  });
}

// Fetch and render collapsible section data
async function fetchSectionData(section, container) {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) throw new Error("No authentication token found");

    const response = await fetch(
      `${apiBaseUrl}/${section}?page=1&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || `Failed to fetch ${section}`);

    if (data.status === "success" && data[section].length > 0) {
      renderSectionData(section, data[section], container);
    } else {
      container.innerHTML =
        "<p class='text-gray-500 text-center'>No data available</p>";
    }
  } catch (error) {
    showMessage(error.message || `Error fetching ${section}`, true);
    container.innerHTML =
      "<p class='text-gray-500 text-center'>Error loading data</p>";
  }
}

// Render section data
function renderSectionData(section, items, container) {
  container.innerHTML = "";
  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = `bg-white rounded-lg shadow overflow-hidden card-hover fade-in animate-delay-${
      (index % 3) + 1
    }`;
    let content = "";
    switch (section) {
      case "history":
        content = `
          <div class="p-5">
            <h3 class="text-lg font-semibold text-gray-900 truncate">${
              item.classification?.prediction?.plant || "Unknown"
            }</h3>
            <p class="text-sm text-gray-600">${
              item.classification?.prediction?.condition || "N/A"
            }</p>
            <p class="text-xs text-gray-500">${formatDate(item.timestamp)}</p>
          </div>`;
        break;
      case "plants":
        content = `
          <div class="p-5">
            <h3 class="text-lg font-semibold text-gray-900 truncate">${
              item.name
            }</h3>
            <p class="text-sm text-gray-600">${item.species}</p>
            <p class="text-xs text-gray-500">User: ${
              item.userId?.username || "N/A"
            }</p>
          </div>`;
        break;
      case "guests":
        content = `
          <div class="p-5">
            <p class="text-sm text-gray-600">Guest ID: ${item.guestId}</p>
            <p class="text-sm text-gray-600">Scans: ${item.scanCount}</p>
            <p class="text-xs text-gray-500">${formatDate(item.lastScan)}</p>
          </div>`;
        break;
      case "reminders":
        content = `
          <div class="p-5">
            <h3 class="text-lg font-semibold text-gray-900 truncate">${
              item.plantName
            }</h3>
            <p class="text-sm text-gray-600">${item.careType}</p>
            <p class="text-xs text-gray-500">Next Due: ${formatDate(
              item.nextDue
            )}</p>
          </div>`;
        break;
      case "feedback":
        content = `
          <div class="p-5">
            <p class="text-sm text-gray-600">Type: ${item.feedbackType}</p>
            <p class="text-sm text-gray-600">Label: ${item.correctLabel}</p>
            <p class="text-xs text-gray-500">User: ${
              item.userId?.username || "N/A"
            }</p>
          </div>`;
        break;
      case "subscriptions":
        content = `
          <div class="p-5">
            <p class="text-sm text-gray-600">Plan: ${item.plan}</p>
            <p class="text-sm text-gray-600">Status: ${item.status}</p>
            <p class="text-xs text-gray-500">User: ${
              item.userId?.username || "N/A"
            }</p>
          </div>`;
        break;
      case "treatment-plans":
        content = `
          <div class="p-5">
            <h3 class="text-lg font-semibold text-gray-900 truncate">${item.plantName}</h3>
            <p class="text-sm text-gray-600">${item.disease}</p>
            <p class="text-xs text-gray-500">Status: ${item.status}</p>
          </div>`;
        break;
    }
    card.innerHTML = content;
    container.appendChild(card);
  });
}

// Fetch and render weather stats (example with hardcoded lat/lng)
async function fetchWeatherStats() {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) throw new Error("No authentication token found");

    const response = await fetch(
      `${apiBaseUrl}/weather-stats?lat=31.0312&lng=31.3347`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to fetch weather stats");

    weatherStatsContainer.innerHTML = `
      <div class="p-5">
        <p class="text-sm text-gray-600">Current Temp: ${data.weather.current.temp}°C</p>
        <p class="text-sm text-gray-600">Humidity: ${data.weather.current.humidity}%</p>
        <p class="text-sm text-gray-600">Condition: ${data.weather.current.condition}</p>
        <p class="text-sm text-gray-600">Affected Users: ${data.affectedUsers}</p>
      </div>
    `;
  } catch (error) {
    showMessage(error.message || "Error fetching weather stats", true);
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

// Add user
async function addUser(event) {
  event.preventDefault();
  const token = localStorage.getItem("token") || getTokenFromCookies();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const formData = new FormData(addUserForm);
  const userData = Object.fromEntries(formData);

  try {
    const response = await fetch(`${apiBaseUrl}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Failed to add user");

    showMessage("User added successfully");
    addUserModal.classList.add("hidden");
    fetchUsers();
  } catch (error) {
    showMessage(error.message || "Error adding user", true);
  }
}

// Send notification
async function sendNotification(event) {
  event.preventDefault();
  const token = localStorage.getItem("token") || getTokenFromCookies();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const formData = new FormData(sendNotificationForm);
  const notificationData = Object.fromEntries(formData);

  try {
    const response = await fetch(`${apiBaseUrl}/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(notificationData),
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to send notification");

    showMessage("Notification sent successfully");
    sendNotificationModal.classList.add("hidden");
    fetchNotifications();
  } catch (error) {
    showMessage(error.message || "Error sending notification", true);
  }
}

// Placeholder functions for edit and delete (to be expanded as needed)
function editUser(userId) {
  showMessage("Edit user functionality not implemented yet");
  // Add modal or form logic here
}

async function deleteUser(userId) {
  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    const response = await fetch(`${apiBaseUrl}/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Failed to delete user");

    showMessage("User deleted successfully");
    fetchUsers();
  } catch (error) {
    showMessage(error.message || "Error deleting user", true);
  }
}

// Get token from cookies
function getTokenFromCookies() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  return cookie ? cookie.split("=")[1] : null;
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token") || getTokenFromCookies();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  // Initial data load
  fetchStats();
  fetchUsers();
  fetchNotifications();

  // Toggle collapsible sections
  document.querySelectorAll('[id^="toggle"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.id
        .replace("toggle", "")
        .toLowerCase()
        .replace("btn", "");
      const container = document.getElementById(`${section}Container`);
      const isHidden = container.classList.contains("hidden");
      container.classList.toggle("hidden");
      btn.querySelector("i").classList.toggle("fa-chevron-down");
      btn.querySelector("i").classList.toggle("fa-chevron-up");
      if (isHidden) {
        if (section === "weatherstats") fetchWeatherStats();
        else
          fetchSectionData(
            section.replace("treatmentplans", "treatment-plans"),
            container
          );
      }
    });
  });

  // Profile dropdown
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

  // Logout
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/login.html";
  });

  // Add User Modal
  document
    .getElementById("addUserBtn")
    .addEventListener("click", () => addUserModal.classList.remove("hidden"));
  closeAddUserModal.addEventListener("click", () =>
    addUserModal.classList.add("hidden")
  );
  cancelAddUserBtn.addEventListener("click", () =>
    addUserModal.classList.add("hidden")
  );
  addUserForm.addEventListener("submit", addUser);

  // Send Notification Modal
  document
    .getElementById("sendNotificationBtn")
    .addEventListener("click", () =>
      sendNotificationModal.classList.remove("hidden")
    );
  closeNotificationModal.addEventListener("click", () =>
    sendNotificationModal.classList.add("hidden")
  );
  cancelNotificationBtn.addEventListener("click", () =>
    sendNotificationModal.classList.add("hidden")
  );
  sendNotificationForm.addEventListener("submit", sendNotification);
});
