import { describe, expect, test } from 'vitest';
import { PRESETS } from '../../src/core/levels';
import { setCell, LAND, WATER, TRAIL, countCells } from '../../src/core/grid';
import {
  createGame, startGame, tick, togglePause, setDirection,
  drainEvents, returnToTitle, type Game,
} from '../../src/core/game';

function startedGame(): Game {
  const g = createGame(PRESETS.classic);
  startGame(g);
  drainEvents(g);
  return g;
}

describe('game', () => {
  test('title is inert; startGame begins level 1 with 3 lives and tuned enemies', () => {
    const g = createGame(PRESETS.classic);
    tick(g);
    expect(g.state).toBe('title');
    expect(g.events).toHaveLength(0);

    startGame(g);
    expect(g.state).toBe('playing');
    expect(g.level).toBe(1);
    expect(g.lives).toBe(3);
    expect(g.score).toBe(0);
    expect(g.balls).toHaveLength(2);
    expect(g.warders).toHaveLength(4);
    expect(drainEvents(g).map((e) => e.type)).toEqual(['start']);
  });

  test('pause freezes simulation; resume continues', () => {
    const g = startedGame();
    setDirection(g, 'right');
    tick(g); // applies pending dir, moves
    expect(g.player.x).toBeGreaterThan(1.5);
    const x1 = g.player.x;

    togglePause(g);
    expect(g.state).toBe('paused');
    for (let i = 0; i < 10; i++) tick(g);
    expect(g.player.x).toBe(x1);

    togglePause(g);
    expect(g.state).toBe('playing');
    tick(g);
    expect(g.player.x).toBeGreaterThan(x1);
  });

  test('death: −1 life, trail discarded, dying freeze, respawn with grace', () => {
    const g = startedGame();
    g.balls = [{ x: g.player.x, y: g.player.y, dx: 1, dy: 1 }];
    tick(g);
    expect(g.state).toBe('dying');
    expect(g.lives).toBe(2);
    expect(drainEvents(g).some((e) => e.type === 'death' && e.cause === 'ball')).toBe(true);

    tick(g); // frozen
    expect(g.state).toBe('dying');

    g.balls = []; // remove the killer so respawn is observable
    for (let i = 0; i < 61; i++) tick(g); // 60-tick freeze + first live tick
    expect(g.state).toBe('playing');
    expect(g.player.x).toBeCloseTo(1.5);
    expect(g.player.y).toBeCloseTo(1.5);
    expect(g.graceTicks).toBeGreaterThan(0); // spawn grace active
    // grace blocks instant re-death even with a ball parked on the spawn cell
    g.balls = [{ x: 1.5, y: 1.5, dx: 1, dy: 1 }];
    tick(g);
    expect(g.state).toBe('playing');
  });

  test('three deaths → gameover; gameover ticks are inert', () => {
    const g = startedGame();
    for (let death = 0; death < 3; death++) {
      g.graceTicks = 0;
      g.balls = [{ x: g.player.x, y: g.player.y, dx: 1, dy: 1 }];
      tick(g); // dying
      g.balls = [];
      for (let i = 0; i < 61; i++) tick(g);
    }
    expect(g.state).toBe('gameover');
    expect(g.lives).toBe(0);
    expect(drainEvents(g).some((e) => e.type === 'gameover')).toBe(true);

    const score = g.score;
    tick(g);
    expect(g.state).toBe('gameover');
    expect(g.score).toBe(score);
  });

  test('sealing claims the field, scores, and clears the level', () => {
    const g = startedGame();
    g.balls = [];
    g.warders = [];
    // vertical trail column splitting the interior (x=40, y2..43)
    for (let y = 2; y <= 43; y++) setCell(g.grid, 40, y, TRAIL);
    // player mid-draw in the right region, one step from a land cell
    setCell(g.grid, 41, 20, TRAIL); // player's own cell is part of the live trail
    setCell(g.grid, 42, 20, LAND);  // reconnect target
    g.player.x = 41.9;
    g.player.y = 20.5;
    g.player.drawing = true;
    g.player.dir = 'right';
    g.player.pending = null;

    tick(g); // seal happens, everything enemy-free is claimed → 100%
    const evs = drainEvents(g);
    expect(evs.some((e) => e.type === 'claim')).toBe(true);
    expect(evs.some((e) => e.type === 'levelclear')).toBe(true);
    expect(g.state).toBe('levelclear');
    expect(g.pct).toBe(1);
    expect(countCells(g.grid, WATER)).toBe(0);
    expect(g.score).toBeGreaterThan(0);

    for (let i = 0; i < 120; i++) tick(g); // levelclear countdown
    expect(g.state).toBe('playing');
    expect(g.level).toBe(2);
    expect(g.balls).toHaveLength(3); // L2: min(1+2,10)
  });

  test('returnToTitle leaves the game on the title screen', () => {
    const g = startedGame();
    returnToTitle(g);
    expect(g.state).toBe('title');
  });
});
