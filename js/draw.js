// ===== ציור ריאליסטי של הלוחמים והזירה (Canvas, מבט צד) =====
// תאורה: אור ראשי מלמעלה-קדימה, צל בצד האחורי, הדגשת שוליים (rim light) מהפרוז׳קטורים.
const DEFAULT_POSE = { lead: 0, rear: 0, upper: 0, block: 0, leanX: 0, duck: 0, snap: 0, fall: 0, bob: 0, stride: 0, hurt: false, win: 0, dmg: 0, sweat: 0, sway: 0, robe: false };

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = amt < 0 ? v => Math.round(v * (1 + amt)) : v => Math.round(v + (255 - v) * amt);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function shadeHex(hex, amt) {
  return '#' + shade(hex, amt).match(/\d+/g).map(v => (+v).toString(16).padStart(2, '0')).join('');
}
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
const lerp = (a, b, t) => a + (b - a) * t;
const lp = (A, B, t) => [lerp(A[0], B[0], t), lerp(A[1], B[1], t)];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); }
function limb(ctx, pts, w, color) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}
function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath(); ctx.fill();
}

// ---------- גפיים עם נפח (גרדיאנט גלילי + שריר) ----------
function cylGrad(ctx, A, B, w, base, light = 0.22, dark = 0.4) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
  let nx = -dy / L, ny = dx / L;
  if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
  const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
  const g = ctx.createLinearGradient(mx + nx * w / 2, my + ny * w / 2, mx - nx * w / 2, my - ny * w / 2);
  g.addColorStop(0, shade(base, light)); g.addColorStop(0.28, base); g.addColorStop(0.75, shade(base, -dark * 0.5)); g.addColorStop(1, shade(base, -dark));
  return g;
}
function taper(ctx, A, B, wA, wB, base, bulge, light, dark) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  ctx.fillStyle = cylGrad(ctx, A, B, Math.max(wA, wB) * 1.15, base, light, dark);
  ctx.beginPath();
  ctx.moveTo(A[0] + nx * wA / 2, A[1] + ny * wA / 2); ctx.lineTo(B[0] + nx * wB / 2, B[1] + ny * wB / 2);
  ctx.lineTo(B[0] - nx * wB / 2, B[1] - ny * wB / 2); ctx.lineTo(A[0] - nx * wA / 2, A[1] - ny * wA / 2);
  ctx.closePath(); ctx.fill();
  circle(ctx, A[0], A[1], wA / 2); circle(ctx, B[0], B[1], wB / 2);
  if (bulge) {
    const [t, wf] = bulge;
    ell(ctx, lerp(A[0], B[0], t), lerp(A[1], B[1], t), L * 0.34, lerp(wA, wB, t) * wf / 2, Math.atan2(dy, dx));
  }
}

// ---------- נעליים גבוהות ----------
function shoe(ctx, x, c) {
  const y = 0;
  const g = ctx.createLinearGradient(x, y - 36, x + 6, y);
  g.addColorStop(0, shade(c, 0.22)); g.addColorStop(0.55, c); g.addColorStop(1, shade(c, -0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 36); ctx.lineTo(x + 6, y - 36);
  ctx.quadraticCurveTo(x + 8, y - 19, x + 14, y - 13); ctx.quadraticCurveTo(x + 25, y - 10, x + 24, y - 3);
  ctx.lineTo(x + 24, y - 1); ctx.lineTo(x - 14, y - 1); ctx.quadraticCurveTo(x - 16, y - 20, x - 12, y - 36);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e6e6ea'; rr(ctx, x - 15, y - 5, 40, 5, 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 15, y - 1.5, 40, 1.5);
  ctx.strokeStyle = lum(c) > 0.7 ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.3;
  for (let i = 0; i < 5; i++) { const yy = y - 32 + i * 4.6; ctx.beginPath(); ctx.moveTo(x + 1 + i * 1.2, yy); ctx.lineTo(x + 6.5 + i * 1.5, yy + 1.4); ctx.stroke(); }
  ctx.fillStyle = shade(c, -0.4); rr(ctx, x - 12, y - 38, 19, 4, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ell(ctx, x + 16, y - 9, 5, 2, -0.3);
}

// ---------- מכנסיים ----------
function shortsPath(ctx, by) {
  ctx.beginPath();
  ctx.moveTo(-25, -134 + by); ctx.lineTo(25, -134 + by); ctx.lineTo(35, -80 + by); ctx.lineTo(5, -80 + by);
  ctx.lineTo(1, -93 + by); ctx.lineTo(-3, -80 + by); ctx.lineTo(-34, -80 + by); ctx.closePath();
}
function drawShorts(ctx, c, by, pattern) {
  const g = ctx.createLinearGradient(-35, 0, 36, 0);
  g.addColorStop(0, shade(c, -0.42)); g.addColorStop(0.3, shade(c, -0.12)); g.addColorStop(0.58, shade(c, 0.28));
  g.addColorStop(0.7, c); g.addColorStop(1, shade(c, -0.22));
  ctx.fillStyle = g; shortsPath(ctx, by); ctx.fill();
  ctx.save(); shortsPath(ctx, by); ctx.clip();
  const band = lum(c) > 0.72 ? '#1b1d22' : '#f2f2f2';
  if (pattern === 'pt_flames') {
    const fl = (col, h) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-40, -78 + by);
      for (let i = 0; i <= 8; i++) { const x = -36 + i * 9; ctx.quadraticCurveTo(x - 2, -90 + by, x + 2, -80 - h - (i % 3) * 8 + by); ctx.quadraticCurveTo(x + 3, -88 + by, x + 5, -84 + by); }
      ctx.lineTo(40, -78 + by); ctx.closePath(); ctx.fill();
    };
    fl('#ff6a1a', 22); fl('#ffc93a', 10);
  } else if (pattern === 'pt_stars') {
    ctx.fillStyle = band; [[-18, -112], [8, -104], [20, -122], [-6, -92], [-26, -94], [24, -92]].forEach(([x, y]) => star(ctx, x, y + by, 5));
  } else if (pattern === 'pt_stripes') {
    ctx.fillStyle = band; ctx.fillRect(-13, -128 + by, 4, 50); ctx.fillRect(3, -128 + by, 4, 50);
  } else if (pattern === 'pt_gold') {
    ctx.fillStyle = '#e3b23c'; ctx.fillRect(-40, -86 + by, 80, 6); ctx.fillRect(-6, -128 + by, 6, 46);
  }
  // קפלי בד וברק סאטן
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, -124 + by); ctx.quadraticCurveTo(-15, -104 + by, -13, -82 + by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(13, -122 + by); ctx.quadraticCurveTo(21, -104 + by, 20, -82 + by); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(8, -126 + by); ctx.quadraticCurveTo(14, -104 + by, 12, -84 + by); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-40, -85 + by, 80, 5);
  ctx.restore();
  const wb = pattern === 'pt_gold' ? '#e3b23c' : band;
  const wg = ctx.createLinearGradient(0, -139 + by, 0, -128 + by);
  wg.addColorStop(0, shade(wb.length === 7 ? wb : '#f2f2f2', 0.3)); wg.addColorStop(1, shade(wb.length === 7 ? wb : '#f2f2f2', -0.25));
  ctx.fillStyle = wg; rr(ctx, -27, -139 + by, 54, 11, 3); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-26, -134 + by, 52, 1);
  if (!pattern) { ctx.fillStyle = band; ctx.globalAlpha = 0.75; ctx.fillRect(-4, -128 + by, 4, 46); ctx.globalAlpha = 1; }
}

