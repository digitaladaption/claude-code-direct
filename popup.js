// Check session status on load
async function checkSessionStatus() {
  const port = document.getElementById('port').value;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  try {
    const response = await fetch(`http://localhost:${port}/api/session/find-by-url?url=${encodeURIComponent(tab.url)}`);
    const data = await response.json();
    
    const dot = document.getElementById('connectionDot');
    const text = document.getElementById('connectionText');
    
    if (data.session) {
      dot.classList.add('connected');
      text.textContent = `Connected to Claude Code session`;
      return true;
    } else {
      // Check if server is running
      const sessionsResponse = await fetch(`http://localhost:${port}/api/sessions`);
      const sessionsData = await sessionsResponse.json();
      
      if (sessionsData.sessions && sessionsData.sessions.length > 0) {
        dot.classList.add('partial');
        text.textContent = `Server running (${sessionsData.sessions.length} sessions)`;
      } else {
        dot.classList.add('partial');
        text.textContent = 'Server running, no active sessions';
      }
      return false;
    }
  } catch (error) {
    document.getElementById('connectionDot').classList.remove('connected', 'partial');
    document.getElementById('connectionText').textContent = 'Server not running';
    return false;
  }
}

document.getElementById('startAnnotating').addEventListener('click', async () => {
  const port = document.getElementById('port').value;
  
  // Save port preference
  chrome.storage.local.set({ claudeCodePort: port });
  
  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if there's a session for this URL
  const hasSession = await checkSessionStatus();
  
  // Send message to content script
  chrome.tabs.sendMessage(tab.id, { 
    action: 'startAnnotating',
    port: port,
    hasSession: hasSession
  }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
    } else if (response && response.status === 'started') {
      showStatus('Annotation mode activated! Click any element on the page.', 'success');
      setTimeout(() => window.close(), 1500);
    }
  });
});

// Port input change handler
document.getElementById('port').addEventListener('change', () => {
  checkSessionStatus();
});

// Load saved port and check status
chrome.storage.local.get(['claudeCodePort'], (result) => {
  if (result.claudeCodePort) {
    document.getElementById('port').value = result.claudeCodePort;
  }
  checkSessionStatus();
});

// Refresh status every 2 seconds while popup is open
setInterval(checkSessionStatus, 2000);

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.display = 'block';
  status.style.background = type === 'error' ? '#fee' : '#efe';
  status.style.color = type === 'error' ? '#c00' : '#060';
}