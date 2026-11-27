// sprites.js — every picture in the game is drawn here with canvas paths.
// No image files, no copied art: an original turkey, an original farmer,
// an original oven and carving knife, and the farm-to-kitchen scenery.
// All drawing functions take (ctx, x, y, scale, opts) and draw in local
// coordinates with the feet at (x, y).

export function drawEllipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function featherFan(ctx, x, y, scale, spread, colors) {
  // The turkey's tail fan: five overlapping feather ellipses.
  for (let i = -2; i <= 2; i++) {
    const angle = (i / 2) * spread;
    const fx = x + Math.sin(angle) * 26 * scale;
    const fy = y - Math.cos(angle) * 30 * scale;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(angle * 0.9);
    ctx.fillStyle = colors[(i + 2) % colors.length];
    drawEllipse(ctx, 0, 0, 9 * scale, 24 * scale);
    ctx.fillStyle = '#f2c531';
    drawEllipse(ctx, 0, -6 * scale, 4 * scale, 10 * scale);
    ctx.restore();
  }
}

export function drawTurkey(ctx, x, y, scale, opts = {}) {
  const {
    runPhase = 0,
    jumping = false,
    sliding = false,
    hiding = false,
    dashing = false,
    outfit = null,
    blink = false,
    hurtFlash = false,
  } = opts;
  const legSwing = jumping ? 0.5 : Math.sin(runPhase) * 0.7;
  const bob = jumping ? 0 : Math.abs(Math.sin(runPhase)) * 3 * scale;

  ctx.save();
  ctx.translate(x, y - bob);
  if (dashing) ctx.scale(1.15, 0.9);
  if (sliding) ctx.scale(1.25, 0.62);
  if (hiding) ctx.globalAlpha = 0.25;

  // Shadow is drawn by the caller on the ground; the body sits above it.
  const bodyColor = hurtFlash ? '#ffffff' : '#8a5a2b';
  const bellyColor = hurtFlash ? '#ffe9c9' : '#d9a441';
  const wingColor = hurtFlash ? '#e8e8e8' : '#6e4520';

  // Tail fan.
  featherFan(ctx, -26 * scale, -34 * scale, scale, 0.55, ['#a0522d', '#c96a2e', '#7a3b12', '#c96a2e', '#a0522d']);

  // Legs — two orange sticks with feet, animated by runPhase.
  ctx.strokeStyle = '#e8803a';
  ctx.lineWidth = 5 * scale;
  ctx.lineCap = 'round';
  const legY = -2 * scale;
  ctx.beginPath();
  ctx.moveTo(-6 * scale, -16 * scale);
  ctx.lineTo(-6 * scale + legSwing * 12 * scale, legY);
  ctx.moveTo(8 * scale, -16 * scale);
  ctx.lineTo(8 * scale - legSwing * 12 * scale, legY);
  ctx.stroke();
  // Feet.
  ctx.fillStyle = '#e8803a';
  drawEllipse(ctx, -6 * scale + legSwing * 12 * scale, 0, 9 * scale, 3.5 * scale);
  drawEllipse(ctx, 8 * scale - legSwing * 12 * scale, 0, 9 * scale, 3.5 * scale);

  // Body: a plump brown oval.
  ctx.fillStyle = bodyColor;
  drawEllipse(ctx, 0, -34 * scale, 30 * scale, 26 * scale);
  // Belly patch.
  ctx.fillStyle = bellyColor;
  drawEllipse(ctx, 6 * scale, -28 * scale, 19 * scale, 16 * scale);
  // Wing, flapping a little while running.
  const wingFlap = jumping ? -0.5 : Math.sin(runPhase * 1.4) * 0.18;
  ctx.save();
  ctx.translate(-4 * scale, -34 * scale);
  ctx.rotate(wingFlap);
  ctx.fillStyle = wingColor;
  drawEllipse(ctx, -6 * scale, 0, 16 * scale, 11 * scale);
  ctx.restore();

  // Neck and head.
  ctx.fillStyle = bodyColor;
  ctx.fillRect(14 * scale, -66 * scale, 12 * scale, 34 * scale);
  ctx.fillStyle = hurtFlash ? '#ffffff' : '#c96a2e';
  drawEllipse(ctx, 22 * scale, -70 * scale, 13 * scale, 12 * scale);
  // Beak.
  ctx.fillStyle = '#f2c531';
  ctx.beginPath();
  ctx.moveTo(32 * scale, -72 * scale);
  ctx.lineTo(46 * scale, -68 * scale);
  ctx.lineTo(32 * scale, -64 * scale);
  ctx.closePath();
  ctx.fill();
  // Wattle.
  ctx.fillStyle = '#d94f30';
  drawEllipse(ctx, 30 * scale, -60 * scale, 4 * scale, 8 * scale);
  // Eye.
  if (!blink) {
    ctx.fillStyle = '#1a1a1a';
    drawEllipse(ctx, 25 * scale, -73 * scale, 2.6 * scale, 3.4 * scale);
    ctx.fillStyle = '#ffffff';
    drawEllipse(ctx, 26 * scale, -74 * scale, 1 * scale, 1.2 * scale);
  } else {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    ctx.moveTo(22 * scale, -73 * scale);
    ctx.lineTo(28 * scale, -73 * scale);
    ctx.stroke();
  }
  // Snood.
  ctx.fillStyle = '#d94f30';
  ctx.beginPath();
  ctx.moveTo(30 * scale, -76 * scale);
  ctx.quadraticCurveTo(36 * scale, -70 * scale, 30 * scale, -66 * scale);
  ctx.closePath();
  ctx.fill();

  // Outfits bought with golden feathers.
  if (outfit === 'pilgrim') drawPilgrimHat(ctx, 22 * scale, -80 * scale, scale);
  if (outfit === 'chef') drawChefHat(ctx, 22 * scale, -80 * scale, scale);
  if (outfit === 'cape') drawCape(ctx, -6 * scale, -52 * scale, scale);
  if (outfit === 'crown') drawCornCrown(ctx, 22 * scale, -80 * scale, scale);
  if (outfit === 'ninja') drawBandana(ctx, 22 * scale, -72 * scale, scale);
  if (outfit === 'gold') drawGoldSheen(ctx, 0, -34 * scale, scale);

  ctx.restore();
}

