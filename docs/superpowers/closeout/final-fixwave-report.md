# Xonix — final fix wave report (2026-11-26)

Scope: the "one final fix wave" after the whole-branch review returned **With fixes**.
Commit: `ecce234` — `fix: final review wave — title reset, keyboard score-loss path, Roomy smoke test, spec §5 gaps, repo hygiene` (10 files, +112/−9), pushed to `origin/main` (was `0073565`).

## Per-item

### Item 1 — F2 stale HUD/stats on title — DONE
`src/core/game.ts:91-101` — `returnToTitle` now resets the whole run using the module's own helpers/constants: `state='title'`, `level=1`, `lives=3`, `score=0`, `grid = createGrid(preset…)`, `ring = buildRing(grid, preset.border)`, `player = createPlayer(grid, preset.border)`, `balls=[]`, `warders=[]`, `pct = landFraction(grid)`. `createGame` untouched; no events emitted (`returnToTitle` pushes nothing).
Test added: `tests/core/game.test.ts:129-155` — starts a game, ticks, dirties score/lives/level/grid/pct, calls `returnToTitle`, asserts `state==='title'`, `score===0`, `lives===3`, `level===1`, `pct === landFraction(fresh.grid)`, grid cells identical to a fresh `createGame` grid, ring equal, balls/warders empty, no events. Existing `returnToTitle` test (`:123`) still passes.

### Item 2 — Important 1a dead focus at game over — DONE
`src/ui/screens.ts:139` — `showOnly('gameover')` moved to immediately after the `final-score` textContent set and before the form/focus logic; the old call after the form block was removed (`:152` area). The field now un-hides before `input.focus()`.

### Item 3 — Important 1b Enter/Space vs focused button — DONE
`src/input/input.ts:23` — first line of the Enter/Space branch: `if ((document.activeElement as HTMLElement | null)?.tagName === 'BUTTON') return;`. Other branches untouched.

### Item 4 — Roomy smoke test — DONE
`tests/core/game.test.ts:157-173` — `createGame(PRESETS.roomy)` → grid 160×92 → `startGame` → `state==='playing'`, `balls.length===8` (verified from `src/core/levels.ts:31-42`: `baseBalls=min(1+1,10)=2`, `areaRatio=(160*92)/(80*46)=4` → `round(2*4)=8`), `warders.length===4`, 10 ticks → no throw, state in `['playing','dying']`, grid dimensions stable.

### Item 5 — sweep a preset switch keeps Settings open — DONE
`src/main.ts:53-56` — deleted `lastState = '';` from `applySettings`. `lastState` still used by the frame loop (`:97`, `:111-114`), so no unused-symbol issue.

### Item 6 — sweep b stored-fullscreen boot reject — DONE
`src/main.ts:25` — `wrap.requestFullscreen().catch(() => applyDisplaySize('fit'))`. Recursion guard confirmed by reading: `applyDisplaySize('fit')` takes the non-`fullscreen` path (`:29-35`) and never re-requests fullscreen; the `fullscreenchange` exit path (`:44-46`) already documents the same guard.

### Item 7 — spec §5 "menu clicks" — DONE
`src/main.ts:89` — `onSettingsApplied: (s) => { audio.handle({ type: 'start' }); applySettings(s); }` (reuses the 660 Hz / 0.05 s tone from `src/audio/audio.ts:52-55`). `screens.ts` handlers not restructured.

### Item 8 — spec §5 levelclear bonus tally — verdict: **SHOWN** (not skipped)
Verification first: `src/core/game.ts:188` computes `const bonus = levelClearBonus(g.lives, g.level)` and `:192` pushes `{ type:'levelclear', level: g.level, bonus }` — the *same* function with the *same* values. `src/main.ts:107` drains events and `:113` calls `screens.sync(game)` in the same frame, with no mutation of `g.lives`/`g.level` in between (the `levelclear` arm of `tick` returns immediately after pushing). Therefore `levelClearBonus(g.lives, g.level)` in the screen arm is exactly derivable and equals the emitted payload.
Change: `src/ui/screens.ts:2` (import `levelClearBonus`), `:129-135` — `clear-summary` now reads `Level N cleared — X% filled! — bonus B`.

### Item 9 — favicon — DONE
`index.html:8` — `<link rel="icon" href="./icons/icon-192.png" />` (kills the `/favicon.ico` 404).

### Item 10 — workbox precache manifest — DONE
`vite.config.ts:23` — `globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}']`. Built `dist/sw.js` precache list now contains `manifest.webmanifest` (10 entries, was 9).

