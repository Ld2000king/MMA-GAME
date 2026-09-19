// Service worker: המשחק עובד גם בלי אינטרנט.
// אסטרטגיה: מגישים מיד מהמטמון, ובמקביל מרעננים ברקע — כך העדכון מופיע בפתיחה הבאה.
// הוסף/הסר קובץ ברשימה למטה => העלה את VERSION כדי שהמטמון ייבנה מחדש.
const VERSION = 'v7';
const CACHE = 'mma-' + VERSION;
const SHELL = [
  './', 'index.html', 'style.css', 'fonts.css', 'manifest.webmanifest',
  'js/data.js', 'js/audio.js', 'js/draw.js', 'js/fight.js', 'js/ui.js', 'js/pwa.js',
  'assets/logo.webp', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png', 'assets/apple-touch-icon.png', 'assets/favicon-32.png',
  'fonts/rubik-hebrew-423ede.woff2', 'fonts/rubik-latin-f673d8.woff2', 'fonts/secular-one-hebrew.woff2', 'fonts/secular-one-latin.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('mma-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    const refresh = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) cache.put(req.mode === 'navigate' ? 'index.html' : req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(refresh); return cached; }
    const res = await refresh;
    if (res) return res;
    if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
    return Response.error();
  })());
});
