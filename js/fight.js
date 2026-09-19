// ===== מנוע הקרב =====
const FW = 960, FH = 440, FLOOR = 398, RING_L = 110, RING_R = 850, MIN_DIST = 92, FSCALE = 1.18, DODGE_T = 0.38;
const PUNCHES = {
  jab:   { name: 'ג׳אב',    dmg: 5,  sta: 7,  wind: 0.11, rec: 0.17, reach: 165, stun: 0.12, push: 6 },
  cross: { name: 'קרוס',    dmg: 10, sta: 13, wind: 0.19, rec: 0.26, reach: 160, stun: 0.24, push: 12 },
  upper: { name: 'אפרקאט',  dmg: 15, sta: 19, wind: 0.27, rec: 0.33, reach: 125, stun: 0.4,  push: 18 }
};
const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* */ } };
// דאש: פרץ מהיר של ~גוף אחד. קדימה = מכת דאש (מהירה וחזקה יותר); אחורה = חלון התחמקות קצר
const DASH_T = 0.18, DASH_SPEED = 640, DASH_CD = 0.55, DASH_STA = 12, DASH_WINDOW = 0.38, DASH_EVADE = 0.15;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
let _actionId = 0;

class Fighter {
  constructor(c) {
    this.name = c.name; this.look = c.look; this.st = c.stats; this.isPlayer = c.isPlayer; this.x = c.x; this.dir = c.dir;
    this.style = c.style || 'balanced';
    this.pk = { dmg: 1, sta: 1, spd: 1, hp: 1, move: 1, counter: 1.35, dodgeCd: 1, dodgeSta: 1, chain: 0, reach: 0, block: 1, regen: 1, dodgeHit: 0, ...STYLES[this.style].perk };
    this.scale = FSCALE * (c.size || 1);
    this.chainN = 0; this.chainT = 0; this.dodgeBuff = 0; this.comboLeft = 0; this.counterQ = false;
    this.maxHp = Math.round((100 + this.st.chin * 3) * this.pk.hp); this.hp = this.maxHp;
    this.maxSta = 100 + this.st.stamina * 2; this.sta = this.maxSta * (c.staStart == null ? 1 : c.staStart);
    this.action = null; this.combo = null; this.blocking = false; this.blockV = 0;
    this.dodgeT = 0; this.dodgeCd = 0; this.stun = 0; this.snap = 0;
    this.kd = 0; this.down = false; this.fall = 0; this.winV = 0;
    this.bobT = Math.random() * 6; this.walkT = 0; this.moveAmt = 0;
    this.score = 0; this.thrown = 0; this.landed = 0; this.hpLag = this.maxHp;
    this.aiT = 0; this.atkCd = 1; this.blockT = 0; this.want = 140; this.seen = -1; this.punished = -1;
    this.dashT = 0; this.dashDir = 0; this.dashCd = 0; this.dashBuff = 0; this.evadeT = 0; this.trail = [];
  }
  get sf() { return clamp(1.22 - this.st.speed / 110, 0.6, 1.2) * this.pk.spd; }
  get moveSp() { return (this.isPlayer ? 140 + this.st.speed * 2.4 : 130 + this.st.speed * 2.2) * this.pk.move; }
  canAct() { return !this.action && this.stun <= 0 && !this.down && this.dodgeT <= 0; }
  throw(type) {
    if (!this.canAct() || this.blocking) return false;
    const P = PUNCHES[type], cost = P.sta * this.pk.sta, tired = this.sta < cost, slow = tired ? 1.35 : 1;
    this.action = {
      id: ++_actionId, type, t: 0, hit: false, result: null,
      wind: P.wind * this.sf * slow, rec: P.rec * this.sf * slow,
      power: tired ? 0.45 : 0.55 + 0.45 * this.sta / this.maxSta
    };
    if (this.dashBuff > 0 && this.dashDir > 0) {
      this.action.dash = true; this.action.wind *= 0.7; this.action.rec *= 0.8; this.dashBuff = 0;
    }
    this.sta = Math.max(0, this.sta - cost); this.thrown++;
    return true;
  }
  // rel: 1 = לעבר היריב, -1 = הרחק ממנו
  dash(rel) {
    const cost = DASH_STA * this.pk.sta;
    if (this.down || this.stun > 0 || this.dodgeT > 0 || this.dashT > 0 || this.dashCd > 0 || this.sta < cost) return false;
    if (this.action && this.action.t < this.action.wind) return false; // לא באמצע הנפה
    this.dashT = DASH_T; this.dashDir = rel; this.dashCd = DASH_CD * this.pk.dodgeCd; this.sta -= cost; this.blocking = false;
    if (rel > 0) this.dashBuff = DASH_T + DASH_WINDOW; else this.evadeT = DASH_EVADE;
    return true;
  }
  dodge() {
    const cost = 10 * this.pk.dodgeSta;
    if (!this.canAct() || this.dodgeCd > 0 || this.sta < cost) return false;
    this.dodgeT = DODGE_T; this.dodgeCd = 0.75 * this.pk.dodgeCd; this.sta -= cost; this.blocking = false;
    if (this.pk.dodgeHit) this.dodgeBuff = DODGE_T + 0.8;
    return true;
  }
}