// ---------- גו ----------
function torsoPath(ctx, lx, by) {
  ctx.beginPath();
  ctx.moveTo(-20, -124 + by);
  ctx.bezierCurveTo(-28, -146 + by, -33 + lx * 0.6, -172 + by, -22 + lx, -190 + by);
  ctx.quadraticCurveTo(0 + lx, -198 + by, 20 + lx, -191 + by);
  ctx.bezierCurveTo(34 + lx, -179 + by, 30, -150 + by, 21, -124 + by);
  ctx.closePath();
}
function drawTorso(ctx, skin, lx, by, p) {
  // צוואר + צל של הלסת
  const nA = [5 + lx, -188 + by], nB = [5 + lx, -208 + by];
  taper(ctx, nA, nB, 19, 16, shadeHex(skin, -0.08));
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ell(ctx, 10 + lx, -202 + by, 9, 5, 0.2);
  const g = ctx.createRadialGradient(10 + lx, -178 + by, 4, 2 + lx, -160 + by, 64);
  g.addColorStop(0, shade(skin, 0.2)); g.addColorStop(0.4, skin); g.addColorStop(0.8, shade(skin, -0.2)); g.addColorStop(1, shade(skin, -0.38));
  ctx.fillStyle = g; torsoPath(ctx, lx, by); ctx.fill();
  ctx.save(); torsoPath(ctx, lx, by); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ell(ctx, -29 + lx * 0.5, -156 + by, 13, 44);
  // הגדרת שרירים
  const def = shade(skin, -0.32);
  ctx.strokeStyle = def; ctx.lineCap = 'round';
  ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(2 + lx, -172 + by); ctx.quadraticCurveTo(16 + lx, -158 + by, 29 + lx * 0.8, -165 + by); ctx.stroke();
  ctx.globalAlpha = 0.35; ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) { const y = -150 + i * 9 + by; ctx.beginPath(); ctx.moveTo(15 + lx * 0.4, y); ctx.quadraticCurveTo(21 + lx * 0.3, y + 2, 26 + lx * 0.2, y - 1); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(14 + lx * 0.5, -154 + by); ctx.lineTo(14 + lx * 0.2, -128 + by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6 + lx * 0.5, -160 + by); ctx.quadraticCurveTo(2, -138 + by, 8, -126 + by); ctx.stroke();
  ctx.globalAlpha = 1;
  // ברק מהתאורה (ובזיעה — יותר)
  ctx.fillStyle = `rgba(255,248,235,${0.1 + p.sweat * 0.18})`;
  ell(ctx, 16 + lx, -174 + by, 9, 4, -0.4); ell(ctx, 22 + lx * 0.5, -144 + by, 3, 6, 0.1);
  if (p.sweat > 0.3) { ctx.fillStyle = `rgba(255,255,255,${p.sweat * 0.35})`; [[4, -150], [18, -132], [-8, -170], [10, -186]].forEach(([x, y]) => circle(ctx, x + lx * 0.5, y + by, 1.3)); }
  ctx.restore();
  // קו אור קדמי
  ctx.strokeStyle = 'rgba(255,236,210,.28)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(20 + lx, -191 + by); ctx.bezierCurveTo(34 + lx, -179 + by, 30, -150 + by, 21, -126 + by); ctx.stroke();
}

function drawTop(ctx, item, lx, by) {
  ctx.save(); torsoPath(ctx, lx, by); ctx.clip();
  const g = ctx.createLinearGradient(-34, 0, 34, 0);
  g.addColorStop(0, shade(item.color, -0.4)); g.addColorStop(0.55, item.color); g.addColorStop(0.75, shade(item.color, 0.18)); g.addColorStop(1, shade(item.color, -0.15));
  ctx.fillStyle = g;
  ctx.fillRect(-45, -179 + by, 90, 60);
  ctx.fillRect(-12 + lx * 0.8, -198 + by, 12, 24);
  if (item.camo) {
    const blobs = [[-14, -168, '#6b7a4a'], [8, -150, '#2f3824'], [-6, -138, '#7d6b45'], [16, -172, '#2f3824'], [-20, -146, '#7d6b45'], [4, -128, '#6b7a4a']];
    for (const [x, y, c] of blobs) { ctx.fillStyle = c; ell(ctx, x + lx * 0.5, y + by, 9, 5, 0.6); }
  }
  if (item.trim) { ctx.fillStyle = item.trim; ctx.fillRect(-45, -181 + by, 90, 3); ctx.fillRect(-45, -130 + by, 90, 4); }
  ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(0, -170 + by); ctx.quadraticCurveTo(8, -150 + by, 4, -132 + by); ctx.stroke();
  ctx.restore();
}

function drawNeck(ctx, id, lx, by) {
  ctx.save(); ctx.lineCap = 'round';
  if (id === 'chain') {
    ctx.strokeStyle = '#e8c150'; ctx.lineWidth = 3; ctx.setLineDash([3, 1.5]);
    ctx.beginPath(); ctx.moveTo(1 + lx, -196 + by); ctx.quadraticCurveTo(7 + lx, -173 + by, 21 + lx, -172 + by); ctx.stroke();
    ctx.setLineDash([]);
    const g = ctx.createRadialGradient(21 + lx, -168 + by, 0.5, 22 + lx, -166 + by, 5);
    g.addColorStop(0, '#fff3c4'); g.addColorStop(0.5, '#f0c14e'); g.addColorStop(1, '#9c6f12');
    ctx.fillStyle = g; circle(ctx, 22 + lx, -166 + by, 4.8);
  } else if (id === 'tags') {
    ctx.strokeStyle = '#c9ccd4'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(1 + lx, -196 + by); ctx.quadraticCurveTo(7 + lx, -175 + by, 19 + lx, -173 + by); ctx.stroke();
    ctx.fillStyle = '#d7dae1'; ctx.translate(20 + lx, -166 + by); ctx.rotate(-0.2); rr(ctx, -3, -5, 7, 10, 2); ctx.fill();
  }
  ctx.restore();
}

