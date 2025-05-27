// DOM Elements
const profileBtn = document.getElementById("profileDropdownBtn");
const profileDropdown = document.getElementById("profileDropdown");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const moreMenuToggle = document.getElementById("moreMenuToggle");
const moreMenuMobile = document.getElementById("moreMenuMobile");
const userLoggedIn = document.getElementById("userLoggedIn");
const userNotLoggedIn = document.getElementById("userNotLoggedIn");
const welcomeMessage = document.getElementById("welcomeMessage");
const logoutBtn = document.getElementById("logoutBtn");
const imageInput = document.getElementById("imageInput");
const previewContainer = document.getElementById("preview-container");
const previewImage = document.getElementById("preview-image");
const uploadPrompt = document.getElementById("upload-prompt");
const fileNameSpan = document.getElementById("file-name");
const dropZone = document.getElementById("drop-zone");
const cropperModal = document.getElementById("cropper-modal");
const cropperImage = document.getElementById("cropper-image");
const confidenceThreshold = document.getElementById("confidenceThreshold");
const thresholdValue = document.getElementById("thresholdValue");
const errorMessage = document.getElementById("error-message");
const errorMessageText = document.getElementById("error-message-text");
const cropSizeDisplay = document.getElementById("crop-size");

// Scan-related variables
let currentHistoryId = null;
let cropper = null;
let croppedImage = null;
const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Show status message
function showMessage(message, isError = false, duration = 3000) {
  let statusMessageContainer = document.getElementById(
    "statusMessageContainer"
  );
  if (!statusMessageContainer) {
    statusMessageContainer = document.createElement("div");
    statusMessageContainer.id = "statusMessageContainer";
    statusMessageContainer.classList.add("mb-6");
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.prepend(statusMessageContainer);
    } else {
      // Fallback if no main element is found, though 'main' is standard
      document.body.prepend(statusMessageContainer);
    }
  }
  let statusMessage = document.getElementById("statusMessage");
  if (!statusMessage) {
    statusMessage = document.createElement("div");
    statusMessage.id = "statusMessage";
    statusMessageContainer.appendChild(statusMessage);
  }

  statusMessage.textContent = message;
  statusMessage.className = `py-3 px-4 rounded-md text-sm font-medium shadow-sm border-l-4 flex items-center ${
    isError
      ? "bg-red-50 text-red-800 border-red-500"
      : "bg-green-50 text-green-800 border-green-500"
  }`;
  statusMessageContainer.classList.remove("hidden");

  if (duration > 0) {
    setTimeout(() => {
      statusMessageContainer.classList.add("hidden");
    }, duration);
  }
}

