// Store the server URL for API calls
let apiBaseUrl = '';

// Get server URL on extension initialization
getServerUrl().then(url => {
  apiBaseUrl = url;
  console.log('API base URL set:', apiBaseUrl);
}).catch(error => {
  console.error('Failed to get server URL:', error);
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Handle different action types
  switch (request.action) {
    case 'checkAuth':
      checkAuthentication().then(sendResponse);
      break;
      
    case 'openLogin':
      chrome.tabs.create({ url: 'login.html' });
      sendResponse({ success: true });
      break;
      
    case 'login':
      handleLogin(request.credentials).then(sendResponse);
      break;
      
    case 'logout':
      handleLogout().then(sendResponse);
      break;
      
    case 'validateToken':
      validateToken(request.token, request.userId).then(sendResponse);
      break;
      
    case 'refreshToken':
      refreshToken(request.token, request.userId).then(sendResponse);
      break;
      
    case 'formatCitation':
      formatCitation(request.reference).then(sendResponse);
      break;
      
    case 'saveReference':
      saveReference(request.reference).then(sendResponse);
      break;
      
    case 'getReferences':
      getReferences().then(sendResponse);
      break;
      
    case 'syncReferences':
      syncReferences().then(sendResponse);
      break;
      
    case 'deleteReference':
      deleteReference(request.referenceId).then(sendResponse);
      break;
      
    case 'getUserInfo':
      getUserInfo().then(sendResponse);
      break;
      
    case 'getServerUrl':
      getServerUrl().then(url => {
        sendResponse({ success: true, url });
      });
      break;
      
    case 'settingsUpdated':
      // Update settings in storage
      chrome.storage.sync.set({ 'settings': request.settings }, function() {
        sendResponse({ success: true });
      });
      break;
      
    default:
      sendResponse({ success: false, message: 'Unknown action' });
  }
  
  // Return true to indicate async response
  return true;
});

// Handle login request
async function handleLogin(credentials) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/extension-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store auth token in local storage
      chrome.storage.local.set({
        'auth': {
          token: data.token,
          userId: data.userId,
          expiresAt: data.expiresAt,
          email: credentials.email
        }
      });
      
      return {
        success: true,
        token: data.token,
        userId: data.userId,
        user: data.user
      };
    } else {
      return {
        success: false,
        message: data.message || 'Login failed'
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Network error during login'
    };
  }
}

// Handle logout request
async function handleLogout() {
  try {
    // Clear auth data from storage
    await new Promise((resolve) => {
      chrome.storage.local.remove('auth', resolve);
    });
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      message: 'Error during logout'
    };
  }
}

// Check if user is authenticated
async function checkAuthentication() {
  try {
    const data = await new Promise((resolve) => {
      chrome.storage.local.get('auth', resolve);
    });
    
    if (data.auth && data.auth.token && data.auth.userId) {
      // Check if token is expired
      const now = Date.now();
      if (data.auth.expiresAt && now < data.auth.expiresAt) {
        return {
          authenticated: true,
          token: data.auth.token,
          userId: data.auth.userId
        };
      } else if (data.auth.token) {
        // Token expired, try to refresh
        const refreshResult = await refreshToken(data.auth.token, data.auth.userId);
        if (refreshResult.success) {
          return {
            authenticated: true,
            token: refreshResult.token,
            userId: data.auth.userId
          };
        }
      }
    }
    
    return { authenticated: false };
  } catch (error) {
    console.error('Auth check error:', error);
    return { authenticated: false };
  }
}

// Validate token with the server
async function validateToken(token, userId) {
  if (!token || !userId) {
    return { valid: false };
  }
  
  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/validate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, userId })
    });
    
    const data = await response.json();
    
    if (response.ok && data.valid) {
      return {
        valid: true,
        user: data.user
      };
    } else {
      return { valid: false };
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false };
  }
}

// Refresh expired token
async function refreshToken(oldToken, userId) {
  if (!oldToken || !userId) {
    return { success: false };
  }
  
  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: oldToken, userId })
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      // Store new token in local storage
      chrome.storage.local.set({
        'auth': {
          token: data.token,
          userId: userId,
          expiresAt: data.expiresAt
        }
      });
      
      return {
        success: true,
        token: data.token
      };
    } else {
      return {
        success: false,
        message: data.message || 'Token refresh failed'
      };
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      message: 'Network error during token refresh'
    };
  }
}

