import { describe, expect, test } from 'vitest';
import { createGrid, setCell, TRAIL } from '../../src/core/grid';
import { createPlayer, type Player } from '../../src/core/player';
import { buildRing, type Ball, type Warder } from '../../src/core/enemies';
import { checkDeath } from '../../src/core/collision';

function setup() {
  const g = createGrid(10, 8, 2);
  const player: Player = createPlayer(g, 2); // (1.5, 1.5)
  const ring = buildRing(g, 2);
  return { g, player, ring };
}

describe('collision', () => {
  test('no contact → null', () => {
    const { g, player, ring } = setup();
    const balls: Ball[] = [{ x: 6.5, y: 4.5, dx: 1, dy: 1 }];
    const warders: Warder[] = [{ p: 12, dir: 1 }];
    expect(checkDeath(g, player, balls, warders, ring)).toBeNull();
  });

  test('ball in the player cell → ball', () => {
    const { g, player, ring } = setup();
    const balls: Ball[] = [{ x: 1.6, y: 1.4, dx: 1, dy: 1 }];
    expect(checkDeath(g, player, balls, [], ring)).toBe('ball');
  });

  test('ball orthogonally adjacent to the live trail → trail', () => {
    const { g, player, ring } = setup();
    setCell(g, 5, 4, TRAIL);
    const balls: Ball[] = [{ x: 6.5, y: 4.5, dx: -1, dy: 1 }]; // cell (6,4) touches (5,4)
    expect(checkDeath(g, player, balls, [], ring)).toBe('trail');
  });

  test('ball sitting ON a trail cell → trail', () => {
    const { g, player, ring } = setup();
    setCell(g, 5, 4, TRAIL);
    const balls: Ball[] = [{ x: 5.5, y: 4.5, dx: 1, dy: 1 }];
    expect(checkDeath(g, player, balls, [], ring)).toBe('trail');
  });

  test('ball far from trail and player → null', () => {
    const { g, player, ring } = setup();
    setCell(g, 5, 4, TRAIL);
    const balls: Ball[] = [{ x: 7.5, y: 2.5, dx: 1, dy: 1 }]; // cell (7,2): not adjacent to (5,4)
    expect(checkDeath(g, player, balls, [], ring)).toBeNull();
  });

  test('warder reaching the player cell → warder', () => {
    const { g, player, ring } = setup();
    // ring[0] = (1,1) = player's cell
    const warders: Warder[] = [{ p: 0, dir: 1 }];
    expect(checkDeath(g, player, [], warders, ring)).toBe('warder');
  });

  test('ball beats trail beats warder in priority', () => {
    const { g, player, ring } = setup();
    setCell(g, 2, 1, TRAIL); // adjacent to player cell → any ball near triggers trail;
    const balls: Ball[] = [{ x: 1.6, y: 1.4, dx: 1, dy: 1 }]; // also in player cell
    const warders: Warder[] = [{ p: 0, dir: 1 }];
    expect(checkDeath(g, player, balls, warders, ring)).toBe('ball');
  });
});
