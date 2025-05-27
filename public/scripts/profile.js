const apiBaseUrl = "/api/auth";

// DOM Elements
const profileForm = document.getElementById("profileForm");
const profileImagePreview = document.getElementById("profileImagePreview");
const profileImageInput = document.getElementById("profileImageInput");
const changeImageBtn = document.getElementById("changeImageBtn");
const uploadImageBtn = document.getElementById("uploadImageBtn");
const removeImageBtn = document.getElementById("removeImageBtn");
const updateLocationBtn = document.getElementById("updateLocationBtn");
const saveChangesBtn = document.getElementById("saveChangesBtn");
const subscriptionPlanBadge = document.getElementById("subscriptionPlanBadge");
const scanInfo = document.getElementById("scanInfo");
const scansRemaining = document.getElementById("scansRemaining");
const analyticsInfo = document.getElementById("analyticsInfo");
const scanProgressBar = document.getElementById("scanProgressBar");
const twoFAStatus = document.getElementById("twoFAStatus");
const twoFASetup = document.getElementById("twoFASetup");
const twoFAQrcode = document.getElementById("twoFAQrcode");
const twoFASecret = document.getElementById("twoFASecret");
const enableTwoFABtn = document.getElementById("enableTwoFABtn");
const disableTwoFABtn = document.getElementById("disableTwoFABtn");

const changePasswordBtn = document.getElementById("changePasswordBtn");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");
const currentPassword = document.getElementById("currentPassword");
const newPassword = document.getElementById("newPassword");

const deleteAccountModal = document.getElementById("deleteAccountModal");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

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

// Update 2FA UI
function updateTwoFAUI(isEnabled) {
  twoFAStatus.textContent = `2FA Status: ${isEnabled ? "Enabled" : "Disabled"}`;
  enableTwoFABtn.classList.toggle("hidden", isEnabled);
  disableTwoFABtn.classList.toggle("hidden", !isEnabled);
  twoFASetup.classList.add("hidden"); // Hide by default, shown only on enable
}

// Enable 2FA
async function enableTwoFA() {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/2fa/enable`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    console.log("2FA Enable Response:", data); // Debug

    if (!response.ok) throw new Error(data.message || "Failed to enable 2FA");

    showMessage("2FA enabled successfully");
    if (data.qrCode) {
      twoFAQrcode.src = ""; // Reset src to force reload
      twoFAQrcode.src = data.qrCode; // Set new QR code
      twoFASecret.textContent = data.secret || "N/A";
      twoFASetup.classList.remove("hidden");
      // Force DOM update
      setTimeout(() => {
        twoFAQrcode.style.display = "block"; // Ensure visibility
        console.log("QR Code src set to:", twoFAQrcode.src); // Debug
      }, 100);
    } else {
      console.error("QR code data missing in response");
      showMessage("QR code not received from server", true);
    }
    updateTwoFAUI(true);
  } catch (error) {
    showMessage(error.message || "Error enabling 2FA", true);
  }
}

// Update 2FA UI
function updateTwoFAUI(isEnabled) {
  twoFAStatus.textContent = `2FA Status: ${isEnabled ? "Enabled" : "Disabled"}`;
  enableTwoFABtn.classList.toggle("hidden", isEnabled);
  disableTwoFABtn.classList.toggle("hidden", !isEnabled);
  if (!isEnabled) {
    twoFASetup.classList.add("hidden"); // Hide setup when disabled
  }
}

// Disable 2FA
async function disableTwoFA() {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/2fa/disable`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Failed to disable 2FA");

    showMessage("2FA disabled successfully");
    updateTwoFAUI(false);
  } catch (error) {
    showMessage(error.message || "Error disabling 2FA", true);
  }
}

// Initialize the map
let map;
function initMap(latitude, longitude) {
  if (!map) {
    map = L.map("map").setView([latitude, longitude], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
  } else {
    map.setView([latitude, longitude], 13);
  }
  L.marker([latitude, longitude])
    .addTo(map)
    .bindPopup("Your Location")
    .openPopup();
}

// Reverse geocode coordinates to get city and country
async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
    );
    const data = await response.json();
    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      "Unknown";
    const country = data.address.country || "Unknown";
    document.getElementById("cityRegion").value = city;
    document.getElementById("country").value = country;
  } catch (error) {
    console.error("Error during reverse geocoding:", error);
    document.getElementById("cityRegion").value = "Error";
    document.getElementById("country").value = "Error";
  }
}

