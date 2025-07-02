// Content script for serverless Claude Code Direct
let isCapturing = false;
let sessionId = null;
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
    width: 380px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: none;
    overflow: hidden;
  `;
  
  panel.innerHTML = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 20px;">
      <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Element Selected</h3>
      <div style="font-size: 13px; opacity: 0.9; margin-top: 5px;">Session: <span id="panel-session-id" style="font-family: monospace; letter-spacing: 1px;"></span></div>
    </div>
    <div style="padding: 20px;">
      <div id="element-info" style="font-size: 14px; color: #495057; margin-bottom: 15px;"></div>
      
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #495057;">
        Add a note (optional):
      </label>
      <textarea 
        id="element-note" 
        placeholder="Describe what you want Claude to know about this element..."
        style="width: 100%; height: 80px; padding: 12px; border: 2px solid #e9ecef; 
               border-radius: 8px; font-size: 14px; resize: none; font-family: inherit;
               transition: border-color 0.2s;"
      ></textarea>
      
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <button id="send-to-claude" style="
          flex: 1;
          padding: 12px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        ">Send to Claude</button>
        <button id="cancel-selection" style="
          padding: 12px 24px;
          background: #f8f9fa;
          color: #495057;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        ">Cancel</button>
      </div>
    </div>
    <div id="panel-status" style="
      display: none;
      padding: 15px 20px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
      font-size: 14px;
      text-align: center;
    "></div>
  `;
  
  document.body.appendChild(panel);
  
  // Add hover effects
  const sendBtn = panel.querySelector('#send-to-claude');
  sendBtn.addEventListener('mouseenter', () => {
    sendBtn.style.background = '#218838';
    sendBtn.style.transform = 'translateY(-1px)';
  });
  sendBtn.addEventListener('mouseleave', () => {
    sendBtn.style.background = '#28a745';
    sendBtn.style.transform = 'translateY(0)';
  });
  
  const noteTextarea = panel.querySelector('#element-note');
  noteTextarea.addEventListener('focus', () => {
    noteTextarea.style.borderColor = '#667eea';
  });
  noteTextarea.addEventListener('blur', () => {
    noteTextarea.style.borderColor = '#e9ecef';
  });
  
  return panel;
}

// Get detailed element information
function getElementInfo(element) {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  
  // Build CSS selector
  let selector = element.tagName.toLowerCase();
  if (element.id) selector += `#${element.id}`;
  if (element.className && typeof element.className === 'string') {
    selector += `.${element.className.split(' ').filter(c => c).join('.')}`;
  }
  
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
  
  // Get relevant styles
  const relevantStyles = {
    display: styles.display,
    position: styles.position,
    color: styles.color,
    backgroundColor: styles.backgroundColor,
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight,
    width: styles.width,
    height: styles.height,
    padding: styles.padding,
    margin: styles.margin,
    border: styles.border
  };
  
  return {
    selector: selector,
    xpath: getXPath(element),
    tagName: element.tagName,
    id: element.id || null,
    className: element.className || null,
    text: element.textContent.trim().substring(0, 500),
    href: element.href || null,
    src: element.src || null,
    alt: element.alt || null,
    value: element.value || null,
    type: element.type || null,
    name: element.name || null,
    position: {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
      viewport: {
        top: rect.top,
        left: rect.left
      }
    },
    styles: relevantStyles,
    attributes: attributes,
    innerHTML: element.innerHTML.substring(0, 1000),
    outerHTML: element.outerHTML.substring(0, 1000),
    parentTag: element.parentElement?.tagName || null,
    childrenCount: element.children.length,
    url: window.location.href,
    title: document.title,
    domain: window.location.hostname
  };
}

// Highlight element on hover
function highlightElement(element) {
  if (highlightedElement) {
    highlightedElement.style.outline = '';
    highlightedElement.style.outlineOffset = '';
  }
  
  element.style.outline = '3px solid #667eea';
  element.style.outlineOffset = '2px';
  highlightedElement = element;
}

// Remove highlight
function removeHighlight() {
  if (highlightedElement) {
    highlightedElement.style.outline = '';
    highlightedElement.style.outlineOffset = '';
    highlightedElement = null;
  }
}

