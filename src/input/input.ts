import type { Dir } from '../core/player';

export interface InputHandlers {
  onDir: (d: Dir) => void;
  onStart: () => void;
  onPause: () => void;
}

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', a: 'left', s: 'down', d: 'right',
  W: 'up', A: 'left', S: 'down', D: 'right',
};

export function attachInput(h: InputHandlers): () => void {
  const onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key in KEY_DIRS) {
      h.onDir(KEY_DIRS[ev.key]);
      ev.preventDefault();
    } else if (ev.key === 'Enter' || ev.key === ' ') {
      h.onStart();
      ev.preventDefault();
    } else if (ev.key === 'p' || ev.key === 'P' || ev.key === 'Escape') {
      h.onPause();
      ev.preventDefault();
    }
  };

  // swipe-to-steer + tap-to-start
  let sx = 0, sy = 0, st = 0, tracking = false;
  const onTouchStart = (ev: TouchEvent): void => {
    const t = ev.changedTouches[0];
    sx = t.clientX; sy = t.clientY; st = Date.now(); tracking = true;
  };
  const onTouchEnd = (ev: TouchEvent): void => {
    if (!tracking) return;
    tracking = false;
    const t = ev.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.hypot(dx, dy) < 24) {
      if (Date.now() - st < 300) h.onStart();
      return;
    }
    h.onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  // on-screen D-pad + pause button
  const dpadButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dir]'));
  const onDpad = (ev: Event): void => {
    const btn = ev.currentTarget as HTMLButtonElement;
    h.onDir(btn.dataset.dir as Dir);
  };
  const stopTouch = (ev: Event): void => ev.preventDefault();
  for (const b of dpadButtons) {
    b.addEventListener('pointerdown', onDpad);
    b.addEventListener('touchstart', stopTouch, { passive: false });
  }
  const pauseBtn = document.querySelector('#btn-pause');
  const onPauseClick = (): void => h.onPause();
  pauseBtn?.addEventListener('click', onPauseClick);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
    for (const b of dpadButtons) {
      b.removeEventListener('pointerdown', onDpad);
      b.removeEventListener('touchstart', stopTouch);
    }
    pauseBtn?.removeEventListener('click', onPauseClick);
  };
}
