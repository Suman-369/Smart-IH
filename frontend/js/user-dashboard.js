let adminMap;
let reportMarkers = [];
let allReports = [];
let filteredReports = [];
let currentPage = 1;
const reportsPerPage = 10;
let selectedImages = [];
let userLocation = null;
let previousReports = []; 

// User Dashboard
document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    window.location.href = "/login";
    return;
  }

  // Display user info
  document.getElementById("user-info").innerHTML = `
        <div class="user-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="user-details">
            <div class="user-name">${user.name}</div>
        </div>
    `;
  const userInfoDiv = document.getElementById("user-info");

  if (user && user.name && user.role) {
    userInfoDiv.innerHTML = `
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-details">
                    <div class="user-name">${user.name}</div>
                </div>
            `;
  } else {
    userInfoDiv.innerHTML = `<div class="user-details">Please Login First</div>`;
    window.location.href = "/login";
    return;
  }

  // Initialize location detection immediately when dashboard loads
  initLocationDetection();

  // Set up event listeners
  setupEventListeners();

  // Load user's reports
  loadUserReports();

  // Update report type UI
  updateReportTypeUI();

  // Start location refresh timer
  startLocationRefresh();

  // Start reports refresh timer to sync with admin updates
  startReportsRefresh();

  // Apply initial filter after a short delay to ensure reports are loaded
  setTimeout(() => {
    filterReports();
  }, 1000);
});

// location detection
function initLocationDetection() {
  // Check if geolocation is supported or Not
  if (!navigator.geolocation) {
    showLocationStatus("denied");
    updateLocationBanner("error", "Geolocation not supported");
    showMessage("Geolocation is not supported by this browser.", true);
    return;
  }

  updateLocationBanner("loading", "Checking location access...");
  showMessage(
    "📍 Welcome! We'll capture your location to ensure accurate reporting.",
    false
  );

  // Check if we already have permission or can request it
  navigator.permissions
    ?.query({ name: "geolocation" })
    .then((permissionStatus) => {
      if (permissionStatus.state === "granted") {
        // Location permission already granted, get location immediately
        updateLocationBanner("loading", "Getting your location...");
        requestLocation();
      } else if (permissionStatus.state === "prompt") {
        // Show initial prompt to user and request location
        showLocationStatus("prompt");
        updateLocationBanner("prompt", "Please allow location access");
        // Automatically request location after a short delay to give user time to read the message
        setTimeout(() => {
          requestLocation();
        }, 2000);
      } else {
        // Permission denied, show status and provide instructions
        showLocationStatus("denied");
        updateLocationBanner("error", "Location access denied");
        showMessage(
          "Location access is required for submitting reports. Please enable location services in your browser settings and refresh the page.",
          true
        );
      }

      // Listen for permission changes
      permissionStatus.onchange = () => {
        if (permissionStatus.state === "granted") {
          updateLocationBanner("loading", "Getting your location...");
          requestLocation();
        } else {
          showLocationStatus("denied");
          updateLocationBanner("error", "Location access denied");
        }
      };
    })
    .catch(() => {
      // Fallback for browsers that don't support permissions API
      showLocationStatus("prompt");
      updateLocationBanner("prompt", "Please allow location access");
      // Automatically request location after a short delay
      setTimeout(() => {
        requestLocation();
      }, 2000);
    });
}

