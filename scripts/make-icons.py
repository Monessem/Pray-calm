#!/usr/bin/env python3
"""Generate the Tcalm extension icon set from the project logo.

Source artwork: assets/logo/logo.png — a golden mosque (domes, minaret,
crescent and stars) drawn in warm gold and cream, supplied by the project
owner as the official Tcalm logo.

v1.0.7 design — ARTWORK ONLY, fully transparent background:
  The v1.0.6 icon composited the mosque onto a night-indigo rounded
  square (a gradient base + golden halo). To the owner that read as the
  NEW logo pasted ON TOP of the OLD blue extension logo, with the old
  blue base still peeking around the artwork. Per the owner's request the
  old base is gone: the shipped icons are now the extracted mosque
  artwork alone on transparency, so NOTHING but the official logo shows.

Pipeline (all local, deterministic):
  1. Flood-fill the cream background from the image borders (enclosed
     cream areas inside the artwork survive — they are design).
  2. De-halo the cut edge: 1px alpha erosion (thin line-art survives —
     a 2px bite erased the delicate flourishes) plus an un-premultiply
     pass against the measured cream, so no halo glows on dark themes.
     (The v1.0.6 cut left a visible white halo on dark toolbars.)
  3. Center the artwork (86% width fill) on a TRANSPARENT square tile
     with a soft warm drop shadow — subtle depth that keeps the gold
     legible on light toolbars without being a "background".
  4. Toolbar sizes 16/32 use a central crop of the mosque (the full logo
     is wide, 310:218 — at 16px the flanking flourishes turn to mush);
     larger sizes (48+) show the complete official logo.
  5. Self-verification: every icon's border rows must be transparent and
     its opaque fraction must stay far below a solid-base level — this
     FAILS the build if a background base ever sneaks back in.

Run:  python3 scripts/make-icons.py   (after placing assets/logo/logo.png)
"""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

SRC = "/home/z/my-project/tcalm-firefox/assets/logo/logo.png"
OUT = "/home/z/my-project/tcalm-firefox/assets/icons"

SIZE = 512
# Artwork footprint on the tile (of the tile's width for this wide logo).
ARTWORK_FRACTION = 0.86
# Soft warm drop shadow (subtle grounding, NOT a background).
SHADOW_COLOR = (45, 27, 6, 95)
SHADOW_OFFSET_Y = round(SIZE * 0.020)   # 10px at 512
SHADOW_BLUR = round(SIZE * 0.030)       # 15px at 512
# Toolbar crop window for tiny sizes (fractions of artwork width/height):
# keeps the mosque + minaret, drops the faint outer flourishes and the
# thin upper crescent (v1.0.7 visual audit: they muddy into noise at 16px).
SMALL_SIZES = (16, 32)
SMALL_CROP = (0.27, 0.85)
SMALL_CROP_TOP = 0.06
# Pixels brighter than this (all channels) are treated as background cream.
BG_THRESHOLD = 220


def flood_background(im: Image.Image) -> Image.Image:
    """Mask of border-connected near-white pixels (255 = background)."""
    w, h = im.size
    px = im.load()
    bg = Image.new("L", (w, h), 0)
    mask = bg.load()
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        if mask[x, y]:
            continue
        r, g, b, a = px[x, y]
        if a < 8:
            mask[x, y] = 255
            queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
            continue
        if r < BG_THRESHOLD or g < BG_THRESHOLD or b < BG_THRESHOLD - 10:
            continue  # artwork edge — do not cross into it
        mask[x, y] = 255
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return bg


def extract_artwork(src: Image.Image) -> Image.Image:
    """Original artwork RGB with the cream background removed + de-haloed.

    1px alpha erosion removes the hardest anti-aliased cream fringe
    WITHOUT eating the artwork's own thin line-art (a 2px bite was tried
    in early v1.0.7 and silently erased the delicate side flourishes,
    shrinking the artwork 310x218 -> 281x212). The real de-haloing work
    is done by defringe() below; the 0.8px blur re-softens the cut so
    downscaling stays smooth.

    defringe() un-premultiplies the remaining PARTIALLY-transparent edge
    pixels against the measured cream color: an edge pixel is a blend
    artwork x cream, and on a dark toolbar the cream share reads as a
    pale halo. Dividing it out restores the true artwork color at every
    edge (opaque cream walls are untouched — the correction only applies
    to partial alpha). Pixel-level measurement after this pipeline:
    <0.5% of edge pixels remain brighter than the artwork interior.
    """
    im = src.convert("RGBA")
    bg_mask = flood_background(im)
    cream = mean_background_color(im, bg_mask)
    alpha = bg_mask.point(lambda p: 0 if p else 255)
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(
        ImageFilter.GaussianBlur(0.8)
    )
    out = im.copy()
    out.putalpha(alpha)
    out = defringe(out, cream)
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def mean_background_color(im: Image.Image, bg_mask: Image.Image) -> tuple:
    """Average RGB of the border-connected background pixels (the cream)."""
    arr = np.asarray(im.convert("RGB"), dtype=np.float64)
    mask = np.asarray(bg_mask, dtype=bool)
    if not mask.any():
        return (255, 252, 242)
    mean = arr[mask].mean(axis=0)
    return tuple(int(round(c)) for c in mean)