function drawRobe(ctx, item, lx, by) {
  ctx.save();
  const g = ctx.createLinearGradient(-42, 0, 42, 0);
  g.addColorStop(0, shade(item.color, -0.45)); g.addColorStop(0.55, item.color); g.addColorStop(0.75, shade(item.color, 0.2)); g.addColorStop(1, shade(item.color, -0.2));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-23 + lx, -194 + by); ctx.lineTo(20 + lx, -194 + by);
  ctx.quadraticCurveTo(38, -150 + by, 42, -56); ctx.lineTo(-42, -56); ctx.quadraticCurveTo(-38, -150 + by, -23 + lx, -194 + by);
  ctx.closePath(); ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
  [[-20, -120], [-6, -100], [12, -110]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y + by); ctx.quadraticCurveTo(x - 4, (y - 56) / 2, x - 2, -58); ctx.stroke(); });
  ctx.fillStyle = item.trim; ctx.fillRect(-50, -64, 100, 8); ctx.fillRect(-50, -134 + by, 100, 8);
  ctx.restore();
  ctx.strokeStyle = item.trim; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(4 + lx, -195 + by); ctx.lineTo(24 + lx * 0.5, -140 + by); ctx.lineTo(36, -60); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(30, -130 + by); ctx.lineTo(36, -100 + by); ctx.moveTo(30, -130 + by); ctx.lineTo(26, -104 + by); ctx.stroke();
}

