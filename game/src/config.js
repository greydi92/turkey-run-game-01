// config.js — every tuning number, zone, obstacle, pickup and unlock for
// Gobble & Go: The Great Turkey Escape. One place to tune the whole game.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const GROUND_Y = 600;
export const PLAYER_X = 300;
export const GRAVITY = 2600;
export const JUMP_VELOCITY = 980;
export const DOUBLE_JUMP_VELOCITY = 860;
export const DASH_SPEED_BONUS = 340;
export const DASH_DURATION = 0.32;
export const DASH_COOLDOWN = 1.6;
export const SLIDE_DURATION = 0.55;
export const HIDE_MAX_TIME = 4.0;
export const PLAYER_MAX_HEARTS = 3;
export const ESCAPE_DISTANCE_M = 2000;
export const BASE_SPEED = 300; // px per second at zone 1
export const MAX_SPEED = 560;
export const METERS_PER_PX = 0.02; // 50 px of scroll = 1 metre

// How far behind the turkey the farmer starts, in metres. When the gap
// reaches zero the farmer grabs the turkey and the run ends.
export const FARMER_START_GAP_M = 14;
export const FARMER_CATCH_GAP_M = 0.6;
export const FARMER_MAX_GAP_M = 24;
// Rubber-banding: on a clean run the farmer drifts back toward this gap
// so he stays visible at the left edge instead of vanishing off-screen.
// Dashes and good hides still buy real room; it just decays over time.
export const FARMER_TARGET_GAP_M = 5;
export const FARMER_RUBBER_SLOPE = 0.018; // speed-factor change per metre off target
export const FARMER_STUMBLE_PENALTY_M = 2.6;
export const FARMER_SEARCH_GAIN_M = 1.6; // metres the turkey gains per second hidden
export const FARMER_SEARCH_SUSPICION_RATE = 0.34; // suspicion per second while hidden
export const FARMER_CORNER_SPEED_M = 5.5; // metres per second the gap closes when cornering

// Pickups and scoring.
export const SCORE_PER_METRE = 1;
export const NEAR_MISS_BONUS = 25; // skimming an obstacle's top while airborne
export const CORN_SCORE = 10;
export const FEATHER_SCORE = 50;
export const PIE_SCORE = 25;
export const COMBO_WINDOW_S = 2.5;
export const COMBO_MAX = 5;
export const SLOWMO_DURATION_S = 3.0;
export const SHIELD_MAX_HITS = 1;

