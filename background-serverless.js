// Background service worker for serverless operation
let activeSession = null;

// Session data stored in a Windows-accessible location
const SESSION_FILE_PATH = 'C:\\Users\\hatto\\AppData\\Local\\ClaudeCodeDirect\\';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Claude Code Direct extension installed');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'createSession') {
    // Generate session ID
    const sessionId = generateSessionId();
    activeSession = {
      id: sessionId,
      created: new Date().toISOString(),
      elements: []
    };
    
    // Save to storage
    chrome.storage.local.set({ 
      activeSession: activeSession,
      sessionHistory: { [sessionId]: activeSession }
    });
    
    sendResponse({ sessionId });
  }
  
  else if (request.action === 'getActiveSession') {
    chrome.storage.local.get(['activeSession'], (result) => {
      sendResponse({ session: result.activeSession });
    });
    return true; // Keep channel open for async response
  }
  
  else if (request.action === 'setActiveSession') {
    chrome.storage.local.get(['sessionHistory'], (result) => {
      const session = result.sessionHistory?.[request.sessionId];
      if (session) {
        activeSession = session;
        chrome.storage.local.set({ activeSession: session });
        sendResponse({ success: true, session });
      } else {
        sendResponse({ success: false, error: 'Session not found' });
      }
    });
    return true;
  }
  
  else if (request.action === 'saveElement') {
    if (!activeSession) {
      sendResponse({ success: false, error: 'No active session' });
      return;
    }
    
    // Add element to session
    const element = {
      ...request.element,
      timestamp: new Date().toISOString()
    };
    
    chrome.storage.local.get(['sessionHistory'], (result) => {
      const history = result.sessionHistory || {};
      const session = history[activeSession.id];
      
      if (session) {
        session.elements.push(element);
        session.lastUpdated = new Date().toISOString();
        
        // Update storage
        chrome.storage.local.set({ 
          activeSession: session,
          sessionHistory: history
        }, () => {
          // Also save to file for Claude to read
          saveSessionToFile(session);
          sendResponse({ success: true });
        });
      }
    });
    return true;
  }
  
  else if (request.action === 'getAllSessions') {
    chrome.storage.local.get(['sessionHistory'], (result) => {
      const sessions = Object.values(result.sessionHistory || {});
      sendResponse({ sessions });
    });
    return true;
  }
});

// Generate 6-character session ID
function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Save session data to file (for Claude to read)
async function saveSessionToFile(session) {
  try {
    // Create a blob with the session data
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Download to Downloads folder with session ID as filename
    chrome.downloads.download({
      url: url,
      filename: `claude-session-${session.id}.json`,
      saveAs: false,
      conflictAction: 'overwrite'
    }, (downloadId) => {
      // Clean up
      URL.revokeObjectURL(url);
    });
  } catch (error) {
    console.error('Error saving session file:', error);
  }
}