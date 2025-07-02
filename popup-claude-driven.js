// Simplified popup - Claude always creates the session ID
let activeSession = null;
let serverPort = 3180;

// DOM elements
const joinView = document.getElementById('joinSessionView');
const activeView = document.getElementById('activeSessionView');
const sessionInput = document.getElementById('sessionIdInput');
const joinBtn = document.getElementById('joinSession');
const startBtn = document.getElementById('startCapture');
const endBtn = document.getElementById('endSession');
const joinStatus = document.getElementById('joinStatus');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check for saved session
  chrome.storage.local.get(['activeSession', 'serverPort'], (result) => {
    if (result.serverPort) {
      serverPort = result.serverPort;
    }
    
    if (result.activeSession) {
      activeSession = result.activeSession;
      showActiveSession();
    }
  });
  
  // Set up event listeners
  sessionInput.addEventListener('input', handleSessionInput);
  joinBtn.addEventListener('click', joinSession);
  startBtn.addEventListener('click', startCapturing);
  endBtn.addEventListener('click', endSession);
});

// Handle session ID input
function handleSessionInput(e) {
  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  e.target.value = value;
  
  // Enable join button when we have 6 characters
  joinBtn.disabled = value.length !== 6;
  
  // Clear any previous status
  if (value.length < 6) {
    joinStatus.style.display = 'none';
  }
}

// Join session created by Claude
async function joinSession() {
  const sessionId = sessionInput.value.trim();
  
  if (sessionId.length !== 6) {
    showStatus('Please enter a 6-character session ID', 'error');
    return;
  }
  
  // Check if server is running and session exists
  try {
    const response = await fetch(`http://localhost:${serverPort}/api/session/${sessionId}`);
    
    if (!response.ok) {
      // Server running but session doesn't exist - create it
      const sessionData = {
        id: sessionId,
        created: new Date().toISOString(),
        elements: []
      };
      
      // Try to create the session file
      const createResponse = await fetch(`http://localhost:${serverPort}/api/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      if (createResponse.ok) {
        activeSession = sessionData;
      } else {
        showStatus('Could not create session. Make sure the server is running.', 'error');
        return;
      }
    } else {
      // Session exists
      const sessionData = await response.json();
      activeSession = sessionData;
    }
    
    // Save to storage
    chrome.storage.local.set({ 
      activeSession: activeSession,
      lastSessionId: sessionId 
    });
    
    showActiveSession();
    
  } catch (error) {
    // Server not running - still allow joining for when server starts later
    showStatus('Server not detected. Start the server with: node claude-direct-server.js', 'info');
    
    // Create session locally
    activeSession = {
      id: sessionId,
      created: new Date().toISOString(),
      elements: []
    };
    
    chrome.storage.local.set({ 
      activeSession: activeSession,
      lastSessionId: sessionId 
    });
    
    showActiveSession();
  }
}

// Show active session view
function showActiveSession() {
  if (!activeSession) return;
  
  document.getElementById('currentSessionId').textContent = activeSession.id;
  
  const elementCount = activeSession.elements?.length || 0;
  if (elementCount > 0) {
    document.getElementById('elementCounter').style.display = 'block';
    document.getElementById('elementCount').textContent = elementCount;
  }
  
  joinView.style.display = 'none';
  activeView.style.display = 'block';
}

// Start capturing
async function startCapturing() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // First, inject the content script if needed
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-simple.js']
    });
  } catch (err) {
    // Script might already be injected, that's okay
  }
  
  // Small delay to ensure script is ready
  setTimeout(() => {
    chrome.tabs.sendMessage(tab.id, { 
      action: 'startCapturing',
      sessionId: activeSession.id,
      port: serverPort
    }, (response) => {
      if (chrome.runtime.lastError) {
        alert('Error: Please refresh the page and try again.\n\n' + chrome.runtime.lastError.message);
      } else if (response && response.status === 'started') {
        window.close();
      } else {
        alert('Could not start capturing. Please refresh the page.');
      }
    });
  }, 100);
}

// End session
function endSession() {
  chrome.storage.local.remove(['activeSession'], () => {
    activeSession = null;
    sessionInput.value = '';
    joinBtn.disabled = true;
    joinStatus.style.display = 'none';
    activeView.style.display = 'none';
    joinView.style.display = 'block';
  });
}

// Show status message
function showStatus(message, type = 'info') {
  joinStatus.textContent = message;
  joinStatus.className = `status-message ${type}`;
  joinStatus.style.display = 'block';
}

// Listen for element updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'elementSent' && activeSession) {
    // Update element count
    const currentCount = parseInt(document.getElementById('elementCount').textContent) || 0;
    document.getElementById('elementCounter').style.display = 'block';
    document.getElementById('elementCount').textContent = currentCount + 1;
  }
});