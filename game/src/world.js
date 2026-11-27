// world.js — the scrolling world: zones, obstacle and pickup spawns,
// background scenery, the escape gate, and collision tests. The world is
// generated ahead of the turkey as it runs, from a seeded RNG so a given
// seed always lays out the same farm.

import { CANVAS_W, CANVAS_H, GROUND_Y, ZONES, OBSTACLES, PICKUPS, zoneForDistance, METERS_PER_PX } from './config.js';
import { makeRng, clamp } from './random.js';
import * as Sprites from './sprites.js';

export const SPAWN_AHEAD_PX = CANVAS_W + 500;
export const DESPAWN_BEHIND_PX = -400;

// A haystack the turkey can hide in. Hiding only works while the turkey
// overlaps one and holds H; the farmer then searches instead of chasing.
export class Haystack {
  constructor(x, w) {
    this.x = x;
    this.w = w;
    this.y = GROUND_Y;
    this.rustle = 0;
  }
}

export class Obstacle {
  constructor(type, x, seed) {
    const def = OBSTACLES[type];
    this.type = type;
    this.def = def;
    this.x = x;
    this.w = def.w;
    this.h = def.h;
    this.y = GROUND_Y - def.h;
    this.passed = false; // scored when the turkey clears it
    this.hit = false;
    this.seed = seed;
    this.rng = makeRng(seed);
    // Falling knives start in the sky and drop on a timer.
    this.state = 'idle';
    this.stateT = 0;
    this.fallDelay = 0.55 + this.rng.range(0, 0.5);
    this.fallY = GROUND_Y - def.h;
    this.knifeY = -160;
    // Rolling pumpkins travel toward the turkey.
    this.rollSpeed = type === 'rollingpumpkin' ? 60 + this.rng.range(0, 60) : 0;
    this.rollPhase = 0;
    // Sweeping knives swing on a timer.
    this.sweepPhase = this.rng.range(0, Math.PI * 2);
    this.sweepSpeed = 1.6 + this.rng.range(0, 0.8);
    this.warned = false;
    // Ovens breathe heat.
    this.heat = 0.4 + this.rng.range(0, 0.4);
  }

  get top() {
    if (this.type === 'knifefall') return this.knifeY;
    return this.y;
  }

  get bottom() {
    if (this.type === 'knifefall') return this.knifeY + this.h;
    return GROUND_Y;
  }

  // The solid box the turkey can collide with, in world coordinates.
  box() {
    if (this.type === 'knifefall') {
      if (this.state !== 'landed' && this.state !== 'falling') return null;
      return { x: this.x, y: this.knifeY, w: this.w, h: this.h };
    }
    if (this.type === 'knifesweep') {
      // The blade hangs from its pivot and swings up and down, so the
      // solid box follows the blade itself: high blade, run underneath;
      // low blade, jump over it. (It used to sit at ground level no
      // matter where the blade was, so the swing was pure decoration
      // and the turkey was hit by thin air — or jumped clean through
      // the visible blade.)
      const swing = Math.sin(this.sweepPhase) * 46;
      return { x: this.x + 39, y: GROUND_Y - 90 + swing - 11, w: 134, h: 22 };
    }
    if (this.type === 'mud') {
      return { x: this.x, y: GROUND_Y - 10, w: this.w, h: 14 };
    }
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt, speed, slowmo) {
    const s = slowmo ? 0.45 : 1;
    // Rolling pumpkins travel toward the turkey on top of the scroll.
    this.rollPhase += dt * 6 * s;
    if (this.type === 'rollingpumpkin') {
      this.x -= this.rollSpeed * dt * s;
    }
    if (this.type === 'knifesweep') {
      this.sweepPhase += dt * this.sweepSpeed * s;
    }
    if (this.type === 'knifefall') {
      // The fall timer only runs once the knife is on screen. It used
      // to start at spawn, thousands of pixels off-screen, so every
      // knife had already landed and vanished before the turkey could
      // ever see it — the whole falling-knife danger was a no-op.
      if (this.x > CANVAS_W + 50) return;
      this.stateT += dt * s;
      if (this.state === 'idle' && this.stateT >= this.fallDelay) {
        this.state = 'falling';
        this.stateT = 0;
      } else if (this.state === 'falling') {
        this.knifeY += 1500 * dt * s;
        if (this.knifeY >= this.fallY) {
          this.knifeY = this.fallY;
          this.state = 'landed';
          this.stateT = 0;
        }
      } else if (this.state === 'landed' && this.stateT > 1.1) {
        this.state = 'gone';
      }
    }
    if (this.type === 'oven') {
      this.heat = 0.5 + Math.sin(this.stateT * 2.2 + this.seed) * 0.35;
      this.stateT += dt;
    }
  }
}