### Item 11 — public repo hygiene — DONE
- `README.md` (new): live URL, controls (arrows/WASD/Enter/P + touch), tech (TS+Vite+vitest), credit "Original Xonix by Ilan Rav & Dani Katz, 1984", dev commands.
- `LICENSE` (new): ISC, Copyright (c) 2026 JEOLeary.
- `.gitignore:5` — appended `.NeuroStrata/plugins/github-cli/copilot-extension.json` (the previously untracked file no longer shows in `git status`).

## Verification outputs

1. **`npm test`** → `Test Files 8 passed (8) / Tests 47 passed (47)` — **47/47** (45 existing + 2 new). Run twice (before and after the final edit pass), both green.
2. **`npm run build`** → green: `tsc --noEmit && vite build`, `✓ built in 203ms`, `PWA v2.0.0 precache 10 entries (27.75 KiB)` (now includes `manifest.webmanifest`).
3. **Browser behavior checks** (local `vite preview` on :4173, driven over CDP; instrumented where noted):

   - **(a) — PASS.** Run played (claim → `SCORE 000100`), 3 warder deaths → GAME OVER: `document.activeElement === 'initials-input'` (auto-focused), `#final-score` = `SCORE 000100 — reached level 1`, form not hidden; typed `wasd1` → `input.value = 'was'` (input `maxlength=3`), visible; Enter saved → score list `WAS  000100  LV 1`.
   - **(b) — PASS.** Two proofs: (i) focused `#btn-settings` + real Enter → `#screen-settings` visible, title hidden, game **not** started (guard returns, native activation runs); (ii) at game over, Tab → `BUTTON:SAVE` focused, Enter with the guard → logged `click:BUTTON` → `submit` (native form submit, no `startGame`) → returned to title with the score saved.
   - **(c) — PASS.** After returning to title from the scored run: `#hud-text = SCORE 000000  LIVES 3  FILL 13%  LV 1` (score 100 → 0, lives 0 → 3, fill back to fresh-grid 13%) — the F2 proof.
   - **(d) — PASS.** SETTINGS → click "Roomy 640×400": `#screen-settings` still visible, `#screen-title` hidden, canvas `640x400`, HUD `FILL 6%` (roomy land fraction), active button = `Roomy 640×400`.
   - **(e) — PASS (instrumented).** `AudioContext.prototype.createOscillator` patched before the click; one setting click recorded `tones: [660]` → the 660 Hz click beep fired.
4. **Commit** — one commit, all touched paths: `ecce234` (`.gitignore`, `index.html`, `src/core/game.ts`, `src/input/input.ts`, `src/main.ts`, `src/ui/screens.ts`, `tests/core/game.test.ts`, `vite.config.ts`, `README.md`, `LICENSE`).
5. **Push + workflow** — pushed `0073565..ecce234 → main`. Run `45767251046` (Deploy to GitHub Pages): test ✓, build ✓, upload-pages-artifact ✓, but `deploy-pages@v4` first failed with GitHub's artifact-API error *"No artifacts named github-pages were found"* (the same glitch failed the previous push's run `45758168328`), and the first `gh run rerun --failed` then failed with *"Multiple artifacts … Artifact count is 2"* from the stale duplicate. Fix: deleted all stale `github-pages` artifacts, re-ran the failed job → **run green** (`✓ main Deploy to GitHub Pages`, job `test-build-deploy` ✓ in 26s). GitHub status: all systems operational; the failures were artifact bookkeeping, not this branch's test/build.
6. **Live URL** — `https://jeoleary.github.io/xonix/` serves the new build:
   - `index.html` head now contains `<link rel="icon" href="./icons/icon-192.png" />` (item 9 live);
   - script/style are the new hashed assets `./assets/index-B9jSEraZ.js`, `./assets/index-CUmCfLnY.css` (identical to local `dist/`);
   - `sw.js` precache list includes `manifest.webmanifest` plus those hashed assets (item 10 live);
   - `GET /icons/icon-192.png` → 200, `GET /manifest.webmanifest` → 200 (`/favicon.ico` still 404s as a bare URL, but browsers no longer request it).

## Notes / issues
- Browser checks required a resilient driver: the harness tab occasionally reset to `about:blank` between calls and one CDP socket dropped mid-run; every check above was re-run in a single continuous call after the reset, and no result was inferred from a failed call.
- `git status` after push shows one untracked tooling file, `.NeuroStrata/session_queries.json`, created by session tooling — not part of the brief, deliberately not committed (the brief only asked for the `copilot-extension.json` ignore line).
- Dependabot reports 1 moderate vulnerability on the default branch (pre-existing, out of scope for this wave).
