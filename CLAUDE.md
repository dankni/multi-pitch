# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`multi-pitch.com` — a static, dependency-free (no framework, no bundler) site cataloguing traditional multi-pitch rock climbs. Plain ES modules in the browser, plain HTML/CSS, built by a handful of Node scripts and deployed as a folder of files to S3 + CloudFront. There is no build step in the usual sense: the `website/` directory *is* the deployable artifact.

[README.md](README.md) holds the editorial rules (content style, image sizes/naming, lightbox markup, CMS mode). Read it before writing climb/blog content or adding images — those conventions are not repeated here. AI / Claude should never write content. It can suggest corrections to spelling etc.

**This includes UI copy in the apps.** Never write help text, instructions, steps, tips or explanatory paragraphs into a page or settings panel. A control gets a label of a few words and nothing more; if something seems to need explaining, say so in your reply and leave the wording to the user.

Keep code comments very succinct, and only write one where the code isn't obvious, or where something could be ambiguous or surprising.

## Commands

```bash
npm start                 # serve ./website on localhost:9000
npm run generate-all      # run all five generators (do this before testing)
npm run generate-climbs   # data/*.json -> website/climbs/<slug>/index.html (+ rewrites homepage <noscript>)
npm run generate-sitemap  # -> website/sitemap.xml
npm run generate-blog     # blog/content.json + each content.html -> blog index.htmls
npm run generate-content  # /climbing-grades/content.json -> that page's index.html
npm run generate-webp     # a .webp beside every .jpg/.png under website/img (only new or changed ones)

npm test                  # all Cypress specs, headless (auto-starts the static server)
npm run test:training     # one spec; same pattern for any other:
npx cypress run --headless --spec cypress/e2e/weather.cy.js
npx cypress open          # interactive

npm run deploy-test       # generate-webp, then sync to the multi-pitch-test.co.uk bucket
```

Lambdas are separate npm projects with their own `node_modules`:

```bash
cd lambda-node/get-weather && npm ci && npm test   # mocha against saved fixtures
REAL_RUN=1 npx mocha test/getWeatherOM.realRun.js  # hits the live Open-Meteo API
./deploy.sh                                        # test + prune dev deps + zip + update lambda (aws profile: multipitch)
```

Testing notes:
- `npm run generate-all` must have run first, or every spec touching `/climbs/...` fails — those pages are gitignored build output.
- `prod-live-check.cy.js` and `weather-prod-compare.cy.js` visit **live production** (`www.multi-pitch.com`), so `npm test` needs internet and can fail for reasons unrelated to your change.
- [cypress.config.js](cypress.config.js) starts/stops `npx serve` itself on port 9100 via `before:run`/`after:run`, so `npm start` on 9000 can stay up alongside it.

## Generated vs. authored files

Never hand-edit generated output — the next generator run discards it.

| Path | Status |
|---|---|
| `website/climbs/**`, `website/sitemap.xml`, `website/img/**/*.webp` | **generated + gitignored** — rebuilt by CI on every deploy |
| `website/blog/*/index.html`, `website/blog/index.html`, `website/climbing-grades/index.html` | **generated but committed** — regenerate and commit the result |
| `website/index.html` | authored, **except** its `<noscript>` block, which `generate-climbs` overwrites |
| `website/blog/*/content.html`, `*/content.json`, `website/data/**` | authored — the real sources |

Images: commit only the `.jpg`/`.png`. [generateWebP.js](generateWebP.js) runs the `cwebp` binary bundled in `webp-converter` (quality 75, method 6, one process per CPU) and skips any `.webp` newer than its source, so local re-runs are quick, while CI starts with none and converts the lot. Any failure exits non-zero and fails `generate-all`. Pages offer the `.webp` as a `<picture>` `<source>`, and a browser that picks a missing one shows a broken image rather than falling back to the `.jpg`.

To change a climb page you edit `website/data/climbs/<id>.json` (and `website/data/data.json` for the summary fields), or [climbCard.js](website/components/climbCard.js) for the layout, then re-run `generate-climbs`.

## Data model

Two tiers, deliberately:

- **`website/data/data.json`** — a `lastUpdate` stamp plus a `climbs[]` array of *summary* records (id, names, grades, `geoLocation`, `tileImage`, `status`, per-climb `lastUpdate`). Only `status === 'publish'` entries are generated and listed. This is the single file the homepage loads.
- **`website/data/climbs/<id>.json`** — the *full* record, `{ climbData, topoData }`. `climbData` holds the prose (`intro`, `approach`, `pitchInfo`), attribute booleans (`tidal`, `abseil`, `polished`, `loose`…), `references`, `guideBooks`. `topoData` holds the canvas drawing instructions: source `image`, a `route` polyline of `[x,y]` pixel pairs in the original image's coordinate space, `pitches[]` (belay/label positions, grade, height) and `decent[]` (abseil/walk-off paths). Fetched lazily, only when a climb is opened.

