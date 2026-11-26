# R20 — HUD at preset-native fixed size, field-only canvas scales alone

Date: 2026-11-26 · Repo `/home/jeoleary/workspace/xonix`, branch `main`
Ruling: **R20** — the DOM HUD is FIXED at the preset's native pixel height
(classic 16px bar / 8px font, roomy 32px bar / 24px font) and only the
playfield scales. Follow-up to the SDD close-out (user feedback: "HUD is too
tall, it should stay the same size").

## Why the change was structural

The canvas backing *included* the HUD strip (classic 320×200 = 16px strip +
184px field; the renderer drew `oy = hudH` and painted the strip black). A
fixed 16px DOM HUD over a still-scaling canvas strip would have produced a
double-height bar. Fix: the canvas is now FIELD-ONLY and the DOM HUD stacks
above it as a normal flex child.

## Per-change (file:line, as committed)

**`src/render/renderer.ts`**
- `:29` `canvas.height = preset.canvasH - preset.hudH` → backing is 320×184
  (classic) / 640×368 (roomy); `canvas.width = preset.canvasW` unchanged.
- `:42` `const oy = 0;` replaces `const oy = hudH` — every draw call already
  keys off `oy`, so the whole field now starts at the top edge.
- `:46` water background still fills `canvasW × (canvasH - hudH)` = the full
  field-only backing (no strip).
- Deleted the black strip fill (`fillRect(0, 0, canvasW, hudH)`) and the three
  inert canvas-text lines (`ctx.fillStyle = COLORS.hud`, `textBaseline`,
  `textAlign`) parked since R17.
- Deleted the unused `COLORS.hud` entry (grep confirmed it had exactly one
  reference, the deleted line).
- Deleted both `setProperty('--hud-font'/'--hud-strip', …)` calls — sizing
  vars are owned by `main.ts` now.
- `:106` HUD text unchanged: `this.hud.textContent = hud`, same string, same
  per-frame cadence.

**`src/main.ts`**
- `:22-26` new `applyHudVars(p)` sets the sizing vars **on the wrap** so both
  `#hud` and the canvas inherit them: `--hud-h-px = ${p.hudH}px`,
  `--hud-font-px = ${p.hudH - 8}px`; called once at boot after
  `createGame`/`new Renderer`.
- `:64` re-called in `applySettings`'s preset-switch branch, next to
  `new Renderer(canvas, hud, wanted)`.
- `:40` Fit math subtracts the fixed HUD height:
  `scale = min(innerWidth / canvasW, (innerHeight - hudH) / (canvasH - hudH))`.
  The 1×/2×/3× branch is unchanged (width formula identical).
- Fullscreen branch (`wrap.requestFullscreen()` + `fullscreenchange`
  handler) unchanged.

**`src/styles.css`**
- `:24` `#canvas-wrap { position: relative; display: flex; flex-direction: column; }`
  — no `container-type` anywhere; all `cqw` usage removed.
- `:25-30` `#hud` is a normal flex child (not absolute):
  `height: var(--hud-h-px); flex: none; background: #000; pointer-events: none;`
  — `position/top/left/width/container-type` deleted.
- `:31-40` `#hud-text`: `font-size: var(--hud-font-px); line-height: var(--hud-h-px);`
  — the 16px fallback line and both `calc(… * 1cqw)` lines deleted; bold /
  monospace / `#fff` / `white-space: pre` / `padding-left: 1.25%` /
  `display: block` kept.
- `:159-172` fullscreen rules: wrap stays
  `display:flex; flex-direction:column; align-items:center; justify-content:flex-start; background:#000;`;
  canvas `width: min(100vw, calc((100vh - var(--hud-h-px)) * 1.7391)); height: auto;`
  and HUD the same width (field ratio 320/184 = 640/368 = 1.7391) — the old
  `left:50%; transform:translateX(-50%)` absolute positioning deleted.
- `image-rendering: pixelated` remains on `#game` only.

**`index.html`**
- `:14-15` `<div id="hud">` moved BEFORE `<canvas id="game">` inside
  `#canvas-wrap`; canvas markup `height="184"` matches the new field-only
  backing (the renderer sets it authoritatively at construction anyway).

Untouched: `src/core/**`, `tests/**`, storage, input, screens, audio, docs
(other than this report).

## Verification — automated

```
$ npm test
 Test Files  8 passed (8)
      Tests  47 passed (47)

$ npm run build          # tsc --noEmit && vite build
dist/assets/index-*.css   3.19 kB │ gzip: 1.16 kB
dist/assets/index-*.js   16.53 kB │ gzip: 6.30 kB
✓ built in 184ms   + PWA generateSW (10 precache entries)
```

47/47 green, build green (exit 0 both).

## Verification — live DOM rects (dev server, `http://localhost:5199/`)

All values are `getBoundingClientRect()` / `getComputedStyle` /
`canvas.width|height` read via JS — programmatic state probes, not eyeballed.
Browser viewport 780×380 (Fit), 800×487 (fullscreen).

| Scale / preset | `#hud` height | Canvas displayed (w×h) | w/h | Canvas backing | Total (hud+canvas) | Fits viewport? |
|---|---|---|---|---|---|---|
| Classic @ **1×** | **16** ✅ | 320 × 184 | 1.73913 | 320×184 | 200 | yes (native) |
| Classic @ **Fit** (780×380) | **16** ✅ | 633 × 363.97 | 1.73916 | 320×184 | 379.97 ≤ 380 | yes, no scrollbars |
| Classic @ **Fullscreen** (800×487) | **16** ✅ | 800 × 460 | 1.73913 | 320×184 | 476 ≤ 487 | yes |
| Roomy @ **1×** | **32** ✅ | 640 × 368 | 1.73913 | 640×368 | 400 | yes (native) |
| Roomy @ **Fit** | **32** ✅ | 791.28 × 454.98 | 1.73914 | 640×368 | 486.98 ≤ 487 | yes, no scrollbars |
| Roomy @ **Fullscreen** | **32** ✅ | 791.28 × 454.98 | 1.73914 | 640×368 | 486.98 ≤ 487 | yes |

Key assertions:
- **`#hud` height is 16px at every classic scale and 32px at every roomy
  scale** — identical numbers at 1×, Fit and fullscreen. Sizing vars read off
  the computed style: `--hud-h-px: 16px`, `--hud-font-px: 8px` (classic) /
  `32px` / `24px` (roomy); `#hud-text` `font-size: 8px` (classic) / `24px`
  (roomy) at all scales.
- **Canvas ratio = 1.7391 (±0.00006) at every scale**, backing 320×184 /
  640×368 — no strip in the backing (was 320×200 before the change).
- **No double bar:** `canvas.top − hud.bottom === 0` (adjacent, no gap), HUD
  rect exactly 16px, screenshot shows a single thin black bar with the text.
- **No clipping:** `documentElement.scrollHeight === clientHeight` at every
  scale (overflow false).

Behaviour probes:
- **HUD text updates live:** driving the game (arrow keys through the input
  pipeline) produced `SCORE 000000 LIVES 3 FILL 13% LV 1` →
  `SCORE 000703 LIVES 3 FILL 32% LV 1` after a claim, and `LIVES 3 → 0` on
  deaths — the string is re-rendered from live game state every frame.
- **Tap on the HUD area reaches the game:** with the game paused, a real
  CDP touch tap centered on the HUD strip had target `canvas-wrap` (i.e. it
  passed through `#hud`, which is `pointer-events: none`) and the tap-to-start
  handler resumed the paused game.
- **P pauses / P resumes / Escape pauses** all confirmed via the
  `#screen-pause` visibility probe.
- **Fullscreen entry** (`document.fullscreenElement === canvas-wrap`) and exit
  both work; the exit handler restores windowed Fit/1× sizing.

## Commit / push / CI / live

- **Commit:** `fix: R20 — HUD at preset-native fixed size, field-only canvas scales alone`
  — exactly five paths: `src/render/renderer.ts`, `src/main.ts`,
  `src/styles.css`, `index.html`, this report.
- **Push:** `48c3bfb..39c01ec  main -> main` (this section was appended
  afterwards and the commit amended, so the final SHA is the tip of `main`
  in Actions; both pushes carried the same five paths).
- **CI:** GitHub Actions run **45853227255** (`Deploy to GitHub Pages`,
  job `test-build-deploy`) → **success**: `npm ci`, `npm test` (47/47),
  `npm run build`, Pages artifact upload + deployment — all green.
- **Live site `https://jeoleary.github.io/xonix/`** (fresh browser tab after
  the run went green, service worker active) — key measurement re-run there:

  | Live scale | `#hud` height | Canvas displayed | w/h | Backing | Fits |
  |---|---|---|---|---|---|
  | **Fit** (780×380) | **16** ✅ | 633 × 363.97 | 1.73916 | 320×184 | total 379.97 ≤ 380, no overflow |
  | **1×** | **16** ✅ | 320 × 184 | 1.73913 | 320×184 | total 200, `gap = 0` |

  Live probes also read `--hud-h-px: 16px`, `#hud-text` `font-size: 8px`,
  `gap = canvas.top − hud.bottom = 0` (single bar). Backing 320×184 is proof
  the new build is what's served (the previous live build had a 320×200
  backing with the strip inside the canvas). The live display setting was
  restored to Fit afterwards.

Evidence notes: rect/attribute probes were read programmatically
(`getBoundingClientRect`, `canvas.width/height`, `getComputedStyle`) at each
scale; the screenshot used for the single-bar composition check lives outside
the repo (not committed): `/home/jeoleary/.config/browser-harness/tmp/p-5f127d4e5889/shot.png`.
No measurement in this report is eyeballed.
