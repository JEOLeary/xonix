import { createGrid, landFraction, type Grid } from './grid';
import { clearTrail, sealAndClaim } from './fill';
import {
  createPlayer, setDirection as queueDirection, tickPlayer,
  type Player, type Dir,
} from './player';
import {
  buildRing, createBalls, tickBalls, createWarders, tickWarders,
  type Ball, type Warder, type RingCell,
} from './enemies';
import { checkDeath, type DeathCause } from './collision';
import { tuningFor, type Preset } from './levels';
import { scoreForClaim, levelClearBonus } from './scoring';

export type GameState = 'title' | 'playing' | 'paused' | 'dying' | 'levelclear' | 'gameover';

export type GameEvent =
  | { type: 'start' }
  | { type: 'claim'; cells: number[]; score: number }
  | { type: 'death'; cause: DeathCause; lives: number }
  | { type: 'levelclear'; level: number; bonus: number }
  | { type: 'gameover'; score: number }
  | { type: 'pause' }
  | { type: 'resume' };

export interface Game {
  state: GameState;
  preset: Preset;
  grid: Grid;
  player: Player;
  balls: Ball[];
  warders: Warder[];
  ring: RingCell[];
  level: number;
  lives: number;
  score: number;
  pct: number;
  stateTimer: number;
  graceTicks: number;
  events: GameEvent[];
}

const DIE_FREEZE = 60;   // ticks of death animation before respawn/gameover
const CLEAR_HOLD = 120;  // ticks of level-clear tally before the next level
const SPAWN_GRACE = 60;  // ticks of post-respawn invulnerability

function random(): number {
  return Math.random();
}

export function createGame(preset: Preset): Game {
  const grid = createGrid(preset.cols, preset.rows, preset.border);
  return {
    state: 'title',
    preset,
    grid,
    player: createPlayer(grid, preset.border),
    balls: [],
    warders: [],
    ring: buildRing(grid, preset.border),
    level: 1,
    lives: 3,
    score: 0,
    pct: landFraction(grid),
    stateTimer: 0,
    graceTicks: 0,
    events: [],
  };
}

export function startLevel(g: Game): void {
  const t = tuningFor(g.level, g.preset);
  g.grid = createGrid(g.preset.cols, g.preset.rows, g.preset.border);
  g.ring = buildRing(g.grid, g.preset.border);
  g.player = createPlayer(g.grid, g.preset.border);
  g.balls = createBalls(g.grid, t.balls, random);
  g.warders = createWarders(g.ring, t.warders);
  g.pct = landFraction(g.grid);
  g.graceTicks = 0;
}

export function startGame(g: Game): void {
  g.level = 1;
  g.lives = 3;
  g.score = 0;
  startLevel(g);
  g.state = 'playing';
  g.events.push({ type: 'start' });
}

export function returnToTitle(g: Game): void {
  g.state = 'title';
}

export function setDirection(g: Game, d: Dir): void {
  if (g.state === 'playing') queueDirection(g.player, d);
}

export function togglePause(g: Game): void {
  if (g.state === 'playing') {
    g.state = 'paused';
    g.events.push({ type: 'pause' });
  } else if (g.state === 'paused') {
    g.state = 'playing';
    g.events.push({ type: 'resume' });
  }
}

export function drainEvents(g: Game): GameEvent[] {
  const out = g.events;
  g.events = [];
  return out;
}

function respawn(g: Game): void {
  g.player = createPlayer(g.grid, g.preset.border);
  g.graceTicks = SPAWN_GRACE;
}

export function tick(g: Game): void {
  switch (g.state) {
    case 'dying':
      if (--g.stateTimer <= 0) {
        if (g.lives <= 0) {
          g.state = 'gameover';
          g.events.push({ type: 'gameover', score: g.score });
        } else {
          respawn(g);
          g.state = 'playing';
        }
      }
      return;
    case 'levelclear':
      if (--g.stateTimer <= 0) {
        g.level++;
        startLevel(g);
        g.state = 'playing';
      }
      return;
    case 'title':
    case 'paused':
    case 'gameover':
      return;
    case 'playing':
      break;
  }

  const t = tuningFor(g.level, g.preset);

  // 1. player
  const pr = tickPlayer(g.grid, g.player, t.playerSpeed);
  if (pr.sealed) {
    const { claimedCells } = sealAndClaim(g.grid, g.balls);
    if (claimedCells.length > 0) {
      g.score += scoreForClaim(claimedCells.length, g.level);
      g.events.push({ type: 'claim', cells: claimedCells, score: g.score });
    }
  }

  // 2. enemies
  tickBalls(g.grid, g.balls, t.ballSpeed);
  tickWarders(g.warders, g.ring, t.warderSpeed);

  // 3. death?
  const cause = g.graceTicks > 0 ? null : checkDeath(g.grid, g.player, g.balls, g.warders, g.ring);
  if (g.graceTicks > 0) g.graceTicks--;
  if (cause) {
    g.lives--;
    clearTrail(g.grid);
    g.events.push({ type: 'death', cause, lives: g.lives });
    g.state = 'dying';
    g.stateTimer = DIE_FREEZE;
    return;
  }

  // 4. fill target reached?
  g.pct = landFraction(g.grid);
  if (g.pct >= t.fillTarget) {
    const bonus = levelClearBonus(g.lives, g.level);
    g.score += bonus;
    g.state = 'levelclear';
    g.stateTimer = CLEAR_HOLD;
    g.events.push({ type: 'levelclear', level: g.level, bonus });
  }
}
