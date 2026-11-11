/* Philemon unified GA4 tracking, v20261112.
 * Sends only non-personal interaction metadata. Never reads form field values.
 * The existing GA4 bootstrap is retained on legacy pages; no duplicate config.
 */
(function () {
  'use strict';
  if (window.__philemonUnifiedGA4) return;
  window.__philemonUnifiedGA4 = true;
  const TAG = 'G-JD1JHF86H1';
  const self = document.currentScript;
  const legacy = self && self.dataset.legacyGa === '1';
  const legacyPurchase = self && self.dataset.legacyPurchase === '1';
  const embedded = self && self.dataset.embedded === '1';
  const pathname = location.pathname.toLowerCase();
  const language = document.documentElement.lang || 'und';
  const contentGroup = /^\/2026-\d{2}\//.test(pathname) ? 'newsletter' :
    /^\/c\d{3}\//.test(pathname) ? 'book' :
    /^\/shirt\//.test(pathname) ? 'shirt' : 'other';
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }
  if (!legacy) {
    window.gtag('js', new Date());
    window.gtag('config', TAG, {
      send_page_view: !embedded,
      page_language: language
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + TAG;
    document.head.appendChild(script);
  }
  function send(eventName, fields) {
    try {
      const base = {
        send_to: TAG,
        page_path: location.pathname,
        page_language: language,
        content_group: contentGroup,
        transport_type: 'beacon'
      };
      window.gtag('event', eventName, Object.assign(base, fields || {}));
    } catch (e) {}
  }
  function safeLink(raw) {
    try {
      const u = new URL(raw, location.href);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
      return u.origin + u.pathname; // Strip all query strings and fragments.
    } catch (e) { return ''; }
  }
  function productId(url) {
    const m = url.match(/\/products\/([a-z0-9-]+)/i);
    return m ? m[1].toUpperCase() : '';
  }
  function safeLabel(el) {
    if (!el) return '';
    // Visible link text can contain identifying information. Never transmit it.
    return el.dataset && el.dataset.analyticsName ? el.dataset.analyticsName.slice(0,64) : '';
  }
  function isShopUrl(url) {
    try { return new URL(url).hostname.toLowerCase().replace(/^www\./,'') === 'pbooks.com.tw'; }
    catch(e){ return false; }
  }
  document.addEventListener('click', function (ev) {
    const a = ev.target && ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    const url = safeLink(a.href);
    if (!url) return;
    const prod = isShopUrl(url) ? productId(url) : '';
    if (prod) {
      // Older pages already emit this specific event in inline handlers.
      if (!legacyPurchase) {
        send('purchase_link_click', { item_id: prod, link_url: url, source_page: location.pathname });
      }
      return;
    }
    if (a.hreflang && a.hreflang !== language) {
      send('language_switch', { target_language: a.hreflang, target_path: new URL(url).pathname });
    }
    const u = new URL(url);
    if (u.hostname === location.hostname && /^\/c\d{3}\/?$/.test(u.pathname.toLowerCase())) {
      send('book_page_click', { item_id: u.pathname.match(/c\d{3}/i)[0].toUpperCase(), target_path: u.pathname });
    }
    if (contentGroup === 'newsletter' && a.hash &&
        /^#(?:first|second|third|fourth|fifth|menu|arrivals)$/.test(a.hash)) {
      send('newsletter_menu_click', { menu_section: a.hash.slice(1) });
    }
  }, false);
  // The carousel opens its dialog in pointerup, so listen for the dialog state,
  // not the original button click (which is intentionally prevented on touch).
  const orderDialog = document.getElementById('turntableOrderDialog');
  if (orderDialog && typeof MutationObserver !== 'undefined') {
    const watch = new MutationObserver(function () {
      if (!orderDialog.open) return;
      const url = safeLink((document.getElementById('turntableOrderBuy') || {}).href || '');
      const id = productId(url);
      if (id) send('newsletter_book_order_open', { item_id: id });
    });
    watch.observe(orderDialog, { attributes: true, attributeFilter: ['open'] });
  }
  // Reader: count intentional expansion, never count content on page load.
  document.addEventListener('toggle', function (ev) {
    const d = ev.target;
    if (!d || !d.matches || !d.matches('details.reading-excerpt') || !d.open) return;
    const heading = d.querySelector('summary');
    const text = heading ? heading.textContent.trim().slice(0, 70) : '';
    send('book_excerpt_open', { book_id: (pathname.match(/c\d{3}/) || [''])[0].toUpperCase(),
      excerpt_index: Array.prototype.indexOf.call(document.querySelectorAll('details.reading-excerpt'), d) + 1 });
  }, true);
  const reader = document.getElementById('fullscreen-reader');
  if (reader && typeof MutationObserver !== 'undefined') {
    const watcher = new MutationObserver(function () {
      if (reader.getAttribute('aria-hidden') !== 'false') return;
      const title = reader.querySelector('#fs-title');
      const n = document.querySelectorAll('.reading-excerpt').length;
      send('book_fullscreen_read', { book_id: (pathname.match(/c\d{3}/) || [''])[0].toUpperCase(),
        reading_mode: 'fullscreen' });
    });
    watcher.observe(reader, { attributes:true, attributeFilter:['aria-hidden'] });
  }
  // Track real user drags once per drag; only the rotating book table.
  const wheel = document.getElementById('turntableStage');
  if (wheel) {
    let initial = null;
    wheel.addEventListener('pointerdown', function (e) { initial = { x:e.clientX, y:e.clientY, sent:false }; }, {passive:true});
    wheel.addEventListener('pointermove', function (e) {
      if (!initial || initial.sent) return;
      if (Math.hypot(e.clientX-initial.x,e.clientY-initial.y) > 18) {
        initial.sent = true;
        send('newsletter_turntable_drag', { interaction_type: e.pointerType === 'touch' ? 'touch' : 'pointer' });
      }
    }, {passive:true});
    wheel.addEventListener('pointerup', function(){initial=null;}, {passive:true});
    wheel.addEventListener('pointercancel', function(){initial=null;}, {passive:true});
  }
  // Do not treat attempts as successful leads.
  if (pathname.startsWith('/shirt/')) {
    document.addEventListener('submit', function (e) {
      const id = e.target && e.target.id;
      if (id !== 'quickForm' && id !== 'bwForm') return;
      send('shirt_interest_submit_attempt', { form_variant: id === 'bwForm' ? 'banner' : 'page' });
    }, true);
  }
})();