// ---------- שיער ----------
function hairFill(ctx, hx, hy, r, c) {
  const g = ctx.createLinearGradient(hx, hy - r * 1.6, hx - 4, hy + r * 0.8);
  g.addColorStop(0, shade(c, 0.3)); g.addColorStop(0.35, c); g.addColorStop(1, shade(c, -0.3));
  return g;
}
function capPath(ctx, hx, hy, r) {
  ctx.beginPath();
  ctx.moveTo(hx + r * 1.15, hy - r * 0.42);
  ctx.quadraticCurveTo(hx + r * 0.3, hy - r * 0.64, hx - r * 0.05, hy - r * 0.25);
  ctx.quadraticCurveTo(hx - r * 0.18, hy + r * 0.3, hx - r * 0.32, hy + r * 0.55);
  ctx.lineTo(hx - r * 1.4, hy + r * 0.75); ctx.lineTo(hx - r * 1.4, hy - r * 1.7); ctx.lineTo(hx + r * 1.4, hy - r * 1.7);
  ctx.closePath();
}
function hairBack(ctx, look, hx, hy, r) {
  const c = look.hairColor;
  ctx.fillStyle = hairFill(ctx, hx, hy, r * 1.4, c); ctx.strokeStyle = c;
  if (look.hairStyle === 'afro') {
    circle(ctx, hx - 5, hy - 8, r * 1.5);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    for (let i = 0; i < 22; i++) { const a = i * 2.4, d = (i % 5) * 6 + 5; circle(ctx, hx - 5 + Math.cos(a) * d, hy - 8 + Math.sin(a) * d, 2.6); }
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ell(ctx, hx - 2, hy - 30, 16, 6, -0.2);
  } else if (look.hairStyle === 'pony') {
    ctx.strokeStyle = hairFill(ctx, hx, hy + 20, r, c); ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx - r + 1, hy - 8); ctx.quadraticCurveTo(hx - r - 20, hy + 2, hx - r - 16, hy + 30); ctx.stroke();
    ctx.fillStyle = shade(c, -0.1); circle(ctx, hx - r + 1, hy - 8, 7);
  } else if (look.hairStyle === 'dreads') {
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.0 + i * 0.07), sx = hx + Math.cos(a) * r * 0.9, sy = hy + Math.sin(a) * r * 0.9;
      ctx.strokeStyle = i % 2 ? c : shade(c, 0.12); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - 8, sy + 16, sx - 5 - i * 1.4, sy + 34 + (i % 2) * 7); ctx.stroke();
    }
  }
}
function hairFront(ctx, look, hx, hy, r) {
  const st = look.hairStyle, c = look.hairColor;
  if (st === 'bald') {
    const g = ctx.createRadialGradient(hx + 4, hy - r * 0.65, 0, hx + 4, hy - r * 0.65, 9);
    g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ell(ctx, hx + 4, hy - r * 0.62, 9, 5, -0.3);
    return;
  }
  ctx.fillStyle = hairFill(ctx, hx, hy, r, c);
  if (st === 'short' || st === 'dreads' || st === 'pony') ell(ctx, hx - 3, hy - r * 0.72, r * 0.98, r * 0.44, -0.08);
  ctx.save();
  ctx.beginPath(); ctx.arc(hx, hy, r + (st === 'buzz' ? 1 : 2.5), 0, Math.PI * 2); ctx.clip();
  ctx.globalAlpha = st === 'buzz' ? 0.8 : st === 'mohawk' ? 0.3 : 1;
  capPath(ctx, hx, hy, r); ctx.fill();
  ctx.globalAlpha = 1;
  if (st === 'short' || st === 'pony' || st === 'afro') {
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(hx - 14 + i * 5, hy - r - 2); ctx.quadraticCurveTo(hx - 16 + i * 5, hy - r * 0.5, hx - 20 + i * 4, hy - 4); ctx.stroke(); }
  }
  ctx.restore();
  if (st === 'mohawk') {
    const a0 = -0.28 * Math.PI, a1 = -0.98 * Math.PI, n = 8;
    ctx.fillStyle = hairFill(ctx, hx, hy - 6, r, c); ctx.beginPath();
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, q = i % 2 ? r + 14 : r + 1; ctx.lineTo(hx + Math.cos(a) * q, hy + Math.sin(a) * q); }
    for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; ctx.lineTo(hx + Math.cos(a) * (r - 7), hy + Math.sin(a) * (r - 7)); }
    ctx.closePath(); ctx.fill();
  }
}
function beard(ctx, look, hx, hy, r) {
  if (look.beard === 'none') return;
  ctx.save(); ctx.fillStyle = hairFill(ctx, hx, hy + 14, r * 0.6, look.hairColor);
  if (look.beard === 'mustache') { rr(ctx, hx + 12, hy + 6, 12, 4.5, 2); ctx.fill(); ctx.restore(); return; }
  ctx.globalAlpha = look.beard === 'stubble' ? 0.32 : 1;
  ctx.beginPath(); ctx.arc(hx, hy, r + 0.5, 0, Math.PI * 2); ctx.ellipse(hx + 9, hy + 11, 13.5, 11.5, 0.2, 0, Math.PI * 2); ctx.clip();
  ctx.beginPath(); ctx.moveTo(hx - 5, hy - 2); ctx.lineTo(hx + 2, hy + 3); ctx.quadraticCurveTo(hx + 14, hy + 5, hx + 27, hy + 5);
  ctx.lineTo(hx + 30, hy + 32); ctx.lineTo(hx - 8, hy + 32); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---------- ראש ופנים ----------
function drawHead(ctx, look, hx, hy, p) {
  const r = 21, skin = look.skin, skinD = shade(skin, -0.24);
  hairBack(ctx, look, hx, hy, r);
  const g = ctx.createRadialGradient(hx + 9, hy - 9, 2, hx + 2, hy + 2, r * 1.45);
  g.addColorStop(0, shade(skin, 0.2)); g.addColorStop(0.45, skin); g.addColorStop(0.85, shade(skin, -0.22)); g.addColorStop(1, shade(skin, -0.38));
  ctx.fillStyle = g;
  circle(ctx, hx, hy, r);
  ell(ctx, hx + 9, hy + 11, 13, 11, 0.2);
  // אף
  ctx.beginPath(); ctx.moveTo(hx + 18, hy - 7); ctx.quadraticCurveTo(hx + 27, hy + 3, hx + 25, hy + 6); ctx.lineTo(hx + 18, hy + 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ell(ctx, hx + 20, hy + 6, 2.2, 1.2);
  // עצמות לחיים וצל לסת
  ctx.fillStyle = 'rgba(255,240,225,.12)'; ell(ctx, hx + 14, hy + 1, 5, 3, 0.3);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ell(ctx, hx + 6, hy + 16, 9, 4, 0.3);
  beard(ctx, look, hx, hy, r);
  // עין
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ell(ctx, hx + 14, hy - 5, 6, 3.4);
  if (p.hurt || p.fall > 0.3) {
    ctx.strokeStyle = '#1a120e'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx + 10, hy - 2); ctx.quadraticCurveTo(hx + 14, hy - 1, hx + 18, hy - 3); ctx.stroke();
  } else {
    ctx.fillStyle = '#efe8e0'; ell(ctx, hx + 14.5, hy - 3, 3.4, 2.3);
    ctx.fillStyle = '#2b1d15'; circle(ctx, hx + 16, hy - 3, 1.7);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; circle(ctx, hx + 16.5, hy - 3.6, 0.5);
    ctx.strokeStyle = shade(skin, -0.5); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(hx + 11, hy - 4.5); ctx.quadraticCurveTo(hx + 14.5, hy - 6.5, hx + 18.5, hy - 4); ctx.stroke();
  }
  // גבה
  ctx.strokeStyle = look.hairStyle === 'bald' && look.beard === 'none' ? shade(skin, -0.55) : shade(look.hairColor, 0.05);
  ctx.lineWidth = 2.8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx + 8, hy - 9.5); ctx.quadraticCurveTo(hx + 14, hy - 11.5 + (p.win ? -1.5 : 0), hx + 20, hy - 8.5); ctx.stroke();
  // שפתיים
  ctx.fillStyle = shade(skin, -0.35);
  if (p.win) { ctx.beginPath(); ctx.moveTo(hx + 13, hy + 11); ctx.quadraticCurveTo(hx + 17, hy + 16, hx + 22, hy + 11); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f3f1ea'; ell(ctx, hx + 17.5, hy + 12, 3.5, 1.3); }
  else { ell(ctx, hx + 18, hy + 12.5, 4, 1.6, -0.1); }
  // נזק: חבורות, נפיחות, חתך
  const d = p.dmg || 0;
  if (d > 0.15) {
    const a = Math.min(1, (d - 0.15) / 0.85);
    const bg = ctx.createRadialGradient(hx + 13, hy + 3, 0, hx + 13, hy + 3, 9);
    bg.addColorStop(0, `rgba(135,30,55,${0.45 * a})`); bg.addColorStop(1, 'rgba(135,30,55,0)');
    ctx.fillStyle = bg; ell(ctx, hx + 13, hy + 3, 9, 7);
    if (a > 0.35) {
      ctx.fillStyle = `rgba(85,30,85,${0.35 * a})`; ell(ctx, hx + 15, hy - 3, 5, 3.6);
      ctx.fillStyle = shade(skin, -0.05); ell(ctx, hx + 15, hy - 6.5, 4.5 * a, 2.4 * a, 0.1);
    }
    if (a > 0.6) {
      ctx.strokeStyle = '#8a0f18'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx + 10, hy - 12); ctx.lineTo(hx + 17, hy - 10.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(165,15,25,.85)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(hx + 13, hy - 10.5); ctx.quadraticCurveTo(hx + 12, hy - 6, hx + 12.5, hy - 10.5 + 12 * a); ctx.stroke();
    }
  }
  // זיעה על המצח
  if (p.sweat > 0.25) { ctx.fillStyle = `rgba(255,255,255,${p.sweat * 0.5})`; circle(ctx, hx + 12, hy - 14, 1.2); circle(ctx, hx + 4, hy - 17, 1); }
  const of = look.outfit || {};
  if (of.face === 'paint') { ctx.fillStyle = '#141414'; rr(ctx, hx + 9, hy + 2, 11, 3, 1.5); ctx.fill(); rr(ctx, hx + 10, hy + 6, 9, 2.5, 1.2); ctx.fill(); }
  if (of.head !== 'bandana' && of.head !== 'headgear') hairFront(ctx, look, hx, hy, r);
  // אוזן
  ctx.fillStyle = skinD; ell(ctx, hx - 3, hy + 2, 5, 7);
  ctx.strokeStyle = shade(skin, -0.45); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(hx - 3, hy + 2, 3, -1.2, 1.6); ctx.stroke();
  if (of.face === 'shades') {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + 10, hy - 4); ctx.lineTo(hx - 2, hy - 2); ctx.stroke();
    const sg = ctx.createLinearGradient(hx + 8, hy - 8, hx + 24, hy);
    sg.addColorStop(0, '#2a3342'); sg.addColorStop(0.5, '#0c0f14'); sg.addColorStop(1, '#1d2533');
    ctx.fillStyle = sg; rr(ctx, hx + 8, hy - 8, 16, 8, 3); ctx.fill();
    ctx.fillStyle = 'rgba(160,200,255,.45)'; rr(ctx, hx + 15, hy - 7, 5, 2, 1); ctx.fill();
  }
  if (of.head) drawHeadwear(ctx, WARDROBE_BY_ID[of.head], hx, hy, r, look);
}

