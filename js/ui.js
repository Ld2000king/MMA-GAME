// ===== מסכים, קריירה ושמירה =====
const app = document.getElementById('app');
let S = load();
let draft = null, currentFight = null, hubTab = 'fights', wrTry = null;
if (S && !S.outfit) S.outfit = { owned: [], equip: {} };
if (S && (S.v || 1) < 2) {
  // הסולם גדל מ-10 ל-18 יריבים: ממפים את ההתקדמות הישנה למקום המקביל בסולם החדש
  const map = [0, 2, 3, 5, 6, 8, 9, 10, 14, 17, 18];
  S.next = map[Math.min(S.next, 10)]; S.style = 'balanced'; S.styles = ['balanced']; S.v = 2;
}

// מראה השחקן כולל הלבוש (אפשר להוסיף פריט "במדידה")
function playerLook(tryId) {
  const equip = { ...(S ? S.outfit.equip : {}) };
  if (tryId) equip[WARDROBE_BY_ID[tryId].slot] = tryId;
  return { ...S.look, outfit: equip };
}

function load() { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* אין אחסון */ } }
try { Sfx.on = localStorage.getItem(SAVE_KEY + '-sound') !== 'off'; } catch (e) { /* */ }

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('en-US');

function toast(msg, kind = '') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'show ' + kind;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = ''; }, 2200);
}

// ---------- חישובי קריירה ----------
function gearBonus(stat) { const g = GEAR.find(x => x.stat === stat); return GEAR_BONUS[S.gear[g.id]]; }
function effStats() { const s = {}; for (const d of STAT_DEFS) s[d.id] = S.stats[d.id] + gearBonus(d.id); return s; }
function ovr(st) { return Math.round(Object.values(st).reduce((a, b) => a + b, 0) / 5); }
function nextOpponent() { return S.next < OPPONENTS.length ? OPPONENTS[S.next] : challenger(S.defenses); }
function trainCost(lvl) { return 20 + lvl * 4; }
function workPay() { return 100 + S.record.w * 15; }
function rankName() {
  if (S.belts.includes('חגורת אלוף העולם')) return 'אלוף העולם';
  if (S.next >= WORLD_TIER_AT) return 'דרג עולמי';
  if (S.belts.length) return 'אלוף לאומי';
  if (S.next >= NATIONAL_TIER_AT) return 'דרג לאומי';
  return S.record.w ? 'דרג אזורי' : 'טירון';
}

// ---------- ניווט ----------
const isTouch = window.matchMedia('(pointer: coarse)').matches;
function enterFightMode() {
  // בטלפון: מסך מלא ונעילה לרוחב (כשהדפדפן מרשה)
  if (!isTouch) return;
  try {
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    const p = req && !document.fullscreenElement ? req.call(el) : null;
    const lock = () => { try { const q = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (q && q.catch) q.catch(() => {}); } catch (e) { /* */ } };
    if (p && p.then) p.then(lock).catch(() => {}); else lock();
  } catch (e) { /* לא נתמך */ }
}
function exitFightMode() {
  try {
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  } catch (e) { /* */ }
}

function go(screen, arg) {
  if (currentFight) { currentFight.destroy(); currentFight = null; }
  if (screen !== 'fight') exitFightMode();
  window.scrollTo(0, 0);
  ({ title: renderTitle, create: renderCreate, hub: renderHub, vs: renderVs, fight: renderFight, result: renderResult })[screen](arg);
}

// ---------- מסך פתיחה ----------
function renderTitle() {
  app.innerHTML = `
  <section class="screen title-screen">
    <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <img class="title-emblem" src="assets/logo.webp" alt="לוגו הדרך לחגורה: כפפת אגרוף אדומה" width="1254" height="1254" decoding="async">
    <h1 class="logo">הדרך לחגורה</h1>
    <p class="tagline">בנה לוחם משלך, התאמן, נצח יריבים וטפס בדירוג עד לחגורת אלוף העולם.</p>
    <div class="title-actions">
      ${S ? `<button class="btn btn-red btn-lg sweep" data-act="continue">המשך קריירה<small>${esc(S.name)} · מאזן ${S.record.w}-${S.record.l}</small></button>` : ''}
      <button class="btn ${S ? 'btn-ghost' : 'btn-red btn-lg sweep'}" data-act="new">קריירה חדשה</button>
    </div>
    <p class="fine">משחקים במקלדת או במסך מגע · ההתקדמות נשמרת בדפדפן</p>
  </section>`;
}

