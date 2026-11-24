import { describe, expect, test } from 'vitest';
import {
  scoreForClaim, levelClearBonus, qualifiesForTopTen, insertScore,
  type ScoreEntry,
} from '../../src/core/scoring';

describe('scoring', () => {
  test('claim score = cells × level', () => {
    expect(scoreForClaim(10, 3)).toBe(30);
    expect(scoreForClaim(0, 5)).toBe(0);
  });

  test('level-clear bonus = lives × 100 × level', () => {
    expect(levelClearBonus(2, 4)).toBe(800);
    expect(levelClearBonus(0, 1)).toBe(0);
  });

  test('qualifies: short list always qualifies; full list must beat the tail', () => {
    const short: ScoreEntry[] = [{ initials: 'AAA', score: 500, level: 3, date: '2026-11-23' }];
    expect(qualifiesForTopTen(short, 1)).toBe(true);
    const full: ScoreEntry[] = Array.from({ length: 10 }, (_, i) => ({
      initials: 'X', score: (10 - i) * 100, level: 1, date: '2026-11-23',
    })); // 1000 … 100
    expect(qualifiesForTopTen(full, 101)).toBe(true);
    expect(qualifiesForTopTen(full, 100)).toBe(false);
  });

  test('insertScore sorts desc, caps at 10', () => {
    let list: ScoreEntry[] = [];
    for (let i = 0; i < 12; i++) {
      list = insertScore(list, {
        initials: 'A', score: i * 10, level: 1,
        date: `2026-11-23T00:00:${String(i).padStart(2, '0')}`,
      });
    }
    expect(list).toHaveLength(10);
    expect(list[0].score).toBe(110);
    expect(list[9].score).toBe(20);
  });

  test('insertScore does not mutate the input list', () => {
    const list: ScoreEntry[] = [{ initials: 'OLD', score: 50, level: 1, date: '2026-11-23' }];
    const next = insertScore(list, { initials: 'NEW', score: 99, level: 2, date: '2026-11-24' });
    expect(list).toHaveLength(1);
    expect(next).toHaveLength(2);
    expect(next[0].initials).toBe('NEW');
  });
});