function drawHeadwear(ctx, item, hx, hy, r, look) {
  if (!item) return;
  ctx.save(); ctx.lineCap = 'round';
  if (item.id === 'band_red' || item.id === 'band_white') {
    ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, r + 2.5, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(0, hy - 14, 0, hy - 7); g.addColorStop(0, shade(item.color, 0.2)); g.addColorStop(1, shade(item.color, -0.25));
    ctx.fillStyle = g; ctx.fillRect(hx - r - 4, hy - 14, 2 * r + 8, 7); ctx.restore();
    ctx.strokeStyle = item.color; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(hx - r, hy - 10); ctx.lineTo(hx - r - 12, hy - 2); ctx.moveTo(hx - r, hy - 10); ctx.lineTo(hx - r - 9, hy + 7); ctx.stroke();
  } else if (item.id === 'bandana') {
    ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, r + 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = hairFill(ctx, hx, hy, r, item.color); ctx.fillRect(hx - r - 4, hy - r - 6, 2 * r + 8, r - 1);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; [[-10, -16], [0, -19], [10, -14], [-4, -9], [6, -8], [-14, -6]].forEach(([x, y]) => circle(ctx, hx + x, hy + y, 1.6));
    ctx.restore();
    ctx.fillStyle = item.color;
    ctx.beginPath(); ctx.moveTo(hx - r + 2, hy - 10); ctx.lineTo(hx - r - 14, hy - 4); ctx.lineTo(hx - r - 8, hy + 6); ctx.closePath(); ctx.fill();
  } else if (item.id === 'headgear') {
    ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, r + 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = hairFill(ctx, hx, hy, r, item.color); capPath(ctx, hx, hy, r); ctx.fill(); ctx.restore();
    ctx.strokeStyle = item.color; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(hx, hy, r + 1, Math.PI * 0.72, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = shade(item.color, -0.1); ell(ctx, hx + 3, hy + 7, 7, 11);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, r + 6, Math.PI * 1.1, Math.PI * 1.75); ctx.stroke();
    ctx.strokeStyle = shade(item.color, -0.3); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx + 5, hy + 17); ctx.lineTo(hx + 13, hy + 21); ctx.stroke();
  } else if (item.id === 'crown') {
    const y = hy - r * 0.8 - (look.hairStyle === 'afro' ? 12 : look.hairStyle === 'bald' || look.hairStyle === 'buzz' ? 0 : 5);
    const g = ctx.createLinearGradient(hx, y - 20, hx, y); g.addColorStop(0, '#fff0b0'); g.addColorStop(0.5, '#f2c14e'); g.addColorStop(1, '#a8770f');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(hx - 14, y); ctx.lineTo(hx - 16, y - 17); ctx.lineTo(hx - 7, y - 8); ctx.lineTo(hx, y - 20);
    ctx.lineTo(hx + 7, y - 8); ctx.lineTo(hx + 16, y - 17); ctx.lineTo(hx + 14, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b7861c'; ctx.fillRect(hx - 14, y - 3, 28, 3);
    ctx.fillStyle = '#d23a40'; circle(ctx, hx, y - 8, 2.6);
    ctx.fillStyle = '#2f6fdb'; circle(ctx, hx - 9, y - 5, 2); circle(ctx, hx + 9, y - 5, 2);
  }
  ctx.restore();
}

// ---------- ידיים וכפפות ----------
function computeArms(p, lx, by) {
  const o = pt => [pt[0] + lx, pt[1] + by];
  const sw = Math.sin(p.sway || 0) * 2.5, sw2 = Math.cos((p.sway || 0) * 0.7) * 1.5;
  const rot = (p.upper ? 0 : p.rear * 14) - p.lead * 2;
  const sR = o([-6 + rot, -180]), sL = o([10 + p.lead * 5 - p.rear * 4, -178]);
  let gR = o([30 + sw2, -186 + sw]), gL = o([44 - sw2, -198 - sw]);
  let eR = o([6, -146]), eL = o([28, -150]);
  if (p.block > 0) {
    gR = lp(gR, o([34, -202]), p.block); gL = lp(gL, o([40, -218]), p.block);
    eR = lp(eR, o([20, -160]), p.block); eL = lp(eL, o([28, -168]), p.block);
  }
  if (p.win > 0) {
    gR = lp(gR, o([-6, -292]), p.win); gL = lp(gL, o([26, -296]), p.win);
    eR = lp(eR, o([-18, -238]), p.win); eL = lp(eL, o([30, -236]), p.win);
  }
  if (p.lead > 0) {
    const t = o([106, -204]);
    gL = lp(gL, t, p.lead); eL = lp(eL, [(sL[0] + t[0]) / 2, (sL[1] + t[1]) / 2 + 4], p.lead);
  }
  if (p.rear > 0) {
    const e = p.rear;
    if (p.upper) {
      const low = o([42, -150]), hi = o([76, -226]);
      gR = e < 0.4 ? lp(gR, low, e / 0.4) : lp(low, hi, (e - 0.4) / 0.6);
      eR = lp(eR, [gR[0] - 26, gR[1] + 32], Math.min(1, e * 1.5));
    } else {
      const t = o([102, -202]);
      gR = lp(gR, t, e); eR = lp(eR, [(sR[0] + t[0]) / 2, (sR[1] + t[1]) / 2 + 4], e);
    }
  }
  return { rear: { s: sR, e: eR, g: gR }, lead: { s: sL, e: eL, g: gL } };
}