// Request user's location
function requestLocation() {
  showLocationStatus("loading");
  updateLocationBanner("loading", "Getting your location...");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      // Update hidden inputs
      document.getElementById("lat").value = userLocation.lat;
      document.getElementById("lng").value = userLocation.lng;

      showLocationStatus("success");

      // Update banner with location details
      const accuracyText =
        userLocation.accuracy < 10
          ? "High accuracy"
          : userLocation.accuracy < 50
          ? "Good accuracy"
          : "Approximate location";
      updateLocationBanner(
        "success",
        `${accuracyText} (${Math.round(
          userLocation.accuracy
        )}m) - Ready for reporting`
      );

      updateLocationCoords();

      // Show success message with location details
      const accuracyTextMsg =
        userLocation.accuracy < 10
          ? "high accuracy"
          : userLocation.accuracy < 50
          ? "good accuracy"
          : "approximate location";
      showMessage(
        ` ${accuracyTextMsg} (${Math.round(
          userLocation.accuracy
        )}m accuracy). Your report will include precise location data.`,
        false
      );
    },
    (error) => {
      showLocationStatus("denied");

      let errorMessage = "";
      let bannerMessage = "";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage =
            "Location access is required to submit a report. Please enable location services in your browser settings and try again.";
          bannerMessage = "Location access denied";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage =
            "Unable to determine your location. Please check your device's location services and try again.";
          bannerMessage = "Location unavailable";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out. Please try again.";
          bannerMessage = "Location request timed out";
          break;
        default:
          errorMessage =
            "An error occurred while retrieving your location. Please try again.";
          bannerMessage = "Location error occurred";
          break;
      }

      updateLocationBanner("error", bannerMessage);
      showMessage(errorMessage, true);

      //  retry  functionality
      const tryAgainBtn = document.getElementById("try-location");
      if (tryAgainBtn) {
        tryAgainBtn.style.display = "block";
        tryAgainBtn.innerHTML =
          '<i class="fas fa-location-arrow"></i><span>Try Again</span>';
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 20000, 
      maximumAge: 300000, 
    }
  );
}

// Show location status
function showLocationStatus(status) {
  const denied = document.getElementById("location-denied");
  const loading = document.getElementById("location-loading");
  const success = document.getElementById("location-success");
  const prompt = document.getElementById("location-prompt");

  // Hide all status elements
  denied?.classList.remove("show");
  loading?.classList.remove("show");
  success?.classList.remove("show");
  prompt?.classList.remove("show");

  // Show appropriate status
  switch (status) {
    case "loading":
      loading?.classList.add("show");
      updateLocationBanner("loading", "Getting your location...");
      break;
    case "success":
      success?.classList.add("show");
      updateLocationBanner("success", "Location captured successfully!");
      break;
    case "prompt":
      prompt?.classList.add("show");
      updateLocationBanner("prompt", "Please allow location access");
      break;
    case "denied":
    default:
      denied?.classList.add("show");
      updateLocationBanner("error", "Location access denied");
      break;
  }
}

// Update location banner
function updateLocationBanner(status, message) {
  const banner = document.getElementById("location-banner");
  const bannerStatus = document.getElementById("location-banner-status");
  const bannerAction = document.getElementById("location-banner-action");

  if (!banner || !bannerStatus) return;

  // Remove all status classes
  banner.classList.remove("loading", "success", "error", "prompt");

  // Add appropriate status class
  banner.classList.add(status);

  // Update status message
  bannerStatus.textContent = message;

  // Show/hide action button based on status
  if (status === "error" || status === "prompt") {
    bannerAction.style.display = "flex";
    bannerAction.innerHTML =
      '<i class="fas fa-location-arrow"></i>Enable Location';
    bannerAction.onclick = requestLocation;
  } else {
    bannerAction.style.display = "none";
  }
}

