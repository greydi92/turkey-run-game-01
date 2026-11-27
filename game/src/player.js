// player.js — the turkey: Giblet. Running, jumping (with a double jump),
// sliding, dashing and hiding, plus hearts, invulnerability, shields and
// the combo that rewards greedy corn grabbing.

import {
  CANVAS_W, GROUND_Y, PLAYER_X, GRAVITY, JUMP_VELOCITY, DOUBLE_JUMP_VELOCITY,
  DASH_SPEED_BONUS, DASH_DURATION, DASH_COOLDOWN, SLIDE_DURATION,
  HIDE_MAX_TIME, PLAYER_MAX_HEARTS, COMBO_WINDOW_S, COMBO_MAX,
  SLOWMO_DURATION_S,
} from './config.js';
import { clamp } from './random.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = PLAYER_X;
    this.y = GROUND_Y; // feet position
    this.vy = 0;
    this.w = 56;
    this.h = 78;
    this.onGround = true;
    this.jumpsUsed = 0;
    this.sliding = false;
    this.slideT = 0;
    this.dashing = false;
    this.dashT = 0;
    this.dashCooldown = 0;
    this.hiding = false;
    this.hideT = 0;
    this.hideMaxTime = HIDE_MAX_TIME;
    this.hearts = PLAYER_MAX_HEARTS;
    this.maxHearts = PLAYER_MAX_HEARTS;
    this.invulnerableT = 0;
    this.shield = false;
    this.slowmoT = 0;
    this.runPhase = 0;
    this.speed = 0; // current scroll speed, set by the game each frame
    this.stumbleT = 0;
    this.combo = 0;
    this.comboT = 0;
    this.feathersBanked = 0;
    this.outfit = null;
    this.scoreBonus = 0;
    this.blinkT = 2.5;
    this.groundedT = 0;
    this.coyoteT = 0; // grace window to jump just after leaving a ledge
    this.jumpBufferT = 0; // jump pressed slightly before landing still jumps
    this.distanceAtLastStumble = 0;
  }

  // The turkey's solid box, in screen coordinates. Sliding halves height.
  box() {
    if (this.sliding) {
      return { x: this.x - 26, y: this.y - 34, w: 62, h: 34 };
    }
    if (this.hiding) {
      return { x: this.x - 20, y: this.y - 30, w: 40, h: 30 };
    }
    return { x: this.x - 26, y: this.y - this.h, w: 52, h: this.h };
  }

  get invulnerable() {
    return this.invulnerableT > 0;
  }

  get canHide() {
    return this.onGround && !this.sliding && !this.dashing;
  }

  tryJump(audio) {
    if (this.hiding) {
      // Bolting out of the haystack: stand up first, then jump. The
      // game notices the hide ended and puts the farmer back on chase.
      this.stopHiding();
    }
    if (this.sliding) {
      this.sliding = false;
      this.slideT = 0;
    }
    if (this.onGround || this.coyoteT > 0) {
      this.vy = -JUMP_VELOCITY;
      this.onGround = false;
      this.jumpsUsed = 1;
      this.coyoteT = 0;
      this.jumpBufferT = 0;
      if (audio) audio.jump();
      return true;
    }
    if (this.jumpsUsed < 2) {
      this.vy = -DOUBLE_JUMP_VELOCITY;
      this.jumpsUsed = 2;
      this.jumpBufferT = 0;
      if (audio) audio.doubleJump();
      return true;
    }
    return false;
  }

  trySlide(audio) {
    if (!this.onGround || this.hiding) return false;
    if (this.sliding) return false;
    this.sliding = true;
    this.slideT = SLIDE_DURATION;
    if (audio) audio.slide();
    return true;
  }

  tryDash(audio) {
    if (this.dashCooldown > 0 || this.hiding) return false;
    this.dashing = true;
    this.dashT = DASH_DURATION;
    this.dashCooldown = DASH_COOLDOWN;
    if (audio) audio.dash();
    return true;
  }

  tryHide(audio, nearHaystack) {
    if (!this.canHide || !nearHaystack) return false;
    if (this.hiding) return false;
    this.hiding = true;
    this.hideT = 0;
    if (audio) audio.hideRustle();
    return true;
  }

  stopHiding() {
    this.hiding = false;
    this.hideT = 0;
  }

  heal(amount) {
    this.hearts = clamp(this.hearts + amount, 0, this.maxHearts);
  }

  // Returns 'blocked' when the shield ate the hit, 'hurt' when a heart
  // was lost, 'dead' when the last heart went.
  takeHit(audio) {
    if (this.invulnerableT > 0 || this.hiding) return 'ignored';
    if (this.shield) {
      this.shield = false;
      this.invulnerableT = 1.2;
      if (audio) audio.shieldUp();
      return 'blocked';
    }
    this.hearts -= 1;
    this.invulnerableT = 1.6;
    this.stumbleT = 0.45;
    if (audio) audio.hit();
    return this.hearts <= 0 ? 'dead' : 'hurt';
  }

  addScore(base, game) {
    const mult = 1 + (this.combo - 1) * 0.25;
    const gained = Math.round(base * mult * (1 + this.scoreBonus));
    game.score += gained;
    return gained;
  }

  registerPickup(game) {
    this.combo = clamp(this.combo + 1, 1, COMBO_MAX);
    this.comboT = COMBO_WINDOW_S;
  }

  update(dt, input, audio) {
    // Timers.
    if (this.invulnerableT > 0) this.invulnerableT -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.slowmoT > 0) this.slowmoT -= dt;
    if (this.stumbleT > 0) this.stumbleT -= dt;
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    if (this.blinkT > 0) {
      this.blinkT -= dt;
    } else {
      this.blinkT = 2 + Math.random() * 3;
    }

    const stumbleSlow = this.stumbleT > 0 ? 0.55 : 1;

    // Jump buffering: a jump pressed just before landing still fires.
    if (input.jumpPressed) {
      this.jumpBufferT = 0.14;
      this.tryJump(audio);
    }
    if (this.jumpBufferT > 0) {
      this.jumpBufferT -= dt;
      if (this.onGround) this.tryJump(audio);
    }
    if (input.slideHeld && this.onGround && !this.hiding) {
      if (!this.sliding) this.trySlide(audio);
    }
    if (input.dashPressed) this.tryDash(audio);

    // Slide timer.
    if (this.sliding) {
      this.slideT -= dt;
      if (this.slideT <= 0 || !this.onGround) {
        this.sliding = false;
        this.slideT = 0;
      }
    }

    // Dash timer.
    if (this.dashing) {
      this.dashT -= dt;
      if (this.dashT <= 0) this.dashing = false;
    }

    // Vertical physics.
    if (!this.onGround) {
      this.vy += GRAVITY * dt;
      // Hold jump to float a touch longer; release to fall faster.
      if (this.vy > 0 && !input.jumpHeld) this.vy += GRAVITY * 0.9 * dt;
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.onGround = true;
        this.jumpsUsed = 0;
        this.groundedT = 0;
        if (audio) audio.land();
      }
    } else {
      this.groundedT += dt;
      this.coyoteT = 0.09;
    }
    if (this.coyoteT > 0) this.coyoteT -= dt;

    // Hiding timer.
    if (this.hiding) {
      this.hideT += dt;
      if (this.hideT >= this.hideMaxTime) {
        this.stopHiding();
      }
    }

    // Run animation phase advances with speed.
    this.runPhase += dt * (this.speed / 28) * stumbleSlow;
    return stumbleSlow;
  }

  get dashBonus() {
    return this.dashing ? DASH_SPEED_BONUS : 0;
  }

  get slowmoActive() {
    return this.slowmoT > 0;
  }
}