function drawGlove(ctx, g, e, col) {
  const ang = Math.atan2(g[1] - e[1], g[0] - e[0]);
  ctx.save(); ctx.translate(g[0], g[1]); ctx.rotate(ang);
  // שרוול הכפפה עם פס לבן
  const cg = ctx.createLinearGradient(0, -10, 0, 10);
  cg.addColorStop(0, shade(col, 0.2)); cg.addColorStop(0.5, col); cg.addColorStop(1, shade(col, -0.45));
  ctx.fillStyle = cg; rr(ctx, -25, -9.5, 19, 19, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(-18, -9.5, 3, 19);
  // אגרוף
  const mg = ctx.createRadialGradient(5, -7, 1, 0, 0, 19);
  mg.addColorStop(0, shade(col, 0.42)); mg.addColorStop(0.4, col); mg.addColorStop(1, shade(col, -0.5));
  ctx.fillStyle = mg; ell(ctx, 1, 0, 16.5, 14.5);
  ctx.fillStyle = shade(col, -0.12); ell(ctx, -3, -11.5, 8, 4.5, -0.2);
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(1, 0, 10.5, -1.2, 1.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8, -7.5); ctx.quadraticCurveTo(-2, -5, 4, -8.5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ell(ctx, 6, -7, 5.5, 2.2, -0.35);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ell(ctx, 11, 3, 2.5, 5, 0.2);
  ctx.restore();
}

function drawArm(ctx, arm, skinCol, glove, tattoo, sleeve) {
  const ux = arm.g[0] - arm.e[0], uy = arm.g[1] - arm.e[1], L = Math.hypot(ux, uy) || 1;
  const wrist = [arm.g[0] - ux / L * 16, arm.g[1] - uy / L * 16];
  taper(ctx, arm.s, arm.e, 18, 13, skinCol, [0.45, 1.18]);
  taper(ctx, arm.e, wrist, 14, 11, skinCol, [0.3, 1.1]);
  if (tattoo === 'sleeve') {
    limb(ctx, [arm.s, arm.e], 9, 'rgba(22,34,60,.38)');
    limb(ctx, [arm.e, lp(arm.e, wrist, 0.7)], 8, 'rgba(22,34,60,.38)');
  }
  if (tattoo === 'tribal' || tattoo === 'sleeve') {
    const vx = arm.e[0] - arm.s[0], vy = arm.e[1] - arm.s[1], M = Math.hypot(vx, vy) || 1, nx = -vy / M * 6, ny = vx / M * 6;
    ctx.strokeStyle = 'rgba(22,34,60,.72)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (const t of [0.3, 0.5, 0.7]) {
      const P = lp(arm.s, arm.e, t), Q = lp(arm.s, arm.e, t + 0.1);
      ctx.beginPath(); ctx.moveTo(P[0] + nx, P[1] + ny); ctx.lineTo(Q[0], Q[1]); ctx.lineTo(P[0] - nx, P[1] - ny); ctx.stroke();
    }
  }
  if (sleeve) {
    limb(ctx, [arm.s, arm.e], 22, sleeve);
    limb(ctx, [arm.e, lp(arm.e, wrist, 0.45)], 20, sleeve);
  }
  drawGlove(ctx, arm.g, arm.e, glove);
}

// look: {skin, hairStyle, hairColor, beard, shorts, gloves, shoes, outfit}; x,y = נקודת הרגליים; dir: 1 פונה ימינה, -1 שמאלה
function drawFighter(ctx, look, x, y, dir, pose, s) {
  const p = Object.assign({}, DEFAULT_POSE, pose || {});
  ctx.save();
  ctx.translate(x, y);
  // צל רך על הרצפה
  ctx.save(); ctx.translate(-dir * p.fall * 100 * s, 3 * s); ctx.scale(1, 0.17);
  const R = (58 + p.fall * 80) * s, sg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(0.6, 'rgba(0,0,0,.25)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; circle(ctx, 0, 0, R); ctx.restore();
  ctx.scale(dir * s, s);
  if (p.fall > 0) ctx.rotate(-p.fall * Math.PI / 2 * 0.96);

  const by = p.duck * 24 - p.bob, lx = p.leanX;
  const skin = look.skin, skinB = shadeHex(skin, -0.14);
  const st = p.stride;
  const hipB = [-9, -94 + by], hipF = [11, -94 + by];
  const footBx = -30 - st, footFx = 30 + st;
  const ankB = [footBx - 3, -30], ankF = [footFx - 2, -30];
  const kneeB = [(hipB[0] + ankB[0]) / 2 + 8 + p.duck * 10, (hipB[1] + ankB[1]) / 2 + 2];
  const kneeF = [(hipF[0] + ankF[0]) / 2 + 10 + p.duck * 12, (hipF[1] + ankF[1]) / 2 + 2];
  const of = look.outfit || {};
  const robe = p.robe && of.robe ? WARDROBE_BY_ID[of.robe] : null;
  const top = of.top ? WARDROBE_BY_ID[of.top] : null;
  const sleeveR = robe ? shade(robe.color, -0.25) : null, sleeveL = robe ? robe.color : null;
  const arms = computeArms(p, lx, by);
  const rearFront = p.block > 0.5 || p.win > 0.5;

  // רגל אחורית
  taper(ctx, hipB, kneeB, 28, 19, skinB, [0.45, 1.12]);
  taper(ctx, kneeB, ankB, 19, 12, skinB, [0.3, 1.2]);
  shoe(ctx, footBx, shadeHex(look.shoes, -0.2));
  if (!rearFront) drawArm(ctx, arms.rear, skinB, shadeHex(look.gloves, -0.2), of.tattoo, sleeveR);
  // רגל קדמית
  taper(ctx, hipF, kneeF, 29, 20, skin, [0.45, 1.12]);
  taper(ctx, kneeF, ankF, 20, 12.5, skin, [0.3, 1.22]);
  shoe(ctx, footFx, look.shoes);
  drawTorso(ctx, skin, lx, by, p);
  if (top) drawTop(ctx, top, lx, by);
  drawShorts(ctx, look.shorts, by, of.pattern);
  if (of.neck && !robe) drawNeck(ctx, of.neck, lx, by);
  if (robe) drawRobe(ctx, robe, lx, by);
  drawHead(ctx, look, 6 + lx - p.snap * 12, -218 + by + p.snap * 3, p);
  if (rearFront) drawArm(ctx, arms.rear, skinB, look.gloves, of.tattoo, sleeveR);
  drawArm(ctx, arms.lead, skin, look.gloves, of.tattoo, sleeveL);
  ctx.restore();
}

// ===== הזירה =====
// השכבות הסטטיות מצוירות פעם אחת לקנבס נסתר (מטמון), ובכל פריים מציירים רק מה שזז.
const Scene = { sc: 0, crowd: null, grain: null, mat: null, layers: null };
const ARENA_W = 960, ARENA_H = 440, ARENA_FLOOR = 398, LED_Y = 262, MAT_TOP = 318;

function mkCanvas(w, h, fn) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); fn(c.getContext('2d'), c.width, c.height); return c; }

