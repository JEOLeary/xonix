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

---

## 13. Addendum: Fidelity verification (2026-11-23)

Sources checked: archive.org item `msdos_Xonix_1984` metadata + file list (only
`Xonix_1984.zip` → `XONIX.EXE`, `BASRUN.EXE`, `XONIX1.BIN`, `HISCORES.XNX`,
`file_id.diz`; the `.diz` is catalog metadata only — **no readme/manual/FAQ text
file exists in the item, and none was found on the web**), `strings` on `XONIX.EXE`
(v2.2: `Enter skill (1-9) <5>:`, `HISCORES TABLE`, `YOUR SCORE IS ONE OF THE BEST
15!`, HUD labels `Score:` / `Xn:` / `Full:` / `TIME:`, `PRESS 'Y' TO RESTART, <CR>
TO STOP`), MobyGames description (reproduced on the archive.org item), tsemachh/xonix
README, hindmost/picxonix README, Unity Discussions "build a xonix game with Unity"
thread (2019), YouTube "Xonix gameplay (PC Game, 1984)" description, IGDB/GameTrack
AirXonix blurb, Retronix (jvm-gaming) + r/javahelp PacXon clone notes, Qix
references (Wikipedia/wikiwand), javagames.com.ng + playxonix.com clone rules pages.
js-dos live run: **done** — `https://js-dos.com/xonix/` (original DOS v2.2,
`file_id.diz`: "Xonix v2.2 (1984)(Ilan Rav)"), driven by synthetic bubbling
`KeyboardEvent`s on `canvas.dosbox-canvas`, frames captured with
`canvas.toDataURL()` and analysed pixel-by-pixel with PIL (colour counts, sprite
clusters, HUD digit template-matching) plus HUD crops read by vision. CGA palette
confirmed exactly — black (0,0,0), cyan (0,170,170), magenta (170,0,170), white
(170,170,170); no other colours occur in play. Skill 1 was used for this session's
runs (the original prompts `Enter skill (1-9) <5> :` first); an earlier session ran
skill 5 (frame sets `run3`/`run5`/`run6`/`run7`).

