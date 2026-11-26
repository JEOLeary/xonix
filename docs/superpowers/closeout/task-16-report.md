# Task 16 — Acceptance pass & close-out

**Date:** 2026-11-25 · **Repo:** JEOLeary/xonix, branch `main`
**Start HEAD:** 6488409 (tree clean) → **End HEAD:** 0073565 (tree clean, pushed)
**Verdict:** **DONE_WITH_CONCERNS** — gates green, 6/7 acceptance criteria fully met + 1 partial,
4 minor findings (1 documented in spec §13, 3 reported only), 6 user-handoff items.
Live site: https://jeoleary.github.io/xonix/ (HTTP/2 200).

---

## Step 1 — Automated gates ✅

| Gate | Result |
|---|---|
| `npm test` | **45/45 passed**, 8 files, 1.15 s |
| `npm run build` | `tsc --noEmit` + `vite build` clean; PWA `generateSW`, precache 9 entries |
| git | tracked tree clean at start and end; only the docs commit below was added |
| CI (Task 15 workflow) | `.github/workflows/deploy.yml` = `npm ci → npm test → npm run build → deploy Pages`; latest runs **success**: `45752383148` (feat: crisp DOM HUD, 33 s), `45419982507` (28 s) |
| Pages live | `curl -sI https://jeoleary.github.io/xonix/` → **HTTP/2 200** |

