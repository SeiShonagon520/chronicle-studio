# Core Toolchain Reference (`core/`)

All shared rendering, motion math, sprite extraction, subtitle generation, and audio mastering scripts live under `core/`. **Never modify files in `core/` for a single film project.**

---

## 1. JavaScript Math & Motion Libraries (`core/lib/`)

Import inside any project `index.html` using `/@core/lib/...`:
- **`/@core/lib/prng.js`**:
  - `hashStr(str)` → 32-bit FNV-1a integer hash
  - `mulberry32(seed)` → deterministic `[0, 1)` PRNG
  - `valueNoise2D(x, y, seed)` → deterministic smooth 2D noise in `[0, 1]`
  - `withSeed(seed, fn)` → runs a deterministic generator callback with an isolated PRNG instance
- **`/@core/lib/motion.js`**:
  - `MOTION_DUR` (`T_MICRO: 0.18, T_UI: 0.36, T_MORPH: 0.52, T_TRANS: 0.75, T_GLIDE: 1.50`)
  - `beatScale(bpm)` → scales durations proportionally to project BPM (`80 BPM` base = `0.75s/beat`)
  - `clamp01`, `easeOutQuint`, `easeOutExpo`, `easeInOutCubic`, `smoothstep`
  - `criticallyDampedSpring(dt, tau)` → zero-overshoot analytic $\zeta = 1.0$ spring (stateless per frame)
  - `QuinticHermiteSpline(keyframes)` → C2-continuous position/velocity/acceleration spline across `[t, value]` or `[t, x, y, ...]` waypoints
  - `textCrossfadeWeights(u)` → returns `{ wOld, wNew, yOldOffset, yNewOffset }` ensuring old text fades out completely (`u <= 0.42`) before new text enters (`u >= 0.52`), preventing double-text ghosting
  - `resolveCardRepulsion(cards, bounds, gap)` → smooth collision separation within safe margins
  - `isReducedMotion()` → checks `?reducedMotion=1` URL search param

---

## 2. Node 24 Zero-Dependency CDP Renderer (`core/render/`)

Uses local Chrome or Edge directly via Node 24 built-in `WebSocket` and `fetch`. Set `CHRONICLE_CHROME` to override browser executable path if needed.

| Command | Purpose |
| :--- | :--- |
| `node core/render/still.mjs <projectDir> [t1 t2 ...] [--range a:b:step] [--size 1920x1080] [--format jpg\|png] [--prefix st_] [--out dir] [--q k=v]` | Deterministically captures still frames (`window.render(t)`), fails immediately on JS/module errors or lost WebGL context. |
| `node core/render/video.mjs <projectDir> [--fps 24] [--size 1920x1080] [--crf 17] [--out <projectDir>/out/video.mp4] [--q k=v]` | Streams frames `0..DUR*fps` directly via stdin JPEG pipe into FFmpeg H.264 YUV420p video. |
| `node core/render/readcheck.mjs <projectDir> [--step 0.05] [--size 1920x1080] [--cjk-cps 4.5] [--latin-cps 15] [--pad 1.5] [--min 1.5] [--q k=v]` | Scans `window.TEXTS(t)` across `[0, DUR]`, failing if any non-`pass` text leaves frame bounds or displays for less than readable duration. |

---

## 3. Python Visual & Mastering Tools (`core/render/`)

Tested on Windows with Anaconda Python (`Pillow`, `numpy`, optional `scipy`) and `ffmpeg` 7+:

| Command | Purpose |
| :--- | :--- |
| `python core/render/sheet.py <out.jpg> <img1> <img2> ... [--cols 2] [--tile-w 960] [--titles "A\|B\|C\|D"] [--header "Title"]` | Stitches labeled contact sheets, `0.2s` transition strips, and Visual Style PK boards. |
| `python core/render/chroma_extract.py <sheet.png> <out_dir> [--bg-hex 00FF00] [--min-area 400] [--pad 6]` | Removes solid chroma-green backdrop with green-spill suppression, extracts individual transparent PNG sprites, writes `manifest.json` + numbered `debug_sheet.png`. |
| `python core/render/srt.py <timeline_or_cues.json> <out.srt>` | Generates UTF-8 `.srt` subtitles from either `timeline.json` (`subtitles` array) or a plain `[{t0, t1, text}]` list. |
| `python core/render/mux.py <video.mp4> <audio.wav> <out.mp4> [--target-lufs -14] [--tp -1.2] [--grain 0]` | Performs two-pass EBU R128 loudness normalization, pads/trims audio safely to video length, muxes MP4 + AAC, and scans full video via `blackdetect`. |
