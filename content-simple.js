// Content script for Claude Code Direct
let isCapturing = false;
let sessionId = null;
let serverPort = 3180;
let highlightedElement = null;
let floatingPanel = null;

// Create floating panel for element details
function createFloatingPanel() {
  const panel = document.createElement('div');
  panel.id = 'claude-code-panel';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: none;
  `;
  
  panel.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #e0e0e0;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Element Details</h3>
      <div id="element-info" style="font-size: 14px; color: #666;"></div>
    </div>
    <div style="padding: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">
        Add a note (optional):
      </label>
      <textarea 
        id="element-note" 
        placeholder="Describe what you want to do with this element..."
        style="width: 100%; height: 80px; padding: 10px; border: 1px solid #e0e0e0; 
               border-radius: 6px; font-size: 14px; resize: none; font-family: inherit;"
      ></textarea>
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <button id="send-to-claude" style="
          flex: 1;
          padding: 10px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        ">Send to Claude Code</button>
        <button id="cancel-selection" style="
          padding: 10px 20px;
          background: #f0f0f0;
          color: #333;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        ">Cancel</button>
      </div>
    </div>
    <div id="panel-status" style="
      display: none;
      padding: 15px 20px;
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      text-align: center;
    "></div>
  `;
  
  document.body.appendChild(panel);
  return panel;
}

// Get detailed element information
function getElementInfo(element) {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  
  // Get CSS selector
  let selector = element.tagName.toLowerCase();
  if (element.id) selector += `#${element.id}`;
  if (element.className) selector += `.${element.className.split(' ').join('.')}`;
  
  // Get XPath
  const getXPath = (el) => {
    if (el.id) return `//*[@id="${el.id}"]`;
    if (el === document.body) return '/html/body';
    
    let position = 0;
    let siblings = el.parentNode?.childNodes || [];
    for (let i = 0; i < siblings.length; i++) {
      let sibling = siblings[i];
      if (sibling === el) return `${getXPath(el.parentNode)}/${el.tagName.toLowerCase()}[${position + 1}]`;
      if (sibling.nodeType === 1 && sibling.tagName === el.tagName) position++;
    }
  };
  
  // Get all attributes
  const attributes = {};
  for (const attr of element.attributes) {
    attributes[attr.name] = attr.value;
  }
  
  return {
    selector: selector,
    xpath: getXPath(element),
    tagName: element.tagName,
    id: element.id || null,
    className: element.className || null,
    text: element.textContent.trim().substring(0, 200),
    href: element.href || null,
    src: element.src || null,
    position: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    },
    styles: {
      display: styles.display,
      position: styles.position,
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight
    },
    attributes: attributes,
    url: window.location.href,
    title: document.title
  };
}

// Highlight element on hover
function highlightElement(element) {
  if (highlightedElement) {
    highlightedElement.style.outline = '';
  }
  element.style.outline = '3px solid #007bff';
  element.style.outlineOffset = '2px';
  highlightedElement = element;
}

// Remove highlight
function removeHighlight() {
  if (highlightedElement) {
    highlightedElement.style.outline = '';
    highlightedElement = null;
  }
}

// Send element to Claude Code
async function sendElementToClaude(elementInfo, note) {
  const payload = {
    ...elementInfo,
    note: note,
    timestamp: new Date().toISOString()
  };
  
  try {
    const response = await fetch(`http://localhost:${serverPort}/api/session/${sessionId}/element`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      // Notify popup
      chrome.runtime.sendMessage({ action: 'elementSent' });
      return true;
    } else {
      console.error('Failed to send element');
      return false;
    }
  } catch (error) {
    console.error('Error sending element:', error);
    return false;
  }
}

// Show element info in panel
function showElementPanel(element) {
  if (!floatingPanel) {
    floatingPanel = createFloatingPanel();
  }
  
  const info = getElementInfo(element);
  const infoDiv = floatingPanel.querySelector('#element-info');
  
  infoDiv.innerHTML = `
    <div style="margin-bottom: 8px;"><strong>Tag:</strong> ${info.tagName}</div>
    ${info.id ? `<div style="margin-bottom: 8px;"><strong>ID:</strong> ${info.id}</div>` : ''}
    ${info.className ? `<div style="margin-bottom: 8px;"><strong>Class:</strong> ${info.className}</div>` : ''}
    ${info.text ? `<div style="margin-bottom: 8px;"><strong>Text:</strong> ${info.text.substring(0, 50)}...</div>` : ''}
  `;
  
  floatingPanel.style.display = 'block';
  floatingPanel.querySelector('#element-note').value = '';
  floatingPanel.querySelector('#panel-status').style.display = 'none';
  
  // Send button handler
  floatingPanel.querySelector('#send-to-claude').onclick = async () => {
    const note = floatingPanel.querySelector('#element-note').value;
    const statusDiv = floatingPanel.querySelector('#panel-status');
    
    statusDiv.style.display = 'block';
    statusDiv.style.color = '#666';
    statusDiv.textContent = 'Sending...';
    
    const success = await sendElementToClaude(info, note);
    
    if (success) {
      statusDiv.style.color = '#28a745';
      statusDiv.textContent = '✓ Sent to Claude Code!';
      setTimeout(() => {
        floatingPanel.style.display = 'none';
        removeHighlight();
      }, 1500);
    } else {
      statusDiv.style.color = '#dc3545';
      statusDiv.textContent = '✗ Failed to send';
    }
  };
  
  // Cancel button handler
  floatingPanel.querySelector('#cancel-selection').onclick = () => {
    floatingPanel.style.display = 'none';
    removeHighlight();
  };
}

// Mouse move handler
function handleMouseMove(e) {
  if (!isCapturing) return;
  
  const element = document.elementFromPoint(e.clientX, e.clientY);
  if (element && element !== highlightedElement && !element.closest('#claude-code-panel')) {
    highlightElement(element);
  }
}

// Click handler
function handleClick(e) {
  if (!isCapturing) return;
  
  const element = e.target;
  if (element.closest('#claude-code-panel')) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  showElementPanel(element);
}

// Escape key handler
function handleKeyDown(e) {
  if (e.key === 'Escape') {
    if (floatingPanel && floatingPanel.style.display !== 'none') {
      floatingPanel.style.display = 'none';
      removeHighlight();
    } else if (isCapturing) {
      stopCapturing();
    }
  }
}

// Start capturing mode
function startCapturing(config) {
  isCapturing = true;
  sessionId = config.sessionId;
  serverPort = config.port || 3180;
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown);
  
  // Visual indicator
  const indicator = document.createElement('div');
  indicator.id = 'claude-capture-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: #007bff;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    z-index: 2147483646;
    font-family: -apple-system, sans-serif;
  `;
  indicator.textContent = 'Capturing Mode - Click any element';
  document.body.appendChild(indicator);
}

// Stop capturing mode
function stopCapturing() {
  isCapturing = false;
  
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown);
  
  removeHighlight();
  
  const indicator = document.getElementById('claude-capture-indicator');
  if (indicator) indicator.remove();
  
  if (floatingPanel) {
    floatingPanel.style.display = 'none';
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCapturing') {
    startCapturing(request);
    sendResponse({ status: 'started' });
  } else if (request.action === 'stopCapturing') {
    stopCapturing();
    sendResponse({ status: 'stopped' });
  }
  return true;
});