#!/usr/bin/env node
/**
 * Render full video sequence deterministically through Chrome CDP piped to FFmpeg.
 * Usage:
 *   node core/render/video.mjs <projectDir> [--fps 24] [--size 1920x1080] [--crf 17] [--out path.mp4] [--q k=v]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { openProjectPage, parseSize } from './cdp.mjs';

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node core/render/video.mjs <projectDir> [--fps 24] [--size 1920x1080] [--crf 17] [--out out.mp4] [--q k=v]');
  process.exit(2);
}

const takeOpt = (flag, fallback = null) => {
  const i = args.indexOf(flag);
  if (i >= 0) return args.splice(i, 2)[1];
  return fallback;
};

const fps = Number(takeOpt('--fps', '24'));
const crf = String(takeOpt('--crf', '17'));
const { w, h } = parseSize(takeOpt('--size', '1920x1080'));
const outArg = takeOpt('--out', null);
const q = takeOpt('--q', '');

const projectDir = path.resolve(args.shift());
const outFile = path.resolve(outArg || path.join(projectDir, 'out', 'video.mp4'));
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const page = await openProjectPage(projectDir, { w, h, q });
let ff = null;

try {
  const dur = Number(await page.evalJs('window.DUR'));
  if (!Number.isFinite(dur) || dur <= 0) {
    throw new Error(`Invalid window.DUR (${dur}); set positive seconds in index.html`);
  }
  const totalFrames = Math.max(1, Math.round(dur * fps));
  console.log(`[video] Rendering ${totalFrames} frames (${dur.toFixed(2)}s @ ${fps}fps, ${w}x${h}) -> ${outFile}`);

  ff = spawn(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      '-framerate',
      String(fps),
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      crf,
      '-movflags',
      '+faststart',
      outFile,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] }
  );

  const ffExit = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps;
    await page.renderAt(t);
    const jpg = await page.screenshot('jpeg', 92);
    if (!ff.stdin.write(jpg)) {
      await new Promise((res) => ff.stdin.once('drain', res));
    }
    if ((i + 1) % fps === 0 || i + 1 === totalFrames) {
      console.log(`[video] frame ${i + 1}/${totalFrames} (t=${t.toFixed(2)}s)`);
    }
  }
  ff.stdin.end();
  await ffExit;
  console.log(`[video] Done -> ${outFile}`);
} finally {
  await page.close();
}