Ids are the join key and appear in URLs, localStorage keys and the lambda feeds. Page slugs come from `returnClimbURL(routeName, cliff)` in [convertNameToURL.js](website/js/modules/convertNameToURL.js) — the one source of truth for the `<route>-on-<cliff>/` folder name; both the climb generator and the sitemap import it.

## Frontend architecture

**localStorage-first loading** ([main.js](website/js/main.js) is the hub, ~1500 lines, everything hangs off `window.*`). This is the core design decision and the source of most of the complexity:

1. On load, if `climbsData` is in localStorage, render from it immediately and fetch `data.json` in the background.
2. Compare the server's `lastUpdate` against the cached one; only if newer, replace the cache and re-run `init()`.
3. Individual climbs cache under `climb<id>`, with the same date-comparison refresh (see the climb-detail and `tryLoadTopo` paths).

Consequence: **a stale cache masks changes during development.** If an edit to a JSON file doesn't show up, bump `lastUpdate` or clear localStorage. README.md links a flow diagram of this.

Other pieces:
- **Topo rendering** — `<canvas>` drawn from `topoData` by the `initTopo`/`draw`/`updateScale` functions at the bottom of `main.js`, scaled against `devicePixelRatio`. Six checkboxes (`#c1`–`#c6`) toggle info box / route line / belays / abseils / pitch labels / alternatives. [topo-editor/](website/topo-editor/) is an in-browser tool for producing those coordinate arrays.
- **Weather & tides** — fetched client-side from `https://s3-eu-west-1.amazonaws.com/multi-pitch.data/climbing-data-extended-{weather,tides}.json` by [getWeather.js](website/js/modules/getWeather.js) and [loadTide.js](website/js/modules/loadTide.js). Those files are produced by the lambdas below, not by this repo's build.
- **Theme** — [theme-init.js](website/js/theme-init.js) is loaded *synchronously and render-blocking* in every `<head>` on purpose, so dark-mode users get no light flash; `main.js` is a deferred module and cannot do this. Precedence: localStorage choice > OS preference > light.
- **CMS mode** — appending `?god-mode` to a climb URL loads [cms-mode.js](website/js/cms-mode.js), which makes the page editable and writes the result back to localStorage for manual copy-paste into the repo. [cms-mapping.js](website/js/modules/cms-mapping.js) maps DOM elements to JSON fields; adding a field to a climb means updating that mapping too.

## Page composition

The generators are string templating, not a template engine. Every page is `head.html + nav.html + <body content> + footer.html`, with [head.html](website/components/head.html) placeholders substituted per page: `{{title}}`, `{{cannonical}}` (sic), `{{description}}`, `{{heroJpg}}`, `{{ogType}}`, `{{id}}`, plus the `<!-- Scripts -->` and `<!-- Structured Data -->` comment markers, which get replaced wholesale. Read a fresh copy of `head.html` per page — the placeholders are consumed by `.replace()`.

`generate-climbs` also computes "nearby climbs" with a haversine distance over every published climb (40km cutoff) and emits schema.org `BreadcrumbList` + `Place` JSON-LD.

## Lambdas

Two independent Node 22 functions in [lambda-node/](lambda-node/), each with its own package.json, mocha tests against committed fixtures, and a `deploy.sh` that refuses to deploy if tests fail:

- **`get-weather`** (`lambdaGetWeather`) — daily; one Open-Meteo request per published climb (no API key); writes `climbing-data-extended-weather.json`. Its [README](lambda-node/get-weather/README.md) documents the output schema and the DarkSky → OpenWeatherMap → Open-Meteo migration history — read it before touching the feed shape, which the frontend depends on.
- **`get-tides`** (`lambdaGetTides`) — daily; tidal climbs only; writes `climbing-data-extended-tides.json`.

Both write to the `multi-pitch.data` S3 bucket and are triggered by EventBridge schedules configured in AWS, not in this repo.

## Training apps

