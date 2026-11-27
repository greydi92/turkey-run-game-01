// Gobble & Go — The Great Turkey Escape. A turkey escape game: Giblet the
// turkey runs 2,000 m from the farmyard through the cornfield, pumpkin
// patch and forest to the kitchen, chased by the farmer, jumping fences,
// sliding under scarecrows, hiding in haystacks, dashing past the oven and
// dodging falling carving knives. Five zones, nine obstacle types, five
// pickup types, combos, shields, slow-mo, a farmer AI that chases,
// searches and corners, unlockable outfits bought with golden feathers,
// synthesized WebAudio sound and music, and title / play / pause / how-to /
// shop / caught / escaped screens — all in plain static files under game/.
//
// This program (Node 22, standard library only) hands the game in: it
// copies game/ and screenshots/ from beside this file to /output and
// writes /output/dossier.json with the vendored make.fun library.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48
// MiB of game files, in all, or a path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