// Update location coordinates display
function updateLocationCoords() {
  if (userLocation) {
    // Update the location coordinates display in the form
    document.getElementById("location-coords").innerHTML = `
            <div class="coordinates-display">
                <div class="coordinate-item">
                    <span class="coordinate-label">Latitude:</span>
                    <span class="coordinate-value">${userLocation.lat.toFixed(
                      6
                    )}</span>
                </div>
                <div class="coordinate-item">
                    <span class="coordinate-label">Longitude:</span>
                    <span class="coordinate-value">${userLocation.lng.toFixed(
                      6
                    )}</span>
                </div>
                <div class="coordinate-item">
                    <span class="coordinate-label">Accuracy:</span>
                    <span class="coordinate-value">±${Math.round(
                      userLocation.accuracy
                    )}m</span>
                </div>
                <div class="coordinate-actions">
                    <button type="button" class="copy-coords-btn" onclick="copyCoordinates()">
                        <i class="fas fa-copy"></i>
                        Copy Coordinates
                    </button>
                    <button type="button" class="view-map-btn" onclick="viewOnMap(${
                      userLocation.lat
                    }, ${userLocation.lng})">
                        <i class="fas fa-map-marked-alt"></i>
                        View on Map
                    </button>
                </div>
            </div>
        `;

    // Also update the location text to show coordinates are captured
    const locationText = document.querySelector(
      ".location-success .location-text span"
    );
    if (locationText) {
      locationText.textContent = `Location captured successfully - Coordinates: ${userLocation.lat.toFixed(
        6
      )}, ${userLocation.lng.toFixed(6)}`;
    }
  }
}

// Refresh location periodically to ensure accuracy
function startLocationRefresh() {
  // Refresh location every 5 minutes to ensure accuracy
  setInterval(() => {
    if (userLocation) {
      console.log("Refreshing location for accuracy...");
      requestLocation();
    }
  }, 300000); // 5 minutes
}

// Refresh reports periodically to sync with admin updates
function startReportsRefresh() {
  // Refresh reports every 30 seconds to sync with admin status updates
  setInterval(() => {
    console.log("Refreshing reports to sync with admin updates...");
    // Show a subtle indicator that auto-refresh is happening
    const refreshBtn = document.querySelector(".refresh-btn");
    if (refreshBtn && !refreshBtn.disabled) {
      refreshBtn.style.opacity = "0.6";
      setTimeout(() => {
        if (refreshBtn) {
          refreshBtn.style.opacity = "1";
        }
      }, 1000);
    }
    loadUserReports();
  }, 30000); // 30 seconds
}

// Setup all event listeners
function setupEventListeners() {
  // Try location again button
  document
    .getElementById("try-location")
    .addEventListener("click", requestLocation);

  // Report form submission
  document
    .getElementById("report-form")
    .addEventListener("submit", function (e) {
      requestLocation(); // Force location prompt on submit
      submitReport(e);
    });

  // Report type change
  document.querySelectorAll('input[name="report-type"]').forEach((radio) => {
    radio.addEventListener("change", updateReportTypeUI);
  });

  // File upload
  const uploadArea = document.getElementById("upload-area");
  const fileInput = document.getElementById("image");

  uploadArea.addEventListener("click", () => fileInput.click());
  uploadArea.addEventListener("dragover", handleDragOver);
  uploadArea.addEventListener("drop", handleDrop);
  fileInput.addEventListener("change", handleFileSelect);

  // Report filter
  document
    .getElementById("report-filter")
    .addEventListener("change", filterReports);

  // Cancel button
  document.querySelector(".cancel-btn").addEventListener("click", resetForm);
}

// Update UI based on report type
function updateReportTypeUI() {
  const reportType = document.querySelector(
    'input[name="report-type"]:checked'
  ).value;
  const photoSection = document.getElementById("photo-section");
  const imageInput = document.getElementById("image");

  if (reportType === "photo") {
    photoSection.classList.add("show");
    imageInput.required = true;
  } else {
    photoSection.classList.remove("show");
    imageInput.required = false;
    selectedImages = [];
    updateImagePreview();
  }
}

// Handle drag over
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
}

// Handle drop
function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");

  const files = Array.from(e.dataTransfer.files);
  handleFiles(files);
}

// Handle file select
function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  handleFiles(files);
}

