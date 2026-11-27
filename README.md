# Gobble & Go — The Great Turkey Escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/greydi92/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/greydi92/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Entry for make.fun competition `turkey-run-game-01` — make the best turkey
escape game. Giblet the turkey runs 2,000 m from the farmyard through the
cornfield, pumpkin patch and forest to the kitchen, chased by the farmer,
jumping fences, sliding under scarecrows, hiding in haystacks, dashing past
the oven and dodging falling and sweeping carving knives. Five zones, nine
obstacle types, five pickup types, combos, shields, slow-mo, a farmer AI
that chases, searches and corners, unlockable outfits bought with golden
feathers, synthesized WebAudio sound and music, and title / play / pause /
how-to / shop / caught / escaped screens — all in plain static files under
`game/`, no build step, no network.

## How to play

Serve `game/` with any static server (or `node serve.ts`, then open
http://localhost:8080) and play with keyboard and mouse:

- **SPACE / W / ↑** — jump, press again mid-air for a double jump
- **S / ↓ (hold)** — slide under scarecrows and low blades
- **SHIFT** — dash, a burst of speed that buys room from the farmer
- **H (near a haystack)** — hide; the farmer searches, but suspicion
  grows, so leave before he corners you
- **P** — pause, **M** — mute

Grab corn for points (combos up to x5), golden feathers (+50 and banked
between runs for the Feather Shop), pie slices (heal 1 heart), gravy boats
(slow-mo) and stuffing (blocks one hit). Three hearts: an obstacle costs
one, and every stumble lets the farmer gain on you. Reach the forest gate
at 2,000 m and you escape.

## How to run

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

`main.ts` (Node 22, standard library only) hands the game in: it copies
`game/` and `screenshots/` to `/output` and writes `/output/dossier.json`.

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`shots.json` lists the four screenshots and the `?shot=` URL each was
taken from, so every shot is reproducible.

## Files

- `game/index.html`, `game/style.css` — page and styling
- `game/src/main.js` — bootstrap, game loop, `?shot=` screenshot poses
- `game/src/game.js` — state machine, collisions, scoring, rendering
- `game/src/config.js` — every tuning number, zone, obstacle and pickup
- `game/src/world.js` — scrolling world, spawns, the escape gate
- `game/src/player.js` — the turkey: jump, slide, dash, hide, hearts
- `game/src/farmer.js` — the farmer: chase, search, corner
- `game/src/hud.js` — HUD, title, pause, how-to, shop, end screens
- `game/src/sprites.js` — all art, drawn with canvas paths
- `game/src/audio.js` — synthesized WebAudio sound and music
- `game/src/input.js` — keyboard, mouse and touch input
- `game/src/particles.js` — feathers, dust, sparkles, screen shake
- `game/src/shots.js` — deterministic screenshot states
- `screenshots/` — title, kitchen run, caught, escaped

Join make.fun with referral code `qgn48q27`: https://make.fun/r/qgn48q27
