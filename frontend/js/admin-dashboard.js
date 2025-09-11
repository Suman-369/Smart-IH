let adminMap;
let reportMarkers = [];
let allReports = [];
let filteredReports = [];
let currentPage = 1;
const reportsPerPage = 10;

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Check if user is logged in and is admin
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user || user.role !== "admin") {
    window.location.href = "/login";
    return;
  }

  // Display admin info
  document.getElementById("admin-info").innerHTML = `
      <div class="user-avatar">
        <i class="fas fa-user-shield"></i>
      </div>
      <div class="user-details">
        <div class="user-name">${user.name}</div>
      </div>
    `;

  // Initialize components
  initializeMap();
  setupEventListeners();
  loadAllReports();

  // Apply sticky layout for reports section (desktop only) without CSS edits
  applyStickyLayout();
  window.addEventListener("resize", applyStickyLayout);

  // Mobile Hamburger Menu Toggle
  const hamburger = document.getElementById("hamburger-menu");
  const mobileNav = document.getElementById("mobile-nav-menu");
  hamburger.addEventListener("click", function () {
    hamburger.classList.toggle("active");
    mobileNav.classList.toggle("active");
  });
  // Close mobile nav on link click
  mobileNav.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", function () {
      hamburger.classList.remove("active");
      mobileNav.classList.remove("active");
    });
  });
});

// Initialize map
function initializeMap() {
  // Default center (India)
  const defaultLat = 20.5937;
  const defaultLng = 78.9629;

  adminMap = L.map("admin-map").setView([defaultLat, defaultLng], 5);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  }).addTo(adminMap);
}

function setupEventListeners() {
  // Logout
  document.getElementById("logout").addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  });

  // Map controls
  document.getElementById("refresh-map").addEventListener("click", refreshMap);
  document.getElementById("center-map").addEventListener("click", centerMap);

  // Filters
  document
    .getElementById("report-status-filter")
    .addEventListener("change", filterReports);
  document
    .getElementById("report-type-filter")
    .addEventListener("change", filterReports);

  // Export
  document
    .getElementById("export-reports")
    .addEventListener("click", exportReports);

  // Modal controls
  const closeModalBtn = document.getElementById("close-modal");
  const modalCancelBtn = document.getElementById("modal-cancel");

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      closeModal();
    });
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener("click", () => {
      closeModal();
    });
  }
  // Assign modal controls
  const assignClose = document.getElementById("assign-close");
  const assignCancel = document.getElementById("assign-cancel");
  const assignForm = document.getElementById("assign-form");

  if (assignClose) assignClose.addEventListener("click", closeAssignModal);
  if (assignCancel) assignCancel.addEventListener("click", closeAssignModal);
  if (assignForm) assignForm.addEventListener("submit", handleAssignSubmit);
  // Status change  section
  document
    .getElementById("mark-pending")
    .addEventListener("click", () => updateReportStatus("pending"));
  document
    .getElementById("mark-reviewed")
    .addEventListener("click", () => updateReportStatus("reviewed"));
  document
    .getElementById("mark-resolved")
    .addEventListener("click", () => updateReportStatus("resolved"));

  document
    .getElementById("report-modal")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        closeModal();
      }
    });
}

// Load all reports for admin
async function loadAllReports() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) {
    showMessage("No authentication token found. Redirecting to login...", true);
    setTimeout(() => (window.location.href = "/login"), 2000);
    return;
  }

  if (user.role !== "admin") {
    showMessage("Access denied. Admin privileges required.", true);
    setTimeout(() => (window.location.href = "/"), 2000);
    return;
  }

  try {
    showLoading();
    const response = await fetch("/api/reports/all", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });

    const data = await response.json();
    if (response.ok) {
      allReports = data.reports || [];
      filteredReports = [...allReports];
      if (allReports.length === 0) {
        showMessage("📊 No reports found ", false);
      } else {
        showMessage(`Total  ${allReports.length} Reports`, false);
      }

      updateStatistics();
      updateMapMarkers();
      renderReports();
    } else {
      let errorMessage = "Failed to load reports. ";
      if (response.status === 403) {
        errorMessage += "Access denied - Admin privileges required.";
        setTimeout(() => (window.location.href = "/"), 2000);
      } else if (response.status === 401) {
        errorMessage += "Authentication failed. Please log in again.";
        setTimeout(() => (window.location.href = "/login"), 2000);
      } else {
        errorMessage += data.message || `Server error (${response.status})`;
      }
      showMessage(errorMessage, true);
    }
  } catch (error) {
    showMessage("An error occurred while loading reports", true);
  } finally {
    hideLoading();
  }
}