export class Pickup {
  constructor(type, x, y, seed) {
    const def = PICKUPS[type];
    this.type = type;
    this.def = def;
    this.x = x;
    this.y = y;
    this.w = def.w;
    this.h = def.h;
    this.taken = false;
    this.seed = seed;
    this.phase = makeRng(seed).range(0, Math.PI * 2);
  }

  box() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }
}

export class Scenery {
  constructor(kind, x, scale, seed) {
    this.kind = kind;
    this.x = x;
    this.scale = scale;
    this.seed = seed;
    this.parallax = kind === 'cloud' ? 0.15 : kind === 'hill' ? 0.35 : 0.7;
  }
}

export class World {
  constructor(seed = 20261127) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.scrollPx = 0; // total world scrolled, in pixels
    this.distanceM = 0;
    this.obstacles = [];
    this.pickups = [];
    this.haystacks = [];
    this.scenery = [];
    this.nextSpawnX = 900;
    this.nextSceneryX = 0;
    this.gateX = null; // world x of the freedom gate, set near the end
    this.gateSpawned = false;
    this._seedScenery();
  }

  get zone() {
    return zoneForDistance(this.distanceM);
  }

  _seedScenery() {
    for (let x = -100; x < SPAWN_AHEAD_PX + 2000; x += 260) {
      this._spawnScenery(x + this.rng.range(-80, 80));
    }
  }

  _spawnScenery(x) {
    const zone = this.zone;
    const kind = this.rng.pick(zone.props);
    const scale = this.rng.range(0.7, 1.3);
    this.scenery.push(new Scenery(kind, x, scale, this.rng.int(1, 99999)));
    if (this.rng.chance(0.3)) {
      this.scenery.push(new Scenery('cloud', x + this.rng.range(0, 200), this.rng.range(0.6, 1.4), this.rng.int(1, 99999)));
    }
    if (this.rng.chance(0.4)) {
      this.scenery.push(new Scenery('hill', x + this.rng.range(0, 300), this.rng.range(0.8, 1.6), this.rng.int(1, 99999)));
    }
  }

  // Lay out one obstacle (plus its pickups) at world x. Patterns keep the
  // game fair: never two unjumpable obstacles back to back, and a pickup
  // trail usually marks the safe line.
  _spawnPattern(x) {
    const zone = this.zone;
    // Early grace: for the first 550 m only easy, jumpable obstacles
    // appear — no scarecrows, no falling knives, no rolling pumpkins.
    // A new player learns jump first and meets the slide/knife tricks
    // only after the first zone tip has had time to land.
    const easyOnly = this.distanceM < 550;
    const pool = easyOnly ? ['fence', 'haybale', 'pumpkin', 'mud'] : zone.obstacles;
    const roll = this.rng.next();
    const type = this.rng.pick(pool);
    const seed = this.rng.int(1, 999999);

    if (roll < 0.26) {
      // A haystack to hide in, with a corn trail leading to it.
      const hx = x + this.rng.range(0, 120);
      this.haystacks.push(new Haystack(hx, 104));
      for (let i = 0; i < 3; i++) {
        this.pickups.push(new Pickup('corn', hx - 90 + i * 45, GROUND_Y - 60, seed + i));
      }
      return;
    }
    if (roll < 0.40) {
      // A double jump: two obstacles with a gap, corn arcing over them.
      const gap = 150 + this.rng.range(0, 80);
      const t2 = this.rng.pick(pool.filter((t) => t !== 'knifefall' && t !== 'oven'));
      this.obstacles.push(new Obstacle(type, x, seed));
      this.obstacles.push(new Obstacle(t2, x + gap, seed + 1));
      for (let i = 0; i < 5; i++) {
        this.pickups.push(new Pickup('corn', x + 20 + i * 42, GROUND_Y - 130 - Math.sin((i / 4) * Math.PI) * 60, seed + 10 + i));
      }
      return;
    }
    if (roll < 0.52 && zone.obstacles.includes('knifefall') && !easyOnly) {
      // Knife rain: three falling knives with a safe gap in the middle.
      const gapAt = this.rng.int(0, 2);
      for (let i = 0; i < 3; i++) {
        if (i === gapAt) continue;
        this.obstacles.push(new Obstacle('knifefall', x + i * 90, seed + i));
      }
      this.pickups.push(new Pickup('corn', x + gapAt * 90, GROUND_Y - 60, seed + 50));
      return;
    }

    this.obstacles.push(new Obstacle(type, x, seed));
    // A pickup trail: corn low, or a feather high for a jump reward.
    const prize = this.rng.pick(zone.pickups);
    if (this.rng.chance(0.6)) {
      const high = this.rng.chance(0.45);
      const py = high ? GROUND_Y - 170 : GROUND_Y - 60;
      const px = x + (type === 'fence' || type === 'haybale' ? 40 : 90);
      this.pickups.push(new Pickup(prize, px, py, seed + 77));
      if (this.rng.chance(0.5)) {
        this.pickups.push(new Pickup('corn', px + 46, py, seed + 78));
      }
    }
  }

  update(dt, speed, slowmo) {
    const scroll = speed * dt * (slowmo ? 0.45 : 1);
    this.scrollPx += scroll;
    this.distanceM = this.scrollPx * METERS_PER_PX;

    // Spawn ahead as the turkey advances.
    const aheadX = this.scrollPx + SPAWN_AHEAD_PX;
    while (this.nextSpawnX < aheadX) {
      const zone = this.zone;
      // The freedom gate appears at 1950 m; nothing spawns past it.
      if (this.distanceM > 1920 && !this.gateSpawned) {
        // Screen space: the gate scrolls in from just off the right edge
        // and the turkey runs into it ~20 m later, at the 2,000 m line.
        // (It used to be placed at scrollPx + width, which put it tens
        // of thousands of pixels off-screen, so it never appeared.)
        this.gateX = CANVAS_W + 60;
        this.gateSpawned = true;
      }
      if (this.gateSpawned) {
        this.nextSpawnX = aheadX + 1;
        break;
      }
      // Spawn positions are screen space: nextSpawnX is a world
      // coordinate (scroll + offset ahead), so subtract the scroll or
      // every pattern lands twice as far down the run as intended and
      // the kitchen's ovens and sweeping knives never arrive at all.
      this._spawnPattern(this.nextSpawnX - this.scrollPx);
      this.nextSpawnX += zone.spawnEveryPx + this.rng.range(-zone.spawnJitterPx, zone.spawnJitterPx);
    }

    // Scenery keeps pace further out (spawned just off the right edge).
    while (this.nextSceneryX < this.scrollPx + SPAWN_AHEAD_PX + 1200) {
      this._spawnScenery(CANVAS_W + 100 + this.rng.range(0, 200));
      this.nextSceneryX += 240 + this.rng.range(-60, 90);
    }

    // Move everything with the world (rolling pumpkins add their own roll).
    for (const o of this.obstacles) o.update(dt, speed, slowmo);
    for (const o of this.obstacles) o.x -= scroll;
    for (const p of this.pickups) p.x -= scroll;
    for (const h of this.haystacks) h.x -= scroll;
    for (const s of this.scenery) s.x -= scroll * s.parallax;
    if (this.gateX !== null) this.gateX -= scroll;

    // Cull what fell behind (all entity x values are screen-space here).
    this.obstacles = this.obstacles.filter((o) => o.x > -600);
    this.pickups = this.pickups.filter((p) => p.x > -200 && !p.taken);
    this.haystacks = this.haystacks.filter((h) => h.x + h.w > -200);
    this.scenery = this.scenery.filter((s) => s.x > -600);
  }

  // Screen-space helpers: the world scrolls, so an entity's screen x is
  // its world x minus scroll, except scenery which parallax-drifts itself.
  screenX(worldX) {
    return worldX - this.scrollPx;
  }

  reset(seed) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.scrollPx = 0;
    this.distanceM = 0;
    this.obstacles = [];
    this.pickups = [];
    this.haystacks = [];
    this.scenery = [];
    this.nextSpawnX = 900;
    this.nextSceneryX = 0;
    this.gateX = null;
    this.gateSpawned = false;
    this._seedScenery();
  }
}

