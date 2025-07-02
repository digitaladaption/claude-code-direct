#!/usr/bin/env node

// Claude Code Browser Session Manager
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Generate a 6-character session ID
function generateSessionId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Create session and return ID
async function createBrowserSession() {
  const sessionId = generateSessionId();
  const sessionsDir = path.join(__dirname, 'claude-sessions');
  
  // Ensure directory exists
  await fs.mkdir(sessionsDir, { recursive: true });
  
  // Create session file
  const sessionData = {
    id: sessionId,
    created: new Date().toISOString(),
    elements: []
  };
  
  const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
  await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
  
  return sessionId;
}

// Read session data
async function readSession(sessionId) {
  const sessionFile = path.join(__dirname, 'claude-sessions', `${sessionId}.json`);
  
  try {
    const data = await fs.readFile(sessionFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

// Display session elements
function displaySession(session) {
  if (!session) {
    console.log('Session not found or no data yet.');
    return;
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
}

// Main CLI
async function main() {
  const command = process.argv[2];
  const sessionId = process.argv[3];
  
  if (!command || command === 'help') {
    console.log('Usage:');
    console.log('  node browser-session.js create     - Create new session');
    console.log('  node browser-session.js read <ID>  - Read session data');
    return;
  }
  
  if (command === 'create') {
    const id = await createBrowserSession();
    console.log(`Session ID: ${id}`);
  } else if (command === 'read' && sessionId) {
    const session = await readSession(sessionId);
    displaySession(session);
  } else {
    console.log('Invalid command. Use "help" for usage.');
  }
}

// Export for use in Claude Code
module.exports = {
  createBrowserSession,
  readSession,
  displaySession
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}