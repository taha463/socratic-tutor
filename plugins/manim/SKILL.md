---
name: manim
description: Deep-dive mathematical and algorithmic animations via Manim (optional plugin).
plugin: true
---

# Manim Animation Plugin

## Overview
Generates high-fidelity mathematical and conceptual animations using [Manim Community Edition](https://www.manim.community/).

## Prerequisites
Manim requires system dependencies:
- `ffmpeg` (for video encoding)
- Cairo and Pango graphics libraries
- LaTeX (optional, for TeX formula compilation)

## Enabling Manim
By default, Manim is **disabled** to maintain sub-minute installation without heavy C-dependencies:
```bash
# In your .env or shell environment
export SOCRATIC_ENABLE_MANIM=1
```

If disabled or if prerequisites are absent, the plugin automatically provides an animated SVG/HTML storyboard preview with zero crashes.