// Get token from cookies or localStorage
function getToken() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="));
  const token = cookie ? cookie.split("=")[1] : localStorage.getItem("token");
  return token;
}

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
        // Avoid redirect if on login page already or if elements don't exist
        if (
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/register"
        ) {
          window.location.href = "/login";
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (userLoggedIn) userLoggedIn.classList.add("hidden");
      if (userNotLoggedIn) userNotLoggedIn.classList.remove("hidden");
      showMessage("Error fetching user profile. Please log in again.", true);
      localStorage.removeItem("token");
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      // Avoid redirect if on login page already or if elements don't exist
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register"
      ) {
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

      if (response.ok) {
        localStorage.removeItem("token");
        document.cookie =
          "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        showMessage("Logout successful!", false);
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

// Validate image file
function validateImageFile(file) {
  if (!file) return false;
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    showError("Only image files (JPEG, PNG, WebP) are allowed.");
    return false;
  }
  if (file.size < 100) {
    // Basic check for potentially empty/corrupt files
    showError("File appears to be corrupted or too small.");
    return false;
  }
  return true;
}

// Show error message specific to image upload area
function showError(message) {
  if (errorMessageText) errorMessageText.textContent = message;
  if (errorMessage) errorMessage.classList.remove("hidden");
}

// Reset image input elements
function resetImageInput() {
  if (imageInput) imageInput.value = "";
  if (fileNameSpan) fileNameSpan.textContent = "No file selected";
  if (previewContainer) previewContainer.classList.add("hidden");
  if (uploadPrompt) uploadPrompt.classList.remove("hidden");
  croppedImage = null;
  if (errorMessage) errorMessage.classList.add("hidden");
}

// Cropper Functions
function showCropper() {
  if (
    !previewImage ||
    !previewImage.src ||
    previewImage.src.startsWith("data:,")
  ) {
    // data:, checks for empty src
    showError("Please select a valid image first.");
    return;
  }
  if (cropperModal) cropperModal.classList.remove("hidden");
  if (cropperImage) cropperImage.src = previewImage.src;
  if (cropper) cropper.destroy();
  if (cropperImage) {
    cropper = new Cropper(cropperImage, {
      aspectRatio: NaN, // Free aspect ratio
      viewMode: 1, // Restrict crop box to canvas
      autoCropArea: 0.8,
      responsive: true,
      crop: () => updateCropSize(),
    });
    updateCropSize();
  }
}

function closeCropper() {
  if (cropperModal) cropperModal.classList.add("hidden");
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  if (cropSizeDisplay) cropSizeDisplay.textContent = "N/A";
}

function cropImage() {
  if (!cropper) return;
  const canvas = cropper.getCroppedCanvas({
    width: 800, // Example width, adjust as needed
    height: 800, // Example height, adjust as needed
  });
  if (!canvas) {
    showError("Failed to crop image.");
    return;
  }
  const originalFileType = imageInput.files[0]?.type || "image/jpeg"; // Fallback to jpeg
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        showError("Error generating cropped image.");
        return;
      }
      const extension = originalFileType.split("/")[1] || "jpg";
      const originalFileName = imageInput.files[0]?.name || "cropped_image";
      const fileName = originalFileName.replace(
        /\.[^/.]+$/,
        `_cropped.${extension}`
      );

      const file = new File([blob], fileName, {
        type: originalFileType,
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (imageInput) imageInput.files = dataTransfer.files;
      if (previewImage) previewImage.src = URL.createObjectURL(blob);
      croppedImage = file;
      closeCropper();
    },
    originalFileType,
    0.9 // Quality
  );
}

function zoomCropper(amount) {
  if (cropper) cropper.zoom(amount);
}

function rotateCropper(degrees) {
  if (cropper) cropper.rotate(degrees);
}

function resetCropper() {
  if (cropper) {
    cropper.reset();
    setAspectRatio(); // Re-apply aspect ratio if one was selected
    updateCropSize();
  }
}

function setAspectRatio() {
  if (!cropper) return;
  const aspectRatioSelect = document.getElementById("aspect-ratio");
  if (aspectRatioSelect) {
    const value = aspectRatioSelect.value;
    cropper.setAspectRatio(value ? parseFloat(value) : NaN);
  }
}

function updateCropSize() {
  if (!cropper || !cropSizeDisplay) {
    if (cropSizeDisplay) cropSizeDisplay.textContent = "N/A";
    return;
  }
  const data = cropper.getCropBoxData();
  const width = Math.round(data.width);
  const height = Math.round(data.height);
  cropSizeDisplay.textContent = `${width} × ${height} px`;
}

