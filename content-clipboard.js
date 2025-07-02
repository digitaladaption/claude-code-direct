// Content script for clipboard-based capture
let isCapturing = false;
let highlightedElement = null;
let capturePanel = null;

// Create capture panel
function createCapturePanel() {
  const panel = document.createElement('div');
  panel.id = 'claude-capture-panel';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
    display: none;
  `;
  
  panel.innerHTML = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px;">
      <h3 style="margin: 0 0 5px 0; font-size: 18px;">Element Captured!</h3>
      <div style="font-size: 14px; opacity: 0.9;">Add a note for Claude (optional)</div>
    </div>
    <div style="padding: 20px;">
      <div id="element-preview" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; font-size: 14px; color: #495057;"></div>
      
      <textarea 
        id="element-note" 
        placeholder="What's wrong with this element? What help do you need?"
        style="width: 100%; height: 100px; padding: 12px; border: 2px solid #e9ecef; 
               border-radius: 8px; font-size: 14px; resize: none; font-family: inherit;
               margin-bottom: 15px;"
      ></textarea>
      
      <div style="display: flex; gap: 10px;">
        <button id="save-element" style="
          flex: 1;
          padding: 12px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
        ">Save Element</button>
        <button id="cancel-capture" style="
          padding: 12px 24px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
        ">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  return panel;
}

// Get element information
function getElementInfo(element) {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  
  // Build selector
  let selector = element.tagName.toLowerCase();
  if (element.id) selector += `#${element.id}`;
  if (element.className && typeof element.className === 'string') {
    selector += `.${element.className.split(' ').filter(c => c).join('.')}`;
  }
  
  return {
    selector: selector,
    tagName: element.tagName,
    id: element.id || null,
    className: element.className || null,
    text: element.textContent.trim().substring(0, 500),
    href: element.href || null,
    src: element.src || null,
    position: {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    },
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString()
  };
}

// Highlight element
function highlightElement(element) {
  if (highlightedElement) {
    highlightedElement.style.outline = '';
  }
  element.style.outline = '3px solid #667eea';
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

// Save element to storage
async function saveElement(elementInfo, note) {
  // Get existing elements
  const result = await chrome.storage.local.get(['capturedElements']);
  const elements = result.capturedElements || [];
  
  // Add new element
  elements.push({
    ...elementInfo,
    note: note || ''
  });
  
  // Save back to storage
  await chrome.storage.local.set({ capturedElements: elements });
  
  // Notify popup
  chrome.runtime.sendMessage({ action: 'elementCaptured' });
  
  return elements.length;
}

// Show capture panel
function showCapturePanel(element) {
  if (!capturePanel) {
    capturePanel = createCapturePanel();
  }
  
  const info = getElementInfo(element);
  const preview = capturePanel.querySelector('#element-preview');
  
  // Show preview
  let previewHTML = `<strong>${info.tagName}</strong>`;
  if (info.id) previewHTML += ` #${info.id}`;
  if (info.className) previewHTML += `<br>class: ${info.className}`;
  if (info.text) previewHTML += `<br>Text: "${info.text.substring(0, 50)}..."`;
  
  preview.innerHTML = previewHTML;
  
  capturePanel.style.display = 'block';
  capturePanel.querySelector('#element-note').value = '';
  capturePanel.querySelector('#element-note').focus();
  
  // Save button
  capturePanel.querySelector('#save-element').onclick = async () => {
    const note = capturePanel.querySelector('#element-note').value;
    const count = await saveElement(info, note);
    
    // Show success briefly
    capturePanel.querySelector('#save-element').textContent = `✓ Saved (${count} total)`;
    capturePanel.querySelector('#save-element').style.background = '#28a745';
    
    setTimeout(() => {
      capturePanel.style.display = 'none';
      removeHighlight();
      capturePanel.querySelector('#save-element').textContent = 'Save Element';
    }, 1000);
  };
  
  // Cancel button
  capturePanel.querySelector('#cancel-capture').onclick = () => {
    capturePanel.style.display = 'none';
    removeHighlight();
  };
}

// Mouse handlers
function handleMouseMove(e) {
  if (!isCapturing) return;
  const element = document.elementFromPoint(e.clientX, e.clientY);
  if (element && element !== highlightedElement && !element.closest('#claude-capture-panel')) {
    highlightElement(element);
  }
}

function handleClick(e) {
  if (!isCapturing) return;
  const element = e.target;
  if (element.closest('#claude-capture-panel')) return;
  
  e.preventDefault();
  e.stopPropagation();
  showCapturePanel(element);
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    if (capturePanel && capturePanel.style.display !== 'none') {
      capturePanel.style.display = 'none';
      removeHighlight();
    } else if (isCapturing) {
      stopCapturing();
    }
  }
}

// Start capturing
function startCapturing() {
  isCapturing = true;
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown);
  
  // Show indicator
  const indicator = document.createElement('div');
  indicator.id = 'claude-capture-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #28a745;
    color: white;
    padding: 12px 24px;
    border-radius: 30px;
    font-size: 14px;
    z-index: 2147483646;
    box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
  `;
  indicator.textContent = '🎯 Click any element to capture (ESC to exit)';
  document.body.appendChild(indicator);
}

// Stop capturing
function stopCapturing() {
  isCapturing = false;
  
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown);
  
  removeHighlight();
  
  const indicator = document.getElementById('claude-capture-indicator');
  if (indicator) indicator.remove();
  
  if (capturePanel) {
    capturePanel.style.display = 'none';
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCapturing') {
    startCapturing();
    sendResponse({ status: 'started' });
  }
  return true;
});