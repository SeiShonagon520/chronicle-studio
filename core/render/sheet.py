#!/usr/bin/env python3
"""
Stitch image sequences into labeled contact sheets, 0.2s action strips, or Visual PK boards.
Usage:
  python core/render/sheet.py <out.jpg> <img1> <img2> ... [--cols 2] [--tile-w 960] [--titles "A|B|C|D"] [--header "Title"]
"""
import argparse
import os
import sys
from PIL import Image, ImageDraw, ImageFont


def load_font(size: int):
    candidates = [
        r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simsun.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        "/System/Library/Fonts/PingFang.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("out", help="Output image path (.jpg or .png)")
    parser.add_argument("images", nargs="+", help="Input images")
    parser.add_argument("--cols", type=int, default=2)
    parser.add_argument("--tile-w", type=int, default=960)
    parser.add_argument("--pad", type=int, default=20)
    parser.add_argument("--titles", default="", help="Pipe-separated per-tile labels")
    parser.add_argument("--header", default="", help="Optional top banner title")
    args = parser.parse_args()

    valid_paths = [p for p in args.images if os.path.exists(p)]
    if not valid_paths:
        print("[sheet.py] Error: no valid input images found.", file=sys.stderr)
        sys.exit(2)

    titles = [t.strip() for t in args.titles.split("|")] if args.titles else []
    cols = max(1, args.cols)
    rows = (len(valid_paths) + cols - 1) // cols

    with Image.open(valid_paths[0]) as first:
        aspect = first.height / max(1, first.width)
    tile_w = args.tile_w
    tile_h = max(64, int(round(tile_w * aspect)))
    label_h = 40
    header_h = 68 if args.header else 0
    pad = args.pad

    total_w = pad + cols * (tile_w + pad)
    total_h = header_h + pad + rows * (tile_h + label_h + pad)

    canvas = Image.new("RGB", (total_w, total_h), (26, 25, 23))
    draw = ImageDraw.Draw(canvas)
    f_hdr = load_font(30)
    f_lbl = load_font(20)

    if args.header:
        draw.rectangle((0, 0, total_w, header_h), fill=(36, 34, 30))
        draw.line((0, header_h - 1, total_w, header_h - 1), fill=(184, 150, 76), width=2)
        draw.text((pad, 18), args.header, font=f_hdr, fill=(242, 232, 212))

    for idx, img_path in enumerate(valid_paths):
        r = idx // cols
        c = idx % cols
        x0 = pad + c * (tile_w + pad)
        y0 = header_h + pad + r * (tile_h + label_h + pad)

        with Image.open(img_path) as im:
            rgb = im.convert("RGB").resize((tile_w, tile_h), Image.Resampling.LANCZOS)
            canvas.paste(rgb, (x0, y0))

        draw.rectangle((x0, y0, x0 + tile_w - 1, y0 + tile_h - 1), outline=(92, 86, 76), width=2)
        label = titles[idx] if (idx < len(titles) and titles[idx]) else os.path.basename(img_path)
        draw.rectangle((x0, y0 + tile_h, x0 + tile_w - 1, y0 + tile_h + label_h - 4), fill=(38, 36, 32))
        draw.text((x0 + 12, y0 + tile_h + 7), label, font=f_lbl, fill=(242, 232, 212))

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    save_kwargs = {"quality": 93} if args.out.lower().endswith((".jpg", ".jpeg")) else {}
    canvas.save(args.out, **save_kwargs)
    print(f"[sheet] Saved {len(valid_paths)} tiles -> {args.out}")


if __name__ == "__main__":
    main()
