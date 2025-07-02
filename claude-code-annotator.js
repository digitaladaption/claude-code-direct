#!/usr/bin/env node

const http = require('http');
const crypto = require('crypto');

// Configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 3180;

class ClaudeCodeAnnotator {
  constructor() {
    this.sessionId = null;
    this.claudeCodeId = crypto.randomBytes(8).toString('hex');
    this.pollInterval = null;
  }

  // Make HTTP requests
  async request(options, data = null) {
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

  // Connect to the annotation server
  async connect() {
    try {
      // Register session
      const response = await this.request({
        hostname: SERVER_HOST,
        port: SERVER_PORT,
        path: '/api/session/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { claudeCodeId: this.claudeCodeId });

      if (response.success) {
        this.sessionId = response.sessionId;
        console.log(`✓ Connected to annotation server`);
        console.log(`  Session ID: ${this.sessionId}`);
        return true;
      }
    } catch (error) {
      console.error('Failed to connect:', error.message);
      return false;
    }
  }

  // Link a URL to this session
  async linkUrl(url) {
    if (!this.sessionId) {
      throw new Error('Not connected to server');
    }

    const response = await this.request({
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/api/session/link-url',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { sessionId: this.sessionId, url });

    if (response.success) {
      console.log(`✓ Linked URL: ${url}`);
      return true;
    }
    return false;
  }

  // Start watching for annotations
  async watchAnnotations(callback) {
    if (!this.sessionId) {
      throw new Error('Not connected to server');
    }

    const poll = async () => {
      try {
        const response = await this.request({
          hostname: SERVER_HOST,
          port: SERVER_PORT,
          path: `/api/session/poll?sessionId=${this.sessionId}`,
          method: 'GET'
        });

        if (response.annotations && response.annotations.length > 0) {
          for (const annotation of response.annotations) {
            callback(annotation);
          }
        }
      } catch (error) {
        console.error('Polling error:', error.message);
      }
    };

    // Start polling
    this.pollInterval = setInterval(poll, 1000);
    poll(); // Initial poll
  }

  // Stop watching
  stopWatching() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Get all saved annotations
  async getAllAnnotations() {
    const response = await this.request({
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/api/annotations',
      method: 'GET'
    });
    return response;
  }
}

// Export for use in other scripts
module.exports = ClaudeCodeAnnotator;

// Example usage when run directly
if (require.main === module) {
  const annotator = new ClaudeCodeAnnotator();
  
  async function main() {
    // Connect to server
    const connected = await annotator.connect();
    if (!connected) {
      console.error('Could not connect to annotation server');
      console.error('Make sure claude-code-server-live.js is running');
      process.exit(1);
    }

    // Get URL from command line or use example
    const url = process.argv[2] || 'https://example.com';
    
    // Link URL
    await annotator.linkUrl(url);
    
    console.log('\nWatching for annotations...');
    console.log('Use the browser extension to annotate elements on:', url);
    console.log('Press Ctrl+C to stop\n');

    // Watch for annotations
    await annotator.watchAnnotations((annotation) => {
      console.log('\n📌 New Annotation:');
      console.log('  URL:', annotation.element.url);
      console.log('  Element:', annotation.element.selector);
      console.log('  Note:', annotation.note);
      console.log('  Text:', annotation.element.text?.substring(0, 100) + '...');
      console.log('');
    });
  }

  main().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    annotator.stopWatching();
    console.log('\nStopped watching annotations');
    process.exit(0);
  });
}