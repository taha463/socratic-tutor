# Optional Manim Plugin for Socratic Tutor v2

This plugin adds video and animated GIF generation using 3Blue1Brown's [Manim](https://github.com/ManimCommunity/manim).

## Why is it optional?
Socratic Tutor v2 is designed to run anywhere with a sub-minute zero-config install (`Python + SQLite`).
Manim requires external C-libraries (Cairo, Pango, ffmpeg) that cannot be installed purely via wheel on all platforms.

## Installation
If you wish to enable Manim animations:
```bash
# 1. Install system ffmpeg
# macOS: brew install ffmpeg cairo pango
# Ubuntu/Debian: sudo apt-get install ffmpeg libcairo2-dev libpango1.0-dev
# Windows: winget install Gyan.FFmpeg

# 2. Install optional Python package
pip install ".[plugins]"

# 3. Enable in environment
export SOCRATIC_ENABLE_MANIM=1
```

When disabled, Socratic Tutor automatically uses the SVG storyboard fallback.