function sceneAssets() {
  if (Scene.crowd) return;
  const tones = ['#141821', '#1a1f2a', '#11141b', '#20252f', '#171a22', '#231d22'];
  const crowd = [];
  for (let row = 0; row < 6; row++) {
    for (let x = -20; x < 990; x += 19 + row * 2.2) {
      crowd.push({ x: x + (Math.random() - 0.5) * 8, y: 118 + row * 25 + (Math.random() - 0.5) * 5, r: 8 + row * 1.5 + Math.random() * 1.5, c: tones[(Math.random() * tones.length) | 0], row, grp: Math.random() < 0.5 ? 0 : 1, phone: Math.random() < 0.04 });
    }
  }
  Scene.crowd = crowd;
  Scene.grain = mkCanvas(200, 200, (g, w, h) => {
    const id = g.createImageData(w, h);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 16; }
    g.putImageData(id, 0, 0);
  });
  Scene.mat = mkCanvas(128, 128, (g, w, h) => {
    const id = g.createImageData(w, h);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 40; id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v + 10; id.data[i + 3] = 40; }
    g.putImageData(id, 0, 0);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;
    for (let y = 0; y < h; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
}

// שכבה בגודל W×h (יחידות לוגיות) החל מ-y0, ברזולוציה sc
function layer(sc, y0, h, paint) {
  return { y0, h, c: mkCanvas(ARENA_W * sc, h * sc, g => { g.scale(sc, sc); g.translate(0, -y0); paint(g); }) };
}

function buildLayers(sc) {
  sceneAssets();
  const W = ARENA_W, H = ARENA_H, floor = ARENA_FLOOR;
  const L = {};
  L.bg = layer(sc, 0, H, g => {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#030405'); bg.addColorStop(0.5, '#0a0c12'); bg.addColorStop(1, '#06070a');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
  });
  // שורות קהל: שתי קבוצות בכל שורה, כדי שיקפצו בקצב שונה
  L.crowd = [];
  for (let row = 0; row < 6; row++) for (let grp = 0; grp < 2; grp++) {
    const y0 = 118 + row * 25 - 22 - row * 1.5, h = 64 + row * 4;
    L.crowd.push({ row, grp, ...layer(sc, y0, h, g => {
      for (const c of Scene.crowd) {
        if (c.row !== row || c.grp !== grp) continue;
        g.fillStyle = c.c;
        ell(g, c.x, c.y + c.r * 1.9, c.r * 1.55, c.r * 1.25);
        circle(g, c.x, c.y, c.r);
        g.strokeStyle = `rgba(255,226,190,${0.05 + c.row * 0.035})`; g.lineWidth = 1.5;
        g.beginPath(); g.arc(c.x, c.y, c.r - 0.5, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
        if (c.phone) { g.fillStyle = 'rgba(210,230,255,.8)'; g.fillRect(c.x + 4, c.y + c.r * 0.6, 2.5, 4); }
      }
    }) });
  }
  L.mid = layer(sc, 80, 220, g => {
    const hz = g.createLinearGradient(0, 90, 0, 230);
    hz.addColorStop(0, 'rgba(12,14,20,.75)'); hz.addColorStop(1, 'rgba(12,14,20,0)');
    g.fillStyle = hz; g.fillRect(0, 90, W, 140);
    const lg = g.createLinearGradient(0, LED_Y, 0, LED_Y + 26);
    lg.addColorStop(0, '#12070a'); lg.addColorStop(0.5, '#1d0a0f'); lg.addColorStop(1, '#0c0507');
    g.fillStyle = lg; g.fillRect(0, LED_Y, W, 26);
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, LED_Y + 26, W, 3);
  });
  // פס טקסט ה-LED (נגלל)
  L.led = { c: mkCanvas(480 * sc, 26 * sc, g => {
    g.scale(sc, sc);
    g.font = '15px "Secular One", Rubik, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.shadowColor = 'rgba(255,60,60,.8)'; g.shadowBlur = 8; g.fillStyle = 'rgba(255,110,100,.85)';
    g.fillText('הדרך לחגורה', 120, 13); g.fillText('ליל האליפות', 360, 13);
  }) };
  L.ring = layer(sc, 0, H, g => {
    g.save();
    g.beginPath(); g.moveTo(70, MAT_TOP); g.lineTo(W - 70, MAT_TOP); g.lineTo(W + 60, H); g.lineTo(-60, H); g.closePath(); g.clip();
    const mg = g.createLinearGradient(0, MAT_TOP, 0, H);
    mg.addColorStop(0, '#16283f'); mg.addColorStop(1, '#1d3656');
    g.fillStyle = mg; g.fillRect(0, MAT_TOP, W, H - MAT_TOP);
    g.globalAlpha = 0.6; g.fillStyle = g.createPattern(Scene.mat, 'repeat'); g.fillRect(0, MAT_TOP, W, H - MAT_TOP); g.globalAlpha = 1;
    g.save(); g.translate(W / 2, 372); g.scale(1, 0.26);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.07)'; g.font = '76px "Secular One", Rubik, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('הדרך לחגורה', 0, 0); g.restore();
    g.save(); g.translate(W / 2, floor - 6); g.scale(1, 0.2);
    const pool = g.createRadialGradient(0, 0, 0, 0, 0, 460);
    pool.addColorStop(0, 'rgba(255,244,222,.34)'); pool.addColorStop(0.55, 'rgba(255,244,222,.12)'); pool.addColorStop(1, 'rgba(255,244,222,0)');
    g.fillStyle = pool; circle(g, 0, 0, 460); g.restore();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; g.beginPath(); g.moveTo(70, MAT_TOP); g.lineTo(W - 70, MAT_TOP); g.stroke();
    const post = (x, corner) => {
      const pg = g.createLinearGradient(x - 7, 0, x + 7, 0);
      pg.addColorStop(0, '#2a2e36'); pg.addColorStop(0.45, '#9aa1ad'); pg.addColorStop(0.6, '#d9dde4'); pg.addColorStop(1, '#3a3f49');
      g.fillStyle = pg; g.fillRect(x - 6, 214, 12, 112);
      for (const y of [236, 266, 296]) {
        const tg = g.createLinearGradient(x - 11, 0, x + 11, 0);
        tg.addColorStop(0, shade(corner, -0.5)); tg.addColorStop(0.5, shade(corner, 0.15)); tg.addColorStop(1, shade(corner, -0.45));
        g.fillStyle = tg; rr(g, x - 11, y - 8, 22, 16, 5); g.fill();
      }
    };
    post(64, '#c62f38'); post(W - 64, '#2d5fc4');
    for (const [c, y] of [['#d8d8de', 236], ['#c93740', 266], ['#d8d8de', 296]]) {
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 6; g.beginPath(); g.moveTo(72, y + 2); g.quadraticCurveTo(W / 2, y + 9, W - 72, y + 2); g.stroke();
      g.strokeStyle = c; g.lineWidth = 4.5; g.beginPath(); g.moveTo(72, y); g.quadraticCurveTo(W / 2, y + 7, W - 72, y); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(72, y - 1.5); g.quadraticCurveTo(W / 2, y + 5.5, W - 72, y - 1.5); g.stroke();
    }
    g.fillStyle = 'rgba(240,240,245,.8)';
    for (const x of [270, 480, 690]) g.fillRect(x - 2, 236, 4, 64);
    g.fillStyle = '#15171d'; g.fillRect(0, 10, W, 9);
    g.globalCompositeOperation = 'lighter';
    for (const lx of [200, 400, 560, 760]) {
      const beam = g.createLinearGradient(0, 18, 0, floor);
      beam.addColorStop(0, 'rgba(255,238,210,.09)'); beam.addColorStop(1, 'rgba(255,238,210,0)');
      g.fillStyle = beam; g.beginPath(); g.moveTo(lx - 10, 18); g.lineTo(lx + 10, 18); g.lineTo(lx + 130 + (lx - W / 2) * 0.2, floor); g.lineTo(lx - 130 + (lx - W / 2) * 0.2, floor); g.closePath(); g.fill();
      const lamp = g.createRadialGradient(lx, 18, 0, lx, 18, 38);
      lamp.addColorStop(0, 'rgba(255,248,230,.95)'); lamp.addColorStop(0.2, 'rgba(255,238,200,.35)'); lamp.addColorStop(1, 'rgba(255,238,200,0)');
      g.fillStyle = lamp; circle(g, lx, 18, 38);
    }
  });
  L.front = layer(sc, 0, H, g => {
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 9; g.beginPath(); g.moveTo(-10, H - 5); g.lineTo(W + 10, H - 5); g.stroke();
    const rg = g.createLinearGradient(0, H - 12, 0, H);
    rg.addColorStop(0, '#f2f2f5'); rg.addColorStop(1, '#8d8f96');
    g.strokeStyle = rg; g.lineWidth = 7; g.beginPath(); g.moveTo(-10, H - 8); g.lineTo(W + 10, H - 8); g.stroke();
    const v = g.createRadialGradient(W / 2, H * 0.55, H * 0.45, W / 2, H * 0.55, W * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  });
  return L;
}

function sceneLayers(ctx) {
  const m = ctx.getTransform(), sc = Math.min(2, Math.max(0.5, Math.round(Math.hypot(m.a, m.b) * 4) / 4));
  if (!Scene.layers || Scene.sc !== sc) { Scene.layers = buildLayers(sc); Scene.sc = sc; }
  return Scene.layers;
}
// הפונטים נטענים אחרי הציור הראשון: בונים מחדש את השכבות כשהם מוכנים
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { Scene.layers = null; });

