import './styles.css';
import { PRESETS } from './core/levels';
import {
  createGame, startGame, tick, togglePause, setDirection, drainEvents, returnToTitle,
} from './core/game';
import { Renderer } from './render/renderer';
import { attachInput } from './input/input';
import { GameAudio } from './audio/audio';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const preset = PRESETS.classic;
const game = createGame(preset);
const renderer = new Renderer(canvas, preset);
const audio = new GameAudio();

attachInput({
  onDir: (d) => setDirection(game, d),
  onStart: () => {
    if (game.state === 'title' || game.state === 'gameover') startGame(game);
    else if (game.state === 'paused') togglePause(game);
  },
  onPause: () => {
    if (game.state === 'playing' || game.state === 'paused') togglePause(game);
    else if (game.state === 'gameover') returnToTitle(game);
  },
});

window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
window.addEventListener('keydown', () => audio.unlock(), { once: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') togglePause(game);
});

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
  renderer.draw(game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
