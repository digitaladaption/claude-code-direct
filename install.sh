#!/bin/bash

echo ""
echo "  ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗"
echo " ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝"
echo " ██║     ██║     ███████║██║   ██║██║  ██║█████╗  "
echo " ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  "
echo " ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗"
echo "  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝"
echo "           DIRECT BROWSER EXTENSION"
echo ""
echo "==================================================="
echo ""

# Check for Node.js
echo "[1/4] Checking for Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "  Mac: brew install node"
    echo "  Or download from: https://nodejs.org/"
    echo ""
    exit 1
fi
echo "✅ Node.js is installed ($(node --version))"

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
fi

echo "✅ Detected OS: $OS"

# Create auto-start based on OS
echo ""
echo "[2/4] Setting up automatic startup..."

if [[ "$OS" == "mac" ]]; then
    # Mac: Create LaunchAgent
    PLIST_FILE="$HOME/Library/LaunchAgents/com.claudedirect.server.plist"
    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claudedirect.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which node)</string>
        <string>$(pwd)/claude-direct-server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/claude-direct.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/claude-direct.error.log</string>
</dict>
</plist>
EOF
    
    # Load the LaunchAgent
    launchctl load "$PLIST_FILE" 2>/dev/null
    launchctl start com.claudedirect.server
    echo "✅ Auto-start configured for macOS"
    
elif [[ "$OS" == "linux" ]]; then
    # Linux: Create systemd service
    SERVICE_FILE="$HOME/.config/systemd/user/claude-direct.service"
    mkdir -p "$HOME/.config/systemd/user"
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Claude Direct Server
After=network.target

[Service]
Type=simple
ExecStart=$(which node) $(pwd)/claude-direct-server.js
WorkingDirectory=$(pwd)
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF
    
    # Enable and start service
    systemctl --user daemon-reload
    systemctl --user enable claude-direct.service
    systemctl --user start claude-direct.service
    echo "✅ Auto-start configured for Linux"
else
    echo "⚠️  Could not configure auto-start for your OS"
    echo "   You'll need to start the server manually"
fi

# Start server now
echo ""
echo "[3/4] Starting the server..."
node claude-direct-launcher.js start &
sleep 3

# Check if server is running
if curl -s http://localhost:3180/api/sessions > /dev/null; then
    echo "✅ Server is running on port 3180"
else
    echo "⚠️  Server may not have started correctly"
    echo "   Try running manually: node claude-direct-server.js"
fi

# Chrome extension instructions
echo ""
echo "[4/4] Chrome Extension Setup:"
echo ""
echo "1. Open Chrome and go to: chrome://extensions/"
echo "2. Enable 'Developer mode' (top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select this folder: $(pwd)"
echo "5. The extension 'Claude Code Direct' should appear"
echo ""
echo "==================================================="
echo ""
echo "✨ INSTALLATION COMPLETE! ✨"
echo ""
echo "The server will start automatically when you log in."
echo "You can now use the extension with Claude!"
echo ""
echo "In Claude, type: /browser"
echo ""
echo "Logs can be found at:"
if [[ "$OS" == "mac" ]]; then
    echo "  /tmp/claude-direct.log"
elif [[ "$OS" == "linux" ]]; then
    echo "  journalctl --user -u claude-direct"
fi
echo ""