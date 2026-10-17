"""Regenerate committed delivery assets: python3 scripts/optimize-images.py (Pillow)."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'public' / 'brand'
variants = {
    'inspecting': [320, 430, 640, 860, 960, 1254],
    'questioning': [100, 165, 200, 330, 495],
    'greencheck': [190, 380, 570],
}
for name, widths in variants.items():
    with Image.open(root / f'mascot-{name}.png') as source:
        for width in widths:
            resized = source.resize((width, width), Image.Resampling.LANCZOS)
            resized.save(root / f'mascot-{name}-{width}.webp', quality=90, method=6)