// Handle multiple files
function handleFiles(files) {
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));

  if (imageFiles.length === 0) {
    showMessage("Please select valid image files (JPG, PNG, etc.).", true);
    return;
  }

  if (selectedImages.length + imageFiles.length > 5) {
    showMessage(
      "Maximum 5 images allowed. You can only add " +
        (5 - selectedImages.length) +
        " more images.",
      true
    );
    return;
  }

  let filesAdded = 0;
  let filesRejected = 0;

  imageFiles.forEach((file) => {
    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      showMessage(
        `File "${file.name}" is too large. Maximum size is 10MB.`,
        true
      );
      filesRejected++;
      return;
    }

    // Check if file already exists
    const existingFile = selectedImages.find(
      (img) => img.name === file.name && img.size === file.size
    );
    if (existingFile) {
      showMessage(`File "${file.name}" is already selected.`, true);
      filesRejected++;
      return;
    }

    selectedImages.push(file);
    filesAdded++;
  });

  if (filesAdded > 0) {
    showMessage(`${filesAdded} image(s) added successfully!`, false);
    updateImagePreview();
  }

  if (filesRejected > 0 && filesAdded === 0) {
    showMessage(`${filesRejected} file(s) could not be added.`, true);
  }
}

// Update image preview
function updateImagePreview() {
  const previewContainer = document.getElementById("image-preview");

  if (selectedImages.length === 0) {
    previewContainer.innerHTML = "";
    return;
  }

  previewContainer.innerHTML = selectedImages
    .map(
      (file, index) => `
        <div class="image-preview-item">
            <img src="${URL.createObjectURL(file)}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" onclick="removeImage(${index})">
                <i class="fas fa-times"></i>
            </button>
            <div class="image-info">
                <span class="image-name">${file.name}</span>
                <span class="image-size">${(file.size / 1024 / 1024).toFixed(
                  2
                )} MB</span>
            </div>
        </div>
    `
    )
    .join("");
}

// Remove image from selection
function removeImage(index) {
  selectedImages.splice(index, 1);
  updateImagePreview();
}

// Show success animation with tick mark
function showSuccessAnimation(message, callback) {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "success-overlay";

  // Create success animation container
  const successContainer = document.createElement("div");
  successContainer.className = "success-animation-container";

  successContainer.innerHTML = `
        <button class="success-close-btn" onclick="closeSuccessModal()">
            <i class="fas fa-times"></i>
        </button>
        <div class="success-animation">
            <div class="success-checkmark">
                <div class="check-icon">
                    <span class="icon-line line-tip"></span>
                    <span class="icon-line line-long"></span>
                    <div class="icon-circle"></div>
                    <div class="icon-fix"></div>
                </div>
            </div>
            <div class="success-message">
                <h3>Report Submitted Successfully!</h3>
                <p>${message}</p>
                <div class="success-details">
                    <i class="fas fa-check-circle"></i>
                    <span>Your report has been securely submitted and will be reviewed by our team.</span>
                </div>
            </div>
        </div>
    `;

  overlay.appendChild(successContainer);
  document.body.appendChild(overlay);

  // Trigger animation
  setTimeout(() => {
    overlay.classList.add("show");
    successContainer.classList.add("animate");
  }, 100);

  // Auto redirect after animation (increased time for better UX)
  setTimeout(() => {
    if (callback) callback();
  }, 5000);
}