// Classify Image
async function classifyImage() {
  const fileInput = document.getElementById("imageInput");
  const useGeminiCheckbox = document.getElementById("useGemini");
  const modelChoiceSelect = document.getElementById("modelChoice");
  const confidenceThresholdInput = document.getElementById(
    "confidenceThreshold"
  );
  const resultPlaceholder = document.getElementById("result-placeholder");
  const resultContent = document.getElementById("result-content");
  const resultsContentDiv = document.getElementById("results-content");
  const treatmentPlanDiv = document.getElementById("treatment-plan");
  const warningsSection = document.getElementById("warnings-section");
  const alternativePredictions = document.getElementById(
    "alternative-predictions"
  );
  const metadataContentDiv = document.getElementById("metadata-content");
  const loadingSpinner = document.getElementById("loading-spinner");
  const analyzeButton = document.getElementById("analyze-button");

  if (!fileInput || !fileInput.files.length) {
    showError("Please select an image.");
    return;
  }

  const useGemini = useGeminiCheckbox ? useGeminiCheckbox.checked : false;
  const modelChoice = modelChoiceSelect ? modelChoiceSelect.value : "default";
  const lowConfidenceThreshold = confidenceThresholdInput
    ? confidenceThresholdInput.value
    : 0.5;

  const formData = new FormData();
  formData.append("file", croppedImage || fileInput.files[0]);

  if (loadingSpinner) loadingSpinner.classList.remove("hidden");
  if (errorMessage) errorMessage.classList.add("hidden");
  if (analyzeButton) analyzeButton.disabled = true;
  if (resultPlaceholder) {
    resultPlaceholder.innerHTML = `
        <div class="text-center py-8 px-6 bg-gray-50 rounded-lg border border-gray-200">
            <div class="loader mx-auto mb-3"></div>
            <p class="text-gray-600 text-sm">Scanning your plant...</p>
        </div>`;
    resultPlaceholder.classList.remove("hidden");
  }
  if (resultContent) resultContent.classList.add("hidden");

  try {
    const response = await fetch(
      `/api/classify?model_choice=${modelChoice}&use_gemini=${useGemini}&low_confidence_threshold=${lowConfidenceThreshold}`,
      {
        method: "POST",
        body: formData,
        headers: { "X-API-KEY": "1122333" }, // Ensure this key is secure if used in production
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: "Scan failed with status: " + response.status,
      }));
      throw new Error(errorData.message || "Scan failed");
    }

    const data = await response.json();
    if (data.status !== "success") {
      throw new Error(data.message || "Classification failed");
    }

    currentHistoryId = data.history_id;
    if (resultPlaceholder) resultPlaceholder.classList.add("hidden");
    if (resultContent) resultContent.classList.remove("hidden");

    const prediction = data.overall_best_prediction;

    if (resultsContentDiv && prediction) {
      resultsContentDiv.innerHTML = `
            <div class="flex flex-col lg:flex-row gap-6">
                <div class="flex-grow">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">${
                      prediction.plant
                    }</h3>
                    <div class="space-y-4">
                        <div>
                            <span class="text-sm text-gray-600">Condition:</span>
                            <span class="ml-2 px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">${
                              prediction.condition
                            }</span>
                            <span class="ml-2 text-sm text-gray-500">via ${
                              prediction.model_source
                            }</span>
                        </div>
                        <div>
                            <span class="text-sm text-gray-600">Treatment:</span>
                            <p class="mt-2 text-sm text-gray-800 bg-gray-50 p-4 rounded-lg gemini-highlight ${
                              prediction.gemini_highlighted
                                ? "border-l-2 border-blue-500"
                                : ""
                            }">${
        prediction.treatment_recommendations || "Not available"
      }</p>
                        </div>
                        <div>
                            <span class="text-sm text-gray-600">Cause:</span>
                            <p class="mt-2 text-sm text-gray-800 bg-gray-50 p-4 rounded-lg gemini-highlight ${
                              prediction.gemini_highlighted
                                ? "border-l-2 border-blue-500"
                                : ""
                            }">${
        prediction.reason_for_disease || "Not available"
      }</p>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg w-full lg:w-64">
                    <img src="${
                      previewImage ? previewImage.src : ""
                    }" alt="Scanned plant" class="w-full h-32 object-contain rounded-lg mb-3">
                    <div class="text-sm text-gray-600 mb-1">Confidence</div>
                    <div class="text-xl font-semibold text-emerald-600">${prediction.confidence_percent.toFixed(
                      2
                    )}%</div>
                    <div class="mt-2 bg-gray-200 rounded-full h-1.5">
                        <div class="confidence-bar bg-emerald-500 h-full rounded-full" style="width: ${
                          prediction.confidence_percent
                        }%"></div>
                    </div>
                    <div class="mt-3 space-y-2 text-sm">
                        <div>
                            <span class="text-gray-600">Severity:</span>
                            <span class="ml-1 font-medium">${
                              prediction.disease_info?.severity || "N/A"
                            }</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Source:</span>
                            <span class="ml-1 font-medium">${
                              prediction.data_source || "N/A"
                            }</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    if (treatmentPlanDiv) {
      if (data.treatment_plan_id) {
        treatmentPlanDiv.innerHTML = `
                <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <span class="bg-emerald-100 p-2 rounded-full mr-3">
                        <i class="fa-solid fa-file-medical text-emerald-600"></i>
                    </span>
                    Treatment Plan
                </h3>
                <p class="text-sm text-gray-700">A personalized treatment plan has been created.</p>
                <a href="/treatment?planId=${data.treatment_plan_id}" class="mt-2 inline-block text-emerald-600 hover:text-emerald-800 font-medium">
                    View Plan <i class="fa-solid fa-arrow-right ml-1"></i>
                </a>`;
        treatmentPlanDiv.classList.remove("hidden");
      } else {
        treatmentPlanDiv.classList.add("hidden");
      }
    }

    if (warningsSection) {
      warningsSection.innerHTML = data.warnings?.length
        ? `
            <div class="flex items-start">
                <i class="fa-solid fa-exclamation-circle mt-1 mr-2 text-yellow-500"></i>
                <div>
                    <h3 class="text-sm font-semibold text-yellow-800">Warnings</h3>
                    <ul class="mt-2 space-y-2 text-sm text-yellow-700">
                        ${data.warnings
                          .map(
                            (w) => `
                            <li class="flex items-center">
                                <i class="fa-solid fa-${
                                  w.type === "low_confidence"
                                    ? "exclamation-triangle"
                                    : "info-circle"
                                } mr-2"></i>
                                ${w.message}
                            </li>
                        `
                          )
                          .join("")}
                    </ul>
                </div>
            </div>`
        : "";
      warningsSection.classList.toggle("hidden", !data.warnings?.length);
    }

    if (alternativePredictions && data.vit_predictions && data.tf_predictions) {
      alternativePredictions.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Model Predictions</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <span class="bg-blue-100 p-2 rounded-full mr-2 text-blue-600">
                            <i class="fa-solid fa-brain"></i>
                        </span>
                        Vision Transformer
                    </h4>
                    <div class="space-y-2">
                        ${data.vit_predictions
                          .map(
                            (pred, i) => `
                            <div class="p-3 rounded-lg ${
                              i === 0
                                ? "bg-emerald-50"
                                : "bg-white border border-gray-200"
                            }">
                                <div class="flex justify-between text-sm">
                                    <span>${
                                      pred.class
                                        .split("___")[1]
                                        ?.replace(/_/g, " ") || pred.class
                                    }</span>
                                    <span class="${
                                      i === 0
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-gray-100"
                                    } px-2 py-1 rounded-full">${(
                              pred.confidence * 100
                            ).toFixed(1)}%</span>
                                </div>
                            </div>`
                          )
                          .join("")}
                    </div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <span class="bg-purple-100 p-2 rounded-full mr-2 text-purple-600">
                            <i class="fa-solid fa-microchip"></i>
                        </span>
                        VGG
                    </h4>
                    <div class="space-y-2">
                        ${data.tf_predictions
                          .map(
                            (pred, i) => `
                            <div class="p-3 rounded-lg ${
                              i === 0
                                ? "bg-emerald-50"
                                : "bg-white border border-gray-200"
                            }">
                                <div class="flex justify-between text-sm">
                                    <span>${
                                      pred.class
                                        .split("___")[1]
                                        ?.replace(/_/g, " ") || pred.class
                                    }</span>
                                    <span class="${
                                      i === 0
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-gray-100"
                                    } px-2 py-1 rounded-full">${(
                              pred.confidence * 100
                            ).toFixed(1)}%</span>
                                </div>
                            </div>`
                          )
                          .join("")}
                    </div>
                </div>
            </div>`;
    }

    if (metadataContentDiv && data.metadata?.image_details) {
      const meta = data.metadata.image_details;
      metadataContentDiv.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <span class="bg-gray-100 p-2 rounded-full mr-3 text-gray-600">
                    <i class="fa-solid fa-info-circle"></i>
                </span>
                Image Details
            </h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
                <div class="bg-gray-50 p-3 rounded-lg">
                    <span class="text-gray-600">Filename:</span>
                    <span class="ml-1">${data.metadata.filename}</span>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <span class="text-gray-600">Type:</span>
                    <span class="ml-1">${data.metadata.content_type}</span>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <span class="text-gray-600">Size:</span>
                    <span class="ml-1">${meta.size || "Unknown"}</span>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                    <span class="text-gray-600">Format:</span>
                    <span class="ml-1">${meta.format || "Unknown"}</span>
                </div>
            </div>`;
      metadataContentDiv.classList.remove("hidden");
    }
  } catch (error) {
    showError(error.message);
    if (resultPlaceholder) {
      resultPlaceholder.innerHTML = `
            <div class="text-center py-10 px-6 bg-red-50 rounded-lg border border-red-200">
                <div class="bg-red-100 p-3 rounded-full inline-flex mb-3">
                    <i class="fa-solid fa-exclamation-circle text-2xl text-red-500"></i>
                </div>
                <h3 class="text-red-800 font-semibold">Scan Failed</h3>
                <p class="text-red-700 text-sm mt-2">${error.message}. Please try again or contact support.</p>
            </div>`;
      resultPlaceholder.classList.remove("hidden");
    }
    if (resultContent) resultContent.classList.add("hidden");
  } finally {
    if (loadingSpinner) loadingSpinner.classList.add("hidden");
    if (analyzeButton) analyzeButton.disabled = false;
  }
}

// Download Results as PDF
async function downloadResults() {
  if (!currentHistoryId) {
    showError("No scan results to download.");
    return;
  }
  if (
    typeof window.jspdf === "undefined" ||
    typeof html2canvas === "undefined"
  ) {
    showError("PDF generation library not loaded. Please try again later.");
    console.error("jsPDF or html2canvas not loaded.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  try {
    const resultContentToPrint = document.getElementById("result-content");
    if (!resultContentToPrint) {
      showError("Result content not found for PDF generation.");
      return;
    }
    const canvas = await html2canvas(resultContentToPrint, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.9);
    const imgWidth = 190; // A4 width - margins
    const pageHeight = 295; // A4 height
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 20; // Initial top margin

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Pestector Scan Results", 105, 15, { align: "center" });

    doc.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - position - 10; // -10 for bottom margin

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight; // Or reset to top margin for new page: position = -imgHeight + heightLeft
      doc.addPage();
      doc.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Footer on the last page
    const pageCount = doc.internal.getNumberOfPages();
    doc.setPage(pageCount);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated on ${new Date().toLocaleString()}`,
      10,
      pageHeight - 10
    );
    doc.text("© 2025 Pestector", 190, pageHeight - 10, { align: "right" });

    doc.save(`pestector_scan_${currentHistoryId}.pdf`);
  } catch (error) {
    console.error("PDF generation error:", error);
    showError("Failed to generate PDF. Please try again.");
  }
}

