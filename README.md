# Terraguess — Geography Challenge

A geography quiz built around three game modes: name every country from memory, find countries on a
real interactive world map, and work through 20 regions one at a time.

Stack: React 19, TypeScript, Vite 6, Tailwind CSS 4, d3-geo + d3-zoom, TopoJSON (Natural Earth).

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm run verify:geo # validate the country/region/map datasets
```

> This machine had no Node.js on `PATH`, so a portable Node 22 runtime lives in `.tools/` (git
> ignored). To use it from Git Bash:
>
> ```bash
> export PATH="$PWD/.tools/node-v22.14.0-win-x64:$PATH"
> npm run dev
> ```

## Project structure

```
src/
  data/               editable geography data (single source of truth)
    countries.rows.json   195 countries: name, ISO2, ISO3, continent, region, aliases, anchor
    regions.json          20 regions, 6 display groups, cross-regional members
    worldAtlasMap.json    Natural Earth feature name -> ISO3, plus territory ignore list
    countries.ts          typed loader + lookups + integrity assertions
    regions.ts            region membership helpers (precomputed)
  lib/                geo projection/loading, answer matching, scoring, storage, stats, sound
  game/               useNameGame + useFindGame engines (pure game logic, no UI)
  components/
    map/              WorldMap (interactive SVG map) and MapPreview (static)
    game/             shared game chrome: headers, results, boards
    ui.tsx, Icon.tsx, AppShell.tsx, SettingsModal.tsx
  state/              Settings, Stats and WorldGeo providers (context)
  pages/              Home, Name All Countries, Find the Country, Regions, 404
scripts/verify-geo.mjs
```

### Data and conventions

- **195 countries**: 193 UN member states plus the Holy See and Palestine. Taiwan, Kosovo,
  Western Sahara, Greenland and dependent territories are not playable.
- `src/data/countries.rows.json` is the only country list. Isotope codes are ISO 3166-1 alpha-2 and
  alpha-3; aliases are semicolon separated; an optional `[lat, lng]` anchor makes a microstate
  clickable.
- Regions are UN-style subregions. The Middle East is a cross-regional grouping that overlaps
  Western Asia and Northern Africa on purpose; edit `regions.json` to change any of it.
- Map borders come from Natural Earth 1:50m via the `world-atlas` npm package
  (`public/geo/countries-50m.json`, ~740 KB, fetched once at runtime).
- `npm run verify:geo` asserts unique codes, valid regions, region membership, name/alias
  collisions, one map feature per country, and that every country is either a polygon or has an
  anchor.

### Map behaviour

`WorldMap` renders precomputed SVG paths (d3-geo Natural Earth projection) inside a d3-zoom
viewport. Zoom/pan is imperative (no React re-render of the 194 paths on pointer move), while labels
and microstate markers live in a constant-size overlay. Countries under ~4 projected px², island
nations with anchors, and Tuvalu (missing from the 1:50m dataset) get clickable markers. Rounds
refit the map to the chosen scope; the hint zooms to the country's region.

### Storage

`src/lib/storage.ts` defines a `KeyValueStore` interface with a localStorage implementation, used by
settings and statistics. Swap the driver to move progress to accounts/cloud without touching game
logic. Stats track games, correct/incorrect answers, best percentage, fastest timed round, countries
ever identified, per-mode and per-region completion, and the 12 most recent rounds.

## Known limitations

- Borders reflect Natural Earth geometry; disputed areas are drawn but not playable.
- Microstate clicking depends on markers; their polygon is sub-pixel at world zoom.
- The timer counts up for name rounds; "fastest" statistics only consider rounds played with the
  timer enabled.
- Statistics and settings live in this browser only (no accounts).
- The map hint is hidden in region rounds because the map is already framed on the region.
- Sound effects are synthesised with Web Audio; there are no audio assets.
- English country names only.

## Next phase ideas

1. Accounts + cloud stats, then daily challenges and leaderboards.
2. Flag, capital, population and country-outline modes on the same country dataset.
3. Custom quizzes and difficulty tiers driven by per-country accuracy history.
4. Physical geography layers (rivers, mountain ranges, seas) on the same map engine.
