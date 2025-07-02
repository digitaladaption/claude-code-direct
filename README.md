# Claude Code Direct - Browser Extension

Send webpage elements directly to Claude for instant debugging help. Click any element, describe the issue, and Claude sees it immediately.

![Claude Code Direct Demo](demo.gif)

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
1. Type `/browser` or say "start browser session"
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
Your element appears instantly with all the details!

## 🎯 Features

- **Direct Connection**: Elements sent directly to your active Claude chat
- **No Manual Server**: Server starts automatically on Windows/Mac/Linux
- **Rich Element Data**: Captures HTML, CSS, position, and more
- **Smart Analysis**: Claude can see exactly what you're clicking
- **Session-Based**: Each Claude chat gets its own session

## 🛠️ Manual Setup

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

## 🔧 Troubleshooting

### "Failed to send" error
- Make sure the server is running: `node claude-direct-server.js`
- Check Windows firewall isn't blocking port 3180

### Extension not working
- Refresh the page after installing
- Make sure you entered the correct session ID

### Server won't start
- Install Node.js first: https://nodejs.org/
- Run as administrator if needed

## 📁 Project Structure

```
claude-code-direct/
├── manifest.json          # Chrome extension config
├── popup-claude-driven.html/js  # Extension UI
├── content-simple.js      # Page interaction
├── claude-direct-server.js # Local server
├── INSTALL.bat           # Windows installer
└── claude-sessions/      # Session data storage
```

## 🤝 Contributing

Pull requests welcome! Please feel free to submit issues or enhance the extension.

## 📄 License

MIT License - feel free to use this in your own projects!

---

Made with ❤️ for Claude users who need to debug web pages quickly.