// ---------- יצירת לוחם ----------
function swatchGroup(key, label, colors) {
  return `<div class="field"><span class="flabel">${label}</span>
    <div class="swatches" role="radiogroup" aria-label="${label}" data-group="${key}">
      ${colors.map(c => `<button type="button" class="swatch${draft.look[key] === c ? ' on' : ''}" style="--c:${c}" data-act="pick" data-k="${key}" data-v="${c}" role="radio" aria-checked="${draft.look[key] === c}" aria-label="${label} ${c}"></button>`).join('')}
    </div></div>`;
}
function chipGroup(key, label, items) {
  return `<div class="field"><span class="flabel">${label}</span>
    <div class="chips" role="radiogroup" aria-label="${label}" data-group="${key}">
      ${items.map(i => `<button type="button" class="chip${draft.look[key] === i.id ? ' on' : ''}" data-act="pick" data-k="${key}" data-v="${i.id}" role="radio" aria-checked="${draft.look[key] === i.id}">${i.name}</button>`).join('')}
    </div></div>`;
}
function renderCreate(edit) {
  draft = edit ? { edit: true, name: S.name, nick: S.nick, look: { ...S.look } } : { edit: false, name: '', nick: '', look: { ...DEFAULT_LOOK } };
  app.innerHTML = `
  <section class="screen create">
    <header class="topbar">
      <button class="btn btn-icon" data-act="${edit ? 'hub' : 'title'}" aria-label="חזרה">→</button>
      <h2>${edit ? 'עריכת הלוחם' : 'יצירת לוחם'}</h2>
    </header>
    <div class="create-grid">
      <div class="preview-card card">
        <canvas class="preview-lg" aria-label="תצוגה מקדימה של הלוחם"></canvas>
        <div class="pv-name" id="pvName"></div>
        <button class="btn btn-ghost btn-sm" data-act="randomize">מראה אקראי</button>
      </div>
      <div class="options card">
        <div class="field-row">
          <div class="field"><label class="flabel" for="fName">שם הלוחם</label><input id="fName" maxlength="16" placeholder="למשל: דני כהן" autocomplete="off"></div>
          <div class="field"><label class="flabel" for="fNick">כינוי <span class="opt">(לא חובה)</span></label><input id="fNick" maxlength="14" placeholder="למשל: הפטיש" autocomplete="off"></div>
        </div>
        ${swatchGroup('skin', 'צבע עור', LOOK_OPTIONS.skin)}
        ${chipGroup('hairStyle', 'תספורת', LOOK_OPTIONS.hairStyle)}
        ${swatchGroup('hairColor', 'צבע שיער', LOOK_OPTIONS.hairColor)}
        ${chipGroup('beard', 'זקן', LOOK_OPTIONS.beard)}
        ${swatchGroup('shorts', 'מכנסיים', LOOK_OPTIONS.cloth)}
        ${swatchGroup('gloves', 'כפפות', LOOK_OPTIONS.cloth)}
        ${swatchGroup('shoes', 'נעליים', LOOK_OPTIONS.cloth)}
        <p class="form-err" id="formErr" hidden></p>
        <button class="btn btn-red btn-lg sweep" data-act="${edit ? 'saveLook' : 'startCareer'}">${edit ? 'שמור שינויים' : 'התחל קריירה'}</button>
      </div>
    </div>
  </section>`;
  const fn = document.getElementById('fName'), fk = document.getElementById('fNick');
  fn.value = draft.name; fk.value = draft.nick;
  const upd = () => {
    draft.name = fn.value.trim(); draft.nick = fk.value.trim();
    document.getElementById('pvName').innerHTML = (draft.name ? esc(draft.name) : '<span class="muted">הלוחם שלך</span>') + (draft.nick ? ` <span class="nick">"${esc(draft.nick)}"</span>` : '');
  };
  fn.addEventListener('input', upd); fk.addEventListener('input', upd); upd();
  fighterPreview(app.querySelector('.preview-lg'), () => edit ? { ...draft.look, outfit: S.outfit.equip } : draft.look, 1, { jab: true, glow: 'rgba(217,54,62,.22)' });
}
function refreshGroup(k) {
  app.querySelectorAll(`[data-group="${k}"] [data-act="pick"]`).forEach(b => {
    const on = b.dataset.v === draft.look[k]; b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
  });
}

