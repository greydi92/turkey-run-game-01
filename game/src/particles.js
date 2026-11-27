// particles.js — feathers, dust, sparkles, floating score text and the
// little screen shake that sells a hit. Pure presentation, no gameplay.

import { makeRng } from './random.js';

export class Particles {
  constructor() {
    this.list = [];
    this.texts = [];
    this.shakeT = 0;
    this.shakeMag = 0;
    this.rng = makeRng(987654321);
  }

  reset() {
    this.list = [];
    this.texts = [];
    this.shakeT = 0;
    this.shakeMag = 0;
  }

  burst(x, y, opts = {}) {
    const {
      count = 12, color = '#f2c531', speed = 160, size = 4, life = 0.7,
      gravity = 300, spread = Math.PI * 2, dir = -Math.PI / 2,
    } = opts;
    for (let i = 0; i < count; i++) {
      const a = dir + (this.rng.next() - 0.5) * spread;
      const v = speed * (0.4 + this.rng.next() * 0.8);
      this.list.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        size: size * (0.6 + this.rng.next() * 0.8),
        color,
        life: life * (0.7 + this.rng.next() * 0.6),
        maxLife: life,
        gravity,
        rot: this.rng.next() * Math.PI * 2,
        rotV: (this.rng.next() - 0.5) * 10,
        shape: this.rng.pick(['circle', 'feather', 'leaf', 'star']),
      });
    }
  }

  feathers(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      this.list.push({
        x: x + (this.rng.next() - 0.5) * 30,
        y: y + (this.rng.next() - 0.5) * 20,
        vx: (this.rng.next() - 0.5) * 60 - 40,
        vy: -40 - this.rng.next() * 80,
        size: 7 + this.rng.next() * 5,
        color: this.rng.pick(['#8a5a2b', '#c96a2e', '#d9a441', '#f2f2f2']),
        life: 1.1 + this.rng.next() * 0.6,
        maxLife: 1.4,
        gravity: 160,
        rot: this.rng.next() * Math.PI * 2,
        rotV: (this.rng.next() - 0.5) * 6,
        shape: 'feather',
      });
    }
  }

  dust(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      this.list.push({
        x: x + (this.rng.next() - 0.5) * 20,
        y: y - this.rng.next() * 6,
        vx: -60 - this.rng.next() * 60,
        vy: -10 - this.rng.next() * 30,
        size: 4 + this.rng.next() * 5,
        color: '#c9a06a',
        life: 0.5 + this.rng.next() * 0.3,
        maxLife: 0.8,
        gravity: -20,
        rot: 0,
        rotV: 0,
        shape: 'circle',
      });
    }
  }

  sparkle(x, y, count = 10, color = '#ffd23e') {
    this.burst(x, y, { count, color, speed: 120, size: 3.5, life: 0.6, gravity: 60, shape: 'star' });
  }

  leaves(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      this.list.push({
        x: x + (this.rng.next() - 0.5) * 120,
        y: y - this.rng.next() * 40,
        vx: -30 - this.rng.next() * 50,
        vy: 20 + this.rng.next() * 40,
        size: 5 + this.rng.next() * 4,
        color: this.rng.pick(['#e86a1c', '#f2a541', '#c94f2e', '#d9a441']),
        life: 1.6 + this.rng.next(),
        maxLife: 2.2,
        gravity: 30,
        rot: this.rng.next() * Math.PI * 2,
        rotV: (this.rng.next() - 0.5) * 8,
        shape: 'leaf',
      });
    }
  }

  floatText(x, y, text, color = '#ffffff', size = 22) {
    this.texts.push({ x, y, text, color, size, life: 1.1, maxLife: 1.1 });
  }

  shake(mag, dur = 0.35) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, dur);
  }

  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.rot += p.rotV * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 46 * dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      if (this.shakeT <= 0) this.shakeMag = 0;
    }
  }

  shakeOffset() {
    if (this.shakeT <= 0) return { x: 0, y: 0 };
    const m = this.shakeMag * (this.shakeT / 0.35);
    return {
      x: (this.rng.next() - 0.5) * 2 * m,
      y: (this.rng.next() - 0.5) * 2 * m,
    };
  }

  draw(ctx) {
    for (const p of this.list) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'feather') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.45, p.size, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'leaf') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r = i % 2 === 0 ? p.size : p.size * 0.4;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    for (const t of this.texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${t.size}px "Trebuchet MS", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }
}
