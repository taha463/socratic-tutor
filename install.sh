#!/usr/bin/env bash
set -e

echo "================================================="
echo "   Socratic Tutor v2: Autonomous Installation    "
echo "================================================="

# 1. Check Python version
if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
    echo "❌ Error: Python 3.11+ is required but not found."
    exit 1
fi

PYTHON_CMD="python3"
if ! command -v python3 &>/dev/null; then
    PYTHON_CMD="python"
fi

PY_VERSION=$($PYTHON_CMD -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "✔ Found Python $PY_VERSION"

# 2. Virtual Environment setup (if not already active)
if [ -z "$VIRTUAL_ENV" ]; then
    if [ ! -d ".venv" ]; then
        echo "Creating virtual environment in .venv..."
        $PYTHON_CMD -m venv .venv
    fi
    echo "Activating virtual environment..."
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    elif [ -f ".venv/Scripts/activate" ]; then
        source .venv/Scripts/activate
    fi
fi

# 3. Install dependencies
echo "Installing Socratic Tutor in editable mode..."
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -e ".[dev]"

# 4. Initialize SQLite Database
echo "Initializing SQLite database schema..."
python -c "from storage.db import init_db; init_db()"

# 5. Configure Claude Code skill
echo "Installing Claude Code skill..."
mkdir -p "$HOME/.claude/skills/socratic"
cp "adapters/claude_code/SKILL.md" "$HOME/.claude/skills/socratic/SKILL.md" 2>/dev/null || true

mkdir -p ".claude/skills/socratic"
cp "adapters/claude_code/SKILL.md" ".claude/skills/socratic/SKILL.md"

# 6. Verify with test turn
echo "Verifying installation with initial diagnostic turn..."
python -m core.cli ask "teach me recursion" --session "install-verify" > /dev/null

echo "================================================="
echo "✔ Socratic Tutor v2 is ready in under a minute!"
echo ""
echo "Usage in Claude Code:   /socratic teach me recursion"
echo "Usage in Terminal:      python -m core.cli ask 'teach me recursion'"
echo "Usage in Web Browser:   python -m adapters.web"
echo "================================================="
