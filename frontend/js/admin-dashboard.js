let adminMap;
let reportMarkers = [];
let allReports = [];
let filteredReports = [];
let currentPage = 1;
const reportsPerPage = 10;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user || user.role !== 'admin') {
        window.location.href = '/login';
        return;
    }
    
    // Display admin info
    document.getElementById('admin-info').innerHTML = `
        <div class="user-avatar">
            <i class="fas fa-user-shield"></i>
        </div>
        <div class="user-details">
            <div class="user-name">${user.name}</div>
            <div class="user-role">Administrator</div>
        </div>
    `;
    
    // Initialize components
    initializeMap();
    setupEventListeners();
    loadAllReports();
});

// Initialize map
function initializeMap() {
    // Default center (India)
    const defaultLat = 20.5937;
    const defaultLng = 78.9629;
    
    adminMap = L.map('admin-map').setView([defaultLat, defaultLng], 5);
    
    // Add dark theme tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(adminMap);
}

// Setup event listeners
function setupEventListeners() {
    // Logout functionality
    document.getElementById('logout').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
    
    // Map controls
    document.getElementById('refresh-map').addEventListener('click', refreshMap);
    document.getElementById('center-map').addEventListener('click', centerMap);
    
    // Filters
    document.getElementById('report-status-filter').addEventListener('change', filterReports);
    document.getElementById('report-type-filter').addEventListener('change', filterReports);
    
    // Export
    document.getElementById('export-reports').addEventListener('click', exportReports);
    
    // Modal controls
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    
    // Status change buttons
    document.getElementById('mark-pending').addEventListener('click', () => updateReportStatus('pending'));
    document.getElementById('mark-reviewed').addEventListener('click', () => updateReportStatus('reviewed'));
    document.getElementById('mark-resolved').addEventListener('click', () => updateReportStatus('resolved'));
    
    // Close modal on outside click
    document.getElementById('report-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

// Load all reports for admin
async function loadAllReports() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        showMessage('No authentication token found. Redirecting to login...', true);
        setTimeout(() => window.location.href = '/login', 2000);
        return;
    }

    if (user.role !== 'admin') {
        showMessage('Access denied. Admin privileges required.', true);
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }

    try {
        showLoading();
        console.log('Fetching reports for admin:', user.name);

        const response = await fetch('/api/reports/all', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            allReports = data.reports || [];
            filteredReports = [...allReports];

            console.log(`Loaded ${allReports.length} reports`);

            if (allReports.length === 0) {
                showMessage('📊 No reports found in the database yet. Reports will appear here as users submit them.', false);
            } else {
                showMessage(`✅ Successfully loaded ${allReports.length} reports from database.`, false);
            }

            updateStatistics();
            updateMapMarkers();
            renderReports();

        } else {
            let errorMessage = 'Failed to load reports. ';
            if (response.status === 403) {
                errorMessage += 'Access denied - Admin privileges required.';
                setTimeout(() => window.location.href = '/', 2000);
            } else if (response.status === 401) {
                errorMessage += 'Authentication failed. Please log in again.';
                setTimeout(() => window.location.href = '/login', 2000);
            } else {
                errorMessage += data.message || `Server error (${response.status})`;
            }
            showMessage(errorMessage, true);
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        showMessage('An error occurred while loading reports', true);
    } finally {
        hideLoading();
    }
}

// Update statistics
function updateStatistics() {
    const totalReports = allReports.length;
    const pendingReports = allReports.filter(r => !r.status || r.status === 'pending').length;
    const geolocatedReports = allReports.filter(r => r.location && r.location.lat && r.location.lng).length;
    const photoReports = allReports.filter(r => r.imageUrl).length;
    
    document.getElementById('total-reports').textContent = totalReports;
    document.getElementById('pending-reports').textContent = pendingReports;
    document.getElementById('geolocated-reports').textContent = geolocatedReports;
    document.getElementById('photo-reports').textContent = photoReports;
    
    // Animate numbers
    animateNumbers();
}

// Animate statistics numbers
function animateNumbers() {
    const numbers = document.querySelectorAll('.stat-number');
    numbers.forEach(number => {
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

// Update map markers
function updateMapMarkers() {
    // Clear existing markers
    reportMarkers.forEach(marker => adminMap.removeLayer(marker));
    reportMarkers = [];
    
    // Add new markers
    allReports.forEach(report => {
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

// Create a marker for a report
function createReportMarker(report) {
    const isRecent = new Date(report.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hasPhoto = report.imageUrl;
    
    let markerColor = '#00ff88'; // Default green
    if (isRecent) markerColor = '#ff6b6b'; // Red for recent
    else if (hasPhoto) markerColor = '#3498db'; // Blue for photo reports
    
    const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `
            <div class="marker-pin" style="background-color: ${markerColor}">
                <i class="fas fa-${hasPhoto ? 'camera' : 'exclamation-triangle'}"></i>
            </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
    
    const marker = L.marker([report.location.lat, report.location.lng], { icon: markerIcon });
    
    // Add popup with report info
    const popupContent = `
        <div class="marker-popup">
            <h4>${report.title || report.description.substring(0, 50) + '...'}</h4>
            <p><strong>User:</strong> ${report.user ? report.user.name : 'Unknown'}</p>
            <p><strong>Date:</strong> ${new Date(report.createdAt).toLocaleDateString()}</p>
            <p><strong>Type:</strong> ${hasPhoto ? 'Photo Report' : 'Text Report'}</p>
            ${report.location ? `<p><strong>Coordinates:</strong><br>Lat: ${report.location.lat.toFixed(6)}<br>Lng: ${report.location.lng.toFixed(6)}</p>` : ''}
            <button class="popup-btn" onclick="viewReportDetails('${report._id}')">
                <i class="fas fa-eye"></i> View Details
            </button>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    
    return marker;
}

// Filter reports based on selected criteria
function filterReports() {
    const statusFilter = document.getElementById('report-status-filter').value;
    const typeFilter = document.getElementById('report-type-filter').value;
    
    filteredReports = allReports.filter(report => {
        let statusMatch = true;
        let typeMatch = true;
        
        // Status filter
        if (statusFilter !== 'all') {
            const reportStatus = report.status || 'pending';
            statusMatch = reportStatus === statusFilter;
        }
        
        // Type filter
        if (typeFilter !== 'all') {
            switch (typeFilter) {
                case 'photo':
                    typeMatch = !!report.imageUrl;
                    break;
                case 'text':
                    typeMatch = !report.imageUrl;
                    break;
                case 'located':
                    typeMatch = !!(report.location && report.location.lat && report.location.lng);
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
    const container = document.getElementById('reports-container');
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
    
    container.innerHTML = pageReports.map(report => `
        <div class="admin-report-card" data-report-id="${report._id}">
            <div class="report-card-header">
                <div class="report-meta-info">
                    <div class="report-id">#${report._id.substring(0, 8)}</div>
                    <div class="report-timestamp">${new Date(report.createdAt).toLocaleString()}</div>
                </div>
                <div class="report-badges">
                    <span class="badge ${report.imageUrl ? 'photo' : 'text'}">
                        <i class="fas fa-${report.imageUrl ? 'camera' : 'file-text'}"></i>
                        ${report.imageUrl ? 'Photo' : 'Text'}
                    </span>
                    ${report.location ? '<span class="badge location"><i class="fas fa-map-marker-alt"></i> Located</span>' : ''}
                    <span class="badge status ${report.status || 'pending'}">
                        ${(report.status || 'pending').charAt(0).toUpperCase() + (report.status || 'pending').slice(1)}
                    </span>
                </div>
            </div>
            
            <div class="report-card-content">
                <h4 class="report-title">${report.title || report.description.substring(0, 60) + '...'}</h4>
                <p class="report-description">${report.description}</p>
                
                <div class="user-info-card">
                    <div class="user-avatar-small">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details-small">
                        <div class="user-name">${report.user ? report.user.name : 'Unknown User'}</div>
                        <div class="user-email">${report.user ? report.user.email : 'No email'}</div>
                    </div>
                </div>
                
                ${report.location ? `
                    <div class="location-info">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Lat: ${report.location.lat.toFixed(6)}, Lng: ${report.location.lng.toFixed(6)}</span>
                        <button class="location-btn" onclick="centerMapOnReport('${report._id}')">
                            <i class="fas fa-crosshairs"></i>
                        </button>
                    </div>
                ` : ''}
                
                ${report.imageUrl ? `
                    <div class="report-image-preview">
                        <img src="${report.imageUrl}" alt="Report evidence" loading="lazy">
                    </div>
                ` : ''}
            </div>
            
            <div class="report-card-actions">
                <button class="action-btn view" onclick="viewReportDetails('${report._id}')">
                    <i class="fas fa-eye"></i>
                    View Details
                </button>
                <button class="action-btn edit" onclick="quickStatusUpdate('${report._id}')">
                    <i class="fas fa-edit"></i>
                    Update Status
                </button>
                ${report.location ? `
                    <button class="action-btn map" onclick="centerMapOnReport('${report._id}')">
                        <i class="fas fa-map"></i>
                        Show on Map
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    renderPagination();
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination-controls">';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHTML += `<button class="page-btn active">${i}</button>`;
        } else if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="changePage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
    }
    
    paginationHTML += '</div>';
    paginationHTML += `<div class="pagination-info">Showing ${((currentPage - 1) * reportsPerPage) + 1}-${Math.min(currentPage * reportsPerPage, filteredReports.length)} of ${filteredReports.length} reports</div>`;
    
    pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    currentPage = page;
    renderReports();
}

// Center map on specific report
function centerMapOnReport(reportId) {
    const report = allReports.find(r => r._id === reportId);
    if (report && report.location) {
        adminMap.setView([report.location.lat, report.location.lng], 15);
        
        // Find and open the marker popup
        const marker = reportMarkers.find(m => {
            const markerLatLng = m.getLatLng();
            return Math.abs(markerLatLng.lat - report.location.lat) < 0.0001 && 
                   Math.abs(markerLatLng.lng - report.location.lng) < 0.0001;
        });
        
        if (marker) {
            marker.openPopup();
        }
    }
}

// View report details in modal
function viewReportDetails(reportId) {
    const report = allReports.find(r => r._id === reportId);
    if (!report) return;
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="report-details">
            <div class="detail-section">
                <h4>Report Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Report ID:</label>
                        <span>${report._id}</span>
                    </div>
                    <div class="detail-item">
                        <label>Type:</label>
                        <span>${report.imageUrl ? 'Photo Report' : 'Text Report'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-badge ${report.status || 'pending'}">${(report.status || 'pending').charAt(0).toUpperCase() + (report.status || 'pending').slice(1)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Submitted:</label>
                        <span>${new Date(report.createdAt).toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>User Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Name:</label>
                        <span>${report.user ? report.user.name : 'Unknown'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${report.user ? report.user.email : 'Unknown'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Report Content</h4>
                <div class="report-content-detail">
                    ${report.title ? `<h5>${report.title}</h5>` : ''}
                    <p>${report.description}</p>
                </div>
            </div>
            
            ${report.location ? `
                <div class="detail-section">
                    <h4>Location Information</h4>
                    <div class="location-detail">
                        <p><strong>Coordinates:</strong> ${report.location.lat.toFixed(6)}, ${report.location.lng.toFixed(6)}</p>
                        <button class="btn secondary" onclick="centerMapOnReport('${report._id}'); closeModal();">
                            <i class="fas fa-map"></i> Show on Map
                        </button>
                    </div>
                </div>
            ` : ''}
            
            ${report.imageUrl ? `
                <div class="detail-section">
                    <h4>Photo Evidence</h4>
                    <div class="image-detail">
                        <img src="${report.imageUrl}" alt="Report evidence" style="max-width: 100%; border-radius: 8px;">
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Store current report ID for status updates
    document.getElementById('report-modal').dataset.reportId = reportId;
    
    // Show modal
    document.getElementById('report-modal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('report-modal').style.display = 'none';
}

// Update report status
async function updateReportStatus(newStatus) {
    const reportId = document.getElementById('report-modal').dataset.reportId;
    if (!reportId) return;
    
    try {
        // Since we don't have a backend endpoint for status updates,
        // we'll simulate this by updating the local data
        const reportIndex = allReports.findIndex(r => r._id === reportId);
        if (reportIndex !== -1) {
            allReports[reportIndex].status = newStatus;
            
            showMessage(`Report status updated to ${newStatus}`, false);
            closeModal();
            filterReports(); // Refresh the display
            updateStatistics();
        }
    } catch (error) {
        console.error('Error updating report status:', error);
        showMessage('Failed to update report status', true);
    }
}

// Quick status update
function quickStatusUpdate(reportId) {
    const report = allReports.find(r => r._id === reportId);
    if (!report) return;
    
    const currentStatus = report.status || 'pending';
    const statuses = ['pending', 'reviewed', 'resolved'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    // Update the status
    const reportIndex = allReports.findIndex(r => r._id === reportId);
    if (reportIndex !== -1) {
        allReports[reportIndex].status = nextStatus;
        showMessage(`Report status changed to ${nextStatus}`, false);
        filterReports();
        updateStatistics();
    }
}

// Refresh map
function refreshMap() {
    updateMapMarkers();
    showMessage('Map refreshed', false);
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

// Export reports
function exportReports() {
    if (filteredReports.length === 0) {
        showMessage('No reports to export', true);
        return;
    }
    
    // Create CSV content
    const headers = ['ID', 'Title', 'Description', 'User Name', 'User Email', 'Status', 'Type', 'Latitude', 'Longitude', 'Created Date'];
    const csvContent = [
        headers.join(','),
        ...filteredReports.map(report => [
            report._id,
            `"${(report.title || '').replace(/"/g, '""')}"`,
            `"${report.description.replace(/"/g, '""')}"`,
            `"${report.user ? report.user.name : 'Unknown'}"`,
            `"${report.user ? report.user.email : 'Unknown'}"`,
            report.status || 'pending',
            report.imageUrl ? 'Photo' : 'Text',
            report.location ? report.location.lat : '',
            report.location ? report.location.lng : '',
            new Date(report.createdAt).toISOString()
        ].join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reports_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Reports exported successfully', false);
}

// Show loading state
function showLoading() {
    const container = document.getElementById('reports-container');
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
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isError ? 'error' : 'success'}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            <i class="fas fa-${isError ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="message-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

// Global functions for onclick handlers
window.viewReportDetails = viewReportDetails;
window.centerMapOnReport = centerMapOnReport;
window.quickStatusUpdate = quickStatusUpdate;
window.changePage = changePage;
