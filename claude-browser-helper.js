// Claude Code Browser Extension Helper
// This file helps Claude read element data from browser sessions

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Get downloads folder path
function getDownloadsPath() {
  return path.join(os.homedir(), 'Downloads');
}

// Read session data by ID
async function readBrowserSession(sessionId) {
  const downloadsPath = getDownloadsPath();
  const sessionFile = path.join(downloadsPath, `claude-session-${sessionId}.json`);
  
  try {
    const data = await fs.readFile(sessionFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Try alternate locations
    const locations = [
      path.join(process.cwd(), `claude-session-${sessionId}.json`),
      path.join(os.tmpdir(), `claude-session-${sessionId}.json`),
      `/mnt/c/Users/hatto/Downloads/claude-session-${sessionId}.json`
    ];
    
    for (const location of locations) {
      try {
        const data = await fs.readFile(location, 'utf8');
        return JSON.parse(data);
      } catch (err) {
        // Continue to next location
      }
    }
    
    throw new Error(`Session ${sessionId} not found in any known location`);
  }
}

// Format element for display
function formatElement(element, index) {
  console.log(`\n[Element ${index + 1}]`);
  console.log(`URL: ${element.url}`);
  console.log(`Tag: ${element.tagName}`);
  if (element.id) console.log(`ID: ${element.id}`);
  if (element.className) console.log(`Class: ${element.className}`);
  console.log(`Selector: ${element.selector}`);
  
  if (element.text && element.text.trim()) {
    console.log(`Text: ${element.text.substring(0, 100)}${element.text.length > 100 ? '...' : ''}`);
  }
  
  if (element.note) {
    console.log(`\n📝 Note: ${element.note}`);
  }
  
  console.log(`Position: ${element.position.width}x${element.position.height} at (${element.position.left}, ${element.position.top})`);
  console.log(`Time: ${new Date(element.timestamp).toLocaleString()}`);
  console.log('---');
}

// Main function to read and display session
async function displayBrowserSession(sessionId) {
  try {
    const session = await readBrowserSession(sessionId);
    
    console.log(`\n🌐 Browser Session: ${session.id}`);
    console.log(`Created: ${new Date(session.created).toLocaleString()}`);
    console.log(`Elements captured: ${session.elements.length}\n`);
    
    if (session.elements.length === 0) {
      console.log('No elements captured yet.');
      return session;
    }
    
    session.elements.forEach((element, index) => {
      formatElement(element, index);
    });
    
    return session;
  } catch (error) {
    console.error(`Error reading session: ${error.message}`);
    return null;
  }
}

// Export for use
module.exports = {
  readBrowserSession,
  displayBrowserSession
};

// If run directly
if (require.main === module) {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.log('Usage: node claude-browser-helper.js <SESSION_ID>');
    process.exit(1);
  }
  
  displayBrowserSession(sessionId);
}