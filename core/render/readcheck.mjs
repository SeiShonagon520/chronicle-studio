#!/usr/bin/env node
/**
 * Automated reading-time and safe-bounds check on window.TEXTS(t).
 * Exits 0 on pass, 1 on text violation, 2 if window.TEXTS or window.DUR missing.
 */
import path from 'node:path';
import { openProjectPage, parseSize } from './cdp.mjs';

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node core/render/readcheck.mjs <projectDir> [--step 0.05] [--size 1920x1080] [--cjk-cps 4.5] [--latin-cps 15] [--pad 1.5] [--min 1.5] [--q k=v]');
  process.exit(2);
}

const takeOpt = (flag, fallback = null) => {
  const i = args.indexOf(flag);
  if (i >= 0) return args.splice(i, 2)[1];
  return fallback;
};

const { w, h } = parseSize(takeOpt('--size', '1920x1080'));
const STEP = Number(takeOpt('--step', '0.05'));
const CJK_CPS = Number(takeOpt('--cjk-cps', '4.5'));
const LATIN_CPS = Number(takeOpt('--latin-cps', '15'));
const PAD = Number(takeOpt('--pad', '1.5'));
const MIN = Number(takeOpt('--min', '1.5'));
const q = takeOpt('--q', '');
const projectDir = path.resolve(args.shift());

const page = await openProjectPage(projectDir, { w, h, q });
try {
  const report = await page.evalJs(`(() => {
    if (typeof window.TEXTS !== 'function') return { noTexts: true };
    if (!(window.DUR > 0)) return { noDur: true };
    const W = innerWidth, H = innerHeight;
    const seen = {}, partial = {}, passing = {};
    for (let t = 0; t <= window.DUR + 1e-6; t += ${STEP}) {
      window.render(t);
      const vis = new Set();
      for (const item of window.TEXTS(t) || []) {
        const id = String(item.id);
        const text = String(item.text || '');
        if (!text.trim()) continue;
        const key = id + '\\u0000' + text;
        if (item.pass) {
          passing[key] ??= { id, text, t0: t };
          continue;
        }
        const inside = item.x0 >= 0 && item.y0 >= 0 && item.x1 <= W && item.y1 <= H;
        if (!inside) {
          partial[key] ??= { id, text, t0: t, box: [item.x0, item.y0, item.x1, item.y1] };
          continue;
        }
        vis.add(key);
        const s = (seen[key] ??= { id, text, t0: t, run: 0, done: false });
        if (!s.done) s.run = Math.min(t + ${STEP}, window.DUR) - s.t0;
      }
      for (const k of Object.keys(seen)) {
        if (!vis.has(k)) seen[k].done = true;
      }
    }
    for (const k of Object.keys(partial)) {
      if (seen[k]) delete partial[k];
    }
    return { seen: Object.values(seen), partial: Object.values(partial), passing: Object.values(passing) };
  })()`);

  if (report.noTexts || report.noDur || (!report.seen.length && !report.partial.length && !report.passing.length)) {
    console.error('[readcheck] FAIL: window.TEXTS(t) or window.DUR missing or returned zero items.');
    process.exit(2);
  }

  const isCjk = (ch) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(ch);
  const minHold = (text) => {
    let cjk = 0;
    let other = 0;
    for (const ch of text) {
      if (/\s/.test(ch)) continue;
      if (isCjk(ch)) cjk++;
      else other++;
    }
    return Math.max(MIN, cjk / CJK_CPS + other / LATIN_CPS + PAD);
  };

  let failures = 0;
  for (const s of report.seen) {
    const req = minHold(s.text);
    const ok = s.run >= req - 1e-6;
    if (!ok) failures++;
    console.log(
      `${ok ? 'OK ' : 'BAD'} ${s.id.padEnd(20)} t0=${s.t0.toFixed(2)}s  need>=${req.toFixed(2)}s  got=${s.run.toFixed(2)}s  ${JSON.stringify(s.text.slice(0, 32))}`
    );
  }
  for (const s of report.partial) {
    failures++;
    console.log(
      `BAD ${s.id.padEnd(20)} t0=${s.t0.toFixed(2)}s  CLIPPED OUT OF FRAME ${JSON.stringify(s.box)}  ${JSON.stringify(s.text.slice(0, 32))}`
    );
  }
  for (const s of report.passing) {
    console.log(`--  ${s.id.padEnd(20)} t0=${s.t0.toFixed(2)}s  pass:true (not timed)  ${JSON.stringify(s.text.slice(0, 32))}`);
  }

  process.exit(failures ? 1 : 0);
} finally {
  await page.close();
}
