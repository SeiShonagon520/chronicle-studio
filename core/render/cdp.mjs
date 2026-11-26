/**
 * Zero-dependency Chrome DevTools Protocol (CDP) runner using Node 24 native WebSocket + HTTP.
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const WATCH_GL_LOST = `(() => {
  const lost = new Set();
  addEventListener('webglcontextlost', (e) => {
    lost.add(e.target);
    window.__glLost = 'WebGL context lost';
  }, true);
  addEventListener('webglcontextrestored', (e) => {
    lost.delete(e.target);
    window.__glLost = lost.size ? 'WebGL context lost' : null;
  }, true);
})();`;

/**
 * Find installed Chrome or Edge executable on Windows, macOS, or Linux.
 * @returns {string}
 */
export function findBrowserExecutable() {
  if (process.env.CHRONICLE_CHROME && fs.existsSync(process.env.CHRONICLE_CHROME)) {
    return process.env.CHRONICLE_CHROME;
  }
  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        ]
      : process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ]
      : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  throw new Error('Could not find Chrome or Edge. Set CHRONICLE_CHROME environment variable.');
}

/**
 * Parse WIDTHxHEIGHT string into even dimensions.
 * @param {string} str
 */
export function parseSize(str = '1920x1080') {
  const m = /^(\d+)x(\d+)$/i.exec(String(str).trim());
  if (!m) throw new Error(`Invalid --size value "${str}", expected WxH (e.g. 1920x1080)`);
  const w = parseInt(m[1], 10);
  const h = parseInt(m[2], 10);
  if (w <= 0 || h <= 0 || w % 2 !== 0 || h % 2 !== 0) {
    throw new Error(`--size dimensions must be positive even integers, got ${w}x${h}`);
  }
  return { w, h };
}

function startStaticServer(projectDir) {
  const absProject = path.resolve(projectDir);
  const absCore = path.resolve(REPO_ROOT, 'core');

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
    let relPath = decodeURIComponent(reqUrl.pathname);
    let baseRoot = absProject;

    if (relPath.startsWith('/@core/')) {
      baseRoot = absCore;
      relPath = relPath.slice('/@core'.length);
    }
    if (relPath === '/' || relPath === '') relPath = '/index.html';

    const targetPath = path.resolve(baseRoot, '.' + relPath);
    if (!targetPath.startsWith(baseRoot)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
      if (relPath === '/favicon.ico') {
        res.writeHead(204).end();
        return;
      }
      res.writeHead(404).end(`Not Found: ${relPath}`);
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_MAP[ext] || 'application/octet-stream' });
    fs.createReadStream(targetPath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

async function launchChromeWithCdp(userDataDir) {
  const exe = findBrowserExecutable();
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-gpu-sandbox',
    '--ignore-gpu-blocklist',
    '--font-render-hinting=none',
    '--force-color-profile=srgb',
    '--autoplay-policy=no-user-gesture-required',
    'about:blank',
  ];

  const proc = spawn(exe, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderrLog = '';

  const wsUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for Chrome DevTools WS URL.\nStderr:\n${stderrLog}`));
    }, 15000);

    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited prematurely (${code}).\nStderr:\n${stderrLog}`));
    });

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      stderrLog += text;
      const m = /DevTools listening on (ws:\/\/[^\s]+)/.exec(stderrLog);
      if (m) {
        clearTimeout(timer);
        resolve(m[1].trim());
      }
    });
  });

  return { proc, wsUrl };
}

/**
 * Open a project's index.html in headless Chrome and wait for window.READY === true.
 * @param {string} projectDir
 * @param {{ w?: number, h?: number, q?: string, timeoutMs?: number }} [opts]
 */
