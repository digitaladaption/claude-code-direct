let isAnnotating = false;
let overlay = null;
let selectedElement = null;
let claudeCodePort = 3180;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAnnotating') {
    claudeCodePort = request.port || 3180;
    startAnnotating();
    sendResponse({ status: 'started' });
  }
  return true;
});

function startAnnotating() {
  if (isAnnotating) return;
  
  isAnnotating = true;
  createOverlay();
  document.addEventListener('click', handleClick, true);
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  
  // ESC key handler
  document.addEventListener('keydown', handleKeyDown);
}

function createOverlay() {
  const existingOverlay = document.getElementById('claude-annotator-overlay');
  if (existingOverlay) existingOverlay.remove();
  
  overlay = document.createElement('div');
  overlay.id = 'claude-annotator-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 2147483647;
    max-width: 400px;
    font-family: system-ui, -apple-system, sans-serif;
    display: none;
  `;
  
  overlay.innerHTML = `
    <h3 style="margin: 0 0 10px 0; font-size: 18px;">Annotate Element</h3>
    <div id="element-info" style="
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 10px;
      font-size: 12px;
      font-family: monospace;
      word-break: break-all;
    "></div>
    <textarea id="annotation-text" placeholder="Write your note about this element..." style="
      width: 100%;
      min-height: 100px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      resize: vertical;
      font-family: inherit;
      font-size: 14px;
      box-sizing: border-box;
    "></textarea>
    <div style="margin-top: 10px; display: flex; gap: 10px;">
      <button id="send-btn" style="
        flex: 1;
        padding: 10px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">Send to Claude Code</button>
      <button id="cancel-btn" style="
        padding: 10px 20px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">Cancel</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Add event listeners to buttons
  overlay.querySelector('#send-btn').addEventListener('click', sendAnnotation);
  overlay.querySelector('#cancel-btn').addEventListener('click', cancelAnnotation);
  
  // Prevent clicks on overlay from propagating
  overlay.addEventListener('click', (e) => e.stopPropagation());
}

function handleMouseOver(e) {
  if (!isAnnotating || e.target.closest('#claude-annotator-overlay')) return;
  e.target.style.outline = '2px dashed #007bff';
  e.target.style.outlineOffset = '2px';
}

function handleMouseOut(e) {
  if (!isAnnotating || e.target === selectedElement) return;
  e.target.style.outline = '';
  e.target.style.outlineOffset = '';
}

function handleClick(e) {
  if (!isAnnotating || e.target.closest('#claude-annotator-overlay')) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  if (selectedElement) {
    selectedElement.style.outline = '';
    selectedElement.style.outlineOffset = '';
  }
  
  selectedElement = e.target;
  selectedElement.style.outline = '3px solid #007bff';
  selectedElement.style.outlineOffset = '2px';
  
  const info = getElementInfo(selectedElement);
  overlay.querySelector('#element-info').innerHTML = `
    <strong>Element:</strong> ${escapeHtml(info.selector)}<br>
    <strong>Tag:</strong> ${info.tagName}<br>
    ${info.innerText ? `<strong>Text:</strong> ${escapeHtml(info.innerText.substring(0, 50))}...` : ''}
  `;
  
  overlay.style.display = 'block';
  overlay.querySelector('#annotation-text').focus();
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    cancelAnnotation();
  }
}

function getElementInfo(element) {
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className ? `.${element.className.split(' ').filter(c => c).join('.')}` : '';
  const selector = tagName + id + classes;
  
  const rect = element.getBoundingClientRect();
  const xpath = getXPath(element);
  
  return {
    selector: selector,
    xpath: xpath,
    tagName: tagName,
    id: element.id,
    className: element.className,
    innerText: element.innerText?.substring(0, 200),
    attributes: Array.from(element.attributes).map(attr => ({
      name: attr.name,
      value: attr.value
    })),
    position: {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    },
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
}

function getXPath(element) {
  if (element.id !== '') {
    return `//*[@id="${element.id}"]`;
  }
  if (element === document.body) {
    return '/html/body';
  }
  
  let ix = 0;
  const siblings = element.parentNode.childNodes;
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === element) {
      return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
}

async function sendAnnotation() {
  const note = overlay.querySelector('#annotation-text').value;
  if (!note.trim()) {
    alert('Please write a note about the element');
    return;
  }
  
  const elementInfo = getElementInfo(selectedElement);
  const data = {
    note: note,
    element: elementInfo
  };
  
  try {
    const response = await fetch(`http://localhost:${claudeCodePort}/api/annotation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      showNotification('Annotation sent to Claude Code!', 'success');
      cancelAnnotation();
    } else {
      showNotification('Failed to send annotation. Make sure Claude Code is running.', 'error');
    }
  } catch (error) {
    showNotification('Error: Could not connect to Claude Code on port ' + claudeCodePort, 'error');
    console.error(error);
  }
}

function cancelAnnotation() {
  if (selectedElement) {
    selectedElement.style.outline = '';
    selectedElement.style.outlineOffset = '';
  }
  if (overlay) {
    overlay.remove();
  }
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('keydown', handleKeyDown);
  isAnnotating = false;
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 25px;
    background: ${type === 'error' ? '#dc3545' : '#28a745'};
    color: white;
    border-radius: 6px;
    z-index: 2147483647;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 3000);
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}