// Share Results
function shareResults() {
  if (!currentHistoryId) {
    showError("No scan results to share.");
    return;
  }
  const shareUrl = `${window.location.origin}/history?scanId=${currentHistoryId}`;
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        showMessage("Link copied to clipboard! Redirecting...", false, 2000);
        setTimeout(() => (window.location.href = shareUrl), 2000);
      })
      .catch(() => {
        showError("Failed to copy link. You can manually copy: " + shareUrl);
      });
  } else {
    // Fallback for browsers that don't support navigator.clipboard
    window.location.href = shareUrl; // Or prompt user to copy manually
  }
}

// Reset Form for a new scan
function resetForm() {
  resetImageInput(); // Resets file input and preview

  const resultPlaceholder = document.getElementById("result-placeholder");
  const resultContent = document.getElementById("result-content");
  const treatmentPlanDiv = document.getElementById("treatment-plan");
  const warningsSection = document.getElementById("warnings-section");
  const metadataContentDiv = document.getElementById("metadata-content");

  if (resultContent) resultContent.classList.add("hidden");
  if (resultPlaceholder) {
    resultPlaceholder.classList.remove("hidden");
    resultPlaceholder.innerHTML = `
        <div class="text-center py-10 px-6 bg-gray-50 rounded-lg border border-gray-200">
            <div class="bg-gray-100 p-3 rounded-full inline-flex mb-3">
                <i class="fa-solid fa-leaf text-3xl text-gray-400"></i>
            </div>
            <h3 class="text-gray-700 font-semibold">Upload an image to start</h3>
            <p class="text-gray-500 text-sm mt-2 max-w-md mx-auto">Detect plant diseases and get tailored treatment plans.</p>
        </div>`;
  }
  if (treatmentPlanDiv) treatmentPlanDiv.classList.add("hidden");
  if (warningsSection) warningsSection.classList.add("hidden");
  if (metadataContentDiv) metadataContentDiv.classList.add("hidden");

  currentHistoryId = null;
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}

