export type Cell = 0 | 1 | 2;
export const WATER = 0 as const;
export const LAND = 1 as const;
export const TRAIL = 2 as const;

export interface Grid {
  w: number;
  h: number;
  cells: Uint8Array; // index = y * w + x
}

export function createGrid(w: number, h: number, border: number): Grid {
  const cells = new Uint8Array(w * h); // all WATER
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < border || y < border || x >= w - border || y >= h - border) {
        cells[y * w + x] = LAND;
      }
    }
  }
  return { w, h, cells };
}

export function getCell(g: Grid, x: number, y: number): Cell {
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return LAND;
  return g.cells[y * g.w + x] as Cell;
}

export function setCell(g: Grid, x: number, y: number, c: Cell): void {
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return;
  g.cells[y * g.w + x] = c;
}

export function countCells(g: Grid, c: Cell): number {
  let n = 0;
  for (let i = 0; i < g.cells.length; i++) if (g.cells[i] === c) n++;
  return n;
}

export function landFraction(g: Grid): number {
  return countCells(g, LAND) / g.cells.length;
}
