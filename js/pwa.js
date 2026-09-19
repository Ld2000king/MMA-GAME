// ===== PWA: רישום service worker + התקנה כאפליקציה =====
// window.PWA.state(): 'installed' (כבר רץ כאפליקציה) | 'prompt' (אפשר להתקין בלחיצה) | 'ios' (התקנה ידנית מ"שתף") | 'none'
(function () {
  const ua = navigator.userAgent || '';
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  let deferred = null;
  const changed = () => document.dispatchEvent(new Event('pwa-change'));

  window.PWA = {
    standalone,
    state() {
      if (standalone()) return 'installed';
      if (deferred) return 'prompt';
      if (isIOS) return 'ios';
      return 'none';
    },
    async install() {
      if (!deferred) return false;
      deferred.prompt();
      const r = await deferred.userChoice.catch(() => null);
      deferred = null; changed();
      return !!r && r.outcome === 'accepted';
    }
  };

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; changed(); });
  window.addEventListener('appinstalled', () => { deferred = null; changed(); });
  window.matchMedia('(display-mode: standalone)').addEventListener('change', changed);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* ללא אופליין */ });
    });
  }
})();
