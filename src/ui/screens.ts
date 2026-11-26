import type { Game } from '../core/game';
import { qualifiesForTopTen, insertScore, levelClearBonus, type ScoreEntry } from '../core/scoring';
import {
  loadScores, saveScores, loadSettings, saveSettings, type Settings,
} from '../persist/storage';

export interface ScreensCallbacks {
  onStart: () => void;
  onResume: () => void;
  onQuitToTitle: () => void;
  onSettingsApplied: (s: Settings) => void;
}

export interface Screens {
  sync(g: Game): void;
}

export function initScreens(cb: ScreensCallbacks): Screens {
  const el = <T extends HTMLElement>(id: string): T => {
    const node = document.getElementById(id);
    if (!node) throw new Error(`missing #${id}`);
    return node as T;
  };

  const overlays = {
    title: el('screen-title'),
    settings: el('screen-settings'),
    pause: el('screen-pause'),
    levelclear: el('screen-levelclear'),
    gameover: el('screen-gameover'),
  };

  let scores = loadScores();
  let settings = loadSettings();
  let pendingEntry: ScoreEntry | null = null;

  function showOnly(name: keyof typeof overlays | null): void {
    for (const o of Object.values(overlays)) o.classList.add('hidden');
    if (name) overlays[name].classList.remove('hidden');
  }

  function renderScores(): void {
    const list = el<HTMLOListElement>('score-list');
    list.innerHTML = '';
    if (scores.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No scores yet — set the first record!';
      list.appendChild(li);
      return;
    }
    for (const s of scores) {
      const li = document.createElement('li');
      li.textContent = `${s.initials}  ${String(s.score).padStart(6, '0')}  LV ${s.level}`;
      list.appendChild(li);
    }
  }

  function renderSettings(): void {
    for (const row of document.querySelectorAll<HTMLElement>('.setting-row')) {
      const key = row.dataset.setting as keyof Settings;
      const current = key === 'sound'
        ? (settings.sound ? 'on' : 'off')
        : String(settings[key]);
      for (const btn of row.querySelectorAll<HTMLButtonElement>('button')) {
        btn.classList.toggle('active', btn.dataset.value === current);
      }
    }
  }

  // settings rows: click a value → save + apply
  for (const row of document.querySelectorAll<HTMLElement>('.setting-row')) {
    row.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest('button');
      if (!btn || !row.contains(btn)) return;
      const key = row.dataset.setting as keyof Settings;
      const val = btn.dataset.value ?? '';
      const next: Settings = { ...settings };
      if (key === 'sound') next.sound = val === 'on';
      else if (key === 'displaySize') next.displaySize = val as Settings['displaySize'];
      else if (key === 'playfield') next.playfield = val as Settings['playfield'];
      settings = next;
      saveSettings(settings);
      renderSettings();
      cb.onSettingsApplied(settings);
    });
  }

  el('btn-settings').addEventListener('click', () => {
    renderSettings();
    showOnly('settings');
  });
  el('btn-settings-back').addEventListener('click', () => showOnly('title'));
  el('btn-start').addEventListener('click', () => cb.onStart());
  overlays.pause.addEventListener('click', () => cb.onResume());

  el<HTMLButtonElement>('btn-gameover-ok').addEventListener('click', () => {
    pendingEntry = null;
    cb.onQuitToTitle();
  });

  el<HTMLFormElement>('initials-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const input = el<HTMLInputElement>('initials-input');
    const initials = (input.value || 'AAA').toUpperCase()
      .replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, 'A');
    if (pendingEntry) {
      scores = insertScore(scores, { ...pendingEntry, initials });
      saveScores(scores);
      pendingEntry = null;
      renderScores();
    }
    cb.onQuitToTitle();
  });

  function sync(g: Game): void {
    if (g.state !== 'gameover') pendingEntry = null;
    switch (g.state) {
      case 'title':
        renderScores();
        showOnly('title');
        break;
      case 'paused':
        showOnly('pause');
        break;
      case 'playing':
      case 'dying':
        showOnly(null);
        break;
      case 'levelclear': {
        const bonus = levelClearBonus(g.lives, g.level); // same call the emitter made this tick
        el('clear-summary').textContent =
          `Level ${g.level} cleared — ${Math.floor(g.pct * 100)}% filled! — bonus ${bonus}`;
        showOnly('levelclear');
        break;
      }
      case 'gameover': {
        el('final-score').textContent =
          `SCORE ${String(g.score).padStart(6, '0')} — reached level ${g.level}`;
        showOnly('gameover'); // un-hide first so the field below can take focus
        const form = el<HTMLFormElement>('initials-form');
        if (pendingEntry === null && g.score > 0 && qualifiesForTopTen(scores, g.score)) {
          pendingEntry = {
            initials: '', score: g.score, level: g.level, date: new Date().toISOString(),
          };
          form.classList.remove('hidden');
          const input = el<HTMLInputElement>('initials-input');
          input.value = '';
          input.focus();
        } else if (pendingEntry === null) {
          form.classList.add('hidden');
        }
        break;
      }
    }
  }

  renderScores();
  return { sync };
}
