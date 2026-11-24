import type { ScoreEntry } from '../core/scoring';

export interface Settings {
  displaySize: 'fit' | '1x' | '2x' | '3x' | 'fullscreen';
  playfield: 'classic' | 'roomy';
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  displaySize: 'fit',
  playfield: 'classic',
  sound: true,
};

let storageBroken = false;
let memSettings: Settings = { ...DEFAULT_SETTINGS };
let memScores: ScoreEntry[] = [];

export function loadSettings(): Settings {
  if (storageBroken) return { ...memSettings };
  try {
    const raw = localStorage.getItem('xonix.settings');
    if (raw) {
      memSettings = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
      return { ...memSettings };
    }
  } catch {
    storageBroken = true;
  }
  return { ...memSettings };
}

export function saveSettings(s: Settings): void {
  memSettings = { ...s };
  if (storageBroken) return;
  try {
    localStorage.setItem('xonix.settings', JSON.stringify(s));
  } catch {
    storageBroken = true;
  }
}

export function loadScores(): ScoreEntry[] {
  if (storageBroken) return [...memScores];
  try {
    const raw = localStorage.getItem('xonix.scores');
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memScores = parsed.filter(
          (e): e is ScoreEntry =>
            typeof e === 'object' && e !== null &&
            typeof (e as ScoreEntry).score === 'number' &&
            typeof (e as ScoreEntry).initials === 'string',
        );
        return [...memScores];
      }
    }
  } catch {
    storageBroken = true;
  }
  return [...memScores];
}

export function saveScores(list: ScoreEntry[]): void {
  memScores = [...list];
  if (storageBroken) return;
  try {
    localStorage.setItem('xonix.scores', JSON.stringify(list));
  } catch {
    storageBroken = true;
  }
}
