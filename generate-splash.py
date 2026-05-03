#!/usr/bin/env python3
"""
generate-splash.py
Generates iOS PWA splash screens using Pillow (PIL).
Install: pip install Pillow
Usage:   python3 generate-splash.py
"""

import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("❌ Pillow not found. Install with: pip install Pillow")
    sys.exit(1)

ICONS_DIR = os.path.join(os.path.dirname(__file__), "icons")
ICON_SRC  = os.path.join(ICONS_DIR, "icon-512.png")
BG_COLOR  = (10, 14, 26)   # #0a0e1a — matches manifest background_color

SPLASHES = [
    ("splash-640x1136.png",   640,  1136),
    ("splash-750x1334.png",   750,  1334),
    ("splash-1242x2208.png", 1242,  2208),
    ("splash-1125x2436.png", 1125,  2436),
    ("splash-828x1792.png",   828,  1792),
    ("splash-1242x2688.png", 1242,  2688),
    ("splash-1170x2532.png", 1170,  2532),
    ("splash-1284x2778.png", 1284,  2778),
    ("splash-1179x2556.png", 1179,  2556),
    ("splash-1290x2796.png", 1290,  2796),
]

if not os.path.exists(ICON_SRC):
    print(f"❌ Icon not found: {ICON_SRC}")
    sys.exit(1)

icon_src = Image.open(ICON_SRC).convert("RGBA")

print("🎨 Generating iOS PWA splash screens...\n")

for name, w, h in SPLASHES:
    # Splash canvas
    splash = Image.new("RGBA", (w, h), BG_COLOR + (255,))

    # Icon size = 28% of shortest side
    icon_size = int(min(w, h) * 0.28)
    icon = icon_src.resize((icon_size, icon_size), Image.LANCZOS)

    # Center the icon
    x = (w - icon_size) // 2
    y = (h - icon_size) // 2
    splash.paste(icon, (x, y), icon)

    out = os.path.join(ICONS_DIR, name)
    splash.convert("RGB").save(out, "PNG", optimize=True)
    print(f"  ✅ {name} ({w}x{h})")

print("\n✨ Done! Splash screens saved to icons/ directory.")