| Flag | Finding | Evidence | Resolution |
|---|---|---|---|
| 1. Enemy in sealed region | **Region stays open water — not filled; the enemy survives (not eliminated).** The trail cells themselves *do* convert to claimed land even when the enclosed region is not claimed. An enemy-free region *is* filled. | Live control: a 4×44-cell right-hand strip sealed with no enemy inside turned cyan within ~0.35 s (`Full` 0 %→5 %, `Score` 0→109). Live test A: a full top-to-bottom cut at x=312 whose two pockets *both* contained a ball at the seal moment filled neither — both stayed black, `Full` stayed `0 %`, and the new divider line was cyan (frames `h_a0_10`→`h_a0_11`→`h_a0_after`). Live test B (earlier session): player drew a full-height vertical trail splitting the field; on reconnection 2704 px of magenta trail → cyan while both halves stayed black, `Full: 0%` unchanged, all 3 ball sprites still present in the sealed halves (`run3` r02→r03). Corroborating written sources: Unity thread ("do a test floodfill to see which side of the new line the enemies are on … do an actual floodfill on the side they are not on"), tsemachh/xonix README ("Any region you wall off that has no enemy in it gets filled in"), 1984-gameplay YouTube description ("traps the enemies in a small space … finish the level by making a single small cut" — enemies survive in trapped pockets), PacXon clone note ("the area that contains a ghost should not be filled"). **Anomaly:** in live test A one ball sprite vanished from the pocket that stayed water (3→2); not reproduced in run3 or in any other seal, possibly a sprite-detection artifact. | Live js-dos runs (frames `e3_A_*`, `h_a0_*`, `k2_*`, `run3`; HUD crops read by vision); web sources above | **Default kept** — spec §2 unchanged: "Enemy inside → region stays open water (the enemy now roams the smaller pocket)". New detail recorded here (spec was silent): the trail itself becomes land on reconnection even when the region is not claimed. Ball-loss anomaly logged as an open playtest question (below). |
| 2. Enemy touches active trail | **Player death** (life lost, active trail discarded, respawn on the border) — not a mere trail break. Ball→player contact also kills. | Live: trail drawn down from the top border at x=312; a ball at (320,72) abutted the magenta trail column while the player's head was 88 px away; the whole field froze ~1.2 s (death pause — balls, warder and trail all static), then the trail pixels disappeared, HUD `Xn` went **3 → 2**, and the cursor reappeared at its spawn cell (312,0)–(319,7) with `Score` and `Full` unchanged (frames `g1_04` → `g1_09` → `g1_11`). Earlier session: same sequence twice more (`run5`: ball contact with the magenta trail → freeze → `Xn` 3→2; `run7`: trail up → freeze → respawn, `Xn` 3→2, `Score` 0→10), plus ball→player corner contact at a trail head killing (`run3` d02→d09, `Xn` 3→2). Corroborated by tsemachh/xonix README ("Don't let an enemy touch you or your unfinished trail") and MobyGames description ("enemies … can kill you on contact"). | Live js-dos runs, HUD digit template-matching / vision over frames `g1_*`, `run3`, `run5`, `run7`; web sources above | **Default kept** — spec §2's death list already includes "an enemy touches the player's active trail"; the "trail break" variant is rejected. |
| 3. Numeric constants | **Lives: confirmed 3** — HUD `Xn: 3` at the start of every fresh game, dropping to 2 (then 1, 0) on each observed death across 5+ runs. **Fill %: `Full: N%` = claimed interior ÷ interior area**, verified numerically (17456/214016 = 8.16 % → displayed `8 %`; a 4×44-cell strip = 5.3 % → displayed `5 %`); best fill ever reached in live play was **8 %**, so the *advance target was never observed* — clone sources disagree (tsemachh 75 %, Retronix 80 %). **Scoring: area-based — consistent with 2 samples (skill-confounded, proportionality not established); constant not pinned** — two live samples: 5.3 % strip → `Score` 0→109 (skill 1) and 8.16 % claimed → `Score` 0→595 (skill 5, ≈1 pt per 29.3 canvas px); the two are not proportional (1.54× area for 5.46× points), and two runs also showed `Score` +10 with `Full: 0%` right after losing a life, so a level/skill multiplier or bonus step likely exists — unconfirmed. (Removed from the previously approved wording: "no points were awarded for unclaimed seals" — neither frozen task-1 report records that observation or names the run it came from, so it cannot be cited here.) **Extra-life milestones: no evidence found.** **Balls/warders:** level 1 runs had exactly **3 balls** plus **1 warder patrolling the border ring** (both frozen reports record a single warder in these runs — the earlier session's says "1 warder", this session's evidence summary says "1 warder per margin" — and no captured frame shows more than one, so the count is stated singular); player speed measured ≈180 screen px/s (90 CGA px/s ≈ 22 cells/s at 4-CGA-px cells), ball speed comparable; per-level ramp never reached — **no evidence**. **Skill:** `Enter skill (1-9) <5>` — difficulty chosen at game start (default 5), i.e. counts/speeds are skill-scaled. **TIME:** counts down from **90** at level start (89 → 84 across a run; one run showed `TIME` back at 90 when `Xn` hit 0). **High scores:** top **15** (`YOUR SCORE IS ONE OF THE BEST 15!`), and game-over with score 0 still prompts `ENTER YOUR NAME:`. | HUD digit template-matching / vision over frames `s_next2`, `e4_afterA` (`Score: 109 Xn: 3 Full: 5% TIME: 89`), `g1_04`, `g1_11`, `k2_00`, `k2_07`, `k3_mon_13`, `run3`/`run5`/`run6`/`run7`; pixel measurements of playfield frames; `XONIX.EXE` strings for skill/hiscore/HUD prompts; MobyGames/Qix/tsemachh/Retronix for the fill threshold. | **Defaults kept**: fill 75 %, 3 lives, area-based scoring × level multiplier. Fill target and the scoring *constant* are not directly observed (75 % rests on Qix + clone corroboration; no source gives the original's points-per-cell). No amendment to §2/§3, so the plan's Global Constraints block needs no change. |

Additional live observations (not §3 flags — recorded so later tasks can match the
original without re-testing):

- **Boot flow:** title screen (`XONIX` logo, `Ver 2.2`, `Made by Ilan Rav`,
  `Filling algorithm by Dani Katz` — matches spec §5's credit line) → Enter →
  `Enter skill (1-9) <5> :` → `HISCORES TABLE` (15 rows) → Enter → gameplay;
  game-over offers `PRESS 'Y' TO RESTART, <CR> TO STOP`.
- **HUD:** bottom bar, white text on black: `Score: N   Xn: N   Full: N%   TIME: N`.
  The original shows **no level number**; spec §5's "score · lives · fill % · level"
  is therefore a deliberate modern deviation (kept as-is; `TIME` not adopted).
- **Geometry:** rendered 640×400 (2× CGA 320×200); playfield grid is **80×48 cells
  of 4 CGA px** (8 screen px per cell), border 2 cells thick, HUD the bottom 2 cell
  rows, interior 76×44 cells (=214016 canvas px, the denominator verified above).
  Player, ball and trail are all exactly 1 cell wide.
- **Sprites:** player = 8×8 ring + 4×4 core whose colours swap with the surface
  (magenta ring/white core on land, white ring/magenta core in water), spawning at
  the top-centre of the top border; ball = 8×8 white ring + 4×4 cyan core, bouncing
  off walls and stopping against active trails (observed); warder = 4×4 cyan square
  with a black outline patrolling the claimed margins — one killed the player while
  it sat idle on the top border (`Xn` 3→2), confirming spec §2's "warders kill on
  contact even on own land".
- **Death sequence:** ~1.2 s freeze of every sprite (used as the death signal),
  active trail discarded, respawn at the spawn cell; crossing your own trail was not
  attempted (movement rules make it impossible — no evidence needed).
- **Input:** synthetic bubbling `KeyboardEvent`s on `canvas.dosbox-canvas` drive the
  emulator reliably (Enter/1/arrows). Whether the original *coasts* after a key
  release could not be settled — two runs disagreed and key-up delivery through the
  injection path may be lossy — so spec §2's "constant speed, 4-direction" wording
  stands, with coast-vs-stop deferred to playtest.

Unresolved items (pre-verification defaults stand; playtest calibrates per spec §10):

- **Fill target %**: never reached in live play (best observed 8 %) — 75 % stands on
  Qix + clone corroboration only.
- **Scoring constant / any 10-point per-life step**: shape consistent with area-based (2 samples, skill-confounded),
  multiplier not pinned; the two live samples disagree on proportionality.
- **Extra-life milestones**: no evidence found — default stands (none in spec).
- **Per-level ball counts/speeds** and the skill 1–9 → difficulty mapping: only
  level 1 (skills 1 and 5) observed — defaults stand.
- **`TIME` reaching 0**, **warder-vs-trail contact**, and the single ball-loss-at-seal
  anomaly: not observed / not reproduced — no evidence found, defaults stand.
- **Live-run caveats:** js-dos freezes the field ~1.2 s on every death (used as the
  death signal), and the browser tab blanked twice mid-session; every screenshot was
  taken from the emulator canvas itself, so no observation above is fabricated from a
  frame we did not capture.

No §2/§3 default was contradicted, so no rule text above was amended.
