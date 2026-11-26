/**
 * Deterministic PRNG & procedural noise helpers (zero Math.random / Date.now usage).
 */

/**
 * Compute deterministic 32-bit FNV-1a unsigned integer hash from any string.
 * @param {string} str
 * @returns {number}
 */
export function hashStr(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic Mulberry32 PRNG returning floats in [0, 1).
 * @param {number|string} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = typeof seed === 'string' ? hashStr(seed) : (seed >>> 0);
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2D(ix, iy, seed = 0) {
  let n = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/**
 * Smooth 2D value noise in [0, 1].
 * @param {number} x
 * @param {number} y
 * @param {number} [seed=0]
 * @returns {number}
 */
export function valueNoise2D(x, y, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const v00 = hash2D(ix, iy, seed);
  const v10 = hash2D(ix + 1, iy, seed);
  const v01 = hash2D(ix, iy + 1, seed);
  const v11 = hash2D(ix + 1, iy + 1, seed);
  const a = v00 + (v10 - v00) * ux;
  const b = v01 + (v11 - v01) * ux;
  return a + (b - a) * uy;
}

/**
 * Run a procedural drawing helper under an isolated deterministic RNG.
 * @template T
 * @param {number|string} seed
 * @param {(rng: () => number) => T} fn
 * @returns {T}
 */
export function withSeed(seed, fn) {
  return fn(mulberry32(seed));
}
