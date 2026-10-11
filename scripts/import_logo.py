#!/usr/bin/env python3
"""Turn a source logo into the app's icon set.

Usage:
    python scripts/import_logo.py <source-image> [--out static]

Produces:
    static/icons/icon-512.png        standard, full bleed
    static/icons/icon-192.png
    static/icons/apple-touch-icon.png
    static/icons/favicon-64.png
    static/icons/maskable-512.png    logo inset on a flat background so that a
                                     circular launcher mask never clips it
    static/logo.png                  in-app header mark

Maskable icons need ~20% of the canvas kept clear, so the artwork is scaled
down and the exposed area is filled with the colour sampled from the logo's own
corners. That keeps the launcher icon flush with the app's background colour
instead of showing a black frame.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image, ImageStat
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required:  python -m pip install Pillow")

# Artwork must stay inside this fraction of the canvas to survive a safe mask.
MASKABLE_SCALE = 0.76


def sample_background(image: Image.Image) -> tuple[int, int, int]:
    """Average the corners, which are background in a centred logo."""
    w, h = image.size
    patch = 6
    strip = Image.new("RGB", (patch * 4, patch))
    for i, (x0, y0) in enumerate(
        ((0, 0), (w - patch, 0), (0, h - patch), (w - patch, h - patch))
    ):
        strip.paste(image.crop((x0, y0, x0 + patch, y0 + patch)).convert("RGB"), (i * patch, 0))
    return tuple(int(round(v)) for v in ImageStat.Stat(strip).mean)  # type: ignore[return-value]


def flatten(image: Image.Image, background: tuple[int, int, int]) -> Image.Image:
    """Composite onto a solid background so JPEG sources lose their black matte."""
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        return image
    return image.convert("RGB")


def square(image: Image.Image) -> Image.Image:
    """Centre-crop anything non-square to a square."""
    w, h = image.size
    if w == h:
        return image
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return image.crop((left, top, left + side, top + side))


def resample(image: Image.Image, size: int) -> Image.Image:
    return image.resize((size, size), Image.LANCZOS)


def write(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)
    print(f"  {path.as_posix():<40} {image.size[0]}x{image.size[1]}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate the Zikr icon set from a logo.")
    parser.add_argument("source", type=Path, help="source image (png, jpg, svg, …)")
    parser.add_argument("--out", type=Path, default=Path("static"), help="output directory")
    args = parser.parse_args()

    if not args.source.is_file():
        sys.exit(f"No such file: {args.source}")

    opened = Image.open(args.source)
    logo = square(flatten(opened, (0, 0, 0)))
    background = sample_background(opened)

    print(f"source   {args.source} ({opened.size[0]}x{opened.size[1]}, {opened.mode})")
    print(f"background rgb{background}")

    icons = args.out / "icons"
    print("full-bleed icons")
    for size in (512, 192, 180, 64):
        name = {
            512: "icon-512.png",
            192: "icon-192.png",
            180: "apple-touch-icon.png",
            64: "favicon-64.png",
        }[size]
        write(resample(logo, size), icons / name)

    print("maskable icon")
    side = 512
    inset = int(side * (1 - MASKABLE_SCALE) / 2)
    art = resample(logo, int(side * MASKABLE_SCALE))
    canvas = Image.new("RGB", (side, side), background)
    canvas.paste(art, (inset, inset))
    write(canvas, icons / "maskable-512.png")

    print("in-app mark")
    write(resample(logo, 256), args.out / "logo.png")

    stamp_cache_busting(args.out, icons)
    return 0


def stamp_cache_busting(out: Path, icons: Path) -> None:
    """Make this logo version unmissable for anything already cached.

    Launchers and browsers cache icons aggressively, and a manifest that keeps
    pointing at the same URLs lets a stale copy win indefinitely. Tying the
    query string and the service-worker cache name to a hash of the artwork
    means a new logo always produces new URLs and a new cache.
    """
    version = hashlib.sha256((icons / "icon-512.png").read_bytes()).hexdigest()[:10]

    manifest_path = out / "manifest.webmanifest"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for icon in manifest.get("icons", []):
        src = icon.get("src", "")
        if src:
            # Strip any previous stamp so re-running stays idempotent.
            clean = src.split("?")[0]
            icon["src"] = f"{clean}?v={version}"
    manifest_path.write_text(json.dumps(manifest, indent="\t", ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  manifest icons pinned to v={version}")

    sw_path = out / "sw.js"
    sw = sw_path.read_text(encoding="utf-8")
    sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{version}';", sw, count=1)
    sw = re.sub(
        r"(const PRECACHE = \[)(.*?)(\];)",
        lambda m: m.group(1)
        + re.sub(
            r"'([^']+)'",
            lambda s: f"'{s.group(1).split('?')[0]}?v={version}'",
            m.group(2),
        )
        + m.group(3),
        sw,
        count=1,
        flags=re.S,
    )
    sw_path.write_text(sw, encoding="utf-8")
    print(f"  service worker cache renamed to zikr-{version}")


if __name__ == "__main__":
    raise SystemExit(main())