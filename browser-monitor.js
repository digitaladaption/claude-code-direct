#!/usr/bin/env node

// Browser Session Monitor - Watches for new elements in real-time
const fs = require('fs');
const path = require('path');

class BrowserMonitor {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.sessionFile = path.join(__dirname, 'claude-sessions', `${sessionId}.json`);
    this.lastElementCount = 0;
    this.watchInterval = null;
  }

  // Read current session data
  readSession() {
    try {
      const data = fs.readFileSync(this.sessionFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  // Format element for display
  formatElement(element, index) {
    const output = [];
    output.push(`\n🔍 New Element Captured [#${index + 1}]`);
    output.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    output.push(`📍 URL: ${element.url}`);
    output.push(`🏷️  Element: <${element.tagName.toLowerCase()}${element.id ? ` id="${element.id}"` : ''}${element.className ? ` class="${element.className}"` : ''}>`);
    output.push(`📐 Position: ${element.position.width}×${element.position.height} at (${Math.round(element.position.left)}, ${Math.round(element.position.top)})`);
    
    if (element.text && element.text.trim()) {
      output.push(`📝 Text: "${element.text.substring(0, 100)}${element.text.length > 100 ? '...' : ''}"`);
    }
    
    if (element.href) {
      output.push(`🔗 Link: ${element.href}`);
    }
    
    if (element.note) {
      output.push(`\n💭 Your Note: "${element.note}"`);
    }
    
    output.push(`⏰ Captured: ${new Date(element.timestamp).toLocaleTimeString()}`);
    output.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    return output.join('\n');
  }

  // Check for new elements
  checkForUpdates() {
    const session = this.readSession();
    if (!session) return;

    const currentCount = session.elements.length;
    
    if (currentCount > this.lastElementCount) {
      // New elements detected
      const newElements = session.elements.slice(this.lastElementCount);
      
      newElements.forEach((element, i) => {
        const index = this.lastElementCount + i;
        console.log(this.formatElement(element, index));
        
        // Analyze the element
        this.analyzeElement(element);
      });
      
      this.lastElementCount = currentCount;
    }
  }

  // Analyze element for common issues
  analyzeElement(element) {
    const issues = [];
    
    // Check if element might not be clickable
    if (element.note && element.note.toLowerCase().includes('not clickable')) {
      issues.push('🔍 Analyzing why element might not be clickable...');
      
      // Check for div/span without click handlers
      if (['DIV', 'SPAN'].includes(element.tagName) && !element.attributes.onclick) {
        issues.push('  ⚠️  This is a <' + element.tagName.toLowerCase() + '> element without onclick attribute');
        issues.push('  💡 It might need JavaScript event listeners or might be decorative');
      }
      
      // Check position styles
      if (element.styles.position === 'static') {
        issues.push('  ℹ️  Element has static positioning');
      }
      
      // Check for grid/flex containers
      if (element.className && element.className.includes('grid')) {
        issues.push('  📦 This appears to be a grid container');
        issues.push('  💡 The clickable elements might be the children inside this container');
      }
    }
    
    if (issues.length > 0) {
      console.log('\n' + issues.join('\n') + '\n');
    }
  }

  // Start monitoring
  start() {
    console.log(`\n🚀 Monitoring Browser Session: ${this.sessionId}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('Waiting for elements from your browser...\n');
    
    // Initial check
    const session = this.readSession();
    if (session) {
      this.lastElementCount = session.elements.length;
      if (this.lastElementCount > 0) {
        console.log(`ℹ️  Session already has ${this.lastElementCount} element(s)\n`);
      }
    }
    
    // Watch for changes
    this.watchInterval = setInterval(() => {
      this.checkForUpdates();
    }, 1000); // Check every second
  }

  // Stop monitoring
  stop() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      console.log('\n👋 Stopped monitoring session');
    }
  }
}

// Export for use
module.exports = BrowserMonitor;

// Run if called directly
if (require.main === module) {
  const sessionId = process.argv[2];
  
  if (!sessionId) {
    console.log('Usage: node browser-monitor.js <SESSION_ID>');
    process.exit(1);
  }
  
  const monitor = new BrowserMonitor(sessionId);
  monitor.start();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
  });
}