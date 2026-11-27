// hud.js — everything drawn on top of the world: the HUD (score, distance,
// hearts, combo, farmer warning, zone banner), the title screen, the pause
// menu, the how-to page, the feather shop, and the caught / escaped end
// screens. Buttons are canvas rectangles; the game tests clicks against
// the list this file exposes each frame.

import { CANVAS_W, CANVAS_H, GROUND_Y, ZONES, UNLOCKS, ESCAPE_DISTANCE_M } from './config.js';
import { formatDistance, formatScore, formatTime, clamp, smoothstep } from './random.js';

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

export class Hud {
  constructor() {
    this.buttons = []; // { id, x, y, w, h, label } rebuilt every draw
    this.bannerT = 0;
    this.bannerText = '';
    this.bannerSub = '';
    this.toastT = 0;
    this.toastText = '';
    this.toastColor = '#ffffff';
    this.shopIndex = 0;
    this.shopMessage = '';
    this.shopMessageT = 0;
    this.touchButtons = null; // rects of the on-screen touch buttons, rebuilt each draw
  }

  clearButtons() {
    this.buttons = [];
  }

  addButton(id, x, y, w, h, label) {
    this.buttons.push({ id, x, y, w, h, label });
    return { id, x, y, w, h };
  }

  hitButton(x, y) {
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
    }
    return null;
  }

  showBanner(text, sub, duration = 2.4) {
    this.bannerText = text;
    this.bannerSub = sub;
    this.bannerT = duration;
  }

  showToast(text, color = '#ffffff', duration = 1.6) {
    this.toastText = text;
    this.toastColor = color;
    this.toastT = duration;
  }

  update(dt) {
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.toastT > 0) this.toastT -= dt;
    if (this.shopMessageT > 0) this.shopMessageT -= dt;
  }

  // ---- shared drawing helpers ----

  panel(ctx, x, y, w, h, fill = 'rgba(20, 12, 8, 0.82)', stroke = 'rgba(242, 197, 49, 0.9)') {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  button(ctx, id, x, y, w, h, label, opts = {}) {
    const { fontSize = 24, fill = '#c0392b', hover = false, disabled = false } = opts;
    ctx.save();
    if (disabled) ctx.globalAlpha = 0.45;
    ctx.fillStyle = hover ? '#d94f30' : fill;
    ctx.strokeStyle = '#f2c531';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.restore();
    this.addButton(id, x, y, w, h, label);
  }

  titleText(ctx, text, x, y, size, color, stroke = 'rgba(60, 20, 0, 0.9)') {
    ctx.save();
    ctx.font = `bold ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(4, size / 8);
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  heart(ctx, x, y, size, filled) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 20, size / 20);
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-11, -4, -6, -12, 0, -6);
    ctx.bezierCurveTo(6, -12, 11, -4, 0, 6);
    ctx.closePath();
    ctx.fillStyle = filled ? '#e63946' : 'rgba(255, 255, 255, 0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // ---- the in-run HUD ----

  drawPlaying(ctx, game) {
    const p = game.player;
    const f = game.farmer;
    this.clearButtons();

    // Top-left: score, distance, best.
    this.panel(ctx, 16, 14, 300, 96, 'rgba(20, 12, 8, 0.72)');
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f2c531';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText('SCORE', 32, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(formatScore(game.score), 32, 72);
    ctx.fillStyle = '#ffd98a';
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`🏃 ${formatDistance(game.world.distanceM)}  •  BEST ${formatScore(game.bestScore)}`, 32, 96);
    ctx.restore();

    // Top-center: zone name + progress bar to the escape.
    const zoneW = 420;
    const zoneX = (CANVAS_W - zoneW) / 2;
    this.panel(ctx, zoneX, 14, zoneW, 64, 'rgba(20, 12, 8, 0.72)');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(game.world.zone.name.toUpperCase(), CANVAS_W / 2, 40);
    ctx.fillStyle = '#ffd98a';
    ctx.font = `15px ${FONT}`;
    ctx.fillText(game.world.zone.subtitle, CANVAS_W / 2, 62);
    // Progress bar.
    const prog = clamp(game.world.distanceM / ESCAPE_DISTANCE_M, 0, 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(zoneX + 16, 66, zoneW - 32, 6);
    ctx.fillStyle = '#7fae4c';
    ctx.fillRect(zoneX + 16, 66, (zoneW - 32) * prog, 6);
    // Zone ticks.
    ctx.fillStyle = '#f2c531';
    for (let i = 1; i < 5; i++) {
      ctx.fillRect(zoneX + 16 + ((zoneW - 32) * i) / 5 - 1, 64, 2, 10);
    }
    ctx.restore();

    // Top-right: hearts, feathers, mute + pause buttons.
    this.panel(ctx, CANVAS_W - 316, 14, 300, 96, 'rgba(20, 12, 8, 0.72)');
    for (let i = 0; i < p.maxHearts; i++) {
      this.heart(ctx, CANVAS_W - 286 + i * 34, 48, 26, i < p.hearts);
    }
    ctx.save();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd23e';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`🪶 ${p.feathersBanked} golden`, CANVAS_W - 292, 88);
    if (p.shield || p.slowmoActive) {
      ctx.textAlign = 'right';
      ctx.fillStyle = p.shield ? '#7fd4ff' : '#ffd23e';
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText(p.shield ? '🛡 SHIELD' : '⏳ SLOW-MO!', CANVAS_W - 24, 88);
    }
    ctx.restore();
    this.button(ctx, 'pause', CANVAS_W - 108, 20, 44, 40, 'II', { fontSize: 20, fill: '#5a3a1e' });
    this.button(ctx, 'mute', CANVAS_W - 58, 20, 44, 40, game.audio.muted ? '🔇' : '🔊', { fontSize: 18, fill: '#5a3a1e' });

    // Combo meter under the score.
    if (p.combo > 1) {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ff9f1c';
      ctx.font = `bold 26px ${FONT}`;
      ctx.fillText(`COMBO x${p.combo}  (+${Math.round((p.combo - 1) * 25)}%)`, 32, 140);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(32, 148, 180, 6);
      ctx.fillStyle = '#ff9f1c';
      ctx.fillRect(32, 148, 180 * clamp(p.comboT / 2.5, 0, 1), 6);
      ctx.restore();
    }

    // Farmer proximity warning: a red bar at the bottom that grows as he closes in.
    // (He now rubber-bands to the left edge on a clean run, so the bar only
    // fires when he is genuinely about to grab the turkey.)
    const danger = f.dangerLevel();
    if (f.state === 'search' || f.state === 'corner' || danger > 0.82) {
      const pulse = 0.6 + Math.sin(game.time * 8) * 0.4;
      ctx.save();
      const w = 420;
      const x = (CANVAS_W - w) / 2;
      const y = CANVAS_H - 56;
      ctx.fillStyle = 'rgba(20, 12, 8, 0.7)';
      ctx.beginPath();
      ctx.roundRect(x, y, w, 34, 10);
      ctx.fill();
      ctx.fillStyle = f.state === 'corner' ? '#ff2e1f' : '#ff5a3c';
      ctx.globalAlpha = f.state === 'corner' ? pulse : 0.85;
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, (w - 8) * danger, 26, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 17px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = f.state === 'search'
        ? '👀 THE FARMER IS SEARCHING… STAY HIDDEN!'
        : f.state === 'corner'
          ? '⚠️ HE FOUND YOUR HAYSTACK — RUN!!'
          : '🚨 THE FARMER IS RIGHT BEHIND YOU!';
      ctx.fillText(label, CANVAS_W / 2, y + 18);
      ctx.restore();
    }

    // Hiding indicator.
    if (p.hiding) {
      const left = Math.max(0, p.hideMaxTime - p.hideT);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillText(`HIDING… ${left.toFixed(1)}s  (suspicion ${Math.round(game.farmer.suspicion * 100)}%)`, CANVAS_W / 2, 150);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(CANVAS_W / 2 - 120, 160, 240, 8);
      ctx.fillStyle = game.farmer.suspicion > 0.7 ? '#ff2e1f' : '#ffd23e';
      ctx.fillRect(CANVAS_W / 2 - 120, 160, 240 * clamp(game.farmer.suspicion, 0, 1), 8);
      ctx.restore();
    }

    // Zone banner.
    if (this.bannerT > 0) {
      const a = clamp(this.bannerT / 0.5, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      this.titleText(ctx, this.bannerText, CANVAS_W / 2, 210, 44, '#ffffff');
      this.titleText(ctx, this.bannerSub, CANVAS_W / 2, 252, 22, '#ffd98a');
      ctx.restore();
    }

    // Toast (pickup feedback).
    if (this.toastT > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(this.toastT / 0.4, 0, 1);
      ctx.textAlign = 'center';
      ctx.fillStyle = this.toastColor;
      ctx.font = `bold 24px ${FONT}`;
      ctx.fillText(this.toastText, CANVAS_W / 2, 300);
      ctx.restore();
    }

    // Dash cooldown pip.
    if (p.dashCooldown > 0) {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(`DASH recharging ${p.dashCooldown.toFixed(1)}s`, 32, CANVAS_H - 24);
      ctx.restore();
    } else {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#7fd4ff';
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText('SHIFT — DASH ready!', 32, CANVAS_H - 24);
      ctx.restore();
    }

    // Controls reminder, small.
    ctx.save();
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `14px ${FONT}`;
    ctx.fillText(
      game.input.touchMode
        ? 'Tap JUMP • hold SLIDE / HIDE • tap DASH  •  P pause'
        : 'SPACE jump ×2  •  S slide  •  H hide  •  SHIFT dash  •  P pause',
      CANVAS_W - 24, CANVAS_H - 24,
    );
    ctx.restore();

    // On-screen touch buttons (phones/tablets, or after any touch).
    // JUMP and DASH are taps; SLIDE and HIDE are holds, tracked by the
    // game from the live touch position against these rects.
    if (game.input.touchMode && game.state === 'playing') {
      const tb = {
        slide: { x: 24, y: CANVAS_H - 148, w: 120, h: 84 },
        hide: { x: 156, y: CANVAS_H - 148, w: 120, h: 84 },
        dash: { x: CANVAS_W - 288, y: CANVAS_H - 128, w: 96, h: 64 },
        jump: { x: CANVAS_W - 168, y: CANVAS_H - 168, w: 144, h: 104 },
      };
      this.touchButtons = tb;
      const held = (r) => game.input.touchActive
        && game.input.touchX >= r.x && game.input.touchX <= r.x + r.w
        && game.input.touchY >= r.y && game.input.touchY <= r.y + r.h;
      this._touchButton(ctx, 't-slide', tb.slide, 'SLIDE', held(tb.slide));
      this._touchButton(ctx, 't-hide', tb.hide, 'HIDE', held(tb.hide));
      this._touchButton(ctx, 't-dash', tb.dash, 'DASH', held(tb.dash));
      this._touchButton(ctx, 't-jump', tb.jump, 'JUMP', held(tb.jump));
    }
  }

  // One translucent on-screen touch button.
  _touchButton(ctx, id, r, label, active) {
    ctx.save();
    ctx.globalAlpha = active ? 0.95 : 0.6;
    ctx.fillStyle = active ? '#d94f30' : 'rgba(20, 12, 8, 0.7)';
    ctx.strokeStyle = '#f2c531';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${r.w >= 130 ? 26 : 20}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.restore();
    this.addButton(id, r.x, r.y, r.w, r.h, label);
  }

  // ---- title screen ----

  drawTitle(ctx, game, input) {
    this.clearButtons();
    const t = game.time;
    // Warm vignette over the animated farm backdrop (the world is running behind).
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, 'rgba(30, 10, 0, 0.15)');
    grad.addColorStop(1, 'rgba(30, 10, 0, 0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const bobY = Math.sin(t * 2) * 6;
    this.titleText(ctx, 'GOBBLE & GO', CANVAS_W / 2, 120 + bobY, 84, '#ffd23e');
    this.titleText(ctx, 'THE GREAT TURKEY ESCAPE', CANVAS_W / 2, 178 + bobY, 30, '#ffffff');
    this.titleText(ctx, 'Thanksgiving is coming. The farmer is coming faster.', CANVAS_W / 2, 214, 20, '#ffd98a');

    // Best run + banked feathers.
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillText(
      `BEST: ${formatScore(game.bestScore)} pts  •  ${formatDistance(game.bestDistance)}  •  🪶 ${game.save.feathers} golden feathers banked`,
      CANVAS_W / 2, 256,
    );
    // When the browser blocks storage (some hosted sandboxes do), the
    // run still counts — progress just lives for this session only.
    if (!game.savePersistent) {
      ctx.fillStyle = 'rgba(255, 217, 138, 0.9)';
      ctx.font = `15px ${FONT}`;
      ctx.fillText('Feathers & outfits save for this session only here.', CANVAS_W / 2, 280);
    }
    ctx.restore();

    // Buttons.
    const cx = CANVAS_W / 2;
    const hoverPlay = input.mouseX >= cx - 170 && input.mouseX <= cx + 170 && input.mouseY >= 300 && input.mouseY <= 364;
    this.button(ctx, 'play', cx - 170, 300, 340, 64, '▶  START THE RUN', { fontSize: 28, hover: hoverPlay });
    const hoverHow = input.mouseX >= cx - 170 && input.mouseX <= cx + 170 && input.mouseY >= 378 && input.mouseY <= 426;
    this.button(ctx, 'howto', cx - 170, 378, 340, 48, 'HOW TO PLAY', { fontSize: 20, fill: '#5a3a1e', hover: hoverHow });
    const hoverShop = input.mouseX >= cx - 170 && input.mouseX <= cx + 170 && input.mouseY >= 440 && input.mouseY <= 488;
    this.button(ctx, 'shop', cx - 170, 440, 340, 48, `🪶 FEATHER SHOP  (${game.save.feathers})`, { fontSize: 20, fill: '#5a3a1e', hover: hoverShop });

    // Five zones, shown as the journey.
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText('THE ESCAPE ROUTE', CANVAS_W / 2, 530);
    ctx.font = `15px ${FONT}`;
    let zx = CANVAS_W / 2 - 430;
    for (const z of ZONES) {
      ctx.fillStyle = '#ffd23e';
      ctx.fillText('●', zx, 556);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(z.name, zx, 580);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `13px ${FONT}`;
      ctx.fillText(`${z.startM}–${z.endM} m`, zx, 600);
      ctx.font = `15px ${FONT}`;
      zx += 215;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `14px ${FONT}`;
    ctx.fillText('Reach 2,000 m and slip through the forest gate. The oven never forgets.', CANVAS_W / 2, 640);
    ctx.fillText('Keyboard + mouse. No network needed. M to mute.', CANVAS_W / 2, 664);
    ctx.restore();
  }

  // ---- how to play ----

  drawHowto(ctx, game, input) {
    this.clearButtons();
    ctx.fillStyle = 'rgba(20, 10, 4, 0.72)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.panel(ctx, 190, 60, 900, 600);
    this.titleText(ctx, 'HOW TO PLAY', CANVAS_W / 2, 110, 40, '#ffd23e');
    const rows = [
      ['🏃 RUN', 'The turkey runs on its own. Your job is everything else.'],
      ['SPACE / W / ↑', 'Jump. Press again mid-air for a DOUBLE JUMP.'],
      ['S / ↓ (hold)', 'Slide under scarecrows and low blades.'],
      ['SHIFT', 'DASH — a burst of speed that buys room from the farmer.'],
      ['H (near a haystack)', 'HIDE. The farmer searches… but suspicion grows. Leave before he corners you!'],
      ['🌽 Corn', '+10 pts. Grab them in a row to build a COMBO (up to x5).'],
      ['🪶 Golden feather', '+50 pts and BANKED between runs — spend them in the Feather Shop.'],
      ['🥧 Pie slice', '+25 pts and heals 1 heart.'],
      ['🍗 Gravy boat', 'Slows the whole world for 3 seconds.'],
      ['🛡 Stuffing', 'Blocks one hit.'],
      ['🔪 Falling knives', 'Watch for the red flash on the ground — do NOT stand there.'],
      ['🔪 Sweeping blade', 'Run UNDER it when it swings high, JUMP it when it dips low.'],
      ['🔥 The oven', 'Zone 5. Jump it, or dash straight past the heat.'],
      ['❤ Hearts', '3 hearts. An obstacle costs 1 and the farmer gains on you. 0 hearts = CAUGHT.'],
      ['🚪 2,000 m', 'Reach the forest gate and you ESCAPE. That is the whole dream.'],
    ];
    ctx.save();
    ctx.textAlign = 'left';
    let y = 152;
    for (const [key, desc] of rows) {
      ctx.fillStyle = '#ffd23e';
      ctx.font = `bold 18px ${FONT}`;
      ctx.fillText(key, 230, y);
      ctx.fillStyle = '#ffffff';
      ctx.font = `17px ${FONT}`;
      ctx.fillText(desc, 470, y);
      y += 30;
    }
    ctx.restore();
    const hover = input.mouseX >= CANVAS_W / 2 - 110 && input.mouseX <= CANVAS_W / 2 + 110 && input.mouseY >= 600 && input.mouseY <= 648;
    this.button(ctx, 'back', CANVAS_W / 2 - 110, 600, 220, 48, '← BACK', { fontSize: 20, hover });
  }

  // ---- feather shop ----

  drawShop(ctx, game, input) {
    this.clearButtons();
    ctx.fillStyle = 'rgba(20, 10, 4, 0.72)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.panel(ctx, 190, 60, 900, 600);
    this.titleText(ctx, '🪶 FEATHER SHOP', CANVAS_W / 2, 110, 40, '#ffd23e');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillText(`You have ${game.save.feathers} golden feathers. Outfits are kept between runs.`, CANVAS_W / 2, 148);
    ctx.restore();

    let y = 180;
    for (let i = 0; i < UNLOCKS.length; i++) {
      const u = UNLOCKS[i];
      const owned = game.save.unlocks.includes(u.id);
      const equipped = game.save.equipped === u.id;
      const selected = this.shopIndex === i;
      ctx.save();
      if (selected) {
        ctx.fillStyle = 'rgba(242, 197, 49, 0.18)';
        ctx.fillRect(220, y - 8, 840, 56);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = equipped ? '#7fd4ff' : '#ffffff';
      ctx.font = `bold 19px ${FONT}`;
      ctx.fillText(`${equipped ? '★ ' : ''}${u.name}`, 240, y + 18);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `16px ${FONT}`;
      ctx.fillText(`${u.desc}  •  Perk: ${u.perk}`, 240, y + 42);
      ctx.textAlign = 'right';
      ctx.fillStyle = owned ? '#7fae4c' : '#ffd23e';
      ctx.font = `bold 18px ${FONT}`;
      const status = owned ? (equipped ? 'EQUIPPED' : 'OWNED — click to wear') : `🪶 ${u.cost} feathers`;
      ctx.fillText(status, 1040, y + 24);
      ctx.restore();
      const hover = input.mouseY >= y - 8 && input.mouseY <= y + 48 && input.mouseX >= 220 && input.mouseX <= 1060;
      this.addButton(`shop-${u.id}`, 220, y - 8, 840, 56, u.name);
      if (hover) this.shopIndex = i;
      y += 62;
    }
    if (this.shopMessageT > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23e';
      ctx.font = `bold 18px ${FONT}`;
      ctx.fillText(this.shopMessage, CANVAS_W / 2, 580);
      ctx.restore();
    }
    const hoverBack = input.mouseX >= CANVAS_W / 2 - 110 && input.mouseX <= CANVAS_W / 2 + 110 && input.mouseY >= 600 && input.mouseY <= 648;
    this.button(ctx, 'back', CANVAS_W / 2 - 110, 600, 220, 48, '← BACK', { fontSize: 20, hover: hoverBack });
  }

  // ---- pause ----

  drawPaused(ctx, game, input) {
    this.clearButtons();
    ctx.fillStyle = 'rgba(20, 10, 4, 0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.panel(ctx, CANVAS_W / 2 - 260, 200, 520, 320);
    this.titleText(ctx, 'PAUSED', CANVAS_W / 2, 250, 48, '#ffd23e');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `19px ${FONT}`;
    ctx.fillText(`Score ${formatScore(game.score)}  •  ${formatDistance(game.world.distanceM)}`, CANVAS_W / 2, 296);
    ctx.fillText('The farmer waits. He is very patient. He is also very hungry.', CANVAS_W / 2, 324);
    ctx.restore();
    const cx = CANVAS_W / 2;
    this.button(ctx, 'resume', cx - 150, 350, 300, 52, '▶ RESUME', { fontSize: 22 });
    this.button(ctx, 'restart', cx - 150, 414, 300, 52, '↻ RESTART RUN', { fontSize: 20, fill: '#5a3a1e' });
    this.button(ctx, 'quit', cx - 150, 478, 300, 52, 'QUIT TO TITLE', { fontSize: 20, fill: '#5a3a1e' });
  }

  // ---- end screens ----

  drawCaught(ctx, game, input) {
    this.clearButtons();
    ctx.fillStyle = 'rgba(30, 5, 2, 0.68)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.panel(ctx, CANVAS_W / 2 - 340, 118, 680, 496);
    this.titleText(ctx, 'CAUGHT!', CANVAS_W / 2, 178, 64, '#ff5a3c');
    this.titleText(ctx, 'The farmer got you. The oven is preheating.', CANVAS_W / 2, 228, 21, '#ffd98a');
    this._endStats(ctx, game, 276);
    const cx = CANVAS_W / 2;
    this.button(ctx, 'retry', cx - 170, 490, 340, 56, '↻ RUN AGAIN', { fontSize: 26 });
    this.button(ctx, 'title', cx - 170, 554, 340, 44, 'TITLE SCREEN', { fontSize: 20, fill: '#5a3a1e' });
  }

  drawEscaped(ctx, game, input) {
    this.clearButtons();
    ctx.fillStyle = 'rgba(10, 30, 8, 0.55)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.panel(ctx, CANVAS_W / 2 - 340, 118, 680, 496, 'rgba(12, 40, 14, 0.88)', 'rgba(127, 174, 76, 0.95)');
    this.titleText(ctx, 'ESCAPED!', CANVAS_W / 2, 178, 64, '#7fae4c');
    this.titleText(ctx, 'Giblet slipped through the forest gate. December is yours!', CANVAS_W / 2, 228, 21, '#ffd98a');
    this._endStats(ctx, game, 276);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23e';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`🏆 New best: ${formatScore(game.score)} pts`, CANVAS_W / 2, 466);
    ctx.restore();
    const cx = CANVAS_W / 2;
    this.button(ctx, 'retry', cx - 170, 490, 340, 56, '↻ RUN AGAIN', { fontSize: 26 });
    this.button(ctx, 'title', cx - 170, 554, 340, 44, 'TITLE SCREEN', { fontSize: 20, fill: '#5a3a1e' });
  }

  _endStats(ctx, game, y) {
    const p = game.player;
    const rows = [
      ['Score', formatScore(game.score)],
      ['Distance', formatDistance(game.world.distanceM)],
      ['Time', formatTime(game.runTime)],
      ['Corn grabbed', `${game.stats.corn}`],
      ['Golden feathers', `${game.stats.feathers}`],
      ['Obstacles cleared', `${game.stats.cleared}`],
      ['Close calls', `${game.stats.nearMisses}`],
      ['Best combo', `x${game.stats.bestCombo}`],
      ['Zone reached', game.world.zone.name],
    ];
    ctx.save();
    ctx.textAlign = 'left';
    let yy = y;
    for (const [k, v] of rows) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `17px ${FONT}`;
      ctx.fillText(k, CANVAS_W / 2 - 240, yy);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 17px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(v, CANVAS_W / 2 + 240, yy);
      ctx.textAlign = 'left';
      yy += 22;
    }
    ctx.restore();
  }
}
