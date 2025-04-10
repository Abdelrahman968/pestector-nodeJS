// DOM Elements
const searchInput = document.getElementById("searchInput");
const filterPlant = document.getElementById("filterPlant");
const diseaseLibrary = document.getElementById("diseaseLibrary");
const plantSections = document.querySelectorAll(".plant-section");
const accordionToggles = document.querySelectorAll(".accordion-toggle");

// Show status message
function showMessage(message, isError = false) {
  const statusMessageContainer = document.createElement("div");
  statusMessageContainer.id = "statusMessageContainer";
  statusMessageContainer.classList.add("mb-6", "hidden");
  const statusMessage = document.createElement("div");
  statusMessage.id = "statusMessage";
  statusMessageContainer.classList.remove("slide-in-down", "fade-out-up");
  statusMessage.innerHTML = isError
    ? `<i class="fas fa-exclamation-circle mr-2"></i>${message}`
    : `<i class="fas fa-check-circle mr-2"></i>${message}`;
  statusMessage.className = `py-3 px-4 rounded-md text-sm font-medium ${
    isError
      ? "bg-red-100 text-red-700 border border-red-200"
      : "bg-green-100 text-green-700 border border-green-200"
  }`;
  statusMessageContainer.appendChild(statusMessage);
  document.querySelector("main").prepend(statusMessageContainer);
  statusMessageContainer.classList.remove("hidden");
  statusMessageContainer.classList.add("slide-in-down");
  setTimeout(() => {
    statusMessageContainer.classList.remove("slide-in-down");
    statusMessageContainer.classList.add("fade-out-up");
    setTimeout(() => statusMessageContainer.classList.add("hidden"), 500);
  }, 5000);
}

// Filter and Search Functionality
function filterAndSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedPlant = filterPlant.value;

  plantSections.forEach((section) => {
    const plantName = section.getAttribute("data-plant").toLowerCase();
    const diseases = section.querySelectorAll("h4");
    let matchesSearch = false;

    // Check if plant name or any disease name matches the search term
    if (searchTerm) {
      matchesSearch = plantName.includes(searchTerm);
      diseases.forEach((disease) => {
        const diseaseName = disease.textContent.toLowerCase();
        if (diseaseName.includes(searchTerm)) {
          matchesSearch = true;
        }
      });
    } else {
      matchesSearch = true; // If no search term, show all
    }

    // Check if plant matches the filter
    const matchesFilter = selectedPlant
      ? plantName === selectedPlant.toLowerCase()
      : true;

    // Show or hide the section
    if (matchesSearch && matchesFilter) {
      section.classList.remove("hidden");
    } else {
      section.classList.add("hidden");
    }
  });
}

// Accordion Functionality for FAQs
accordionToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const content = toggle.nextElementSibling;
    const icon = toggle.querySelector("i");
    const isOpen = content.classList.contains("open");

    // Close all other accordions
    accordionToggles.forEach((otherToggle) => {
      const otherContent = otherToggle.nextElementSibling;
      const otherIcon = otherToggle.querySelector("i");
      if (otherToggle !== toggle) {
        otherContent.classList.remove("open");
        otherIcon.classList.remove("fa-chevron-up");
        otherIcon.classList.add("fa-chevron-down");
      }
    });

    // Toggle the clicked accordion
    content.classList.toggle("open");
    icon.classList.toggle("fa-chevron-down");
    icon.classList.toggle("fa-chevron-up");
  });
});

searchInput.addEventListener("input", filterAndSearch);
filterPlant.addEventListener("change", filterAndSearch);
