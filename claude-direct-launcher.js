#!/usr/bin/env node

// Claude Direct Launcher - Manages server lifecycle
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

let serverProcess = null;
const SERVER_PORT = 3180;
const PID_FILE = path.join(__dirname, '.claude-direct.pid');

// Check if server is already running
function isServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${SERVER_PORT}/api/sessions`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start the server
async function startServer() {
  if (await isServerRunning()) {
    console.log('Server is already running!');
    return true;
  }

  console.log('Starting Claude Direct server...');
  
  serverProcess = spawn('node', ['claude-direct-server.js'], {
    cwd: __dirname,
    detached: true,
    stdio: 'ignore'
  });

  // Save PID for later
  fs.writeFileSync(PID_FILE, serverProcess.pid.toString());
  
  // Detach from parent
  serverProcess.unref();
  
  // Wait for server to start
  let attempts = 0;
  while (attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (await isServerRunning()) {
      console.log('Server started successfully!');
      return true;
    }
    attempts++;
  }
  
  console.error('Failed to start server');
  return false;
}

// Stop the server
function stopServer() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
      process.kill(pid);
      fs.unlinkSync(PID_FILE);
      console.log('Server stopped');
    }
  } catch (error) {
    console.error('Error stopping server:', error.message);
  }
}

// Main
async function main() {
  const command = process.argv[2] || 'start';
  
  switch (command) {
    case 'start':
      await startServer();
      // Keep process alive briefly to ensure server starts
      setTimeout(() => process.exit(0), 2000);
      break;
      
    case 'stop':
      stopServer();
      break;
      
    case 'status':
      const running = await isServerRunning();
      console.log(`Server is ${running ? 'running' : 'not running'}`);
      break;
      
    default:
      console.log('Usage: node claude-direct-launcher.js [start|stop|status]');
  }
}

main().catch(console.error);