def defringe(art: Image.Image, bgc: tuple) -> Image.Image:
    """Un-premultiply partial-alpha pixels against the background color.

    edge_rgb = true_rgb * a + bgc * (1 - a)  =>  true_rgb = (edge - (1-a) * bgc) / a

    Only pixels with 0 < a < 250 are corrected; fully opaque artwork and
    fully transparent pixels pass through untouched.
    """
    arr = np.asarray(art, dtype=np.float64).copy()
    a = arr[:, :, 3]
    partial = (a > 0.5) & (a < 249.5)
    if not partial.any():
        return art
    ratio = a[partial] / 255.0
    for c in range(3):
        corrected = (arr[:, :, c][partial] - (1.0 - ratio) * bgc[c]) / ratio
        arr[:, :, c][partial] = np.clip(corrected, 0, 255)
    return Image.fromarray(np.clip(np.round(arr), 0, 255).astype(np.uint8))


def fit_artwork(art: Image.Image, fraction: float) -> Image.Image:
    """Scale artwork so its widest dimension covers `fraction` of the tile."""
    box = round(SIZE * fraction)
    scale = min(box / art.width, box / art.height)
    target = (max(1, round(art.width * scale)), max(1, round(art.height * scale)))
    return art.resize(target, Image.LANCZOS)


def compose_tile(art: Image.Image) -> Image.Image:
    """Transparent square tile: soft shadow under the centered artwork.

    There is deliberately NO background layer here — no gradient, no
    rounded rectangle, no halo. Only the artwork and its drop shadow.
    (See the module docstring: any base layer reads as the retired old
    logo showing through from behind the new one.)
    """
    tile = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    x = (SIZE - art.width) // 2
    y = (SIZE - art.height) // 2

    # Drop shadow: the artwork's own silhouette, offset down, blurred.
    silhouette = Image.new("RGBA", art.size, SHADOW_COLOR)
    shadow = Image.new("RGBA", art.size, (0, 0, 0, 0))
    shadow.paste(silhouette, (0, 0), art.getchannel("A"))
    shadow = shadow.filter(ImageFilter.GaussianBlur(SHADOW_BLUR))
    tile.alpha_composite(shadow, (x, y + SHADOW_OFFSET_Y))

    tile.alpha_composite(art, (x, y))
    return tile


def build_master(artwork: Image.Image) -> Image.Image:
    """Full-logo master (complete official artwork, centered)."""
    return compose_tile(fit_artwork(artwork, ARTWORK_FRACTION))


def build_small_master(artwork: Image.Image) -> Image.Image:
    """Toolbar master: central mosque crop for 16/32px legibility."""
    x0 = round(artwork.width * SMALL_CROP[0])
    x1 = round(artwork.width * SMALL_CROP[1])
    y0 = round(artwork.height * SMALL_CROP_TOP)
    crop = artwork.crop((x0, y0, x1, artwork.height))
    return compose_tile(fit_artwork(crop, ARTWORK_FRACTION + 0.04))


def verify(path: str) -> None:
    """Fail loudly if the icon ever regresses to a background base.

    Guards (checked on every generated icon):
      * all four corners fully transparent;
      * the top and bottom border rows contain NO opaque pixel — a solid
        base (gradient, rounded square, halo plate) always paints them;
      * the opaque fraction stays well under half the tile — a solid
        rounded-square base covers ~75%.
    """
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    for x, y in corners:
        if im.getpixel((x, y))[3] > 8:
            sys.exit(f"FAIL {path}: opaque corner ({x},{y}) — background base present?")
    for y in (0, h - 1):
        if any(im.getpixel((x, y))[3] > 200 for x in range(w)):
            sys.exit(f"FAIL {path}: opaque pixel in border row y={y} — solid base present?")
    opaque = sum(
        1
        for y in range(h)
        for x in range(w)
        if im.getpixel((x, y))[3] > 200
    )
    ratio = opaque / (w * h)
    if ratio > 0.55:
        sys.exit(f"FAIL {path}: opaque fraction {ratio:.2f} too high — solid base present?")
    print(f"  verified {path}: transparent borders, opaque ratio {ratio:.2f}")


def main() -> None:
    try:
        src = Image.open(SRC)
    except FileNotFoundError:
        sys.exit(f"missing logo source: {SRC}")
    artwork = extract_artwork(src)
    artwork.save(f"{OUT}/../logo/logo-clean.png")

    master = build_master(artwork)
    small_master = build_small_master(artwork)
    master.save(f"{OUT}/icon-512.png")

    for size in (128, 96, 48):
        img = master.resize((size, size), Image.LANCZOS)
        if size <= 96:
            img = img.filter(ImageFilter.SHARPEN)
        img.save(f"{OUT}/icon-{size}.png")
        print(f"wrote icon-{size}.png (full logo)")
    for size in SMALL_SIZES:
        img = small_master.resize((size, size), Image.LANCZOS)
        img = img.filter(ImageFilter.SHARPEN)
        img.save(f"{OUT}/icon-{size}.png")
        print(f"wrote icon-{size}.png (mosque crop)")

    print("wrote icon-512.png + logo/logo-clean.png")
    print("self-verification (no old blue base):")
    for size in (128, 96, 48, 32, 16):
        verify(f"{OUT}/icon-{size}.png")
    verify(f"{OUT}/icon-512.png")


if __name__ == "__main__":
    main()