// Update statistics
function updateStatistics() {
  const totalReports = allReports.length;
  const pendingReports = allReports.filter(
    (r) => !r.status || r.status === "pending"
  ).length;
  const geolocatedReports = allReports.filter(
    (r) => r.location && r.location.lat && r.location.lng
  ).length;
  const photoReports = allReports.filter(
    (r) => r.imageUrl && r.imageUrl.length > 0
  ).length;

  document.getElementById("total-reports").textContent = totalReports;
  document.getElementById("pending-reports").textContent = pendingReports;
  document.getElementById("geolocated-reports").textContent = geolocatedReports;
  document.getElementById("photo-reports").textContent = photoReports;

  animateNumbers();
}

function animateNumbers() {
  const numbers = document.querySelectorAll(".stat-number");
  numbers.forEach((number) => {
    const target = parseInt(number.textContent);
    let current = 0;
    const increment = target / 30;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      number.textContent = Math.floor(current);
    }, 50);
  });
}

// Mark in the map to in location from where the photo will be uploaded
function updateMapMarkers() {
  reportMarkers.forEach((marker) => adminMap.removeLayer(marker));
  reportMarkers = [];

  // Add new markers
  allReports.forEach((report) => {
    if (report.location && report.location.lat && report.location.lng) {
      const marker = createReportMarker(report);
      marker.addTo(adminMap);
      reportMarkers.push(marker);
    }
  });

  // Fit map to show all markers if we have any
  if (reportMarkers.length > 0) {
    const group = new L.featureGroup(reportMarkers);
    adminMap.fitBounds(group.getBounds().pad(0.1));
  }
}

