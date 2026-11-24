import { describe, expect, test } from 'vitest';
import { PRESETS, tuningFor } from '../../src/core/levels';

describe('levels', () => {
  test('preset dimensions are self-consistent', () => {
    for (const p of [PRESETS.classic, PRESETS.roomy]) {
      expect(p.cols * p.cellPx).toBe(p.canvasW);
      expect((p.canvasH - p.hudH) / p.cellPx).toBe(p.rows);
      expect(p.border).toBe(2);
    }
    expect(PRESETS.classic).toEqual({
      name: 'classic', canvasW: 320, canvasH: 200, hudH: 16, cellPx: 4, border: 2, cols: 80, rows: 46,
    });
    expect(PRESETS.roomy).toEqual({
      name: 'roomy', canvasW: 640, canvasH: 400, hudH: 32, cellPx: 4, border: 2, cols: 160, rows: 92,
    });
  });

  test('classic level 1 tuning (pre-calibration defaults)', () => {
    expect(tuningFor(1, PRESETS.classic)).toEqual({
      balls: 2, ballSpeed: 0.10, warders: 4, warderSpeed: 0.12, playerSpeed: 0.20, fillTarget: 0.75,
    });
  });

  test('roomy scales balls by area (×4) and player speed by linear ratio (×2)', () => {
    const c = tuningFor(1, PRESETS.classic);
    const r = tuningFor(1, PRESETS.roomy);
    expect(r.balls).toBe(c.balls * 4);
    expect(r.playerSpeed).toBeCloseTo(c.playerSpeed * 2);
    expect(r.ballSpeed).toBe(c.ballSpeed);
    expect(r.warders).toBe(c.warders);
    expect(r.fillTarget).toBe(c.fillTarget);
  });

  test('difficulty ramps with level and caps', () => {
    const l1 = tuningFor(1, PRESETS.classic);
    const l5 = tuningFor(5, PRESETS.classic);
    const l50 = tuningFor(50, PRESETS.classic);
    expect(l5.ballSpeed).toBeGreaterThan(l1.ballSpeed);
    expect(l5.warders).toBe(5);
    expect(l5.balls).toBe(6);
    expect(l50.ballSpeed).toBeCloseTo(0.26);
    expect(l50.fillTarget).toBeCloseTo(0.85);
    expect(l50.balls).toBe(10);
    expect(l50.warders).toBe(8);
  });
});