// ---------- מרכז הקריירה ----------
function renderHub(tab) {
  const keepScroll = !tab || tab === hubTab, y = window.scrollY;
  if (tab) hubTab = tab;
  if (hubTab !== 'wardrobe') wrTry = null;
  const eff = effStats();
  const tabs = [['fights', 'קרבות', 't-red'], ['train', 'אימונים', 't-green'], ['shop', 'חנות', 't-gold'], ['wardrobe', 'מלתחה', 't-purple'], ['profile', 'פרופיל', 't-blue']];
  app.innerHTML = `
  <section class="screen hub">
    <header class="profile-bar card">
      <canvas class="preview-sm" aria-hidden="true"></canvas>
      <div class="pb-main">
        <div class="pb-name">${esc(S.name)}${S.nick ? ` <span class="nick">"${esc(S.nick)}"</span>` : ''}</div>
        <div class="pb-meta">
          <span class="rank-pill">${rankName()}</span>
          <span class="style-pill">סגנון: ${STYLES[S.style].name}</span>
          <span>מאזן <b class="num">${S.record.w}-${S.record.l}</b></span>
          <span><b class="num">${S.record.ko}</b> נוקאאוטים</span>
          <span>שבוע <b class="num">${S.week}</b></span>
        </div>
        <div class="energy"><span>אנרגיה</span><div class="bar"><i style="width:${S.energy}%" class="${S.energy < 35 ? 'low' : ''}"></i></div><b class="num">${S.energy}</b></div>
      </div>
      <div class="pb-side">
        <div class="money num">$${fmt(S.money)}</div>
        <div class="ovr"><b class="num">${ovr(eff)}</b><span>דירוג כללי</span></div>
        ${S.belts.length ? `<div class="belts">${S.belts.map(b => `<span class="belt" title="${b}"></span>`).join('')}</div>` : ''}
      </div>
    </header>
    <nav class="tabs" role="tablist">
      ${tabs.map(([id, name, cls]) => `<button role="tab" class="tab ${cls}${hubTab === id ? ' on' : ''}" aria-selected="${hubTab === id}" data-act="tab" data-tab="${id}">${name}</button>`).join('')}
    </nav>
    <div class="tab-body">${({ fights: tabFights, train: tabTrain, shop: tabShop, wardrobe: tabWardrobe, profile: tabProfile })[hubTab]()}</div>
  </section>`;
  fighterPreview(app.querySelector('.preview-sm'), () => playerLook(), 1, { phase: 1, robe: true });
  const oc = app.querySelector('.preview-opp');
  if (oc) { const o = nextOpponent(); fighterPreview(oc, () => o.look, -1, { jab: true, phase: 2, glow: 'rgba(217,54,62,.18)' }); }
  const wc = app.querySelector('.preview-wr');
  if (wc) {
    fighterPreview(wc, () => playerLook(wrTry), 1, { jab: true, robe: true, glow: 'rgba(139,92,246,.25)' });
    app.querySelectorAll('.wr-item canvas').forEach(c => {
      const it = WARDROBE_BY_ID[c.dataset.id];
      drawPortrait(c, playerLook(it.id), it.slot);
    });
  }
  if (keepScroll) window.scrollTo(0, y);
}

function tabWardrobe() {
  const own = new Set(S.outfit.owned), eq = S.outfit.equip;
  const tryItem = wrTry ? WARDROBE_BY_ID[wrTry] : null;
  const slots = WARDROBE_SLOTS.map(sl => {
    const items = WARDROBE.filter(w => w.slot === sl.id).map(w => {
      const owned = own.has(w.id), worn = eq[w.slot] === w.id, afford = S.money >= w.price;
      const btn = worn ? `<button class="btn btn-sm btn-ghost" data-act="unwear" data-id="${w.id}">הסר</button>`
        : owned ? `<button class="btn btn-sm btn-purple" data-act="wear" data-id="${w.id}">לבש</button>`
        : `<button class="btn btn-sm btn-gold" data-act="buyWear" data-id="${w.id}" ${afford ? '' : 'disabled'}><span class="num">$${fmt(w.price)}</span></button>`;
      return `<article class="wr-item${worn ? ' worn' : ''}${wrTry === w.id ? ' trying' : ''}" data-act="tryOn" data-id="${w.id}">
        <canvas data-id="${w.id}" aria-hidden="true"></canvas>
        <div class="wr-name">${w.name}</div>
        <div class="wr-state">${worn ? 'לבוש עכשיו' : owned ? 'בבעלותך' : afford ? 'לחץ למדידה' : 'חסר כסף'}</div>
        ${btn}
      </article>`;
    }).join('');
    return `<section class="wr-slot"><h3 class="sec-title">${sl.name}</h3><div class="wr-grid">${items}</div></section>`;
  }).join('');
  return `
  <div class="wardrobe">
    <aside class="card wr-preview">
      <canvas class="preview-wr" aria-label="הלוחם שלך עם הלבוש"></canvas>
      <p class="wr-try">${tryItem ? `מודד עכשיו: <b>${tryItem.name}</b>` : 'לחץ על פריט כדי למדוד אותו לפני שקונים'}</p>
      ${tryItem ? `<button class="btn btn-sm btn-ghost" data-act="tryOn" data-id="${tryItem.id}">בטל מדידה</button>` : ''}
      <p class="muted small">הלבוש מופיע גם בזירה. חלוק הכניסה מופיע לפני הקרב.</p>
    </aside>
    <div class="wr-list">${slots}</div>
  </div>`;
}

function tapeRow(label, a, b) {
  const M = 75;
  return `<div class="tape-row">
    <span class="tv num ${a > b ? 'up' : ''}">${a}</span>
    <div class="tb you"><i style="width:${Math.min(100, a / M * 100)}%"></i></div>
    <span class="tl">${label}</span>
    <div class="tb them"><i style="width:${Math.min(100, b / M * 100)}%"></i></div>
    <span class="tv num ${b > a ? 'up' : ''}">${b}</span>
  </div>`;
}

