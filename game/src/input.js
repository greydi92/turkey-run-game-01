// input.js — keyboard, mouse and touch input in one place. The game reads
// this object each frame; menus read the edge-triggered "pressed" events.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressedKeys = new Set(); // edge-triggered, consumed by endFrame()
    this.mouseX = 0;
    this.mouseY = 0;
    this.mousePressed = false; // edge-triggered, consumed by endFrame()
    this.mouseDown = false;
    this.touchX = 0;
    this.touchY = 0;
    this.touchPressed = false;
    // Touch mode: on-screen buttons appear once a touch is used (or the
    // device reports a coarse pointer). Virtual buttons set these holds.
    this.touchMode = false;
    this.touchActive = false; // a finger is down on the canvas right now
    this.touchSlideHeld = false;
    this.touchHideHeld = false;
    this.anyPressed = false; // any key or click this frame
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onBlur = this._onBlur.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
    // Phones and tablets get the on-screen buttons from the start.
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
        this.touchMode = true;
      }
    } catch (err) {
      // matchMedia unavailable: touch mode still turns on at first touch.
    }
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
  }

  _canvasPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  _onKeyDown(e) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) {
      this.pressedKeys.add(e.code);
      this.anyPressed = true;
    }
    this.keys.add(e.code);
  }

  _onKeyUp(e) {
    this.keys.delete(e.code);
  }

  _onBlur() {
    this.keys.clear();
    this.mouseDown = false;
    this.touchActive = false;
    this.touchSlideHeld = false;
    this.touchHideHeld = false;
  }

  _onMouseMove(e) {
    const p = this._canvasPos(e.clientX, e.clientY);
    this.mouseX = p.x;
    this.mouseY = p.y;
  }

  _onMouseDown(e) {
    const p = this._canvasPos(e.clientX, e.clientY);
    this.mouseX = p.x;
    this.mouseY = p.y;
    this.mouseDown = true;
    this.mousePressed = true;
    this.anyPressed = true;
  }

  _onMouseUp() {
    this.mouseDown = false;
  }

  _onTouchStart(e) {
    e.preventDefault();
    this.touchMode = true;
    this.touchActive = true;
    const t = e.changedTouches[0];
    const p = this._canvasPos(t.clientX, t.clientY);
    this.touchX = p.x;
    this.touchY = p.y;
    this.mouseX = p.x;
    this.mouseY = p.y;
    this.touchPressed = true;
    this.mousePressed = true;
    this.anyPressed = true;
  }

  _onTouchEnd(e) {
    e.preventDefault();
    this.touchPressed = false;
    this.touchActive = false;
    this.touchSlideHeld = false;
    this.touchHideHeld = false;
  }

  // Held-state queries the game uses every frame.
  down(code) {
    return this.keys.has(code);
  }

  get jumpHeld() {
    return this.down('Space') || this.down('KeyW') || this.down('ArrowUp');
  }

  get slideHeld() {
    return this.down('KeyS') || this.down('ArrowDown') || this.touchSlideHeld;
  }

  get dashHeld() {
    return this.down('ShiftLeft') || this.down('ShiftRight');
  }

  get hideHeld() {
    return this.down('KeyH') || this.touchHideHeld;
  }

  // Edge-triggered queries, true only on the frame the input happened.
  pressed(code) {
    return this.pressedKeys.has(code);
  }

  get jumpPressed() {
    return this.pressed('Space') || this.pressed('KeyW') || this.pressed('ArrowUp');
  }

  get dashPressed() {
    return this.pressed('ShiftLeft') || this.pressed('ShiftRight');
  }

  get hidePressed() {
    return this.pressed('KeyH');
  }

  get pausePressed() {
    return this.pressed('KeyP') || this.pressed('Escape');
  }

  get mutePressed() {
    return this.pressed('KeyM');
  }

  get confirmPressed() {
    return this.pressed('Enter') || this.pressed('Space') || this.mousePressed;
  }

  get leftPressed() {
    return this.pressed('ArrowLeft') || this.pressed('KeyA');
  }

  get rightPressed() {
    return this.pressed('ArrowRight') || this.pressed('KeyD');
  }

  // Call at the end of each frame so edge triggers last exactly one frame.
  endFrame() {
    this.pressedKeys.clear();
    this.mousePressed = false;
    this.touchPressed = false;
    this.anyPressed = false;
  }
}
