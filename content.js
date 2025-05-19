// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getPageMetadata') {
    // Extract metadata from the current page
    const metadata = extractPageMetadata();
    
    // Send the metadata back to the popup
    sendResponse({
      success: true,
      metadata: metadata
    });
  }
  
  // Return true to indicate that sendResponse will be called asynchronously
  return true;
});

// Extract metadata from the current page
function extractPageMetadata() {
  const metadata = {
    title: extractTitle(),
    authors: extractAuthors(),
    publication: extractPublication(),
    date: extractPublishedDate(),
    url: window.location.href
  };
  
  return metadata;
}

// Extract the page title, preferring specific metadata when available
function extractTitle() {
  // Look for structured data
  const schemaTitle = document.querySelector('meta[property="og:title"], meta[name="twitter:title"], meta[property="article:title"]');
  if (schemaTitle) {
    return schemaTitle.getAttribute('content');
  }
  
  // Look for schema.org markup
  const schemaElement = document.querySelector('[itemtype*="schema.org/Article"] [itemprop="headline"], [itemtype*="schema.org/NewsArticle"] [itemprop="headline"]');
  if (schemaElement) {
    return schemaElement.textContent.trim();
  }
  
  // Look for the main heading
  const heading = document.querySelector('h1');
  if (heading) {
    return heading.textContent.trim();
  }
  
  // Fall back to the document title
  return document.title;
}

// Extract author information
function extractAuthors() {
  const authors = [];
  
  // Try to find structured author data
  const schemaAuthors = document.querySelectorAll('meta[name="author"], meta[property="article:author"], meta[property="og:author"], [itemprop="author"] [itemprop="name"]');
  
  if (schemaAuthors.length > 0) {
    schemaAuthors.forEach(authorMeta => {
      const author = authorMeta.getAttribute('content') || authorMeta.textContent;
      if (author && !authors.includes(author)) {
        authors.push(author.trim());
      }
    });
  }
  
  // Look for bylines
  if (authors.length === 0) {
    const bylineSelectors = [
      '.byline', '.author', '.article-author', '.entry-author',
      '[class*="byline"]', '[class*="author"]', '[rel="author"]'
    ];
    
    for (const selector of bylineSelectors) {
      const bylineElements = document.querySelectorAll(selector);
      
      if (bylineElements.length > 0) {
        bylineElements.forEach(element => {
          const text = element.textContent.trim();
          
          // Common prefixes to remove
          const authorText = text.replace(/^(By|Author|Written by|Posted by):\s*/i, '');
          
          if (authorText && !authors.includes(authorText)) {
            authors.push(authorText);
          }
        });
        
        if (authors.length > 0) break;
      }
    }
  }
  
  return authors;
}

// Extract publication name
function extractPublication() {
  // Check meta tags for publication info
  const siteName = document.querySelector('meta[property="og:site_name"]');
  if (siteName) {
    return siteName.getAttribute('content');
  }
  
  // Check publisher data
  const publisher = document.querySelector('[itemprop="publisher"] [itemprop="name"]');
  if (publisher) {
    return publisher.textContent.trim();
  }
  
  // Extract from canonical URL or domain name
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    try {
      const url = new URL(canonical.getAttribute('href'));
      return url.hostname.replace(/^www\./, '');
    } catch (e) {
      // Invalid URL, fall back to window location
    }
  }
  
  // Fall back to domain name
  return window.location.hostname.replace(/^www\./, '');
}

// Extract the publication date
function extractPublishedDate() {
  // Look for structured date data
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="dc.date"]',
    'meta[name="date"]',
    'meta[name="publication_date"]',
    'time[datetime]',
    '[itemprop="datePublished"]'
  ];
  
  for (const selector of dateSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const dateValue = element.getAttribute('content') || 
                      element.getAttribute('datetime') || 
                      element.textContent.trim();
      
      if (dateValue) {
        return dateValue;
      }
    }
  }
  
  // Look for date patterns in the text
  const datePattern = /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})|(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/;
  const bodyText = document.body.textContent;
  const dateMatch = bodyText.match(datePattern);
  
  if (dateMatch) {
    return dateMatch[0];
  }
  
  return null;
}