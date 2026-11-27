// main.js — bootstrap: size the canvas, create the game, run the loop,
// wire clicks and keys, and honour ?shot= for deterministic screenshots.

import { CANVAS_W, CANVAS_H } from './config.js';
import { Game, GAME_STATE } from './game.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H);
  canvas.style.width = `${Math.floor(CANVAS_W * scale)}px`;
  canvas.style.height = `${Math.floor(CANVAS_H * scale)}px`;
}

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
fitCanvas();
window.addEventListener('resize', fitCanvas);

const game = new Game(canvas);
game.attach();

// Switching tabs used to leave the run going while the screen was dark
// (requestAnimationFrame stops, the farmer does not): pause instead.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === GAME_STATE.PLAYING) game.togglePause();
});

// Screenshot mode: ?shot=start|play|caught|escaped&seed=N renders a fixed
// scene and stops the clock, so a screenshot is reproducible.
const params = new URLSearchParams(window.location.search);
const shotMode = applyShot(game, params);
if (shotMode) {
  // Let one frame render, then freeze: no further updates, so the shot
  // is exactly the posed scene.
  game.render();
  document.title = `Gobble & Go — shot ${params.get('shot')}`;
  if (statusEl) statusEl.textContent = `Screenshot state: ${params.get('shot')}`;
} else {
  let last = performance.now();
  let firstFrame = true;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Clicks: buttons first, then gameplay (jump on click while playing).
    if (game.input.mousePressed) {
      const clicked = game.handleClick(game.input.mouseX, game.input.mouseY);
      if (!clicked && game.state === GAME_STATE.PLAYING) {
        game.player.tryJump(game.audio);
      }
    }
    game.handleKey();
    game.update(dt);
    game.render();

    if (firstFrame) {
      firstFrame = false;
      if (statusEl) statusEl.textContent = 'Gobble & Go: The Great Turkey Escape. Press Space to start.';
    }
    // Announce state changes for screen readers, sparingly.
    if (game.state === GAME_STATE.CAUGHT && statusEl) {
      statusEl.textContent = 'Caught! Press Enter to run again.';
    } else if (game.state === GAME_STATE.ESCAPED && statusEl) {
      statusEl.textContent = 'Escaped! Press Enter to run again.';
    }

    game.input.endFrame();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// Expose the game for debugging and for the play-test harness.
window.__gobbleAndGo = game;
