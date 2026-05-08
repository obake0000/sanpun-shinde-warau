'use strict';

// Web Audio API で合成する音システム（外部素材ゼロ）
class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.bgmNodes = null;
    this.bgmTickTimer = null;
    this.warningTimer = null;
    this.muted = false;
    this.unlocked = false;
  }

  unlock() {
    if (this.unlocked) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.20;
      this.bgmGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.55;
      this.sfxGain.connect(this.master);
      this.unlocked = true;
      console.log('[AUDIO] unlocked');
    } catch (e) { console.warn('[AUDIO] unlock failed', e); }
  }

  _t() { return this.ctx.currentTime; }

  _env(g, vol, dur, attack = 0.005, release = 0.05) {
    const t = this._t();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.linearRampToValueAtTime(0, t + dur + release);
  }

  beep({ freq = 440, dur = 0.1, type = 'sine', vol = 0.25, target = null, glide = null }) {
    if (!this.unlocked || this.muted) return;
    const t = this._t();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    this._env(g, vol, dur);
    o.connect(g);
    g.connect(target || this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  noise({ dur = 0.1, vol = 0.2, target = null }) {
    if (!this.unlocked || this.muted) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(target || this.sfxGain);
    src.start(this._t());
  }

  // === SFX ===
  tap() { this.beep({ freq: 600, dur: 0.04, type: 'square', vol: 0.13 }); }

  hapDown() {
    // 失望のサウンド: 高→低のため息っぽいトーン
    this.beep({ freq: 520, dur: 0.45, type: 'triangle', vol: 0.22, glide: 110 });
  }

  hapUp() {
    this.beep({ freq: 440, dur: 0.35, type: 'sine', vol: 0.2, glide: 1200 });
  }

  godSpeak() {
    // 神のチャイム: 二音で「ピロリン」
    this.beep({ freq: 988, dur: 0.13, type: 'sine', vol: 0.2 });
    setTimeout(() => this.beep({ freq: 1318, dur: 0.18, type: 'sine', vol: 0.16 }), 90);
  }

  warningTick() {
    this.beep({ freq: 1600, dur: 0.03, type: 'square', vol: 0.16 });
  }

  modalOpen() {
    // ドラマsting: 低→高のスライドsweep+ノイズ
    this.beep({ freq: 220, dur: 0.55, type: 'sawtooth', vol: 0.18, glide: 660 });
    setTimeout(() => this.noise({ dur: 0.2, vol: 0.1 }), 180);
  }

  choice() {
    this.beep({ freq: 900, dur: 0.06, type: 'square', vol: 0.16 });
    setTimeout(() => this.beep({ freq: 1200, dur: 0.06, type: 'square', vol: 0.12 }), 50);
  }

  endHeaven() {
    // 天国: 上昇アルペジオ
    const notes = [523, 659, 784, 988, 1175];
    notes.forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, dur: 0.55, type: 'sine', vol: 0.22 }), i * 130));
  }

  endHell() {
    // 地獄: 下降スライド+ノイズ
    this.beep({ freq: 220, dur: 1.4, type: 'sawtooth', vol: 0.28, glide: 55 });
    setTimeout(() => this.noise({ dur: 0.6, vol: 0.18 }), 400);
  }

  endVoid() {
    // 無: サブベース・ハム
    this.beep({ freq: 36, dur: 2.5, type: 'sine', vol: 0.4 });
    setTimeout(() => this.beep({ freq: 27, dur: 1.5, type: 'sine', vol: 0.3 }), 800);
  }

  endTimeUp() {
    this.beep({ freq: 880, dur: 0.15, type: 'square', vol: 0.25 });
    setTimeout(() => this.beep({ freq: 220, dur: 0.6, type: 'sawtooth', vol: 0.25, glide: 80 }), 200);
  }

  // === BGM: 低音ドローン+心拍 ===
  startBgm() {
    if (!this.unlocked || this.bgmNodes) return;
    const t = this._t();
    const drone = this.ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55;
    const drone2 = this.ctx.createOscillator();
    drone2.type = 'triangle';
    drone2.frequency.value = 110;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 1.5;
    lfo.connect(lfoG);
    lfoG.connect(drone.frequency);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 280;
    const droneG = this.ctx.createGain();
    droneG.gain.value = 0;
    drone.connect(filter);
    drone2.connect(filter);
    filter.connect(droneG);
    droneG.connect(this.bgmGain);
    droneG.gain.linearRampToValueAtTime(0.55, t + 0.5);
    drone.start(t);
    drone2.start(t);
    lfo.start(t);
    this.bgmNodes = { drone, drone2, lfo, droneG };
    // 心拍ティック
    this.bgmTickTimer = setInterval(() => {
      if (this.muted || !this.bgmNodes) return;
      this.beep({ freq: 80, dur: 0.06, type: 'sine', vol: 0.06, target: this.bgmGain });
      setTimeout(() => this.beep({ freq: 60, dur: 0.06, type: 'sine', vol: 0.04, target: this.bgmGain }), 130);
    }, 1000);
  }

  stopBgm() {
    if (this.bgmTickTimer) clearInterval(this.bgmTickTimer);
    this.bgmTickTimer = null;
    if (this.warningTimer) clearInterval(this.warningTimer);
    this.warningTimer = null;
    if (this.bgmNodes && this.ctx) {
      const t = this._t();
      const { drone, drone2, lfo, droneG } = this.bgmNodes;
      droneG.gain.cancelScheduledValues(t);
      droneG.gain.setValueAtTime(droneG.gain.value, t);
      droneG.gain.linearRampToValueAtTime(0, t + 0.5);
      try { drone.stop(t + 0.6); drone2.stop(t + 0.6); lfo.stop(t + 0.6); } catch (e) {}
      this.bgmNodes = null;
    }
  }

  startWarning() {
    if (this.warningTimer) return;
    this.warningTimer = setInterval(() => this.warningTick(), 1000);
  }

  stopWarning() {
    if (this.warningTimer) clearInterval(this.warningTimer);
    this.warningTimer = null;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
    return this.muted;
  }
}

const Sound = new GameAudio();