function tabFights() {
  const o = nextOpponent(), os = oppStats(o), eff = effStats();
  const ladder = OPPONENTS.map((x, i) => {
    const cls = i < S.next ? 'done' : i === S.next ? 'cur' : 'locked';
    const st = i < S.next ? 'ניצחת' : i === S.next ? 'הבא בתור' : 'נעול';
    return `<li class="${cls}"><span class="ln num">${i + 1}</span><span class="lname">${x.name} <small>"${x.nick}"</small></span>${x.title ? '<span class="belt sm" title="קרב על חגורה"></span>' : ''}<span class="lstat">${st}</span></li>`;
  }).join('');
  return `
  <div class="fight-grid">
    <article class="card next-fight${o.title ? ' is-title' : ''}">
      <div class="nf-head"><span class="eyebrow">${o.title ? 'קרב על ' + o.title : o.defense ? 'הגנה על התואר #' + (S.defenses + 1) : 'הקרב הבא'}</span><span class="tier">${o.tier}</span></div>
      <div class="nf-body">
        <canvas class="preview-opp" aria-hidden="true"></canvas>
        <div class="nf-info">
          <h3>${o.name}</h3>
          <div class="nick">"${o.nick}"</div>
          <span class="style-tag">${STYLES[o.style].name}</span>
          <p class="muted">${STYLES[o.style].desc}</p>
          <dl class="facts">
            <div><dt>סיבובים</dt><dd class="num">${o.rounds}</dd></div>
            <div><dt>ארנק</dt><dd class="num gold">$${fmt(o.purse)}</dd></div>
            <div><dt>דירוג</dt><dd class="num">${ovr(os)}</dd></div>
          </dl>
        </div>
      </div>
      <div class="tape">
        <div class="tape-head"><span>אתה</span><span>היריב</span></div>
        ${STAT_DEFS.map(d => tapeRow(d.name, eff[d.id], os[d.id])).join('')}
      </div>
      ${S.energy < 35 ? `<p class="warn">האנרגיה שלך ${S.energy}% — תתחיל את הקרב עם פחות סיבולת. כדאי לנוח קודם.</p>` : ''}
      <button class="btn btn-red btn-lg sweep" data-act="toVs">צא לקרב</button>
    </article>
    <article class="card ladder">
      <h3>סולם הדירוג</h3>
      <ol>${ladder}</ol>
      ${S.next >= OPPONENTS.length ? `<p class="champ-note">אתה אלוף העולם. כל קרב מעכשיו הוא הגנה על התואר מול מתמודד חזק יותר. הגנות מוצלחות: <b class="num">${S.defenses}</b></p>` : ''}
    </article>
  </div>`;
}

function tabTrain() {
  const cards = STAT_DEFS.map(d => {
    const lvl = S.stats[d.id], bonus = gearBonus(d.id), cost = trainCost(lvl), max = lvl >= STAT_MAX;
    const can = !max && S.money >= cost && S.energy >= TRAIN_ENERGY;
    return `<article class="card train-card">
      <div class="tc-top"><h3>${d.train}</h3><span class="stat-name">${d.name}</span></div>
      <div class="lvl"><b class="num">${lvl}</b><span class="of num">/ ${STAT_MAX}</span>${bonus ? `<span class="bonus num">+${bonus} ציוד</span>` : ''}</div>
      <div class="bar stat"><i style="width:${lvl / STAT_MAX * 100}%"></i></div>
      <p class="muted">${d.desc}</p>
      <button class="btn btn-green" data-act="train" data-id="${d.id}" ${can ? '' : 'disabled'}>
        ${max ? 'הגעת למקסימום' : `התאמן<small class="num">$${cost} · ${TRAIN_ENERGY} אנרגיה</small>`}
      </button>
    </article>`;
  }).join('');
  return `
  <div class="train-grid">${cards}
    <article class="card rest-card">
      <h3>מחוץ לחדר הכושר</h3>
      <p class="muted">אימון עולה אנרגיה. מנוחה ממלאת אותה ומעבירה שבוע. אזל הכסף? משמרת במכון תמיד משלמת.</p>
      <div class="rest-actions">
        <button class="btn btn-blue" data-act="rest">נוח עד השבוע הבא<small>אנרגיה מלאה</small></button>
        <button class="btn btn-ghost" data-act="work" ${S.energy >= 30 ? '' : 'disabled'}>משמרת במכון<small class="num">+$${workPay()} · 30 אנרגיה</small></button>
      </div>
    </article>
  </div>
  ${stylesSection()}`;
}

function stylesSection() {
  const cards = Object.entries(STYLES).map(([id, st]) => {
    const owned = S.styles.includes(id), active = S.style === id, afford = S.money >= st.price;
    const btn = active ? '<span class="st-active">הסגנון שלך</span>'
      : owned ? `<button class="btn btn-sm btn-purple" data-act="setStyle" data-id="${id}">עבור לסגנון</button>`
      : `<button class="btn btn-sm btn-gold" data-act="learnStyle" data-id="${id}" ${afford ? '' : 'disabled'}>למד · <span class="num">$${fmt(st.price)}</span></button>`;
    return `<article class="card style-card${active ? ' active' : ''}">
      <div class="sc-top"><h3>${st.name}</h3>${owned && !active ? '<span class="eyebrow">נלמד</span>' : ''}</div>
      <p class="perk">${st.perkDesc}</p>
      ${btn}
    </article>`;
  }).join('');
  return `<h3 class="sec-title styles-title">סגנון לחימה</h3>
  <p class="muted sec-sub">כל סגנון נותן יתרון ומחיר. לומדים פעם אחת, ואחר כך מחליפים בחינם.</p>
  <div class="styles-grid">${cards}</div>`;
}

