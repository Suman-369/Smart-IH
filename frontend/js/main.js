// Main application JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state and update navigation
    updateNavigation();
    
    // Mobile Navigation
    const hamburgerMenu = document.getElementById('hamburger-menu');
    if (hamburgerMenu) {
        const mobileNavMenu = document.createElement('div');
        mobileNavMenu.className = 'mobile-nav-menu';
        mobileNavMenu.innerHTML = `
            <ul class="nav-menu">
                <li><a href="/" class="nav-link">Home</a></li>
                <li><a href="#features" class="nav-link">Features</a></li>
                <li><a href="#about" class="nav-link">About</a></li>
                <li id="mobile-auth-links" class="auth-links">
                    <a href="/login" class="nav-link">Login</a>
                    <a href="/register" class="nav-link">Register</a>
                </li>
                <li id="mobile-user-dashboard-link" class="dashboard-link" style="display: none;">
                    <a href="/user-dashboard" class="nav-link">Dashboard</a>
                </li>
                <li id="mobile-admin-dashboard-link" class="dashboard-link" style="display: none;">
                    <a href="/admin-dashboard" class="nav-link">Admin Panel</a>
                </li>
            </ul>
        `;
        document.body.appendChild(mobileNavMenu);

        hamburgerMenu.addEventListener('click', function() {
            mobileNavMenu.classList.toggle('active');
            hamburgerMenu.classList.toggle('active');
        });

        document.addEventListener('click', function(e) {
            if (!hamburgerMenu.contains(e.target) && !mobileNavMenu.contains(e.target)) {
                mobileNavMenu.classList.remove('active');
                hamburgerMenu.classList.remove('active');
            }
        });
        
        // Update mobile navigation based on auth state
        updateMobileNavigation();
    }
    
    // Add smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add loading animation to buttons (excluding form submit buttons which have their own handling)
    const buttons = document.querySelectorAll('.btn:not(.submit-btn)');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const icon = this.querySelector('i');
            if (icon && !icon.classList.contains('fa-spin')) {
                const originalClass = icon.className;
                icon.className = 'fas fa-spinner fa-spin';
                
                setTimeout(() => {
                    icon.className = originalClass;
                }, 2000);
            }
        });
    });
    
    // Test server connection on page load
    testServerConnection();
});

// Update navigation based on authentication state
function updateNavigation() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    const authLinks = document.getElementById('auth-links');
    const userDashboardLink = document.getElementById('user-dashboard-link');
    const adminDashboardLink = document.getElementById('admin-dashboard-link');
    const logoutLink = document.getElementById('logout-link');
    const getStartedButton = document.getElementById('get-started-button');
    const userProfileNav = document.getElementById('user-profile-nav');

    if (token && user) {
        // User is logged in - hide auth links and get started button, show profile
        if (authLinks) authLinks.style.display = 'none';
        if (getStartedButton) getStartedButton.style.display = 'none';
        if (userProfileNav) {
            userProfileNav.style.display = 'block';
            setupProfileDropdown(user);
        }

        if (user.role === 'admin') {
            if (adminDashboardLink) adminDashboardLink.style.display = 'block';
            if (userDashboardLink) userDashboardLink.style.display = 'none';
        } else {
            if (userDashboardLink) userDashboardLink.style.display = 'block';
            if (adminDashboardLink) adminDashboardLink.style.display = 'none';
        }

        if (logoutLink) logoutLink.style.display = 'block';

        // Set up logout functionality
        const logoutBtn = document.getElementById('logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    } else {
        // User is not logged in - show auth links and get started button, hide profile
        if (authLinks) authLinks.style.display = 'block';
        if (getStartedButton) getStartedButton.style.display = 'block';
        if (userProfileNav) userProfileNav.style.display = 'none';
        if (userDashboardLink) userDashboardLink.style.display = 'none';
        if (adminDashboardLink) adminDashboardLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
    }
    
    // Update mobile navigation as well
    updateMobileNavigation();
}

// Update mobile navigation based on authentication state
function updateMobileNavigation() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    const mobileAuthLinks = document.getElementById('mobile-auth-links');
    const mobileUserDashboardLink = document.getElementById('mobile-user-dashboard-link');
    const mobileAdminDashboardLink = document.getElementById('mobile-admin-dashboard-link');

    if (token && user) {
        // User is logged in - hide auth links, show dashboard links
        if (mobileAuthLinks) mobileAuthLinks.style.display = 'none';

        if (user.role === 'admin') {
            if (mobileAdminDashboardLink) mobileAdminDashboardLink.style.display = 'block';
            if (mobileUserDashboardLink) mobileUserDashboardLink.style.display = 'none';
        } else {
            if (mobileUserDashboardLink) mobileUserDashboardLink.style.display = 'block';
            if (mobileAdminDashboardLink) mobileAdminDashboardLink.style.display = 'none';
        }
    } else {
        // User is not logged in - show auth links, hide dashboard links
        if (mobileAuthLinks) mobileAuthLinks.style.display = 'block';
        if (mobileUserDashboardLink) mobileUserDashboardLink.style.display = 'none';
        if (mobileAdminDashboardLink) mobileAdminDashboardLink.style.display = 'none';
    }
}

