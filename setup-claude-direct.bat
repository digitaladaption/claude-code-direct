@echo off
echo ===================================
echo Claude Direct Extension Setup
echo ===================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found!
echo.

REM Create startup batch file
echo Creating auto-start script...
(
echo @echo off
echo cd /d "C:\Users\hatto\browserextension"
echo start /min node claude-direct-server.js
) > "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\claude-direct-server.bat"

echo.
echo Setup complete! The server will now:
echo - Start automatically when Windows starts
echo - Run minimized in the background
echo.
echo Starting the server now...
cd /d "C:\Users\hatto\browserextension"
start /min node claude-direct-server.js

echo.
echo ===================================
echo Setup successful!
echo ===================================
echo.
echo The Claude Direct server is now running.
echo You can close this window.
echo.
pause