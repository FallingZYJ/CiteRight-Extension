document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const settingsForm = document.getElementById('settings-form');
  const defaultCollection = document.getElementById('default-collection');
  const autoClassify = document.getElementById('auto-classify');
  const autoSave = document.getElementById('auto-save');
  const syncFrequency = document.getElementById('sync-frequency');
  const resetButton = document.getElementById('reset-btn');
  const saveButton = document.getElementById('save-btn');
  const logoutButton = document.getElementById('logout-btn');
  const userEmail = document.getElementById('user-email');
  const userPlan = document.getElementById('user-plan');
  
  // Default settings
  const defaultSettings = {
    citationFormat: 'nzlsg',
    defaultCollection: 'none',
    autoClassify: true,
    autoSave: false,
    syncFrequency: 'immediate'
  };
  
  // Load user information and settings
  loadUserInfo();
  loadSettings();
  
  // Save settings form submission
  settingsForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const settings = {
      citationFormat: document.querySelector('input[name="citation-format"]:checked').value,
      defaultCollection: defaultCollection.value,
      autoClassify: autoClassify.checked,
      autoSave: autoSave.checked,
      syncFrequency: syncFrequency.value
    };
    
    // Save settings to storage
    chrome.storage.sync.set({ 'settings': settings }, function() {
      // Show success message
      saveButton.textContent = 'Saved!';
      saveButton.disabled = true;
      
      // Reset button state after 2 seconds
      setTimeout(() => {
        saveButton.textContent = 'Save Settings';
        saveButton.disabled = false;
      }, 2000);
      
      // Notify background script about settings change
      chrome.runtime.sendMessage({
        action: 'settingsUpdated',
        settings: settings
      });
    });
  });
  
  // Reset to defaults button
  resetButton.addEventListener('click', function() {
    // Reset form values to defaults
    document.getElementById('nzlsg').checked = true;
    defaultCollection.value = defaultSettings.defaultCollection;
    autoClassify.checked = defaultSettings.autoClassify;
    autoSave.checked = defaultSettings.autoSave;
    syncFrequency.value = defaultSettings.syncFrequency;
    
    // Show confirmation
    resetButton.textContent = 'Reset Complete';
    
    // Reset button state after 2 seconds
    setTimeout(() => {
      resetButton.textContent = 'Reset to Defaults';
    }, 2000);
  });
  
  // Logout button
  logoutButton.addEventListener('click', function() {
    // Confirm logout
    if (confirm('Are you sure you want to sign out? Your settings will be saved, but you will need to sign in again to sync your references.')) {
      // Send logout message to background script
      chrome.runtime.sendMessage({
        action: 'logout'
      }, function(response) {
        if (response.success) {
          // Redirect to login page
          window.location.href = 'login.html';
        }
      });
    }
  });
  
  // Load user information from storage
  function loadUserInfo() {
    chrome.runtime.sendMessage({ action: 'getUserInfo' }, function(response) {
      if (response && response.user) {
        userEmail.textContent = response.user.email || 'Unknown';
        userPlan.textContent = formatSubscription(response.user.subscription || 'free');
      } else {
        userEmail.textContent = 'Not signed in';
        userPlan.textContent = 'N/A';
      }
    });
  }
  
  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get('settings', function(data) {
      const settings = data.settings || defaultSettings;
      
      // Set form values based on saved settings
      document.getElementById(settings.citationFormat).checked = true;
      defaultCollection.value = settings.defaultCollection;
      autoClassify.checked = settings.autoClassify;
      autoSave.checked = settings.autoSave;
      syncFrequency.value = settings.syncFrequency;
    });
  }
  
  // Format subscription name for display
  function formatSubscription(subscription) {
    switch(subscription) {
      case 'free':
        return 'Free Trial';
      case 'student':
        return 'Student (15% discount)';
      case 'monthly':
        return 'Monthly';
      case 'annual':
        return 'Annual';
      case 'admin':
        return 'Administrator';
      default:
        return subscription;
    }
  }
});