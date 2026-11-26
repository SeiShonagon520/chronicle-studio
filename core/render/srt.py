#!/usr/bin/env python3
"""
Generate UTF-8 .srt subtitles from timeline.json ("subtitles" list) or a JSON list of cues.
Usage:
  python core/render/srt.py <timeline_or_cues.json> <out.srt>
"""
import argparse
import json
import os


def fmt_ts(sec: float) -> str:
    ms_total = max(0, int(round(float(sec) * 1000)))
    h = ms_total // 3_600_000
    ms_total %= 3_600_000
    m = ms_total // 60_000
    ms_total %= 60_000
    s = ms_total // 1000
    ms = ms_total % 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_json", help="timeline.json or cues list JSON")
    parser.add_argument("out_srt", help="Output .srt file path")
    args = parser.parse_args()

    with open(args.input_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    cues = data.get("subtitles", []) if isinstance(data, dict) else data
    lines = []
    for idx, item in enumerate(cues, start=1):
        t0 = fmt_ts(item["t0"])
        t1 = fmt_ts(item["t1"])
        zh = str(item.get("zh") or item.get("text") or "").strip()
        en = str(item.get("en") or "").strip()
        if not zh and not en:
            continue
        lines.append(str(idx))
        lines.append(f"{t0} --> {t1}")
        if zh:
            lines.append(zh)
        if en:
            lines.append(en)
        lines.append("")

    os.makedirs(os.path.dirname(os.path.abspath(args.out_srt)), exist_ok=True)
    with open(args.out_srt, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[srt] Wrote {len(cues)} cues -> {args.out_srt}")


if __name__ == "__main__":
    main()
