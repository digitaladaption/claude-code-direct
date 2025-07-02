// Session Bridge - Helps transfer data between Chrome extension and Claude
// This creates a simple file-based exchange in a known location

const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = 'C:\\Users\\hatto\\AppData\\Local\\ClaudeCodeDirect\\sessions';

// Ensure directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Write session data
function writeSession(sessionId, data) {
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Session ${sessionId} written to ${filePath}`);
}

// Read session data
function readSession(sessionId) {
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }
  return null;
}

// List all sessions
function listSessions() {
  const files = fs.readdirSync(SESSIONS_DIR);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

// Export for use
module.exports = {
  writeSession,
  readSession,
  listSessions,
  SESSIONS_DIR
};