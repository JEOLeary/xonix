import { Grid, getCell, TRAIL } from './grid';
import type { Player } from './player';
import type { Ball, Warder, RingCell } from './enemies';
import { warderPos } from './enemies';

export type DeathCause = 'ball' | 'trail' | 'warder';

function touchesTrail(g: Grid, x: number, y: number): boolean {
  if (getCell(g, x, y) === TRAIL) return true;
  return (
    getCell(g, x + 1, y) === TRAIL ||
    getCell(g, x - 1, y) === TRAIL ||
    getCell(g, x, y + 1) === TRAIL ||
    getCell(g, x, y - 1) === TRAIL
  );
}

export function checkDeath(
  g: Grid,
  player: Player,
  balls: Ball[],
  warders: Warder[],
  ring: RingCell[],
): DeathCause | null {
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);

  for (const b of balls) {
    if (Math.floor(b.x) === px && Math.floor(b.y) === py) return 'ball';
  }
  for (const b of balls) {
    if (touchesTrail(g, Math.floor(b.x), Math.floor(b.y))) return 'trail';
  }
  for (const w of warders) {
    const pos = warderPos(w, ring);
    if (pos.x === px && pos.y === py) return 'warder';
  }
  return null;
}
