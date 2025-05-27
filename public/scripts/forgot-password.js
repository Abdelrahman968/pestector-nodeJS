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

  // Make sure the message stays visible long enough
  setTimeout(() => {
    statusMessageContainer.classList.remove("slide-in-down");
    statusMessageContainer.classList.add("fade-out-up");
    setTimeout(() => statusMessageContainer.classList.add("hidden"), 500);
  }, 5000);
}

// Forgot Password Form Submission
document
  .getElementById("forgotPasswordForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Forgot password form submitted");

    const submitBtn = document.getElementById("submitBtn");
    const submitBtnText = document.getElementById("submitBtnText");
    const submitBtnLoader = document.getElementById("submitBtnLoader");

    if (!submitBtn || !submitBtnText || !submitBtnLoader) {
      console.error("One or more elements are missing in the DOM.");
      return;
    }

    submitBtn.disabled = true;
    submitBtnText.textContent = "Sending...";
    submitBtnLoader.classList.remove("hidden");

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    console.log("Forgot Password Form data:", data);

    try {
      const response = await fetch(`${apiBaseUrl}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include", // Include cookies in the request
      });

      const result = await response.json();
      console.log("Forgot Password Response:", result);

      if (!response.ok) {
        throw new Error(result.message || "Failed to send reset link");
      }

      showMessage(
        "statusMessageContainer",
        result.message ||
          "If your email address is registered, you will receive a password reset link.",
        false
      );

      submitBtn.disabled = false;
      submitBtnText.textContent = "Send Reset Link";
      submitBtnLoader.classList.add("hidden");

      // Clear the form
      e.target.reset();
    } catch (error) {
      console.error("Error during forgot password request:", error);
      submitBtn.disabled = false;
      submitBtnText.textContent = "Send Reset Link";
      submitBtnLoader.classList.add("hidden");
      showMessage(
        "statusMessageContainer",
        error.message || "Failed to send reset link. Please try again.",
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

// Initial check
checkAuth();