// Create a mark for a report
function createReportMarker(report) {
  const isRecent =
    new Date(report.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
  const hasPhoto = report.imageUrl && report.imageUrl.length > 0;

  let markerColor = "#00ff88"; 
  if (isRecent) markerColor = "#ff6b6b"; 
  else if (hasPhoto) markerColor = "#3498db"; 

  const markerIcon = L.divIcon({
    className: "custom-marker",
    html: `
            <div class="marker-pin" style="background-color: ${markerColor}">
                <i class="fas fa-${
                  hasPhoto ? "camera" : "exclamation-triangle"
                }"></i>
            </div>
        `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

  const marker = L.marker([report.location.lat, report.location.lng], {
    icon: markerIcon,
  });

  // Add popup with report info
  const popupContent = `
        <div class="marker-popup">
            <h4>${
              report.title || report.description.substring(0, 50) + "..."
            }</h4>
            <p><strong>User:</strong> ${
              report.user ? report.user.name : "Unknown"
            }</p>
            <p><strong>Date:</strong> ${new Date(
              report.createdAt
            ).toLocaleDateString()}</p>
            <p><strong>Type:</strong> ${
              hasPhoto ? "Photo Report" : "Text Report"
            }</p>
            ${
              report.location
                ? `<p><strong>Coordinates:</strong><br>Lat: ${report.location.lat.toFixed(
                    6
                  )}<br>Lng: ${report.location.lng.toFixed(6)}</p>`
                : ""
            }
            <button class="popup-btn" onclick="viewReportDetails('${
              report._id
            }')">
                <i class="fas fa-eye"></i> View Details
            </button>
        </div>
    `;

  marker.bindPopup(popupContent);

  return marker;
}

// Filter reports based on selected criteria
function filterReports() {
  const statusFilter = document.getElementById("report-status-filter").value;
  const typeFilter = document.getElementById("report-type-filter").value;

  filteredReports = allReports.filter((report) => {
    let statusMatch = true;
    let typeMatch = true;

    // Status filter
    if (statusFilter !== "all") {
      const reportStatus = report.status || "pending";
      statusMatch = reportStatus === statusFilter;
    }

    // Type filter
    if (typeFilter !== "all") {
      switch (typeFilter) {
        case "photo":
          typeMatch = !!(report.imageUrl && report.imageUrl.length > 0);
          break;
        case "text":
          typeMatch = !(report.imageUrl && report.imageUrl.length > 0);
          break;
        case "located":
          typeMatch = !!(
            report.location &&
            report.location.lat &&
            report.location.lng
          );
          break;
      }
    }

    return statusMatch && typeMatch;
  });

  currentPage = 1;
  renderReports();
}

// Render reports list
function renderReports() {
  const container = document.getElementById("reports-container");
  const startIndex = (currentPage - 1) * reportsPerPage;
  const endIndex = startIndex + reportsPerPage;
  const pageReports = filteredReports.slice(startIndex, endIndex);

  if (pageReports.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>No reports found</h3>
                <p>No reports match your current filter criteria.</p>
            </div>
        `;
    return;
  }

  container.innerHTML = pageReports
    .map(
      (report) => `
        <div class="admin-report-card" data-report-id="${report._id}">
            <div class="report-card-header">
                <div class="report-meta-info">
                    <div class="report-id">#${report._id.substring(0, 8)}</div>
                    <div class="report-timestamp">${new Date(
                      report.createdAt
                    ).toLocaleString()}</div>
                </div>
                <div class="report-badges">
                                         <span class="badge ${
                                           report.imageUrl &&
                                           report.imageUrl.length > 0
                                             ? "photo"
                                             : "text"
                                         }">
                         <i class="fas fa-${
                           report.imageUrl && report.imageUrl.length > 0
                             ? "camera"
                             : "file-text"
                         }"></i>
                         ${
                           report.imageUrl && report.imageUrl.length > 0
                             ? "Photo"
                             : "Text"
                         }
                     </span>
                    ${
                      report.location
                        ? '<span class="badge location"><i class="fas fa-map-marker-alt"></i> Located</span>'
                        : ""
                    }
                    <span class="badge status ${report.status || "pending"}">
                        ${
                          (report.status || "pending").charAt(0).toUpperCase() +
                          (report.status || "pending").slice(1)
                        }
                    </span>
                </div>
            </div>
            
            <div class="report-card-content">
                <h4 class="report-title">${
                  report.title || report.description.substring(0, 60) + "..."
                }</h4>
                <p class="report-description">${report.description}</p>
                
                <div class="user-info-card">
                    <div class="user-avatar-small">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details-small">
                        <div class="user-name">${
                          report.user ? report.user.name : "Unknown User"
                        }</div>
                        <div class="user-email">${
                          report.user ? report.user.email : "No email"
                        }</div>
                    </div>
                </div>
                
                ${
                  report.location
                    ? `
                    <div class="location-info">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Lat: ${report.location.lat.toFixed(
                          6
                        )}, Lng: ${report.location.lng.toFixed(6)}</span>
                        <button class="location-btn" onclick="centerMapOnReport('${
                          report._id
                        }')">
                            <i class="fas fa-crosshairs"></i>
                        </button>
                    </div>
                `
                    : ""
                }
                
                                 ${
                                   report.imageUrl && report.imageUrl.length > 0
                                     ? `
                     <div class="report-image-preview">
                         <img src="${report.imageUrl[0]}" alt="Report evidence" loading="lazy">
                     </div>
                 `
                                     : ""
                                 }
            </div>
            
            <div class="report-card-actions">
                ${
                  report.location
                    ? `<button class="action-btn view" onclick="viewOnMap(${report.location.lat}, ${report.location.lng})">
                    <i class="fas fa-map-marked-alt"></i>
                    View Location
                </button>`
                    : `<button class="action-btn view" onclick="viewReportDetails('${report._id}')">
                    <i class="fas fa-eye"></i>
                    View Details
                </button>`
                }
                <button class="action-btn edit" onclick="openAssignModal('${
                  report._id
                }')">
                    <i class="fas fa-tasks"></i>
                    Assign Task
                </button>
                ${
                  report.location
                    ? `
                    <button class="action-btn map" onclick="centerMapOnReport('${report._id}')">
                        <i class="fas fa-map"></i>
                        Show on Map
                    </button>
                `
                    : ""
                }
            </div>

        </div>
    `
    )
    .join("");

  renderPagination();

  // Lightweight, efficient sequential reveal animation
  animateReportList();
}

// Render pagination
function renderPagination() {
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
  const pagination = document.getElementById("pagination");

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let paginationHTML = '<div class="pagination-controls">';

  // Previous button
  if (currentPage > 1) {
    paginationHTML += `<button class="page-btn" onclick="changePage(${
      currentPage - 1
    })"><i class="fas fa-chevron-left"></i></button>`;
  }

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      paginationHTML += `<button class="page-btn active">${i}</button>`;
    } else if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      paginationHTML += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      paginationHTML += `<span class="page-ellipsis">...</span>`;
    }
  }

  // Next button
  if (currentPage < totalPages) {
    paginationHTML += `<button class="page-btn" onclick="changePage(${
      currentPage + 1
    })"><i class="fas fa-chevron-right"></i></button>`;
  }

  paginationHTML += "</div>";
  paginationHTML += `<div class="pagination-info">Showing ${
    (currentPage - 1) * reportsPerPage + 1
  }-${Math.min(currentPage * reportsPerPage, filteredReports.length)} of ${
    filteredReports.length
  } reports</div>`;

  pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
  currentPage = page;
  renderReports();
}

