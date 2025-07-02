const http = require('http');
const readline = require('readline');
const crypto = require('crypto');

// Configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 3180;
const CLAUDE_CODE_ID = process.env.CLAUDE_CODE_SESSION_ID || crypto.randomBytes(8).toString('hex');

let sessionId = null;
let isPolling = false;

// Helper to make HTTP requests
function makeRequest(options, data = null) {
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

// Register this Claude Code session with the server
async function registerSession() {
  console.log(`Registering Claude Code session: ${CLAUDE_CODE_ID}`);
  
  const response = await makeRequest({
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/session/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, { claudeCodeId: CLAUDE_CODE_ID });
  
  if (response.success) {
    sessionId = response.sessionId;
    console.log(`✓ Session registered: ${sessionId}`);
    return sessionId;
  } else {
    throw new Error(`Failed to register session: ${response.error}`);
  }
}

// Link a URL to this session
async function linkUrl(url) {
  if (!sessionId) {
    throw new Error('No active session');
  }
  
  const response = await makeRequest({
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/session/link-url',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, { sessionId, url });
  
  if (response.success) {
    console.log(`✓ Linked URL: ${url}`);
  } else {
    throw new Error(`Failed to link URL: ${response.error}`);
  }
}

// Poll for new annotations
async function pollForAnnotations() {
  if (!sessionId || isPolling) return;
  
  isPolling = true;
  console.log('Polling for annotations...');
  
  try {
    const response = await makeRequest({
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: `/api/session/poll?sessionId=${sessionId}`,
      method: 'GET'
    });
    
    if (response.annotations && response.annotations.length > 0) {
      console.log(`\n📌 Received ${response.annotations.length} new annotation(s):\n`);
      
      response.annotations.forEach((annotation, index) => {
        console.log(`[${index + 1}] ${annotation.element.url}`);
        console.log(`    Element: ${annotation.element.selector}`);
        console.log(`    Text: ${annotation.element.text?.substring(0, 50)}...`);
        console.log(`    Note: ${annotation.note}`);
        console.log(`    Attributes:`, annotation.element.attributes);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Polling error:', error.message);
  } finally {
    isPolling = false;
    // Continue polling
    setTimeout(() => pollForAnnotations(), 1000);
  }
}

// Interactive CLI
function startCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'claude-code> '
  });
  
  console.log('\nClaude Code Annotation Client');
  console.log('Commands:');
  console.log('  link <url>    - Link a URL pattern to this session');
  console.log('  status        - Show session status');
  console.log('  sessions      - List all active sessions');
  console.log('  exit          - Exit the client\n');
  
  rl.prompt();
  
  rl.on('line', async (line) => {
    const [command, ...args] = line.trim().split(' ');
    
    try {
      switch (command) {
        case 'link':
          if (args.length === 0) {
            console.log('Usage: link <url>');
          } else {
            await linkUrl(args.join(' '));
          }
          break;
          
        case 'status':
          console.log(`Session ID: ${sessionId}`);
          console.log(`Claude Code ID: ${CLAUDE_CODE_ID}`);
          console.log(`Server: ${SERVER_HOST}:${SERVER_PORT}`);
          console.log(`Polling: ${isPolling ? 'Active' : 'Stopped'}`);
          break;
          
        case 'sessions':
          const response = await makeRequest({
            hostname: SERVER_HOST,
            port: SERVER_PORT,
            path: '/api/sessions',
            method: 'GET'
          });
          
          console.log('\nActive Sessions:');
          response.sessions.forEach(session => {
            console.log(`  ${session.id} - URLs: ${session.urls.join(', ') || 'none'}`);
            console.log(`    Created: ${session.createdAt}`);
            console.log(`    Pending: ${session.pendingAnnotations} annotations`);
          });
          break;
          
        case 'exit':
          console.log('Goodbye!');
          process.exit(0);
          break;
          
        default:
          console.log('Unknown command. Type "help" for available commands.');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
    
    rl.prompt();
  });
  
  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}

// Main
async function main() {
  try {
    // Register session
    await registerSession();
    
    // Start polling for annotations
    pollForAnnotations();
    
    // Start interactive CLI
    startCLI();
    
  } catch (error) {
    console.error('Failed to start client:', error.message);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = {
  registerSession,
  linkUrl,
  pollForAnnotations,
  sessionId: () => sessionId
};

// Run if called directly
if (require.main === module) {
  main();
}