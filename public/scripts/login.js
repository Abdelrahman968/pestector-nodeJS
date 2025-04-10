const apiBaseUrl = "/api/auth";

// Enhanced message display
function showMessage(containerId, message, isError = false) {
  const statusMessageContainer = document.getElementById(containerId);
  const statusMessage =
    containerId === "statusMessageContainer"
      ? document.getElementById("statusMessage")
      : document.getElementById("twoFAStatusMessage");

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

// Login Form Submission - Fixed redirect consistency and added debugging
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Login form submitted");

  const submitBtn = document.getElementById("submitBtn");
  const submitBtnText = document.getElementById("submitBtnText");
  const submitBtnLoader = document.getElementById("submitBtnLoader");

  if (!submitBtn || !submitBtnText || !submitBtnLoader) {
    console.error("One or more elements are missing in the DOM.");
    return;
  }

  submitBtn.disabled = true;
  submitBtnText.textContent = "Logging in...";
  submitBtnLoader.classList.remove("hidden");

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  console.log("Login Form data:", data);

  try {
    const response = await fetch(`${apiBaseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include", // Include cookies in the request
    });

    const result = await response.json();
    console.log("Login Response:", result);

    if (!response.ok) {
      throw new Error(result.message || "Login failed");
    }

    if (result.message === "2FA required") {
      document.getElementById("loginSection").classList.add("hidden");
      document.getElementById("twoFASection").classList.remove("hidden");
      localStorage.setItem("userId", result.userId);
      submitBtn.disabled = false;
      submitBtnText.textContent = "Login";
      submitBtnLoader.classList.add("hidden");
    } else if (result.token) {
      // Store token and show success message
      localStorage.setItem("token", result.token);
      document.cookie = `token=${result.token}; path=/; max-age=86400; secure; samesite=lax`;

      // Explicitly show the success message
      console.log("Showing success message");
      showMessage(
        "statusMessageContainer",
        "Login successful! Redirecting...",
        false
      );

      // Wait for the message to be visible before redirecting
      setTimeout(() => {
        console.log("Redirecting to index.html");
        window.location.href = "/index.html";
      }, 2000);
    } else {
      throw new Error("Unexpected response from server");
    }
  } catch (error) {
    console.error("Error during login:", error);
    submitBtn.disabled = false;
    submitBtnText.textContent = "Login";
    submitBtnLoader.classList.add("hidden");
    showMessage(
      "statusMessageContainer",
      error.message || "Login failed. Please try again.",
      true
    );
  }
});
// 2FA Form Submission
document.getElementById("twoFAForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const twoFASubmitBtn = document.getElementById("twoFASubmitBtn");
  const twoFASubmitBtnText = document.getElementById("twoFASubmitBtnText");
  const twoFASubmitBtnLoader = document.getElementById("twoFASubmitBtnLoader");

  if (!twoFASubmitBtn || !twoFASubmitBtnText || !twoFASubmitBtnLoader) {
    console.error("One or more elements are missing in the DOM.");
    return;
  }

  twoFASubmitBtn.disabled = true;
  twoFASubmitBtnText.textContent = "Verifying...";
  twoFASubmitBtnLoader.classList.remove("hidden");

  const formData = new FormData(e.target);
  const data = {
    userId: localStorage.getItem("userId"),
    token: formData.get("twoFAToken"),
  };
  console.log("2FA Form data:", data);

  try {
    const response = await fetch(`${apiBaseUrl}/2fa/login-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    console.log("2FA Verify Response:", result);

    if (!response.ok) {
      throw new Error(result.message || "2FA verification failed");
    }

    if (!result.token) {
      throw new Error("No token received from server");
    }

    localStorage.setItem("token", result.token);
    document.cookie = `token=${result.token}; path=/; max-age=86400; secure; samesite=lax`;
    showMessage(
      "twoFAStatusMessageContainer",
      "2FA verification successful! Redirecting..."
    );
    setTimeout(() => (window.location.href = "/index.html"), 2000);
  } catch (error) {
    console.error("Error during 2FA verification:", error);
    twoFASubmitBtn.disabled = false;
    twoFASubmitBtnText.textContent = "Verify";
    twoFASubmitBtnLoader.classList.add("hidden");
    showMessage(
      "twoFAStatusMessageContainer",
      error.message || "2FA verification failed. Please try again.",
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

// Function to check if the token exists in localStorage or cookies
function checkAuth() {
  let token = localStorage.getItem("token") || getTokenFromCookies();
  if (token) window.location.href = "/";
}

// Initial check
checkAuth();

// Social Sign-in Buttons (for demonstration purposes)
document.querySelectorAll("#socialSignIn a").forEach((button) => {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    showMessage(
      "statusMessageContainer",
      "Social sign-in is not implemented yet.",
      true
    );
  });
});
