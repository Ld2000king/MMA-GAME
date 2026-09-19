// ===== נתוני המשחק =====
const SAVE_KEY = 'derech-lahagora-v1';
const STAT_MAX = 60;
const TRAIN_ENERGY = 20;

const LOOK_OPTIONS = {
  skin: ['#f5d2b5', '#e6b08a', '#c98c5f', '#a86b40', '#7c4a2a', '#4f2e1b'],
  hairStyle: [
    { id: 'bald', name: 'קרחת' }, { id: 'buzz', name: 'קצוץ' }, { id: 'short', name: 'קצר' },
    { id: 'mohawk', name: 'מוהוק' }, { id: 'afro', name: 'אפרו' }, { id: 'pony', name: 'קוקו' },
    { id: 'dreads', name: 'ראסטות' }
  ],
  hairColor: ['#15110f', '#3e2718', '#7a4c24', '#c9a25a', '#a8392a', '#dcd8cf', '#2f64d6'],
  beard: [{ id: 'none', name: 'ללא' }, { id: 'stubble', name: 'זיפים' }, { id: 'beard', name: 'זקן' }, { id: 'mustache', name: 'שפם' }],
  cloth: ['#d23a40', '#2f6fdb', '#1f9d62', '#e3b23c', '#7b4fd6', '#1b1d22', '#eeeeee', '#e0662b', '#e05a9c', '#14a3b8']
};

const DEFAULT_LOOK = { skin: '#c98c5f', hairStyle: 'short', hairColor: '#15110f', beard: 'none', shorts: '#d23a40', gloves: '#d23a40', shoes: '#1b1d22' };

const STAT_DEFS = [
  { id: 'power',   name: 'כוח',    train: 'שק כבד',          desc: 'אגרופים כבדים יותר שמורידים יותר חיים.' },
  { id: 'speed',   name: 'מהירות', train: 'כדור מהיר',        desc: 'אגרופים מהירים ותזוזה זריזה בזירה.' },
  { id: 'stamina', name: 'סיבולת', train: 'ריצת בוקר',        desc: 'מאגר אנרגיה גדול יותר והתאוששות מהירה.' },
  { id: 'defense', name: 'הגנה',   train: 'ספארינג הגנתי',    desc: 'חסימות אטומות יותר ופחות נזק מכל מכה.' },
  { id: 'chin',    name: 'ספיגה',  train: 'חיזוק צוואר ובטן', desc: 'יותר חיים, וקל יותר לקום מנוקדאון.' }
];

const GEAR = [
  { id: 'gloves', stat: 'power',   name: 'כפפות',        tiers: ['כפפות אימון', 'כפפות עור 10oz', 'כפפות מקצוענים', 'כפפות אליפות'] },
  { id: 'shoes',  stat: 'speed',   name: 'נעלי אגרוף',   tiers: ['נעלי התעמלות', 'נעלי אגרוף בסיסיות', 'נעלי מקצוענים', 'נעלי אליפות קלות'] },
  { id: 'mask',   stat: 'stamina', name: 'ציוד סיבולת',  tiers: ['חבל קפיצה', 'מסכת אימון גובה', 'שעון דופק חכם', 'מחנה אימונים בהרים'] },
  { id: 'wraps',  stat: 'defense', name: 'תחבושות',      tiers: ['תחבושות בד', 'תחבושות ג׳ל', 'תחבושות מקצועיות', 'תחבושות אליפות'] },
  { id: 'guard',  stat: 'chin',    name: 'מגן שיניים',   tiers: ['מגן בסיסי', 'מגן מותאם', 'מגן כפול', 'מגן טיטניום'] }
];
const GEAR_PRICE = [0, 250, 800, 2200];
const GEAR_BONUS = [0, 3, 6, 10];