// Center map on specific report
function centerMapOnReport(reportId) {
  const report = allReports.find((r) => r._id === reportId);
  if (report && report.location) {
    adminMap.setView([report.location.lat, report.location.lng], 15);

    // Find and open the marker popup
    const marker = reportMarkers.find((m) => {
      const markerLatLng = m.getLatLng();
      return (
        Math.abs(markerLatLng.lat - report.location.lat) < 0.0001 &&
        Math.abs(markerLatLng.lng - report.location.lng) < 0.0001
      );
    });

    if (marker) {
      marker.openPopup();
    }
  }
}

// View report details in modal
function viewReportDetails(reportId) {
  const report = allReports.find((r) => r._id === reportId);
  if (!report) {
    showMessage("Report not found", true);
    return;
  }

  const modalBody = document.getElementById("modal-body");
  if (!modalBody) {
    showMessage("Modal error", true);
    return;
  }
  // Create a simple test content first
  modalBody.innerHTML = `
    <div class="report-details">
      <div class="detail-section">
        <h4>Report Information</h4>
        <p><strong>Report ID:</strong> ${report._id}</p>
        <p><strong>Type:</strong> ${
          report.imageUrl && report.imageUrl.length > 0
            ? "Photo Report"
            : "Text Report"
        }</p>
        <p><strong>Status:</strong> <span class="status-badge ${
          report.status || "pending"
        }">${
    (report.status || "pending").charAt(0).toUpperCase() +
    (report.status || "pending").slice(1)
  }</span></p>
        <p><strong>Submitted:</strong> ${new Date(
          report.createdAt
        ).toLocaleString()}</p>
      </div>
      
      <div class="detail-section">
        <h4>User Information</h4>
        <p><strong>Name:</strong> ${
          report.user ? report.user.name : "Unknown"
        }</p>
        <p><strong>Email:</strong> ${
          report.user ? report.user.email : "Unknown"
        }</p>
      </div>
      
      <div class="detail-section">
        <h4>Report Content</h4>
        ${report.title ? `<h5>${report.title}</h5>` : ""}
        <p>${report.description}</p>
      </div>
      
      ${
        report.location
          ? `
        <div class="detail-section">
          <h4>Location Information</h4>
          <p><strong>Coordinates:</strong> ${report.location.lat.toFixed(
            6
          )}, ${report.location.lng.toFixed(6)}</p>
          <button class="btn secondary" onclick="centerMapOnReport('${
            report._id
          }'); closeModal();">
            <i class="fas fa-map"></i> Show on Map
          </button>
        </div>
      `
          : ""
      }
      
      ${
        report.imageUrl && report.imageUrl.length > 0
          ? `
        <div class="detail-section">
          <h4>Photo Evidence</h4>
          ${
            report.imageUrl.length > 1
              ? `
              <div class="image-carousel" style="position: relative; max-width: 100%; margin: 0 auto;">
                <div class="carousel-container" style="position: relative; overflow: hidden; border-radius: 8px;">
                  <img id="current-image" src="${report.imageUrl[0]}" alt="Report evidence" style="max-width: 100%; display: block; border-radius: 8px;">
                </div>
                <div class="carousel-controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                  <button id="prev-btn" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">&larr; Prev</button>
                  <span id="image-counter" style="font-weight: bold; color: #333;">1 of ${report.imageUrl.length}</span>
                  <button id="next-btn" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">Next &rarr;</button>
                </div>
              </div>
              `
              : `
              <div class="image-detail">
                <img src="${report.imageUrl[0]}" alt="Report evidence" style="max-width: 100%; border-radius: 8px;">
              </div>
              `
          }
        </div>
      `
          : ""
      }
    </div>
  `;

  // Set up image carousel if multiple images exist
  if (report.imageUrl && report.imageUrl.length > 1) {
    setupImageCarousel(report.imageUrl);
  }

  // Store current report ID for status updates
  document.getElementById("report-modal").dataset.reportId = reportId;

  // Show modal using proper CSS classes
  const modal = document.getElementById("report-modal");
  modal.classList.add("show");
}