// Close success modal
function closeSuccessModal() {
  const overlay = document.querySelector(".success-overlay");
  if (overlay) {
    overlay.classList.remove("show");
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

// Submit a new report
async function submitReport(e) {
  e.preventDefault();

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    return;
  }

  const title = document.getElementById("report-title").value;
  const description = document.getElementById("description").value;
  const lat = document.getElementById("lat").value;
  const lng = document.getElementById("lng").value;
  const reportType = document.querySelector(
    'input[name="report-type"]:checked'
  ).value;

  // Validation
  if (!lat || !lng) {
    showMessage("Please enable location access to submit a report.", true);
    return;
  }

  if (reportType === "photo" && selectedImages.length === 0) {
    showMessage(
      "📸 Please select at least one image for photo report. Click the upload area above to add photos.",
      true
    );
    return;
  }

  try {
    // Show loading state with upload progress
    const submitBtn = document.querySelector(".submit-btn");
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> <span>Uploading Report...</span>';
    submitBtn.disabled = true;

    // Create FormData to handle file uploads
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("lat", parseFloat(lat));
    formData.append("lng", parseFloat(lng));
    formData.append("reportType", reportType);

    // Add all selected images
    if (reportType === "photo" && selectedImages.length > 0) {
      selectedImages.forEach((image, index) => {
        formData.append("images", image); // Append all selected images
      });

      // Show which images are being uploaded
      const fileNames = selectedImages.map((img) => img.name).join(", ");
      const totalSize = (
        selectedImages.reduce((sum, img) => sum + img.size, 0) /
        1024 /
        1024
      ).toFixed(2);
      submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Uploading ${selectedImages.length} images (${totalSize}MB)...</span>`;

      showMessage(
        `📸 Uploading ${selectedImages.length} images: ${fileNames}`,
        false
      );
    }

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).catch((error) => {
      console.error("Fetch error:", error);
      throw new Error("Network error: " + error.message);
    });

    const data = await response.json();

    if (response.ok) {
      // Reset form
      resetForm();

      // Show success message based on report type
      const successMessage =
        reportType === "photo"
          ? `📸 Photo report submitted successfully! Your evidence has been uploaded and the report is now under review.`
          : `📝 Text report submitted successfully! Your report is now under review.`;

      // Show success animation and redirect to home page
      showSuccessAnimation(successMessage, () => {
        window.location.href = "/user-dashboard";
      });
    } else {
      // More detailed error messages
      let errorMessage = "Failed to submit report. ";
      if (response.status === 401) {
        errorMessage += "Please log in again.";
        setTimeout(() => (window.location.href = "/login"), 2000);
      } else if (response.status === 413) {
        errorMessage += "File too large. Please select a smaller image.";
      } else if (response.status === 400) {
        errorMessage +=
          data.message || "Please check your input and try again.";
      } else {
        errorMessage += data.message || "Please try again later.";
      }
      showMessage(errorMessage, true);
    }
  } catch (error) {
    console.error("Report submission error:", error);
    let errorMessage = "An error occurred while submitting the report";

    // Provide more specific error messages based on the error type
    if (error.message.includes("Network error")) {
      errorMessage =
        "Network error: Please check your internet connection and try again";
    } else if (error.message.includes("Failed to upload image")) {
      errorMessage = "Image upload failed: " + error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    showMessage(errorMessage, true);
  } finally {
    // Reset button state
    const submitBtn = document.querySelector(".submit-btn");
    submitBtn.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i> <span>Submit Report</span>';
    submitBtn.disabled = false;
  }
}

// Reset form
function resetForm() {
  document.getElementById("report-form").reset();
  selectedImages = [];
  updateImagePreview();
  updateReportTypeUI();

  // Re-detect location
  if (!userLocation) {
    requestLocation();
  }
}

// Load user's reports
async function loadUserReports() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    return Promise.reject("No token");
  }

  try {
    // Add cache control to prevent unnecessary repeated calls
    const response = await fetch("/api/reports", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
      },
    });

    const data = await response.json();

    if (response.ok) {
      const reportsContainer = document.getElementById("reports-container");
      const totalReportsElement = document.getElementById("total-reports");

      // Check for status changes
      if (previousReports.length > 0) {
        checkForStatusChanges(data.reports);
      }

      if (data.reports && data.reports.length > 0) {
        totalReportsElement.textContent = data.reports.length;

        reportsContainer.innerHTML = data.reports
          .map(
            (report) => `
                    <div class="report-card">
                        <div class="report-header">
                            <div class="report-type-badge ${
                              report.reportType === "photo" ? "photo" : "text"
                            }">
                                <i class="fas fa-${
                                  report.reportType === "photo"
                                    ? "camera"
                                    : "file-text"
                                }"></i>
                                <span>${
                                  report.reportType === "photo"
                                    ? "Photo Report"
                                    : "Text Report"
                                }</span>
                            </div>
                            <div class="report-date">
                                ${new Date(
                                  report.createdAt
                                ).toLocaleDateString()}
                            </div>
                        </div>

                        <div class="report-content">
                            <h4 class="report-title">${
                              report.title ||
                              report.description.substring(0, 50) + "..."
                            }</h4>
                            <p class="report-description">${
                              report.description
                            }</p>

                            ${
                              report.location
                                ? `
                                <div class="report-location">
                                    <div class="location-badge">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <span>Lat: ${report.location.lat.toFixed(
                                          6
                                        )}, Lng: ${report.location.lng.toFixed(
                                    6
                                  )}</span>
                                    </div>
                                </div>
                            `
                                : ""
                            }

                            ${
                              report.imageUrl && report.imageUrl.length > 0
                                ? `
                                <div class="report-image">
                                    <img src="${report.imageUrl[0]}" alt="Report evidence" loading="lazy">
                                </div>
                            `
                                : ""
                            }
                        </div>

                        <div class="report-footer">
                            <div class="report-status">
                                <span class="status-badge ${
                                  report.status || "pending"
                                }">
                                    <i class="fas fa-${getStatusIcon(
                                      report.status || "pending"
                                    )}"></i>
                                    ${getStatusText(report.status || "pending")}
                                </span>
                            </div>
                            <div class="report-actions">
                                <button class="action-btn view-btn" onclick="viewReportDetails('${
                                  report._id
                                }')">
                                    <i class="fas fa-eye"></i>
                                    View 
                                </button>
                            </div>
                        </div>
                    </div>
                `
          )
          .join("");
      } else {
        totalReportsElement.textContent = "0";
        reportsContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <h3>No reports found</h3>
                        <p>You haven't submitted any reports yet. Submit your first report using the form above.</p>
                    </div>
                `;
      }

      // Store current reports for next comparison
      previousReports = data.reports || [];

      // Apply current filter after loading reports
      filterReports();
    } else {
      showMessage(data.message || "Failed to load reports", true);
      return Promise.reject(data.message || "Failed to load reports");
    }
  } catch (error) {
    console.error("Error loading reports:", error);
    showMessage("An error occurred while loading reports", true);
    return Promise.reject(error);
  }
}

