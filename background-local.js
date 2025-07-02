// Background service worker with local file storage
let activeSession = null;

// Session data location - fixed path that Claude can read
const DATA_DIR = 'C:\\Users\\hatto\\AppData\\Local\\ClaudeCodeDirect\\sessions\\';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Claude Code Direct extension installed');
  // Initialize storage
  chrome.storage.local.set({ 
    sessions: {},
    dataDir: DATA_DIR 
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'createSession') {
    const sessionId = generateSessionId();
    activeSession = {
      id: sessionId,
      created: new Date().toISOString(),
      elements: []
    };
    
    // Save to storage
    chrome.storage.local.get(['sessions'], (result) => {
      const sessions = result.sessions || {};
      sessions[sessionId] = activeSession;
      
      chrome.storage.local.set({ 
        activeSession: activeSession,
        sessions: sessions,
        lastSessionId: sessionId
      }, () => {
        // Write to file system for Claude
        writeSessionToFile(activeSession);
        sendResponse({ sessionId });
      });
    });
    return true;
  }
  
  else if (request.action === 'getActiveSession') {
    chrome.storage.local.get(['activeSession'], (result) => {
      sendResponse({ session: result.activeSession });
    });
    return true;
  }
  
  else if (request.action === 'setActiveSession') {
    chrome.storage.local.get(['sessions'], (result) => {
      const sessions = result.sessions || {};
      let session = sessions[request.sessionId];
      
      if (!session) {
        // Create new session with provided ID
        session = {
          id: request.sessionId,
          created: new Date().toISOString(),
          elements: []
        };
        sessions[request.sessionId] = session;
      }
      
      activeSession = session;
      chrome.storage.local.set({ 
        activeSession: session,
        sessions: sessions,
        lastSessionId: request.sessionId
      }, () => {
        writeSessionToFile(session);
        sendResponse({ success: true, session });
      });
    });
    return true;
  }
  
  else if (request.action === 'saveElement') {
    if (!activeSession) {
      sendResponse({ success: false, error: 'No active session' });
      return;
    }
    
    const element = {
      ...request.element,
      timestamp: new Date().toISOString()
    };
    
    chrome.storage.local.get(['sessions'], (result) => {
      const sessions = result.sessions || {};
      const session = sessions[activeSession.id];
      
      if (session) {
        session.elements.push(element);
        session.lastUpdated = new Date().toISOString();
        
        // Update storage
        chrome.storage.local.set({ 
          activeSession: session,
          sessions: sessions
        }, () => {
          // Write updated session to file
          writeSessionToFile(session);
          sendResponse({ success: true });
        });
      }
    });
    return true;
  }
  
  else if (request.action === 'getAllSessions') {
    chrome.storage.local.get(['sessions'], (result) => {
      const sessions = Object.values(result.sessions || {});
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

// Write session data to file for Claude to read
async function writeSessionToFile(session) {
  try {
    // Use native messaging to write file
    const message = {
      action: 'writeSession',
      sessionId: session.id,
      data: JSON.stringify(session, null, 2)
    };
    
    // For now, store in chrome.storage.local with a special key
    // that indicates it's ready for Claude to read
    chrome.storage.local.set({
      [`claude_session_${session.id}`]: session
    });
    
    // Also maintain a simple index
    chrome.storage.local.get(['claude_sessions_index'], (result) => {
      const index = result.claude_sessions_index || [];
      if (!index.includes(session.id)) {
        index.push(session.id);
        chrome.storage.local.set({ claude_sessions_index: index });
      }
    });
    
    console.log(`Session ${session.id} saved for Claude access`);
  } catch (error) {
    console.error('Error saving session:', error);
  }
}