const EXTRAS = [
  { id: 'drink',   name: 'משקה איזוטוני',  price: 60,   desc: '‎+40 אנרגיה מיד.' },
  { id: 'massage', name: 'עיסוי ספורטאים', price: 150,  desc: 'אנרגיה מלאה בלי לבזבז שבוע.' },
  { id: 'coach',   name: 'מאמן מקצועי',     price: 1500, desc: 'כל אימון נותן סיכוי לשיפור כפול. קנייה חד-פעמית.', once: true }
];

// ===== סגנונות לחימה =====
// m = מכפילי סטטיסטיקה ליריבים · ai = התנהגות בזירה · perk = יתרון/חולשה (גם לשחקן, אחרי שלמד את הסגנון)
const AI_BASE = { aggr: .6, near: [100, 132], far: [140, 178], tempo: 1, react: 0, blockPref: .72, combo: .25, comboLen: 1, upper: .28, jab: .55, retreat: false, punish: 1, dodgeCounter: false, dashIn: 0.5, dashOut: 0.15 };
const STYLES = {
  balanced:  { name: 'מאוזן', price: 0,
    desc: 'בלי נקודות תורפה בולטות. קרב טכני.', perkDesc: 'בלי יתרונות ובלי חולשות.',
    m: { power: 1, speed: 1, stamina: 1, defense: 1, chin: 1 }, ai: {}, perk: {} },
  slugger:   { name: 'מכה כבדה', price: 600,
    desc: 'לוחץ קדימה ומחפש את המכה הגדולה. תזוז ותעניש.', perkDesc: 'נזק +15%, אבל כל אגרוף עולה 10% יותר סיבולת.',
    m: { power: 1.3, speed: .85, stamina: 1, defense: .8, chin: 1.15 },
    ai: { aggr: .8, tempo: .9, react: -.05, blockPref: .8, combo: .2, upper: .4, jab: .35, punish: .8, dashIn: 1, dashOut: .05 }, perk: { dmg: 1.15, sta: 1.1 } },
  speedster: { name: 'מהיר', price: 600,
    desc: 'נכנס ויוצא עם ג׳אבים. תחסום ותסגור מרחק.', perkDesc: 'אגרופים ותזוזה מהירים יותר, נזק -8%.',
    m: { power: .85, speed: 1.3, stamina: 1.1, defense: 1, chin: .85 },
    ai: { aggr: .5, tempo: .7, react: .05, blockPref: .5, combo: .35, upper: .15, jab: .7, retreat: true, dashIn: 1.3, dashOut: .35 }, perk: { spd: .88, dmg: .92, move: 1.1 } },
  tank:      { name: 'טנק', price: 800,
    desc: 'סופג הרבה ומתקדם לאט. תבנה סיבולת לפני הקרב.', perkDesc: 'חיים +15% וחסימה אטומה יותר, אבל תזוזה איטית.',
    m: { power: 1.05, speed: .8, stamina: 1.05, defense: 1.15, chin: 1.35 },
    ai: { aggr: .72, tempo: 1.1, blockPref: .9, combo: .2, upper: .3, jab: .5, punish: .9 }, perk: { hp: 1.15, block: .75, move: .9 } },
  counter:   { name: 'מתקיף-נגד', price: 900,
    desc: 'מחכה לטעות שלך. אל תזרוק מכות סרק.', perkDesc: 'קאונטר חזק בהרבה (×1.75), התחמקות מתאוששת מהר.',
    m: { power: 1, speed: 1.1, stamina: .95, defense: 1.3, chin: .9 },
    ai: { aggr: .4, tempo: 1.25, react: .12, blockPref: .55, combo: .2, upper: .3, jab: .5, punish: 1.6, dodgeCounter: true, dashIn: .4, dashOut: .3 }, perk: { counter: 1.75, dodgeCd: .7 } },
  brawler:   { name: 'מתגושש', price: 900,
    desc: 'זורק סדרות של 3-4 אגרופים ברצף. חסום את הסדרה ותחזיר.', perkDesc: 'כל פגיעה ברצף מוסיפה 12% נזק (עד +36%), אבל השמירה חלשה יותר.',
    m: { power: 1.15, speed: 1, stamina: 1.1, defense: .75, chin: 1.1 },
    ai: { aggr: .85, tempo: 1.05, react: -.08, blockPref: .85, combo: .55, comboLen: 3, upper: .35, jab: .45, punish: .7, dashIn: 1.3, dashOut: .05 }, perk: { chain: .12, block: 1.3 } },
  outboxer:  { name: 'בוקסר מרחוק', price: 1000,
    desc: 'שומר מרחק ודוקר בג׳אבים. תתקרב אליו והוא בבעיה.', perkDesc: 'טווח ארוך יותר לכל אגרוף, נזק -5%.',
    m: { power: .9, speed: 1.15, stamina: 1.05, defense: 1.15, chin: .85 },
    ai: { aggr: .3, near: [125, 150], far: [160, 195], tempo: .8, react: .08, blockPref: .6, combo: .2, upper: .1, jab: .8, retreat: true, punish: 1.1, dashIn: .35, dashOut: .45 }, perk: { reach: 18, dmg: .95 } },
  pressure:  { name: 'לוחץ', price: 1100,
    desc: 'לא נותן לך לנשום ולא נסוג אף פעם. תנצל את זה שהוא תמיד מגיע.', perkDesc: 'אגרופים זולים ב-15% וסיבולת מתמלאת מהר יותר.',
    m: { power: 1.05, speed: .95, stamina: 1.35, defense: .9, chin: 1.05 },
    ai: { aggr: .95, near: [95, 120], tempo: .75, blockPref: .8, combo: .4, comboLen: 2, upper: .3, jab: .5, punish: .9, dashIn: 1.6, dashOut: 0 }, perk: { sta: .85, regen: 1.25 } },
  dodger:    { name: 'מתחמק', price: 1200,
    desc: 'כמעט אי אפשר לפגוע בו, ומחזיר מיד אחרי כל התחמקות. תזרוק ג׳אבים מהירים.', perkDesc: 'התחמקות זולה ומהירה, והאגרוף שאחריה חזק ב-30%.',
    m: { power: .9, speed: 1.25, stamina: 1, defense: 1.2, chin: .8 },
    ai: { aggr: .5, react: .15, blockPref: .25, combo: .3, upper: .25, jab: .55, punish: 1.3, dodgeCounter: true, dashIn: .8, dashOut: .5 }, perk: { dodgeCd: .55, dodgeSta: .5, dodgeHit: .3 } },
  giant:     { name: 'ענק', price: 1500,
    desc: 'גבוה, כבד ואיטי. מכה אחת שלו שווה שלוש. אל תעמוד מולו.', perkDesc: 'חיים +25% ונזק +10%, אבל אגרופים ותזוזה איטיים.',
    m: { power: 1.25, speed: .75, stamina: .95, defense: 1, chin: 1.3 },
    ai: { aggr: .7, near: [110, 140], tempo: 1.3, react: -.05, blockPref: .85, combo: .15, upper: .35, jab: .45, punish: .8, dashIn: .15, dashOut: 0 }, perk: { hp: 1.25, dmg: 1.1, spd: 1.12, move: .85, reach: 10 } }
};

