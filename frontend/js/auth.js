// Prevent multiple initializations
if (window.authInitialized) {
    console.log('Auth module already initialized, skipping...');
} else {
    window.authInitialized = true;
    initializeAuth();
}

function initializeAuth() {
    // Handle login form submission
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Initializing auth module...');
        
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm) {
            console.log('Setting up login form handler');
            // Remove any existing listeners
            const newLoginForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(newLoginForm, loginForm);
            
            newLoginForm.addEventListener('submit', handleLogin);
        }
        
        if (registerForm) {
            console.log('Setting up register form handler');
            // Remove any existing listeners
            const newRegisterForm = registerForm.cloneNode(true);
            registerForm.parentNode.replaceChild(newRegisterForm, registerForm);
            
            newRegisterForm.addEventListener('submit', handleRegister);
        }
    });
}

async function handleLogin(e) {
    e.preventDefault();
    console.log('Login form submitted');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Signing In...</span>';
    submitBtn.disabled = true;
    
    try {
        console.log('Sending login request...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Login response received:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type')
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
                console.log('Login response data:', data);
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                throw new Error('Failed to parse server response as JSON');
            }
        } else {
            // Handle non-JSON response
            const text = await response.text();
            console.error('Non-JSON response received:', text);
            throw new Error('Server returned invalid response format. Expected JSON but got: ' + (contentType || 'unknown'));
        }
        
        if (response.ok) {
            // Save token and user data to localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Show success message
            showMessage('Login successful! Redirecting...', false);
            
            // Redirect based on user role
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin-dashboard';
                } else {
                    window.location.href = '/user-dashboard';
                }
            }, 1500);
        } else {
            showMessage(data.message || 'Login failed', true);
        }
    } catch (error) {
        console.error('Login error:', error);
        
        if (error.name === 'AbortError') {
            showMessage('Request timed out. Please try again.', true);
        } else if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            showMessage('Unable to connect to server. Please ensure the backend is running on port 3000.', true);
        } else if (error.message.includes('invalid response format')) {
            showMessage('Server configuration error: ' + error.message, true);
        } else {
            showMessage('An error occurred during login: ' + error.message, true);
        }
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    console.log('Register form submitted');

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Validation
    if (!name || !email || !password) {
        showMessage('Please fill in all fields', true);
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', true);
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Creating Account...</span>';
    submitBtn.disabled = true;
    
    try {
        console.log('Sending registration request with data:', { name, email }); // Don't log password

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for registration

        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Registration response received:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            ok: response.ok
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
                console.log('Registration response data:', data);
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                console.error('Response was not valid JSON');
                throw new Error('Failed to parse server response as JSON');
            }
        } else {
            // Handle non-JSON response
            const text = await response.text();
            console.error('Non-JSON response received:', {
                contentType: contentType,
                responseText: text.substring(0, 500) // Log first 500 chars
            });
            throw new Error('Server returned invalid response format. Expected JSON but got: ' + (contentType || 'unknown'));
        }
        
        if (response.ok) {
            console.log('Registration successful!');
            
            // Save token and user data to localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Show success message
            showMessage('Registration successful! Redirecting...', false);
            
            // Redirect based on user role
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin-dashboard';
                } else {
                    window.location.href = '/user-dashboard';
                }
            }, 1500);
        } else {
            console.log('Registration failed with status:', response.status);
            showMessage(data.message || `Registration failed (${response.status})`, true);
        }
    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.name === 'AbortError') {
            showMessage('Request timed out. Please try again.', true);
        } else if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            showMessage('Unable to connect to server. Please ensure the backend is running on port 3000.', true);
        } else if (error.message.includes('invalid response format')) {
            showMessage('Server configuration error: ' + error.message, true);
        } else if (error.message.includes('JSON')) {
            showMessage('Server response error: Unable to process server response.', true);
        } else {
            showMessage('Registration failed: ' + error.message, true);
        }
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = false;
    }
}

// Show message function
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
