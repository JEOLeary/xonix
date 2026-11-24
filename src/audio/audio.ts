import type { GameEvent } from '../core/game';

export class GameAudio {
  private ctx: AudioContext | null = null;
  private enabled = true;

  unlock(): void {
    if (!this.ctx) {
      const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AC = w.AudioContext ?? w.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(b: boolean): void {
    this.enabled = b;
  }

  private tone(freq: number, dur: number, delay = 0, vol = 0.07): void {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  handle(e: GameEvent): void {
    switch (e.type) {
      case 'claim':
        this.tone(300 + Math.min(e.cells.length, 400), 0.06);
        break;
      case 'death':
        this.tone(400, 0.10);
        this.tone(200, 0.15, 0.10);
        this.tone(100, 0.25, 0.25);
        break;
      case 'levelclear':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, i * 0.10));
        break;
      case 'gameover':
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.18, i * 0.15));
        break;
      case 'start':
      case 'pause':
      case 'resume':
        this.tone(660, 0.05);
        break;
    }
  }
}
