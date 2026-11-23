import { describe, expect, test } from 'vitest';
import { createGrid, getCell, setCell, LAND, TRAIL } from '../../src/core/grid';
import {
  buildRing, createBalls, tickBalls, createWarders, tickWarders, warderPos,
  type Ball, type Warder,
} from '../../src/core/enemies';

describe('enemies', () => {
  test('buildRing visits every inner-ring cell exactly once, all land', () => {
    const g = createGrid(10, 8, 2);
    const ring = buildRing(g, 2);
    expect(ring.length).toBe(24);
    expect(ring[0]).toEqual({ x: 1, y: 1 });
    const seen = new Set(ring.map((c) => c.y * 10 + c.x));
    expect(seen.size).toBe(24);
    for (const c of ring) expect(getCell(g, c.x, c.y)).toBe(LAND);
  });

  test('ball reflects off the wall instead of leaving the water', () => {
    const g = createGrid(10, 8, 2); // water x2..7, y2..5
    const b: Ball = { x: 2.1, y: 3.5, dx: -1, dy: 1 };
    tickBalls(g, [b], 0.3);
    expect(b.dx).toBe(1);      // x-step blocked by land at x=1
    expect(b.x).toBeCloseTo(2.1);
    expect(b.y).toBeCloseTo(3.8); // y-step free
  });

  test('ball reflects off a trail cell', () => {
    const g = createGrid(10, 8, 2);
    setCell(g, 4, 3, TRAIL);
    const b: Ball = { x: 3.9, y: 3.5, dx: 1, dy: -1 };
    tickBalls(g, [b], 0.3);
    expect(b.dx).toBe(-1);
    expect(b.x).toBeCloseTo(3.9);
    expect(b.y).toBeCloseTo(3.2);
  });

  test('createBalls only spawns on water', () => {
    const g = createGrid(10, 8, 2);
    const values = [
      0.05, 0.5,               // candidate 1: cell (0,4) = LAND → must be rejected (only 2 calls consumed)
      0.35, 0.45, 0.6, 0.7,    // candidate 2: (3,3) water, dx=1, dy=1
      0.55, 0.65, 0.2, 0.9,    // candidate 3: (5,5) water, dx=-1, dy=1
      0.45, 0.35, 0.8, 0.1,    // candidate 4: (4,2) water, dx=1, dy=-1
    ];
    let i = 0;
    const rng = () => values[i++ % values.length];
    const balls = createBalls(g, 3, rng);
    expect(balls.length).toBe(3);
    for (const b of balls) expect(getCell(g, Math.floor(b.x), Math.floor(b.y))).toBe(0);
  });

  test('createWarders spreads evenly over the ring', () => {
    const ring = buildRing(createGrid(10, 8, 2), 2);
    const ws = createWarders(ring, 4);
    expect(ws.map((w) => w.p)).toEqual([3, 9, 15, 21]); // half-step offset: ring[0]=(1,1) stays clear
    expect(ws[0].dir).toBe(1);
    expect(ws[1].dir).toBe(-1);
  });

  test('warders bounce at both ends of the ring', () => {
    const ring = buildRing(createGrid(10, 8, 2), 2); // length 24
    const w: Warder = { p: 0, dir: -1 };
    tickWarders([w], ring, 0.5);
    expect(w.p).toBeCloseTo(0.5);
    expect(w.dir).toBe(1);
    const w2: Warder = { p: 23, dir: 1 };
    tickWarders([w2], ring, 0.5);
    expect(w2.p).toBeCloseTo(22.5);
    expect(w2.dir).toBe(-1);
    expect(warderPos(w, ring)).toEqual(ring[0]);
  });
});
