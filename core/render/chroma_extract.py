#!/usr/bin/env python3
"""
Extract clean transparent sprite PNGs + pivots from a solid chroma-green (#00FF00) AI sprite sheet.
Applies green-spill suppression so ink contours remain crisp without green fringes.

Usage:
  python core/render/chroma_extract.py <sheet.png> <out_dir> [--bg-hex 00FF00] [--min-area 400] [--pad 6]
"""
import argparse
import json
import os
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def hex_to_rgb(hx: str):
    hx = hx.lstrip("#")
    return tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))


def connected_components(fg_mask: np.ndarray):
    try:
        from scipy.ndimage import label, find_objects
        labeled, num = label(fg_mask, structure=np.ones((3, 3), dtype=int))
        objs = find_objects(labeled)
        boxes = []
        for idx, sl in enumerate(objs, start=1):
            if sl is None:
                continue
            y0, y1 = sl[0].start, sl[0].stop
            x0, x1 = sl[1].start, sl[1].stop
            area = int(np.sum(labeled[y0:y1, x0:x1] == idx))
            boxes.append((x0, y0, x1, y1, area))
        return boxes
    except ImportError:
        h, w = fg_mask.shape
        visited = np.zeros_like(fg_mask, dtype=bool)
        boxes = []
        for sy in range(h):
            for sx in range(w):
                if not fg_mask[sy, sx] or visited[sy, sx]:
                    continue
                q = deque([(sy, sx)])
                visited[sy, sx] = True
                x0 = x1 = sx
                y0 = y1 = sy
                area = 0
                while q:
                    y, x = q.popleft()
                    area += 1
                    if x < x0: x0 = x
                    if x > x1: x1 = x
                    if y < y0: y0 = y
                    if y > y1: y1 = y
                    for dy in (-1, 0, 1):
                        ny = y + dy
                        if ny < 0 or ny >= h: continue
                        for dx in (-1, 0, 1):
                            nx = x + dx
                            if 0 <= nx < w and fg_mask[ny, nx] and not visited[ny, nx]:
                                visited[ny, nx] = True
                                q.append((ny, nx))
                boxes.append((x0, y0, x1 + 1, y1 + 1, area))
        return boxes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("sheet", help="Input chroma-green sprite sheet PNG/JPG")
    parser.add_argument("out_dir", help="Output directory for cropped sprites and manifest.json")
    parser.add_argument("--bg-hex", default="00FF00")
    parser.add_argument("--min-area", type=int, default=400)
    parser.add_argument("--pad", type=int, default=6)
    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    im = Image.open(args.sheet).convert("RGBA")
    arr = np.asarray(im, dtype=np.float32)
    r, g, b, a0 = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    bg_r, bg_g, bg_b = hex_to_rgb(args.bg_hex)
    # Green dominance distance + soft key ramp
    max_rb = np.maximum(r, b)
    green_excess = g - max_rb
    dist_bg = np.sqrt((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2)

    is_green_strong = (green_excess > 45.0) & (dist_bg < 165.0)
    soft_key = np.clip((green_excess - 16.0) / 42.0, 0.0, 1.0) * np.clip((180.0 - dist_bg) / 90.0, 0.0, 1.0)
    alpha_f = np.where(is_green_strong, 0.0, 1.0 - soft_key) * (a0 / 255.0)

    # Despill edges cleanly so dark contours stay crisp
    spill_mask = alpha_f < 0.99
    g_clean = np.where(spill_mask & (g > max_rb), max_rb + 3.0, g)

    rgba_out = np.stack([
        np.clip(r, 0, 255),
        np.clip(g_clean, 0, 255),
        np.clip(b, 0, 255),
        np.clip(alpha_f * 255.0, 0, 255),
    ], axis=-1).astype(np.uint8)

    fg_mask = alpha_f > 0.18
    raw_boxes = [box for box in connected_components(fg_mask) if box[4] >= args.min_area]
    # Sort neatly row-by-row then left-to-right
    h_img, w_img = fg_mask.shape
    row_bin = max(40, h_img // 10)
    raw_boxes.sort(key=lambda bx: (bx[1] // row_bin, bx[0]))

    debug_bg = Image.new("RGBA", (w_img, h_img), (228, 218, 198, 255))
    debug_fg = Image.fromarray(rgba_out, mode="RGBA")
    debug_vis = Image.alpha_composite(debug_bg, debug_fg).convert("RGB")
    draw = ImageDraw.Draw(debug_vis)
    try:
        font = ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", 22)
    except Exception:
        font = ImageFont.load_default()

    sprites_meta = []
    for idx, (x0, y0, x1, y1, area) in enumerate(raw_boxes, start=1):
        px0 = max(0, x0 - args.pad)
        py0 = max(0, y0 - args.pad)
        px1 = min(w_img, x1 + args.pad)
        py1 = min(h_img, y1 + args.pad)

        crop = Image.fromarray(rgba_out[py0:py1, px0:px1], mode="RGBA")
        fname = f"part_{idx:02d}.png"
        crop.save(os.path.join(args.out_dir, fname))

        sprites_meta.append({
            "id": f"part_{idx:02d}",
            "file": fname,
            "bbox": [int(px0), int(py0), int(px1), int(py1)],
            "size": [int(px1 - px0), int(py1 - py0)],
            "area": int(area),
            "pivot": [0.5, 0.85],
        })

        draw.rectangle((px0, py0, px1 - 1, py1 - 1), outline=(200, 40, 35), width=3)
        draw.rectangle((px0, max(0, py0 - 28), px0 + 96, max(28, py0)), fill=(35, 32, 28))
        draw.text((px0 + 6, max(2, py0 - 25)), f"#{idx:02d}", font=font, fill=(245, 236, 215))

    manifest_path = os.path.join(args.out_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({
            "source_sheet": os.path.abspath(args.sheet),
            "sheet_size": [int(w_img), int(h_img)],
            "bg_hex": args.bg_hex,
            "count": len(sprites_meta),
            "sprites": sprites_meta,
        }, f, ensure_ascii=False, indent=2)

    debug_path = os.path.join(args.out_dir, "debug_sheet.png")
    debug_vis.save(debug_path)
    print(f"[chroma_extract] Extracted {len(sprites_meta)} sprites -> {args.out_dir}")
    print(f"[chroma_extract] Debug sheet -> {debug_path}")


if __name__ == "__main__":
    main()
