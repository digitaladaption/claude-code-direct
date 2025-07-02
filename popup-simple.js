const SERVER_PORT = 3180;
let isCapturing = false;

// DOM elements
const sessionInput = document.getElementById('sessionId');
const startBtn = document.getElementById('startCapturing');
const stopBtn = document.getElementById('stopCapturing');
const statusBadge = document.getElementById('connectionStatus');
const elementCount = document.getElementById('elementCount');

// Check session validity
async function checkSession(sessionId) {
  if (!sessionId || sessionId.length !== 6) return false;
  
  try {
    const response = await fetch(`http://localhost:${SERVER_PORT}/api/session/${sessionId}`);
    if (response.ok) {
      const data = await response.json();
      updateElementCount(data.elements.length);
      return true;
    }
  } catch (err) {
    // Server not running
  }
  return false;
}

// Update element count display
function updateElementCount(count) {
  if (count > 0) {
    elementCount.style.display = 'inline';
    elementCount.innerHTML = `<br><span class="element-count">${count} elements sent</span>`;
  }
}

// Update connection status
async function updateStatus() {
  const sessionId = sessionInput.value.trim().toUpperCase();
  const isValid = await checkSession(sessionId);
  
  if (isValid) {
    statusBadge.textContent = 'Connected';
    statusBadge.className = 'status-badge connected';
    startBtn.disabled = false;
  } else if (sessionId.length === 6) {
    statusBadge.textContent = 'Invalid Session';
    statusBadge.className = 'status-badge disconnected';
    startBtn.disabled = true;
    elementCount.style.display = 'none';
  } else {
    statusBadge.textContent = 'Not Connected';
    statusBadge.className = 'status-badge disconnected';
    startBtn.disabled = true;
    elementCount.style.display = 'none';
  }
}

// Session input handler
sessionInput.addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
  updateStatus();
});

// Load saved session
chrome.storage.local.get(['claudeSessionId'], (result) => {
  if (result.claudeSessionId) {
    sessionInput.value = result.claudeSessionId;
    updateStatus();
  }
});

// Start capturing
startBtn.addEventListener('click', async () => {
  const sessionId = sessionInput.value.trim();
  
  // Save session ID
  chrome.storage.local.set({ claudeSessionId: sessionId });
  
  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Send message to content script
  chrome.tabs.sendMessage(tab.id, { 
    action: 'startCapturing',
    sessionId: sessionId,
    port: SERVER_PORT
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError.message);
    } else if (response && response.status === 'started') {
      isCapturing = true;
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      sessionInput.disabled = true;
    }
  });
});

// Stop capturing
stopBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { 
    action: 'stopCapturing'
  }, (response) => {
    if (response && response.status === 'stopped') {
      isCapturing = false;
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      sessionInput.disabled = false;
    }
  });
});

// Listen for element sent messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'elementSent') {
    updateStatus(); // Refresh element count
  }
});

// Initial check
updateStatus();