function tabShop() {
  const gear = GEAR.map(g => {
    const tier = S.gear[g.id], stat = STAT_DEFS.find(d => d.id === g.stat).name, maxed = tier >= 3;
    const price = maxed ? 0 : GEAR_PRICE[tier + 1];
    return `<article class="card shop-card">
      <div class="sc-top"><span class="eyebrow">${g.name} · ${stat}</span><div class="pips">${[1, 2, 3].map(i => `<i class="${i <= tier ? 'on' : ''}"></i>`).join('')}</div></div>
      <div class="sc-now">עכשיו: <b>${g.tiers[tier]}</b>${GEAR_BONUS[tier] ? ` <span class="bonus num">+${GEAR_BONUS[tier]} ${stat}</span>` : ''}</div>
      ${maxed ? '<p class="maxed">הציוד הכי טוב שיש</p>' : `
      <div class="sc-next"><span>שדרוג: <b>${g.tiers[tier + 1]}</b></span><span class="bonus num">+${GEAR_BONUS[tier + 1]} ${stat}</span></div>
      <button class="btn btn-gold" data-act="buyGear" data-id="${g.id}" ${S.money >= price ? '' : 'disabled'}>${S.money >= price ? `קנה · <span class="num">$${fmt(price)}</span>` : `חסרים <span class="num">$${fmt(price - S.money)}</span>`}</button>`}
    </article>`;
  }).join('');
  const extras = EXTRAS.map(x => {
    const owned = x.once && S[x.id];
    return `<article class="card shop-card extra">
      <div class="sc-top"><span class="eyebrow">${x.once ? 'שדרוג קבוע' : 'מתכלה'}</span></div>
      <h3>${x.name}</h3><p class="muted">${x.desc}</p>
      ${owned ? '<p class="maxed">כבר בצוות שלך</p>' : `<button class="btn btn-gold" data-act="buyExtra" data-id="${x.id}" ${S.money >= x.price ? '' : 'disabled'}>קנה · <span class="num">$${fmt(x.price)}</span></button>`}
    </article>`;
  }).join('');
  return `<h3 class="sec-title">ציוד</h3><div class="shop-grid">${gear}</div><h3 class="sec-title">שירותים</h3><div class="shop-grid">${extras}</div>`;
}

function tabProfile() {
  const eff = effStats();
  const hist = S.history.length ? S.history.slice(0, 10).map(h => `
    <li class="${h.won ? 'w' : 'l'}"><span class="res">${h.won ? 'נ' : 'ה'}</span><span class="hn">${h.opp}</span><span class="hm">${h.method}${h.round ? ' · סיבוב ' + h.round : ''}</span><span class="num hp">+$${fmt(h.earned)}</span></li>`).join('')
    : '<li class="empty">עוד לא נלחמת. הקרב הראשון מחכה בלשונית קרבות.</li>';
  return `
  <div class="profile-grid">
    <article class="card">
      <h3>סטטיסטיקות</h3>
      <div class="stat-list">${STAT_DEFS.map(d => `<div class="sl-row"><span>${d.name}</span><div class="bar stat"><i style="width:${eff[d.id] / (STAT_MAX + 10) * 100}%"></i></div><b class="num">${eff[d.id]}</b></div>`).join('')}</div>
      <h3>חגורות</h3>
      ${S.belts.length ? `<ul class="belt-list">${S.belts.map(b => `<li><span class="belt"></span>${b}</li>`).join('')}</ul>` : `<p class="muted">עוד אין. הראשונה מחכה בקרב מספר ${OPPONENTS.findIndex(o => o.title) + 1} בסולם.</p>`}
    </article>
    <article class="card">
      <h3>היסטוריית קרבות</h3>
      <ul class="history">${hist}</ul>
    </article>
    <article class="card settings">
      <h3>הגדרות</h3>
      <div class="set-actions">
        <button class="btn btn-blue" data-act="editLook">ערוך מראה ושם</button>
        <button class="btn btn-ghost" data-act="sound">צלילים: ${Sfx.on ? 'פועלים' : 'כבויים'}</button>
        <button class="btn btn-ghost" data-act="title">למסך הפתיחה</button>
        <button class="btn btn-danger" data-act="reset">מחק קריירה</button>
      </div>
    </article>
  </div>`;
}