// Event listeners
if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    if (profileDropdown) profileDropdown.classList.toggle("hidden");
  });
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", () => {
    if (mobileMenu) mobileMenu.classList.toggle("hidden");
  });
}

if (moreMenuToggle) {
  moreMenuToggle.addEventListener("click", () => {
    if (moreMenuMobile) moreMenuMobile.classList.toggle("hidden");
  });
}

document.addEventListener("click", (event) => {
  if (
    profileBtn &&
    profileDropdown &&
    !profileBtn.contains(event.target) &&
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

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    logoutUser();
  });
}

if (imageInput) {
  imageInput.addEventListener("change", function (e) {
    const file = this.files[0];
    if (!validateImageFile(file)) {
      resetImageInput();
      return;
    }

    if (fileNameSpan) {
      fileNameSpan.textContent =
        file.name.length > 25 ? file.name.substring(0, 22) + "..." : file.name;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = () => {
        if (previewImage) previewImage.src = e.target.result;
        if (previewContainer) previewContainer.classList.remove("hidden");
        if (uploadPrompt) uploadPrompt.classList.add("hidden");
        croppedImage = null; // Reset cropped image if a new base image is selected
        if (errorMessage) errorMessage.classList.add("hidden");
      };
      img.onerror = () => {
        showError("Failed to load image. It may be corrupted.");
        resetImageInput();
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      showError("Error reading file.");
      resetImageInput();
    };
    reader.readAsDataURL(file);
  });
}

if (dropZone) {
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drop-zone-active");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drop-zone-active");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drop-zone-active");
    const file = e.dataTransfer.files[0];
    if (!validateImageFile(file)) {
      return;
    }
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (imageInput) {
      imageInput.files = dataTransfer.files;
      imageInput.dispatchEvent(new Event("change")); // Trigger change event
    }
  });
}

