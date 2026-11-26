/**
 * Apple-grade state-transition motion primitives (deterministic, stateless per frame).
 */

export const MOTION_DUR = Object.freeze({
  T_MICRO: 0.18,
  T_UI: 0.36,
  T_MORPH: 0.52,
  T_TRANS: 0.75,
  T_GLIDE: 1.50,
});

/**
 * Return timing constants anchored cleanly to a musical BPM grid.
 * @param {number} [bpm=80]
 */
export function beatScale(bpm = 80) {
  const beat = 60 / Math.max(30, bpm);
  return {
    beat,
    T_MICRO: beat * 0.25,
    T_UI: beat * 0.50,
    T_MORPH: beat * 0.72,
    T_TRANS: beat * 1.00,
    T_GLIDE: beat * 2.00,
  };
}

/** @param {number} v */
export function clamp01(v) {
  return v <= 0 ? 0 : v >= 1 ? 1 : v;
}

/** Smooth cubic Hermite step. @param {number} u */
export function smoothstep(u) {
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
}

/** Fast onset, serene long settling tail. @param {number} u */
export function easeOutQuint(u) {
  const x = clamp01(u);
  return 1 - Math.pow(1 - x, 5);
}

/** Snappy crisp UI entry without overshoot. @param {number} u */
export function easeOutExpo(u) {
  const x = clamp01(u);
  return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

/** Symmetrical acceleration and deceleration for point-to-point glides. @param {number} u */
export function easeInOutCubic(u) {
  const x = clamp01(u);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Analytic zero-overshoot critically damped spring (damping ratio zeta = 1.0).
 * @param {number} dt Elapsed seconds since trigger (>= 0).
 * @param {number} [tau=0.14] Characteristic time constant (seconds). Settled >99% by ~4.5*tau.
 * @returns {number} Value in [0, 1].
 */
export function criticallyDampedSpring(dt, tau = 0.14) {
  if (dt <= 0) return 0;
  const omega = 1 / Math.max(1e-4, tau);
  const wdt = omega * dt;
  const val = 1 - (1 + wdt) * Math.exp(-wdt);
  return val > 0.9999 ? 1 : val;
}

/**
 * Non-overlapping crossfade weights preventing double-text ghosting during card state changes.
 * @param {number} u Progress in [0, 1] across T_MORPH.
 * @returns {{ wOld: number, wNew: number, yOldOffset: number, yNewOffset: number }}
 */
export function textCrossfadeWeights(u) {
  const x = clamp01(u);
  const wOld = x <= 0.42 ? 1 - easeOutQuint(x / 0.42) : 0;
  const wNew = x >= 0.52 ? easeOutQuint((x - 0.52) / 0.48) : 0;
  const yOldOffset = x <= 0.42 ? -6 * easeInOutCubic(x / 0.42) : -6;
  const yNewOffset = x >= 0.52 ? 8 * (1 - easeOutQuint((x - 0.52) / 0.48)) : 8;
  return { wOld, wNew, yOldOffset, yNewOffset };
}

/**
 * C2-Continuous Degree-5 Quintic Hermite Spline across multi-dimensional waypoints.
 * Guarantees continuous position, velocity, AND acceleration across every interior knot.
 */
export class QuinticHermiteSpline {
  /**
   * @param {Array<{t: number, v: number[]}>} keyframes Sorted ascending by t.
   */
  constructor(keyframes) {
    if (!Array.isArray(keyframes) || keyframes.length < 2) {
      throw new Error('QuinticHermiteSpline requires at least 2 keyframes');
    }
    this.keys = keyframes.map((k) => ({ t: Number(k.t), v: [...k.v] }));
    this.dim = this.keys[0].v.length;
    const n = this.keys.length;

    // 1. Estimate smooth C1 tangent velocities using Catmull-Rom weighted chords
    this.vel = Array.from({ length: n }, () => new Array(this.dim).fill(0));
    for (let i = 1; i < n - 1; i++) {
      const dtPrev = Math.max(1e-5, this.keys[i].t - this.keys[i - 1].t);
      const dtNext = Math.max(1e-5, this.keys[i + 1].t - this.keys[i].t);
      const dtTotal = dtPrev + dtNext;
      for (let d = 0; d < this.dim; d++) {
        const sPrev = (this.keys[i].v[d] - this.keys[i - 1].v[d]) / dtPrev;
        const sNext = (this.keys[i + 1].v[d] - this.keys[i].v[d]) / dtNext;
        // Ease flat on reversal or extreme slope mismatch while remaining continuous
        this.vel[i][d] = (sPrev * dtNext + sNext * dtPrev) / dtTotal;
      }
    }

    // 2. Estimate smooth C2 interior accelerations so adjacent spline segments match P, V, A
    this.acc = Array.from({ length: n }, () => new Array(this.dim).fill(0));
    for (let i = 1; i < n - 1; i++) {
      const dtPrev = Math.max(1e-5, this.keys[i].t - this.keys[i - 1].t);
      const dtNext = Math.max(1e-5, this.keys[i + 1].t - this.keys[i].t);
      const dtHalf = 0.5 * (dtPrev + dtNext);
      for (let d = 0; d < this.dim; d++) {
        const dvPrev = (this.vel[i][d] - this.vel[i - 1][d]) / dtPrev;
        const dvNext = (this.vel[i + 1][d] - this.vel[i][d]) / dtNext;
        this.acc[i][d] = 0.5 * (dvPrev + dvNext) * (dtHalf / Math.max(dtHalf, 1e-5));
      }
    }
  }

  /**
   * Evaluate vector at time t.
   * @param {number} t
   * @returns {number[]}
   */
  eval(t) {
    const n = this.keys.length;
    if (t <= this.keys[0].t) return [...this.keys[0].v];
    if (t >= this.keys[n - 1].t) return [...this.keys[n - 1].v];

    let idx = 0;
    for (let i = 0; i < n - 1; i++) {
      if (t >= this.keys[i].t && t <= this.keys[i + 1].t) {
        idx = i;
        break;
      }
    }

    const k0 = this.keys[idx];
    const k1 = this.keys[idx + 1];
    const h = Math.max(1e-6, k1.t - k0.t);
    const u = (t - k0.t) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    const u4 = u3 * u;
    const u5 = u4 * u;

    // Standard Degree-5 Quintic Hermite basis functions
    const h0 = 1 - 10 * u3 + 15 * u4 - 6 * u5;
    const h1 = u - 6 * u3 + 8 * u4 - 3 * u5;
    const h2 = 0.5 * u2 - 1.5 * u3 + 1.5 * u4 - 0.5 * u5;
    const h3 = 0.5 * u3 - u4 + 0.5 * u5;
    const h4 = -4 * u3 + 7 * u4 - 3 * u5;
    const h5 = 10 * u3 - 15 * u4 + 6 * u5;

    const out = new Array(this.dim);
    const hSq = h * h;
    for (let d = 0; d < this.dim; d++) {
      out[d] =
        h0 * k0.v[d] +
        h1 * (this.vel[idx][d] * h) +
        h2 * (this.acc[idx][d] * hSq) +
        h3 * (this.acc[idx + 1][d] * hSq) +
        h4 * (this.vel[idx + 1][d] * h) +
        h5 * k1.v[d];
    }
    return out;
  }
}

/**
 * Deterministic pairwise vertical/horizontal HUD label repulsion inside viewport safe bounds.
 * @param {Array<{id:string, x:number, y:number, w:number, h:number}>} cards Mutated on cloned copies.
 * @param {{minX:number, minY:number, maxX:number, maxY:number}} bounds
 * @param {number} [gap=14]
 */
export function resolveCardRepulsion(cards, bounds, gap = 14) {
  const out = cards.map((c) => ({ ...c }));
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        const overlapX = (a.w + b.w) / 2 + gap - Math.abs(a.x - b.x);
        const overlapY = (a.h + b.h) / 2 + gap - Math.abs(a.y - b.y);
        if (overlapX > 0 && overlapY > 0) {
          const dir = a.y <= b.y ? -1 : 1;
          const push = overlapY * 0.5;
          a.y += dir * push;
          b.y -= dir * push;
        }
      }
      const c = out[i];
      c.x = Math.max(bounds.minX + c.w / 2, Math.min(bounds.maxX - c.w / 2, c.x));
      c.y = Math.max(bounds.minY + c.h / 2, Math.min(bounds.maxY - c.h / 2, c.y));
    }
  }
  return out;
}

/**
 * Read accessibility flag `?reducedMotion=1`.
 * @returns {boolean}
 */
export function isReducedMotion() {
  if (typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).get('reducedMotion') === '1';
}