const blit = (ctx, l, dy = 0) => ctx.drawImage(l.c, 0, l.y0 + dy, ARENA_W, l.h);

// W×H = 960×440 (יחידות לוגיות)
function drawArenaScene(ctx, W, H, t, hype = 0.3, flashes = []) {
  const L = sceneLayers(ctx);
  blit(ctx, L.bg);
  for (const cr of L.crowd) {
    const jump = Math.max(0, Math.sin(t * (3.5 + cr.row * 0.6) + cr.row * 1.7 + cr.grp * 2.1)) * hype * (3 + cr.row);
    blit(ctx, cr, -jump);
  }
  blit(ctx, L.mid);
  for (const f of flashes) {
    const a = 1 - f.t / 0.18, fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 18);
    fg.addColorStop(0, `rgba(255,255,255,${a})`); fg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fg; ctx.fillRect(f.x - 18, f.y - 18, 36, 36);
  }
  const off = (t * 40) % 480;
  for (let x = -480 + off; x < ARENA_W; x += 480) ctx.drawImage(L.led.c, x, LED_Y, 480, 26);
  blit(ctx, L.ring);
}

// חלק קדמי: חבל קדמי, ויניט וגרעין — אחרי הלוחמים
function drawArenaFront(ctx, W, H) {
  const L = sceneLayers(ctx);
  blit(ctx, L.front);
  ctx.save();
  const ox = (Math.random() * 200) | 0, oy = (Math.random() * 200) | 0;
  ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(Scene.grain, 'repeat'); ctx.fillRect(ox, oy, W, H);
  ctx.restore();
}

// ===== לולאת אנימציה לתצוגות מקדימות =====
const Anims = new Set();
function sizeCanvas(c) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
  if (!w || !h) return false;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  return true;
}
function addAnim(canvas, fn) { const a = { canvas, fn, t0: performance.now() }; Anims.add(a); return a; }
(function animLoop(now) {
  for (const a of Anims) {
    if (!a.canvas.isConnected) { Anims.delete(a); continue; }
    if (!sizeCanvas(a.canvas)) continue;
    const ctx = a.canvas.getContext('2d'), dpr = a.canvas.width / a.canvas.clientWidth;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, a.canvas.clientWidth, a.canvas.clientHeight);
    a.fn(ctx, a.canvas.clientWidth, a.canvas.clientHeight, (now - a.t0) / 1000);
  }
  requestAnimationFrame(animLoop);
})(performance.now());

// תמונה סטטית ממוקדת בפריט לבוש (למלתחה)
function drawPortrait(canvas, look, slot) {
  if (!sizeCanvas(canvas)) return;
  const ctx = canvas.getContext('2d'), w = canvas.clientWidth, h = canvas.clientHeight, dpr = canvas.width / w;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const f = { head: [1.55, -220, -2], face: [1.7, -214, 8], neck: [1.25, -182, 4], top: [0.95, -160, 0], tattoo: [1.05, -165, 7], pattern: [1.1, -108, 0], robe: [0.4, -140, 0] }[slot] || [0.5, -130, 0];
  const s = f[0] * h / 100;
  drawFighter(ctx, look, w / 2 - (8 + f[2]) * s, h / 2 - f[1] * s, 1, { robe: slot === 'robe' }, s);
}

function fighterPreview(canvas, getLook, dir = 1, opts = {}) {
  return addAnim(canvas, (ctx, w, h, t) => {
    const s = Math.min(h / 300, w / 190);
    const pose = { bob: Math.abs(Math.sin(t * 4.2 + (opts.phase || 0))) * 3, sway: t * 2.2 + (opts.phase || 0) };
    if (opts.jab) { const c = (t + (opts.phase || 0)) % 3.4; if (c < 0.34) pose.lead = Math.sin(c / 0.34 * Math.PI); }
    if (opts.win) { pose.win = 1; pose.bob = 0; }
    if (opts.robe) pose.robe = true;
    const g = ctx.createRadialGradient(w / 2, h - 10 * s, 4, w / 2, h - 10 * s, w * 0.5);
    g.addColorStop(0, opts.glow || 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    drawFighter(ctx, getLook(), w / 2 - dir * 14 * s, h - 12 * s, dir, pose, s);
  });
}
