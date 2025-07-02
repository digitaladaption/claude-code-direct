# Live Connection Guide - Claude Code Web Annotator

This guide explains how to set up a live connection between the browser extension and Claude Code chats.

## Architecture Overview

The system now supports real-time communication between:
- **Browser Extension** - Captures element annotations
- **Live Server** - Routes annotations to the correct Claude Code session
- **Claude Code** - Receives annotations in real-time

## Setup Instructions

### 1. Start the Live Server

Replace the old server with the new live server:

```bash
cd C:\Users\hatto\browserextension
node claude-code-server-live.js
```

This server supports:
- Multiple concurrent Claude Code sessions
- URL-based routing to the correct session
- Real-time annotation delivery via long polling

### 2. Connect from Claude Code

In your Claude Code chat, you can use the annotator module:

```javascript
const ClaudeCodeAnnotator = require('C:\\Users\\hatto\\browserextension\\claude-code-annotator.js');

const annotator = new ClaudeCodeAnnotator();

// Connect to server
await annotator.connect();

// Link URLs you want to monitor
await annotator.linkUrl('https://example.com');

// Watch for annotations
await annotator.watchAnnotations((annotation) => {
  console.log('New annotation:', annotation);
});
```

### 3. Use the Browser Extension

1. Install the extension as usual
2. Navigate to a website you've linked to your session
3. Click the extension icon
4. The extension will show if it's connected to a Claude Code session
5. Start annotating - annotations appear instantly in Claude Code

## How It Works

1. **Session Registration**: Each Claude Code instance registers a unique session
2. **URL Linking**: Claude Code links URLs it wants to monitor
3. **Smart Routing**: When you annotate, the server finds the right session based on the URL
4. **Real-time Delivery**: Annotations are delivered instantly via long polling

## Session Management

### View Active Sessions

```bash
curl http://localhost:3180/api/sessions
```

### Find Session for a URL

```bash
curl "http://localhost:3180/api/session/find-by-url?url=https://example.com"
```

## Features

- **Multiple Sessions**: Run multiple Claude Code instances simultaneously
- **URL Pattern Matching**: Link base URLs, annotations on sub-pages still route correctly
- **Session Persistence**: Sessions survive server restarts
- **Auto-cleanup**: Stale sessions (>24 hours) are automatically removed
- **Connection Status**: Extension shows live connection status

## Example Workflow

1. In Claude Code:
   ```
   I need to analyze the navigation menu on example.com
   ```

2. Claude Code automatically:
   - Connects to the annotation server
   - Links example.com to its session
   - Starts watching for annotations

3. You open example.com in Chrome and use the extension

4. Annotations appear instantly in Claude Code for analysis

## Troubleshooting

- **"Server not running"**: Start claude-code-server-live.js
- **"No active sessions"**: Claude Code needs to connect first
- **Annotations not routing**: Check if the URL is linked to a session

## Migration from Old System

The new server is backward compatible. Old annotations are still saved to `annotations.json`, but now they're also routed live to connected sessions.