function drawPilgrimHat(ctx, x, y, scale) {
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(x - 13 * scale, y - 6 * scale, 26 * scale, 7 * scale);
  ctx.fillRect(x - 8 * scale, y - 22 * scale, 16 * scale, 17 * scale);
  ctx.fillStyle = '#f2c531';
  ctx.fillRect(x - 8 * scale, y - 9 * scale, 16 * scale, 3 * scale);
}

function drawChefHat(ctx, x, y, scale) {
  ctx.fillStyle = '#f7f7f7';
  drawEllipse(ctx, x - 7 * scale, y - 14 * scale, 8 * scale, 9 * scale);
  drawEllipse(ctx, x, y - 18 * scale, 9 * scale, 10 * scale);
  drawEllipse(ctx, x + 7 * scale, y - 14 * scale, 8 * scale, 9 * scale);
  ctx.fillRect(x - 12 * scale, y - 10 * scale, 24 * scale, 6 * scale);
}

function drawCape(ctx, x, y, scale) {
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 34 * scale, y + 8 * scale, x - 30 * scale, y + 34 * scale);
  ctx.lineTo(x + 22 * scale, y + 34 * scale);
  ctx.quadraticCurveTo(x + 26 * scale, y + 8 * scale, x, y);
  ctx.closePath();
  ctx.fill();
}

