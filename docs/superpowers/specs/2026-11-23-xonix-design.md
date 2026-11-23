# Xonix Web App — Design Spec

**Date:** 2026-11-23
**Status:** Approved in-session (design sections 1–3 + settings amendment)
**Process:** Architectural path — brainstorming → this spec → writing-plans → implementation
**Repo:** `~/workspace/xonix` (new git repo, branch `main`)

## 1. Overview

A web reproduction of **Xonix** (1984, Ilan Rav & Dani Katz, DOS) — a Qix-style
territory-capture arcade game. Fidelity brief: **"faithful rules, modern polish"** —
the original ruleset, presented with crisp rendering, sound, menus, and responsive
controls for desktop and mobile.

### Goals

- Plays like the 1984 original; rules verified against the original itself
- Crisp CGA-pixel presentation at any viewport, smooth 60 fps
- Installable PWA (works offline) with a local high-score table
- Auto-deployed to GitHub Pages by CI
- Test-first core (vitest) so the faithful rules stay pinned

### Non-goals (v1)

- Gamepad support, multiplayer, accounts
- Global/backend leaderboard (local top-10 only)
- Music (original had none), picture-reveal modes, level editor
- End-to-end browser tests (manual checklist instead)

## 2. Rules — reproduction contract

**Playfield:** fixed cell grid. The outer margin starts as claimed land (cyan safe
border). The interior is open "water" (black) that must be claimed.

**Player (cursor):** 4-direction constant speed, moves on land and water alike.
Steering off land into water **auto-draws a trail** (magenta). Reconnecting to land
**seals** the region(s) the trail cut off.

**Sealing:** flood-fill each enclosed region.

- No enemy inside → region becomes claimed land; score += area of the region (bigger
  single cuts are inherently worth more)
- Enemy inside → region stays open water (the enemy now roams the smaller pocket)

**Death** (lose one life, active trail discarded, respawn on border):

- an enemy touches the player
- an enemy touches the player's active trail
- crossing your own trail is impossible (movement rules prevent it)

**Enemies:**

- **Balls** — bounce around open water, reflecting off walls and trails; count and
  speed rise each level
- **Warders** — patrol the claimed margins; they kill on contact even on own land

**Advance:** fill ≥ target % (≈75 %, tuned per level) → next level. Lives: 3 to start.

**Scoring:** points per claimed cell × level multiplier.

## 3. Fidelity calibration

The rules *structure* above is faithful. The following were flagged during design as
unverified against the original and are resolved **by running the original** during
implementation (js-dos.com/xonix, or DOSBox with the archive.org image), with
findings recorded as a spec addendum:

1. Enemy caught inside a sealed region: **eliminated** vs **region stays open water**
2. Enemy touching the active trail: **player death** vs **trail break**
3. Numeric constants: fill %, scoring formula, life count, extra-life milestones,
   per-level ball counts/speeds

Pre-verification defaults: fill 75 %, 3 lives, area-based scoring × level multiplier.
If the original contradicts a default, the original wins and this spec is amended.

## 4. Architecture

```
xonix/
├── index.html · vite.config.ts · tsconfig.json
├── public/                  # PWA icons
├── src/
│   ├── main.ts              # bootstrap: canvas, fixed-timestep loop, wiring
│   ├── core/                # PURE logic — no DOM/canvas imports, fully unit-tested
│   │   ├── grid.ts          # cell states: land / water / active trail
│   │   ├── fill.ts          # flood-fill: seal → claim enemy-free regions
│   │   ├── player.ts        # cursor movement, auto-draw trail, seal-on-reconnect
│   │   ├── enemies.ts       # ball bounce physics, warder patrol paths
│   │   ├── collision.ts     # player↔enemy, trail↔enemy hits
│   │   ├── levels.ts        # level configs, difficulty ramp, per-preset tuning
│   │   ├── scoring.ts       # area points × level multiplier, rank insert
│   │   └── game.ts          # state machine: title → playing → dying → levelclear → gameover
│   ├── render/renderer.ts   # canvas draw only — reads state, never mutates
│   ├── audio/audio.ts       # WebAudio square-wave (PC-speaker-style) SFX
│   ├── input/input.ts       # arrows/WASD + swipe + on-screen D-pad; pause/blur
│   ├── ui/screens.ts        # title, settings, pause, game-over, initials overlays
│   └── persist/storage.ts  # top-10 + settings storage, try/catch → memory fallback
├── tests/                   # vitest, mirrors core/
└── .github/workflows/deploy.yml   # test → build → GitHub Pages on push to main
```

**Data flow:** `requestAnimationFrame` loop with a **fixed-timestep accumulator**
(60 Hz logic tick; render at whatever rate rAF fires) → `input.read()` →
`core.tick(dt)` → renderer draws the resulting state. The core is deterministic:
tests call `tick()` directly with no rendering involved.

**Seams:**

- `core/` never imports DOM/canvas → tests run in plain Node; refactors stay safe
- renderer is read-only over state → no game logic hidden in draw code
- integer-scaled cells with `imageSmoothingEnabled = false` → crisp pixels anywhere