// The five stages of the escape, farmyard to kitchen. Each zone is 400 m.
// Difficulty rises: faster scroll, tighter spawns, nastier obstacle sets.
// R2 tuning (2026-11-27): spawn spacing in zones 2-4 was widened ~12%
// after the spawn-coordinate fix — the fix doubled the obstacle rate the
// zones were originally tuned against, so the late zones were unreachable
// in play-tests (best autopilot run: 1089 m, never past zone 2).
export const ZONES = [
  {
    id: 'farmyard',
    index: 0,
    name: 'The Farmyard',
    subtitle: 'Dawn breaks. The farmer is coming. RUN!',
    startM: 0,
    endM: 400,
    speed: 300,
    spawnEveryPx: 460,
    spawnJitterPx: 180,
    skyTop: '#f7b733',
    skyMid: '#fc9a4a',
    skyBottom: '#f78c5c',
    ground: '#8a5a2b',
    groundDark: '#6e4520',
    grass: '#7fae4c',
    accent: '#d94f30',
    obstacles: ['fence', 'haybale', 'pumpkin', 'mud'],
    pickups: ['corn', 'corn', 'corn', 'feather'],
    props: ['barn', 'fencepost', 'haystack', 'tree', 'sunflower'],
    music: { root: 220, mode: 'major', bpm: 132 },
    tip: 'SPACE to jump — W or UP works too.',
  },
  {
    id: 'cornfield',
    index: 1,
    name: 'The Cornfield',
    subtitle: 'Tall corn, tall trouble. Stay low, stay fast.',
    startM: 400,
    endM: 800,
    speed: 340,
    spawnEveryPx: 420,
    spawnJitterPx: 170,
    skyTop: '#f2a541',
    skyMid: '#e8803a',
    skyBottom: '#d96b3f',
    ground: '#7a4a22',
    groundDark: '#5d3718',
    grass: '#c9a227',
    accent: '#e8b93c',
    obstacles: ['fence', 'haybale', 'pumpkin', 'mud', 'scarecrow', 'knifefall'],
    pickups: ['corn', 'corn', 'feather', 'pie'],
    props: ['cornstalk', 'scarecrowprop', 'haystack', 'tree', 'pumpkinpatch'],
    music: { root: 196, mode: 'major', bpm: 140 },
    tip: 'HOLD S / DOWN to slide under scarecrows.',
  },
  {
    id: 'pumpkinpatch',
    index: 2,
    name: 'The Pumpkin Patch',
    subtitle: 'Rolling pumpkins! Jump them or be squashed.',
    startM: 800,
    endM: 1200,
    speed: 385,
    spawnEveryPx: 425,
    spawnJitterPx: 160,
    skyTop: '#e07b39',
    skyMid: '#c95f2e',
    skyBottom: '#a84a28',
    ground: '#6b3d1c',
    groundDark: '#4f2c14',
    grass: '#b8742e',
    accent: '#ff7b2f',
    obstacles: ['fence', 'pumpkin', 'rollingpumpkin', 'mud', 'knifefall', 'haybale'],
    pickups: ['corn', 'feather', 'pie', 'gravy'],
    props: ['pumpkinpatch', 'tree', 'haystack', 'fencepost', 'lantern'],
    music: { root: 185, mode: 'minor', bpm: 148 },
    tip: 'Rolling pumpkins speed up — jump EARLY.',
  },
  {
    id: 'forest',
    index: 3,
    name: 'The Whispering Woods',
    subtitle: 'Dark trees, darker knives. Almost free…',
    startM: 1200,
    endM: 1600,
    speed: 430,
    spawnEveryPx: 395,
    spawnJitterPx: 150,
    skyTop: '#5d6b8a',
    skyMid: '#7a5a6e',
    skyBottom: '#8a4a3a',
    ground: '#4a3520',
    groundDark: '#332412',
    grass: '#4e7a3a',
    accent: '#9dbb6a',
    obstacles: ['fence', 'rollingpumpkin', 'knifefall', 'knifefall', 'scarecrow', 'mud', 'haybale'],
    pickups: ['corn', 'feather', 'pie', 'stuffing'],
    props: ['tree', 'tree', 'mushroom', 'lantern', 'stump'],
    music: { root: 165, mode: 'minor', bpm: 156 },
    tip: 'HIDE in haystacks with H — but not for long!',
  },
  {
    id: 'kitchen',
    index: 4,
    name: 'The Kitchen!',
    subtitle: 'The OVEN! The CARVING KNIFE! One last sprint!',
    startM: 1600,
    endM: 2000,
    speed: 480,
    spawnEveryPx: 370,
    spawnJitterPx: 140,
    skyTop: '#c94f2e',
    skyMid: '#a83a24',
    skyBottom: '#7c2a1c',
    ground: '#5a2e1e',
    groundDark: '#40200f',
    grass: '#c98a3a',
    accent: '#ffd23e',
    obstacles: ['oven', 'knifesweep', 'knifefall', 'rollingpumpkin', 'fence', 'mud'],
    pickups: ['corn', 'feather', 'gravy', 'stuffing', 'pie'],
    props: ['ovenprop', 'pot', 'lantern', 'table', 'window'],
    music: { root: 220, mode: 'minor', bpm: 168 },
    tip: 'DASH with SHIFT to burst past the oven heat!',
  },
];

