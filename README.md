# Xonix

A browser reproduction of the 1984 territory-capture classic **Xonix**: steer into the black, draw a line back to your color to claim it, fill 75% to advance — and don't touch the balls (or your own live line).

**Play it:** https://jeoleary.github.io/xonix/

## Controls

- **Move:** Arrow keys or WASD (touch: swipe, or the on-screen D-pad)
- **Start / confirm:** Enter or tap
- **Pause / resume:** P or Escape (touch: the II button)
- **Settings:** Display size, Classic 320×200 or Roomy 640×400 playfield, sound

## Tech

- TypeScript + Vite (PWA via vite-plugin-pwa)
- vitest for unit tests

## Development

```sh
npm install
npm test
npm run dev
npm run build
```

## Credit

Original Xonix by Ilan Rav & Dani Katz, 1984. This is a fan-made web reproduction.
