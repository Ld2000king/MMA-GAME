// ===== אפקטים קוליים (סינתזה, בלי קבצים) =====
const Sfx = {
  ctx: null, on: true, _nb: null,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
  },
  nb() {
    if (this._nb) return this._nb;
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (this._nb = b);
  },
  play(fn) {
    if (!this.on) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    try { fn(this.ctx, this.ctx.currentTime); } catch (e) { /* ignore */ }
  },
  noise(freq, dur, vol, type = 'lowpass', q = 1, delay = 0, attack = 0) {
    this.play((c, t0) => {
      const t = t0 + delay;
      const s = c.createBufferSource(); s.buffer = this.nb();
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain();
      if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); }
      else g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
      s.connect(f).connect(g).connect(c.destination);
      s.start(t, Math.random() * 0.8); s.stop(t + attack + dur + 0.05);
    });
  },
  tone(freq, dur, vol, type = 'sine', slideTo = 0, delay = 0) {
    this.play((c, t0) => {
      const t = t0 + delay;
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
    });
  },
  hit(heavy) {
    this.noise(heavy ? 900 : 1400, heavy ? 0.2 : 0.11, heavy ? 0.8 : 0.5);
    this.tone(heavy ? 120 : 160, heavy ? 0.22 : 0.12, heavy ? 0.7 : 0.4, 'sine', 45);
  },
  block() { this.noise(2400, 0.07, 0.3, 'bandpass', 2); this.tone(300, 0.06, 0.12, 'triangle'); },
  whoosh(v = 1) { this.noise(1700, 0.12, 0.14 * v, 'bandpass', 0.8); },
  bell() {
    [0, 0.3, 0.6].forEach(d => { this.tone(1318, 1.1, 0.22, 'sine', 0, d); this.tone(2660, 0.7, 0.08, 'sine', 0, d); });
  },
  tick() { this.tone(880, 0.07, 0.18, 'square'); },
  crowd() { this.noise(1000, 1.8, 0.35, 'bandpass', 0.5, 0, 0.25); },
  cash() { this.tone(1200, 0.08, 0.15, 'triangle'); this.tone(1700, 0.16, 0.15, 'triangle', 0, 0.08); },
  click() { this.tone(600, 0.04, 0.06, 'triangle'); }
};