// AABB overlap, with a forgiving shrink so near-misses feel fair.
export function boxesOverlap(a, b, shrink = 0.82) {
  const aw = a.w * shrink;
  const ah = a.h * shrink;
  const bw = b.w * shrink;
  const bh = b.h * shrink;
  const ax = a.x + (a.w - aw) / 2;
  const ay = a.y + (a.h - ah) / 2;
  const bx = b.x + (b.w - bw) / 2;
  const by = b.y + (b.h - bh) / 2;
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function drawBackground(ctx, zone, time, distanceM) {
  // Sky gradient.
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, zone.skyTop);
  grad.addColorStop(0.55, zone.skyMid);
  grad.addColorStop(1, zone.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Sun or moon, low and warm.
  const sunX = CANVAS_W - 180;
  const sunY = 110;
  ctx.fillStyle = 'rgba(255, 236, 180, 0.9)';
  drawSun(ctx, sunX, sunY, 46);
  ctx.fillStyle = 'rgba(255, 236, 180, 0.25)';
  drawSun(ctx, sunX, sunY, 62);

  // Distant hills.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y - 40);
  for (let x = 0; x <= CANVAS_W; x += 40) {
    const hill = Math.sin((x + distanceM * 8) * 0.004) * 26;
    ctx.lineTo(x, GROUND_Y - 60 + hill);
  }
  ctx.lineTo(CANVAS_W, GROUND_Y);
  ctx.lineTo(0, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // Ground.
  ctx.fillStyle = zone.ground;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  ctx.fillStyle = zone.groundDark;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, 10);
  // Grass tufts along the top of the ground.
  ctx.fillStyle = zone.grass;
  for (let x = 0; x < CANVAS_W; x += 46) {
    const wob = Math.sin((x + distanceM * 30) * 0.05) * 3;
    ctx.beginPath();
    ctx.moveTo(x + wob, GROUND_Y + 2);
    ctx.lineTo(x + 6 + wob, GROUND_Y - 12);
    ctx.lineTo(x + 12 + wob, GROUND_Y + 2);
    ctx.closePath();
    ctx.fill();
  }
  // Speed lines on the ground: dashes that rush past.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let x = 0; x < CANVAS_W; x += 130) {
    const dashX = ((x - distanceM * 500) % (CANVAS_W + 130) + CANVAS_W + 130) % (CANVAS_W + 130) - 65;
    ctx.fillRect(dashX, GROUND_Y + 34, 46, 4);
    ctx.fillRect(dashX + 30, GROUND_Y + 64, 30, 4);
  }
}

