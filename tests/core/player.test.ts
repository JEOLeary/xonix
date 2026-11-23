import { describe, expect, test } from 'vitest';
import { createGrid, getCell, setCell, countCells, TRAIL, LAND } from '../../src/core/grid';
import { createPlayer, setDirection, tickPlayer, type Dir } from '../../src/core/player';

describe('player', () => {
  test('spawns on land at the border corner', () => {
    const g = createGrid(10, 8, 2);
    const p = createPlayer(g, 2);
    expect(p.x).toBeCloseTo(1.5);
    expect(p.y).toBeCloseTo(1.5);
    expect(p.drawing).toBe(false);
    expect(getCell(g, 1, 1)).toBe(LAND);
  });

  test('gliding along the land border does not draw', () => {
    const g = createGrid(10, 8, 2);
    const p = createPlayer(g, 2);
    setDirection(p, 'right');
    for (let i = 0; i < 4; i++) tickPlayer(g, p, 0.25); // x → 2.5, still row y=1 (border)
    expect(p.drawing).toBe(false);
    expect(p.x).toBeCloseTo(2.5);
    expect(countCells(g, TRAIL)).toBe(0);
  });

  test('steering into water starts the trail and marks each entered cell', () => {
    const g = createGrid(10, 8, 2);
    const p = createPlayer(g, 2);
    setDirection(p, 'right');
    for (let i = 0; i < 4; i++) tickPlayer(g, p, 0.25); // x → 2.5 (cell (2,1), land)
    setDirection(p, 'down');
    const r1 = tickPlayer(g, p, 0.25); // y → 1.75, still land row
    expect(r1.started).toBe(false);
    tickPlayer(g, p, 0.25); // y → 2.0: enters (2,2) water → start
    expect(p.drawing).toBe(true);
    expect(getCell(g, 2, 2)).toBe(TRAIL);
    for (let i = 0; i < 4; i++) tickPlayer(g, p, 0.25); // y → 3.0: enters (2,3)
    expect(getCell(g, 2, 3)).toBe(TRAIL);
    expect(countCells(g, TRAIL)).toBe(2);
  });

  test('cannot enter a trail cell that is not the current cell', () => {
    const g = createGrid(10, 8, 2);
    const p = createPlayer(g, 2);
    setCell(g, 5, 3, TRAIL);
    p.x = 6.0; p.y = 3.5; // current cell (6,3) is water, trail at (5,3)
    setDirection(p, 'left');
    const r = tickPlayer(g, p, 0.25);
    expect(r.moved).toBe(false);
    expect(p.x).toBeCloseTo(6.0);
  });

  test('reconnecting to land while drawing sets sealed and stops drawing', () => {
    const g = createGrid(10, 8, 2);
    const p = createPlayer(g, 2);
    const step = (dir: Dir, n: number) => {
      setDirection(p, dir);
      for (let i = 0; i < n; i++) tickPlayer(g, p, 0.25);
    };
    step('right', 8);  // x → 3.5 along land row y=1
    step('down', 12);  // y → 4.5: marks (3,2),(3,3),(3,4)
    step('right', 8);  // x → 5.5: marks (4,4),(5,4)
    expect(p.drawing).toBe(true);
    expect(countCells(g, TRAIL)).toBe(5);
    let sealed = false;
    setDirection(p, 'up');
    for (let i = 0; i < 14; i++) {
      if (tickPlayer(g, p, 0.25).sealed) sealed = true;
    }
    expect(sealed).toBe(true);
    expect(p.drawing).toBe(false);
    expect(getCell(g, 5, 1)).toBe(LAND); // reconnect target is land
    expect(countCells(g, TRAIL)).toBeGreaterThan(0); // trail awaits sealAndClaim (game's job)
  });
});
