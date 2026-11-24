export type PresetName = 'classic' | 'roomy';

export interface Preset {
  name: PresetName;
  canvasW: number;
  canvasH: number;
  hudH: number;
  cellPx: number;
  border: number;
  cols: number;
  rows: number;
}

export const PRESETS: Record<PresetName, Preset> = {
  classic: { name: 'classic', canvasW: 320, canvasH: 200, hudH: 16, cellPx: 4, border: 2, cols: 80, rows: 46 },
  roomy:   { name: 'roomy',   canvasW: 640, canvasH: 400, hudH: 32, cellPx: 4, border: 2, cols: 160, rows: 92 },
};

export interface Tuning {
  balls: number;
  ballSpeed: number;
  warders: number;
  warderSpeed: number;
  playerSpeed: number;
  fillTarget: number;
}

const CLASSIC_COLS = PRESETS.classic.cols;
const CLASSIC_AREA = PRESETS.classic.cols * PRESETS.classic.rows;

export function tuningFor(level: number, preset: Preset): Tuning {
  const areaRatio = (preset.cols * preset.rows) / CLASSIC_AREA;
  const linearRatio = preset.cols / CLASSIC_COLS;
  const baseBalls = Math.min(1 + level, 10);
  return {
    balls: Math.max(1, Math.round(baseBalls * areaRatio)),
    ballSpeed: Math.min(0.10 + 0.012 * (level - 1), 0.26),
    warders: Math.min(4 + Math.floor(level / 4), 8),
    warderSpeed: 0.12,
    playerSpeed: 0.20 * linearRatio,
    fillTarget: Math.min(0.75 + 0.01 * (level - 1), 0.85),
  };
}