const L = (skin, hairStyle, hairColor, beard, shorts, gloves, shoes, outfit = {}) => ({ skin, hairStyle, hairColor, beard, shorts, gloves, shoes, outfit });
const T1 = 'דרג אזורי', T2 = 'דרג לאומי', T3 = 'דרג עולמי';

const OPPONENTS = [
  { name: 'אבי לוי',        nick: 'הבלון',      level: 8,  style: 'balanced',  purse: 200,  rounds: 3, tier: T1, look: L('#e6b08a', 'short', '#3e2718', 'stubble', '#2f6fdb', '#2f6fdb', '#eeeeee') },
  { name: 'יוסי מזרחי',     nick: 'הצועק',      level: 10, style: 'brawler',   purse: 280,  rounds: 3, tier: T1, look: L('#c98c5f', 'buzz', '#15110f', 'beard', '#1b1d22', '#e0662b', '#1b1d22', { face: 'paint' }) },
  { name: 'סרגיי מורוז',    nick: 'הקיר',       level: 12, style: 'tank',      purse: 380,  rounds: 3, tier: T1, look: L('#f5d2b5', 'buzz', '#c9a25a', 'none', '#1b1d22', '#d23a40', '#1b1d22') },
  { name: 'ריקו סאנצ׳ס',    nick: 'זיקוק',      level: 14, style: 'speedster', purse: 500,  rounds: 3, tier: T1, look: L('#c98c5f', 'mohawk', '#15110f', 'mustache', '#e3b23c', '#1b1d22', '#e3b23c', { head: 'bandana', tattoo: 'tribal' }) },
  { name: 'טום אקרמן',      nick: 'הפרופסור',   level: 16, style: 'outboxer',  purse: 650,  rounds: 3, tier: T1, look: L('#f5d2b5', 'short', '#c9a25a', 'none', '#2f6fdb', '#eeeeee', '#2f6fdb', { top: 'tank_white' }) },
  { name: 'מוטי ברזילי',    nick: 'הפטיש',      level: 19, style: 'slugger',   purse: 850,  rounds: 4, tier: T2, look: L('#e6b08a', 'bald', '#15110f', 'beard', '#1f9d62', '#1f9d62', '#1b1d22', { top: 'tank_black' }) },
  { name: 'קנג׳י טנאקה',    nick: 'הצל',        level: 22, style: 'counter',   purse: 1100, rounds: 4, tier: T2, look: L('#f0c9a0', 'pony', '#15110f', 'none', '#eeeeee', '#d23a40', '#eeeeee', { head: 'band_white' }) },
  { name: 'בוריס איבנוב',   nick: 'ההר',        level: 24, style: 'giant',     purse: 1350, rounds: 4, tier: T2, look: L('#f5d2b5', 'bald', '#3e2718', 'beard', '#1f9d62', '#1b1d22', '#1b1d22', { tattoo: 'sleeve' }) },
  { name: 'ג׳מאל ווקר',     nick: 'רעם',        level: 26, style: 'pressure',  purse: 1650, rounds: 4, tier: T2, look: L('#4f2e1b', 'afro', '#15110f', 'stubble', '#7b4fd6', '#e3b23c', '#7b4fd6', { neck: 'chain', face: 'paint' }) },
  { name: 'לוקאס פרירה',    nick: 'השועל',      level: 29, style: 'dodger',    purse: 2000, rounds: 5, tier: T2, look: L('#a86b40', 'dreads', '#3e2718', 'none', '#14a3b8', '#eeeeee', '#14a3b8', { tattoo: 'sleeve', pattern: 'pt_stripes' }) },
  { name: 'ויקטור וולקוב',  nick: 'הצאר',       level: 33, style: 'tank',      purse: 2800, rounds: 5, tier: 'קרב אליפות', title: 'חגורת האליפות הלאומית', look: L('#f5d2b5', 'buzz', '#dcd8cf', 'beard', '#d23a40', '#e3b23c', '#d23a40', { robe: 'robe_red', pattern: 'pt_stars' }) },
  { name: 'מתאו רוסי',      nick: 'הגלדיאטור',  level: 36, style: 'brawler',   purse: 3300, rounds: 5, tier: T3, look: L('#e6b08a', 'short', '#15110f', 'stubble', '#d23a40', '#eeeeee', '#d23a40', { neck: 'tags', tattoo: 'tribal', robe: 'robe_red' }) },
  { name: 'חוסה מרטינס',    nick: 'אל טורו',    level: 38, style: 'pressure',  purse: 3800, rounds: 5, tier: T3, look: L('#a86b40', 'mohawk', '#15110f', 'mustache', '#e3b23c', '#d23a40', '#e3b23c', { pattern: 'pt_flames', head: 'band_red' }) },
  { name: 'איתן ברק',       nick: 'הרובוט',     level: 40, style: 'outboxer',  purse: 4300, rounds: 5, tier: T3, look: L('#e6b08a', 'buzz', '#3e2718', 'none', '#eeeeee', '#2f6fdb', '#eeeeee', { pattern: 'pt_stripes', robe: 'robe_white' }) },
  { name: 'דרייק ג׳ונסון',  nick: 'המלך',       level: 42, style: 'counter',   purse: 5000, rounds: 5, tier: T3, look: L('#7c4a2a', 'short', '#15110f', 'beard', '#1b1d22', '#e3b23c', '#e3b23c', { neck: 'chain', pattern: 'pt_gold', robe: 'robe_black' }) },
  { name: 'יוקי מורי',      nick: 'הרוח',       level: 44, style: 'dodger',    purse: 5800, rounds: 5, tier: T3, look: L('#f0c9a0', 'pony', '#dcd8cf', 'none', '#1b1d22', '#7b4fd6', '#1b1d22', { head: 'band_white', pattern: 'pt_stars' }) },
  { name: 'אולף סוונסון',   nick: 'הוויקינג',   level: 47, style: 'giant',     purse: 6800, rounds: 5, tier: T3, look: L('#f5d2b5', 'dreads', '#c9a25a', 'beard', '#2f6fdb', '#eeeeee', '#1b1d22', { tattoo: 'tribal', neck: 'chain' }) },
  { name: 'אמקה אוקונקוו',  nick: 'טיטאן',      level: 50, style: 'slugger',   purse: 9000, rounds: 5, tier: 'קרב אליפות עולם', title: 'חגורת אלוף העולם', look: L('#4f2e1b', 'bald', '#15110f', 'mustache', '#e3b23c', '#1b1d22', '#e3b23c', { neck: 'chain', pattern: 'pt_flames', tattoo: 'tribal', robe: 'robe_black' }) }
];
const NATIONAL_TIER_AT = 5, WORLD_TIER_AT = 11;

