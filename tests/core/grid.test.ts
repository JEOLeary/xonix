import { describe, expect, test } from 'vitest';
import {
  createGrid, getCell, setCell, countCells, landFraction,
  LAND, WATER, TRAIL,
} from '../../src/core/grid';

describe('grid', () => {
  test('createGrid: border ring is LAND, interior is WATER', () => {
    const g = createGrid(10, 8, 2);
    expect(getCell(g, 0, 0)).toBe(LAND);
    expect(getCell(g, 9, 7)).toBe(LAND);
    expect(getCell(g, 2, 2)).toBe(WATER);
    expect(getCell(g, 5, 4)).toBe(WATER);
    expect(g.w).toBe(10);
    expect(g.h).toBe(8);
    expect(g.cells.length).toBe(80);
  });

  test('border cells = total - interior', () => {
    const g = createGrid(10, 8, 2); // interior 6x4 = 24 water
    expect(countCells(g, LAND)).toBe(80 - 24);
    expect(countCells(g, WATER)).toBe(24);
    expect(countCells(g, TRAIL)).toBe(0);
  });

  test('landFraction', () => {
    const g = createGrid(10, 8, 2);
    expect(landFraction(g)).toBeCloseTo(56 / 80);
  });

  test('getCell out of bounds returns LAND; setCell out of bounds is a no-op', () => {
    const g = createGrid(6, 6, 1);
    expect(getCell(g, -1, 0)).toBe(LAND);
    expect(getCell(g, 6, 6)).toBe(LAND);
    setCell(g, -1, 0, TRAIL);
    expect(getCell(g, -1, 0)).toBe(LAND);
  });

  test('setCell/getCell round-trip', () => {
    const g = createGrid(6, 6, 1);
    setCell(g, 3, 3, TRAIL);
    expect(getCell(g, 3, 3)).toBe(TRAIL);
  });
});
