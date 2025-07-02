// Popup script for serverless operation
let currentView = 'no-session';
let activeSession = null;

// DOM elements
const views = {
  noSession: document.getElementById('noSessionView'),
  joinSession: document.getElementById('joinSessionView'),
  activeSession: document.getElementById('activeSessionView')
};

const buttons = {
  newMode: document.getElementById('newSessionMode'),
  joinMode: document.getElementById('joinSessionMode'),
  createNew: document.getElementById('createNewSession'),
  join: document.getElementById('joinSession'),
  start: document.getElementById('startCapture'),
  end: document.getElementById('endSession')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Check for active session
  chrome.runtime.sendMessage({ action: 'getActiveSession' }, (response) => {
    if (response.session) {
      activeSession = response.session;
      showActiveSession();
    } else {
      showView('noSession');
    }
  });
  
  // Set up event listeners
  buttons.newMode.addEventListener('click', () => {
    setMode('new');
    showView('noSession');
  });
  
  buttons.joinMode.addEventListener('click', () => {
    setMode('join');
    showView('joinSession');
  });
  
  buttons.createNew.addEventListener('click', createNewSession);
  buttons.join.addEventListener('click', joinSession);
  buttons.start.addEventListener('click', startCapturing);
  buttons.end.addEventListener('click', endSession);
  
  // Session ID input formatting
  document.getElementById('sessionIdInput').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
});

// View management
function showView(viewName) {
  Object.keys(views).forEach(key => {
    views[key].style.display = key === viewName ? 'block' : 'none';
  });
}

function setMode(mode) {
  buttons.newMode.classList.toggle('active', mode === 'new');
  buttons.joinMode.classList.toggle('active', mode === 'join');
}

// Create new session
async function createNewSession() {
  chrome.runtime.sendMessage({ action: 'createSession' }, (response) => {
    if (response.sessionId) {
      chrome.runtime.sendMessage({ action: 'getActiveSession' }, (res) => {
        activeSession = res.session;
        showActiveSession();
        
        // Copy session ID to clipboard
        navigator.clipboard.writeText(response.sessionId).then(() => {
          showNotification('Session ID copied to clipboard!');
        });
      });
    }
  });
}

// Join existing session
async function joinSession() {
  const sessionId = document.getElementById('sessionIdInput').value.trim();
  
  if (sessionId.length !== 6) {
    showNotification('Please enter a 6-character session ID', 'error');
    return;
  }
  
  // For now, create a new session with this ID
  activeSession = {
    id: sessionId,
    created: new Date().toISOString(),
    elements: []
  };
  
  chrome.runtime.sendMessage({ 
    action: 'setActiveSession', 
    sessionId: sessionId 
  }, (response) => {
    if (response.success) {
      activeSession = response.session;
      showActiveSession();
    } else {
      // Create new session with this ID
      chrome.storage.local.get(['sessionHistory'], (result) => {
        const history = result.sessionHistory || {};
        history[sessionId] = activeSession;
        
        chrome.storage.local.set({ 
          activeSession: activeSession,
          sessionHistory: history
        }, () => {
          showActiveSession();
        });
      });
    }
  });
}

// Show active session
function showActiveSession() {
  if (!activeSession) return;
  
  document.getElementById('currentSessionId').textContent = activeSession.id;
  document.getElementById('helpSessionId').textContent = activeSession.id;
  
  // Format creation time
  const created = new Date(activeSession.created);
  const now = new Date();
  const diff = now - created;
  const minutes = Math.floor(diff / 60000);
  
  let timeText = 'Created ';
  if (minutes < 1) {
    timeText += 'just now';
  } else if (minutes < 60) {
    timeText += `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    const hours = Math.floor(minutes / 60);
    timeText += `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  document.getElementById('sessionInfo').textContent = timeText;
  
  // Update element count
  const elementCount = activeSession.elements?.length || 0;
  if (elementCount > 0) {
    document.getElementById('elementCounter').style.display = 'block';
    document.getElementById('elementCount').textContent = elementCount;
  }
  
  showView('activeSession');
}

// Start capturing
async function startCapturing() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { 
    action: 'startCapturing',
    sessionId: activeSession.id
  }, (response) => {
    if (chrome.runtime.lastError) {
      showNotification('Error: Refresh the page and try again', 'error');
    } else if (response && response.status === 'started') {
      window.close();
    }
  });
}

// End session
function endSession() {
  if (confirm('End this session? You can rejoin using the session ID.')) {
    chrome.storage.local.remove(['activeSession'], () => {
      activeSession = null;
      showView('noSession');
      setMode('new');
    });
  }
}

// Show notification
function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: ${type === 'error' ? '#dc3545' : '#28a745'};
    color: white;
    border-radius: 6px;
    font-size: 14px;
    z-index: 1000;
    animation: slideUp 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Listen for element updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'elementSaved' && activeSession) {
    // Update element count
    chrome.runtime.sendMessage({ action: 'getActiveSession' }, (response) => {
      if (response.session) {
        activeSession = response.session;
        const elementCount = activeSession.elements?.length || 0;
        document.getElementById('elementCounter').style.display = 'block';
        document.getElementById('elementCount').textContent = elementCount;
      }
    });
  }
});