// Claude Code Browser Session Reader
// Reads session data from the known storage location

const fs = require('fs').promises;
const path = require('path');

// Known location for session data
const SESSIONS_DIR = '/mnt/c/Users/hatto/AppData/Local/ClaudeCodeDirect/sessions';

// Read session by ID
async function readBrowserSession(sessionId) {
  const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);
  
  try {
    const data = await fs.readFile(sessionFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Session might not exist yet
    return null;
  }
}

// Display session data
async function displaySession(sessionId) {
  const session = await readBrowserSession(sessionId);
  
  if (!session) {
    console.log(`Session ${sessionId} not found or no data yet.`);
    console.log(`Make sure you've captured elements in the browser extension.`);
    return null;
  }
  
  console.log(`\n🌐 Browser Session: ${session.id}`);
  console.log(`Created: ${new Date(session.created).toLocaleString()}`);
  console.log(`Elements: ${session.elements.length}\n`);
  
  session.elements.forEach((element, index) => {
    console.log(`[${index + 1}] ${element.tagName} - ${element.selector}`);
    if (element.note) {
      console.log(`   📝 "${element.note}"`);
    }
    console.log(`   URL: ${element.url}`);
    if (element.text && element.text.trim()) {
      console.log(`   Text: "${element.text.substring(0, 100)}..."`);
    }
    console.log('');
  });
  
  return session;
}

// Create session file for extension to detect
async function createSessionFile(sessionId) {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
  
  const session = {
    id: sessionId,
    created: new Date().toISOString(),
    elements: []
  };
  
  const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);
  await fs.writeFile(sessionFile, JSON.stringify(session, null, 2));
  
  return session;
}

module.exports = {
  readBrowserSession,
  displaySession,
  createSessionFile
};