**Error handling:**

- Tab blur / visibility change → auto-pause
- `localStorage` blocked (private mode, quota) → silent in-memory fallback
- AudioContext blocked until user gesture → unlock on first input
- Service-worker update → auto-reload into the new version

## 5. Presentation, settings & screens

### Visuals

- Logical **320×200 (Classic)** or **640×400 (Roomy)** canvas, integer-scaled and
  letterboxed to the viewport
- Original palette: black field, **cyan** land/border, **magenta** trail, white player;
  blocky pixel sprites drawn programmatically (no image assets)
- Modern touches: capture flash + brief fill animation, death explosion, smooth 60 fps,
  HUD bar (score · lives · fill % · level) in a CGA-style text font
- Title screen echoes the original: stacked magenta **XONIX** logo, Ilan Rav / Dani
  Katz credit

### Settings (persisted)

Settings overlay reachable from the title screen; stored in `localStorage`
(`xonix.settings`), applied immediately:

| Setting | Options | Default |
|---|---|---|
| Display size | Fit window · 1× · 2× · 3× integer scale · Fullscreen | Fit window |
| Playfield | Classic 320×200 · Roomy 640×400 | Classic |
| Sound | volume on/off | on |

**Roomy preset under the hood:** the grid doubles (4 px cells → e.g. 80×50 → 160×100
playfield cells, exact dims derived from canvas minus the HUD strip and fixed in the
implementation plan), so `levels.ts` carries a **per-preset tuning table**: ball
counts/speeds scaled by field area so difficulty feels equivalent, fill-% targets
unchanged, flood-fill logic identical. `renderer.ts` draws either logical size; the
test suite runs against **both** presets. Classic remains the calibrated-against-the-
original default.

### Sound

WebAudio square-wave beeps: capture blip (pitch rises with chunk size), death zap,
level-clear arpeggio, menu clicks. Volume toggle persisted. No music.

### Screens

- **Title** — logo, high-score table, controls legend, START, Settings entry
- **Pause** — P/Esc, or auto on tab blur
- **Level clear** — fill % + bonus tally
- **Game over** — final score → 3-letter initials entry if top-10, then title

## 6. Controls

- **Desktop:** arrows/WASD steer, P pause, Enter/Space start
- **Mobile:** swipe anywhere to steer + semi-transparent D-pad bottom-left; tap to
  start; auto-pause on backgrounding; ≥44 px touch targets

## 7. Persistence

- `xonix.settings` — display size, playfield preset, volume
- `xonix.scores` — top-10 `{initials, score, level, date}`
- Both wrapped in try/catch with an in-memory fallback; failures are silent

## 8. PWA & deploy

- `vite-plugin-pwa`: manifest + icons, precached app shell, fully offline play
- Android: standard install prompt; iOS Safari: one-time "Add to Home Screen" hint
- Repo `~/workspace/xonix` → GitHub → Actions workflow (`npm ci → test → build →
  deploy Pages`) on push to `main`; public HTTPS URL makes the PWA installable anywhere

## 9. Testing strategy

- **vitest, `tests/` mirroring `src/core/`:** flood-fill edge cases (sealed region
  with/without enemy, multi-region cuts), trail rules (own-trail crossing impossible,
  seal-on-reconnect), collision matrix (player↔enemy, trail↔enemy, warder-on-land),
  state-machine transitions, scoring/rank insert — **run against both playfield
  presets**
- **Not unit-tested (thin by design):** renderer, input, UI overlays → manual
  checklist (below)
- **No e2e suite in v1** (YAGNI); the manual checklist covers the seams

**Manual checklist:** desktop keyboard, mobile swipe + D-pad, pause/blur auto-pause,
audio unlock on first gesture, settings persist across reload, storage-blocked
fallback, PWA install + offline reload (Android Chrome, iOS Safari), both presets at
all display sizes.

## 10. Risks & open questions

- **Original-behavior verification** (Section 3's three flags) — first implementation
  task; spec gets an addendum, not guesswork
- **iOS PWA quirks** (storage eviction in standalone mode) — mitigate: tiny storage
  footprint, graceful in-memory degradation; game itself needs no network
- **Roomy balance** — area-scaled tuning table starts reasonable, then playtest-tuned

## 11. Acceptance criteria

- [ ] Core game playable on desktop and mobile, both playfield presets, all display
      sizes; settings persist across reloads
- [ ] All three fidelity flags verified against the original and documented in a
      spec addendum; spec amended if the original contradicts a default
- [ ] vitest suite green in CI, covering core logic for both presets
- [ ] PWA installable and playable offline on Android Chrome and iOS Safari
- [ ] Top-10 high scores with 3-letter initials entry
- [ ] Push to `main` auto-deploys; public Pages URL live
- [ ] Manual checklist passed

## 12. Next step

User reviews this spec → invoke the **writing-plans** skill to produce the
implementation plan.