// ===== מלתחה: פריטי לבוש שנקנים בכסף של המשחק =====
const WARDROBE_SLOTS = [
  { id: 'top',     name: 'חולצות' },
  { id: 'pattern', name: 'עיצוב מכנסיים' },
  { id: 'head',    name: 'כיסוי ראש' },
  { id: 'face',    name: 'פנים' },
  { id: 'neck',    name: 'תכשיטים' },
  { id: 'tattoo',  name: 'קעקועים' },
  { id: 'robe',    name: 'חלוקי כניסה' }
];
const WARDROBE = [
  { id: 'tank_white', slot: 'top', name: 'גופייה לבנה',     price: 120,  color: '#f2f2f2' },
  { id: 'tank_black', slot: 'top', name: 'גופייה שחורה',    price: 120,  color: '#1d1f25' },
  { id: 'tank_red',   slot: 'top', name: 'גופייה אדומה',    price: 150,  color: '#c9303a' },
  { id: 'tank_camo',  slot: 'top', name: 'גופיית הסוואה',   price: 350,  color: '#4d5a36', camo: true },
  { id: 'tank_gold',  slot: 'top', name: 'גופיית אליפות',   price: 900,  color: '#e3b23c', trim: '#1b1d22' },
  { id: 'pt_stripes', slot: 'pattern', name: 'פסי צד',      price: 200 },
  { id: 'pt_stars',   slot: 'pattern', name: 'כוכבים',      price: 350 },
  { id: 'pt_flames',  slot: 'pattern', name: 'להבות',       price: 500 },
  { id: 'pt_gold',    slot: 'pattern', name: 'עיטור זהב',   price: 800 },
  { id: 'band_red',   slot: 'head', name: 'סרט ראש אדום',   price: 80,   color: '#d23a40' },
  { id: 'band_white', slot: 'head', name: 'סרט ראש לבן',    price: 80,   color: '#eeeeee' },
  { id: 'bandana',    slot: 'head', name: 'בנדנה כחולה',    price: 180,  color: '#2f5fc4' },
  { id: 'headgear',   slot: 'head', name: 'קסדת אימון',     price: 450,  color: '#b3262e' },
  { id: 'crown',      slot: 'head', name: 'כתר האלוף',      price: 6000 },
  { id: 'paint',      slot: 'face', name: 'צבע מלחמה',      price: 150 },
  { id: 'shades',     slot: 'face', name: 'משקפי שמש',      price: 300 },
  { id: 'tags',       slot: 'neck', name: 'דיסקיות',        price: 250 },
  { id: 'chain',      slot: 'neck', name: 'שרשרת זהב',      price: 700 },
  { id: 'tribal',     slot: 'tattoo', name: 'קעקוע שבטי',   price: 400 },
  { id: 'sleeve',     slot: 'tattoo', name: 'שרוול קעקועים', price: 900 },
  { id: 'robe_red',   slot: 'robe', name: 'חלוק אדום',       price: 500,  color: '#b3262e', trim: '#f2f2f2' },
  { id: 'robe_white', slot: 'robe', name: 'חלוק לבן-כחול',   price: 800,  color: '#eeeeee', trim: '#2f5fc4' },
  { id: 'robe_black', slot: 'robe', name: 'חלוק שחור-זהב',   price: 1400, color: '#17181d', trim: '#e3b23c' }
];
const WARDROBE_BY_ID = Object.fromEntries(WARDROBE.map(w => [w.id, w]));