## Step 2 — Spec §11 acceptance criteria

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Both presets + all display sizes + persistence | **PASS** | Classic 320×200 and Roomy 640×400 buffers; Fit/1×/2×/3×/Fullscreen each verified for **both** presets (canvas CSS 608×380 / 320×200 / 640×400 / 960×600 for Classic; 608×380 / 640×400 / 1280×800 / 1920×1200 for Roomy; fullscreenElement `#canvas-wrap` entered, CSS `min(100vw,160vh)` sizing applies, same 1.6 aspect both presets). Preset switch restarts at title with HUD reset (Classic `FILL 13%` → Roomy `FILL 6%`). `xonix.settings` survived `reload()` (`{"displaySize":"fit","playfield":"roomy","sound":true}` → restored). |
| 2 | Fidelity flags documented in spec addendum | **PASS** | spec §13 exists (304 lines): all 3 flags resolved — (1) enemy in sealed region → region stays open water, **default kept**; (2) enemy touches trail → **player death**, default kept; (3) numeric constants — 3 lives confirmed, fill/scoring constants recorded with explicit "defaults stand" list. No §2/§3 rule text needed amending (original never contradicted a default). |
| 3 | vitest green in CI, covering core logic for both presets | **PARTIAL** | CI green ✓ (workflow includes `npm test`). But only `levels.ts` tuning is parameterized over both presets (`for (const p of [PRESETS.classic, PRESETS.roomy])`); `game.test.ts` uses `PRESETS.classic` only, and fill/player/collision/enemies/scoring run on small synthetic grids (7×7, 10×8). Core algorithms are dimension-agnostic, so risk is low — **finding F4**, not fixed during acceptance. |
| 4 | PWA installable + offline | **PASS** (device installs → handoff) | `manifest.webmanifest`: name/short_name `Xonix`, `start_url "./"`, `display standalone`, icons `icon-192.png` + `icon-512.png`; SW registered and **controlling**. With `Network.emulateNetworkConditions{offline:true}` → `reload()` served the shell from precache, title rendered, **START → playing** offline. Real install prompts / iOS A2HS = user handoff. |
| 5 | Top-10 + 3-letter initials | **PASS** | Played to game over: `GAME OVER / SCORE 001316 — reached level 1 / NEW HIGH SCORE — initials:` → input `ACE` (maxlength 3) → SAVE → title list `ACE 001316 LV 1` → `reload()` → still there (`xonix.scores` JSON with `date`). |
| 6 | Push auto-deploys; public URL live | **PASS** | workflow on push to `main`; site 200. (This task's docs commit 0073565 was pushed and re-triggered the workflow.) |
| 7 | Manual checklist (spec §9) | **PASS** (see caveats) | desktop keyboard (arrows steer, WASD mapped, P/Esc pause, Enter/Space start, tap-to-start all fire) · mobile proxy (390×844 emulation: D-pad buttons **56×56 px**, pause **44×44 px** ≥44 ✓, synthetic swipe steers) · pause on P/Esc/II-button with state frozen ✓ · blur auto-pause (`visibilitychange` → PAUSED; stays paused on return-to-visible, resume by P/tap) ✓ · audio unlock (spy `AudioContext` created by a real activation-bearing click → `state === "running"`, tones scheduled) ✓ · settings persist ✓ · **storage-blocked fallback** ✓ · **offline** ✓ · both presets × all display sizes ✓ |

**Storage-fallback test (spec §9 / brief):** via CDP `Page.addScriptToEvaluateOnNewDocument` →
`Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})` then reload:
`localStorage` genuinely throws on the page, title renders, **START → playing**, D-pad input and
pause all work, no uncaught errors. Removing the script restored normal storage. (Per-domain
latches R15d mean scores/settings degrade independently — neither key was readable in this run,
as expected.)

## Step 3 — Play end-to-end (browser, live URL)

- **START → claim:** down/right/up cut → `SCORE 000000 → 000096`, `FILL 13% → 15%`, cyan region
  visible → `task-16-claim.png`; capture-flash frame (white seal flash, +48 white px) →
  `task-16-capture-flash.png`.
- **Deaths:** lives 3 → 2 → 1 → 0 by balls/warder contact while drawing and sweeping;
  trail discarded on death, respawn on border, ~1 s death cross (renderer draws a 5-cell
  white/magenta cross for `DIE_FREEZE=60` ticks) → `task-16-death-explosion.png`,
  `task-16-death.png`.
- **Game over → initials → SAVE → reload** (criterion 5) → `task-16-gameover.png`,
  `task-16-initials-saved.png`.
- **Pause:** P / Esc / on-screen II all toggle; HUD frozen while paused; verified in both presets.
- **Roomy play:** fresh Roomy game, cut sealed `SCORE 000000 → 000168`, `FILL 6% → 7%`,
  pause/resume works → `task-16-roomy-play.png`.
- **Rules vs spec §2:** trail auto-draws, reconnect seals, enemy-free region claims (score scales
  with area), enemy-present regions stay water (not exercised live this pass — covered by
  `fill.test.ts`), warders kill on land, balls kill in water, 3 lives, 75 % target shown on title,
  points per claimed cell × level. **No rule behaved contrary to spec §2 → no rule amendment.**

## R17 — crisp DOM HUD (user directive)

DOM overlay `#hud` with `container-type: inline-size`, `#hud-text` font-size
`calc(2.5 * 1cqw)` → vector text sized to canvas width, no bitmap scaling.

| Size | Canvas | HUD font | Vision read |
|---|---|---|---|
| Fit (1400×900 viewport) | 1400×875 | 35 px | sharp — `task-16-hud-fit.png` |
| 1× | 320×200 | 8 px | legible, crisp at native size — `task-16-hud-1x-play.png` |
| 2× | 640×400 | 16 px | `task-16-hud-2x.png` |
| 3× | 960×600 | 24 px | "sharp and crisply rendered, no pixelation" — `task-16-hud-3x.png` |
| Fullscreen | `#canvas-wrap` fs | 19.5 px (2.5 cqw) | "sharp, crisp, fully legible" — `task-16-hud-fullscreen.png` |
| Roomy fullscreen | 640×400 | 22.8 px | `task-16-roomy-fullscreen.png` |

Playfield stays nearest-neighbor pixel-scaled; HUD stays vector at every size. **User will re-test on their own display** (handoff item 6).

## Findings (reported, not fixed — no code changed during acceptance)

- **F1 — FILL % counts the border (spec/implementation divergence).** Web `Full:` uses
  `landFraction` = land ÷ all cells → **13 %** Classic / **6.7 %** Roomy at start, where spec §13
  records the original's interior-only formula (`Full: 0%` at start); level-1 75 % target ≈ 71 %
  of the interior (Classic) / 73 % (Roomy). Not in the deferred ledger. **Amended spec §13 with a
  one-line note (commit 0073565, `docs:`)** — §2 rule text untouched, no code changed.
- **F2 — stale HUD on the title screen.** After game over + SAVE the title screen still shows the
  finished game's HUD (`SCORE 001316  LIVES 0  FILL 49%`) above the menu until a new game starts
  (`task-16-initials-saved.png`). Cosmetic; not ledgered.
- **F3 — idle spawn death (feel, spec-consistent).** With zero input, a life was lost ~1–3 s after
  START on two occasions: the spawn cell is `ring[0]`, which warders patrol, and `SPAWN_GRACE` is
  only 60 ticks (1 s). Spec §2 says warders kill on own land, so this is faithful — but it is a
  sharp first-second experience. Calibration call for the user (handoff 5), not a spec violation.
- **F4 — test-preset coverage.** See criterion 3: spec §9/§11.3 says the suite "runs against both
  playfield presets"; in practice only `levels.ts` is preset-parameterized. Low risk (core logic is
  grid-size-agnostic and green), but the literal claim is not met.

