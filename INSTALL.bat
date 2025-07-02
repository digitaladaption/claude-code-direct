@echo off
title Claude Direct Extension Installer
color 0A

echo.
echo  ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
echo ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝
echo ██║     ██║     ███████║██║   ██║██║  ██║█████╗  
echo ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  
echo ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
echo  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
echo            DIRECT BROWSER EXTENSION
echo.
echo ===================================================
echo.

REM Check for admin rights (optional, not required)
net session >nul 2>&1
if %errorlevel% == 0 (
    echo Running with administrator privileges
) else (
    echo Running without administrator privileges
)
echo.

REM Check Node.js
echo [1/4] Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org/
    echo 2. Download and install Node.js
    echo 3. Run this installer again
    echo.
    pause
    exit /b 1
)
echo ✅ Node.js is installed

REM Create Windows service using Task Scheduler
echo.
echo [2/4] Setting up automatic startup...

REM Create a VBS script to run server invisibly
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.CurrentDirectory = "C:\Users\hatto\browserextension"
echo WshShell.Run "node claude-direct-server.js", 0, False
) > "%TEMP%\claude-direct-launcher.vbs"

REM Create scheduled task
schtasks /create /tn "ClaudeDirectServer" /tr "wscript.exe '%TEMP%\claude-direct-launcher.vbs'" /sc onlogon /rl highest /f >nul 2>&1

if %errorlevel% == 0 (
    echo ✅ Auto-start configured
) else (
    echo ⚠️  Could not configure auto-start (requires admin)
    echo    You'll need to start the server manually
)

REM Start the server now
echo.
echo [3/4] Starting the server...
cd /d "%~dp0"
start /b node claude-direct-launcher.js start >nul 2>&1
timeout /t 3 /nobreak >nul

REM Check if server started
node claude-direct-launcher.js status | find "running" >nul
if %errorlevel% == 0 (
    echo ✅ Server is running on port 3180
) else (
    echo ❌ Failed to start server
    echo    Try running manually: node claude-direct-server.js
)

REM Instructions
echo.
echo [4/4] Extension setup instructions:
echo.
echo 1. Open Chrome and go to: chrome://extensions/
echo 2. Enable "Developer mode" (top right)
echo 3. Click "Load unpacked"
echo 4. Select this folder: %cd%
echo 5. The extension "Claude Code Direct" should appear
echo.
echo ===================================================
echo.
echo ✨ INSTALLATION COMPLETE! ✨
echo.
echo The server will start automatically when Windows starts.
echo You can now use the extension with Claude!
echo.
echo In Claude, type: /browser
echo.
pause