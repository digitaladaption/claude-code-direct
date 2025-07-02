# Claude Code Direct - Browser Extension

Send webpage elements directly to Claude for instant debugging help. Click any element, describe the issue, and Claude analyzes it immediately.

## 🚀 Quick Start

### 1. Download & Install

```bash
git clone https://github.com/yourusername/claude-code-direct.git
cd claude-code-direct
```

### 2. Run the Installer

#### Windows:
Double-click `INSTALL.bat`

#### Mac/Linux:
```bash
chmod +x install.sh
./install.sh
```

The installer will:
- Check for Node.js
- Set up automatic server startup
- Start the server immediately
- Show Chrome extension instructions

### 3. Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `claude-code-direct` folder
5. You'll see "Claude Code Direct" in your extensions

## 📖 How to Use

### In Claude:
1. Type `/browser`
2. Claude gives you a 6-character session ID (like `ABC123`)

### In Chrome:
1. Click the Claude Code Direct extension icon
2. Enter the session ID from Claude
3. Click "Join Session"
4. Click "Start Capturing"
5. Click any element on the page
6. Add a note about what's wrong
7. Click "Send to Claude"

### Back in Claude:
1. Type `check`
2. Claude immediately sees and analyzes your element!

## 🎯 Example Workflow

```
You: /browser
Claude: Session ID: ABC123

[In browser: Enter ABC123, click broken button]

You: check
Claude: I see you clicked a button that's not working. The issue is...
```

## 🛠️ Features

- **Direct Connection**: Elements sent directly to your active Claude chat
- **Smart Analysis**: Claude sees HTML, CSS, position, and all element details
- **Session-Based**: Each Claude chat gets its own session
- **Auto-Start Server**: Server runs automatically after setup (Windows/Mac/Linux)
- **Simple Commands**: Just type `/browser` and `check`

## 🔧 Manual Setup

If the installer doesn't work or you prefer manual setup:

1. Install Node.js:
   - **Mac**: `brew install node` or download from [nodejs.org](https://nodejs.org/)
   - **Windows**: Download from [nodejs.org](https://nodejs.org/)
   - **Linux**: `sudo apt install nodejs` or use your package manager

2. Start the server:
   ```bash
   cd claude-code-direct
   node claude-direct-server.js
   ```

3. Load the extension in Chrome (same steps as above)

### Auto-start on Mac (manual):
```bash
# Create launch agent
cp com.claudedirect.server.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.claudedirect.server.plist
```

## ❓ Troubleshooting

### "Failed to send" error
- Make sure the server is running: `node claude-direct-server.js`
- Check if port 3180 is blocked by firewall
- Try restarting the server

### Extension not working
- Refresh the page after installing extension
- Make sure you entered the correct session ID
- Click "Reload" on the extension in chrome://extensions/

### Server won't start
- Install Node.js first: https://nodejs.org/
- Check if port 3180 is already in use
- Run installer as administrator if needed

## 📁 Project Structure

```
claude-code-direct/
├── manifest.json              # Chrome extension config
├── popup-claude-driven.html   # Extension popup UI
├── popup-claude-driven.js     # Extension popup logic
├── content-simple.js          # Page interaction script
├── background.js              # Extension background script
├── claude-direct-server.js    # Local server
├── claude-direct-launcher.js  # Server manager
├── browser-session.js         # Session management
├── INSTALL.bat               # Windows installer
├── install.sh                # Mac/Linux installer
├── package.json              # Node.js config
└── claude-sessions/          # Session data storage
```

## 🤝 Contributing

Pull requests welcome! Please feel free to submit issues or enhance the extension.

## 📄 License

MIT License - feel free to use this in your own projects!

---

Made with ❤️ to help Claude users debug web pages quickly.