**Not exercised in the harness** (honest limits): level-clear screen (fill never reached 75 % in
agent play — covered by `game.test.ts` transition + countdown tests); game-over `OK` button path
(SAVE path used); real device-tab auto-pause (faked `document.hidden` + `visibilitychange`
instead); actual audible output; real install prompts.

**Ledgered deferred minors deliberately not re-reported:** inert canvas-text lines, wrap 3px gap,
fallback 16px font, post-Esc settings staleness, fullscreenchange UI-highlight staleness,
score-filter level/date validation, loadScores no sort/cap, **preset-switch closes settings**
(hit twice while testing — ledgered), autoUpdate next-navigation, gen-icons not npm-wired,
mutable action tags, no timeout-minutes, **favicon 404** (seen in `performance` entries),
d-pad/II visible beside overlays, gameover focus() pre-showOnly, audio no re-resume path.

## USER-HANDOFF items (6) — cannot be verified by the agent

1. **iPhone / iOS Safari A2HS:** open https://jeoleary.github.io/xonix/ → Share → **Add to Home
   Screen** → launch the icon → confirm it opens standalone (no browser chrome) and **plays with
   Airplane Mode on**. (Also note iOS may evict storage in standalone mode — game degrades to
   in-memory, per spec §10.)
2. **Android Chrome install:** open the URL → omnibox **Install** prompt / ⋮ → *Add to Home
   screen* → launch → confirm offline play after one load.
3. **Real-device touch feel:** swipe-to-steer and D-pad latency on actual hardware (agent used
   synthetic TouchEvents + 390×844 device emulation; sizes verified ≥44 px, feel not).
4. **Audible sound:** listen for capture blip (pitch rises with chunk size), death zap, level-clear
   arpeggio, menu clicks; confirm volume is comfortable. Agent verified `AudioContext.state ===
   "running"` after a real gesture and oscillator scheduling — not listening.
5. **Calibration knobs / feel:** fill target 75 % (and the FILL % border baseline, F1), ball/warder
   speeds and counts, sound volume — plus decide on **F3** (warder can kill an idle player at
   spawn within ~1–3 s of START).
6. **R17 HUD crispness re-test on your display** at Fit / 1× / 2× / Fullscreen (and after a window
   resize) — agent verified vector DOM text at all sizes in screenshots; you directed this check.

## NeuroStrata close-out

Task `xonix-n5ko` was `in_progress` / assigned to `this-session` (claim valid, no re-claim needed)
→ **completed** via `neurostrata_task_complete` with the required memory extraction
(`extracted_memory_ids: ["a54e3acd-1b2d-4acc-bdd2-1165933c4244"]`, learning-hook errors `[]`);
it no longer appears in `neurostrata_task_list`. Remaining open task `xonix-68lt`
("Ingest codebase AST…") is unrelated to this run.

## Files

- **Modified & committed:** `docs/superpowers/specs/2026-11-23-xonix-design.md` (§13 one-line
  note) → commit **0073565** `docs: spec §13 T16 note — web FILL % counts border (13%/6.7% start
  vs original 0%)`, pushed to `origin/main`.
- **Evidence (gitignored, `.superpowers/sdd/2026-11-23-xonix/`):** `task-16-claim.png`,
  `task-16-capture-flash.png`, `task-16-death.png`, `task-16-death-explosion.png`,
  `task-16-gameover.png`, `task-16-initials-saved.png`, `task-16-hud-{fit,1x,2x,3x,1x-play,fullscreen}.png`,
  `task-16-roomy-fullscreen.png`, `task-16-roomy-play.png`, `task-16-mobile.png`.
- **No source, test, plan or config file was changed.**