// Close modal
function closeModal() {
  const modal = document.getElementById("report-modal");
  modal.classList.remove("show");
}

// Set up image carousel for multiple images
function setupImageCarousel(imageUrls) {
  let currentIndex = 0;
  const currentImage = document.getElementById("current-image");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const counter = document.getElementById("image-counter");

  if (!currentImage || !prevBtn || !nextBtn || !counter) return;

  function updateImage() {
    currentImage.src = imageUrls[currentIndex];
    counter.textContent = `${currentIndex + 1} of ${imageUrls.length}`;
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + imageUrls.length) % imageUrls.length;
    updateImage();
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % imageUrls.length;
    updateImage();
  }

  prevBtn.addEventListener("click", showPrev);
  nextBtn.addEventListener("click", showNext);

  // Initialize
  updateImage();
}

// Update report status
async function updateReportStatus(newStatus) {
  const reportId = document.getElementById("report-modal").dataset.reportId;
  if (!reportId) return;

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/reports/${reportId}/status`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await response.json();

    if (response.ok) {
      // Update the local data
      const reportIndex = allReports.findIndex((r) => r._id === reportId);
      if (reportIndex !== -1) {
        allReports[reportIndex].status = newStatus;
      }

      showMessage(`Report status updated to ${newStatus}`, false);
      closeModal();
      filterReports();
      updateStatistics();
    } else {
      showMessage(data.message || "Failed to update report status", true);
    }
  } catch (error) {
    showMessage("Failed to update report status", true);
  }
}

// Quick status update
async function quickStatusUpdate(reportId) {
  const report = allReports.find((r) => r._id === reportId);
  if (!report) return;

  const currentStatus = report.status || "pending";
  const statuses = ["pending", "reviewed", "resolved"];
  const currentIndex = statuses.indexOf(currentStatus);
  const nextStatus = statuses[(currentIndex + 1) % statuses.length];

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/reports/${reportId}/status`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: nextStatus }),
    });

    const data = await response.json();

    if (response.ok) {
      // Update the local data
      const reportIndex = allReports.findIndex((r) => r._id === reportId);
      if (reportIndex !== -1) {
        allReports[reportIndex].status = nextStatus;
      }
      showMessage(`Report status changed to ${nextStatus}`, false);
      filterReports();
      updateStatistics();
    } else {
      showMessage(data.message || "Failed to update report status", true);
    }
  } catch (error) {
    showMessage("Failed to update report status", true);
  }
}

// Refresh map
function refreshMap() {
  updateMapMarkers();
  showMessage("Map refreshed", false);
}

// Center map
function centerMap() {
  if (reportMarkers.length > 0) {
    const group = new L.featureGroup(reportMarkers);
    adminMap.fitBounds(group.getBounds().pad(0.1));
  } else {
    // Default center
    adminMap.setView([20.5937, 78.9629], 5);
  }
}

// Export reports on Excel
function exportReports() {
  if (filteredReports.length === 0) {
    showMessage("No reports to export", true);
    return;
  }

  // Create CSV  Excel Export
  const headers = [
    "ID",
    "Title",
    "Description",
    "User Name",
    "User Email",
    "Status",
    "Type",
    "Latitude",
    "Longitude",
    "Created Date",
  ];
  const csvContent = [
    headers.join(","),
    ...filteredReports.map((report) =>
      [
        report._id,
        `"${(report.title || "").replace(/"/g, '""')}"`,
        `"${report.description.replace(/"/g, '""')}"`,
        `"${report.user ? report.user.name : "Unknown"}"`,
        `"${report.user ? report.user.email : "Unknown"}"`,
        report.status || "pending",
        report.imageUrl && report.imageUrl.length > 0 ? "Photo" : "Text",
        report.location ? report.location.lat : "",
        report.location ? report.location.lng : "",
        new Date(report.createdAt).toISOString(),
      ].join(",")
    ),
  ].join("\n");

  // Download CSV
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `reports_${new Date().toISOString().slice(0, 10)}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showMessage("Reports exported successfully", false);
}

// Show loading state
function showLoading() {
  const container = document.getElementById("reports-container");
  container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <p>Loading reports...</p>
        </div>
    `;
}

