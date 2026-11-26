#!/usr/bin/env python3
"""
Mux video and audio using two-pass EBU R128 loudness normalization (-14 LUFS)
followed by full black-frame verification (ffmpeg blackdetect).

Usage:
  python core/render/mux.py <video.mp4> <audio.wav> <out.mp4> [--target-lufs -14] [--tp -1.2] [--grain 0] [--allow-black]
"""
import argparse
import json
import os
import re
import subprocess
import sys


def run_cmd(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def probe_duration(path: str) -> float:
    res = run_cmd([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path,
    ])
    if res.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {res.stderr}")
    return float(res.stdout.strip())


def parse_loudnorm_json(stderr_text: str):
    matches = re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", stderr_text, flags=re.DOTALL)
    if not matches:
        return None
    return json.loads(matches[-1])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("video", help="Input silent video MP4")
    parser.add_argument("audio", help="Input audio WAV/MP3")
    parser.add_argument("out", help="Output muxed MP4")
    parser.add_argument("--target-lufs", type=float, default=-14.0)
    parser.add_argument("--tp", type=float, default=-1.2)
    parser.add_argument("--lra", type=float, default=11.0)
    parser.add_argument("--grain", type=float, default=0.0, help="Optional subtle film grain strength (0=none)")
    parser.add_argument("--allow-black", action="store_true", help="Do not fail on blackdetect hits")
    args = parser.parse_args()

    for p in (args.video, args.audio):
        if not os.path.exists(p) or os.path.getsize(p) < 64:
            print(f"[mux] Error: missing or empty input file: {p}", file=sys.stderr)
            sys.exit(2)

    vid_dur = probe_duration(args.video)
    print(f"[mux] Video duration: {vid_dur:.3f}s")

    # Pass 1: measure loudnorm parameters
    p1 = run_cmd([
        "ffmpeg", "-y", "-hide_banner", "-i", args.audio,
        "-af", f"loudnorm=I={args.target_lufs}:TP={args.tp}:LRA={args.lra}:print_format=json",
        "-f", "null", os.devnull,
    ])
    if p1.returncode != 0:
        print(p1.stderr, file=sys.stderr)
        sys.exit(p1.returncode)

    stats = parse_loudnorm_json(p1.stderr)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)

    is_silent = stats is None or str(stats.get("input_i", "")).strip() == "-inf"
    if is_silent:
        print("[mux] Warning: input audio is silent (-inf); copying track with padding.")
        af_chain = f"apad=whole_dur={vid_dur:.3f},atrim=0:{vid_dur:.3f}"
    else:
        af_chain = (
            f"apad=whole_dur={vid_dur:.3f},atrim=0:{vid_dur:.3f},"
            f"loudnorm=I={args.target_lufs}:TP={args.tp}:LRA={args.lra}:"
            f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
            f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:"
            f"offset={stats['target_offset']}:linear=true"
        )

    cmd_mux = ["ffmpeg", "-y", "-hide_banner", "-i", args.video, "-i", args.audio]
    if args.grain > 0:
        cmd_mux += ["-vf", f"noise=alls={args.grain}:allf=t", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17"]
    else:
        cmd_mux += ["-c:v", "copy"]

    cmd_mux += [
        "-af", af_chain,
        "-ar", "48000", "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        args.out,
    ]
    p2 = run_cmd(cmd_mux)
    if p2.returncode != 0:
        print(p2.stderr, file=sys.stderr)
        sys.exit(p2.returncode)

    # Measure final loudness + blackdetect scan
    p_chk = run_cmd([
        "ffmpeg", "-hide_banner", "-i", args.out,
        "-vf", "blackdetect=d=0.10:pix_th=0.05",
        "-af", "ebur128=peak=true",
        "-f", "null", os.devnull,
    ])
    black_hits = [ln.strip() for ln in p_chk.stderr.splitlines() if "black_start:" in ln]
    i_match = re.findall(r"I:\s*([-+]?\d+\.\d+|-inf)\s*LUFS", p_chk.stderr)
    tp_match = re.findall(r"Peak:\s*([-+]?\d+\.\d+|-inf)\s*dBFS", p_chk.stderr)
    final_i = i_match[-1] if i_match else "unknown"
    final_tp = tp_match[-1] if tp_match else "unknown"

    print(f"[mux] Output -> {args.out}")
    print(f"[mux] Final Integrated Loudness: {final_i} LUFS | True Peak: {final_tp} dBFS | Black frames: {len(black_hits)}")
    for bh in black_hits:
        print(f"  [blackdetect] {bh}")

    if black_hits and not args.allow_black:
        print("[mux] FAIL: Unexpected black frames detected!", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