function drawSun(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawSceneryItem(ctx, item, groundY) {
  const s = item.scale;
  switch (item.kind) {
    case 'barn': Sprites.drawBarn(ctx, item.x, groundY, s * 1.1); break;
    case 'tree': Sprites.drawTree(ctx, item.x, groundY, s); break;
    case 'cornstalk': Sprites.drawCornstalk(ctx, item.x, groundY, s); break;
    case 'haystack': Sprites.drawHaystack(ctx, item.x, groundY, s * 0.9); break;
    case 'fencepost': Sprites.drawFence(ctx, item.x, groundY, s); break;
    case 'pumpkinpatch':
      Sprites.drawPumpkin(ctx, item.x - 30, groundY, s * 0.7, { face: false });
      Sprites.drawPumpkin(ctx, item.x + 26, groundY, s * 0.85, { face: true });
      break;
    case 'mushroom': Sprites.drawMushroom(ctx, item.x, groundY, s); break;
    case 'lantern': Sprites.drawLantern(ctx, item.x, groundY - 60, s); break;
    case 'sunflower': Sprites.drawSunflower(ctx, item.x, groundY, s); break;
    case 'stump':
      ctx.fillStyle = '#5a3a1e';
      ctx.fillRect(item.x - 22 * s, groundY - 34 * s, 44 * s, 34 * s);
      ctx.fillStyle = '#8a5a2b';
      ctx.beginPath();
      ctx.ellipse(item.x, groundY - 34 * s, 22 * s, 7 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'ovenprop': Sprites.drawOven(ctx, item.x, groundY, s * 0.7, { heat: 0.4 }); break;
    case 'pot': Sprites.drawPot(ctx, item.x, groundY, s); break;
    case 'table': Sprites.drawKitchenTable(ctx, item.x, groundY, s); break;
    case 'window':
      ctx.fillStyle = '#3a3a44';
      ctx.fillRect(item.x - 34 * s, groundY - 190 * s, 68 * s, 90 * s);
      ctx.fillStyle = '#ffd98a';
      ctx.fillRect(item.x - 28 * s, groundY - 184 * s, 56 * s, 78 * s);
      ctx.fillStyle = '#3a3a44';
      ctx.fillRect(item.x - 3 * s, groundY - 184 * s, 6 * s, 78 * s);
      ctx.fillRect(item.x - 28 * s, groundY - 148 * s, 56 * s, 6 * s);
      break;
    case 'scarecrowprop': Sprites.drawScarecrow(ctx, item.x, groundY, s); break;
    case 'cloud':
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.ellipse(item.x, 90 + (item.seed % 80), 60 * s, 20 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(item.x + 40 * s, 96 + (item.seed % 80), 44 * s, 16 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'hill':
      ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
      ctx.beginPath();
      ctx.ellipse(item.x, groundY - 10, 160 * s, 60 * s, 0, Math.PI, 0);
      ctx.fill();
      break;
    default:
      Sprites.drawTree(ctx, item.x, groundY, s);
      break;
  }
}
