# Socratic Tutor v2: Windows PowerShell Installation Script
$ErrorActionPreference = "Stop"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   Socratic Tutor v2: Autonomous Installation    " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Check Python
$pyVersion = python -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")'
Write-Host "✔ Found Python $pyVersion" -ForegroundColor Green

# 2. Virtual environment setup
if (-not $env:VIRTUAL_ENV) {
    if (-not (Test-Path ".venv")) {
        Write-Host "Creating virtual environment in .venv..."
        python -m venv .venv
    }
    Write-Host "Activating virtual environment..."
    & .\.venv\Scripts\Activate.ps1
}

# 3. Install dependencies
Write-Host "Installing Socratic Tutor dependencies..."
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"

# 4. Initialize Database
Write-Host "Initializing SQLite database schema..."
python -c "from storage.db import init_db; init_db()"

# 5. Copy skill to Claude directory
Write-Host "Installing Claude Code skill..."
$claudeHomeDir = "$HOME\.claude\skills\socratic"
New-Item -ItemType Directory -Force -Path $claudeHomeDir | Out-Null
Copy-Item "adapters\claude_code\SKILL.md" -Destination "$claudeHomeDir\SKILL.md" -Force

$localClaudeDir = ".claude\skills\socratic"
New-Item -ItemType Directory -Force -Path $localClaudeDir | Out-Null
Copy-Item "adapters\claude_code\SKILL.md" -Destination "$localClaudeDir\SKILL.md" -Force

# 6. Verify
Write-Host "Verifying installation with initial diagnostic turn..."
python -m core.cli ask "teach me recursion" --session "install-verify"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✔ Socratic Tutor v2 is ready in under a minute!" -ForegroundColor Green
Write-Host ""
Write-Host "Usage in Claude Code:   /socratic teach me recursion"
Write-Host "Usage in Terminal:      python -m core.cli ask 'teach me recursion'"
Write-Host "Usage in Web Browser:   python -m adapters.web"
Write-Host "=================================================" -ForegroundColor Cyan
