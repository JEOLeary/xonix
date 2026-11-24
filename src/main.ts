import './styles.css';
import { PRESETS } from './core/levels';
import { createGame, tick, drainEvents } from './core/game';
import { Renderer } from './render/renderer';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const preset = PRESETS.classic;
const game = createGame(preset);
const renderer = new Renderer(canvas, preset);

let last = performance.now();
let acc = 0;
function frame(now: number): void {
  acc += Math.min(now - last, 250);
  last = now;
  while (acc >= 1000 / 60) {
    tick(game);
    acc -= 1000 / 60;
  }
  for (const e of drainEvents(game)) renderer.onEvent(e);
  renderer.draw(game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