// ---------- לפני הקרב ----------
function renderVs() {
  const o = nextOpponent();
  app.innerHTML = `
  <section class="screen vs-screen">
    <div class="vs-stage" dir="ltr">
      <div class="vs-side you" dir="rtl"><canvas id="vsYou" aria-hidden="true"></canvas><h3>${esc(S.name)}</h3><span><span class="num">${S.record.w}-${S.record.l}</span> · ${STYLES[S.style].name}</span></div>
      <div class="vs-mid"><span class="vs">VS</span><small dir="rtl">${o.rounds} סיבובים של דקה</small></div>
      <div class="vs-side them" dir="rtl"><canvas id="vsThem" aria-hidden="true"></canvas><h3>${o.name}</h3><span>"${o.nick}" · ${STYLES[o.style].name}</span></div>
    </div>
    ${o.title ? `<p class="title-bout"><span class="belt"></span> על הכף: ${o.title}</p>` : ''}
    <div class="card how">
      <h3>שליטה</h3>
      <div class="keys">
        <div><kbd>A</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>→</kbd><span>תזוזה</span></div>
        <div><kbd>J</kbd><span>ג׳אב — מהיר וזול</span></div>
        <div><kbd>K</kbd><span>קרוס — חזק</span></div>
        <div><kbd>L</kbd><span>אפרקאט — פורץ שמירה, טווח קצר</span></div>
        <div><kbd>S</kbd> / <kbd>↓</kbd><span>החזק לחסימה</span></div>
        <div><kbd>רווח</kbd><span>התחמקות</span></div>
      </div>
      <p class="muted tip">טיפ: כל אגרוף עולה סיבולת (הפס הכחול). פגיעה ביריב באמצע אגרוף שלו היא קאונטר — נזק כפול כמעט.</p>
    </div>
    <div class="vs-actions">
      <button class="btn btn-ghost" data-act="hub">חזרה</button>
      <button class="btn btn-red btn-lg sweep" data-act="fight">עלה לזירה</button>
    </div>
  </section>`;
  fighterPreview(document.getElementById('vsYou'), () => playerLook(), 1, { jab: true, robe: true, glow: 'rgba(63,127,240,.25)' });
  fighterPreview(document.getElementById('vsThem'), () => o.look, -1, { jab: true, robe: true, phase: 1.7, glow: 'rgba(217,54,62,.25)' });
}