if (confidenceThreshold) {
  confidenceThreshold.addEventListener("input", () => {
    if (thresholdValue) thresholdValue.textContent = confidenceThreshold.value;
  });
}

// Adding listeners for buttons if they exist and functions are meant to be called by them
// These are often set via onclick in HTML, but this is a robust way if not.
document.addEventListener("DOMContentLoaded", () => {
  const analyzeButton = document.getElementById("analyze-button");
  if (analyzeButton) analyzeButton.addEventListener("click", classifyImage);

  const cropButton = document.getElementById("crop-button"); // Assuming a button with this ID shows the cropper
  if (cropButton) cropButton.addEventListener("click", showCropper);

  const applyCropButton = document.getElementById("apply-crop-button"); // In cropper modal
  if (applyCropButton) applyCropButton.addEventListener("click", cropImage);

  const cancelCropButton = document.getElementById("cancel-crop-button"); // In cropper modal
  if (cancelCropButton)
    cancelCropButton.addEventListener("click", closeCropper);

  const downloadPdfButton = document.getElementById("download-pdf-button");
  if (downloadPdfButton)
    downloadPdfButton.addEventListener("click", downloadResults);

  const shareResultsButton = document.getElementById("share-results-button");
  if (shareResultsButton)
    shareResultsButton.addEventListener("click", shareResults);

  const newScanButton = document.getElementById("new-scan-button"); // Or reset button
  if (newScanButton) newScanButton.addEventListener("click", resetForm);

  // Cropper control buttons
  const zoomInButton = document.getElementById("zoom-in-cropper");
  if (zoomInButton)
    zoomInButton.addEventListener("click", () => zoomCropper(0.1));
  const zoomOutButton = document.getElementById("zoom-out-cropper");
  if (zoomOutButton)
    zoomOutButton.addEventListener("click", () => zoomCropper(-0.1));
  const rotateLeftButton = document.getElementById("rotate-left-cropper");
  if (rotateLeftButton)
    rotateLeftButton.addEventListener("click", () => rotateCropper(-45));
  const rotateRightButton = document.getElementById("rotate-right-cropper");
  if (rotateRightButton)
    rotateRightButton.addEventListener("click", () => rotateCropper(45));
  const resetCropButton = document.getElementById("reset-cropper-button");
  if (resetCropButton) resetCropButton.addEventListener("click", resetCropper);
  const aspectRatioSelect = document.getElementById("aspect-ratio");
  if (aspectRatioSelect)
    aspectRatioSelect.addEventListener("change", setAspectRatio);
});

// Initial check for user profile
// Run this after the DOM is fully loaded to ensure elements are available
document.addEventListener("DOMContentLoaded", () => {
  checkUserProfile();
});