// Update fetchUserProfile to include map and geocoding
async function fetchUserProfile() {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    console.log("Profile data:", data);

    if (!response.ok)
      throw new Error(data.message || "Failed to fetch profile");

    if (data.user) {
      document.getElementById("fullName").value = data.user.fullName || "";
      document.getElementById("fullName-h3").textContent =
        data.user.fullName || "Change Your Full Name";
      document.getElementById("username").value = data.user.username || "";
      document.getElementById("email").value = data.user.email || "";
      document.getElementById("phoneNumber").value =
        data.user.phoneNumber || "";

      if (data.user.location) {
        const latitude = data.user.location.latitude || 0;
        const longitude = data.user.location.longitude || 0;
        document.getElementById("latitude").value = latitude;
        document.getElementById("longitude").value = longitude;
        await reverseGeocode(latitude, longitude);
        initMap(latitude, longitude);
      } else {
        document.getElementById("cityRegion").value = "Not Set";
        document.getElementById("country").value = "Not Set";
        initMap(0, 0); // Default to (0,0) if no location
      }

      if (data.user.profileImage) {
        profileImagePreview.src = `${data.user.profileImage}`;
      }

      const isTwoFAEnabled = !!data.user.twoFactorSecret;
      updateTwoFAUI(isTwoFAEnabled);
    }

    if (data.subscription_info) {
      const subInfo = data.subscription_info;
      subscriptionPlanBadge.textContent = `${
        subInfo.plan.charAt(0).toUpperCase() + subInfo.plan.slice(1)
      } Plan • Active`;
      scanInfo.textContent = `Scans used: ${subInfo.scans_used}/${subInfo.scan_limit}`;
      scansRemaining.textContent = `Scans remaining: ${subInfo.scans_remaining}`;
      analyticsInfo.textContent = `Advanced Analytics: ${
        subInfo.has_advanced_analytics ? "Yes" : "No"
      }`;
      const percentage = (subInfo.scans_used / subInfo.scan_limit) * 100;
      scanProgressBar.style.width = `${percentage}%`;
    }
  } catch (error) {
    showMessage(error.message || "Error fetching profile", true);
  }
}

// Update user location with map and geocoding
async function updateUserLocation() {
  try {
    if (!navigator.geolocation)
      throw new Error("Geolocation is not supported by your browser");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        document.getElementById("latitude").value = latitude;
        document.getElementById("longitude").value = longitude;
        await reverseGeocode(latitude, longitude);
        initMap(latitude, longitude);

        const token = localStorage.getItem("token") || getTokenFromCookies();
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const response = await fetch(`${apiBaseUrl}/location`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ latitude, longitude }),
        });

        const data = await response.json();

        if (!response.ok)
          throw new Error(data.message || "Failed to update location");

        showMessage("Location updated successfully");
      },
      (error) => {
        throw new Error(`Error getting location: ${error.message}`);
      }
    );
  } catch (error) {
    showMessage(error.message || "Error updating location", true);
  }
}

// Update user profile
async function updateUserProfile(formData) {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to update profile");

    showMessage("Profile updated successfully");
    fetchUserProfile();
    return true;
  } catch (error) {
    showMessage(error.message || "Error updating profile", true);
    return false;
  }
}

// Upload profile image
async function uploadProfileImage(file) {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const formData = new FormData();
    formData.append("profileImage", file);

    const response = await fetch(`${apiBaseUrl}/profile`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Failed to upload image");

    showMessage("Profile image updated successfully");
    if (data.user && data.user.profileImage) {
      profileImagePreview.src = `${data.user.profileImage}`;
    }
    return true;
  } catch (error) {
    showMessage(error.message || "Error uploading image", true);
    return false;
  }
}