// Setup profile dropdown
function setupProfileDropdown(user) {
    // Update profile information
    const userNameNav = document.getElementById('user-name-nav');
    const dropdownUserName = document.getElementById('dropdown-user-name');
    const dropdownUserEmail = document.getElementById('dropdown-user-email');
    const dropdownUserRole = document.getElementById('dropdown-user-role');

    if (userNameNav) userNameNav.textContent = user.name;
    if (dropdownUserName) dropdownUserName.textContent = user.name;
    if (dropdownUserEmail) dropdownUserEmail.textContent = user.email;
    if (dropdownUserRole) dropdownUserRole.textContent = user.role;

    // Setup dropdown toggle
    const profileIcon = document.getElementById('profile-icon');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (profileIcon && profileDropdown) {
        // Remove existing listeners
        profileIcon.replaceWith(profileIcon.cloneNode(true));
        const newProfileIcon = document.getElementById('profile-icon');

        newProfileIcon.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');

            // Rotate chevron
            const chevron = newProfileIcon.querySelector('.fa-chevron-down');
            if (chevron) {
                chevron.style.transform = profileDropdown.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!newProfileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
                const chevron = newProfileIcon.querySelector('.fa-chevron-down');
                if (chevron) {
                    chevron.style.transform = 'rotate(0deg)';
                }
            }
        });
    }

    // Setup dropdown menu actions
    const viewProfile = document.getElementById('view-profile');
    const editProfile = document.getElementById('edit-profile');
    const profileLogout = document.getElementById('profile-logout');

    if (viewProfile) {
        viewProfile.addEventListener('click', function(e) {
            e.preventDefault();
            // Navigate to appropriate dashboard
            if (user.role === 'admin') {
                window.location.href = '/admin-dashboard';
            } else {
                window.location.href = '/user-dashboard';
            }
        });
    }

    if (editProfile) {
        editProfile.addEventListener('click', function(e) {
            e.preventDefault();
            showEditProfileModal(user);
        });
    }

    if (profileLogout) {
        profileLogout.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Show edit profile modal
function showEditProfileModal(user) {
    // Create modal HTML
    const modalHTML = `
        <div class="modal-overlay" id="edit-profile-modal">
            <div class="modal-container">
                <div class="modal-header">
                    <h3>Edit Profile</h3>
                    <button class="modal-close" onclick="closeEditProfileModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content">
                    <form id="edit-profile-form">
                        <div class="form-group">
                            <label for="edit-name">Full Name</label>
                            <input type="text" id="edit-name" value="${user.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-email">Email Address</label>
                            <input type="email" id="edit-email" value="${user.email}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-password">New Password (leave empty to keep current)</label>
                            <input type="password" id="edit-password" placeholder="Enter new password">
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn secondary" onclick="closeEditProfileModal()">Cancel</button>
                            <button type="submit" class="btn primary">Update Profile</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Setup form submission
    const editForm = document.getElementById('edit-profile-form');
    editForm.addEventListener('submit', handleProfileUpdate);
}

// Close edit profile modal
function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.remove();
    }
}

// Handle profile update
async function handleProfileUpdate(e) {
    e.preventDefault();

    const name = document.getElementById('edit-name').value;
    const email = document.getElementById('edit-email').value;
    const password = document.getElementById('edit-password').value;

    // Here you would implement the actual update API call
    // For now, just update localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    user.name = name;
    user.email = email;
    localStorage.setItem('user', JSON.stringify(user));

    showMessage('Profile updated successfully!', false);
    closeEditProfileModal();
    updateNavigation();
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showMessage('Logged out successfully', false);

    setTimeout(() => {
        window.location.href = '/';
    }, 1500);
}

// Make functions globally available
window.closeEditProfileModal = closeEditProfileModal;

// Test server connection
async function testServerConnection() {
    try {
        const response = await fetch('/api/health', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Server connection test: OK');
    } catch (error) {
        console.warn('Server connection test failed:', error.message);

        // Show warning message if on auth pages
        if (window.location.pathname.includes('login') || window.location.pathname.includes('register')) {
            setTimeout(() => {
                showMessage('Warning: Unable to connect to server. Please ensure the backend is running.', true);
            }, 1000);
        }
    }
}

// Global message function
function showMessage(message, isError = false) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
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

// Make showMessage globally available
window.showMessage = showMessage;
