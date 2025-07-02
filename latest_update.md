# Claude Code Web Annotator - Setup Instructions

## Quick Start Guide

### Step 1: Install Chrome Extension
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle switch in top right corner)
4. Click "Load unpacked" button
5. Browse to `C:\Users\hatto\browserextension\` folder
6. Select the folder and click "Open"
7. You should see "Claude Code Web Annotator" in your extensions list

### Step 2: Start the Annotation Server
```bash
cd C:\Users\hatto\browserextension
node claude-code-server.js
```

Server will start on port 3180 and display:
```
Claude Code Annotation Server running on port 3180
Annotations will be saved to annotations.json
```

### Step 3: Using the Annotator
1. Navigate to any website you want to annotate
2. Click the Claude Code Web Annotator extension icon
3. Click "Start Annotating" button
4. Move your mouse over elements - they'll highlight with a blue dashed border
5. Click on any element you want to annotate
6. A popup will appear showing element details
7. Type your note about the element
8. Click "Send to Claude Code"
9. Press ESC to exit annotation mode

### What Gets Captured
- **Element selector** (CSS path)
- **XPath** (alternative selector)
- **Element text** (first 200 characters)
- **Position** (coordinates and dimensions)
- **All attributes** (id, class, data attributes, etc.)
- **Page URL**
- **Timestamp**
- **Your annotation note**

### Viewing Saved Annotations
- Annotations are saved to `annotations.json` in the browserextension folder
- View all annotations via API: `http://localhost:3180/api/annotations`
- Each annotation includes all captured data plus your note

### Troubleshooting
- **Extension not loading**: Make sure Developer mode is enabled
- **Can't connect to server**: Ensure the Node.js server is running
- **Port conflict**: Change port in extension popup settings
- **Elements not highlighting**: Refresh the page after starting annotation mode

### File Structure
```
C:\Users\hatto\browserextension\
├── manifest.json          # Extension configuration
├── content.js            # Main annotation logic
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── background.js         # Service worker
├── icon.svg              # Extension icon
├── claude-code-server.js # Node.js server
├── annotations.json      # Saved annotations (created after first use)
├── README.md             # Documentation
└── latest_update.md      # This file
```

### Next Steps
- Annotations are saved locally and can be processed by Claude Code
- You can extend the server to integrate with Claude Code's API
- Modify the captured data in `content.js` if needed
- Add authentication or additional security if deploying beyond localhost

Last updated: 2025-07-01