// Format a citation based on reference data
async function formatCitation(reference) {
  try {
    // First check if we're authenticated
    const authData = await checkAuthentication();
    
    if (authData.authenticated) {
      // Use server-side citation formatting
      const response = await fetch(`${apiBaseUrl}/api/format-citation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        },
        body: JSON.stringify(reference)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          citation: data.citation
        };
      }
    }
    
    // Fallback to client-side formatting
    // This is a simplified version - server-side formatting will be more accurate
    const metadata = reference.metadata;
    let citation = '';
    
    switch (reference.type) {
      case 'web':
        citation = `${metadata.author || 'Unknown Author'} "${metadata.title}" ${metadata.publication ? `${metadata.publication} ` : ''}${metadata.date || 'n.d.'} <${metadata.url}>`;
        break;
        
      case 'case':
        citation = `${metadata.title} [${metadata.date ? metadata.date.substring(0, 4) : 'n.d.'}]`;
        break;
        
      case 'legislation':
        citation = `${metadata.title} ${metadata.date ? metadata.date.substring(0, 4) : ''} (NZ)`;
        break;
        
      case 'journal':
        citation = `${metadata.author || 'Unknown Author'} "${metadata.title}" (${metadata.date ? metadata.date.substring(0, 4) : 'n.d.'}) ${metadata.publication}`;
        break;
        
      case 'book':
        citation = `${metadata.author || 'Unknown Author'} ${metadata.title} (${metadata.date ? metadata.date.substring(0, 4) : 'n.d.'})`;
        break;
        
      default:
        citation = `${metadata.author || 'Unknown Author'} "${metadata.title}" ${metadata.date || 'n.d.'}`;
    }
    
    return {
      success: true,
      citation: citation
    };
  } catch (error) {
    console.error('Citation formatting error:', error);
    return {
      success: false,
      message: 'Error generating citation'
    };
  }
}

// Save a reference to the server
async function saveReference(referenceData) {
  try {
    // Check authentication first
    const authData = await checkAuthentication();
    
    if (!authData.authenticated) {
      return {
        success: false,
        message: 'You must be logged in to save references'
      };
    }
    
    // Get formatted citation
    const citationResult = await formatCitation(referenceData);
    
    if (!citationResult.success) {
      return {
        success: false,
        message: 'Failed to format citation'
      };
    }
    
    // Prepare reference data
    const reference = {
      ...referenceData,
      formattedCitation: citationResult.citation
    };
    
    // Send to server
    const response = await fetch(`${apiBaseUrl}/api/references/extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`
      },
      body: JSON.stringify(reference)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store reference in local cache
      cacheReference(data.reference);
      
      return {
        success: true,
        reference: data.reference
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to save reference'
      };
    }
  } catch (error) {
    console.error('Save reference error:', error);
    return {
      success: false,
      message: 'Network error while saving reference'
    };
  }
}

// Cache a reference locally
function cacheReference(reference) {
  chrome.storage.local.get('references', function(data) {
    const references = data.references || [];
    
    // Add reference to the beginning of the array
    references.unshift(reference);
    
    // Limit cache to 100 references
    if (references.length > 100) {
      references.pop();
    }
    
    chrome.storage.local.set({ 'references': references });
  });
}

// Get references from local cache
async function getReferences() {
  try {
    // Check authentication first
    const authData = await checkAuthentication();
    
    if (!authData.authenticated) {
      return {
        success: false,
        message: 'You must be logged in to view references'
      };
    }
    
    // Get references from local storage
    const data = await new Promise((resolve) => {
      chrome.storage.local.get('references', resolve);
    });
    
    return {
      success: true,
      references: data.references || []
    };
  } catch (error) {
    console.error('Get references error:', error);
    return {
      success: false,
      message: 'Error retrieving references'
    };
  }
}

// Sync references with server
async function syncReferences() {
  try {
    // Check authentication first
    const authData = await checkAuthentication();
    
    if (!authData.authenticated) {
      return {
        success: false,
        message: 'You must be logged in to sync references'
      };
    }
    
    // Fetch references from server
    const response = await fetch(`${apiBaseUrl}/api/references`, {
      headers: {
        'Authorization': `Bearer ${authData.token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update local cache
      chrome.storage.local.set({ 'references': data });
      
      return {
        success: true,
        references: data
      };
    } else {
      return {
        success: false,
        message: 'Failed to sync references'
      };
    }
  } catch (error) {
    console.error('Sync references error:', error);
    return {
      success: false,
      message: 'Network error while syncing references'
    };
  }
}

// Delete reference
async function deleteReference(referenceId) {
  try {
    // Check authentication first
    const authData = await checkAuthentication();
    
    if (!authData.authenticated) {
      return {
        success: false,
        message: 'You must be logged in to delete references'
      };
    }
    
    // Send delete request to server
    const response = await fetch(`${apiBaseUrl}/api/references/${referenceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authData.token}`
      }
    });
    
    if (response.ok) {
      // Update local cache
      const data = await new Promise((resolve) => {
        chrome.storage.local.get('references', resolve);
      });
      
      const references = data.references || [];
      const updatedReferences = references.filter(ref => ref.id !== referenceId);
      
      chrome.storage.local.set({ 'references': updatedReferences });
      
      return {
        success: true
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to delete reference'
      };
    }
  } catch (error) {
    console.error('Delete reference error:', error);
    return {
      success: false,
      message: 'Network error while deleting reference'
    };
  }
}

// Get user info
async function getUserInfo() {
  try {
    // Check authentication first
    const authData = await checkAuthentication();
    
    if (!authData.authenticated) {
      return {
        success: false,
        message: 'Not authenticated'
      };
    }
    
    // Validate token to get user info
    const validation = await validateToken(authData.token, authData.userId);
    
    if (validation.valid) {
      return {
        success: true,
        user: validation.user
      };
    } else {
      return {
        success: false,
        message: 'Invalid authentication'
      };
    }
  } catch (error) {
    console.error('Get user info error:', error);
    return {
      success: false,
      message: 'Error retrieving user information'
    };
  }
}

// Get the server URL (this could be configurable in a real-world extension)
async function getServerUrl() {
  // In a production extension, this might be configurable or determined dynamically
  // For now, we'll use a fixed URL from the current tab's origin
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0] && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          resolve(`${url.protocol}//${url.host}`);
        } catch (e) {
          resolve('https://citeright.repl.co'); // Fallback URL
        }
      } else {
        resolve('https://citeright.repl.co'); // Fallback URL
      }
    });
  });
}