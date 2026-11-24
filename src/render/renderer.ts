import type { Game, GameEvent } from '../core/game';
import type { Preset } from '../core/levels';
import { LAND, TRAIL } from '../core/grid';
import { warderPos } from '../core/enemies';

const COLORS = {
  water: '#000000',
  land: '#00FFFF',
  trail: '#FF00FF',
  player: '#FFFFFF',
  ball: '#FFFFFF',
  warder: '#FF00FF',
  hud: '#FFFFFF',
  flash: '#FFFFFF',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private flash = new Map<number, number>(); // flat cell index → frames remaining

  constructor(canvas: HTMLCanvasElement, private preset: Preset) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas context unavailable');
    this.ctx = ctx;
    canvas.width = preset.canvasW;
    canvas.height = preset.canvasH;
    ctx.imageSmoothingEnabled = false;
  }

  onEvent(e: GameEvent): void {
    if (e.type === 'claim') {
      for (const i of e.cells) this.flash.set(i, 6);
    }
  }

  draw(g: Game): void {
    const { ctx, preset } = this;
    const { cellPx, hudH, cols, rows, canvasW, canvasH } = preset;
    const oy = hudH; // playfield origin (below HUD strip)

    // 1. water background
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(0, oy, canvasW, canvasH - hudH);

    // 2. land + trail, run-length merged per row
    for (let y = 0; y < rows; y++) {
      let runColor = -1;
      let runStart = 0;
      for (let x = 0; x <= cols; x++) {
        const c = x < cols ? g.grid.cells[y * cols + x] : -1;
        if (c !== runColor) {
          if (runColor === LAND || runColor === TRAIL) {
            ctx.fillStyle = runColor === LAND ? COLORS.land : COLORS.trail;
            ctx.fillRect(runStart * cellPx, oy + y * cellPx, (x - runStart) * cellPx, cellPx);
          }
          runColor = c;
          runStart = x;
        }
      }
    }

    // 3. capture flash (freshly claimed cells blink white)
    if (this.flash.size > 0) {
      ctx.fillStyle = COLORS.flash;
      for (const [i, t] of this.flash) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        ctx.fillRect(x * cellPx, oy + y * cellPx, cellPx, cellPx);
        if (t <= 1) this.flash.delete(i);
        else this.flash.set(i, t - 1);
      }
    }

    // 4. player (or death explosion while dying)
    const pxc = Math.floor(g.player.x);
    const pyc = Math.floor(g.player.y);
    if (g.state === 'dying') {
      const phase = Math.floor(g.stateTimer / 4) % 2;
      ctx.fillStyle = phase === 0 ? COLORS.player : COLORS.trail;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        ctx.fillRect((pxc + dx) * cellPx, oy + (pyc + dy) * cellPx, cellPx, cellPx);
      }
    } else {
      ctx.fillStyle = COLORS.player;
      ctx.fillRect(pxc * cellPx, oy + pyc * cellPx, cellPx, cellPx);
    }

    // 5. balls
    ctx.fillStyle = COLORS.ball;
    for (const b of g.balls) {
      ctx.fillRect(Math.floor(b.x) * cellPx, oy + Math.floor(b.y) * cellPx, cellPx, cellPx);
    }

    // 6. warders (magenta, distinct against cyan border)
    ctx.fillStyle = COLORS.warder;
    for (const w of g.warders) {
      const c = warderPos(w, g.ring);
      ctx.fillRect(c.x * cellPx, oy + c.y * cellPx, cellPx, cellPx);
    }

    // 7. HUD strip
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(0, 0, canvasW, hudH);
    ctx.fillStyle = COLORS.hud;
    ctx.font = `bold ${hudH - 8}px monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const pct = Math.floor(g.pct * 100);
    const hud = `SCORE ${String(g.score).padStart(6, '0')}  LIVES ${g.lives}  FILL ${pct}%  LV ${g.level}`;
    ctx.fillText(hud, 4, hudH / 2);
  }
}
