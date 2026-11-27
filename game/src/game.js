// game.js — the game itself: state machine (title / playing / paused /
// caught / escaped / howto / shop), collisions, scoring, zone changes,
// saving best runs and banked feathers, and the render pipeline.

import {
  CANVAS_W, CANVAS_H, GROUND_Y, PLAYER_X, ZONES, UNLOCKS, STORAGE_KEY,
  ESCAPE_DISTANCE_M, FARMER_CATCH_GAP_M, NEAR_MISS_BONUS, PLAYER_MAX_HEARTS,
  zoneForDistance,
} from './config.js';
import { clamp, formatScore } from './random.js';
import { World, boxesOverlap, drawBackground, drawSceneryItem } from './world.js';
import { Player } from './player.js';
import { Farmer, FARMER_STATE } from './farmer.js';
import { Particles } from './particles.js';
import { Hud } from './hud.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import * as Sprites from './sprites.js';

export const GAME_STATE = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  CAUGHT: 'caught',
  ESCAPED: 'escaped',
  HOWTO: 'howto',
  SHOP: 'shop',
};

export function loadSave() {
  const empty = { bestScore: 0, bestDistance: 0, feathers: 0, unlocks: [], equipped: null, runs: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return { ...empty, ...parsed };
  } catch (err) {
    // Storage blocked (private mode, hosted sandbox): fall back to the
    // session-scoped save so feathers and outfits earned in this session
    // still feel rewarding until the tab closes.
    return sessionSaveFallback ? { ...empty, ...sessionSaveFallback } : empty;
  }
}

export function saveSave(save) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    return true;
  } catch (err) {
    // Storage blocked: keep the save in memory for this session.
    sessionSaveFallback = { ...save };
    return false;
  }
}

// In-memory save used only when localStorage is unavailable. Never
// written to disk; it lives as long as the page does.
let sessionSaveFallback = null;

