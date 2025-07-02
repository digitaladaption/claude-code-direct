// Popup script for clipboard-based element capture
let capturedElements = [];

// Load saved elements on startup
chrome.storage.local.get(['capturedElements'], (result) => {
  if (result.capturedElements) {
    capturedElements = result.capturedElements;
    updateUI();
  }
});

// UI Elements
const elementCountEl = document.getElementById('elementCount');
const startBtn = document.getElementById('startCapture');
const copyBtn = document.getElementById('copyData');
const clearBtn = document.getElementById('clearData');
const successMsg = document.getElementById('successMessage');

// Start capturing
startBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Inject content script if needed
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-clipboard.js']
    });
  } catch (err) {
    // Script might already be injected
  }
  
  // Send start message
  chrome.tabs.sendMessage(tab.id, { 
    action: 'startCapturing' 
  }, (response) => {
    if (response && response.status === 'started') {
      // Close popup to let user interact with page
      window.close();
    }
  });
});

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
  if (capturedElements.length === 0) return;
  
  // Format data for Claude
  const sessionId = generateSessionId();
  const formattedData = formatForClaude(sessionId, capturedElements);
  
  try {
    await navigator.clipboard.writeText(formattedData);
    successMsg.style.display = 'block';
    
    setTimeout(() => {
      successMsg.style.display = 'none';
    }, 3000);
  } catch (err) {
    alert('Could not copy to clipboard. Please try again.');
  }
});

// Clear all data
clearBtn.addEventListener('click', () => {
  if (confirm('Clear all captured elements?')) {
    capturedElements = [];
    chrome.storage.local.set({ capturedElements: [] });
    updateUI();
  }
});

// Update UI based on captured elements
function updateUI() {
  elementCountEl.textContent = capturedElements.length;
  
  if (capturedElements.length > 0) {
    copyBtn.style.display = 'block';
    clearBtn.style.display = 'block';
  } else {
    copyBtn.style.display = 'none';
    clearBtn.style.display = 'none';
  }
}

// Generate session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Format data for Claude
function formatForClaude(sessionId, elements) {
  let output = `[BROWSER_ELEMENTS_START:${sessionId}]\n\n`;
  
  elements.forEach((element, index) => {
    output += `=== Element ${index + 1} ===\n`;
    output += `URL: ${element.url}\n`;
    output += `Element: <${element.tagName.toLowerCase()}`;
    if (element.id) output += ` id="${element.id}"`;
    if (element.className) output += ` class="${element.className}"`;
    output += `>\n`;
    
    if (element.text && element.text.trim()) {
      output += `Text: "${element.text.substring(0, 200)}${element.text.length > 200 ? '...' : ''}"\n`;
    }
    
    if (element.selector) {
      output += `Selector: ${element.selector}\n`;
    }
    
    output += `Position: ${element.position.width}×${element.position.height} at (${Math.round(element.position.left)}, ${Math.round(element.position.top)})\n`;
    
    if (element.note) {
      output += `Note: "${element.note}"\n`;
    }
    
    output += `Captured: ${new Date(element.timestamp).toLocaleString()}\n\n`;
  });
  
  output += `[BROWSER_ELEMENTS_END]\n`;
  
  return output;
}

// Listen for new elements
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'elementCaptured') {
    // Reload elements from storage
    chrome.storage.local.get(['capturedElements'], (result) => {
      capturedElements = result.capturedElements || [];
      updateUI();
    });
  }
});