// Hide loading state
function hideLoading() {
  // Loading will be replaced by actual content
}

// Show message to user
function showMessage(message, isError = false) {
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
  document.body.appendChild(messageDiv);

  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.remove();
    }
  }, 3000);
}

// Global functions for onclick handlers
window.viewReportDetails = viewReportDetails;
window.centerMapOnReport = centerMapOnReport;
// window.quickStatusUpdate removed in favor of assignment flow
window.changePage = changePage;
window.viewOnMap = function (lat, lng) {
  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  window.open(mapUrl, "_blank");
};

async function handleAssignSubmit(event) {
  event.preventDefault();
  const modal = document.getElementById("assign-modal");
  const form = event.target;
  const reportId = modal.dataset.reportId;

  if (!reportId) {
    alert("Report ID missing. Cannot assign task.");
    return;
  }

  const assignedDrone = form.assignedDrone.value;
  const priority = form.priority.value;
  const deadline = form.deadline.value;
  const assignmentNotes = form.assignmentNotes.value;

  if (!assignedDrone) {
    alert("Please select a drone.");
    return;
  }

  // Prepare payload
  const payload = {
    assignedDrone,
    priority,
    deadline: deadline || null,
    assignmentNotes,
  };

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/reports/${reportId}/assign`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(`Task assigned successfully to ${assignedDrone}`, false);
      showCelebration();
      closeAssignModal();
      // Reload reports to reflect changes
      loadAllReports();
    } else {
      showMessage(data.message || "Failed to assign task", true);
    }
  } catch (error) {
    alert("Error assigning task: " + error.message);
  }
}

// Assignment modal handlers
function openAssignModal(reportId) {
  const modal = document.getElementById("assign-modal");
  const form = document.getElementById("assign-form");
  if (!modal || !form) return;

  // Reset form
  form.reset();

  // Set minimum date for deadline (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  document.getElementById("deadline").min = minDate;

  // Store report ID
  modal.dataset.reportId = reportId;

  // Show modal
  modal.classList.add("show");

  // Focus on drone select
  document.getElementById("assignedDrone").focus();
}

function closeAssignModal() {
  const modal = document.getElementById("assign-modal");
  if (modal) modal.classList.remove("show");
}

window.openAssignModal = openAssignModal;
window.closeAssignModal = closeAssignModal;

// Selection handlers within modal
window.selectDrone = function (reportId, droneName, index) {
  const modal = document.getElementById("assign-modal");
  if (!modal) return;
  modal.dataset.selectedDrone = droneName;
  document
    .querySelectorAll("#assign-body .drone-card")
    .forEach((el) => el.classList.remove("selected"));
  const card = document.getElementById(`drone-card-${index}`);
  if (card) card.classList.add("selected");
  const bar = document.getElementById("assign-confirm");
  const selectedText = document.getElementById("assign-selected");
  if (bar && selectedText) {
    selectedText.textContent = `Selected: ${droneName}`;
    bar.style.display = "flex";
  }
};

window.cancelAssign = function () {
  // Remove any legacy selection UI
  const bar = document.getElementById("assign-confirm");
  if (bar) bar.style.display = "none";
  document
    .querySelectorAll("#assign-body .drone-card")
    .forEach((el) => el.classList.remove("selected"));
  const modal = document.getElementById("assign-modal");
  if (modal) delete modal.dataset.selectedDrone;
};

window.confirmAssign = function () {
  const modal = document.getElementById("assign-modal");
  if (!modal || !modal.dataset.selectedDrone || !modal.dataset.reportId) return;
  const droneName = modal.dataset.selectedDrone;
  const reportId = modal.dataset.reportId;
  startAssignFlight(reportId, droneName);
};

window.startAssignFlight = function (reportId, droneName) {
  const sky = document.getElementById("assign-sky");
  const drone = document.getElementById("assign-drone");
  const pulse = document.getElementById("assign-pulse");
  if (!sky || !drone || !pulse) return;
  sky.style.display = "block";

  const width = sky.clientWidth + 160;

  const keyframes = [
    { transform: "translate(-80px, -50%) rotate(-5deg)" },
    { transform: `translate(${width * 0.35}px, -60%) rotate(2deg)` },
    { transform: `translate(${width * 0.65}px, -40%) rotate(-3deg)` },
    { transform: `translate(${width}px, -50%) rotate(0deg)` },
  ];

  const anim = drone.animate(keyframes, {
    duration: 1500,
    easing: "ease-in-out",
  });

  pulse.animate(
    [
      { opacity: 0, transform: "translate(-50%, -50%) scale(0.6)" },
      { opacity: 1, transform: "translate(-50%, -50%) scale(1.6)" },
      { opacity: 0, transform: "translate(-50%, -50%) scale(2.4)" },
    ],
    { duration: 900, easing: "ease-out" }
  );

  anim.onfinish = () => {
    closeAssignModal();
    showMessage(`Task assigned successfully to ${droneName}`, false);
    showCelebration();
  };
};

function showCelebration() {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.pointerEvents = "none";
  container.style.zIndex = "9999";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.backgroundColor = "rgba(0,0,0,0.5)";
  document.body.appendChild(container);

  // Add text
  const text = document.createElement("div");
  text.textContent = "✅ Assignment Successful!";
  text.style.fontSize = "2rem";
  text.style.color = "white";
  text.style.fontWeight = "bold";
  text.style.textAlign = "center";
  text.style.animation = "fadeIn 0.5s ease-out";
  container.appendChild(text);

  const emojis = ["🎉", "✨", "🎊", "⭐", "𖥂🎮"];
  const count = 20;
  for (let i = 0; i < count; i++) {
    const span = document.createElement("span");
    span.textContent = emojis[i % emojis.length];
    span.style.position = "absolute";
    span.style.left = Math.random() * 100 + "%";
    span.style.top = Math.random() * 100 + "%";
    span.style.fontSize = 16 + Math.random() * 18 + "px";
    container.appendChild(span);
    const x = (Math.random() - 0.5) * 200;
    const y = -200 - Math.random() * 150;
    const rotate = (Math.random() - 0.5) * 120;
    span.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)`,
          opacity: 0,
        },
      ],
      { duration: 1200 + Math.random() * 600, easing: "ease-out" }
    );
  }

  // Add CSS for fadeIn
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  setTimeout(() => {
    container.remove();
    style.remove();
  }, 2000);
}

