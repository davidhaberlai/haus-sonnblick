(() => {
  'use strict';
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const LANG = (doc.lang || 'de').slice(0, 2);
  const TT = {
    de: { mOpen: 'Menü öffnen', mClose: 'Menü schließen', sentH: 'Danke für Ihre Nachricht!', sentP: 'Wir melden uns so rasch wie möglich bei Ihnen.', err: 'Bitte prüfen Sie die markierten Felder.', pkg: 'Ich interessiere mich für das Package „%s“.\n\nWunschtermin: \nPersonen: ', lb: 'Bildansicht', x: 'Schließen', prev: 'Vorheriges Bild', next: 'Nächstes Bild' },
    en: { mOpen: 'Open menu', mClose: 'Close menu', sentH: 'Thank you for your message!', sentP: 'We will get back to you as soon as possible.', err: 'Please check the highlighted fields.', pkg: 'I am interested in the package “%s”.\n\nPreferred dates: \nGuests: ', lb: 'Image view', x: 'Close', prev: 'Previous image', next: 'Next image' },
    it: { mOpen: 'Apri il menu', mClose: 'Chiudi il menu', sentH: 'Grazie per il vostro messaggio!', sentP: 'Vi risponderemo il prima possibile.', err: 'Controllate i campi evidenziati.', pkg: 'Sono interessato/a al pacchetto «%s».\n\nDate desiderate: \nPersone: ', lb: 'Visualizzazione immagine', x: 'Chiudi', prev: 'Immagine precedente', next: 'Immagine successiva' }
  };
  const TXT = TT[LANG] || TT.de;

  /* ---------- Datums-Helfer (auch für Buchung) ---------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const seasonOf = s => (window.SB ? SB.seasons.find(x => s >= x.from && s <= x.to) : null);
  window.SBU = { pad, iso, parse, addDays, seasonOf };

  /* ---------- Header ---------- */
  const hdr = $('#hdr');
  const onScroll = () => { hdr.classList.toggle('is-scrolled', scrollY > 40); };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Dropdowns ---------- */
  const items = $$('.nav__item');
  const closeAll = except => items.forEach(i => {
    if (i !== except) { i.classList.remove('is-open'); $('.nav__link', i).setAttribute('aria-expanded', 'false'); }
  });
  const open = i => { closeAll(i); i.classList.add('is-open'); $('.nav__link', i).setAttribute('aria-expanded', 'true'); };
  items.forEach(i => {
    const btn = $('.nav__link', i);
    let t;
    i.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) { clearTimeout(t); t = setTimeout(() => open(i), 60); } });
    i.addEventListener('mouseleave', () => { if (matchMedia('(hover:hover)').matches) { clearTimeout(t); t = setTimeout(() => { i.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }, 220); } });
    btn.addEventListener('click', () => { i.classList.contains('is-open') ? closeAll() : open(i); });
    i.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeAll(); btn.focus(); }
      if (e.key === 'ArrowDown' && document.activeElement === btn) { e.preventDefault(); open(i); $('.drop a', i).focus(); }
    });
    i.addEventListener('focusout', e => { if (!i.contains(e.relatedTarget)) { i.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); } });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.nav__item')) closeAll(); });

  /* Aktuelle Seite markieren */
  const here = location.pathname.split('/').pop() || 'index.html';
  $$('.drop a, .mnav__sub a').forEach(a => { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });

  /* ---------- Mobiles Menü ---------- */
  const burger = $('.burger');
  const setMenu = on => {
    document.body.classList.toggle('menu-open', on);
    burger.setAttribute('aria-expanded', on ? 'true' : 'false');
    burger.setAttribute('aria-label', on ? TXT.mClose : TXT.mOpen);
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('.mnav__head').forEach(h => h.addEventListener('click', () => {
    const g = h.parentElement, on = !g.classList.contains('is-open');
    $$('.mnav__group').forEach(x => { x.classList.remove('is-open'); $('.mnav__head', x).setAttribute('aria-expanded', 'false'); });
    g.classList.toggle('is-open', on); h.setAttribute('aria-expanded', on ? 'true' : 'false');
  }));
  $$('.mnav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false); });

  /* ---------- Einblenden beim Scrollen ---------- */
  const rv = $$('.rv-up, .pic.rv');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rv.forEach(el => io.observe(el));
  } else rv.forEach(el => el.classList.add('is-in'));

  /* ---------- Parallax ---------- */
  const heroImg = $('.hero__img img');
  const plx = $$('[data-parallax]');
  if (!reduce && (heroImg || plx.length)) {
    let tick = false;
    const run = () => {
      tick = false;
      const vh = innerHeight;
      const small = matchMedia('(max-width:700px)').matches;
      if (heroImg && !small && scrollY < vh * 1.2) heroImg.style.transform = `translate3d(0,${(scrollY * 0.22).toFixed(1)}px,0)`;
      if (small) { plx.forEach(el => { el.style.transform = ''; }); return; }
      plx.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0,${(p * -100 * (+el.dataset.parallax || .1)).toFixed(1)}%,0)`;
      });
    };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  /* ---------- Bildband Region: Einblenden und Zahlen hochzählen ---------- */
  const regions = $$('.region');
  const counts = $$('[data-count]');
  if (regions.length || counts.length) {
    const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const countUp = el => {
      const end = +el.dataset.count, dur = end > 99 ? 1900 : 900;
      el.textContent = fmt(end);
      el.style.display = 'inline-block';
      el.style.minWidth = el.getBoundingClientRect().width.toFixed(1) + 'px';
      el.textContent = '0';
      let t0 = null;
      const step = t => {
        if (t0 === null) t0 = t;
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - p, 4))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window && !reduce) {
      const ro = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); }
      }), { threshold: 0.12 });
      regions.forEach(el => ro.observe(el));
      const co = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { countUp(e.target); co.unobserve(e.target); }
      }), { threshold: 0.6, rootMargin: '0px 0px -6% 0px' });
      counts.forEach(el => co.observe(el));
    } else regions.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- Intro (Startseite) ---------- */
  const intro = $('#intro'), hero = $('#hero');
  const heroIn = () => { if (hero) { hero.classList.add('is-in', 'settle'); } };
  if (intro) {
    let seen = false;
    try { seen = sessionStorage.getItem('sb-intro') === '1'; } catch (e) {}
    if (reduce || seen) { heroIn(); }
    else {
      intro.hidden = false;
      doc.classList.add('intro-lock');
      scrollTo(0, 0);
      let finished = false;
      const finish = () => {
        if (finished) return; finished = true;
        try { sessionStorage.setItem('sb-intro', '1'); } catch (e) {}
        intro.classList.add('out');
        setTimeout(heroIn, 280);
        setTimeout(() => { intro.classList.add('gone'); doc.classList.remove('intro-lock'); }, 1100);
      };
      requestAnimationFrame(() => requestAnimationFrame(() => intro.classList.add('play')));
      const t = setTimeout(finish, 2600);
      const skip = () => { clearTimeout(t); finish(); };
      intro.addEventListener('click', skip);
      addEventListener('keydown', skip, { once: true });
      addEventListener('wheel', skip, { once: true, passive: true });
      addEventListener('touchmove', skip, { once: true, passive: true });
    }
  } else heroIn();

  /* ---------- Schnellbuchung (Startseite) ---------- */
  const qb = $('#quickbook');
  if (qb && window.SB) {
    const an = $('#qb-an', qb), ab = $('#qb-ab', qb);
    const lastDay = SB.seasons[SB.seasons.length - 1].to;
    let d = addDays(new Date(), 1);
    for (let i = 0; i < 400 && !seasonOf(iso(d)); i++) d = addDays(d, 1);
    const s = seasonOf(iso(d));
    let dep = addDays(d, 3);
    if (iso(addDays(dep, -1)) > s.to) dep = addDays(parse(s.to), 1);
    an.min = iso(addDays(new Date(), 1)); an.max = lastDay;
    an.value = iso(d); ab.value = iso(dep); ab.min = iso(addDays(d, 1));
    an.addEventListener('change', () => {
      if (!an.value) return;
      const a = parse(an.value);
      ab.min = iso(addDays(a, 1));
      if (!ab.value || ab.value <= an.value) ab.value = iso(addDays(a, 3));
    });
  }

  /* ---------- Abgelaufene Packages & Hinweise ausblenden (Inhalte aus /admin) ---------- */
  const today = iso(new Date());
  $$('[data-bis]').forEach(el => { if (el.dataset.bis < today) el.hidden = true; });
  const pkCards = $$('[data-pkg-karte]');
  if (pkCards.length || $('[data-pkg-fallback]')) {
    const next = pkCards.find(c => c.dataset.bis >= today);
    pkCards.forEach(c => { c.hidden = c !== next; });
    $$('[data-pkg-fallback]').forEach(f => { f.hidden = !!next; });
  }
  const pkLeer = $('[data-pkg-leer]');
  if (pkLeer) pkLeer.hidden = $$('.pk-sec').some(x => !x.hidden);

  /* ---------- „ab“-Preise aus den Daten ---------- */
  if (window.SB) $$('[data-min]').forEach(el => {
    const r = SB.rooms.find(x => x.id === el.dataset.min);
    if (!r) return;
    const all = Object.values(r.price).filter(Boolean).flatMap(o => Object.values(o));
    el.textContent = '€ ' + Math.min(...all);
  });

  /* ---------- Unternavigation (Unterseiten) ---------- */
  const sub = $$('.subnav a[href^="#"]');
  if (sub.length && 'IntersectionObserver' in window) {
    const map = new Map(sub.map(a => [a.getAttribute('href').slice(1), a]));
    const so = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { sub.forEach(a => a.classList.remove('is-active')); const a = map.get(e.target.id); if (a) { a.classList.add('is-active'); a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } }
    }), { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((a, id) => { const t = document.getElementById(id); if (t) so.observe(t); });
  }

  /* ---------- Kontaktformular ---------- */
  const cf = $('#contactForm');
  if (cf) {
    const showSent = () => { cf.outerHTML = `<div class="sent kontakt__b"><h3>${TXT.sentH}</h3><p>${TXT.sentP}</p></div>`; };
    if (new URLSearchParams(location.search).get('gesendet')) showSent();
    else {
      /* Aufruf über „Package anfragen“: Nachricht vorbefüllen */
      const pkg = (new URLSearchParams(location.search).get('package') || '').slice(0, 120);
      const msg = $('textarea[name="nachricht"]', cf);
      if (pkg && msg && !msg.value) msg.value = TXT.pkg.replace('%s', pkg);
      $$('input,textarea', cf).forEach(i => i.addEventListener('input', () => { const f = i.closest('.field,.check'); if (f) f.classList.remove('is-bad'); }));
      cf.addEventListener('submit', async e => {
        e.preventDefault();
        let ok = true;
        $$('.field [required]', cf).forEach(i => {
          const bad = !i.value.trim() || (i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.value.trim()));
          i.closest('.field').classList.toggle('is-bad', bad); if (bad) ok = false;
        });
        const ds = $('[name="datenschutz"]', cf); ds.closest('.check').classList.toggle('is-bad', !ds.checked); if (!ds.checked) ok = false;
        if (!ok) { $('#contactMsg').textContent = TXT.err; return; }
        try { await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(cf)).toString() }); } catch (err) {}
        showSent();
      });
    }
  }

  /* ---------- Bewertungen: Laufband von rechts nach links ---------- */
  const rw = $('.reviews__wrap');
  if (rw) {
    const track = $('.reviews__track', rw), cards = $$('.rvw', track);
    const mark = () => {
      const r = rw.getBoundingClientRect(), mid = r.left + r.width / 2;
      let best = null, bd = 1e9;
      cards.forEach(c => { const b = c.getBoundingClientRect(); const d = Math.abs(b.left + b.width / 2 - mid); if (d < bd) { bd = d; best = c; } });
      cards.forEach(c => c.classList.toggle('is-focus', c === best));
    };
    if (reduce) mark();
    else {
      let x = 0, last = performance.now(), paused = false, visible = true;
      const speed = 32; // Pixel pro Sekunde
      const half = () => track.scrollWidth / 2;
      rw.addEventListener('mouseenter', () => { paused = true; });
      rw.addEventListener('mouseleave', () => { paused = false; });
      rw.addEventListener('focusin', () => { paused = true; });
      rw.addEventListener('focusout', () => { paused = false; });
      if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(rw);
      const step = t => {
        const dt = Math.min(64, t - last); last = t;
        if (!paused && visible && !document.hidden) {
          x -= speed * dt / 1000;
          if (-x >= half()) x += half();
          track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
          mark();
        }
        requestAnimationFrame(step);
      };
      mark(); requestAnimationFrame(step);
    }
  }

  /* ---------- Galerie-Filter ---------- */
  $$('.gfilter').forEach(g => {
    const btns = $$('button', g), figs = $$('.masonry figure');
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      figs.forEach(f => { f.hidden = b.dataset.f !== 'alle' && f.dataset.cat !== b.dataset.f; });
    }));
  });

  /* ---------- Lightbox ---------- */
  /* ---------- Varianten: Fotos aufklappen ---------- */
  $$('.var__tg').forEach(btn => {
    const v = btn.closest('.var'), panel = $('.var__ph', v);
    if (!panel) return;
    panel.inert = true;
    btn.addEventListener('click', () => {
      const open = !v.classList.contains('is-open');
      v.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      panel.inert = !open;
    });
  });
  const hashVar = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (hashVar && hashVar.classList.contains('var')) { const b = $('.var__tg', hashVar); if (b) b.click(); }

  const lbTriggers = $$('[data-lb]');
  if (lbTriggers.length) {
    const lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', TXT.lb);
    const ico = d => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
    lb.innerHTML = `<img alt=""><p class="lb__cap"></p><button type="button" class="lb__x" aria-label="${TXT.x}">${ico('M3 3l10 10M13 3L3 13')}</button><button type="button" class="lb__p" aria-label="${TXT.prev}">${ico('M10 3L5 8l5 5')}</button><button type="button" class="lb__n" aria-label="${TXT.next}">${ico('M6 3l5 5-5 5')}</button>`;
    document.body.appendChild(lb);
    const lbImg = $('img', lb), lbCap = $('.lb__cap', lb);
    let list = [], idx = 0, last = null;
    const show = i => {
      idx = (i + list.length) % list.length;
      const im = $('img', list[idx]);
      lbImg.src = im.dataset.full || im.currentSrc || im.src; lbImg.alt = im.alt; lbCap.textContent = im.alt;
      const multi = list.length > 1; $('.lb__p', lb).hidden = !multi; $('.lb__n', lb).hidden = !multi;
    };
    const close = () => { lb.classList.remove('is-open'); doc.style.overflow = ''; if (last) last.focus(); };
    lbTriggers.forEach(t => t.addEventListener('click', () => {
      const g = t.closest('[data-lb-group]') || document;
      list = $$('[data-lb]', g).filter(x => !x.closest('[hidden],[inert]') && (x.closest('[data-lb-group]') || document) === g);
      last = t; show(list.indexOf(t)); lb.classList.add('is-open'); doc.style.overflow = 'hidden'; $('.lb__x', lb).focus();
    }));
    $('.lb__x', lb).addEventListener('click', close);
    $('.lb__p', lb).addEventListener('click', () => show(idx - 1));
    $('.lb__n', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1);
    });
    let sx = null;
    lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
  }

  /* ---------- Preis-Tabs ---------- */
  $$('.ptabs').forEach(tabs => {
    const btns = $$('button', tabs);
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); document.getElementById(x.getAttribute('aria-controls')).hidden = x !== b; });
    }));
  });
})();