const CHALLENGERS = [
  { name: 'אנטון רייס', nick: 'המכונה', style: 'balanced' },
  { name: 'סמי חדד', nick: 'הנחש', style: 'speedster' },
  { name: 'ברנדון קול', nick: 'טורנדו', style: 'slugger' },
  { name: 'עומר נסים', nick: 'האריה', style: 'counter' },
  { name: 'דימה קרוב', nick: 'פלדה', style: 'tank' },
  { name: 'קאי נקאמורה', nick: 'הברק', style: 'dodger' },
  { name: 'מרקוס סטון', nick: 'הבולדוזר', style: 'pressure' },
  { name: 'איוון דרגוב', nick: 'המגדל', style: 'giant' },
  { name: 'ליאם אוקונור', nick: 'הפרא', style: 'brawler' },
  { name: 'פבלו ריוס', nick: 'המדען', style: 'outboxer' }
];

function challenger(n) {
  const c = CHALLENGERS[n % CHALLENGERS.length];
  const seed = n * 7 + 3;
  const pick = (arr, k) => arr[(seed * (k + 3) + k) % arr.length];
  return {
    ...c, level: 52 + n * 3, purse: 9000 + n * 1500, rounds: 5, tier: 'הגנה על התואר', defense: true,
    look: {
      skin: pick(LOOK_OPTIONS.skin, 1), hairStyle: pick(LOOK_OPTIONS.hairStyle, 2).id, hairColor: pick(LOOK_OPTIONS.hairColor, 3),
      beard: pick(LOOK_OPTIONS.beard, 4).id, shorts: pick(LOOK_OPTIONS.cloth, 5), gloves: pick(LOOK_OPTIONS.cloth, 6), shoes: pick(LOOK_OPTIONS.cloth, 7)
    }
  };
}

function oppStats(o) {
  const m = STYLES[o.style].m, s = {};
  for (const d of STAT_DEFS) s[d.id] = Math.max(3, Math.round(o.level * m[d.id]));
  return s;
}

function newCareer(name, nick, look) {
  return {
    v: 2, name, nick, look, style: 'balanced', styles: ['balanced'],
    stats: { power: 10, speed: 10, stamina: 10, defense: 10, chin: 10 },
    money: 250, energy: 100, week: 1,
    record: { w: 0, l: 0, ko: 0 },
    next: 0, defenses: 0,
    gear: { gloves: 0, shoes: 0, mask: 0, wraps: 0, guard: 0 },
    coach: false, belts: [], history: [],
    outfit: { owned: [], equip: {} }
  };
}
