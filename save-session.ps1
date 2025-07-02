# PowerShell script to save session data
param(
    [string]$SessionId,
    [string]$JsonData
)

$sessionDir = "C:\Users\hatto\AppData\Local\ClaudeCodeDirect\sessions"

# Create directory if it doesn't exist
if (!(Test-Path $sessionDir)) {
    New-Item -ItemType Directory -Path $sessionDir -Force | Out-Null
}

# Save the session data
$filePath = Join-Path $sessionDir "$SessionId.json"
$JsonData | Out-File -FilePath $filePath -Encoding UTF8

Write-Output "Session saved to $filePath"