// ---------- הקרב ----------
function renderFight() {
  const o = nextOpponent();
  app.innerHTML = `
  <section class="screen fight-screen">
    <div class="hud" dir="ltr">
      <div class="plate">
        <div class="pl-name" dir="rtl">${esc(S.name)} <span class="kds" id="kdP"></span></div>
        <div class="hbar hp"><i class="lag" id="lagP"></i><i class="cur" id="hpP"></i></div>
        <div class="hbar sta"><i id="staP"></i></div>
      </div>
      <div class="clock"><div id="rnd">סיבוב 1/${o.rounds}</div><div id="tm" class="num">1:00</div></div>
      <div class="plate right">
        <div class="pl-name" dir="rtl">${o.name} <span class="kds" id="kdO"></span></div>
        <div class="hbar hp"><i class="lag" id="lagO"></i><i class="cur" id="hpO"></i></div>
        <div class="hbar sta"><i id="staO"></i></div>
      </div>
    </div>
    <div class="ring-wrap">
      <canvas id="ring" aria-label="זירת האגרוף"></canvas>
      <button class="pause-btn" data-act="pause" aria-label="השהה">❚❚</button>
      <div class="pause-ov" id="pauseOv" hidden>
        <div class="card">
          <h3>הקרב מושהה</h3>
          <button class="btn btn-green" data-act="resume">המשך להילחם</button>
          <button class="btn btn-ghost" data-act="forfeit">זרוק את המגבת</button>
        </div>
      </div>
    </div>
    <div class="touch" dir="ltr">
      <div class="pad pad-move">
        <button tabindex="-1" data-hold="left" aria-label="שמאלה">◀</button>
        <button tabindex="-1" data-hold="right" aria-label="ימינה">▶</button>
      </div>
      <div class="pad pad-act">
        <button tabindex="-1" class="k-def k-blk" data-hold="block">חסימה</button>
        <button tabindex="-1" class="k-def k-dod" data-cmd="dodge">התחמק</button>
        <button tabindex="-1" class="k-hit k-upp" data-cmd="upper">אפרקאט</button>
        <button tabindex="-1" class="k-hit k-jab" data-cmd="jab">ג׳אב</button>
        <button tabindex="-1" class="k-hit k-crs" data-cmd="cross">קרוס</button>
      </div>
    </div>
    <p class="rotate-hint">טיפ: סובב את הטלפון לרוחב — הזירה תתפוס את כל המסך</p>
    <p class="legend">A/D תזוזה · J ג׳אב · K קרוס · L אפרקאט · S חסימה · רווח התחמקות · Esc השהיה</p>
  </section>`;
  const $ = id => document.getElementById(id);
  const eff = effStats();
  currentFight = new Fight({
    canvas: $('ring'), rounds: o.rounds,
    hud: {
      p: { hp: $('hpP'), lag: $('lagP'), sta: $('staP'), kd: $('kdP') },
      o: { hp: $('hpO'), lag: $('lagO'), sta: $('staO'), kd: $('kdO') },
      time: $('tm'), round: $('rnd')
    },
    player: { name: S.name, style: S.style, look: playerLook(), stats: eff, staStart: 0.55 + 0.45 * S.energy / 100 },
    opp: { name: o.name, look: o.look, stats: oppStats(o), size: o.style === 'giant' ? 1.1 : 1 },
    oppStyle: o.style, skill: clamp(o.level / 50, 0.12, 1),
    onPause: paused => { $('pauseOv').hidden = !paused; },
    onEnd: res => { const r = applyResult(res, o); go('result', r); }
  });
  const f = currentFight, touch = app.querySelector('.touch');
  const release = e => { const b = e.target.closest('[data-hold]'); if (b) { f.input[b.dataset.hold] = false; b.classList.remove('pressed'); } };
  touch.addEventListener('pointerdown', e => {
    const b = e.target.closest('button'); if (!b) return;
    e.preventDefault(); Sfx.init();
    if (b.dataset.hold) { f.input[b.dataset.hold] = true; b.classList.add('pressed'); try { b.setPointerCapture(e.pointerId); } catch (_) { /* */ } }
    if (b.dataset.cmd) f.cmd(b.dataset.cmd);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => touch.addEventListener(ev, release));
  touch.addEventListener('contextmenu', e => e.preventDefault());
}

function applyResult(res, o) {
  let earned = 0, bonus = 0;
  const methodName = { KO: 'נוקאאוט', TKO: 'TKO', DEC: 'החלטת שופטים', RET: 'כניעה' }[res.method];
  if (res.won) {
    earned = o.purse;
    if (res.method !== 'DEC') bonus = Math.round(o.purse * 0.3);
    S.record.w++; if (res.method !== 'DEC') S.record.ko++;
    if (o.defense) S.defenses++; else S.next++;
    if (o.title && !S.belts.includes(o.title)) S.belts.push(o.title);
  } else {
    earned = res.method === 'RET' ? 0 : Math.round(o.purse * 0.35);
    S.record.l++;
  }
  S.money += earned + bonus;
  S.energy = Math.max(0, S.energy - 45); S.week++;
  S.history.unshift({ opp: o.name, won: res.won, method: methodName, round: res.method === 'DEC' ? 0 : res.round, earned: earned + bonus });
  S.history = S.history.slice(0, 30);
  save();
  return { ...res, o, earned, bonus, methodName, newBelt: res.won && o.title ? o.title : null };
}

// ---------- תוצאה ----------
function renderResult(r) {
  const acc = r.thrown ? Math.round(r.landed / r.thrown * 100) : 0;
  app.innerHTML = `
  <section class="screen result ${r.won ? 'won' : 'lost'}">
    ${r.won ? '<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>' : ''}
    <canvas class="result-fighter" aria-hidden="true"></canvas>
    <h1 class="result-title">${r.won ? 'ניצחון!' : 'הפסד'}</h1>
    <p class="result-sub">${r.methodName}${r.method !== 'DEC' ? ` בסיבוב ${r.round}` : ''} מול ${r.o.name}${r.cards ? ` · <span class="num" dir="ltr">${r.cards.join(', ')}</span>` : ''}</p>
    ${r.newBelt ? `<p class="title-bout big"><span class="belt"></span> זכית ב${r.newBelt}!</p>` : ''}
    <div class="card result-card">
      <div class="rc-row"><span>${r.won ? 'ארנק הקרב' : 'דמי השתתפות'}</span><b class="num gold">+$${fmt(r.earned)}</b></div>
      ${r.bonus ? `<div class="rc-row"><span>בונוס נוקאאוט</span><b class="num gold">+$${fmt(r.bonus)}</b></div>` : ''}
      <div class="rc-row"><span>אגרופים שפגעו</span><b class="num">${r.landed}/${r.thrown} (${acc}%)</b></div>
      <div class="rc-row"><span>נוקדאונים</span><b class="num">${r.kdFor} : ${r.kdAgainst}</b></div>
      <div class="rc-row"><span>מאזן חדש</span><b class="num">${S.record.w}-${S.record.l}</b></div>
      <div class="rc-row"><span>אנרגיה</span><b class="num">${S.energy}%</b></div>
    </div>
    ${!r.won ? '<p class="muted center">כל הפסד הוא שיעור. תתאמן, תשדרג ציוד ותחזור לזירה — אותו יריב מחכה לך.</p>' : ''}
    <button class="btn ${r.won ? 'btn-green' : 'btn-blue'} btn-lg sweep" data-act="hub">חזרה לחדר הכושר</button>
  </section>`;
  if (r.won) Sfx.cash();
  fighterPreview(app.querySelector('.result-fighter'), () => playerLook(), 1, r.won ? { win: true, glow: 'rgba(244,183,63,.3)' } : { glow: 'rgba(63,127,240,.18)' });
}

// ---------- פעולות ----------
const ACTIONS = {
  new() {
    if (S && !confirm('להתחיל קריירה חדשה? הקריירה הנוכחית תימחק.')) return;
    go('create', false);
  },
  continue() { go('hub'); },
  title() { go('title'); },
  hub() { go('hub'); },
  tab(b) { renderHub(b.dataset.tab); },
  pick(b) { draft.look[b.dataset.k] = b.dataset.v; refreshGroup(b.dataset.k); Sfx.click(); },
  randomize() {
    const r = a => a[(Math.random() * a.length) | 0];
    draft.look = { skin: r(LOOK_OPTIONS.skin), hairStyle: r(LOOK_OPTIONS.hairStyle).id, hairColor: r(LOOK_OPTIONS.hairColor), beard: r(LOOK_OPTIONS.beard).id, shorts: r(LOOK_OPTIONS.cloth), gloves: r(LOOK_OPTIONS.cloth), shoes: r(LOOK_OPTIONS.cloth) };
    Object.keys(draft.look).forEach(refreshGroup);
  },
  startCareer() {
    if (!draft.name) { showErr('תן ללוחם שם לפני שמתחילים.'); return; }
    S = newCareer(draft.name, draft.nick, draft.look); save(); hubTab = 'fights'; go('hub');
    toast('הקריירה התחילה! היריב הראשון כבר מחכה.');
  },
  saveLook() {
    if (!draft.name) { showErr('ללוחם חייב להיות שם.'); return; }
    S.name = draft.name; S.nick = draft.nick; S.look = draft.look; save(); go('hub'); toast('השינויים נשמרו');
  },
  train(b) {
    const id = b.dataset.id, lvl = S.stats[id], cost = trainCost(lvl);
    if (S.money < cost || S.energy < TRAIN_ENERGY || lvl >= STAT_MAX) return;
    S.money -= cost; S.energy -= TRAIN_ENERGY;
    let gain = 1;
    if (S.coach && Math.random() < 0.5) gain++;
    if (Math.random() < 0.12) gain++;
    S.stats[id] = Math.min(STAT_MAX, lvl + gain);
    save(); renderHub();
    const name = STAT_DEFS.find(d => d.id === id).name;
    toast(gain > 1 ? `אימון מעולה! ${name} +${gain}` : `${name} +1`, 'good');
  },
  rest() { S.energy = 100; S.week++; save(); renderHub(); toast(`שבוע ${S.week} — אתה רענן לגמרי`); },
  work() {
    if (S.energy < 30) return;
    const pay = workPay(); S.money += pay; S.energy -= 30; save(); renderHub(); Sfx.cash(); toast(`הרווחת $${pay}`, 'gold');
  },
  buyGear(b) {
    const g = GEAR.find(x => x.id === b.dataset.id), tier = S.gear[g.id];
    if (tier >= 3 || S.money < GEAR_PRICE[tier + 1]) return;
    S.money -= GEAR_PRICE[tier + 1]; S.gear[g.id]++; save(); renderHub(); Sfx.cash();
    toast(`קנית ${g.tiers[tier + 1]}`, 'gold');
  },
  buyExtra(b) {
    const x = EXTRAS.find(e => e.id === b.dataset.id);
    if (S.money < x.price || (x.once && S[x.id])) return;
    if (x.id === 'drink' && S.energy >= 100) { toast('האנרגיה שלך כבר מלאה'); return; }
    S.money -= x.price;
    if (x.id === 'drink') S.energy = Math.min(100, S.energy + 40);
    if (x.id === 'massage') S.energy = 100;
    if (x.id === 'coach') S.coach = true;
    save(); renderHub(); Sfx.cash(); toast(`קנית ${x.name}`, 'gold');
  },
  learnStyle(b) {
    const id = b.dataset.id, st = STYLES[id];
    if (S.styles.includes(id) || S.money < st.price) return;
    S.money -= st.price; S.styles.push(id); S.style = id; save(); renderHub(); Sfx.cash();
    toast(`למדת את סגנון ה${st.name}!`, 'gold');
  },
  setStyle(b) {
    if (!S.styles.includes(b.dataset.id)) return;
    S.style = b.dataset.id; save(); renderHub(); Sfx.click(); toast(`הסגנון שלך עכשיו: ${STYLES[S.style].name}`);
  },
  tryOn(b) { wrTry = wrTry === b.dataset.id ? null : b.dataset.id; Sfx.click(); renderHub(); },
  buyWear(b) {
    const w = WARDROBE_BY_ID[b.dataset.id];
    if (S.money < w.price || S.outfit.owned.includes(w.id)) return;
    S.money -= w.price; S.outfit.owned.push(w.id); S.outfit.equip[w.slot] = w.id;
    if (wrTry === w.id) wrTry = null;
    save(); renderHub(); Sfx.cash(); toast(`קנית ${w.name} — כבר עליך`, 'gold');
  },
  wear(b) {
    const w = WARDROBE_BY_ID[b.dataset.id];
    if (!S.outfit.owned.includes(w.id)) return;
    S.outfit.equip[w.slot] = w.id; if (wrTry === w.id) wrTry = null;
    save(); renderHub(); Sfx.click();
  },
  unwear(b) {
    const w = WARDROBE_BY_ID[b.dataset.id];
    delete S.outfit.equip[w.slot]; save(); renderHub(); Sfx.click();
  },
  toVs() { go('vs'); },
  fight() { enterFightMode(); go('fight'); },
  pause() { if (currentFight) currentFight.cmd('pause'); },
  resume() { if (currentFight && currentFight.paused) currentFight.togglePause(); },
  forfeit() { if (currentFight && confirm('לזרוק את המגבת? זה ייחשב הפסד בלי תשלום.')) { currentFight.togglePause(); currentFight.forfeit(); } },
  editLook() { go('create', true); },
  sound() { Sfx.on = !Sfx.on; try { localStorage.setItem(SAVE_KEY + '-sound', Sfx.on ? 'on' : 'off'); } catch (e) { /* */ } renderHub(); },
  reset() {
    if (!confirm('למחוק את הקריירה לצמיתות? אין דרך לשחזר.')) return;
    S = null; try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } go('title');
  }
};
function showErr(m) { const e = document.getElementById('formErr'); e.textContent = m; e.hidden = false; document.getElementById('fName').focus(); }

app.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  Sfx.init();
  const fn = ACTIONS[b.dataset.act];
  if (fn) fn(b);
});

go(S ? 'title' : 'title');
