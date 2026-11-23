import { describe, expect, test } from 'vitest';
import { createGrid, getCell, setCell, countCells, LAND, WATER, TRAIL } from '../../src/core/grid';
import { regionAt, sealAndClaim, clearTrail } from '../../src/core/fill';

describe('fill', () => {
  test('regionAt returns the whole connected water region and marks visited', () => {
    const g = createGrid(7, 7, 1); // interior 5x5
    const visited = new Uint8Array(49);
    const region = regionAt(g, 1, 1, visited);
    expect(region.length).toBe(25);
    expect(visited[1 * 7 + 1]).toBe(1);
    expect(regionAt(g, 0, 0, new Uint8Array(49))).toEqual([]); // seed is land
  });

  // 10x8 grid, border 2. Interior x2..7, y2..5 (24 water).
  // Trail path: down x=3 (3,2)(3,3)(3,4), right y=4 (4,4)(5,4), up x=5 (5,3)(5,2)
  // → 7 trail cells; enclosed region {(4,2),(4,3)}; remaining outer water = 15 cells.
  function cutGrid(): ReturnType<typeof createGrid> {
    const g = createGrid(10, 8, 2);
    const trail = [[3,2],[3,3],[3,4],[4,4],[5,4],[5,3],[5,2]];
    for (const [x, y] of trail) setCell(g, x, y, TRAIL);
    return g;
  }

  test('sealAndClaim with no enemies claims everything', () => {
    const g = cutGrid();
    const { claimedCells } = sealAndClaim(g, []);
    expect(claimedCells.length).toBe(24); // 7 trail + 2 enclosed + 15 outer
    expect(countCells(g, LAND)).toBe(80); // whole grid land
    expect(countCells(g, TRAIL)).toBe(0);
    expect(countCells(g, WATER)).toBe(0);
  });

  test('sealAndClaim: region holding an enemy stays water', () => {
    const g = cutGrid();
    const { claimedCells } = sealAndClaim(g, [{ x: 6.5, y: 5.5 }]); // enemy cell (6,5)
    expect(claimedCells.length).toBe(9); // 7 trail + 2 enclosed
    expect(getCell(g, 4, 2)).toBe(LAND); // enclosed region claimed
    expect(getCell(g, 3, 3)).toBe(LAND); // trail became land
    expect(getCell(g, 6, 5)).toBe(WATER); // enemy's region survives
    expect(countCells(g, WATER)).toBe(15);
  });

  test('clearTrail reverts trail to water and leaves land alone', () => {
    const g = cutGrid();
    clearTrail(g);
    expect(countCells(g, TRAIL)).toBe(0);
    expect(countCells(g, WATER)).toBe(24); // all interior back to water
    expect(countCells(g, LAND)).toBe(56);  // border untouched
  });
});