export async function openProjectPage(projectDir, opts = {}) {
  const absProject = path.resolve(projectDir);
  if (!fs.existsSync(path.join(absProject, 'index.html'))) {
    throw new Error(`index.html not found in project directory: ${absProject}`);
  }

  const w = opts.w || 1920;
  const h = opts.h || 1080;
  const query = opts.q ? `?${opts.q.replace(/^\?/, '')}` : '';
  const timeoutMs = opts.timeoutMs || 60000;

  const { server, port } = await startStaticServer(absProject);
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-cdp-'));
  let proc = null;
  let ws = null;

  const close = async () => {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    } catch {}
    try {
      if (proc && !proc.killed) proc.kill();
    } catch {}
    await new Promise((r) => server.close(r));
    // Brief retry cleanup for Windows Chrome lock on user-data-dir
    for (let i = 0; i < 6; i++) {
      try {
        fs.rmSync(tmpProfile, { recursive: true, force: true });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 120));
      }
    }
  };

  try {
    const launched = await launchChromeWithCdp(tmpProfile);
    proc = launched.proc;

    ws = new WebSocket(launched.wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', (e) => reject(new Error(`CDP WebSocket error: ${e.message || e}`)), { once: true });
    });

    let nextId = 0;
    const pending = new Map();
    const errors = [];

    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString('utf8'));
      if (msg.id) {
        const entry = pending.get(msg.id);
        if (entry) {
          pending.delete(msg.id);
          if (msg.error) {
            entry.reject(new Error(`CDP ${entry.method} error: ${msg.error.message}`));
          } else {
            entry.resolve(msg.result || {});
          }
        }
        return;
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const desc =
          msg.params?.exceptionDetails?.exception?.description ||
          msg.params?.exceptionDetails?.text ||
          'Unknown page JS exception';
        errors.push(`Page JS Error: ${desc}`);
      } else if (msg.method === 'Network.responseReceived') {
        const resp = msg.params?.response;
        if (resp && resp.status >= 400) {
          const url = resp.url || '';
          if (/\.(html|js|mjs|css|json)(\?|$)/i.test(url)) {
            errors.push(`HTTP ${resp.status} loading required resource: ${url}`);
          } else {
            console.error(`[warn] HTTP ${resp.status} asset: ${url}`);
          }
        }
      }
    });

    const send = (method, params = {}, sessionId = undefined) =>
      new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject, method });
        const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
        ws.send(JSON.stringify(payload));
      });

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

    await send('Page.enable', {}, sessionId);
    await send('Runtime.enable', {}, sessionId);
    await send('Network.enable', {}, sessionId);
    await send(
      'Emulation.setDeviceMetricsOverride',
      { width: w, height: h, deviceScaleFactor: 1, mobile: false },
      sessionId
    );
    await send('Page.addScriptToEvaluateOnNewDocument', { source: WATCH_GL_LOST }, sessionId);

    const pageUrl = `http://127.0.0.1:${port}/${query}`;
    await send('Page.navigate', { url: pageUrl }, sessionId);

    const evalJs = async (expression) => {
      if (errors.length) throw new Error(errors.join('\n'));
      const res = await send(
        'Runtime.evaluate',
        { expression, awaitPromise: true, returnByValue: true },
        sessionId
      );
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
      }
      if (errors.length) throw new Error(errors.join('\n'));
      return res.result ? res.result.value : undefined;
    };

    const tStart = Date.now();
    while (true) {
      const isReady = await evalJs('window.READY === true');
      if (isReady) break;
      if (Date.now() - tStart > timeoutMs) {
        throw new Error(`Timed out after ${timeoutMs}ms waiting for window.READY === true`);
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    const renderAt = async (t) => {
      await evalJs(`if (typeof window.render !== 'function') throw new Error('window.render(t) is missing'); window.render(${Number(t)}); if (window.__glLost) throw new Error(window.__glLost);`);
    };

    const screenshot = async (format = 'jpeg', quality = 92) => {
      const params = { format };
      if (format === 'jpeg') params.quality = quality;
      const { data } = await send('Page.captureScreenshot', params, sessionId);
      return Buffer.from(data, 'base64');
    };

    return { evalJs, renderAt, screenshot, close, w, h };
  } catch (err) {
    await close();
    throw err;
  }
}
