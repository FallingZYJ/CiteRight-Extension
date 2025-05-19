document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const loginBtn = document.getElementById('login-btn');
  const backBtn = document.getElementById('back-btn');
  const createAccountBtn = document.getElementById('create-account-btn');
  const status = document.getElementById('status');
  const statusMessage = document.getElementById('status-message');
  
  // Check if already logged in
  chrome.runtime.sendMessage({ action: 'checkAuth' }, function(response) {
    if (response.authenticated) {
      // Redirect to popup
      window.close();
      chrome.tabs.create({ url: 'popup.html' });
    }
  });
  
  // Event listeners
  loginForm.addEventListener('submit', handleLogin);
  backBtn.addEventListener('click', function() {
    window.close();
  });
  createAccountBtn.addEventListener('click', function() {
    // Open CiteRight signup page
    chrome.runtime.sendMessage({ action: 'getServerUrl' }, function(response) {
      chrome.tabs.create({ url: `${response.url}/pricing` });
    });
  });
  
  // Handle login form submission
  function handleLogin(e) {
    e.preventDefault();
    
    // Reset error messages
    emailError.style.display = 'none';
    passwordError.style.display = 'none';
    
    // Get form values
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Basic validation
    let hasError = false;
    
    if (!email) {
      emailError.textContent = 'Email is required';
      emailError.style.display = 'block';
      hasError = true;
    } else if (!isValidEmail(email)) {
      emailError.textContent = 'Please enter a valid email address';
      emailError.style.display = 'block';
      hasError = true;
    }
    
    if (!password) {
      passwordError.textContent = 'Password is required';
      passwordError.style.display = 'block';
      hasError = true;
    }
    
    if (hasError) {
      return;
    }
    
    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = 'Signing in...';
    
    // Send login request to background script
    chrome.runtime.sendMessage({
      action: 'login',
      credentials: {
        email: email,
        password: password
      }
    }, function(response) {
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Sign In';
      
      if (response.success) {
        // Show success message
        showSuccess('Successfully signed in!');
        
        // Redirect to popup after a short delay
        setTimeout(function() {
          window.close();
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0) {
              chrome.tabs.reload(tabs[0].id);
            }
          });
        }, 1500);
      } else {
        // Show error message
        showError(response.message || 'Invalid email or password');
      }
    });
  }
  
  // Validate email format
  function isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }
  
  // Show error message
  function showError(message) {
    status.className = 'status error';
    statusMessage.textContent = message;
    status.style.display = 'flex';
  }
  
  // Show success message
  function showSuccess(message) {
    status.className = 'status success';
    statusMessage.textContent = message;
    status.style.display = 'flex';
  }
});