// Make reports section sticky via JS so it stays under the nav (desktop only)
function applyStickyLayout() {
  const reportsSection = document.querySelector(".reports-section");
  const reportsContainer = document.querySelector(
    ".reports-section .reports-container"
  );
  if (!reportsSection || !reportsContainer) return;

  if (window.innerWidth >= 1024) {
    reportsSection.style.position = "sticky";
    reportsSection.style.top = "96px"; // header (~80px) + spacing
    reportsSection.style.maxHeight = `calc(100vh - 96px - 16px)`;
    if (!reportsSection.style.display) reportsSection.style.display = "flex";
    if (!reportsSection.style.flexDirection)
      reportsSection.style.flexDirection = "column";
    if (!reportsContainer.style.overflow)
      reportsContainer.style.overflow = "auto";
  } else {
    reportsSection.style.position = "";
    reportsSection.style.top = "";
    reportsSection.style.maxHeight = "";
    reportsSection.style.display = "";
    reportsSection.style.flexDirection = "";
    reportsContainer.style.overflow = "";
  }
}

// Efficient one-by-one reveal using inline CSS transitions (no scroll listeners)
function animateReportList() {
  const cards = document.querySelectorAll(".admin-report-card");
  if (!cards.length) return;

  const baseDelayMs = 70;
  cards.forEach((card) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(10px)";
    card.style.transition = "opacity 260ms ease, transform 260ms ease";
  });

  // Staggered reveal
  cards.forEach((card, idx) => {
    const delay = Math.min(idx * baseDelayMs, 700);
    setTimeout(() => {
      if (!card.isConnected) return;
      requestAnimationFrame(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      });
    }, delay);
  });
}