class Fight {
  constructor(o) {
    this.canvas = o.canvas; this.ctx = this.canvas.getContext('2d'); this.hud = o.hud; this.onEnd = o.onEnd; this.onPause = o.onPause;
    this.rounds = o.rounds; this.round = 1; this.roundLen = 60; this.timer = this.roundLen;
    this.p = new Fighter({ ...o.player, isPlayer: true, x: 330, dir: 1 });
    this.o = new Fighter({ ...o.opp, style: o.oppStyle, isPlayer: false, x: 630, dir: -1 });
    this.skill = o.skill;
    this.state = 'intro'; this.stateT = 0; this.shake = 0; this.hype = 0.3;
    this.particles = []; this.rings = []; this.texts = []; this.flashes = [];
    this.input = { left: false, right: false, block: false };
    this.paused = false; this.ended = false; this.mash = 0; this.mashNeed = 0; this.count = 0;
    this.slowmo = 0; this.elapsed = 0;
    this.kd = e => this.onKey(e, true); this.ku = e => this.onKey(e, false);
    this.vis = () => { if (document.hidden && !this.paused && this.state !== 'over') this.togglePause(); };
    window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku);
    document.addEventListener('visibilitychange', this.vis);
    // מודדים את הקנבס רק כשהמסך משתנה (סיבוב/מסך מלא), לא בכל פריים
    this.needSize = true; this.onResize = () => { this.needSize = true; };
    window.addEventListener('resize', this.onResize); window.addEventListener('orientationchange', this.onResize);
    document.addEventListener('fullscreenchange', this.onResize);
    this.hudCache = new Map();
    if (document.activeElement) document.activeElement.blur();
    this.last = performance.now();
    this.banner('סיבוב 1', '', 1.6);
    this.raf = requestAnimationFrame(t => this.loop(t));
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku);
    document.removeEventListener('visibilitychange', this.vis);
    window.removeEventListener('resize', this.onResize); window.removeEventListener('orientationchange', this.onResize);
    document.removeEventListener('fullscreenchange', this.onResize);
  }
  // ---------- קלט ----------
  onKey(e, down) {
    const c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA' || c === 'ArrowRight' || c === 'KeyD') {
      const right = c === 'ArrowRight' || c === 'KeyD';
      this.input[right ? 'right' : 'left'] = down;
      if (down && !e.repeat) this.tapDir(right ? 1 : -1);
    }
    else if (c === 'ArrowDown' || c === 'KeyS') this.input.block = down;
    else if (['KeyJ', 'KeyZ', 'KeyK', 'KeyX', 'KeyL', 'KeyC', 'Space', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'KeyW', 'Escape', 'KeyP', 'KeyE', 'KeyQ'].includes(c)) {
      if (down && !e.repeat) {
        const map = { KeyJ: 'jab', KeyZ: 'jab', KeyK: 'cross', KeyX: 'cross', KeyL: 'upper', KeyC: 'upper', Space: 'dodge', ShiftLeft: 'dodge', ShiftRight: 'dodge', ArrowUp: 'dodge', KeyW: 'dodge', Escape: 'pause', KeyP: 'pause', KeyE: 'dash', KeyQ: 'dashBack' };
        this.cmd(map[c]);
      }
    } else return;
    e.preventDefault();
  }
  cmd(c) {
    if (c === 'pause') { if (this.state !== 'over') this.togglePause(); return; }
    if (this.paused) return;
    if (this.state === 'down' && this.downF === this.p) { this.mash++; Sfx.click(); return; }
    if (this.state !== 'fight') return;
    if (c === 'dodge') { if (this.p.dodge()) Sfx.whoosh(0.8); }
    else if (c === 'dash' || c === 'dashBack') this.doDash(this.p, c === 'dash' ? 1 : -1);
    else if (PUNCHES[c] && this.p.throw(c)) Sfx.whoosh();
  }
  // לחיצה כפולה על כיוון (מקלדת או כפתור מגע) = דאש לאותו כיוון
  tapDir(screenDir) {
    const now = performance.now(), last = this.lastTap;
    this.lastTap = { dir: screenDir, t: now };
    if (last && last.dir === screenDir && now - last.t < 280) { this.lastTap = null; this.cmd(screenDir * this.p.dir > 0 ? 'dash' : 'dashBack'); }
  }
  doDash(f, rel) {
    if (!f.dash(rel)) return false;
    Sfx.whoosh(1.3); this.dust(f);
    return true;
  }
  dust(f) {
    for (let i = 0; i < 9; i++) {
      const sp = rand(40, 160), back = -f.dir * f.dashDir;
      this.particles.push({ x: f.x + rand(-20, 20), y: FLOOR - rand(0, 6), vx: back * sp + rand(-30, 30), vy: -rand(40, 140), life: rand(0.3, 0.55), t: 0, c: 'rgba(205,210,222,.55)', r: rand(2, 4.5) });
    }
  }
  togglePause() {
    this.paused = !this.paused;
    this.input = { left: false, right: false, block: false };
    if (this.onPause) this.onPause(this.paused);
  }

  // ---------- לולאה ----------
  loop(now) {
    let dt = Math.min(0.033, (now - this.last) / 1000); this.last = now;
    if (this.slowmo > 0 && !this.paused) { this.slowmo -= dt; dt *= 0.28; }
    if (!this.paused) this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    this.stateT += dt;
    const p = this.p, o = this.o;
    for (const f of [p, o]) {
      f.bobT += dt; f.snap = Math.max(0, f.snap - dt * 4);
      f.hpLag = f.hpLag > f.hp ? Math.max(f.hp, f.hpLag - f.maxHp * 0.35 * dt) : f.hp;
      f.fall += ((f.down ? 1 : 0) - f.fall) * Math.min(1, dt * (f.down ? 7 : 5));
      f.blockV += ((f.blocking ? 1 : 0) - f.blockV) * Math.min(1, dt * 18);
    }
    this.shake = Math.max(0, this.shake - dt * 30);
    this.hype = Math.max(0.25, this.hype - dt * 0.15);
    this.updateFx(dt);

    if (this.state === 'intro') {
      p.blocking = o.blocking = false;
      if (this.stateT > 1.6) { this.state = 'fight'; this.stateT = 0; Sfx.bell(); this.banner('קרב!', '', 0.7); }
    } else if (this.state === 'fight') {
      this.timer -= dt; this.elapsed += dt;
      if (this.timer <= 0) { this.timer = 0; this.endRound(); return; }
      this.playerControl(dt);
      this.ai(dt);
      this.step(p, o, dt);
      if (this.state === 'fight') this.step(o, p, dt);
      this.separate();
    } else if (this.state === 'down') {
      this.updateDown(dt);
    } else if (this.state === 'break') {
      if (this.stateT > 3.4) this.nextRound();
    } else if (this.state === 'over') {
      const w = this.result.won ? p : o;
      w.winV = Math.min(1, w.winV + dt * 3); w.blocking = false;
      if (this.stateT > 3 && !this.ended) { this.ended = true; this.onEnd(this.result); }
    }
  }

  playerControl(dt) {
    const p = this.p;
    p.blocking = this.input.block && !p.action && p.stun <= 0 && p.dodgeT <= 0 && !p.down;
    const mv = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const can = mv && p.stun <= 0 && p.dodgeT <= 0;
    if (can) {
      const sp = p.moveSp * (p.blocking ? 0.45 : 1) * (p.action ? 0.3 : 1);
      p.x += mv * sp * dt; p.walkT += dt * mv;
    }
    p.moveAmt += ((can ? 1 : 0) - p.moveAmt) * Math.min(1, dt * 10);
  }

  ai(dt) {
    const me = this.o, foe = this.p, sk = this.skill, A = { ...AI_BASE, ...STYLES[me.style].ai };
    if (me.down) return;
    me.aiT -= dt; me.atkCd -= dt; me.blockT -= dt;
    const dist = me.x - foe.x;
    // תגובה לאגרוף של השחקן
    if (foe.action && !foe.action.hit && foe.action.id !== me.seen) {
      me.seen = foe.action.id;
      const P = PUNCHES[foe.action.type];
      if (dist < P.reach + foe.pk.reach + 25 && me.stun <= 0 && !me.action) {
        if (Math.random() < 0.1 + sk * 0.55 + A.react) {
          if (Math.random() < A.blockPref || me.sta < 12) me.blockT = rand(0.3, 0.65);
          else if (me.dodge()) { Sfx.whoosh(0.6); if (A.dodgeCounter) me.counterQ = true; }
        } else if (Math.random() < A.dashOut * (0.4 + sk * 0.6)) {
          this.doDash(me, -1); // דאש אחורה מול אגרוף
        }
      }
    }
    // עונש על החטאה
    if (foe.action && foe.action.hit && foe.action.result !== 'land' && foe.action.id !== me.punished && dist < 165 + me.pk.reach) {
      me.punished = foe.action.id;
      if (Math.random() < (0.15 + sk * 0.5) * A.punish) { me.blockT = 0; me.blocking = false; if (me.throw('cross')) Sfx.whoosh(0.6); }
    }
    // מכה מיד אחרי התחמקות (מתחמק / מתקיף-נגד)
    // דאש פנימה: סגנונות תוקפניים סוגרים מרחק ופותחים במכת דאש
    if (me.dashCd <= 0 && me.stun <= 0 && !me.blocking && !me.action && dist > 150 && dist > me.want + 30 &&
        Math.random() < dt * A.dashIn * (0.6 + sk) * 1.5) {
      if (this.doDash(me, 1)) me.atkCd = Math.min(me.atkCd, 0.06);
    }
    if (me.counterQ && me.canAct()) {
      me.counterQ = false; me.blockT = 0; me.blocking = false;
      if (me.throw(dist < 125 ? 'upper' : 'cross')) Sfx.whoosh(0.6);
    }
    me.blocking = me.blockT > 0 && !me.action && me.stun <= 0 && me.dodgeT <= 0;
    if (me.aiT <= 0) {
      me.aiT = rand(0.6, 1.4);
      const low = me.sta < me.maxSta * 0.28 || me.hp < me.maxHp * 0.25;
      const retreatOk = me.style !== 'pressure';
      me.want = low && retreatOk ? rand(175, 235) : Math.random() < A.aggr ? rand(A.near[0], A.near[1]) : rand(A.far[0], A.far[1]);
      if (!low && Math.random() < 0.18 * sk && me.canAct()) me.blockT = rand(0.3, 0.7);
    }
    let moving = false;
    if (me.stun <= 0 && me.dodgeT <= 0) {
      const diff = dist - me.want;
      if (Math.abs(diff) > 8) {
        const sp = me.moveSp * (me.blocking ? 0.45 : 1) * (me.action ? 0.3 : 1);
        const stepX = Math.sign(diff) * Math.min(sp * dt, Math.abs(diff));
        me.x -= stepX; me.walkT += dt * Math.sign(diff); moving = true;
      }
    }
    me.moveAmt += ((moving ? 1 : 0) - me.moveAmt) * Math.min(1, dt * 10);
    if (me.canAct() && !me.blocking && me.atkCd <= 0 && dist < 175 + me.pk.reach) {
      let type = dist < 128 && Math.random() < A.upper ? 'upper' : Math.random() < A.jab ? 'jab' : 'cross';
      if (dist > PUNCHES[type].reach + me.pk.reach + 5) type = 'jab';
      if (me.sta >= PUNCHES[type].sta * me.pk.sta || Math.random() < 0.2) {
        if (me.throw(type)) {
          Sfx.whoosh(0.6);
          if (Math.random() < A.combo + sk * 0.3) { me.comboLeft = A.comboLen - 1; me.combo = this.nextComboPunch(type); }
          if (A.retreat) { me.want = rand(A.far[0], A.far[1]) + 15; me.aiT = rand(0.5, 0.9); }
        }
      }
      me.atkCd = rand(0.35, 1.1) * A.tempo * (1.45 - sk * 0.8);
    }
  }
  nextComboPunch(prev) {
    const r = Math.random();
    if (prev === 'jab') return r < 0.65 ? 'cross' : r < 0.85 ? 'jab' : 'upper';
    if (prev === 'cross') return r < 0.5 ? 'upper' : 'jab';
    return r < 0.6 ? 'cross' : 'jab';
  }

  step(f, foe, dt) {
    f.stun = Math.max(0, f.stun - dt); f.dodgeCd = Math.max(0, f.dodgeCd - dt);
    f.dashCd = Math.max(0, f.dashCd - dt); f.dashBuff = Math.max(0, f.dashBuff - dt); f.evadeT = Math.max(0, f.evadeT - dt);
    if (f.dashT > 0) {
      const k = f.dashT / DASH_T; // מאט לקראת הסוף
      f.x += f.dir * f.dashDir * DASH_SPEED * (0.4 + 1.2 * k) * (0.85 + f.st.speed / 250) * dt;
      f.dashT = Math.max(0, f.dashT - dt);
      f.trail.unshift(f.x); if (f.trail.length > 6) f.trail.pop();
    } else if (f.trail.length) f.trail.pop();
    f.chainT = Math.max(0, f.chainT - dt); f.dodgeBuff = Math.max(0, f.dodgeBuff - dt);
    if (f.chainT <= 0) f.chainN = 0;
    if (f.dodgeT > 0) { f.dodgeT -= dt; f.x -= f.dir * 150 * dt; }
    if (f.action) {
      const a = f.action; a.t += dt;
      if (!a.hit && a.t >= a.wind) { this.resolve(f, foe); if (this.state !== 'fight') return; }
      if (f.action && a.t >= a.wind + a.rec) {
        f.action = null;
        if (f.combo) {
          const c = f.combo; f.combo = null;
          if (f.throw(c)) { Sfx.whoosh(0.6); if (f.comboLeft > 0) { f.comboLeft--; f.combo = this.nextComboPunch(c); } }
        }
      }
    } else if (!f.down) {
      f.sta = Math.min(f.maxSta, f.sta + (6 + f.st.stamina * 0.3) * f.pk.regen * dt * (f.blocking ? 0.55 : 1));
    }
  }

  separate() {
    const p = this.p, o = this.o, lo = RING_L, hi = RING_R;
    p.x = clamp(p.x, lo, hi); o.x = clamp(o.x, lo, hi);
    const d = o.x - p.x;
    if (d < MIN_DIST) {
      const push = (MIN_DIST - d) / 2; p.x -= push; o.x += push;
      p.x = clamp(p.x, lo, hi); o.x = clamp(o.x, lo, hi);
      if (o.x - p.x < MIN_DIST) { if (p.x <= lo + 0.5) o.x = p.x + MIN_DIST; else p.x = o.x - MIN_DIST; }
    }
  }

  resolve(a, d) {
    const act = a.action, P = PUNCHES[act.type];
    act.hit = true; act.result = 'miss';
    const dist = Math.abs(a.x - d.x);
    const hx = d.x + d.dir * 8 * d.scale, hy = FLOOR - 214 * d.scale;
    if (dist > P.reach + a.pk.reach || d.down) return;
    if (d.evadeT > 0) { act.result = 'dodge'; this.say('חמק!', hx, hy - 40, '#9cc3ff', 22); return; }
    if (d.dodgeT > 0) { act.result = 'dodge'; this.say('התחמקות!', hx, hy - 40, '#9cc3ff', 22); return; }
    let dmg = P.dmg * (0.65 + a.st.power / 35) * act.power * a.pk.dmg * (1 - d.st.defense / 220) * rand(0.9, 1.1);
    const heavy = act.type !== 'jab';
    if (d.blocking && d.blockV > 0.5) {
      act.result = 'block';
      const through = act.type === 'upper' ? 0.4 : 0.12;
      dmg *= through * (1 - d.st.defense / 300) * d.pk.block;
      d.sta = Math.max(0, d.sta - P.dmg * 1.1 * (1 - d.st.defense / 150));
      d.x += a.dir * P.push * 0.5;
      a.score += dmg * 0.3;
      this.spark(d.x + d.dir * 40 * d.scale, hy + 10, false, true);
      Sfx.block();
      if (act.type === 'upper') this.say('פרץ את השמירה', hx, hy - 40, '#ffd27a', 18);
    } else {
      act.result = 'land';
      const counter = d.action && !d.action.hit;
      if (act.dash) { dmg *= 1.25; this.say('מכת דאש!', hx, hy - 58, '#ffc46b', 24); }
      if (counter) { dmg *= a.pk.counter; this.say('קאונטר!', hx, hy - 44, '#ffd27a', 24); }
      if (a.dodgeBuff > 0 && a.pk.dodgeHit) { dmg *= 1 + a.pk.dodgeHit; a.dodgeBuff = 0; this.say('מכת נגד!', hx, hy - 20, '#c4b1ff', 22); }
      if (a.pk.chain) {
        if (a.chainT > 0) a.chainN = Math.min(3, a.chainN + 1);
        dmg *= 1 + a.pk.chain * a.chainN; a.chainT = 1.2;
        if (a.chainN >= 2) this.say(`רצף ×${a.chainN + 1}`, hx, hy - 96, '#ffb27a', 20);
      }
      if (Math.random() < 0.07 + a.st.power / 800) { dmg *= 1.5; this.say('מכה נקייה!', hx, hy - 70, '#ff8a8f', 26); }
      d.stun = P.stun; d.snap = 1; d.action = null; d.combo = null; d.comboLeft = 0; d.counterQ = false; d.x += a.dir * P.push;
      a.landed++; a.score += dmg;
      this.shake = heavy ? 9 : 4; this.hype = Math.min(1, this.hype + (heavy ? 0.12 : 0.05));
      this.spark(hx, act.type === 'upper' ? hy + 14 : hy, heavy, false);
      Sfx.hit(heavy);
      if (d.isPlayer) buzz(heavy ? 45 : 18);
    }
    d.hp -= dmg; d.taken = (d.taken || 0) + dmg;
    if (d.hp <= 0) this.knockdown(d, a);
  }

  knockdown(d, a) {
    d.hp = 0; d.down = true; d.kd++; d.action = null; d.combo = null; d.stun = 0; d.blocking = false; d.dodgeT = 0;
    a.action = null; a.combo = null; a.blocking = false;
    a.score += 25;
    this.state = 'down'; this.stateT = 0; this.count = 0; this.countT = 0; this.downF = d; this.mash = 0;
    this.slowmo = 0.7;
    this.mashNeed = Math.max(8, 10 + d.kd * 7 - Math.floor(d.st.chin / 8));
    this.shake = 14; this.hype = 1;
    this.input = { left: false, right: false, block: false };
    Sfx.hit(true); Sfx.crowd();
    buzz(d.isPlayer ? [120, 60, 220] : 60);
    this.banner('נוקדאון!', d.isPlayer ? 'לחץ על כפתורי האגרוף במהירות כדי לקום' : '', 1.4);
    if (!d.isPlayer) {
      const p = 0.95 - (d.kd - 1) * 0.3 + (d.st.chin - a.st.power) / 80;
      d.willRise = d.kd < 3 && Math.random() < p;
      d.riseAt = 3 + Math.floor(Math.random() * 5);
    }
  }

  updateDown(dt) {
    const d = this.downF, a = d === this.p ? this.o : this.p;
    const home = a === this.p ? 250 : 710;
    a.x += clamp(home - a.x, -220 * dt, 220 * dt);
    a.sta = Math.min(a.maxSta, a.sta + 25 * dt);
    if (d.kd >= 3 && this.stateT > 1.6) { this.finish(a, 'TKO', 'שלושה נוקדאונים בקרב'); return; }
    this.countT += dt;
    if (this.countT >= 0.9) {
      this.countT = 0; this.count++; Sfx.tick();
      if (this.count >= 10) { this.finish(a, 'KO', 'נספר עד 10'); return; }
    }
    if (this.count >= 1 && d.kd < 3) {
      const rise = d.isPlayer ? this.mash >= this.mashNeed && this.count >= 2 : d.willRise && this.count >= d.riseAt;
      if (rise) {
        d.down = false; d.hp = Math.max(d.maxHp * 0.2, d.maxHp * (0.55 - 0.12 * d.kd)); d.hpLag = d.hp;
        d.sta = Math.max(d.sta, d.maxSta * 0.6); d.stun = 0.3;
        this.state = 'fight'; this.stateT = 0;
        this.banner('קם על הרגליים!', '', 1);
      }
    }
  }

  endRound() {
    Sfx.bell();
    if (this.round >= this.rounds) { this.decision(); return; }
    this.state = 'break'; this.stateT = 0;
    this.p.action = this.o.action = null; this.p.blocking = this.o.blocking = false;
    this.banner(`סוף סיבוב ${this.round}`, 'מנוחה בפינה…', 3.2);
  }
  nextRound() {
    this.round++; this.timer = this.roundLen;
    for (const f of [this.p, this.o]) {
      f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.22); f.hpLag = f.hp; f.sta = f.maxSta;
      f.action = null; f.combo = null; f.stun = 0; f.dodgeT = 0;
    }
    this.p.x = 330; this.o.x = 630;
    this.state = 'intro'; this.stateT = 0;
    this.banner(this.round === this.rounds ? 'סיבוב אחרון' : `סיבוב ${this.round}`, '', 1.6);
  }
  decision() {
    const ps = this.p.score, os = this.o.score, won = ps >= os, tot = ps + os || 1, r = this.rounds, cards = [];
    for (let j = 0; j < 3; j++) {
      const m = clamp(Math.round(Math.abs(ps - os) / tot * r * 3 + rand(-1, 1)), 1, r * 2), w = 10 * r;
      cards.push(won ? `${w}-${w - m}` : `${w - m}-${w}`);
    }
    this.finish(won ? this.p : this.o, 'DEC', 'החלטת שופטים', cards);
  }
  finish(winner, method, note, cards) {
    const won = winner === this.p;
    this.state = 'over'; this.stateT = 0;
    this.result = {
      won, method, note, cards: cards || null, round: this.round,
      landed: this.p.landed, thrown: this.p.thrown, oLanded: this.o.landed, oThrown: this.o.thrown,
      kdFor: this.o.kd, kdAgainst: this.p.kd
    };
    Sfx.crowd();
    const big = method === 'DEC' ? (won ? 'ניצחון!' : 'הפסד') : method === 'KO' ? 'נוקאאוט!' : 'TKO!';
    this.banner(big, won ? `${this.p.name} מנצח` : `${this.o.name} מנצח`, 3);
  }
  forfeit() {
    this.paused = false;
    this.finish(this.o, 'RET', 'כניעה');
    this.stateT = 2.4;
  }

  // ---------- אפקטים ----------
  spark(x, y, heavy, blocked) {
    const n = blocked ? 6 : heavy ? 16 : 10;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(80, heavy ? 420 : 280);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: rand(0.25, 0.55), t: 0, c: blocked ? '#cfd6e4' : Math.random() < 0.5 ? 'rgba(235,245,255,.9)' : 'rgba(190,215,240,.75)', r: rand(1.5, 3.5) });
    }
    this.rings.push({ x, y, t: 0, max: heavy ? 60 : 40, c: blocked ? '200,210,230' : '255,226,150' });
  }
  say(text, x, y, color, size) { this.texts.push({ text, x, y, color, size, t: 0 }); }
  banner(text, sub, dur) { this.ban = { text, sub, t: 0, dur }; }
  updateFx(dt) {
    for (const q of this.particles) { q.t += dt; q.vy += 700 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    this.particles = this.particles.filter(q => q.t < q.life);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter(r => r.t < 0.3);
    for (const t of this.texts) { t.t += dt; t.y -= 40 * dt; }
    this.texts = this.texts.filter(t => t.t < 0.9);
    if (this.ban) { this.ban.t += dt; if (this.ban.t > this.ban.dur) this.ban = null; }
    if (Math.random() < dt * (0.4 + this.hype * 4)) this.flashes.push({ x: rand(0, FW), y: rand(130, 250), t: 0 });
    for (const f of this.flashes) f.t += dt;
    this.flashes = this.flashes.filter(f => f.t < 0.18);
  }

  // ---------- ציור ----------
  poseOf(f) {
    const p = {
      block: f.blockV, snap: f.snap, fall: f.fall, hurt: f.stun > 0.05, win: f.winV,
      bob: f.down || f.winV > 0.5 ? 0 : Math.abs(Math.sin(f.bobT * 4.6)) * 3.6 * (f.sta / f.maxSta * 0.6 + 0.4),
      sway: f.bobT * 2.3, stride: Math.sin(f.walkT * 14) * f.moveAmt * 7,
      dmg: Math.min(1, (f.taken || 0) / (f.maxHp * 1.6)), sweat: Math.min(1, this.elapsed / 140)
    };
    const a = f.action;
    if (a) {
      const e = clamp(a.t < a.wind ? 1 - Math.pow(1 - a.t / a.wind, 2) : 1 - (a.t - a.wind) / a.rec, 0, 1);
      if (a.type === 'jab') { p.lead = e; p.leanX = e * 4; }
      else if (a.type === 'cross') { p.rear = e; p.leanX = e * 10; }
      else { p.rear = e; p.upper = 1; p.leanX = e * 6; p.duck = a.t < a.wind ? Math.sin(e * Math.PI) * 0.3 : 0; }
    }
    if (f.dashT > 0) { const k = f.dashT / DASH_T; p.leanX = (p.leanX || 0) + f.dashDir * 12 * k; p.stride = f.dashDir * 12 * k; p.duck = Math.max(p.duck || 0, 0.25 * k); }
    if (f.dodgeT > 0) { const k = Math.sin((1 - f.dodgeT / DODGE_T) * Math.PI); p.duck = Math.max(p.duck || 0, k * 0.9); p.leanX = -16 * k; }
    return p;
  }

  render() {
    const c = this.canvas;
    if (this.needSize) { if (!sizeCanvas(c, LOW_FX ? 1.25 : 2)) return; this.needSize = false; }
    const ctx = this.ctx, k = c.width / FW, t = performance.now() / 1000;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);
    drawArenaScene(ctx, FW, FH, t, this.hype, this.flashes, FLOOR);
    const order = this.o.action && !this.p.action ? [this.p, this.o] : [this.o, this.p];
    for (const f of order) {
      if (f.trail.length > 2) {
        const pose = this.poseOf(f);
        for (const [i, a] of [[2, 0.14], [5, 0.08]]) if (f.trail[i] != null) { ctx.globalAlpha = a; drawFighter(ctx, f.look, f.trail[i], FLOOR, f.dir, pose, f.scale); }
        ctx.globalAlpha = 1;
      }
      drawFighter(ctx, f.look, f.x, FLOOR, f.dir, this.poseOf(f), f.scale);
    }
    for (const q of this.particles) { ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.c; circle(ctx, q.x, q.y, q.r); }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const e = r.t / 0.3, rad = 10 + r.max * 0.7 * e, fg = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, rad);
      fg.addColorStop(0, `rgba(${r.c},${0.7 * (1 - e)})`); fg.addColorStop(1, `rgba(${r.c},0)`);
      ctx.fillStyle = fg; circle(ctx, r.x, r.y, rad);
    }
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const tx of this.texts) {
      ctx.globalAlpha = 1 - tx.t / 0.9; ctx.font = `700 ${tx.size}px Rubik, sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(tx.text, tx.x, tx.y);
      ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    drawArenaFront(ctx, FW, FH, t);
    this.drawOverlay(ctx);
    this.updateHud();
  }

  drawOverlay(ctx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this.state === 'down') {
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, 0, FW, FH);
      if (this.count > 0) {
        const pulse = 1 + (1 - Math.min(1, this.countT / 0.25)) * 0.25;
        ctx.save(); ctx.translate(FW / 2, 150); ctx.scale(pulse, pulse);
        ctx.font = '120px "Secular One", Rubik, sans-serif'; ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.strokeText(String(this.count), 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(String(this.count), 0, 0); ctx.restore();
      }
      if (this.downF === this.p && this.p.kd < 3) {
        const w = 320, pr = Math.min(1, this.mash / this.mashNeed);
        ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(ctx, FW / 2 - w / 2, 236, w, 18, 9); ctx.fill();
        ctx.fillStyle = pr >= 1 ? '#2ec27e' : '#f4b73f'; rr(ctx, FW / 2 - w / 2 + 3, 239, (w - 6) * pr, 12, 6); ctx.fill();
        ctx.font = '700 20px Rubik, sans-serif'; ctx.fillStyle = '#fff';
        ctx.fillText('לחץ על כפתורי האגרוף מהר כדי לקום!', FW / 2, 280);
      }
    }
    if (this.state === 'break') { ctx.fillStyle = 'rgba(5,6,10,.55)'; ctx.fillRect(0, 0, FW, FH); }
    const b = this.ban;
    if (b) {
      const inT = Math.min(1, b.t / 0.18), outT = Math.min(1, (b.dur - b.t) / 0.25), a = Math.min(inT, outT);
      const y = this.state === 'down' ? 60 : 130;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(FW / 2, y); const sc = 0.8 + 0.2 * inT; ctx.scale(sc, sc);
      ctx.font = '64px "Secular One", Rubik, sans-serif'; ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.strokeText(b.text, 0, 0); ctx.fillStyle = '#ffffff'; ctx.fillText(b.text, 0, 0);
      if (b.sub) { ctx.font = '600 22px Rubik, sans-serif'; ctx.lineWidth = 6; ctx.strokeText(b.sub, 0, 52); ctx.fillStyle = '#ffd27a'; ctx.fillText(b.sub, 0, 52); }
      ctx.restore();
    }
  }

  updateHud() {
    const h = this.hud, cache = this.hudCache;
    const bar = (el, v) => {
      const q = Math.round(Math.max(0, Math.min(1, v)) * 400) / 400;
      if (cache.get(el) !== q) { cache.set(el, q); el.style.transform = `scaleX(${q})`; }
    };
    const set = (el, f) => {
      bar(el.hp, f.hp / f.maxHp); bar(el.lag, f.hpLag / f.maxHp); bar(el.sta, f.sta / f.maxSta);
      const low = f.sta < f.maxSta * 0.25;
      if (el.sta._low !== low) { el.sta._low = low; el.sta.classList.toggle('low', low); }
      const kd = '●'.repeat(f.kd);
      if (el.kd.textContent !== kd) el.kd.textContent = kd;
    };
    set(h.p, this.p); set(h.o, this.o);
    const s = Math.ceil(this.timer), txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (h.time.textContent !== txt) h.time.textContent = txt;
    const rt = `סיבוב ${this.round}/${this.rounds}`;
    if (h.round.textContent !== rt) h.round.textContent = rt;
  }
}
