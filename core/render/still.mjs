#!/usr/bin/env node
/**
 * Render deterministic still frames via Chrome DevTools Protocol.
 * Usage:
 *   node core/render/still.mjs <projectDir> [t1 t2 ...] [--range a:b:step]
 *        [--size 1920x1080] [--format jpg|png] [--prefix t_] [--out dir] [--q k=v]
 */
import fs from 'node:fs';
import path from 'node:path';
import { openProjectPage, parseSize } from './cdp.mjs';

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node core/render/still.mjs <projectDir> [t1 t2 ...] [--range a:b:step] [--size WxH] [--format jpg|png] [--prefix p_] [--out dir] [--q k=v]');
  process.exit(2);
}

const takeOpt = (flag, fallback = null) => {
  const i = args.indexOf(flag);
  if (i >= 0) return args.splice(i, 2)[1];
  return fallback;
};

const { w, h } = parseSize(takeOpt('--size', '1920x1080'));
const formatRaw = takeOpt('--format', 'jpg').toLowerCase();
const cdpFormat = formatRaw === 'png' ? 'png' : 'jpeg';
const ext = cdpFormat === 'png' ? 'png' : 'jpg';
const prefix = takeOpt('--prefix', 't_');
const outDirArg = takeOpt('--out', null);
const rangeArg = takeOpt('--range', null);
const q = takeOpt('--q', '');

const projectDir = path.resolve(args.shift());
const outDir = path.resolve(outDirArg || path.join(projectDir, 'out', 'stills'));
fs.mkdirSync(outDir, { recursive: true });

const times = args.map((v) => Number(v)).filter((n) => Number.isFinite(n));
if (rangeArg) {
  const parts = rangeArg.split(':').map(Number);
  if (parts.length !== 3 || parts.some((x) => !Number.isFinite(x)) || parts[2] <= 0) {
    throw new Error(`Invalid --range "${rangeArg}", expected start:end:step`);
  }
  const [a, b, step] = parts;
  for (let t = a; t <= b + 1e-6; t += step) {
    times.push(Number(t.toFixed(4)));
  }
}

if (!times.length) {
  console.error('Error: pass at least one timestamp or --range a:b:step');
  process.exit(2);
}

const page = await openProjectPage(projectDir, { w, h, q });
try {
  for (const t of times) {
    await page.renderAt(t);
    const buf = await page.screenshot(cdpFormat, 94);
    const label = String(t.toFixed(2)).replace('.', '_');
    const outFile = path.join(outDir, `${prefix}${label}.${ext}`);
    fs.writeFileSync(outFile, buf);
    console.log(`[still] t=${t.toFixed(2)}s -> ${outFile}`);
  }
} finally {
  await page.close();
}
