document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const historyList = document.getElementById('history-list');
  const loadingSpinner = document.getElementById('loading-spinner');
  const emptyMessage = document.getElementById('empty-message');
  const searchInput = document.getElementById('search-input');
  const typeFilter = document.getElementById('type-filter');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const syncBtn = document.getElementById('sync-btn');
  
  // Modal elements
  const referenceModal = document.getElementById('reference-modal');
  const modalTitle = document.getElementById('modal-title');
  const closeModal = document.getElementById('close-modal');
  const refType = document.getElementById('ref-type');
  const refTitle = document.getElementById('ref-title');
  const refCitation = document.getElementById('ref-citation');
  const refUrl = document.getElementById('ref-url');
  const refDate = document.getElementById('ref-date');
  const copyCitation = document.getElementById('copy-citation');
  const editReference = document.getElementById('edit-reference');
  const deleteReference = document.getElementById('delete-reference');
  
  // References data
  let allReferences = [];
  let filteredReferences = [];
  let currentPage = 1;
  let itemsPerPage = 10;
  
  // Initialize history page
  init();
  
  // Event listeners
  searchInput.addEventListener('input', filterAndRenderReferences);
  typeFilter.addEventListener('change', filterAndRenderReferences);
  prevPageBtn.addEventListener('click', goToPrevPage);
  nextPageBtn.addEventListener('click', goToNextPage);
  syncBtn.addEventListener('click', syncReferences);
  closeModal.addEventListener('click', hideModal);
  copyCitation.addEventListener('click', handleCopyCitation);
  editReference.addEventListener('click', handleEditReference);
  deleteReference.addEventListener('click', handleDeleteReference);
  
  // Initialize the history page
  function init() {
    // Check authentication first
    chrome.runtime.sendMessage({ action: 'checkAuth' }, function(response) {
      if (!response.authenticated) {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
        return;
      }
      
      // Load references if authenticated
      loadReferences();
    });
  }
  
  // Load references from CiteRight backend
  function loadReferences() {
    showLoading();
    
    chrome.runtime.sendMessage({ action: 'getReferences' }, function(response) {
      hideLoading();
      
      if (response.success && response.references) {
        allReferences = response.references;
        filterAndRenderReferences();
      } else {
        showEmptyMessage('Could not load references. Please try again.');
      }
    });
  }
  
  // Filter references and update display
  function filterAndRenderReferences() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedType = typeFilter.value;
    
    // Apply filters
    filteredReferences = allReferences.filter(ref => {
      // Filter by type
      const typeMatch = selectedType === 'all' || ref.type === selectedType;
      
      // Filter by search term
      const searchMatch = 
        ref.title.toLowerCase().includes(searchTerm) || 
        ref.formattedCitation.toLowerCase().includes(searchTerm);
      
      return typeMatch && searchMatch;
    });
    
    // Reset to first page when filters change
    currentPage = 1;
    
    // Render filtered references
    renderReferences();
    updatePagination();
  }
  
  // Render references list with pagination
  function renderReferences() {
    // Clear previous list
    historyList.innerHTML = '';
    
    if (filteredReferences.length === 0) {
      showEmptyMessage('No references found matching your search.');
      return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredReferences.length);
    const currentReferences = filteredReferences.slice(startIndex, endIndex);
    
    // Create reference items
    currentReferences.forEach(reference => {
      const referenceItem = document.createElement('div');
      referenceItem.className = 'reference-item';
      referenceItem.setAttribute('data-id', reference.id);
      
      // Format date
      const savedDate = reference.createdAt 
        ? new Date(reference.createdAt).toLocaleDateString()
        : 'Unknown date';
      
      // Reference content
      referenceItem.innerHTML = `
        <div class="reference-type">${formatReferenceType(reference.type)}</div>
        <div class="reference-info">
          <h3 class="reference-title">${reference.title}</h3>
          <p class="reference-citation">${reference.formattedCitation}</p>
          <div class="reference-meta">
            <span class="reference-date">Saved on ${savedDate}</span>
          </div>
        </div>
      `;
      
      // Add click handler to show details modal
      referenceItem.addEventListener('click', () => showReferenceDetails(reference));
      
      historyList.appendChild(referenceItem);
    });
  }
  
  // Update pagination controls and info
  function updatePagination() {
    const totalPages = Math.ceil(filteredReferences.length / itemsPerPage);
    
    // Update page info text
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    // Disable/enable pagination buttons based on current page
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }
  
  // Go to previous page
  function goToPrevPage() {
    if (currentPage > 1) {
      currentPage--;
      renderReferences();
      updatePagination();
    }
  }
  
  // Go to next page
  function goToNextPage() {
    const totalPages = Math.ceil(filteredReferences.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderReferences();
      updatePagination();
    }
  }
  
  // Show reference details in modal
  function showReferenceDetails(reference) {
    // Populate modal with reference data
    modalTitle.textContent = 'Reference Details';
    refType.textContent = formatReferenceType(reference.type);
    refTitle.textContent = reference.title;
    refCitation.textContent = reference.formattedCitation;
    
    // Handle URL
    if (reference.sourceUrl) {
      refUrl.textContent = reference.sourceUrl;
      refUrl.href = reference.sourceUrl;
      refUrl.style.display = 'inline';
    } else {
      refUrl.textContent = 'N/A';
      refUrl.href = '#';
      refUrl.style.display = 'inline';
    }
    
    // Format date
    refDate.textContent = reference.createdAt 
      ? new Date(reference.createdAt).toLocaleString()
      : 'Unknown';
    
    // Store reference ID for action buttons
    copyCitation.setAttribute('data-id', reference.id);
    editReference.setAttribute('data-id', reference.id);
    deleteReference.setAttribute('data-id', reference.id);
    
    // Show modal
    referenceModal.style.display = 'block';
  }
  
  // Hide reference details modal
  function hideModal() {
    referenceModal.style.display = 'none';
  }
  
  // Copy citation to clipboard
  function handleCopyCitation() {
    const citation = refCitation.textContent;
    
    navigator.clipboard.writeText(citation)
      .then(() => {
        // Show success message
        copyCitation.textContent = 'Copied!';
        setTimeout(() => {
          copyCitation.textContent = 'Copy Citation';
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy citation: ', err);
      });
  }
  
  // Edit reference
  function handleEditReference() {
    const referenceId = editReference.getAttribute('data-id');
    
    // Close modal
    hideModal();
    
    // Open edit page with reference ID
    chrome.runtime.sendMessage({
      action: 'editReference',
      referenceId: referenceId
    });
  }
  
  // Delete reference
  function handleDeleteReference() {
    const referenceId = deleteReference.getAttribute('data-id');
    
    if (confirm('Are you sure you want to delete this reference? This action cannot be undone.')) {
      chrome.runtime.sendMessage({
        action: 'deleteReference',
        referenceId: referenceId
      }, function(response) {
        if (response.success) {
          // Close modal
          hideModal();
          
          // Remove reference from list and refresh
          allReferences = allReferences.filter(ref => ref.id !== referenceId);
          filterAndRenderReferences();
        } else {
          alert('Failed to delete reference. Please try again.');
        }
      });
    }
  }
  
  // Sync references with CiteRight
  function syncReferences() {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';
    
    chrome.runtime.sendMessage({ action: 'syncReferences' }, function(response) {
      if (response.success) {
        // Update references list with synced data
        allReferences = response.references;
        filterAndRenderReferences();
        
        syncBtn.textContent = 'Synced!';
        setTimeout(() => {
          syncBtn.textContent = 'Sync with CiteRight';
          syncBtn.disabled = false;
        }, 2000);
      } else {
        // Show error
        syncBtn.textContent = 'Sync Failed';
        setTimeout(() => {
          syncBtn.textContent = 'Sync with CiteRight';
          syncBtn.disabled = false;
        }, 2000);
      }
    });
  }
  
  // Format reference type for display
  function formatReferenceType(type) {
    const types = {
      'case': 'Case',
      'legislation': 'Legislation',
      'journal': 'Journal Article',
      'book': 'Book',
      'web': 'Web Source'
    };
    return types[type] || type;
  }
  
  // Show loading spinner
  function showLoading() {
    loadingSpinner.style.display = 'block';
    emptyMessage.style.display = 'none';
  }
  
  // Hide loading spinner
  function hideLoading() {
    loadingSpinner.style.display = 'none';
  }
  
  // Show empty message
  function showEmptyMessage(message) {
    emptyMessage.textContent = message || 'No references found.';
    emptyMessage.style.display = 'block';
  }
});