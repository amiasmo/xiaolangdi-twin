# River Manager: A Digital Twin Lite of Xiaolangdi Water-Sediment Regulation

## Run locally
Browsers block `fetch()` of JSON from `file://`, so serve the folder:
    python3 -m http.server 8000
then open http://localhost:8000/ . Use `?skipintro=1` to bypass the intro while developing.
Put your videos at `assets/video1_history.mp4` and `assets/video2_intro.mp4` and replace the sample `.vtt` files.

## Deploy to GitHub Pages
1. Push all files to a GitHub repository (index.html at the root).
2. Repository Settings -> Pages -> Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Open https://<user>.github.io/<repo>/ after a minute. Keep video files under GitHub's 100 MB file limit.

## Notes
- Chart.js is loaded from the cdnjs CDN (see the last `<script>` in index.html), so the run charts need an internet connection. The tables and scores work without it.
- Glossary tooltips: edit `GLOSSARY` at the top of `js/app.js`.

## Where real content goes
- `js/model.js`: replace the body of `runScenario()` (keep the inputs and return fields).
- `data/*.json`: all values are SAMPLE placeholders (events, rounds, timeline).
- `subs/*.vtt`, `[SITE TITLE]` in index.html, and the About text.
- Scoring weights and penalties: `GAME_CONFIG` in js/game.js. Slider ranges: `CONFIG` in js/app.js.
- Result explanations and suggestions: `reasons()` and `suggestions()` in `js/app.js` read the fields that `runScenario()` returns (for example `overBankfull`, `overdraw`, `sedStored`, `deltaFlow`). If you replace the model or rename a return field, update those two functions and the parameter table in the About and Method tab.
- Scene mapping (gate opening = peak / 5,000, sediment tint, delta size): `drawSchematic()` calls in `js/app.js` and `js/schematic.js`. These are visual rules only.
- Status thresholds (Critical / Needs attention / Healthy) come from `GAME_CONFIG.outcome` in `js/game.js`.
