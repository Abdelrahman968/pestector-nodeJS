const apiBaseUrl = "/api";

// DOM Elements
const reminderForm = document.getElementById("reminderForm");
const remindersList = document.getElementById("remindersList");

// Icons for care types
const careTypeIcons = {
  water: "fas fa-tint", // Water drop icon
  fertilize: "fas fa-seedling", // Seedling icon
  prune: "fas fa-cut", // Scissors icon
  repot: "fas fa-archive", // Box icon
  inspect: "fas fa-search", // Magnifying glass icon
};

// Function to show a toast notification
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  const bgColor =
    type === "success"
      ? "bg-green-500"
      : type === "error"
      ? "bg-red-500"
      : "bg-blue-500";
  toast.className = `flex items-center ${bgColor} text-white text-sm font-medium px-4 py-2 rounded-md shadow-lg fade-in max-w-sm`;
  toast.innerHTML = `
        <i class="fas ${
          type === "success" ? "fa-check-circle" : "fa-info-circle"
        } mr-2"></i>
        ${message}
    `;
  document.getElementById("toastContainer").appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove("fade-in");
    toast.classList.add("opacity-0");
    setTimeout(() => toast.remove(), 400); // Match fade-out duration
  }, 3000);
}

// Fetch and display reminders
async function fetchReminders() {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/reminders`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to fetch reminders");

    // Clear existing reminders
    remindersList.innerHTML = "";

    // Group reminders by frequency
    const remindersByFrequency = data.reminders.reduce((groups, reminder) => {
      const frequency = reminder.frequency;
      if (!groups[frequency]) {
        groups[frequency] = [];
      }
      groups[frequency].push(reminder);
      return groups;
    }, {});

    // Populate reminders by frequency
    for (const frequency in remindersByFrequency) {
      const frequencyGroup = document.createElement("div");
      frequencyGroup.className = "mb-6";
      frequencyGroup.innerHTML = `
                        <h4 class="text-md font-medium text-gray-900 mb-2">Frequency: Every ${frequency} days</h4>
                        <div class="space-y-4">
                            ${remindersByFrequency[frequency]
                              .map(
                                (reminder) => `
                                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 card-hover">
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <div class="flex items-center space-x-2">
                                                <i class="${
                                                  careTypeIcons[
                                                    reminder.careType
                                                  ]
                                                } text-indigo-600"></i>
                                                <h4 class="text-sm font-medium text-gray-900">${
                                                  reminder.plantName
                                                }</h4>
                                            </div>
                                            <p class="text-sm text-gray-500">Next Due: ${new Date(
                                              reminder.nextDue
                                            ).toLocaleDateString("en")}</p>
                                            ${
                                              reminder.notes
                                                ? `<p class="text-sm text-gray-500 mt-2">Notes: ${reminder.notes}</p>`
                                                : ""
                                            }
                                            <p class="text-sm text-gray-500">Completed: ${
                                              reminder.completedCount
                                            } times</p>
                                        </div>
                                        <div class="flex space-x-2">
                                            ${
                                              !reminder.lastCompleted ||
                                              new Date(reminder.nextDue) <=
                                                new Date()
                                                ? `
                                                <button onclick="markAsCompleted('${reminder._id}')"
                                                    class="px-2 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700">
                                                    <i class="fas fa-check"></i>
                                                </button>
                                            `
                                                : ""
                                            }
                                            <button onclick="deleteReminder('${
                                              reminder._id
                                            }')"
                                                class="px-2 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    `;
      remindersList.appendChild(frequencyGroup);
    }
  } catch (error) {
    console.error("Error fetching reminders:", error);
  }
}

// Create a reminder
async function createReminder(event) {
  event.preventDefault();
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const formData = {
      plantName: document.getElementById("plantName").value,
      careType: document.getElementById("careType").value,
      frequency: parseInt(document.getElementById("frequency").value),
      notes: document.getElementById("notes").value,
    };

    const response = await fetch(`${apiBaseUrl}/reminders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to create reminder");

    showToast("Reminder created successfully", "success"); // Updated
    reminderForm.reset();
    fetchReminders(); // Refresh the reminders list
  } catch (error) {
    console.error("Error creating reminder:", error);
    showToast("Failed to create reminder", "error"); // Updated
  }
}

// Mark a reminder as completed
async function markAsCompleted(reminderId) {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
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

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to mark reminder as completed");

    showToast("Reminder marked as completed", "success"); // Updated
    fetchReminders(); // Refresh the reminders list
  } catch (error) {
    console.error("Error marking reminder as completed:", error);
    showToast("Failed to mark reminder as completed", "error"); // Updated
  }
}

// Delete a reminder
async function deleteReminder(reminderId) {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/reminders/${reminderId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to delete reminder");

    showToast("Reminder deleted successfully", "success"); // Updated
    fetchReminders(); // Refresh the reminders list
  } catch (error) {
    console.error("Error deleting reminder:", error);
    showToast("Failed to delete reminder", "error"); // Updated
  }
}

// Event Listeners
reminderForm.addEventListener("submit", createReminder);

// Initial fetch
fetchReminders();
