# The Great War — 1914

A grand strategy game of the First World War that runs in the browser. Lead one of 11 nations from the July Crisis of 1914 through to the armistice.

**To play:** open `index.html` in any modern browser. It is a single self-contained file with no install and no server needed.

## Features

- **Campaign map:** about 230 provinces from Ireland to Baghdad. Each turn is one month and all nations move at once.
- **War plans:** Schlieffen or the Eastern deployment for Germany, Plan XVII for France, the BEF decision for Britain, and more.
- **The trenches:** the war of movement in 1914 hardens into entrenched fronts. Fortresses, terrain, local garrisons and reserves all add to defence, and supply lines and encirclement matter.
- **Economy:** split industry between munitions, research and the civilian economy, and build factories, railways and fortifications. Conscription, propaganda and war bonds are available as policies.
- **Research:** about 30 technologies, including gas, creeping barrages, infiltration tactics, tanks, aircraft and convoys.
- **Diplomacy:** court the neutrals with relations and secret treaties, sign trade deals, and offer or demand separate peace.
- **Blockade and U-boats:** naval control of the Atlantic, Baltic and Black Sea decides trade, food and amphibious landings.
- **Home front:** war support falls with casualties, hunger and occupation. Strikes, mutinies and revolution can follow.
- **Historical events:** the Goeben, Lusitania, Gallipoli, the Zimmermann Telegram, the Russian revolutions, the 1918 flu and others.

**Controls:** click to select. With an army selected, right-click a province, or press **M**, to march or attack. Press **Enter** to end the turn. On touch screens, tap **Move / Attack** in the Army tab, then tap a province.

The game autosaves each turn to your browser's local storage.

## Development

The source is in `src/`:

| File | Contents |
|---|---|
| `data.js` | Nations, provinces, sea zones, technologies, deployments, plans |
| `map.js` | Procedural map generation (noisy Voronoi from city coordinates) and rendering |
| `engine.js` | Simulation: combat, supply, economy, trade, diplomacy, events, AI |
| `ui.js` | Map interaction, panels, reports and the start screen |
| `style.css`, `body.html` | Layout and styling |

Run `python3 build.py` to rebuild `index.html` from `src/`.

The scripts in `tools/` are Playwright test harnesses. They run headless AI-vs-AI campaigns (`multi.py`, `sim.py`) and take UI screenshots (`ui.py`, `ui2.py`). They expect Chrome at `/usr/bin/google-chrome`.
