import { Grid, getCell, setCell, LAND, WATER, TRAIL } from './grid';

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Player {
  x: number;
  y: number;
  dir: Dir | null;
  pending: Dir | null;
  drawing: boolean;
}

export interface PlayerTickResult {
  moved: boolean;
  started: boolean;
  sealed: boolean;
  enteredCell: { x: number; y: number } | null;
}

const DELTA: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function createPlayer(g: Grid, border: number): Player {
  void g; // spawn depends only on border; g kept in the signature for API stability
  return {
    x: border - 1 + 0.5,
    y: border - 1 + 0.5,
    dir: null,
    pending: null,
    drawing: false,
  };
}

export function setDirection(p: Player, d: Dir): void {
  p.pending = d;
}

export function tickPlayer(g: Grid, p: Player, speed: number): PlayerTickResult {
  const res: PlayerTickResult = { moved: false, started: false, sealed: false, enteredCell: null };
  if (p.pending) {
    p.dir = p.pending;
    p.pending = null;
  }
  if (!p.dir) return res;

  const { dx, dy } = DELTA[p.dir];
  const nx = p.x + dx * speed;
  const ny = p.y + dy * speed;
  const tx = Math.floor(nx);
  const ty = Math.floor(ny);
  if (tx < 0 || ty < 0 || tx >= g.w || ty >= g.h) return res; // press against the wall

  const curX = Math.floor(p.x);
  const curY = Math.floor(p.y);
  const isCurrent = tx === curX && ty === curY;
  const cell = getCell(g, tx, ty);

  // cannot cross your own trail (standing on it is fine)
  if (cell === TRAIL && !isCurrent) return res;

  if (cell === LAND && !isCurrent) {
    if (p.drawing) {
      // reconnect → seal
      p.drawing = false;
      p.x = tx + 0.5;
      p.y = ty + 0.5;
      res.moved = true;
      res.sealed = true;
      return res;
    }
    p.x = nx;
    p.y = ny;
    res.moved = true;
    return res;
  }

  // water (or staying on the current trail cell): move freely
  const oldX = Math.floor(p.x);
  const oldY = Math.floor(p.y);
  p.x = nx;
  p.y = ny;
  res.moved = true;

  const cx = Math.floor(p.x);
  const cy = Math.floor(p.y);
  if (cell === WATER && !isCurrent && !p.drawing) {
    p.drawing = true;
    res.started = true;
  }
  if ((cx !== oldX || cy !== oldY) && getCell(g, cx, cy) === WATER) {
    setCell(g, cx, cy, TRAIL);
    res.enteredCell = { x: cx, y: cy };
  }
  return res;
}