// True when localStorage actually accepts writes in this browser.
export function storageAvailable() {
  try {
    window.localStorage.setItem('__gobble_probe__', '1');
    window.localStorage.removeItem('__gobble_probe__');
    return true;
  } catch (err) {
    return false;
  }
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.world = new World(20261127);
    this.player = new Player();
    this.farmer = new Farmer();
    this.particles = new Particles();
    this.hud = new Hud();
    this.state = GAME_STATE.TITLE;
    this.time = 0;
    this.runTime = 0;
    this.score = 0;
    this.bestScore = 0;
    this.bestDistance = 0;
    this.save = loadSave();
    this.bestScore = this.save.bestScore;
    this.bestDistance = this.save.bestDistance;
    this.savePersistent = storageAvailable();
    this.stats = this._freshStats();
    this.seed = 20261127;
    this.lastZoneIndex = 0;
    this.titleRunT = 0;
    this.endT = 0;
    this.knifeWarnT = 0;
    this._applyEquipped();
  }

  _freshStats() {
    return { corn: 0, feathers: 0, cleared: 0, nearMisses: 0, bestCombo: 0, hits: 0, hides: 0, dashes: 0 };
  }

  _applyEquipped() {
    const equipped = UNLOCKS.find((u) => u.id === this.save.equipped);
    this.player.outfit = equipped ? equipped.id : null;
    this.player.scoreBonus = equipped ? equipped.scoreBonus : 0;
    this.player.hideMaxTime = this.save.equipped === 'ninja' ? 6.0 : 4.0;
    // The Chef Hat's perk was advertised in the shop but never applied:
    // every 3rd run starts with 4 hearts instead of 3. (Runs are
    // counted when they end, so the run about to start is save.runs + 1.)
    this.player.maxHearts = this.save.equipped === 'chef' && (this.save.runs + 1) % 3 === 0
      ? PLAYER_MAX_HEARTS + 1
      : PLAYER_MAX_HEARTS;
    this.player.hearts = this.player.maxHearts;
  }

  attach() {
    this.input.attach();
  }

  startRun(seed = null) {
    this.seed = seed ?? Math.floor(Math.random() * 1000000000);
    this.world.reset(this.seed);
    this.player.reset();
    this.farmer.reset();
    this.particles.reset();
    this._applyEquipped();
    this.score = 0;
    this.runTime = 0;
    this.stats = this._freshStats();
    this.jumpTipped = false; // first-obstacle "SPACE to JUMP" tip, once a run
    this.scarecrowTipped = false; // first-scarecrow "hold S to SLIDE" tip, once a run
    this.sweepTipped = false; // first-sweeping-blade tip, once a run
    this.lastZoneIndex = 0;
    this.state = GAME_STATE.PLAYING;
    this.hud.showBanner('THE FARMYARD', 'Dawn breaks. The farmer is coming. RUN!', 2.6);
    if (this.player.maxHearts > PLAYER_MAX_HEARTS) {
      this.hud.showToast('Chef Hat: +1 heart this run!', '#ff9f7a', 2.5);
    }
    const zone = this.world.zone;
    this.audio.ensure();
    this.audio.startMusic(zone.music.root, zone.music.mode, zone.music.bpm);
    this.audio.gobble();
  }

  endRun(escaped) {
    this.state = escaped ? GAME_STATE.ESCAPED : GAME_STATE.CAUGHT;
    this.endT = 0;
    this.save.runs += 1;
    const newBest = this.score > this.save.bestScore;
    if (newBest) this.save.bestScore = this.score;
    if (this.world.distanceM > this.save.bestDistance) {
      this.save.bestDistance = this.world.distanceM;
    }
    this.save.feathers += this.player.feathersBanked;
    this.bestScore = this.save.bestScore;
    this.bestDistance = this.save.bestDistance;
    saveSave(this.save);
    this.audio.stopMusic();
    if (escaped) {
      this.audio.escaped();
      this.particles.sparkle(this.player.x, this.player.y - 120, 40);
    } else {
      this.audio.caught();
    }
  }

  togglePause() {
    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PAUSED;
      this.audio.stopMusic();
    } else if (this.state === GAME_STATE.PAUSED) {
      this.state = GAME_STATE.PLAYING;
      const zone = this.world.zone;
      this.audio.startMusic(zone.music.root, zone.music.mode, zone.music.bpm);
    }
  }

  quitToTitle() {
    this.state = GAME_STATE.TITLE;
    this.audio.stopMusic();
    this.world.reset(20261127);
    this.player.reset();
    this.farmer.reset();
    this.titleRunT = 0;
  }

  buyUnlock(id) {
    const u = UNLOCKS.find((x) => x.id === id);
    if (!u) return;
    if (this.save.unlocks.includes(id)) {
      // Already owned: equip it.
      this.save.equipped = id;
      saveSave(this.save);
      this._applyEquipped();
      this.hud.shopMessage = `${u.name} equipped!`;
      this.hud.shopMessageT = 2;
      this.audio.buy();
      return;
    }
    if (this.save.feathers < u.cost) {
      this.hud.shopMessage = `Not enough feathers — ${u.name} costs ${u.cost}. Keep running!`;
      this.hud.shopMessageT = 2.5;
      this.audio.denied();
      return;
    }
    this.save.feathers -= u.cost;
    this.save.unlocks.push(id);
    this.save.equipped = id;
    saveSave(this.save);
    this._applyEquipped();
    this.hud.shopMessage = `${u.name} bought and equipped!`;
    this.hud.shopMessageT = 2.5;
    this.audio.buy();
  }

  // ---- per-frame update ----

  update(dt) {
    this.time += dt;
    this.hud.update(dt);
    this.particles.update(dt);

    // Pause toggles from either side of the pause menu.
    if (this.input.pausePressed && (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED)) {
      this.togglePause();
      return;
    }
    if (this.input.mutePressed && (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED)) {
      this.audio.setMuted(this.audio.toggleMute());
    }

    if (this.state === GAME_STATE.TITLE) {
      // The farm scrolls gently behind the title, turkey running in place.
      this.titleRunT += dt;
      this.world.update(dt * 0.35, 120, false);
      this.player.runPhase += dt * 9;
      return;
    }
    if (this.state === GAME_STATE.PLAYING) {
      this._updatePlaying(dt);
      return;
    }
    if (this.state === GAME_STATE.CAUGHT || this.state === GAME_STATE.ESCAPED) {
      this.endT += dt;
      return;
    }
    // PAUSED / HOWTO / SHOP: world frozen.
  }

  _updatePlaying(dt) {
    const p = this.player;
    const f = this.farmer;
    const input = this.input;
    this.runTime += dt;
    // Captured before the frame's input: a hide that ends this frame —
    // by timeout, by letting go, or by jumping out — must tell the
    // farmer to chase again (see the check after the hiding block).
    const wasHiding = p.hiding;

    // Speed: zone base + dash bonus, slowed by stumble / mud / slow-mo.
    const zone = this.world.zone;
    let speed = zone.speed + p.dashBonus;
    if (p.stumbleT > 0) speed *= 0.55;
    const slowmo = p.slowmoActive;
    p.speed = speed;

    // Zone change: banner, fanfare, faster music.
    if (zone.index !== this.lastZoneIndex) {
      this.lastZoneIndex = zone.index;
      this.hud.showBanner(zone.name.toUpperCase(), zone.subtitle, 2.6);
      this.audio.zoneFanfare();
      this.audio.setMusicZone(zone.music.root, zone.music.mode, zone.music.bpm);
      this.particles.leaves(p.x + 200, 200, 12);
    }

    // Player physics and actions.
    const stumbleSlow = p.update(dt, input, this.audio);
    if (input.dashPressed && p.dashing) {
      f.onDash();
      this.stats.dashes += 1;
    }

    // On-screen touch buttons: SLIDE and HIDE are holds, tracked from the
    // live touch position against the rects the HUD drew last frame.
    const tb = this.hud.touchButtons;
    if (input.touchActive && tb) {
      const inRect = (r) => input.touchX >= r.x && input.touchX <= r.x + r.w
        && input.touchY >= r.y && input.touchY <= r.y + r.h;
      input.touchSlideHeld = inRect(tb.slide);
      input.touchHideHeld = inRect(tb.hide);
    } else {
      input.touchSlideHeld = false;
      input.touchHideHeld = false;
    }

    // First-run tips, shown once when the danger they name first appears.
    if (!this.jumpTipped && this.world.distanceM < 150) {
      const next = this.world.obstacles.find((o) => o.x > p.x && o.x - p.x < 380 && o.type !== 'mud');
      if (next) {
        this.hud.showToast('SPACE to JUMP over it!', '#ffd23e', 2.2);
        this.jumpTipped = true;
      }
    }
    if (!this.scarecrowTipped) {
      const sc = this.world.obstacles.find((o) => o.type === 'scarecrow' && o.x > p.x && o.x - p.x < 520);
      if (sc) {
        this.hud.showToast('SCARECROW! Hold S to SLIDE under it!', '#ffd23e', 2.4);
        this.scarecrowTipped = true;
      }
    }
    if (!this.sweepTipped) {
      const sw = this.world.obstacles.find((o) => o.type === 'knifesweep' && o.x > p.x && o.x - p.x < 520);
      if (sw) {
        this.hud.showToast('SWEEPING BLADE! Run under it when HIGH, jump it when LOW!', '#ffd23e', 2.6);
        this.sweepTipped = true;
      }
    }

    // Hiding: only while overlapping a haystack and holding H (or the
    // touch HIDE button).
    const nearHaystack = this._nearHaystack();
    if ((input.hidePressed || input.touchHideHeld) && p.canHide && nearHaystack) {
      if (p.tryHide(this.audio, true)) {
        f.onHide(this.audio);
        this.stats.hides += 1;
        this.hud.showToast('HIDDEN! Stay quiet…', '#7fae4c');
      }
    }
    if (p.hiding) {
      const hs = nearHaystack;
      if (!hs || !input.hideHeld) {
        p.stopHiding();
      } else {
        // Rustle the haystack so the player can see where they are.
        hs.rustle = Math.sin(this.time * 14) * 2;
      }
    }
    // Leaving the haystack — letting go, timing out, or jumping out —
    // puts the farmer back on the chase, even if he had cornered it.
    if (wasHiding && !p.hiding) f.onUnhide();

    // World scrolls; obstacles and pickups move with it. While the
    // turkey hides, the world holds still — it is crouched inside the
    // haystack, so the haystack must not scroll away from it. Hiding
    // trades distance for breathing room: the gap grows while the
    // farmer searches, but the run itself waits.
    const scrollSpeed = p.hiding ? 0 : speed;
    this.world.update(dt * stumbleSlow, scrollSpeed, slowmo);

    // Farmer AI.
    const wasSearching = f.state === FARMER_STATE.SEARCH;
    f.update(dt, p, this.audio);
    // The music follows the chase: calm when he is far, frantic when
    // he is close enough to see.
    this.audio.setMusicIntensity(f.dangerLevel());
    if (f.state === FARMER_STATE.CAUGHT) {
      this.particles.feathers(p.x, p.y - 40, 14);
      this.particles.shake(10, 0.5);
      this.endRun(false);
      return;
    }
    if (wasSearching && f.state === FARMER_STATE.CHASE && !p.hiding) {
      this.hud.showToast('He lost you. Keep running!', '#7fae4c');
    }

    // Knife warnings: a falling knife flashes red on the ground first.
    for (const o of this.world.obstacles) {
      if (o.type === 'knifefall' && o.state === 'idle' && !o.warned && o.x < PLAYER_X + 420 && o.x > -50) {
        o.warned = true;
        this.audio.knifeWhistle();
      }
      if (o.type === 'knifefall' && o.state === 'landed' && !o.hit) {
        o.hit = true;
        this.audio.knifeThud();
        this.particles.dust(o.x, GROUND_Y, 8);
      }
    }

    // Collisions with obstacles.
    const pBox = p.box();
    for (const o of this.world.obstacles) {
      if (o.type === 'knifefall' && o.state === 'gone') continue;
      const box = o.box();
      if (!box) continue;
      // Mud only slows; it never hurts.
      if (o.type === 'mud') {
        if (boxesOverlap(pBox, box, 0.9) && p.onGround) {
          p.speed *= 0.6;
        }
        continue;
      }
      if (boxesOverlap(pBox, box)) {
        if (o.type === 'knifefall' && o.state !== 'landed') continue;
        if (o.hit) continue;
        o.hit = true;
        this._onObstacleHit(o);
        if (this.state !== GAME_STATE.PLAYING) return; // died
      } else if (!o.passed && o.x + o.w < p.x - 30) {
        // Cleared it: small score bonus, bigger for the nasty ones.
        o.passed = true;
        this.stats.cleared += 1;
        let gained = p.addScore(o.def.score, this);
        // CLOSE CALL: cleared while airborne, feet skimming the top.
        // Skilful jumps pay extra — and the game says so out loud.
        const skimmable = o.type !== 'mud' && o.type !== 'knifefall' && o.type !== 'knifesweep';
        if (skimmable && !p.onGround) {
          const clearance = o.y - p.y; // feet above the obstacle's top, px
          if (clearance >= 0 && clearance <= 46) {
            this.stats.nearMisses += 1;
            const bonus = Math.round(NEAR_MISS_BONUS * (1 + p.scoreBonus));
            this.score += bonus;
            gained += bonus;
            this.audio.nearMiss();
            this.particles.floatText(p.x + 40, p.y - 130, `CLOSE CALL! +${bonus}`, '#7fd4ff', 22);
            this.hud.showToast('CLOSE CALL! +25', '#7fd4ff', 1.2);
          }
        }
        this.particles.floatText(p.x + 40, p.y - 110, `+${gained}`, '#ffd23e', 20);
      }
    }

    // Pickups.
    for (const pk of this.world.pickups) {
      if (pk.taken) continue;
      if (boxesOverlap(pBox, pk.box(), 0.9)) {
        pk.taken = true;
        this._onPickup(pk);
      }
    }

    // Distance score trickles in — only while the world actually moves.
    this.score += scrollSpeed * dt * 0.02 * (1 + p.scoreBonus);
    if (p.combo > this.stats.bestCombo) this.stats.bestCombo = p.combo;

    // Escape: reach the forest gate.
    if (this.world.gateX !== null && p.x >= this.world.gateX - 40) {
      this.particles.sparkle(p.x, p.y - 100, 30);
      this.endRun(true);
      return;
    }
    if (this.world.distanceM >= ESCAPE_DISTANCE_M) {
      this.endRun(true);
      return;
    }

    // Ambient dust while running on the ground.
    if (p.onGround && Math.random() < dt * 6) {
      this.particles.dust(p.x - 20, GROUND_Y, 1);
    }
    // Occasional falling leaves for atmosphere.
    if (Math.random() < dt * 0.8) {
      this.particles.leaves(CANVAS_W + 40, 120 + Math.random() * 200, 1);
    }
  }

  _nearHaystack() {
    const p = this.player;
    for (const h of this.world.haystacks) {
      if (p.x > h.x - 10 && p.x < h.x + h.w + 10) return h;
    }
    return null;
  }

  _onObstacleHit(o) {
    const p = this.player;
    const result = p.takeHit(this.audio);
    this.stats.hits += 1;
    this.farmer.onStumble();
    this.particles.feathers(p.x, p.y - 40, 10);
    this.particles.shake(9, 0.4);
    if (result === 'blocked') {
      this.hud.showToast('STUFFING SHIELD blocked it!', '#7fd4ff');
      this.particles.sparkle(p.x, p.y - 60, 16, '#7fd4ff');
      return;
    }
    if (result === 'dead') {
      this.particles.feathers(p.x, p.y - 40, 18);
      this.endRun(false);
      return;
    }
    this.hud.showToast(`OUCH! ${o.def.label} — ${p.hearts} ${p.hearts === 1 ? 'heart' : 'hearts'} left`, '#ff5a3c');
    p.combo = 0;
  }

  _onPickup(pk) {
    const p = this.player;
    p.registerPickup(this);
    const gained = p.addScore(pk.def.score, this);
    const px = pk.x;
    const py = pk.y;
    switch (pk.type) {
      case 'corn':
        this.stats.corn += 1;
        this.audio.pickupCorn();
        this.particles.sparkle(px, py, 6);
        this.particles.floatText(px, py - 30, `+${gained}`, '#f2c531', 18);
        break;
      case 'feather':
        this.stats.feathers += 1;
        p.feathersBanked += 1;
        this.audio.pickupFeather();
        this.particles.sparkle(px, py, 14);
        this.particles.floatText(px, py - 30, `+${gained} 🪶`, '#ffd23e', 20);
        break;
      case 'pie':
        p.heal(pk.def.heals);
        this.audio.heal();
        this.particles.sparkle(px, py, 10, '#ff9f7a');
        this.particles.floatText(px, py - 30, `+${gained} ❤`, '#ff8a7a', 20);
        break;
      case 'gravy':
        p.slowmoT = pk.def.slowmo;
        this.audio.slowmo();
        this.hud.showToast('GRAVY TIME — everything slows down!', '#d9a441');
        this.particles.floatText(px, py - 30, `+${gained}`, '#d9a441', 20);
        break;
      case 'stuffing':
        p.shield = true;
        this.audio.shieldUp();
        this.hud.showToast('STUFFING SHIELD up!', '#7fd4ff');
        this.particles.floatText(px, py - 30, `+${gained} 🛡`, '#7fd4ff', 20);
        break;
      default:
        break;
    }
  }

  // ---- clicks ----

  handleClick(x, y) {
    const id = this.hud.hitButton(x, y);
    if (!id) return false;
    this.audio.ensure();
    this.audio.click();
    switch (id) {
      case 'play':
        this.startRun();
        return true;
      case 'howto':
        this.state = GAME_STATE.HOWTO;
        return true;
      case 'shop':
        this.state = GAME_STATE.SHOP;
        this.hud.shopIndex = 0;
        return true;
      case 'back':
        this.state = GAME_STATE.TITLE;
        return true;
      case 'pause':
        this.togglePause();
        return true;
      case 'mute':
        this.audio.setMuted(this.audio.toggleMute());
        return true;
      case 'resume':
        this.togglePause();
        return true;
      case 'restart':
        this.startRun();
        return true;
      case 'quit':
        this.quitToTitle();
        return true;
      case 'retry':
        this.startRun();
        return true;
      case 'title':
        this.quitToTitle();
        return true;
      case 't-jump':
        if (this.state === GAME_STATE.PLAYING) this.player.tryJump(this.audio);
        return true;
      case 't-dash':
        if (this.state === GAME_STATE.PLAYING && this.player.tryDash(this.audio)) {
          this.farmer.onDash();
          this.stats.dashes += 1;
        }
        return true;
      case 't-slide':
      case 't-hide':
        // Holds, not taps: the game reads the live touch position
        // against the button rect each frame while playing.
        return this.state === GAME_STATE.PLAYING;
      default:
        if (id.startsWith('shop-')) {
          this.buyUnlock(id.slice(5));
          return true;
        }
        return false;
    }
  }

  handleKey() {
    // Keyboard shortcuts on menus.
    if (this.state === GAME_STATE.TITLE && this.input.jumpPressed) {
      this.startRun();
      return;
    }
    if ((this.state === GAME_STATE.CAUGHT || this.state === GAME_STATE.ESCAPED) && this.endT > 0.8) {
      if (this.input.pressed('Enter') || this.input.jumpPressed) {
        this.startRun();
      }
    }
    if (this.state === GAME_STATE.HOWTO || this.state === GAME_STATE.SHOP) {
      if (this.input.pressed('Escape')) this.state = GAME_STATE.TITLE;
    }
    if (this.state === GAME_STATE.SHOP) {
      if (this.input.pressed('ArrowDown') || this.input.pressed('KeyS')) {
        this.hud.shopIndex = Math.min(UNLOCKS.length - 1, this.hud.shopIndex + 1);
      }
      if (this.input.pressed('ArrowUp') || this.input.pressed('KeyW')) {
        this.hud.shopIndex = Math.max(0, this.hud.shopIndex - 1);
      }
      if (this.input.pressed('Enter')) {
        this.buyUnlock(UNLOCKS[this.hud.shopIndex].id);
      }
    }
  }

  // ---- render ----

  render() {
    const ctx = this.ctx;
    const zone = this.world.zone;
    ctx.save();
    const shake = this.particles.shakeOffset();
    ctx.translate(shake.x, shake.y);

    drawBackground(ctx, zone, this.time, this.world.distanceM);

    // Scenery (behind the action).
    for (const s of this.world.scenery) {
      drawSceneryItem(ctx, s, GROUND_Y);
    }

    // Haystacks (hiding spots) sit behind the turkey. A haystack just
    // ahead of the turkey glints gold and shows a HIDE! prompt, so
    // hiding reads as an option instead of scenery.
    for (const h of this.world.haystacks) {
      const near = !this.player.hiding && h.x > this.player.x - 60 && h.x < this.player.x + 320;
      const glint = near ? 0.45 + 0.4 * Math.sin(this.time * 6) : 0;
      Sprites.drawHaystack(ctx, h.x + h.w / 2, h.y, 1, { rustle: h.rustle || 0, glint });
      if (near && this.state === GAME_STATE.PLAYING) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
        const label = this.input.touchMode ? 'HIDE! — hold HIDE' : 'HIDE! — hold H';
        const ly = GROUND_Y - 130 + Math.sin(this.time * 6) * 4;
        ctx.strokeText(label, h.x + h.w / 2, ly);
        ctx.fillStyle = '#ffd23e';
        ctx.fillText(label, h.x + h.w / 2, ly);
        ctx.restore();
      }
    }

    // The freedom gate.
    if (this.world.gateX !== null) {
      Sprites.drawForestGate(ctx, this.world.gateX, GROUND_Y, 1);
    }

    // Pickups.
    for (const pk of this.world.pickups) {
      if (pk.taken) continue;
      const bob = Math.sin(this.time * 3 + pk.phase) * 6;
      switch (pk.type) {
        case 'corn': Sprites.drawCorn(ctx, pk.x, pk.y, 1, bob); break;
        case 'feather': Sprites.drawFeather(ctx, pk.x, pk.y, 1, bob, true); break;
        case 'pie': Sprites.drawPie(ctx, pk.x, pk.y, 1, bob); break;
        case 'gravy': Sprites.drawGravyBoat(ctx, pk.x, pk.y, 1, bob); break;
        case 'stuffing': Sprites.drawStuffing(ctx, pk.x, pk.y, 1, bob); break;
        default: break;
      }
    }

    // Obstacles.
    for (const o of this.world.obstacles) {
      this._drawObstacle(ctx, o);
    }

    // Farmer (behind the turkey, or searching near a haystack). While
    // he searches or corners, he stands beside the haystack the turkey
    // is hiding in, so the threat is visible instead of abstract.
    let fx = this.farmer.screenX(this.player.x);
    const farmerHunting = this.farmer.state === FARMER_STATE.SEARCH || this.farmer.state === FARMER_STATE.CORNER;
    if (farmerHunting) {
      const hs = this._nearHaystack();
      if (hs) fx = hs.x + hs.w / 2 - 110;
    }
    if (fx > -160) {
      const searching = this.farmer.state === FARMER_STATE.SEARCH || this.farmer.state === FARMER_STATE.CORNER;
      Sprites.drawFarmer(ctx, fx, GROUND_Y, 1.05, {
        runPhase: this.farmer.runPhase,
        searching,
        angry: this.farmer.angryT > 0,
        facing: 1,
      });
      // His shout when the turkey stumbles (kept on screen at the edge).
      if (this.farmer.yellT > 0) {
        ctx.save();
        ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 4;
        const y = GROUND_Y - 170 + Math.sin(this.time * 10) * 3;
        const tx = Math.max(120, fx + 40);
        ctx.strokeText('HEY! GET BACK HERE!', tx, y);
        ctx.fillText('HEY! GET BACK HERE!', tx, y);
        ctx.restore();
      }
      // "?" while searching.
      if (this.farmer.state === FARMER_STATE.SEARCH) {
        ctx.save();
        ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd23e';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 5;
        const qy = GROUND_Y - 160 + Math.sin(this.time * 6) * 5;
        ctx.strokeText('?', fx + 10, qy);
        ctx.fillText('?', fx + 10, qy);
        ctx.restore();
      }
    }

    // The turkey.
    const p = this.player;
    // Ground shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    const shadowScale = p.onGround ? 1 : clamp(1 - (GROUND_Y - p.y) / 400, 0.4, 1);
    ctx.beginPath();
    ctx.ellipse(p.x, GROUND_Y + 4, 34 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shield bubble.
    if (p.shield) {
      ctx.save();
      ctx.strokeStyle = 'rgba(127, 212, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 40, 56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    Sprites.drawTurkey(ctx, p.x, p.y, 1, {
      runPhase: p.runPhase,
      jumping: !p.onGround,
      sliding: p.sliding,
      hiding: p.hiding,
      dashing: p.dashing,
      outfit: p.outfit,
      blink: p.blinkT < 0.12,
      hurtFlash: p.invulnerableT > 0 && Math.floor(this.time * 14) % 2 === 0,
    });

    // Dash trail.
    if (p.dashing) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffd23e';
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(p.x - i * 26, p.y - 36, 18 - i * 3, 10 - i * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    this.particles.draw(ctx);
    ctx.restore();

    // ---- overlays (no shake) ----
    switch (this.state) {
      case GAME_STATE.TITLE:
        this.hud.drawTitle(ctx, this, this.input);
        break;
      case GAME_STATE.PLAYING:
        this.hud.drawPlaying(ctx, this);
        break;
      case GAME_STATE.PAUSED:
        this.hud.drawPlaying(ctx, this);
        this.hud.drawPaused(ctx, this, this.input);
        break;
      case GAME_STATE.HOWTO:
        this.hud.drawHowto(ctx, this, this.input);
        break;
      case GAME_STATE.SHOP:
        this.hud.drawShop(ctx, this, this.input);
        break;
      case GAME_STATE.CAUGHT:
        this.hud.drawCaught(ctx, this, this.input);
        break;
      case GAME_STATE.ESCAPED:
        this.hud.drawEscaped(ctx, this, this.input);
        break;
      default:
        break;
    }

    // Vignette for a finished look.
    const vig = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.45,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.95,
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  _drawObstacle(ctx, o) {
    const s = 1;
    switch (o.type) {
      case 'fence':
        Sprites.drawFence(ctx, o.x + o.w / 2, GROUND_Y, s);
        break;
      case 'haybale':
        Sprites.drawHayBale(ctx, o.x + o.w / 2, GROUND_Y, s);
        break;
      case 'pumpkin':
        Sprites.drawPumpkin(ctx, o.x + o.w / 2, GROUND_Y, s, { face: true });
        break;
      case 'mud':
        Sprites.drawMudPuddle(ctx, o.x + o.w / 2, GROUND_Y + 4, o.w, s);
        break;
      case 'scarecrow':
        Sprites.drawScarecrow(ctx, o.x + o.w / 2, GROUND_Y, s);
        break;
      case 'rollingpumpkin':
        Sprites.drawPumpkin(ctx, o.x + o.w / 2, GROUND_Y, s, { face: true, rolling: true, rollPhase: o.rollPhase });
        break;
      case 'oven': {
        Sprites.drawOven(ctx, o.x + o.w / 2, GROUND_Y, s, { heat: o.heat });
        ctx.save();
        ctx.fillStyle = 'rgba(255, 90, 40, 0.35)';
        ctx.beginPath();
        ctx.ellipse(o.x + o.w / 2, GROUND_Y + 2, o.w * 0.7, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'knifefall': {
        if (o.state === 'idle') {
          // Telegraph: red target on the ground + the knife glinting
          // above it in the sky. (It used to be drawn at y = -40, off
          // the top of the canvas, so the warning knife was invisible.)
          ctx.save();
          ctx.globalAlpha = 0.5 + Math.sin(this.time * 12) * 0.3;
          ctx.fillStyle = '#ff2e1f';
          ctx.beginPath();
          ctx.ellipse(o.x + o.w / 2, GROUND_Y + 2, 26, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          Sprites.drawCarvingKnife(ctx, o.x + o.w / 2, 120 + Math.sin(this.time * 3 + o.seed) * 8, s, 0, { glow: true });
        } else if (o.state === 'falling' || o.state === 'landed') {
          Sprites.drawCarvingKnife(ctx, o.x + o.w / 2, o.knifeY + o.h / 2, s, 0);
        }
        break;
      }
      case 'knifesweep': {
        const swing = Math.sin(o.sweepPhase) * 46;
        ctx.save();
        ctx.translate(o.x + o.w / 2, GROUND_Y - 90 + swing);
        ctx.rotate(Math.sin(o.sweepPhase) * 0.35);
        Sprites.drawCarvingKnife(ctx, 0, 0, 1.4, Math.PI / 2);
        ctx.restore();
        // Its pivot post.
        ctx.fillStyle = '#3a3a44';
        ctx.fillRect(o.x + o.w / 2 - 4, GROUND_Y - 130, 8, 130);
        break;
      }
      default:
        break;
    }
  }
}
