# River Manager: A Digital Twin Lite of Xiaolangdi Water-Sediment Regulation

A browser-based teaching simulation of the water-sediment regulation run at the Xiaolangdi Dam on the Yellow River. The player chooses a peak release, its duration and the water kept for supply, and sees the effect on flood safety, reservoir health, water supply and ecology. The model is simplified and is not a forecast. Course project for Development and Management of the Yellow River Basin, Autumn 2026, Group 2.

Live site: https://amiasmo.github.io/xiaolangdi-twin/

## Run locally

Browsers block `fetch()` of JSON files from `file://`, so serve the folder:

    python3 -m http.server 8000

then open http://localhost:8000/. Add `?skipintro=1` to skip the videos, and `?lang=zh` to open in Chinese.

## Deploy to GitHub Pages

1. Put all files in a repository with `index.html` at the root.
2. Settings, Pages, Source: deploy from the `main` branch, folder `/ (root)`.
3. Open `https://<user>.github.io/<repo>/` after a minute. Keep each video under GitHub's 100 MB file limit.

## Folder layout

    index.html          page structure, About and Method text (English and Chinese)
    css/                style.css (layout), scene.css (dam scene), i18n.css (language switch)
    js/intro.js         landing page, two videos, start page
    js/model.js         the simulation, runScenario()
    js/game.js          Challenge rules and scoring, GAME_CONFIG
    js/app.js           interface, Sandbox, Replay, run history, debrief, tooltips
    js/schematic.js     animated dam, reservoir and river scene
    js/i18n.js          English / Chinese switch
    data/               rounds.json, events.json, timeline.json, i18n_zh.json
    subs/               subtitle files for the two videos
    assets/             videos, start wallpaper, infographic, logo

## Where to change things

- Model: `runScenario()` in `js/model.js`. Keep the inputs and returned fields, because `reasons()` and `suggestions()` in `js/app.js` read them (for example `overBankfull`, `overdraw`, `sedStored`, `deltaFlow`). If a field changes, update those two functions and the parameter table in the About and Method tab.
- Scoring weights, penalties and status thresholds: `GAME_CONFIG` in `js/game.js`.
- Slider ranges and defaults: `CONFIG` in `js/app.js`. Glossary definitions: `GLOSSARY` at the top of the same file.
- Challenge rounds and policy cards: `data/rounds.json`. Real events: `data/events.json`. History entries: `data/timeline.json`.
- Chinese text: the dictionary and rules in `js/i18n.js`, and `data/i18n_zh.json` for the data files. Text without a translation stays in English.
- Gate opening (peak divided by 5,000), sediment tint and delta size in the scene are visual rules only, set in `js/app.js` and `js/schematic.js`.

## Notes

- Chart.js 4.4.1 and the two fonts load from CDNs, so the charts need an internet connection. Tables and scores work without it.
- Replay values are real measurements at the Lijin gauge (Wang et al., 2017, Table 1), not the dam release. Everything else in the model is a teaching assumption; see the About and Method tab.
