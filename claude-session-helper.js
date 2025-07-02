const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const SERVER_PORT = 3180;
const DATA_DIR = path.join(__dirname, 'claude-sessions');

// Helper to make HTTP requests
function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          resolve(body);
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Create a new session for this Claude Code instance
async function createSession() {
  try {
    const response = await request({
      hostname: 'localhost',
      port: SERVER_PORT,
      path: '/api/session/create',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    return response.sessionId;
  } catch (error) {
    // If server is not running, create session ID locally
    const crypto = require('crypto');
    const sessionId = crypto.randomBytes(3).toString('hex').toUpperCase();
    console.log(`Server not running. Created local session ID: ${sessionId}`);
    return sessionId;
  }
}

// Read elements for a session
async function readSessionElements(sessionId) {
  try {
    // Try to get from server first
    const response = await request({
      hostname: 'localhost',
      port: SERVER_PORT,
      path: `/api/session/${sessionId}`,
      method: 'GET'
    });
    
    if (response.error) {
      return null;
    }
    
    return response.elements || [];
  } catch (error) {
    // If server is not running, try to read local file
    try {
      const sessionFile = path.join(DATA_DIR, `${sessionId}.json`);
      const data = await fs.readFile(sessionFile, 'utf8');
      const session = JSON.parse(data);
      return session.elements || [];
    } catch (err) {
      return null;
    }
  }
}

// Export functions
module.exports = {
  createSession,
  readSessionElements
};