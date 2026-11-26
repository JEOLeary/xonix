import './styles.css';
import { PRESETS } from './core/levels';
import {
  createGame, startGame, tick, togglePause, setDirection, drainEvents, returnToTitle,
  type Game,
} from './core/game';
import { Renderer } from './render/renderer';
import { attachInput } from './input/input';
import { GameAudio } from './audio/audio';
import { initScreens } from './ui/screens';
import { loadSettings, type Settings } from './persist/storage';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const wrap = document.getElementById('canvas-wrap') as HTMLDivElement;
const hud = document.getElementById('hud-text') as HTMLElement;
let settings = loadSettings();
let game: Game = createGame(PRESETS[settings.playfield]);
let renderer = new Renderer(canvas, hud, game.preset);
const audio = new GameAudio();
audio.setEnabled(settings.sound);

function applyDisplaySize(size: Settings['displaySize']): void {
  if (size === 'fullscreen') {
    if (!document.fullscreenElement && wrap.requestFullscreen) {
      wrap.requestFullscreen().catch(() => applyDisplaySize('fit')); // no gesture at boot → size the canvas instead
    }
    return;
  }
  if (document.fullscreenElement) void document.exitFullscreen();
  const p = game.preset;
  const scale = size === 'fit'
    ? Math.min(window.innerWidth / p.canvasW, window.innerHeight / p.canvasH)
    : Number(size.charAt(0)); // '1x' → 1, '2x' → 2, '3x' → 3
  canvas.style.width = `${Math.floor(scale * p.canvasW)}px`;
  canvas.style.height = 'auto';
}

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    // entering: drop inline sizes so the :fullscreen CSS sizes canvas + HUD
    canvas.style.width = '';
    canvas.style.height = '';
  } else {
    // exiting: restore the windowed size; never re-request fullscreen here (loop guard)
    applyDisplaySize(settings.displaySize === 'fullscreen' ? 'fit' : settings.displaySize);
  }
});

function applySettings(s: Settings): void {
  settings = s;
  audio.setEnabled(s.sound);
  const wanted = PRESETS[s.playfield];
  if (wanted.name !== game.preset.name) {
    game = createGame(wanted);          // settings are only reachable from the title,
    renderer = new Renderer(canvas, hud, wanted); // so a preset switch restarts cleanly
  }
  applyDisplaySize(s.displaySize);
}

const handleStart = (): void => {
  audio.unlock();
  if (game.state === 'title' || game.state === 'gameover') startGame(game);
  else if (game.state === 'paused') togglePause(game);
};
const handlePause = (): void => {
  if (game.state === 'playing' || game.state === 'paused') togglePause(game);
  else if (game.state === 'gameover') returnToTitle(game);
};

attachInput({
  onDir: (d) => setDirection(game, d),
  onStart: handleStart,
  onPause: handlePause,
});

window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
window.addEventListener('keydown', () => audio.unlock(), { once: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') togglePause(game);
});

const screens = initScreens({
  onStart: handleStart,
  onResume: () => {
    if (game.state === 'paused') togglePause(game);
  },
  onQuitToTitle: () => returnToTitle(game),
  onSettingsApplied: (s) => { audio.handle({ type: 'start' }); applySettings(s); },
});

applyDisplaySize(settings.displaySize);
window.addEventListener('resize', () => {
  if (settings.displaySize === 'fit') applyDisplaySize('fit');
});

let lastState = '';
let last = performance.now();
let acc = 0;
function frame(now: number): void {
  acc += Math.min(now - last, 250);
  last = now;
  while (acc >= 1000 / 60) {
    tick(game);
    acc -= 1000 / 60;
  }
  for (const e of drainEvents(game)) {
    renderer.onEvent(e);
    audio.handle(e);
  }
  if (game.state !== lastState) {
    lastState = game.state;
    screens.sync(game);
  }
  renderer.draw(game);
  requestAnimationFrame(frame);
}

screens.sync(game); // paint the title screen immediately
lastState = game.state;
requestAnimationFrame(frame);