// Filter reports
function filterReports() {
  const filterValue = document.getElementById("report-filter").value;
  const reportCards = document.querySelectorAll(".report-card");

  reportCards.forEach((card) => {
    let show = true;

    switch (filterValue) {
      case "photo":
        show = card.querySelector(".report-type-badge.photo") !== null;
        break;
      case "text":
        show = card.querySelector(".report-type-badge.text") !== null;
        break;
      case "recent":
        // Show reports from last 7 days
        const dateElement = card.querySelector(".report-date");
        const reportDate = new Date(dateElement.textContent);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        show = reportDate > weekAgo;
        break;
      case "all":
      default:
        show = true;
        break;
    }

    if (show) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

// View report details with modal
async function viewReportDetails(reportId) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    // Show loading state
    showMessage("Loading report details...", false);

    const response = await fetch(`/api/reports/${reportId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      showReportDetailsModal(data.report);
    } else {
      showMessage(data.message || "Failed to load report details", true);
    }
  } catch (error) {
    console.error("Error loading report details:", error);
    showMessage("An error occurred while loading report details", true);
  }
}

// Show report details modal
function showReportDetailsModal(report) {
  // Create modal overlay
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  modalOverlay.id = "report-details-modal";

  // Create modal content with improved UI
  modalOverlay.innerHTML = `
        <div class="modal-content report-details-modal">
            <div class="modal-header">
                <h3><i class="fas fa-file-alt"></i> Report Details</h3>
                <button class="modal-close" onclick="closeReportDetailsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="modal-body">
                <div class="report-details-container">
                    <!-- Report Information Section -->
                    <div class="report-info-section">
                        <div class="info-card">
                            <div class="info-header">
                                <i class="fas fa-info-circle"></i>
                                <span>Report Information</span>
                            </div>
                            <div class="info-content">
                                <div class="info-row">
                                    <div class="info-label">Report Type</div>
                                    <div class="info-value type-badge ${
                                      report.reportType === "photo"
                                        ? "photo"
                                        : "text"
                                    }">
                                        <i class="fas fa-${
                                          report.reportType === "photo"
                                            ? "camera"
                                            : "file-text"
                                        }"></i>
                                        <span>${
                                          report.reportType === "photo"
                                            ? "Photo Report"
                                            : "Text Report"
                                        }</span>
                                    </div>
                                </div>
                                <div class="info-row">
                                    <div class="info-label">Submitted</div>
                                    <div class="info-value">${new Date(
                                      report.createdAt
                                    ).toLocaleString()}</div>
                                </div>
                                <div class="info-row">
                                    <div class="info-label">Status</div>
                                    <div class="info-value">
                                        <span class="status-badge ${
                                          report.status || "pending"
                                        }">
                                            <i class="fas fa-${getStatusIcon(
                                              report.status || "pending"
                                            )}"></i>
                                            ${getStatusText(
                                              report.status || "pending"
                                            ).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Content Section -->
                    <div class="content-section">
                        <div class="content-card">
                            <div class="content-header">
                                <i class="fas fa-align-left"></i>
                                <span>Content</span>
                            </div>
                            <div class="content-body">
                                <div class="content-item">
                                    <div class="content-label">Title</div>
                                    <div class="content-value">${
                                      report.title || "No title provided"
                                    }</div>
                                </div>
                                <div class="content-item">
                                    <div class="content-label">Description</div>
                                    <div class="content-value description-box">${
                                      report.description
                                    }</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Location Section -->
                    ${
                      report.location
                        ? `
                    <div class="location-section">
                        <div class="location-card">
                            <div class="location-header">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Location</span>
                            </div>
                            <div class="location-body">
                                <div class="location-coords">
                                    <div class="coord-item">
                                        <span class="coord-label">Latitude:</span>
                                        <span class="coord-value">${report.location.lat.toFixed(
                                          6
                                        )}</span>
                                    </div>
                                    <div class="coord-item">
                                        <span class="coord-label">Longitude:</span>
                                        <span class="coord-value">${report.location.lng.toFixed(
                                          6
                                        )}</span>
                                    </div>
                                </div>
                                <button class="view-map-btn" onclick="viewOnMap(${
                                  report.location.lat
                                }, ${report.location.lng})">
                                    <i class="fas fa-map-marked-alt"></i>
                                    View on Map
                                </button>
                            </div>
                        </div>
                    </div>
                    `
                        : ""
                    }

                    <!-- Evidence Images Section -->
                    ${
                      report.imageUrl && report.imageUrl.length > 0
                        ? `
                    <div class="evidence-section">
                        <div class="evidence-card">
                            <div class="evidence-header">
                                <i class="fas fa-images"></i>
                                <span>Evidence Images (${
                                  report.imageUrl.length
                                })</span>
                            </div>
                            <div class="evidence-gallery">
                                ${report.imageUrl
                                  .map(
                                    (imageUrl, index) => `
                                    <div class="evidence-item" onclick="openImageModal('${imageUrl}')">
                                        <img src="${imageUrl}" alt="Evidence ${
                                      index + 1
                                    }">
                                        <div class="evidence-overlay">
                                            <i class="fas fa-search-plus"></i>
                                        </div>
                                    </div>
                                `
                                  )
                                  .join("")}
                            </div>
                        </div>
                    </div>
                    `
                        : ""
                    }
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="close-btn" onclick="closeReportDetailsModal()">
                    <i class="fas fa-times"></i>
                    Close
                </button>
            </div>
        </div>
    `;

  // Add to page
  document.body.appendChild(modalOverlay);

  // Show modal with animation
  setTimeout(() => {
    modalOverlay.classList.add("show");
  }, 10);
}

// Close report details modal
function closeReportDetailsModal() {
  const modal = document.getElementById("report-details-modal");
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// View location on map
function viewOnMap(lat, lng) {
  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  window.open(mapUrl, "_blank");
}

// Open image in modal view
function openImageModal(imageUrl) {
  const imageModal = document.createElement("div");
  imageModal.className = "image-modal-overlay";
  imageModal.innerHTML = `
        <div class="image-modal-content">
            <button class="image-modal-close" onclick="closeImageModal()">
                <i class="fas fa-times"></i>
            </button>
            <img src="${imageUrl}" alt="Evidence image">
        </div>
    `;

  document.body.appendChild(imageModal);

  setTimeout(() => {
    imageModal.classList.add("show");
  }, 10);
}

// Close image modal
function closeImageModal() {
  const modal = document.querySelector(".image-modal-overlay");
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Close modal when clicking outside
document.addEventListener("click", function (e) {
  const modal = document.getElementById("report-details-modal");
  if (modal && e.target === modal) {
    closeReportDetailsModal();
  }

  const imageModal = document.querySelector(".image-modal-overlay");
  if (imageModal && e.target === imageModal) {
    closeImageModal();
  }
});

// Close modal with Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeReportDetailsModal();
    closeImageModal();
  }
});

// Show message to user
function showMessage(message, isError = false, duration = 5000) {
  // Create message element
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isError ? "error" : "success"}`;
  messageDiv.innerHTML = `
        <div class="message-content">
            <i class="fas fa-${
              isError ? "exclamation-circle" : "check-circle"
            }"></i>
            <span>${message}</span>
        </div>
        <button class="message-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

  // Add to page
  document.body.appendChild(messageDiv);

  // Remove after specified duration
  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.remove();
    }
  }, duration);
}

// Copy coordinates to clipboard
function copyCoordinates() {
  if (userLocation) {
    const coords = `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(
      6
    )}`;
    navigator.clipboard
      .writeText(coords)
      .then(() => {
        showMessage("Coordinates copied to clipboard!", false);
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = coords;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        showMessage("Coordinates copied to clipboard!", false);
      });
  }
}

// Helper function to get status icon
function getStatusIcon(status) {
  switch (status) {
    case "pending":
      return "clock";
    case "reviewed":
      return "eye";
    case "resolved":
      return "check-circle";
    default:
      return "clock";
  }
}

// Helper function to get status text
function getStatusText(status) {
  switch (status) {
    case "pending":
      return "Pending Review";
    case "reviewed":
      return "Under Review";
    case "resolved":
      return "Resolved";
    default:
      return "Pending Review";
  }
}

// Check for status changes and notify user
function checkForStatusChanges(currentReports) {
  const statusChanges = [];

  currentReports.forEach((currentReport) => {
    const previousReport = previousReports.find(
      (p) => p._id === currentReport._id
    );
    if (previousReport && previousReport.status !== currentReport.status) {
      statusChanges.push({
        reportId: currentReport._id,
        oldStatus: previousReport.status || "pending",
        newStatus: currentReport.status || "pending",
        title:
          currentReport.title ||
          currentReport.description.substring(0, 30) + "...",
      });
    }
  });

  // Show notifications for status changes
  statusChanges.forEach((change) => {
    const statusText = getStatusText(change.newStatus);
    const icon = getStatusIcon(change.newStatus);

    showMessage(
      `📋 Report "${change.title}" status updated to: ${statusText}`,
      false,
      8000 // Show for 8 seconds
    );
  });
}

// Manual refresh function for reports
function refreshReports() {
  const refreshBtn = document.querySelector(".refresh-btn");
  if (refreshBtn) {
    refreshBtn.classList.add("loading");
    refreshBtn.disabled = true;
  }

  loadUserReports().finally(() => {
    if (refreshBtn) {
      refreshBtn.classList.remove("loading");
      refreshBtn.disabled = false;
    }
  });
}

// Global function to remove images (called from onclick)
window.removeImage = removeImage;
window.viewReportDetails = viewReportDetails;
window.copyCoordinates = copyCoordinates;
window.closeSuccessModal = closeSuccessModal;
window.refreshReports = refreshReports;