[website/training/](website/training/) holds self-contained browser apps (rings, timer, gilford, endurance, loft, boulder, trad, nohangs, gaps, and the hidden dansloft) plus an overview and a progress page. They are **not** part of the main site's architecture: classic non-module `<script>` tags, shared globals from [common/functions.js](website/training/common/functions.js) (wake lock, full screen, the service worker, `speak()` via `speechSynthesis`, the two-tap `confirmReset()` guard, the two overlays — info behind the i, settings behind the cog, both `<aside class="overlay">` opened with `openOverlay()`/`closeOverlay()` — and the session furniture — `session` with `keepSession()`/`restoreSession()`/`saveToLog()`, `setStar()`, `drawSessionLog(view)`), shared `common/style.css`, and their own localStorage keys for session logs. Each app describes itself in a global `app` (`logKey`, `currentKey`, …). The four that log what was climbed (gilford, boulder, trad, dansloft) share the whole session flow in [common/log.js](website/training/common/log.js) + [common/log.css](website/training/common/log.css), and boulder and trad the grade ladder in [common/ladder.js](website/training/common/ladder.js). The two that run to a clock after a count in (rings, nohangs) share start/pause/reset/save in [common/workout.js](website/training/common/workout.js) + [common/workout.css](website/training/common/workout.css), and only describe their own timeline. gaps is a canvas game driven by a Tindeq Progressor over Web Bluetooth ([gaps/progressor.js](website/training/gaps/progressor.js)), or by holding the screen; its loop steps on `Date.now()`, so `cy.tick()` drives it in tests. Gym, Outside, Gilford, the lap timer and tabata can drive a Bangle.js 2: [common/bangle.js](website/training/common/bangle.js) is the Bluetooth link, [common/watch.js](website/training/common/watch.js) the connect switch and bar and what each app gives it (`app.watch`), and [watch/mplog.app.js](website/training/watch/mplog.app.js) the one watch app, Climb Log, which the phone uploads whenever its source changes and labels with the app version, shown in its menu. dansloft (Dans Loft, a home wall) is hidden on purpose: no card, no sitemap entry, noindex. Its card appears once "Dans Loft" is typed in *Add a hidden App* under the Apps page's cog (`hiddenApps` in `training/index.html`, saved under `trainingHiddenApps`). Its routes are [common/dansloft-routes.js](website/training/common/dansloft-routes.js); `?edit` on its url places each route's start, path and end on the floor plan (shown as dots running start to end) and copies the result for pasting back there.

Conventions: no inline handlers — markup names a global function with `data-action` / `data-change` / `data-input` and `functions.js` calls it with the element; icon-only controls are `<button class="icon-button">`; what is on screen follows `body[data-state]` in CSS rather than `style.display`, with `hidden` for anything simply on or off; theme colours are `light-dark()` variables at the top of `common/style.css`, so dark mode follows the OS with no script and the switch only adds `.light`/`.dark`. They keep all data on-device, and they genuinely work offline: [training/sw.js](website/training/sw.js) precaches the whole suite and serves it cache-first, and one [manifest.json](website/training/manifest.json) scoped to `/training/` installs the whole suite as a single homescreen app. Every page, apps and the two plain pages alike, loads `functions.js`, which has the full screen button and registers the service worker. **Bump `CACHE_VERSION` in `sw.js` whenever you change an app**, or installed copies keep serving the old files: the number after the dot for each change (`v179.1`, `v179.2`), the one before it only for a big release (`v180.0`). It doubles as the app version shown in the apps. Hind is served from `common/font/` rather than Google Fonts for the same reason.

The look is written down: [TRAINING-STYLE-GUIDE.md](TRAINING-STYLE-GUIDE.md) for the reasoning, `/training/style-guide/` for a live page of every component. Build a new app from those parts rather than from whatever the last app did, and check there before adding a rule to an app's own stylesheet. Every toast the apps show is listed in [TRAINING-TOASTS.md](TRAINING-TOASTS.md) — add, change or remove a row whenever you touch a `toast()` call.

Their sitemap entries are hardcoded in [generateSiteMap.js](generateSiteMap.js) (`trainingPages`) since there is no JSON source — bump the date there when you change one.

## Deploy

CircleCI ([.circleci/config.yml](.circleci/config.yml)): install → `npm run generate-all` → Cypress → both lambda test suites → cache `website/`. The **deploy job only runs on tags matching `/^v.*/`**, and syncs `website/` to `s3://www.multi-pitch.com --delete`, writes `release.txt`, invalidates CloudFront (`E1WJUCQRX8PD1F`) and sets a long `max-age` on images. Pushing to master alone does not deploy.

## Gotchas

- `package.json` is `"type": "module"` and the generators use ESM, but everything in [bulk-edit-node-scripts/](bulk-edit-node-scripts/) is CommonJS `require()` leftovers that will throw if run as-is — dormant one-off helpers, not maintained entry points.
- Weather and tide rendering defends against stale feeds (see the 36-hour check in `loadTide.js`) — keep that habit; the feeds have frozen in production before.
