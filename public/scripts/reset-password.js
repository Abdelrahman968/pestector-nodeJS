const apiBaseUrl = "/api/auth";

// Enhanced message display
function showMessage(containerId, message, isError = false) {
  const statusMessageContainer = document.getElementById(containerId);
  const statusMessage = document.getElementById("statusMessage");

  statusMessageContainer.classList.remove("slide-in-down", "fade-out-up");
  statusMessage.innerHTML = isError
    ? `<i class="fas fa-exclamation-circle mr-2"></i>${message}`
    : `<i class="fas fa-check-circle mr-2"></i>${message}`;

  statusMessage.className = `py-2 px-4 rounded-md text-sm font-medium ${
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

// Show error section with message
function showError(message) {
  const errorSection = document.getElementById("errorSection");
  const errorMessage = document.getElementById("errorMessage");
  const loadingSection = document.getElementById("loadingSection");
  const resetPasswordSection = document.getElementById("resetPasswordSection");

  errorMessage.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`;
  loadingSection.classList.add("hidden");
  resetPasswordSection.classList.add("hidden");
  errorSection.classList.remove("hidden");
}

// Validate password strength
function validatePassword(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  if (!passwordRegex.test(password)) {
    return "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character";
  }
  return null;
}

// Validate reset token on page load
async function validateToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    showError("No reset token provided. Please request a new reset link.");
    return;
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/validate-reset-token/${token}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      }
    );

    const result = await response.json();
    console.log("Token Validation Response:", result);

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Invalid or expired reset token");
    }

    // Show reset password form
    document.getElementById("loadingSection").classList.add("hidden");
    document.getElementById("resetPasswordSection").classList.remove("hidden");
  } catch (error) {
    console.error("Error validating reset token:", error);
    showError(
      error.message ||
        "Invalid or expired reset token. Please request a new reset link."
    );
  }
}

// Reset Password Form Submission
document
  .getElementById("resetPasswordForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Reset password form submitted");

    const submitBtn = document.getElementById("submitBtn");
    const submitBtnText = document.getElementById("submitBtnText");
    const submitBtnLoader = document.getElementById("submitBtnLoader");

    if (!submitBtn || !submitBtnText || !submitBtnLoader) {
      console.error("One or more elements are missing in the DOM.");
      return;
    }

    const formData = new FormData(e.target);
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    // Client-side password validation
    if (newPassword !== confirmPassword) {
      showMessage("statusMessageContainer", "Passwords do not match", true);
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      showMessage("statusMessageContainer", passwordError, true);
      return;
    }

    submitBtn.disabled = true;
    submitBtnText.textContent = "Resetting...";
    submitBtnLoader.classList.remove("hidden");

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const data = { token, newPassword };
    console.log("Reset Password Form data:", { token, newPassword: "****" });

    try {
      const response = await fetch(`${apiBaseUrl}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const result = await response.json();
      console.log("Reset Password Response:", result);

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to reset password");
      }

      // Check email status
      let message = result.message || "Password has been reset successfully.";
      if (result.emailStatus && !result.emailStatus.sent) {
        message += ` Warning: Could not send confirmation email (${result.emailStatus.message}). Please contact support if you need assistance.`;
      } else {
        message += " A confirmation email has been sent to your email address.";
      }

      showMessage("statusMessageContainer", message, !result.emailStatus.sent);

      submitBtn.disabled = false;
      submitBtnText.textContent = "Reset Password";
      submitBtnLoader.classList.add("hidden");

      // Clear the form
      e.target.reset();

      // Redirect to login page after success
      setTimeout(() => {
        console.log("Redirecting to Login Page");
        window.location.href = "/login.html";
      }, 2000);
    } catch (error) {
      console.error("Error during password reset:", error);
      submitBtn.disabled = false;
      submitBtnText.textContent = "Reset Password";
      submitBtnLoader.classList.add("hidden");
      showMessage(
        "statusMessageContainer",
        error.message || "Failed to reset password. Please try again.",
        true
      );
    }
  });

// Function to get the token from cookies
function getTokenFromCookies() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  return cookie ? cookie.split("=")[1] : null;
}

// Function to check if the user is already authenticated
function checkAuth() {
  let token = localStorage.getItem("token") || getTokenFromCookies();
  if (token) window.location.href = "/";
}

// Initial checks
checkAuth();
validateToken();