// Every obstacle type: size, how the turkey beats it, and what it costs.
export const OBSTACLES = {
  fence: {
    label: 'Fence',
    w: 26, h: 74,
    beats: 'jump',
    damage: 1,
    color: '#8a5a2b',
    score: 15,
  },
  haybale: {
    label: 'Hay Bale',
    w: 74, h: 58,
    beats: 'jump',
    damage: 1,
    color: '#d9a441',
    score: 15,
  },
  pumpkin: {
    label: 'Pumpkin',
    w: 58, h: 52,
    beats: 'jump',
    damage: 1,
    color: '#e86a1c',
    score: 15,
  },
  mud: {
    label: 'Mud Puddle',
    w: 120, h: 16,
    beats: 'avoid or slow',
    damage: 0,
    slows: true,
    color: '#5a3a1e',
    score: 5,
  },
  scarecrow: {
    label: 'Scarecrow',
    w: 40, h: 110,
    beats: 'slide',
    damage: 1,
    color: '#7a5a30',
    score: 25,
  },
  knifefall: {
    label: 'Falling Carving Knife',
    w: 20, h: 96,
    beats: 'keep moving',
    damage: 1,
    telegraphed: true,
    color: '#c0c8d0',
    score: 30,
  },
  rollingpumpkin: {
    label: 'Rolling Pumpkin',
    w: 62, h: 62,
    beats: 'jump',
    damage: 1,
    moves: true,
    color: '#e86a1c',
    score: 25,
  },
  oven: {
    label: 'The Oven',
    w: 130, h: 150,
    beats: 'jump or dash past',
    damage: 1,
    hot: true,
    color: '#3a3a44',
    score: 40,
  },
  knifesweep: {
    label: 'Sweeping Carving Knife',
    w: 150, h: 26,
    beats: 'time the jump',
    damage: 1,
    sweeps: true,
    color: '#c0c8d0',
    score: 40,
  },
};

// Every pickup type: what it gives and how it looks.
export const PICKUPS = {
  corn: {
    label: 'Corn Cob',
    w: 34, h: 46,
    score: CORN_SCORE,
    color: '#f2c531',
    bob: true,
  },
  feather: {
    label: 'Golden Feather',
    w: 30, h: 44,
    score: FEATHER_SCORE,
    color: '#ffd23e',
    bob: true,
    banks: true, // golden feathers are banked between runs for unlocks
  },
  pie: {
    label: 'Pumpkin Pie Slice',
    w: 40, h: 34,
    score: PIE_SCORE,
    heals: 1,
    color: '#e8803a',
    bob: true,
  },
  gravy: {
    label: 'Gravy Boat',
    w: 44, h: 30,
    score: 20,
    slowmo: SLOWMO_DURATION_S,
    color: '#b5762e',
    bob: true,
  },
  stuffing: {
    label: 'Stuffing Shield',
    w: 40, h: 40,
    score: 20,
    shield: true,
    color: '#8a5a2b',
    bob: true,
  },
};

// Cosmetic turkey outfits bought with banked golden feathers. Purely fun,
// plus a tiny perk each so a returning player feels the progression.
export const UNLOCKS = [
  { id: 'pilgrim', name: 'Pilgrim Hat', cost: 3, perk: '+5% score', scoreBonus: 0.05, color: '#3a3a3a', desc: 'A tall black hat. Very historical. Very fast.' },
  { id: 'chef', name: 'Chef Hat', cost: 5, perk: '+1 heart every 3rd run', scoreBonus: 0, color: '#f2f2f2', desc: 'If you cannot beat the cook, dress like one.' },
  { id: 'cape', name: 'Autumn Cape', cost: 8, perk: '+10% score', scoreBonus: 0.10, color: '#c0392b', desc: 'A cape the colour of falling leaves.' },
  { id: 'crown', name: 'Corn Crown', cost: 12, perk: '+15% score', scoreBonus: 0.15, color: '#f2c531', desc: 'King of the cornfield. The farmer bows to no one.' },
  { id: 'ninja', name: 'Shadow Bandana', cost: 15, perk: 'Hide 50% longer', scoreBonus: 0, color: '#2c3e50', desc: 'A turkey nobody sees is a turkey nobody roasts.' },
  { id: 'gold', name: 'Golden Gobbler', cost: 25, perk: '+25% score', scoreBonus: 0.25, color: '#ffd23e', desc: 'Solid gold. The oven cannot afford you.' },
];

export const STORAGE_KEY = 'gobble-and-go-save-v1';

// The turkey's own stats, shown on the title screen so the player knows
// what they are running with.
export const TURKEY = {
  name: 'Giblet',
  species: 'Wild Turkey (Meleagris gallopavo)',
  home: 'Maple Hollow Farm',
  dream: 'To see December.',
  waddle: 'Very distinguished.',
};

export function zoneForDistance(m) {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    if (m >= ZONES[i].startM) return ZONES[i];
  }
  return ZONES[0];
}

export function zoneProgress(m) {
  const zone = zoneForDistance(m);
  const span = zone.endM - zone.startM;
  return { zone, within: Math.min(1, Math.max(0, (m - zone.startM) / span)) };
}
