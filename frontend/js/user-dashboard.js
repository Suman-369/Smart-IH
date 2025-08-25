let adminMap;
let reportMarkers = [];
let allReports = [];
let filteredReports = [];
let currentPage = 1;
const reportsPerPage = 10;
let selectedImages = [];
let userLocation = null;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        window.location.href = '/login';
        return;
    }
    
    // Display user info
    document.getElementById('user-info').innerHTML = `
        <div class="user-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="user-details">
            <div class="user-name">${user.name}</div>
            <div class="user-role">${user.role}</div>
        </div>
    `;
    
    // Initialize location detection
    initLocationDetection();
    

    // Set up event listeners
    setupEventListeners();
    
    // Load user's reports
    loadUserReports();
    
    // Update report type UI
    updateReportTypeUI();
});

// Initialize location detection
function initLocationDetection() {
    requestLocation();
}

// Request user's location
function requestLocation() {
    showLocationStatus('loading');
    
    if (!navigator.geolocation) {
        showLocationStatus('denied');
        showMessage('Geolocation is not supported by this browser.', true);
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            // Update hidden inputs
            document.getElementById('lat').value = userLocation.lat;
            document.getElementById('lng').value = userLocation.lng;
            
            showLocationStatus('success');
            updateLocationCoords();
        },
        (error) => {
            console.error('Location error:', error);
            showLocationStatus('denied');
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    showMessage('Location access denied by user.', true);
                    break;
                case error.POSITION_UNAVAILABLE:
                    showMessage('Location information is unavailable.', true);
                    break;
                case error.TIMEOUT:
                    showMessage('Location request timed out.', true);
                    break;
                default:
                    showMessage('An unknown error occurred while retrieving location.', true);
                    break;
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Show location status
function showLocationStatus(status) {
    const denied = document.getElementById('location-denied');
    const loading = document.getElementById('location-loading');
    const success = document.getElementById('location-success');
    
    // Hide all status elements
    denied.style.display = 'none';
    loading.style.display = 'none';
    success.style.display = 'none';
    
    // Show appropriate status
    switch(status) {
        case 'loading':
            loading.style.display = 'flex';
            break;
        case 'success':
            success.style.display = 'flex';
            break;
        case 'denied':
        default:
            denied.style.display = 'flex';
            break;
    }
}

// Update location coordinates display
function updateLocationCoords() {
    if (userLocation) {
        document.getElementById('location-coords').innerHTML = `
            <span>Lat: ${userLocation.lat.toFixed(6)}, Lng: ${userLocation.lng.toFixed(6)}</span>
            <span class="accuracy">Accuracy: ��${Math.round(userLocation.accuracy)}m</span>
        `;
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Try location again button
    document.getElementById('try-location').addEventListener('click', requestLocation);
    
    // Report form submission
    document.getElementById('report-form').addEventListener('submit', submitReport);
    
    // Report type change
    document.querySelectorAll('input[name="report-type"]').forEach(radio => {
        radio.addEventListener('change', updateReportTypeUI);
    });
    
    // File upload
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('image');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    
    // Report filter
    document.getElementById('report-filter').addEventListener('change', filterReports);
    
    // Cancel button
    document.querySelector('.cancel-btn').addEventListener('click', resetForm);
}

// Update UI based on report type
function updateReportTypeUI() {
    const reportType = document.querySelector('input[name="report-type"]:checked').value;
    const photoSection = document.getElementById('photo-section');
    const imageInput = document.getElementById('image');
    
    if (reportType === 'photo') {
        photoSection.style.display = 'block';
        imageInput.required = true;
    } else {
        photoSection.style.display = 'none';
        imageInput.required = false;
        selectedImages = [];
        updateImagePreview();
    }
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

// Handle drop
function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
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
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
        showMessage('Please select valid image files (JPG, PNG, etc.).', true);
        return;
    }

    if (selectedImages.length + imageFiles.length > 5) {
        showMessage('Maximum 5 images allowed. You can only add ' + (5 - selectedImages.length) + ' more images.', true);
        return;
    }

    let filesAdded = 0;
    let filesRejected = 0;

    imageFiles.forEach(file => {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showMessage(`File "${file.name}" is too large. Maximum size is 10MB.`, true);
            filesRejected++;
            return;
        }

        // Check if file already exists
        const existingFile = selectedImages.find(img => img.name === file.name && img.size === file.size);
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
    const previewContainer = document.getElementById('image-preview');
    
    if (selectedImages.length === 0) {
        previewContainer.innerHTML = '';
        return;
    }
    
    previewContainer.innerHTML = selectedImages.map((file, index) => `
        <div class="image-preview-item">
            <img src="${URL.createObjectURL(file)}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" onclick="removeImage(${index})">
                <i class="fas fa-times"></i>
            </button>
            <div class="image-info">
                <span class="image-name">${file.name}</span>
                <span class="image-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
        </div>
    `).join('');
}

// Remove image from selection
function removeImage(index) {
    selectedImages.splice(index, 1);
    updateImagePreview();
}

// Show success animation with tick mark
function showSuccessAnimation(message, callback) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'success-overlay';
    
    // Create success animation container
    const successContainer = document.createElement('div');
    successContainer.className = 'success-animation-container';
    
    successContainer.innerHTML = `
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
        overlay.classList.add('show');
        successContainer.classList.add('animate');
    }, 100);
    
    // Auto redirect after animation
    setTimeout(() => {
        if (callback) callback();
    }, 3000);
}

// Submit a new report
async function submitReport(e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const title = document.getElementById('report-title').value;
    const description = document.getElementById('description').value;
    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;
    const reportType = document.querySelector('input[name="report-type"]:checked').value;

    // Validation
    if (!lat || !lng) {
        showMessage('Please enable location access to submit a report.', true);
        return;
    }

    if (reportType === 'photo' && selectedImages.length === 0) {
        showMessage('📸 Please select at least one image for photo report. Click the upload area above to add photos.', true);
        return;
    }

    try {
        // Show loading state with upload progress
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Uploading Report...</span>';
        submitBtn.disabled = true;

        // Create FormData to handle file uploads
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('lat', parseFloat(lat));
        formData.append('lng', parseFloat(lng));
        formData.append('reportType', reportType);

        // Add all selected images
        if (reportType === 'photo' && selectedImages.length > 0) {
            selectedImages.forEach((image, index) => {
                formData.append('images', image); // Append all selected images
            });

            // Show which images are being uploaded
            const fileNames = selectedImages.map(img => img.name).join(', ');
            const totalSize = (selectedImages.reduce((sum, img) => sum + img.size, 0) / 1024 / 1024).toFixed(2);
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Uploading ${selectedImages.length} images (${totalSize}MB)...</span>`;
            
            showMessage(`📸 Uploading ${selectedImages.length} images: ${fileNames}`, false);
        }

        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        }).catch(error => {
            console.error('Fetch error:', error);
            throw new Error('Network error: ' + error.message);
        });

        const data = await response.json();

        if (response.ok) {
            // Reset form
            resetForm();

            // Show success message based on report type
            const successMessage = reportType === 'photo'
                ? `📸 Photo report submitted successfully! Your evidence has been uploaded and the report is now under review.`
                : `📝 Text report submitted successfully! Your report is now under review.`;

            // Show success animation and redirect to home page
            showSuccessAnimation(successMessage, () => {
                window.location.href = '/';
            });
        } else {
            // More detailed error messages
            let errorMessage = 'Failed to submit report. ';
            if (response.status === 401) {
                errorMessage += 'Please log in again.';
                setTimeout(() => window.location.href = '/login', 2000);
            } else if (response.status === 413) {
                errorMessage += 'File too large. Please select a smaller image.';
            } else if (response.status === 400) {
                errorMessage += data.message || 'Please check your input and try again.';
            } else {
                errorMessage += data.message || 'Please try again later.';
            }
            showMessage(errorMessage, true);
        }
    } catch (error) {
        console.error('Report submission error:', error);
        let errorMessage = 'An error occurred while submitting the report';
        
        // Provide more specific error messages based on the error type
        if (error.message.includes('Network error')) {
            errorMessage = 'Network error: Please check your internet connection and try again';
        } else if (error.message.includes('Failed to upload image')) {
            errorMessage = 'Image upload failed: ' + error.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showMessage(errorMessage, true);
    } finally {
        // Reset button state
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>Submit Report</span>';
        submitBtn.disabled = false;
    }
}

