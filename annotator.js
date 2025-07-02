(function() {
  let isAnnotating = false;
  let overlay = null;
  let selectedElement = null;
  
  const CLAUDE_CODE_PORT = 3180; // Default Claude Code port
  
  function createOverlay() {
    const existingOverlay = document.getElementById('claude-annotator-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    overlay = document.createElement('div');
    overlay.id = 'claude-annotator-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <h3 style="margin: 0 0 10px 0; font-size: 18px;">Annotate Element</h3>
        <div id="element-info" style="
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
          font-size: 12px;
          font-family: monospace;
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
        "></textarea>
        <div style="margin-top: 10px; display: flex; gap: 10px;">
          <button onclick="window.sendAnnotation()" style="
            flex: 1;
            padding: 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">Send to Claude Code</button>
          <button onclick="window.cancelAnnotation()" style="
            padding: 10px 20px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  
  function highlightElement(element) {
    element.style.outline = '3px solid #007bff';
    element.style.outlineOffset = '2px';
  }
  
  function removeHighlight(element) {
    element.style.outline = '';
    element.style.outlineOffset = '';
  }
  
  function getElementInfo(element) {
    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const selector = tagName + id + classes;
    
    const rect = element.getBoundingClientRect();
    const xpath = getXPath(element);
    
    return {
      selector: selector,
      xpath: xpath,
      tagName: tagName,
      id: element.id,
      className: element.className,
      innerText: element.innerText?.substring(0, 100),
      attributes: Array.from(element.attributes).map(attr => ({
        name: attr.name,
        value: attr.value
      })),
      position: {
        top: rect.top,
        left: rect.left,
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
  
  function handleClick(e) {
    if (!isAnnotating) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (selectedElement) {
      removeHighlight(selectedElement);
    }
    
    selectedElement = e.target;
    highlightElement(selectedElement);
    
    const info = getElementInfo(selectedElement);
    document.getElementById('element-info').innerHTML = `
      <strong>Element:</strong> ${info.selector}<br>
      <strong>Tag:</strong> ${info.tagName}<br>
      ${info.innerText ? `<strong>Text:</strong> ${info.innerText.substring(0, 50)}...` : ''}
    `;
    
    document.getElementById('annotation-text').focus();
  }
  
  window.sendAnnotation = async function() {
    const note = document.getElementById('annotation-text').value;
    if (!note.trim()) {
      alert('Please write a note about the element');
      return;
    }
    
    const elementInfo = getElementInfo(selectedElement);
    const data = {
      note: note,
      element: elementInfo,
      screenshot: await captureVisibleTab()
    };
    
    try {
      const response = await fetch(`http://localhost:${CLAUDE_CODE_PORT}/api/annotation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        alert('Annotation sent to Claude Code!');
        window.cancelAnnotation();
      } else {
        alert('Failed to send annotation. Make sure Claude Code is running on port ' + CLAUDE_CODE_PORT);
      }
    } catch (error) {
      alert('Error: Could not connect to Claude Code. Make sure it\'s running on port ' + CLAUDE_CODE_PORT);
      console.error(error);
    }
  };
  
  window.cancelAnnotation = function() {
    if (selectedElement) {
      removeHighlight(selectedElement);
    }
    if (overlay) {
      overlay.remove();
    }
    document.removeEventListener('click', handleClick, true);
    isAnnotating = false;
  };
  
  async function captureVisibleTab() {
    // For bookmarklet, we can't capture screenshots directly
    // Would need browser extension for this
    return null;
  }
  
  // Initialize
  if (!isAnnotating) {
    isAnnotating = true;
    createOverlay();
    document.addEventListener('click', handleClick, true);
    alert('Click on any element to annotate it. Press ESC to cancel.');
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        window.cancelAnnotation();
      }
    });
  }
})();