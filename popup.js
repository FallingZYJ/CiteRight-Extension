document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const authStatus = document.getElementById('auth-status');
  const loginPrompt = document.getElementById('login-prompt');
  const mainContent = document.getElementById('main-content');
  const editForm = document.getElementById('edit-form');
  
  // Page info elements
  const pageTitle = document.getElementById('page-title');
  const pageUrl = document.getElementById('page-url');
  const pageAuthor = document.getElementById('page-author');
  const pagePublication = document.getElementById('page-publication');
  const pageDate = document.getElementById('page-date');
  const citationBox = document.getElementById('citation-box');
  
  // Form elements
  const referenceForm = document.getElementById('reference-form');
  const refType = document.getElementById('ref-type');
  const refTitle = document.getElementById('ref-title');
  const refAuthor = document.getElementById('ref-author');
  const refPublication = document.getElementById('ref-publication');
  const refDate = document.getElementById('ref-date');
  const refUrl = document.getElementById('ref-url');
  const refNotes = document.getElementById('ref-notes');
  
  // Buttons
  const loginBtn = document.getElementById('login-btn');
  const editDetailsBtn = document.getElementById('edit-details-btn');
  const copyBtn = document.getElementById('copy-btn');
  const saveBtn = document.getElementById('save-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const updateBtn = document.getElementById('update-btn');
  
  // Initialize popup
  checkAuthenticationStatus();
  getCurrentTabInfo();
  
  // Event listeners
  loginBtn.addEventListener('click', openLoginPage);
  editDetailsBtn.addEventListener('click', toggleEditMode);
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(citationBox.textContent)
      .then(() => {
        updateStatus('Citation copied to clipboard!', 'success');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        updateStatus('Failed to copy citation', 'error');
      });
  });
  saveBtn.addEventListener('click', saveReference);
  cancelEditBtn.addEventListener('click', () => {
    // Hide edit form and show main content
    editForm.style.display = 'none';
    mainContent.style.display = 'block';
  });
  referenceForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Update the citation with form values
    updateCitationPreview();
    
    // Hide edit form and show main content
    editForm.style.display = 'none';
    mainContent.style.display = 'block';
  });
  
  // Check if the user is authenticated
  function checkAuthenticationStatus() {
    // Update status UI
    authStatus.className = 'status';
    authStatus.innerHTML = '<div class="loading-spinner"></div><span class="status-message">Checking authentication...</span>';
    
    // Check with background script
    chrome.runtime.sendMessage({ action: 'checkAuth' }, function(response) {
      if (response.authenticated) {
        // Get the token and validate it
        validateToken(response.token, response.userId);
      } else {
        // Show login prompt
        authStatus.style.display = 'none';
        loginPrompt.style.display = 'block';
      }
    });
  }
  
  // Validate token with the server
  function validateToken(token, userId) {
    chrome.runtime.sendMessage({
      action: 'validateToken',
      token: token,
      userId: userId
    }, function(response) {
      if (response.valid) {
        // Token is valid, update UI
        authStatus.className = 'status success';
        authStatus.innerHTML = '<span class="status-message">✓ Signed in as ' + response.user.email + '</span>';
        
        // Show main content
        mainContent.style.display = 'block';
      } else {
        // Token is invalid, show login prompt
        authStatus.style.display = 'none';
        loginPrompt.style.display = 'block';
      }
    });
  }
  
  // Get information about the current tab
  function getCurrentTabInfo() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const currentTab = tabs[0];
      
      // Update URL display
      pageUrl.textContent = currentTab.url;
      refUrl.value = currentTab.url;
      
      // Update title display
      pageTitle.textContent = currentTab.title;
      refTitle.value = currentTab.title;
      
      // Extract metadata from the page
      chrome.tabs.sendMessage(currentTab.id, { action: 'getPageMetadata' }, function(response) {
        if (response && response.success) {
          // Populate UI with metadata
          populateFields(response.metadata);
        } else {
          // If content script doesn't respond or return data, still update citation
          updateCitationPreview();
        }
      });
    });
  }
  
  // Populate fields with extracted metadata
  function populateFields(metadata) {
    if (metadata.title) {
      pageTitle.textContent = metadata.title;
      refTitle.value = metadata.title;
    }
    
    if (metadata.authors && metadata.authors.length > 0) {
      const authorText = metadata.authors.join(', ');
      pageAuthor.textContent = authorText;
      refAuthor.value = authorText;
    }
    
    if (metadata.publication) {
      pagePublication.textContent = metadata.publication;
      refPublication.value = metadata.publication;
    }
    
    if (metadata.date) {
      const formattedDate = formatDate(metadata.date);
      pageDate.textContent = formattedDate;
      refDate.value = formattedDate;
    }
    
    // Update citation preview with the new metadata
    updateCitationPreview();
  }
  
  // Update the citation preview
  function updateCitationPreview() {
    // Get current reference data
    const referenceData = {
      type: editForm.style.display === 'block' ? refType.value : 'web',
      metadata: {
        title: editForm.style.display === 'block' ? refTitle.value : pageTitle.textContent,
        author: editForm.style.display === 'block' ? refAuthor.value : pageAuthor.textContent,
        publication: editForm.style.display === 'block' ? refPublication.value : pagePublication.textContent,
        date: editForm.style.display === 'block' ? refDate.value : pageDate.textContent,
        url: editForm.style.display === 'block' ? refUrl.value : pageUrl.textContent
      }
    };
    
    // Show loading state
    citationBox.innerHTML = 'Generating citation...';
    
    // Request formatted citation from background
    chrome.runtime.sendMessage({
      action: 'formatCitation',
      reference: referenceData
    }, function(response) {
      if (response && response.success) {
        citationBox.textContent = response.citation;
      } else {
        // Fallback to basic citation if error
        const basicCitation = `${referenceData.metadata.author || 'Unknown Author'} "${referenceData.metadata.title}" ${referenceData.metadata.publication ? `${referenceData.metadata.publication}, ` : ''}${referenceData.metadata.date || 'n.d.'} <${referenceData.metadata.url}>`;
        
        citationBox.textContent = basicCitation;
      }
    });
  }
  
  // Format date to YYYY-MM-DD
  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date)) {
        return dateString; // Return original if parsing fails
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  }
  
  // Save reference to CiteRight
  function saveReference() {
    // Disable save button to prevent multiple clicks
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Saving...';
    
    // Get current reference data
    const referenceData = {
      type: editForm.style.display === 'block' ? refType.value : 'web',
      title: editForm.style.display === 'block' ? refTitle.value : pageTitle.textContent,
      sourceUrl: editForm.style.display === 'block' ? refUrl.value : pageUrl.textContent,
      notes: editForm.style.display === 'block' ? refNotes.value : '',
      metadata: {
        author: editForm.style.display === 'block' ? refAuthor.value : pageAuthor.textContent,
        website: editForm.style.display === 'block' ? refPublication.value : pagePublication.textContent,
        publishedDate: editForm.style.display === 'block' ? refDate.value : pageDate.textContent,
        url: editForm.style.display === 'block' ? refUrl.value : pageUrl.textContent
      }
    };
    
    // Send save request to background script
    chrome.runtime.sendMessage({
      action: 'saveReference',
      reference: referenceData
    }, function(response) {
      // Re-enable save button
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save to CiteRight';
      
      if (response && response.success) {
        updateStatus('Reference saved successfully!', 'success');
      } else {
        updateStatus(response.message || 'Failed to save reference', 'error');
      }
    });
  }
  
  // Toggle between view and edit modes
  function toggleEditMode() {
    if (editForm.style.display === 'none' || editForm.style.display === '') {
      // Switch to edit mode
      mainContent.style.display = 'none';
      editForm.style.display = 'block';
      
      // Populate form with current values
      refTitle.value = pageTitle.textContent;
      refAuthor.value = pageAuthor.textContent;
      refPublication.value = pagePublication.textContent;
      refDate.value = pageDate.textContent;
      refUrl.value = pageUrl.textContent;
    } else {
      // Switch back to view mode
      editForm.style.display = 'none';
      mainContent.style.display = 'block';
    }
  }
  
  // Open login page
  function openLoginPage() {
    chrome.runtime.sendMessage({ action: 'openLogin' });
  }
  
  // Update status message
  function updateStatus(message, type = '') {
    authStatus.style.display = 'flex';
    authStatus.className = 'status ' + type;
    authStatus.innerHTML = `<span class="status-message">${message}</span>`;
    
    // Hide status after 3 seconds for success/error messages
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        if (authStatus.textContent.includes(message)) {
          authStatus.style.display = 'none';
        }
      }, 3000);
    }
  }
});