// Reset form
function resetForm() {
    document.getElementById('report-form').reset();
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
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        // Add cache control to prevent unnecessary repeated calls
        const response = await fetch('/api/reports', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });

        const data = await response.json();

        if (response.ok) {
            const reportsContainer = document.getElementById('reports-container');
            const totalReportsElement = document.getElementById('total-reports');

            if (data.reports && data.reports.length > 0) {
                totalReportsElement.textContent = data.reports.length;

                reportsContainer.innerHTML = data.reports.map(report => `
                    <div class="report-card">
                        <div class="report-header">
                            <div class="report-type-badge ${report.reportType === 'photo' ? 'photo' : 'text'}">
                                <i class="fas fa-${report.reportType === 'photo' ? 'camera' : 'file-text'}"></i>
                                <span>${report.reportType === 'photo' ? 'Photo Report' : 'Text Report'}</span>
                            </div>
                            <div class="report-date">
                                ${new Date(report.createdAt).toLocaleDateString()}
                            </div>
                        </div>

                        <div class="report-content">
                            <h4 class="report-title">${report.title || report.description.substring(0, 50) + '...'}</h4>
                            <p class="report-description">${report.description}</p>

                            ${report.location ? `
                                <div class="report-location">
                                    <div class="location-badge">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <span>Lat: ${report.location.lat.toFixed(6)}, Lng: ${report.location.lng.toFixed(6)}</span>
                                    </div>
                                </div>
                            ` : ''}

                            ${report.imageUrl && report.imageUrl.length > 0 ? `
                                <div class="report-image">
                                    <img src="${report.imageUrl[0]}" alt="Report evidence" loading="lazy">
                                </div>
                            ` : ''}
                        </div>

                        <div class="report-footer">
                            <div class="report-status">
                                <span class="status-badge pending">
                                    <i class="fas fa-clock"></i>
                                    Pending Review
                                </span>
                            </div>
                            <div class="report-actions">
                                <button class="action-btn view-btn" onclick="viewReportDetails('${report._id}')">
                                    <i class="fas fa-eye"></i>
                                    View
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                totalReportsElement.textContent = '0';
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
        } else {
            showMessage(data.message || 'Failed to load reports', true);
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        showMessage('An error occurred while loading reports', true);
    }
}

// Filter reports
function filterReports() {
    const filterValue = document.getElementById('report-filter').value;
    const reportCards = document.querySelectorAll('.report-card');
    
    reportCards.forEach(card => {
        let show = true;
        
        switch(filterValue) {
            case 'photo':
                show = card.querySelector('.photo') !== null;
                break;
            case 'text':
                show = card.querySelector('.text') !== null;
                break;
            case 'recent':
                // Show reports from last 7 days
                const dateElement = card.querySelector('.report-date');
                const reportDate = new Date(dateElement.textContent);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                show = reportDate > weekAgo;
                break;
            case 'all':
            default:
                show = true;
                break;
        }
        
        card.style.display = show ? 'block' : 'none';
    });
}

// View report details (placeholder)
function viewReportDetails(reportId) {
    // In a real application, this would open a modal or navigate to a details page
    showMessage(`Viewing details for report: ${reportId}`, false);
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

// Global function to remove images (called from onclick)
window.removeImage = removeImage;
window.viewReportDetails = viewReportDetails;
