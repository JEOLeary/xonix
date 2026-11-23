import { Grid, getCell, WATER } from './grid';

export interface Ball {
  x: number;
  y: number;
  dx: 1 | -1;
  dy: 1 | -1;
}

export interface Warder {
  p: number;
  dir: 1 | -1;
}

export interface RingCell {
  x: number;
  y: number;
}

export function buildRing(g: Grid, border: number): RingCell[] {
  const k = border - 1;
  const ring: RingCell[] = [];
  for (let x = k; x <= g.w - 1 - k; x++) ring.push({ x, y: k });                 // top L→R
  for (let y = k + 1; y <= g.h - 1 - k; y++) ring.push({ x: g.w - 1 - k, y });   // right T→B
  for (let x = g.w - 2 - k; x >= k; x--) ring.push({ x, y: g.h - 1 - k });       // bottom R→L
  for (let y = g.h - 2 - k; y >= k + 1; y--) ring.push({ x: k, y });             // left B→T
  return ring;
}

export function createBalls(g: Grid, count: number, rng: () => number): Ball[] {
  const balls: Ball[] = [];
  let guard = 0;
  while (balls.length < count && guard++ < 10000) {
    const x = Math.floor(rng() * g.w);
    const y = Math.floor(rng() * g.h);
    if (getCell(g, x, y) !== WATER) continue;
    balls.push({
      x: x + 0.5,
      y: y + 0.5,
      dx: rng() < 0.5 ? -1 : 1,
      dy: rng() < 0.5 ? -1 : 1,
    });
  }
  return balls;
}

export function tickBalls(g: Grid, balls: Ball[], speed: number): void {
  for (const b of balls) {
    const nx = b.x + b.dx * speed;
    if (getCell(g, Math.floor(nx), Math.floor(b.y)) === WATER) {
      b.x = nx;
    } else {
      b.dx = b.dx === 1 ? -1 : 1;
    }
    const ny = b.y + b.dy * speed;
    if (getCell(g, Math.floor(b.x), Math.floor(ny)) === WATER) {
      b.y = ny;
    } else {
      b.dy = b.dy === 1 ? -1 : 1;
    }
  }
}

export function createWarders(ring: RingCell[], count: number): Warder[] {
  const warders: Warder[] = [];
  for (let i = 0; i < count; i++) {
    // half-step offset so no warder starts on the player's spawn cell ring[0]
    warders.push({
      p: ((i + 0.5) * ring.length) / count,
      dir: (i % 2 === 0 ? 1 : -1) as 1 | -1,
    });
  }
  return warders;
}

export function tickWarders(warders: Warder[], ring: RingCell[], speed: number): void {
  const last = ring.length - 1;
  for (const w of warders) {
    w.p += w.dir * speed;
    if (w.p > last) {
      w.p = 2 * last - w.p;
      w.dir = -1;
    } else if (w.p < 0) {
      w.p = -w.p;
      w.dir = 1;
    }
  }
}

export function warderPos(w: Warder, ring: RingCell[]): RingCell {
  // nearest cell, ties toward the lower index: a warder at p=0.5 (just bounced
  // off the start of the ring) is still on ring[0], not ring[1]
  const i = Math.max(0, Math.min(ring.length - 1, Math.ceil(w.p - 0.5)));
  return ring[i];
}
