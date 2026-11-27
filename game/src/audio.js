// audio.js — every sound is synthesized with WebAudio. No audio files,
// no network, just oscillators and noise shaped into gobbles, thuds,
// jingles and a little autumnal tune that changes per zone.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicOn = true;
    this._musicTimer = null;
    this._musicStep = 0;
    this._musicIntensity = 0;
    this._musicRoot = 220;
    this._musicMode = 'major';
    this._musicBpm = 132;
    this._noiseBuffer = null;
  }

  // Must be called from a user gesture at least once; browsers block
  // audio before that. Safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.master);
      const len = this.ctx.sampleRate * 1;
      this._noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this._noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch (err) {
      this.ctx = null;
      return false;
    }
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.9;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _tone({ freq = 440, freqEnd = null, type = 'sine', dur = 0.15, vol = 0.5, delay = 0, dest = null }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise({ dur = 0.2, vol = 0.4, delay = 0, filterFreq = 1200, type = 'bandpass', q = 1 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // ---- Named sound effects, one method each so the game reads clearly. ----

  gobble() {
    // The turkey's signature: three descending clucks.
    if (!this.ctx) return;
    this._tone({ freq: 420, freqEnd: 300, type: 'square', dur: 0.09, vol: 0.22 });
    this._tone({ freq: 380, freqEnd: 260, type: 'square', dur: 0.09, vol: 0.22, delay: 0.1 });
    this._tone({ freq: 520, freqEnd: 320, type: 'square', dur: 0.16, vol: 0.26, delay: 0.2 });
    this._noise({ dur: 0.08, vol: 0.12, filterFreq: 900, delay: 0.2 });
  }

  jump() {
    this._tone({ freq: 280, freqEnd: 620, type: 'sine', dur: 0.16, vol: 0.3 });
  }

  doubleJump() {
    this._tone({ freq: 420, freqEnd: 880, type: 'sine', dur: 0.16, vol: 0.3 });
    this._noise({ dur: 0.1, vol: 0.1, filterFreq: 2400, delay: 0.02 });
  }

  land() {
    this._noise({ dur: 0.08, vol: 0.18, filterFreq: 500, type: 'lowpass' });
  }

  slide() {
    this._noise({ dur: 0.28, vol: 0.2, filterFreq: 900, type: 'bandpass', q: 0.8 });
  }

  dash() {
    this._noise({ dur: 0.22, vol: 0.3, filterFreq: 1800, type: 'highpass' });
    this._tone({ freq: 180, freqEnd: 520, type: 'triangle', dur: 0.18, vol: 0.22 });
  }

  pickupCorn() {
    this._tone({ freq: 880, type: 'sine', dur: 0.09, vol: 0.3 });
    this._tone({ freq: 1318, type: 'sine', dur: 0.12, vol: 0.26, delay: 0.07 });
  }

  pickupFeather() {
    this._tone({ freq: 1046, type: 'triangle', dur: 0.1, vol: 0.3 });
    this._tone({ freq: 1318, type: 'triangle', dur: 0.1, vol: 0.3, delay: 0.08 });
    this._tone({ freq: 1760, type: 'triangle', dur: 0.2, vol: 0.3, delay: 0.16 });
  }

  heal() {
    this._tone({ freq: 523, type: 'sine', dur: 0.12, vol: 0.3 });
    this._tone({ freq: 659, type: 'sine', dur: 0.12, vol: 0.3, delay: 0.1 });
    this._tone({ freq: 784, type: 'sine', dur: 0.22, vol: 0.3, delay: 0.2 });
  }

  shieldUp() {
    this._tone({ freq: 392, freqEnd: 784, type: 'triangle', dur: 0.25, vol: 0.28 });
    this._noise({ dur: 0.2, vol: 0.1, filterFreq: 3000, type: 'highpass' });
  }

  slowmo() {
    this._tone({ freq: 660, freqEnd: 220, type: 'sine', dur: 0.5, vol: 0.25 });
  }

  hit() {
    this._tone({ freq: 160, freqEnd: 60, type: 'sawtooth', dur: 0.25, vol: 0.4 });
    this._noise({ dur: 0.18, vol: 0.35, filterFreq: 400, type: 'lowpass' });
  }

  stumble() {
    this._tone({ freq: 220, freqEnd: 110, type: 'square', dur: 0.18, vol: 0.25 });
    this._noise({ dur: 0.12, vol: 0.2, filterFreq: 700 });
  }

  spotted() {
    // The farmer's "HEY!" — two sharp brass-ish blasts.
    this._tone({ freq: 233, type: 'sawtooth', dur: 0.16, vol: 0.32 });
    this._tone({ freq: 233, type: 'sawtooth', dur: 0.22, vol: 0.32, delay: 0.18 });
    this._tone({ freq: 311, type: 'sawtooth', dur: 0.1, vol: 0.2, delay: 0.18 });
  }

  knifeWhistle() {
    this._tone({ freq: 1400, freqEnd: 300, type: 'sine', dur: 0.35, vol: 0.18 });
  }

  knifeThud() {
    this._tone({ freq: 90, freqEnd: 40, type: 'sine', dur: 0.2, vol: 0.5 });
    this._noise({ dur: 0.1, vol: 0.3, filterFreq: 300, type: 'lowpass' });
  }

  ovenRoar() {
    this._noise({ dur: 0.6, vol: 0.25, filterFreq: 300, type: 'lowpass' });
    this._tone({ freq: 70, freqEnd: 50, type: 'sine', dur: 0.6, vol: 0.3 });
  }

  hideRustle() {
    this._noise({ dur: 0.3, vol: 0.22, filterFreq: 1400, type: 'bandpass', q: 0.6 });
  }

  found() {
    this._tone({ freq: 196, type: 'square', dur: 0.12, vol: 0.3 });
    this._tone({ freq: 147, type: 'square', dur: 0.3, vol: 0.3, delay: 0.12 });
  }

  caught() {
    // Sad trombone, turkey edition.
    const notes = [392, 370, 349, 330];
    notes.forEach((f, i) => {
      this._tone({ freq: f, type: 'sawtooth', dur: 0.32, vol: 0.28, delay: i * 0.3 });
    });
    this._tone({ freq: 110, freqEnd: 55, type: 'sawtooth', dur: 0.9, vol: 0.3, delay: 1.2 });
  }

  escaped() {
    // A little victory jig in C major.
    const seq = [523, 659, 784, 1046, 784, 1046, 1318];
    seq.forEach((f, i) => {
      this._tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.32, delay: i * 0.13 });
    });
    this._tone({ freq: 1568, type: 'triangle', dur: 0.5, vol: 0.3, delay: seq.length * 0.13 });
  }

  zoneFanfare() {
    this._tone({ freq: 523, type: 'triangle', dur: 0.14, vol: 0.28 });
    this._tone({ freq: 784, type: 'triangle', dur: 0.14, vol: 0.28, delay: 0.12 });
    this._tone({ freq: 1046, type: 'triangle', dur: 0.3, vol: 0.28, delay: 0.24 });
  }

  click() {
    this._tone({ freq: 700, type: 'sine', dur: 0.06, vol: 0.25 });
  }

  buy() {
    this._tone({ freq: 880, type: 'triangle', dur: 0.1, vol: 0.3 });
    this._tone({ freq: 1174, type: 'triangle', dur: 0.1, vol: 0.3, delay: 0.09 });
    this._tone({ freq: 1568, type: 'triangle', dur: 0.25, vol: 0.3, delay: 0.18 });
  }

  denied() {
    this._tone({ freq: 220, type: 'square', dur: 0.12, vol: 0.22 });
    this._tone({ freq: 180, type: 'square', dur: 0.18, vol: 0.22, delay: 0.12 });
  }

  nearMiss() {
    // A close call: a quick whoosh up and a bright ding.
    this._noise({ dur: 0.14, vol: 0.22, filterFreq: 2400, type: 'highpass' });
    this._tone({ freq: 1568, type: 'triangle', dur: 0.16, vol: 0.28, delay: 0.05 });
    this._tone({ freq: 2093, type: 'triangle', dur: 0.2, vol: 0.24, delay: 0.12 });
  }

  // ---- Music: a sequenced bass + pluck melody, with a harmony layer,
  // a fill at the end of every fourth bar, and an intensity that follows
  // how close the farmer is — calm in the open field, frantic when he
  // is breathing down the turkey's neck. ----

  // 0..1: how hard the farmer is pressing. Drives extra percussion and
  // a slightly louder, faster-feeling mix. Called every frame by the game.
  setMusicIntensity(v) {
    this._musicIntensity = v;
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.value = 0.16 + v * 0.06;
    }
  }

  startMusic(root, mode, bpm) {
    if (!this.ctx) return;
    this._musicRoot = root;
    this._musicMode = mode;
    this._musicBpm = bpm;
    this._musicStep = 0;
    this._musicIntensity = 0;
    this.stopMusic();
    const stepMs = 60000 / bpm / 2; // eighth notes
    const majorSteps = [0, 2, 4, 7, 9, 12, 14, 16];
    const minorSteps = [0, 3, 5, 7, 10, 12, 15, 17];
    const scale = mode === 'minor' ? minorSteps : majorSteps;
    const melody = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 7, 5, 4, 2, 0];
    const bassNotes = [0, 0, 4, 3];
    // A second, call-and-response melody so bars do not all sound alike.
    const melodyB = [4, 5, 7, 5, 4, 2, 1, 2, 4, 7, 9, 7, 5, 4, 2, 1];
    const tick = () => {
      if (!this.ctx || !this.musicOn) return;
      const step = this._musicStep % 16;
      const bar = Math.floor(this._musicStep / 16) % 4;
      // Alternate the two melodies bar by bar: A, B, A, B-with-fill.
      const tune = bar % 2 === 0 ? melody : melodyB;
      const melIdx = tune[step];
      const melFreq = this._musicRoot * Math.pow(2, scale[melIdx % scale.length] / 12) * 2;
      if (step % 2 === 0) {
        this._tone({ freq: melFreq, type: 'triangle', dur: 0.22, vol: 0.16, dest: this.musicGain });
        // Harmony: a third above, quiet, on the first beat of each bar.
        if (step === 0) {
          const harmFreq = this._musicRoot * Math.pow(2, scale[(melIdx + 2) % scale.length] / 12) * 2;
          this._tone({ freq: harmFreq, type: 'sine', dur: 0.4, vol: 0.07, dest: this.musicGain });
        }
      }
      if (step % 4 === 0) {
        const bassFreq = this._musicRoot * Math.pow(2, scale[bassNotes[bar] % scale.length] / 12) / 2;
        this._tone({ freq: bassFreq, type: 'sine', dur: 0.5, vol: 0.3, dest: this.musicGain });
      }
      if (step % 4 === 2) {
        this._noise({ dur: 0.05, vol: 0.05, filterFreq: 6000, type: 'highpass', delay: 0 });
      }
      // Fill: the last bar of the 4-bar loop runs down the scale.
      if (bar === 3 && step >= 12) {
        const fillIdx = [7, 5, 4, 2][step - 12];
        const fillFreq = this._musicRoot * Math.pow(2, scale[fillIdx % scale.length] / 12) * 2;
        this._tone({ freq: fillFreq, type: 'triangle', dur: 0.14, vol: 0.14, dest: this.musicGain });
      }
      // Intensity: when the farmer is close, a driving off-beat hat
      // joins in so the chase sounds urgent instead of sleepy.
      const intensity = this._musicIntensity || 0;
      if (intensity > 0.55 && step % 2 === 1) {
        this._noise({ dur: 0.04, vol: 0.04 + intensity * 0.05, filterFreq: 7000, type: 'highpass', delay: 0 });
      }
      this._musicStep++;
      this._musicTimer = window.setTimeout(tick, stepMs);
    };
    this._musicTimer = window.setTimeout(tick, stepMs);
  }

  stopMusic() {
    if (this._musicTimer !== null) {
      window.clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }
  }

  setMusicZone(root, mode, bpm) {
    this._musicRoot = root;
    this._musicMode = mode;
    this._musicBpm = bpm;
  }
}
