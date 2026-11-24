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

let settingsBroken = false;
let scoresBroken = false;
let memSettings: Settings = { ...DEFAULT_SETTINGS };
let memScores: ScoreEntry[] = [];

const PLAYFIELDS: Settings['playfield'][] = ['classic', 'roomy'];
const DISPLAY_SIZES: Settings['displaySize'][] = ['fit', '1x', '2x', '3x', 'fullscreen'];

function sanitize(raw: unknown): Settings {
  const p = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Settings>;
  return {
    playfield: typeof p.playfield === 'string' && PLAYFIELDS.includes(p.playfield as Settings['playfield'])
      ? p.playfield as Settings['playfield']
      : DEFAULT_SETTINGS.playfield,
    displaySize: typeof p.displaySize === 'string' && DISPLAY_SIZES.includes(p.displaySize as Settings['displaySize'])
      ? p.displaySize as Settings['displaySize']
      : DEFAULT_SETTINGS.displaySize,
    sound: typeof p.sound === 'boolean' ? p.sound : DEFAULT_SETTINGS.sound,
  };
}

export function loadSettings(): Settings {
  if (settingsBroken) return { ...memSettings };
  try {
    const raw = localStorage.getItem('xonix.settings');
    if (raw) {
      memSettings = sanitize(JSON.parse(raw));
      return { ...memSettings };
    }
  } catch {
    settingsBroken = true;
  }
  return { ...memSettings };
}

export function saveSettings(s: Settings): void {
  memSettings = { ...s };
  if (settingsBroken) return;
  try {
    localStorage.setItem('xonix.settings', JSON.stringify(s));
  } catch {
    settingsBroken = true;
  }
}

export function loadScores(): ScoreEntry[] {
  if (scoresBroken) return [...memScores];
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
    scoresBroken = true;
  }
  return [...memScores];
}

export function saveScores(list: ScoreEntry[]): void {
  memScores = [...list];
  if (scoresBroken) return;
  try {
    localStorage.setItem('xonix.scores', JSON.stringify(list));
  } catch {
    scoresBroken = true;
  }
}
