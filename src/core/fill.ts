import { Grid, getCell, WATER, LAND, TRAIL } from './grid';

export interface EnemyPos {
  x: number;
  y: number;
}

export function regionAt(g: Grid, sx: number, sy: number, visited: Uint8Array): number[] {
  const region: number[] = [];
  if (getCell(g, sx, sy) !== WATER) return region;
  const seed = sy * g.w + sx;
  visited[seed] = 1;
  const stack: number[] = [seed];
  while (stack.length > 0) {
    const i = stack.pop()!;
    region.push(i);
    const x = i % g.w;
    const y = Math.floor(i / g.w);
    const neighbors = [i - 1, i + 1, i - g.w, i + g.w];
    const coords = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    for (let n = 0; n < 4; n++) {
      const [nx, ny] = coords[n];
      if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
      const ni = neighbors[n];
      if (visited[ni] || g.cells[ni] !== WATER) continue;
      visited[ni] = 1;
      stack.push(ni);
    }
  }
  return region;
}

export function sealAndClaim(g: Grid, enemies: EnemyPos[]): { claimedCells: number[] } {
  const claimedCells: number[] = [];
  // 1. the trail itself becomes land
  for (let i = 0; i < g.cells.length; i++) {
    if (g.cells[i] === TRAIL) {
      g.cells[i] = LAND;
      claimedCells.push(i);
    }
  }
  // 2. claim every enemy-free water region
  const enemyCells = new Set(
    enemies.map((e) => Math.floor(e.y) * g.w + Math.floor(e.x)),
  );
  const visited = new Uint8Array(g.cells.length);
  for (let i = 0; i < g.cells.length; i++) {
    if (g.cells[i] !== WATER || visited[i]) continue;
    const region = regionAt(g, i % g.w, Math.floor(i / g.w), visited);
    let hasEnemy = false;
    for (const rc of region) {
      if (enemyCells.has(rc)) {
        hasEnemy = true;
        break;
      }
    }
    if (!hasEnemy) {
      for (const rc of region) {
        g.cells[rc] = LAND;
        claimedCells.push(rc);
      }
    }
  }
  return { claimedCells };
}

export function clearTrail(g: Grid): void {
  for (let i = 0; i < g.cells.length; i++) {
    if (g.cells[i] === TRAIL) g.cells[i] = WATER;
  }
}
