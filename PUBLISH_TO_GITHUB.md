# Publishing to GitHub

## 1. Clean Up Files First

Delete these unnecessary files before pushing:
```bash
# Remove old versions and test files
rm popup.html popup.js
rm popup-simple.html popup-simple.js
rm popup-serverless.html popup-serverless.js
rm popup-clipboard.html popup-clipboard.js
rm content.js content-serverless.js content-clipboard.js
rm background-local.js background-serverless.js
rm manifest-simple.json manifest-clipboard.json
rm test-server.html
rm save-session.ps1
rm setup-claude-direct.bat
rm FILES_TO_KEEP.txt
rm PUBLISH_TO_GITHUB.md

# Remove old server versions
rm claude-code-server.js claude-code-server-live.js
rm claude-code-client.js claude-code-annotator.js
rm claude-browser-helper.js claude-reader.js
rm claude-session-helper.js session-bridge.js
rm browser-monitor.js

# Remove old docs
rm LIVE_CONNECTION_GUIDE.md latest_update.md
rm annotator.js

# Clear session data
rm -rf claude-sessions/*
touch claude-sessions/.gitkeep
```

## 2. Initialize Git Repository

```bash
cd C:\Users\hatto\browserextension

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Claude Code Direct browser extension"
```

## 3. Create GitHub Repository

1. Go to https://github.com/new
2. Name it: `claude-code-direct`
3. Description: "Browser extension to send webpage elements directly to Claude for debugging"
4. Keep it public
5. Don't initialize with README (we already have one)
6. Click "Create repository"

## 4. Push to GitHub

```bash
# Add your GitHub repo as origin (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/claude-code-direct.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 5. Add a Nice Touch - Releases

After pushing, create a release:

1. Go to your repo on GitHub
2. Click "Releases" → "Create a new release"
3. Tag: `v1.0.0`
4. Title: "Claude Code Direct v1.0.0"
5. Description:
   ```
   First release of Claude Code Direct!
   
   Features:
   - Direct element capture to Claude
   - Auto-starting server
   - Cross-platform support (Windows/Mac/Linux)
   - Session-based connection
   
   See README for installation instructions.
   ```

## 6. Optional: Add Screenshots

Create a `docs` folder with screenshots:
1. Extension popup
2. Capturing an element
3. Claude receiving the data

## Final Repository Structure

Your clean repo should have:
```
claude-code-direct/
├── .gitignore
├── README.md
├── package.json
├── manifest.json
├── INSTALL.bat              # Windows installer
├── install.sh               # Mac/Linux installer
├── com.claudedirect.server.plist  # Mac LaunchAgent
├── claude-direct-server.js  # Main server
├── claude-direct-launcher.js # Server manager
├── browser-session.js       # Session creator
├── popup-claude-driven.html # Extension popup
├── popup-claude-driven.js   # Extension logic
├── content-simple.js        # Page interaction
├── background.js            # Extension background
├── icon.svg                 # Extension icon
└── claude-sessions/         # Data directory
    └── .gitkeep
```