// Save element via background script
async function saveElementToClaude(elementInfo, note) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'saveElement',
      element: {
        ...elementInfo,
        note: note || ''
      }
    }, (response) => {
      if (response.success) {
        // Notify popup if it's open
        chrome.runtime.sendMessage({ action: 'elementSaved' });
      }
      resolve(response.success);
    });
  });
}

// Show element info in panel
function showElementPanel(element) {
  if (!floatingPanel) {
    floatingPanel = createFloatingPanel();
  }
  
  const info = getElementInfo(element);
  const infoDiv = floatingPanel.querySelector('#element-info');
  const sessionSpan = floatingPanel.querySelector('#panel-session-id');
  
  sessionSpan.textContent = sessionId;
  
  // Create info display
  let infoHTML = '';
  if (info.tagName) infoHTML += `<div style="margin-bottom: 8px;"><strong>Tag:</strong> ${info.tagName}</div>`;
  if (info.id) infoHTML += `<div style="margin-bottom: 8px;"><strong>ID:</strong> ${info.id}</div>`;
  if (info.className) infoHTML += `<div style="margin-bottom: 8px;"><strong>Class:</strong> ${info.className}</div>`;
  if (info.text && info.text.length > 0) {
    const displayText = info.text.length > 100 ? info.text.substring(0, 100) + '...' : info.text;
    infoHTML += `<div style="margin-bottom: 8px;"><strong>Text:</strong> ${displayText}</div>`;
  }
  if (info.href) infoHTML += `<div style="margin-bottom: 8px;"><strong>Link:</strong> ${info.href.substring(0, 50)}...</div>`;
  
  infoDiv.innerHTML = infoHTML;
  
  floatingPanel.style.display = 'block';
  floatingPanel.querySelector('#element-note').value = '';
  floatingPanel.querySelector('#element-note').focus();
  floatingPanel.querySelector('#panel-status').style.display = 'none';
  
  // Send button handler
  floatingPanel.querySelector('#send-to-claude').onclick = async () => {
    const note = floatingPanel.querySelector('#element-note').value;
    const statusDiv = floatingPanel.querySelector('#panel-status');
    const sendBtn = floatingPanel.querySelector('#send-to-claude');
    
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    statusDiv.style.display = 'block';
    statusDiv.style.color = '#666';
    statusDiv.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; gap: 10px;"><div style="width: 20px; height: 20px; border: 3px solid #667eea; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div> Saving element...</div>';
    
    // Add spinning animation
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
    
    const success = await saveElementToClaude(info, note);
    
    if (success) {
      statusDiv.style.color = '#28a745';
      statusDiv.innerHTML = '✅ Sent to Claude successfully!';
      sendBtn.textContent = 'Sent!';
      sendBtn.style.background = '#28a745';
      
      setTimeout(() => {
        floatingPanel.style.display = 'none';
        removeHighlight();
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send to Claude';
        sendBtn.style.background = '#28a745';
      }, 1500);
    } else {
      statusDiv.style.color = '#dc3545';
      statusDiv.innerHTML = '❌ Failed to send';
      sendBtn.disabled = false;
      sendBtn.textContent = 'Try Again';
      sendBtn.style.background = '#dc3545';
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
  if (element && element !== highlightedElement && !element.closest('#claude-code-panel') && !element.closest('#claude-capture-indicator')) {
    highlightElement(element);
  }
}

// Click handler
function handleClick(e) {
  if (!isCapturing) return;
  
  const element = e.target;
  if (element.closest('#claude-code-panel') || element.closest('#claude-capture-indicator')) return;
  
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
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown);
  
  // Visual indicator
  const indicator = document.createElement('div');
  indicator.id = 'claude-capture-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 30px;
    font-size: 14px;
    font-weight: 500;
    z-index: 2147483646;
    font-family: -apple-system, sans-serif;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  indicator.innerHTML = `
    <div style="width: 8px; height: 8px; background: white; border-radius: 50%; animation: pulse 2s infinite;"></div>
    Capturing Mode - Click any element (ESC to exit)
  `;
  
  // Add pulse animation
  const style = document.createElement('style');
  style.textContent = '@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }';
  document.head.appendChild(style);
  
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