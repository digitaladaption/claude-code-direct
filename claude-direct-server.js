const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const PORT = 3180;
const DATA_DIR = path.join(__dirname, 'claude-sessions');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {}
}

// Create server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Create a new session
  if (req.url === '/api/session/create' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    
    req.on('end', async () => {
      try {
        let sessionId;
        
        // Check if body contains a specific sessionId
        if (body) {
          try {
            const data = JSON.parse(body);
            sessionId = data.sessionId;
          } catch (e) {
            // Body is not JSON, ignore
          }
        }
        
        // Generate random ID if not provided
        if (!sessionId) {
          sessionId = crypto.randomBytes(3).toString('hex').toUpperCase();
        }
        
        const sessionFile = path.join(DATA_DIR, `${sessionId}.json`);
        
        const sessionData = {
          id: sessionId,
          created: new Date().toISOString(),
          elements: []
        };
        
        await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
        
        console.log(`Session created: ${sessionId}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessionId }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }
  
  // Send element to a session
  else if (req.url.startsWith('/api/session/') && req.url.endsWith('/element') && req.method === 'POST') {
    const sessionId = req.url.split('/')[3];
    const sessionFile = path.join(DATA_DIR, `${sessionId}.json`);
    
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    
    req.on('end', async () => {
      try {
        // Check if session exists
        let sessionData;
        try {
          const data = await fs.readFile(sessionFile, 'utf8');
          sessionData = JSON.parse(data);
        } catch (err) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Session not found' }));
          return;
        }
        
        // Add element
        const element = JSON.parse(body);
        element.timestamp = new Date().toISOString();
        sessionData.elements.push(element);
        
        // Save
        await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
        
        console.log(`\n📌 Element received for session ${sessionId}`);
        console.log(`   URL: ${element.url}`);
        console.log(`   Selector: ${element.selector}`);
        console.log(`   Note: ${element.note || 'No note'}\n`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }
  
  // Get session data
  else if (req.url.startsWith('/api/session/') && req.method === 'GET') {
    const sessionId = req.url.split('/')[3];
    const sessionFile = path.join(DATA_DIR, `${sessionId}.json`);
    
    try {
      const data = await fs.readFile(sessionFile, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
    }
  }
  
  // List all sessions
  else if (req.url === '/api/sessions' && req.method === 'GET') {
    try {
      const files = await fs.readdir(DATA_DIR);
      const sessions = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
          const session = JSON.parse(data);
          sessions.push({
            id: session.id,
            created: session.created,
            elementCount: session.elements.length
          });
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessions }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessions: [] }));
    }
  }
  
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Initialize and start
(async () => {
  await ensureDataDir();
  
  server.listen(PORT, () => {
    console.log(`Claude Direct Server running on port ${PORT}`);
    console.log(`Session data stored in: ${DATA_DIR}`);
    console.log('\nEndpoints:');
    console.log(`  POST /api/session/create - Create new session`);
    console.log(`  POST /api/session/{ID}/element - Send element to session`);
    console.log(`  GET  /api/session/{ID} - Get session data`);
    console.log(`  GET  /api/sessions - List all sessions`);
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