function drawCornCrown(ctx, x, y, scale) {
  ctx.fillStyle = '#f2c531';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 7 * scale - 3 * scale, y);
    ctx.lineTo(x + i * 7 * scale, y - (10 - Math.abs(i) * 2) * scale);
    ctx.lineTo(x + i * 7 * scale + 3 * scale, y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBandana(ctx, x, y, scale) {
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(x - 13 * scale, y - 4 * scale, 27 * scale, 7 * scale);
  ctx.beginPath();
  ctx.moveTo(x - 13 * scale, y + 2 * scale);
  ctx.lineTo(x - 24 * scale, y + 10 * scale);
  ctx.lineTo(x - 20 * scale, y - 2 * scale);
  ctx.closePath();
  ctx.fill();
}

function drawGoldSheen(ctx, x, y, scale) {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffd23e';
  drawEllipse(ctx, x, y, 30 * scale, 26 * scale);
  ctx.restore();
}

export function drawFarmer(ctx, x, y, scale, opts = {}) {
  const {
    runPhase = 0,
    searching = false,
    angry = false,
    carryingKnife = true,
    facing = 1,
  } = opts;
  const legSwing = Math.sin(runPhase) * 0.8;
  const armSwing = Math.sin(runPhase) * 0.5;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);

  // Legs: blue overalls, running.
  ctx.strokeStyle = '#2e4a7a';
  ctx.lineWidth = 9 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4 * scale, -46 * scale);
  ctx.lineTo(-4 * scale + legSwing * 16 * scale, -2 * scale);
  ctx.moveTo(6 * scale, -46 * scale);
  ctx.lineTo(6 * scale - legSwing * 16 * scale, -2 * scale);
  ctx.stroke();
  // Boots.
  ctx.fillStyle = '#4a2c14';
  drawEllipse(ctx, -4 * scale + legSwing * 16 * scale, -2 * scale, 11 * scale, 4.5 * scale);
  drawEllipse(ctx, 6 * scale - legSwing * 16 * scale, -2 * scale, 11 * scale, 4.5 * scale);

  // Body: red plaid shirt.
  ctx.fillStyle = angry ? '#b03a2e' : '#c0392b';
  ctx.fillRect(-16 * scale, -92 * scale, 34 * scale, 48 * scale);
  ctx.strokeStyle = '#7b241c';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(-16 * scale, -76 * scale); ctx.lineTo(18 * scale, -76 * scale);
  ctx.moveTo(-16 * scale, -60 * scale); ctx.lineTo(18 * scale, -60 * scale);
  ctx.moveTo(-4 * scale, -92 * scale); ctx.lineTo(-4 * scale, -44 * scale);
  ctx.moveTo(8 * scale, -92 * scale); ctx.lineTo(8 * scale, -44 * scale);
  ctx.stroke();
  // Overall straps.
  ctx.fillStyle = '#2e4a7a';
  ctx.fillRect(-12 * scale, -92 * scale, 5 * scale, 20 * scale);
  ctx.fillRect(8 * scale, -92 * scale, 5 * scale, 20 * scale);

  // Arms: one reaching forward, one holding the knife.
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 8 * scale;
  ctx.beginPath();
  ctx.moveTo(14 * scale, -84 * scale);
  ctx.lineTo(30 * scale + armSwing * 6 * scale, -70 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14 * scale, -84 * scale);
  ctx.lineTo(-26 * scale - armSwing * 6 * scale, -66 * scale);
  ctx.stroke();
  // Hands.
  ctx.fillStyle = '#e8b88a';
  drawEllipse(ctx, 30 * scale + armSwing * 6 * scale, -70 * scale, 5 * scale, 5 * scale);
  drawEllipse(ctx, -26 * scale - armSwing * 6 * scale, -66 * scale, 5 * scale, 5 * scale);

  // Head with straw hat.
  ctx.fillStyle = '#e8b88a';
  drawEllipse(ctx, 2 * scale, -104 * scale, 14 * scale, 13 * scale);
  // Straw hat.
  ctx.fillStyle = '#d9a441';
  drawEllipse(ctx, 2 * scale, -114 * scale, 24 * scale, 5 * scale);
  ctx.fillRect(-10 * scale, -128 * scale, 24 * scale, 15 * scale);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-10 * scale, -116 * scale, 24 * scale, 3 * scale);
  // Moustache.
  ctx.fillStyle = '#5a3a1e';
  drawEllipse(ctx, -2 * scale, -98 * scale, 8 * scale, 3 * scale);
  drawEllipse(ctx, 7 * scale, -98 * scale, 8 * scale, 3 * scale);
  // Eyes: angry brows when chasing, scanning dots when searching.
  ctx.fillStyle = '#1a1a1a';
  if (searching) {
    drawEllipse(ctx, -3 * scale, -106 * scale, 2 * scale, 2 * scale);
    drawEllipse(ctx, 8 * scale, -106 * scale, 2 * scale, 2 * scale);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(-6 * scale, -112 * scale); ctx.lineTo(0 * scale, -112 * scale);
    ctx.moveTo(5 * scale, -112 * scale); ctx.lineTo(11 * scale, -112 * scale);
    ctx.stroke();
  } else {
    drawEllipse(ctx, -3 * scale, -106 * scale, 2.4 * scale, 3 * scale);
    drawEllipse(ctx, 8 * scale, -106 * scale, 2.4 * scale, 3 * scale);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(-6 * scale, -112 * scale); ctx.lineTo(0 * scale, -109 * scale);
    ctx.moveTo(5 * scale, -109 * scale); ctx.lineTo(11 * scale, -112 * scale);
    ctx.stroke();
  }

  // The carving knife, held high.
  if (carryingKnife) {
    ctx.save();
    ctx.translate(-26 * scale - armSwing * 6 * scale, -66 * scale);
    ctx.rotate(-0.7 + Math.sin(runPhase) * 0.1);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(-3 * scale, 0, 6 * scale, 16 * scale);
    ctx.fillStyle = '#dfe6ee';
    ctx.beginPath();
    ctx.moveTo(-4 * scale, 0);
    ctx.lineTo(4 * scale, 0);
    ctx.lineTo(0 * scale, -34 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

export function drawOven(ctx, x, y, scale, opts = {}) {
  const { heat = 0.5, open = false } = opts;
  ctx.save();
  ctx.translate(x, y);
  // Body.
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(-65 * scale, -150 * scale, 130 * scale, 150 * scale);
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(-65 * scale, -150 * scale, 130 * scale, 12 * scale);
  // Door window, glowing with heat.
  const glow = 0.5 + heat * 0.5;
  ctx.fillStyle = `rgba(255, ${Math.floor(120 + glow * 80)}, 30, ${0.75 + glow * 0.25})`;
  ctx.fillRect(-45 * scale, -110 * scale, 90 * scale, 70 * scale);
  ctx.strokeStyle = '#1e1e24';
  ctx.lineWidth = 6 * scale;
  ctx.strokeRect(-45 * scale, -110 * scale, 90 * scale, 70 * scale);
  // Heat shimmer lines.
  ctx.strokeStyle = `rgba(255, 180, 60, ${0.4 + heat * 0.4})`;
  ctx.lineWidth = 3 * scale;
  for (let i = 0; i < 3; i++) {
    const hx = -30 * scale + i * 30 * scale;
    ctx.beginPath();
    ctx.moveTo(hx, -116 * scale);
    ctx.quadraticCurveTo(hx + 6 * scale, -126 * scale, hx, -136 * scale);
    ctx.stroke();
  }
  // Control knobs.
  ctx.fillStyle = '#dfe6ee';
  for (let i = 0; i < 3; i++) {
    drawEllipse(ctx, -36 * scale + i * 36 * scale, -134 * scale, 7 * scale, 7 * scale);
  }
  // Thermometer that reads "TOO HOT".
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(38 * scale, -146 * scale, 20 * scale, 8 * scale);
  ctx.restore();
}

export function drawCarvingKnife(ctx, x, y, scale, rotation = 0, opts = {}) {
  const { glow = false } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (glow) {
    ctx.shadowColor = '#ff5a3c';
    ctx.shadowBlur = 18 * scale;
  }
  // Handle.
  ctx.fillStyle = '#4a2c14';
  ctx.fillRect(-5 * scale, 0, 10 * scale, 26 * scale);
  ctx.fillStyle = '#d9a441';
  ctx.fillRect(-5 * scale, 0, 10 * scale, 4 * scale);
  // Blade.
  const grad = ctx.createLinearGradient(-8 * scale, -70 * scale, 8 * scale, 0);
  grad.addColorStop(0, '#e8eef5');
  grad.addColorStop(0.5, '#c0c8d0');
  grad.addColorStop(1, '#9aa4ae');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-8 * scale, 0);
  ctx.lineTo(8 * scale, 0);
  ctx.lineTo(6 * scale, -52 * scale);
  ctx.lineTo(0 * scale, -70 * scale);
  ctx.lineTo(-8 * scale, -52 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawFence(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-13 * scale, -74 * scale, 7 * scale, 74 * scale);
  ctx.fillRect(6 * scale, -74 * scale, 7 * scale, 74 * scale);
  ctx.fillStyle = '#a06a35';
  ctx.fillRect(-16 * scale, -68 * scale, 32 * scale, 8 * scale);
  ctx.fillRect(-16 * scale, -40 * scale, 32 * scale, 8 * scale);
  ctx.restore();
}

export function drawHayBale(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#d9a441';
  drawEllipse(ctx, 0, -29 * scale, 37 * scale, 29 * scale);
  ctx.strokeStyle = '#b57f22';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.ellipse(0, -29 * scale, 28 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -29 * scale, 18 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawHaystack(ctx, x, y, scale, opts = {}) {
  const { rustle = 0, glint = 0 } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#e0aa3e';
  ctx.beginPath();
  ctx.moveTo(-52 * scale, 0);
  ctx.quadraticCurveTo(-40 * scale, -78 * scale, 0, -84 * scale);
  ctx.quadraticCurveTo(40 * scale, -78 * scale, 52 * scale, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b57f22';
  ctx.lineWidth = 2.5 * scale;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 16 * scale, -70 * scale + Math.abs(i) * 12 * scale);
    ctx.quadraticCurveTo(i * 16 * scale + rustle * 6 * scale, -30 * scale, i * 18 * scale, -4 * scale);
    ctx.stroke();
  }
  // Glint: a pulsing golden star above the haystack, so a hiding spot
  // reads as an invitation instead of scenery.
  if (glint > 0) {
    ctx.save();
    ctx.globalAlpha = glint;
    ctx.fillStyle = '#ffd23e';
    ctx.translate(0, -100 * scale);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? 12 * scale : 5 * scale;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export function drawPumpkin(ctx, x, y, scale, opts = {}) {
  const { face = false, rolling = false, rollPhase = 0 } = opts;
  ctx.save();
  ctx.translate(x, y);
  if (rolling) ctx.rotate(rollPhase);
  ctx.fillStyle = '#e86a1c';
  drawEllipse(ctx, 0, -26 * scale, 29 * scale, 26 * scale);
  ctx.fillStyle = '#d95a10';
  drawEllipse(ctx, -12 * scale, -26 * scale, 12 * scale, 24 * scale);
  drawEllipse(ctx, 12 * scale, -26 * scale, 12 * scale, 24 * scale);
  ctx.strokeStyle = '#b84a08';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(0, -52 * scale);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = '#4e7a3a';
  ctx.fillRect(-3 * scale, -60 * scale, 6 * scale, 10 * scale);
  if (face) {
    ctx.fillStyle = '#3a1e08';
    // Triangle eyes.
    ctx.beginPath();
    ctx.moveTo(-16 * scale, -34 * scale); ctx.lineTo(-8 * scale, -34 * scale); ctx.lineTo(-12 * scale, -26 * scale);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8 * scale, -34 * scale); ctx.lineTo(16 * scale, -34 * scale); ctx.lineTo(12 * scale, -26 * scale);
    ctx.closePath(); ctx.fill();
    // Jagged grin.
    ctx.beginPath();
    ctx.moveTo(-16 * scale, -16 * scale);
    ctx.lineTo(-8 * scale, -10 * scale);
    ctx.lineTo(0, -16 * scale);
    ctx.lineTo(8 * scale, -10 * scale);
    ctx.lineTo(16 * scale, -16 * scale);
    ctx.lineTo(16 * scale, -12 * scale);
    ctx.lineTo(-16 * scale, -12 * scale);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawCorn(ctx, x, y, scale, bob = 0) {
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = '#4e7a3a';
  ctx.beginPath();
  ctx.moveTo(-8 * scale, 10 * scale);
  ctx.lineTo(-16 * scale, 22 * scale);
  ctx.lineTo(0, 18 * scale);
  ctx.lineTo(16 * scale, 22 * scale);
  ctx.lineTo(8 * scale, 10 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2c531';
  drawEllipse(ctx, 0, -8 * scale, 13 * scale, 20 * scale);
  ctx.strokeStyle = '#d9a41f';
  ctx.lineWidth = 1.6 * scale;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 7 * scale, -26 * scale);
    ctx.lineTo(i * 7 * scale, 10 * scale);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFeather(ctx, x, y, scale, bob = 0, golden = true) {
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(-0.4 + Math.sin(bob * 0.1) * 0.1);
  ctx.fillStyle = golden ? '#ffd23e' : '#c96a2e';
  ctx.beginPath();
  ctx.ellipse(0, -10 * scale, 9 * scale, 20 * scale, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = golden ? '#d9a41f' : '#8a4a1a';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(0, 12 * scale);
  ctx.lineTo(4 * scale, -28 * scale);
  ctx.stroke();
  ctx.restore();
}

export function drawPie(ctx, x, y, scale, bob = 0) {
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = '#e8803a';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-20 * scale, -18 * scale);
  ctx.lineTo(20 * scale, -18 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2c531';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-20 * scale, -18 * scale);
  ctx.lineTo(20 * scale, -18 * scale);
  ctx.closePath();
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f7f7f7';
  drawEllipse(ctx, 0, -16 * scale, 9 * scale, 5 * scale);
  ctx.restore();
}

export function drawGravyBoat(ctx, x, y, scale, bob = 0) {
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = '#b5762e';
  ctx.beginPath();
  ctx.moveTo(-20 * scale, -8 * scale);
  ctx.quadraticCurveTo(-22 * scale, 12 * scale, 0, 12 * scale);
  ctx.quadraticCurveTo(22 * scale, 12 * scale, 20 * scale, -8 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(16 * scale, -12 * scale, 8 * scale, 8 * scale);
  ctx.fillStyle = '#d9a441';
  drawEllipse(ctx, 0, -8 * scale, 16 * scale, 4 * scale);
  ctx.restore();
}

export function drawStuffing(ctx, x, y, scale, bob = 0) {
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = '#8a5a2b';
  drawEllipse(ctx, 0, -6 * scale, 18 * scale, 14 * scale);
  ctx.fillStyle = '#4e7a3a';
  drawEllipse(ctx, -8 * scale, -14 * scale, 4 * scale, 3 * scale);
  drawEllipse(ctx, 6 * scale, -12 * scale, 4 * scale, 3 * scale);
  ctx.fillStyle = '#d94f30';
  drawEllipse(ctx, 0, -18 * scale, 3 * scale, 3 * scale);
  ctx.restore();
}

export function drawScarecrow(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  // Pole.
  ctx.fillStyle = '#6e4520';
  ctx.fillRect(-3 * scale, -110 * scale, 6 * scale, 110 * scale);
  ctx.fillRect(-40 * scale, -84 * scale, 80 * scale, 6 * scale);
  // Shirt.
  ctx.fillStyle = '#7a5a30';
  ctx.beginPath();
  ctx.moveTo(-30 * scale, -84 * scale);
  ctx.lineTo(30 * scale, -84 * scale);
  ctx.lineTo(22 * scale, -40 * scale);
  ctx.lineTo(-22 * scale, -40 * scale);
  ctx.closePath();
  ctx.fill();
  // Head: a pumpkin with a hat.
  drawPumpkin(ctx, 0, -96 * scale, 0.55, { face: true });
  ctx.fillStyle = '#3a3a3a';
  drawEllipse(ctx, 0, -128 * scale, 20 * scale, 4 * scale);
  ctx.fillRect(-11 * scale, -142 * scale, 22 * scale, 15 * scale);
  // Straw hands.
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 3 * scale;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-40 * scale, -84 * scale);
    ctx.lineTo(-48 * scale, -78 * scale + i * 4 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40 * scale, -84 * scale);
    ctx.lineTo(48 * scale, -78 * scale + i * 4 * scale);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBarn(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#a83a24';
  ctx.fillRect(-90 * scale, -140 * scale, 180 * scale, 140 * scale);
  ctx.beginPath();
  ctx.moveTo(-100 * scale, -140 * scale);
  ctx.lineTo(0, -200 * scale);
  ctx.lineTo(100 * scale, -140 * scale);
  ctx.closePath();
  ctx.fillStyle = '#7c2a1c';
  ctx.fill();
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.moveTo(-100 * scale, -140 * scale);
  ctx.lineTo(0, -200 * scale);
  ctx.lineTo(100 * scale, -140 * scale);
  ctx.lineTo(100 * scale, -128 * scale);
  ctx.lineTo(0, -186 * scale);
  ctx.lineTo(-100 * scale, -128 * scale);
  ctx.closePath();
  ctx.fill();
  // Big door with X brace.
  ctx.fillStyle = '#5a2e1e';
  ctx.fillRect(-40 * scale, -90 * scale, 80 * scale, 90 * scale);
  ctx.strokeStyle = '#f2f2f2';
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(-40 * scale, -90 * scale); ctx.lineTo(40 * scale, 0);
  ctx.moveTo(40 * scale, -90 * scale); ctx.lineTo(-40 * scale, 0);
  ctx.stroke();
  ctx.restore();
}

export function drawTree(ctx, x, y, scale, opts = {}) {
  const { autumn = true } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(-8 * scale, -90 * scale, 16 * scale, 90 * scale);
  const colors = autumn ? ['#e86a1c', '#f2a541', '#c94f2e'] : ['#4e7a3a', '#5d8a44', '#3e6a2e'];
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    drawEllipse(ctx, (i - 1) * 26 * scale, -110 * scale - i * 8 * scale, 34 * scale, 28 * scale);
  });
  ctx.restore();
}

export function drawCornstalk(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#4e7a3a';
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -110 * scale);
  ctx.stroke();
  ctx.fillStyle = '#4e7a3a';
  for (const [lx, ly, rot] of [[-14, -60, -0.7], [14, -80, 0.7], [-12, -90, -0.5]]) {
    ctx.save();
    ctx.translate(lx * scale, ly * scale);
    ctx.rotate(rot);
    drawEllipse(ctx, 0, 0, 20 * scale, 6 * scale);
    ctx.restore();
  }
  ctx.fillStyle = '#f2c531';
  drawEllipse(ctx, 8 * scale, -70 * scale, 7 * scale, 16 * scale);
  ctx.restore();
}

export function drawMushroom(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(-4 * scale, -18 * scale, 8 * scale, 18 * scale);
  ctx.fillStyle = '#d94f30';
  ctx.beginPath();
  ctx.ellipse(0, -18 * scale, 18 * scale, 12 * scale, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2f2f2';
  drawEllipse(ctx, -8 * scale, -24 * scale, 3 * scale, 2.5 * scale);
  drawEllipse(ctx, 6 * scale, -27 * scale, 3.5 * scale, 3 * scale);
  ctx.restore();
}

export function drawLantern(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(-12 * scale, -34 * scale, 24 * scale, 30 * scale);
  ctx.fillStyle = '#ffd23e';
  ctx.fillRect(-8 * scale, -30 * scale, 16 * scale, 22 * scale);
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(-12 * scale, -34 * scale);
  ctx.lineTo(0, -44 * scale);
  ctx.lineTo(12 * scale, -34 * scale);
  ctx.stroke();
  ctx.restore();
}

export function drawSunflower(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#4e7a3a';
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -70 * scale);
  ctx.stroke();
  ctx.fillStyle = '#f2c531';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    drawEllipse(ctx, Math.cos(a) * 16 * scale, -78 * scale + Math.sin(a) * 16 * scale, 9 * scale, 5 * scale);
  }
  ctx.fillStyle = '#6e4520';
  drawEllipse(ctx, 0, -78 * scale, 11 * scale, 11 * scale);
  ctx.restore();
}

export function drawMudPuddle(ctx, x, y, w, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#5a3a1e';
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6e4520';
  ctx.beginPath();
  ctx.ellipse(-w * 0.2, -2 * scale, w * 0.18, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.25, 2 * scale, w * 0.12, 3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawKitchenTable(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#6e4520';
  ctx.fillRect(-60 * scale, -50 * scale, 120 * scale, 10 * scale);
  ctx.fillRect(-52 * scale, -40 * scale, 8 * scale, 40 * scale);
  ctx.fillRect(44 * scale, -40 * scale, 8 * scale, 40 * scale);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(-40 * scale, -50 * scale, 80 * scale, 4 * scale);
  // A roast-ready plate (empty — the turkey escaped).
  ctx.fillStyle = '#dfe6ee';
  drawEllipse(ctx, 0, -54 * scale, 18 * scale, 5 * scale);
  ctx.restore();
}

export function drawPot(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#3a3a44';
  ctx.beginPath();
  ctx.ellipse(0, -14 * scale, 26 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(-30 * scale, -34 * scale, 60 * scale, 8 * scale);
  ctx.strokeStyle = 'rgba(255, 200, 120, 0.6)';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(-8 * scale, -36 * scale);
  ctx.quadraticCurveTo(-4 * scale, -48 * scale, -8 * scale, -58 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8 * scale, -36 * scale);
  ctx.quadraticCurveTo(12 * scale, -48 * scale, 8 * scale, -58 * scale);
  ctx.stroke();
  ctx.restore();
}

export function drawForestGate(ctx, x, y, scale) {
  // The escape gate at the end of the run: two posts, a sign, freedom.
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(-70 * scale, -160 * scale, 14 * scale, 160 * scale);
  ctx.fillRect(56 * scale, -160 * scale, 14 * scale, 160 * scale);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-70 * scale, -160 * scale, 140 * scale, 16 * scale);
  ctx.fillRect(-70 * scale, -110 * scale, 140 * scale, 10 * scale);
  ctx.fillStyle = '#f2c531';
  ctx.fillRect(-46 * scale, -96 * scale, 92 * scale, 34 * scale);
  ctx.strokeStyle = '#5a3a1e';
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(-46 * scale, -96 * scale, 92 * scale, 34 * scale);
  ctx.fillStyle = '#5a3a1e';
  ctx.font = `bold ${15 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FREEDOM', 0, -79 * scale);
  ctx.restore();
}