// Get token from cookies
function getTokenFromCookies() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  return cookie ? cookie.split("=")[1] : null;
}

// Change Password function
async function changePassword() {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const currentPass = currentPassword.value;
    const newPass = newPassword.value;

    if (!currentPass || !newPass) {
      showMessage("Please enter both current and new passwords", true);
      return;
    }

    const response = await fetch(`${apiBaseUrl}/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: newPass,
      }),
    });

    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to change password");

    showMessage("Password changed successfully");
    currentPassword.value = "";
    newPassword.value = "";
  } catch (error) {
    showMessage(error.message || "Error changing password", true);
  }
}

// Add this function if not already present (for smooth scrolling utility)
function smoothScrollTo(element) {
  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// Modified Delete Account button event listener
deleteAccountBtn.addEventListener("click", () => {
  // Get the Delete Account section
  const deleteAccountSection = deleteAccountBtn.closest("div.pb-2");

  // Smooth scroll to the section
  smoothScrollTo(deleteAccountSection);

  // Show modal after a slight delay to allow scrolling to complete
  setTimeout(() => {
    showDeleteAccountModal();
  }, 600); // Adjust timing as needed (600ms matches typical scroll duration)
});

// Keep the existing showDeleteAccountModal function
function showDeleteAccountModal() {
  deleteAccountModal.classList.remove("hidden");
  deleteAccountModal.classList.add("fade-in");
}

// Rest of your existing delete account related code remains the same
async function deleteAccount() {
  try {
    const token = localStorage.getItem("token") || getTokenFromCookies();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(`${apiBaseUrl}/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok)
      throw new Error(data.message || "Failed to delete account");

    showMessage("Account deleted successfully");
    localStorage.removeItem("token");
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
  } catch (error) {
    showMessage(error.message || "Error deleting account", true);
    deleteAccountModal.classList.add("hidden");
  }
}

// Existing modal close listeners remain unchanged
cancelDeleteBtn.addEventListener("click", () => {
  deleteAccountModal.classList.remove("fade-in");
  deleteAccountModal.classList.add("fade-out-up");
  setTimeout(() => {
    deleteAccountModal.classList.add("hidden");
    deleteAccountModal.classList.remove("fade-out-up");
  }, 500);
});

confirmDeleteBtn.addEventListener("click", deleteAccount);

document.addEventListener("click", (event) => {
  if (event.target === deleteAccountModal) {
    deleteAccountModal.classList.remove("fade-in");
    deleteAccountModal.classList.add("fade-out-up");
    setTimeout(() => {
      deleteAccountModal.classList.add("hidden");
      deleteAccountModal.classList.remove("fade-out-up");
    }, 500);
  }
});

// Event Listeners section
changePasswordBtn.addEventListener("click", changePassword);

// Event Listeners
changeImageBtn.addEventListener("click", () => profileImageInput.click());
uploadImageBtn.addEventListener("click", () => profileImageInput.click());

profileImageInput.addEventListener("change", (event) => {
  if (event.target.files && event.target.files[0]) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      profileImagePreview.src = e.target.result;
    };
    reader.readAsDataURL(file);
    uploadProfileImage(file);
  }
});

removeImageBtn.addEventListener("click", async () => {
  try {
    profileImagePreview.src = "/assets/default-profile.png";
    showMessage("Profile image removed successfully");
    await updateUserProfile({ profileImage: null });
  } catch (error) {
    showMessage(error.message || "Error removing image", true);
  }
});

updateLocationBtn.addEventListener("click", updateUserLocation);

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = {
    fullName: document.getElementById("fullName").value,
    username: document.getElementById("username").value,
    email: document.getElementById("email").value,
    phoneNumber: document.getElementById("phoneNumber").value,
  };
  await updateUserProfile(formData);
});

enableTwoFABtn.addEventListener("click", enableTwoFA);
disableTwoFABtn.addEventListener("click", disableTwoFA);

// Check authentication and load profile
function checkAuth() {
  const token = localStorage.getItem("token") || getTokenFromCookies();
  if (!token) {
    window.location.href = "/login";
  } else {
    fetchUserProfile();
  }
}

// Initial check
checkAuth();
