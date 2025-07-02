const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const PORT = 3180;
const ANNOTATIONS_FILE = 'annotations.json';
const SESSIONS_FILE = 'sessions.json';

// In-memory store for active sessions
const activeSessions = new Map();
const sessionPolls = new Map();

// Session structure:
// {
//   sessionId: string,
//   claudeCodeId: string,
//   urls: string[],
//   createdAt: Date,
//   lastActivity: Date,
//   pendingAnnotations: []
// }

// Helper to save sessions to disk
async function saveSessions() {
  const sessions = Array.from(activeSessions.entries()).map(([id, session]) => ({
    id,
    ...session,
    pendingAnnotations: undefined // Don't persist pending annotations
  }));
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

// Helper to load sessions from disk
async function loadSessions() {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf8');
    const sessions = JSON.parse(data);
    sessions.forEach(session => {
      activeSessions.set(session.id, {
        ...session,
        pendingAnnotations: []
      });
    });
  } catch (err) {
    // File doesn't exist, start fresh
  }
}

// Clean up stale sessions (older than 24 hours)
function cleanupSessions() {
  const now = Date.now();
  const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [id, session] of activeSessions.entries()) {
    if (now - new Date(session.lastActivity).getTime() > staleThreshold) {
      activeSessions.delete(id);
      sessionPolls.delete(id);
    }
  }
}

// Create server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Register a new Claude Code session
  if (req.url === '/api/session/register' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { claudeCodeId } = JSON.parse(body);
        const sessionId = crypto.randomBytes(16).toString('hex');
        
        const session = {
          sessionId,
          claudeCodeId,
          urls: [],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          pendingAnnotations: []
        };
        
        activeSessions.set(sessionId, session);
        await saveSessions();
        
        console.log(`\n--- New Session Registered ---`);
        console.log(`Session ID: ${sessionId}`);
        console.log(`Claude Code ID: ${claudeCodeId}`);
        console.log(`-------------------------------\n`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sessionId }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  }
  
  // Link URL to session
  else if (req.url === '/api/session/link-url' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { sessionId, url } = JSON.parse(body);
        const session = activeSessions.get(sessionId);
        
        if (!session) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Session not found' }));
          return;
        }
        
        if (!session.urls.includes(url)) {
          session.urls.push(url);
        }
        session.lastActivity = new Date().toISOString();
        await saveSessions();
        
        console.log(`Linked URL ${url} to session ${sessionId}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  }
  
  // Find session by URL
  else if (req.url.startsWith('/api/session/find-by-url') && req.method === 'GET') {
    const urlParams = new URL(req.url, `http://localhost:${PORT}`);
    const targetUrl = urlParams.searchParams.get('url');
    
    let foundSession = null;
    for (const [id, session] of activeSessions.entries()) {
      if (session.urls.some(url => targetUrl.startsWith(url))) {
        foundSession = { id, ...session };
        break;
      }
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ session: foundSession }));
  }
  
  // Handle live annotation with session routing
  else if (req.url === '/api/annotation' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const annotation = JSON.parse(body);
        annotation.receivedAt = new Date().toISOString();
        
        // Find matching session based on URL
        let targetSession = null;
        const annotationUrl = annotation.element.url;
        
        for (const [id, session] of activeSessions.entries()) {
          if (session.urls.some(url => annotationUrl.startsWith(url))) {
            targetSession = session;
            break;
          }
        }
        
        if (targetSession) {
          // Add to pending annotations for live delivery
          targetSession.pendingAnnotations.push(annotation);
          targetSession.lastActivity = new Date().toISOString();
          
          console.log(`\n--- Live Annotation for Session ---`);
          console.log(`Session: ${targetSession.sessionId}`);
          console.log(`URL: ${annotation.element.url}`);
          console.log(`Element: ${annotation.element.selector}`);
          console.log(`Note: ${annotation.note}`);
          console.log(`-----------------------------------\n`);
          
          // Notify any waiting polls
          const pollResolve = sessionPolls.get(targetSession.sessionId);
          if (pollResolve) {
            sessionPolls.delete(targetSession.sessionId);
            pollResolve();
          }
        }
        
        // Still save to file for persistence
        let annotations = [];
        try {
          const data = await fs.readFile(ANNOTATIONS_FILE, 'utf8');
          annotations = JSON.parse(data);
        } catch (err) {}
        
        annotations.push(annotation);
        await fs.writeFile(ANNOTATIONS_FILE, JSON.stringify(annotations, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Annotation saved',
          sessionFound: !!targetSession 
        }));
      } catch (error) {
        console.error('Error processing annotation:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  }
  
  // Poll for new annotations (long polling)
  else if (req.url.startsWith('/api/session/poll') && req.method === 'GET') {
    const urlParams = new URL(req.url, `http://localhost:${PORT}`);
    const sessionId = urlParams.searchParams.get('sessionId');
    
    const session = activeSessions.get(sessionId);
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Session not found' }));
      return;
    }
    
    // If there are pending annotations, return them immediately
    if (session.pendingAnnotations.length > 0) {
      const annotations = session.pendingAnnotations.splice(0);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ annotations }));
      return;
    }
    
    // Otherwise, wait for new annotations (long polling)
    const timeout = setTimeout(() => {
      sessionPolls.delete(sessionId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ annotations: [] }));
    }, 30000); // 30 second timeout
    
    sessionPolls.set(sessionId, () => {
      clearTimeout(timeout);
      const annotations = session.pendingAnnotations.splice(0);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ annotations }));
    });
  }
  
  // Get all active sessions
  else if (req.url === '/api/sessions' && req.method === 'GET') {
    const sessions = Array.from(activeSessions.entries()).map(([id, session]) => ({
      id,
      ...session,
      pendingAnnotations: session.pendingAnnotations.length
    }));
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ sessions }));
  }
  
  // Get all annotations (backward compatibility)
  else if (req.url === '/api/annotations' && req.method === 'GET') {
    try {
      const data = await fs.readFile(ANNOTATIONS_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
  }
  
  // Default response
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Initialize and start server
(async () => {
  await loadSessions();
  
  // Cleanup sessions periodically
  setInterval(cleanupSessions, 60 * 60 * 1000); // Every hour
  
  server.listen(PORT, () => {
    console.log(`Claude Code Live Annotation Server running on port ${PORT}`);
    console.log(`Active sessions: ${activeSessions.size}`);
    console.log('\nEndpoints:');
    console.log(`  POST /api/session/register - Register new Claude Code session`);
    console.log(`  POST /api/session/link-url - Link URL to session`);
    console.log(`  GET  /api/session/find-by-url?url=... - Find session by URL`);
    console.log(`  GET  /api/session/poll?sessionId=... - Poll for new annotations`);
    console.log(`  POST /api/annotation - Submit annotation`);
    console.log(`  GET  /api/sessions - List all active sessions`);
    console.log(`  GET  /api/annotations - View all saved annotations`);
  });
})();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});