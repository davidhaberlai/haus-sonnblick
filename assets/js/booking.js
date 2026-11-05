(() => {
  'use strict';
  if (!window.SB || !window.SBU) return;
  const { iso, parse, addDays, seasonOf } = SBU;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Sprache ---------- */
  const LANG = (document.documentElement.lang || 'de').slice(0, 2);
  const BASE = document.documentElement.dataset.base || '';
  const LOC = { de: 'de-AT', en: 'en-GB', it: 'it-IT' }[LANG] || 'de-AT';
  const TX = {
    de: {
      dows: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], closed: 'geschlossen',
      night: 'Nacht', nights: 'Nächte', pickArr: 'Anreisetag wählen', arr: 'Anreise', pickDep: 'Jetzt Abreisetag wählen',
      kidAge: 'Alter Kind', notFor: n => `für ${n} Erwachsene nicht geeignet`, max: n => `maximal ${n} ${n === 1 ? 'Person' : 'Personen'}`,
      to: 'bis', bfIncl: 'Frühstück ist immer inklusive.', na: 'nicht verfügbar', forPeriod: 'für diesen Zeitraum', onReq: 'auf Anfrage',
      total: 'gesamt', approx: 'ca.', perNight: 'pro Nacht',
      hp: v => `Abendessen im Restaurant gellius inklusive · ${v} pro Person ab 14 Jahren und Tag`,
      adult1: '1 Erwachsene/r', adults: n => `${n} Erwachsene`, kid: 'Kind', kids: 'Kinder',
      empty: 'Wählen Sie Ihre Reisedaten, um Zimmer und Preise zu sehen.',
      dep: 'Abreise', nightsL: 'Nächte', guests: 'Gäste', room: 'Zimmer', price: 'Preis',
      famHint: 'Für das Familienappartement liegt für diesen Zeitraum noch kein Preis vor. Wir melden uns mit einem persönlichen Angebot.',
      roomLine: n => `Zimmer, ${n}`, single: 'Einzelnutzung +30 %', short: 'Kurzaufenthalt +10 %', kidBed: 'Kind im Zusatzbett', kidsBed: 'Kinder im Zusatzbett',
      hpL: 'Halbpension', tax: 'Nächtigungsabgabe', sum: 'Gesamt', sumHint: 'inkl. Frühstück und MwSt. Unverbindliche Anfrage – wir bestätigen die Verfügbarkeit persönlich. Bezahlung im Haus.',
      pkgLine: (n, k) => `${n}: ${k === 1 ? '1 Nacht' : k + ' Nächte'} geschenkt`,
      pkgTip: (p, a, b) => p.free ? `Tipp: Mit Anreise am ${a} und Abreise am ${b} bleiben Sie ${p.nights} Nächte und bezahlen nur ${p.nights - p.free}.` : `Tipp: ${pkgName(p)} – Anreise am ${a}, Abreise am ${b}.`,
      errDep: 'Bitte wählen Sie noch Ihren Abreisetag.', errBoth: 'Bitte wählen Sie Ihren Anreise- und Abreisetag im Kalender.', errRoom: 'Bitte wählen Sie ein Zimmer.',
      errFields: 'Bitte prüfen Sie die markierten Felder.', ageL: 'Alter', yes: 'ja', no: 'nein', sending: 'Wird gesendet …',
      maxKid: 'Zustellbett nur für 1 Kind', noKids: 'kein Zustellbett möglich', show: 'Zimmer ansehen', hide: 'Fotos ausblenden', toPage: 'Zur Zimmerseite', photos: 'Fotos'
    },
    en: {
      dows: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], closed: 'closed',
      night: 'night', nights: 'nights', pickArr: 'Choose your arrival date', arr: 'Arrival', pickDep: 'Now choose your departure date',
      kidAge: 'Age of child', notFor: n => `not suitable for ${n} adults`, max: n => `maximum ${n} ${n === 1 ? 'person' : 'people'}`,
      to: 'to', bfIncl: 'Breakfast is always included.', na: 'not available', forPeriod: 'for these dates', onReq: 'on request',
      total: 'total', approx: 'approx.', perNight: 'per night',
      hp: v => `Dinner at Restaurant gellius included · ${v} per person aged 14+ per day`,
      adult1: '1 adult', adults: n => `${n} adults`, kid: 'child', kids: 'children',
      empty: 'Choose your travel dates to see rooms and prices.',
      dep: 'Departure', nightsL: 'Nights', guests: 'Guests', room: 'Room', price: 'Price',
      famHint: 'There is no price for the family apartment for these dates yet. We will get back to you with a personal offer.',
      roomLine: n => `Room, ${n}`, single: 'Single use +30 %', short: 'Short stay +10 %', kidBed: 'Child in extra bed', kidsBed: 'Children in extra bed',
      hpL: 'Half board', tax: 'Local tourist tax', sum: 'Total', sumHint: 'Incl. breakfast and VAT. Non-binding request – we will confirm availability personally. Payment at the hotel.',
      pkgLine: (n, k) => `${n}: ${k === 1 ? '1 night' : k + ' nights'} free`,
      pkgTip: (p, a, b) => p.free ? `Tip: arrive on ${a} and leave on ${b} – stay ${p.nights} nights and pay for only ${p.nights - p.free}.` : `Tip: ${pkgName(p)} – arrival on ${a}, departure on ${b}.`,
      errDep: 'Please choose your departure date.', errBoth: 'Please choose your arrival and departure dates in the calendar.', errRoom: 'Please choose a room.',
      errFields: 'Please check the highlighted fields.', ageL: 'age', yes: 'yes', no: 'no', sending: 'Sending …',
      maxKid: 'extra bed for 1 child only', noKids: 'no extra bed available', show: 'View room', hide: 'Hide photos', toPage: 'Room details', photos: 'Photos'
    },
    it: {
      dows: ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'], closed: 'chiuso',
      night: 'notte', nights: 'notti', pickArr: 'Scegli il giorno di arrivo', arr: 'Arrivo', pickDep: 'Ora scegli il giorno di partenza',
      kidAge: 'Età bambino', notFor: n => `non adatta a ${n} adulti`, max: n => `massimo ${n} ${n === 1 ? 'persona' : 'persone'}`,
      to: 'al', bfIncl: 'La colazione è sempre inclusa.', na: 'non disponibile', forPeriod: 'per queste date', onReq: 'su richiesta',
      total: 'totale', approx: 'ca.', perNight: 'a notte',
      hp: v => `Cena al Ristorante gellius inclusa · ${v} a persona dai 14 anni al giorno`,
      adult1: '1 adulto', adults: n => `${n} adulti`, kid: 'bambino', kids: 'bambini',
      empty: 'Scegli le date del viaggio per vedere camere e prezzi.',
      dep: 'Partenza', nightsL: 'Notti', guests: 'Ospiti', room: 'Camera', price: 'Prezzo',
      famHint: 'Per l’appartamento famiglia non è ancora disponibile un prezzo per queste date. Vi invieremo un’offerta personale.',
      roomLine: n => `Camera, ${n}`, single: 'Uso singola +30 %', short: 'Soggiorno breve +10 %', kidBed: 'Bambino in letto aggiuntivo', kidsBed: 'Bambini in letto aggiuntivo',
      hpL: 'Mezza pensione', tax: 'Imposta di soggiorno', sum: 'Totale', sumHint: 'Colazione e IVA incluse. Richiesta senza impegno – confermiamo personalmente la disponibilità. Pagamento in hotel.',
      pkgLine: (n, k) => `${n}: ${k === 1 ? '1 notte' : k + ' notti'} in omaggio`,
      pkgTip: (p, a, b) => p.free ? `Consiglio: arrivando il ${a} e partendo il ${b} restate ${p.nights} notti e ne pagate solo ${p.nights - p.free}.` : `Consiglio: ${pkgName(p)} – arrivo il ${a}, partenza il ${b}.`,
      errDep: 'Scegliete ancora il giorno di partenza.', errBoth: 'Scegliete nel calendario il giorno di arrivo e di partenza.', errRoom: 'Scegliete una camera.',
      errFields: 'Controllate i campi evidenziati.', ageL: 'età', yes: 'sì', no: 'no', sending: 'Invio in corso …',
      maxKid: 'letto aggiuntivo solo per 1 bambino', noKids: 'letto aggiuntivo non disponibile', show: 'Vedi la camera', hide: 'Nascondi foto', toPage: 'Dettagli camera', photos: 'Foto'
    }
  };
  const T = TX[LANG] || TX.de;
  const I = (SB.i18n && SB.i18n[LANG]) || null;
  const roomName = r => (I && I.rooms[r.id] ? I.rooms[r.id].name : r.name);
  const roomMeta = r => (I && I.rooms[r.id] ? I.rooms[r.id].meta : r.meta);
  const perName = n => (I && I.periods[n]) || n;
  const kidAges = (I && I.kidAges) || SB.kidAges;
  const altOf = a => (I && I.alt[a]) || a;
  const src = s => (/^(https?:|\/)/.test(s) ? s : BASE + s);
  const nn = n => `${n} ${n === 1 ? T.night : T.nights}`;

  const fmtLong = new Intl.DateTimeFormat(LOC, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const fmtShort = new Intl.DateTimeFormat(LOC, { day: 'numeric', month: 'short' });
  const fmtMonth = new Intl.DateTimeFormat(LOC, { month: 'long', year: 'numeric' });
  const eur = v => '€ ' + v.toLocaleString('de-DE', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const eur2 = v => '€ ' + v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstDay = iso(today);
  const lastNight = SB.seasons[SB.seasons.length - 1].to;

  /* ---------- Zustand ---------- */
  const st = { start: null, end: null, ad: 2, kids: [], room: null, hp: false, step: 1, view: null, open: null };

  const isOpenNight = s => s >= firstDay && !!seasonOf(s);
  const periodOf = s => {
    const se = seasonOf(s); if (!se) return null;
    const p = se.periods.find(p => p.ranges.some(r => s >= r[0] && s <= r[1]));
    return { season: se, id: p ? p.id : 'base', name: p ? p.name : se.base };
  };
  const nightsOf = (a, b) => { const out = []; for (let d = parse(a); iso(d) < b; d = addDays(d, 1)) out.push(iso(d)); return out; };
  const rangeOpen = (a, b) => nightsOf(a, b).every(isOpenNight);
  const persons = () => st.ad + st.kids.length;

  /* Package: Adventliche Auszeit (genau 18.–23.12.) */
  const pkgFor = (a, b) => (SB.packages || []).find(p => a === p.from && b === p.to) || null;
  const pkgNear = (a, b) => (SB.packages || []).find(p => !(a === p.from && b === p.to) && a < p.to && b > p.from) || null;
  const pkgName = p => (I && I.packages && I.packages[p.id]) || p.name;
  const pkgNote = p => (I && I.packageText && I.packageText[p.id] ? I.packageText[p.id].note : p.note) || '';
  const pkgBadge = p => (p.badge ? p.badge + ' · ' : '') + pkgName(p);
  const fmtDM = new Intl.DateTimeFormat(LOC, { day: 'numeric', month: 'long' });

  /* ---------- URL-Parameter ---------- */
  const q = new URLSearchParams(location.search);
  if (q.get('g')) {
    const [a, k] = q.get('g').split('-').map(Number);
    if (a >= 1 && a <= 4) st.ad = a;
    if (k >= 0 && k <= 2) st.kids = Array(k).fill(1);
  }
  if (q.get('zimmer') && SB.rooms.some(r => r.id === q.get('zimmer'))) st.room = q.get('zimmer');
  const qa = q.get('an'), qb = q.get('ab');
  if (qa && qb && /^\d{4}-\d{2}-\d{2}$/.test(qa) && /^\d{4}-\d{2}-\d{2}$/.test(qb) && qb > qa && isOpenNight(qa) && rangeOpen(qa, qb)) { st.start = qa; st.end = qb; }

  /* ---------- Kalender ---------- */
  const months = $('#calMonths'), rangeEl = $('#calRange');
  const firstOpen = () => { let d = new Date(today); for (let i = 0; i < 500 && !isOpenNight(iso(d)); i++) d = addDays(d, 1); return d; };
  const startView = st.start ? parse(st.start) : firstOpen();
  st.view = new Date(startView.getFullYear(), startView.getMonth(), 1);
  const minView = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxView = (() => { const d = parse(lastNight); return new Date(d.getFullYear(), d.getMonth(), 1); })();

  const dayEnabled = s => {
    if (st.start && !st.end) {
      if (s > st.start) return rangeOpen(st.start, s);
      return isOpenNight(s);
    }
    return isOpenNight(s);
  };

  function renderMonth(m) {
    const y = m.getFullYear(), mo = m.getMonth();
    const first = new Date(y, mo, 1), days = new Date(y, mo + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    let h = `<div class="cal__m"><div class="cal__title">${fmtMonth.format(first)}</div><div class="cal__grid" role="grid">`;
    T.dows.forEach(d => h += `<div class="cal__dow" aria-hidden="true">${d}</div>`);
    for (let i = 0; i < lead; i++) h += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const s = iso(new Date(y, mo, d));
      const en = dayEnabled(s);
      const cls = ['cal__d'];
      if (!seasonOf(s) || s < firstDay) cls.push('is-closed');
      if (s === firstDay) cls.push('is-today');
      const p = periodOf(s); if (p && p.id !== 'base' && s >= firstDay) cls.push('season-hs');
      if (s === st.start) cls.push('is-start');
      if (s === st.end) cls.push('is-end');
      if (st.start && st.end && s > st.start && s < st.end) cls.push('is-in');
      const label = fmtLong.format(new Date(y, mo, d)) + (p ? ' · ' + perName(p.name) : ' · ' + T.closed);
      h += `<button type="button" class="${cls.join(' ')}" data-d="${s}" ${en ? '' : 'disabled'} aria-label="${label}" aria-pressed="${s === st.start || s === st.end}">${d}</button>`;
    }
    return h + '</div></div>';
  }
  function renderCal() {
    const m2 = new Date(st.view.getFullYear(), st.view.getMonth() + 1, 1);
    months.innerHTML = renderMonth(st.view) + renderMonth(m2);
    $('#calPrev').disabled = st.view <= minView;
    $('#calNext').disabled = st.view >= maxView;
    if (st.start && st.end) {
      const n = nightsOf(st.start, st.end).length;
      rangeEl.innerHTML = `<b>${fmtShort.format(parse(st.start))} – ${fmtShort.format(parse(st.end))}</b><br>${nn(n)}`;
    } else if (st.start) rangeEl.innerHTML = `${T.arr} <b>${fmtShort.format(parse(st.start))}</b><br>${T.pickDep}`;
    else rangeEl.textContent = T.pickArr;
  }
  months.addEventListener('click', e => {
    const b = e.target.closest('.cal__d'); if (!b || b.disabled) return;
    const s = b.dataset.d;
    if (!st.start || st.end || s <= st.start) { st.start = s; st.end = null; }
    else st.end = s;
    $('#msg1').textContent = '';
    renderCal(); renderSum();
    const again = months.querySelector(`[data-d="${s}"]`); if (again) again.focus();
  });
  $('#calPrev').addEventListener('click', () => { st.view = new Date(st.view.getFullYear(), st.view.getMonth() - 1, 1); renderCal(); });
  $('#calNext').addEventListener('click', () => { st.view = new Date(st.view.getFullYear(), st.view.getMonth() + 1, 1); renderCal(); });

  /* ---------- Gäste ---------- */
  const kidWrap = $('#kidAges');
  function renderGuests() {
    $('#gAd').textContent = st.ad; $('#gKi').textContent = st.kids.length;
    $$('[data-g]').forEach(b => {
      const g = b.dataset.g, d = +b.dataset.d;
      if (g === 'ad') b.disabled = d < 0 ? st.ad <= 1 : st.ad >= 4;
      else b.disabled = d < 0 ? st.kids.length <= 0 : st.kids.length >= 2;
    });
    kidWrap.innerHTML = st.kids.map((a, i) => `<div class="field"><label for="kid${i}">${T.kidAge} ${i + 1}</label><select id="kid${i}" data-kid="${i}">${kidAges.map((t, j) => `<option value="${j}" ${a === j ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`).join('');
  }
  $$('[data-g]').forEach(b => b.addEventListener('click', () => {
    const d = +b.dataset.d;
    if (b.dataset.g === 'ad') st.ad = Math.min(4, Math.max(1, st.ad + d));
    else { if (d > 0 && st.kids.length < 2) st.kids.push(1); if (d < 0) st.kids.pop(); }
    renderGuests(); renderSum(); if (st.step === 2) renderOpts();
  }));
  kidWrap.addEventListener('change', e => { const s = e.target.closest('[data-kid]'); if (s) { st.kids[+s.dataset.kid] = +s.value; renderSum(); } });

  /* ---------- Preisberechnung ---------- */
  function fits(r) {
    if (st.ad > r.maxAdults) return T.notFor(st.ad);
    if (persons() > r.maxTotal) return T.max(r.maxTotal);
    if (r.maxKids != null && st.kids.length > r.maxKids) return r.maxKids ? T.maxKid : T.noKids;
    return '';
  }
  function quote(r) {
    if (!st.start || !st.end) return null;
    const nights = nightsOf(st.start, st.end);
    let room = 0, kids = 0, hp = 0, tax = 0, onRequest = false;
    const single = st.ad === 1 && st.kids.length === 0 && r.maxAdults > 1;
    nights.forEach(n => {
      const p = periodOf(n), se = p.season, pr = r.price[se.id];
      if (!pr) { onRequest = true; return; }
      room += pr[p.id] * st.ad;
      st.kids.forEach(a => { kids += se.kids[a]; });
      if (st.hp) hp += se.hp * st.ad;
      tax += se.tax * persons();
    });
    if (onRequest) return { onRequest: true, nights: nights.length };
    const singleAdd = single ? room * SB.singleUse : 0;
    const shortAdd = nights.length <= 2 ? (room + singleAdd) * SB.shortStay : 0;
    const pkg = pkgFor(st.start, st.end);
    const pkgOff = pkg ? (room + singleAdd + kids) / nights.length * pkg.free : 0;
    const total = room + singleAdd + shortAdd + kids - pkgOff + hp + tax;
    return { nights: nights.length, room, singleAdd, shortAdd, kids, pkg, pkgOff, hp, tax, total, perNight: (room + singleAdd + shortAdd + kids - pkgOff) / nights.length };
  }

  /* ---------- Zimmerauswahl ---------- */
  const opts = $('#opts');
  const gallery = r => {
    const im = r.img || [];
    if (!im.length) return '';
    return `<div class="opt__more" id="more-${r.id}" ${st.open === r.id ? '' : 'hidden'}><div class="opt__gal opt__gal--${Math.min(im.length, 3)}">${im.slice(0, 3).map((x, i) => `<div class="opt__ph${i === 0 ? ' opt__ph--main' : ''}"><img src="${src(x.src)}" alt="${altOf(x.alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>`).join('')}</div><a class="link opt__page" href="${r.page}" target="_blank" rel="noopener">${T.toPage} <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3L4 12" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></a></div>`;
  };
  function renderOpts() {
    const n = nightsOf(st.start, st.end).length;
    $('#s2lead').textContent = `${fmtLong.format(parse(st.start))} ${T.to} ${fmtLong.format(parse(st.end))} · ${nn(n)} · ${guestText()}. ${T.bfIncl}`;
    const pk = pkgFor(st.start, st.end), near = pkgNear(st.start, st.end);
    $('#pkgNote').innerHTML = pk ? `<b>${pkgName(pk)}</b> ${pkgNote(pk)}` : near ? T.pkgTip(near, fmtDM.format(parse(near.from)), fmtDM.format(parse(near.to))) : '';
    $('#pkgNote').hidden = !(pk || near);
    if (st.room) { const r = SB.rooms.find(x => x.id === st.room); if (fits(r)) st.room = null; }
    opts.innerHTML = [...SB.rooms].sort((a, b) => (fits(a) ? 1 : 0) - (fits(b) ? 1 : 0)).map(r => {
      const why = fits(r), qq = quote(r), sel = st.room === r.id, open = st.open === r.id;
      const price = why ? `<small>${T.na}</small>` :
        qq.onRequest ? `<small>${T.forPeriod}</small><b>${T.onReq}</b>` :
        `<small>${nn(n)}, ${T.total}</small>${qq.pkg ? `<s>${eur(Math.round(qq.room + qq.singleAdd + qq.shortAdd + qq.kids))}</s>` : ''}<b>${eur(Math.round(qq.room + qq.singleAdd + qq.shortAdd + qq.kids - qq.pkgOff))}</b><small>${T.approx} ${eur(Math.round(qq.perNight))} ${T.perNight}</small>`;
      return `<div class="optw${sel ? ' is-sel' : ''}${why ? ' is-na' : ''}"><label class="opt${sel ? ' is-sel' : ''}${why ? ' is-na' : ''}">
        <input type="radio" name="room" value="${r.id}" ${sel ? 'checked' : ''} ${why ? 'disabled' : ''}>
        <div><h3>${roomName(r)}</h3><div class="opt__meta">${roomMeta(r)}</div>${why ? `<div class="opt__why">${why}</div>` : ''}${qq && qq.pkg && !why ? `<span class="opt__pkg">${pkgBadge(qq.pkg)}</span>` : ''}</div>
        <div class="opt__pr">${price}</div></label>
        ${(r.img || []).length ? `<button type="button" class="opt__tog" data-tog="${r.id}" aria-expanded="${open}" aria-controls="more-${r.id}"><span>${open ? T.hide : T.show}</span><svg viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>` : ''}
        ${gallery(r)}</div>`;
    }).join('');
    const se = seasonOf(st.start);
    $('#hpInfo').textContent = T.hp(eur(se.hp));
    $('#hp').checked = st.hp;
  }
  opts.addEventListener('change', e => {
    if (e.target.name === 'room') {
      st.room = e.target.value; $('#msg2').textContent = '';
      $$('.optw', opts).forEach(o => { const on = o.querySelector('input').checked; o.classList.toggle('is-sel', on); o.querySelector('.opt').classList.toggle('is-sel', on); });
      renderSum();
    }
  });
  opts.addEventListener('click', e => {
    const b = e.target.closest('[data-tog]'); if (!b) return;
    const id = b.dataset.tog, panel = $('#more-' + id), on = panel.hidden;
    $$('.opt__more', opts).forEach(p => { if (p !== panel && !p.hidden) { p.hidden = true; const tb = opts.querySelector(`[data-tog="${p.id.slice(5)}"]`); tb.setAttribute('aria-expanded', 'false'); tb.querySelector('span').textContent = T.show; } });
    panel.hidden = !on; st.open = on ? id : null;
    b.setAttribute('aria-expanded', on ? 'true' : 'false'); b.querySelector('span').textContent = on ? T.hide : T.show;
    if (on) requestAnimationFrame(() => panel.classList.add('is-open')); else panel.classList.remove('is-open');
  });
  $('#hp').addEventListener('change', e => { st.hp = e.target.checked; renderOpts(); renderSum(); });

  /* ---------- Zusammenfassung ---------- */
  const guestText = () => {
    const a = st.ad === 1 ? T.adult1 : T.adults(st.ad);
    return st.kids.length ? `${a}, ${st.kids.length} ${st.kids.length === 1 ? T.kid : T.kids}` : a;
  };
  function renderSum() {
    const body = $('#sumBody');
    if (!st.start) { body.innerHTML = `<p class="sum__empty">${T.empty}</p>`; return; }
    const r = st.room ? SB.rooms.find(x => x.id === st.room) : null;
    const n = st.end ? nightsOf(st.start, st.end).length : 0;
    let h = `<dl><dt>${T.arr}</dt><dd>${fmtLong.format(parse(st.start))}</dd><dt>${T.dep}</dt><dd>${st.end ? fmtLong.format(parse(st.end)) : '–'}</dd>`;
    if (n) h += `<dt>${T.nightsL}</dt><dd>${n}</dd>`;
    h += `<dt>${T.guests}</dt><dd>${guestText()}</dd>`;
    if (r) h += `<dt>${T.room}</dt><dd>${roomName(r)}</dd>`;
    h += '</dl>';
    if (r && st.end) {
      const qq = quote(r);
      if (qq.onRequest) {
        h += `<div class="sum__total"><span>${T.price}</span><b style="font-size:1.4rem">${T.onReq}</b></div><p class="sum__hint">${T.famHint}</p>`;
      } else {
        const L = [[T.roomLine(nn(n)), qq.room]];
        if (qq.singleAdd) L.push([T.single, qq.singleAdd]);
        if (qq.shortAdd) L.push([T.short, qq.shortAdd]);
        if (qq.kids) L.push([st.kids.length === 1 ? T.kidBed : T.kidsBed, qq.kids]);
        if (qq.pkgOff) L.push([T.pkgLine(pkgName(qq.pkg), qq.pkg.free), -qq.pkgOff]);
        if (qq.hp) L.push([T.hpL, qq.hp]);
        L.push([T.tax, qq.tax]);
        h += '<ul class="sum__lines">' + L.map(([t, v]) => `<li${v < 0 ? ' class="is-off"' : ''}><span>${t}</span><span>${v < 0 ? '− ' + eur2(-v) : eur2(v)}</span></li>`).join('') + '</ul>';
        h += `<div class="sum__total"><span>${T.sum}</span><b>${eur2(qq.total)}</b></div><p class="sum__hint">${T.sumHint}</p>`;
      }
    }
    body.innerHTML = h;
  }

  /* ---------- Schritte ---------- */
  function go(step) {
    st.step = step;
    $$('.bstep').forEach(s => s.hidden = +s.dataset.step !== step);
    $$('#steps li').forEach(li => {
      const n = +li.dataset.step;
      li.classList.toggle('is-active', n === step);
      li.classList.toggle('is-done', n < step);
    });
    if (step === 4) $('#steps').hidden = true;
    const top = $('#booking').getBoundingClientRect().top + scrollY - 110;
    if (scrollY > top) scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  $('#to2').addEventListener('click', () => {
    if (!st.start || !st.end) { $('#msg1').textContent = st.start ? T.errDep : T.errBoth; return; }
    renderOpts(); go(2);
  });
  $('#to3').addEventListener('click', () => {
    if (!st.room) { $('#msg2').textContent = T.errRoom; return; }
    go(3); setTimeout(() => $('#b-vn').focus({ preventScroll: true }), 400);
  });
  $$('[data-back]').forEach(b => b.addEventListener('click', () => { const s = +b.dataset.back; if (s === 1) renderCal(); if (s === 2) renderOpts(); go(s); }));

  /* ---------- Absenden ---------- */
  const form = $('#bookForm');
  const validate = () => {
    let ok = true;
    $$('.field input[required]', form).forEach(i => {
      const bad = !i.value.trim() || (i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.value.trim()));
      i.closest('.field').classList.toggle('is-bad', bad); if (bad) ok = false;
    });
    [['#b-agb', '#agbWrap'], ['#b-ds', '#dsWrap']].forEach(([c, w]) => { const bad = !$(c).checked; $(w).classList.toggle('is-bad', bad); if (bad) ok = false; });
    return ok;
  };
  $$('input,select,textarea', form).forEach(i => i.addEventListener('input', () => { const f = i.closest('.field,.check'); if (f) f.classList.remove('is-bad'); }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate()) { $('#msg3').textContent = T.errFields; const b = $('.is-bad', form); if (b) b.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    $('#msg3').textContent = '';
    const r = SB.rooms.find(x => x.id === st.room), qq = quote(r);
    const ref = 'SB-' + st.start.slice(2, 4) + st.start.slice(5, 7) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    $('#fRef').value = ref;
    $('#fAn').value = fmtLong.format(parse(st.start));
    $('#fAb').value = fmtLong.format(parse(st.end));
    $('#fZi').value = roomName(r) + (qq.pkg ? ' · ' + pkgName(qq.pkg) : '');
    $('#fGa').value = guestText() + (st.kids.length ? ' (' + T.ageL + ': ' + st.kids.map(a => kidAges[a]).join(', ') + ')' : '');
    $('#fHp').value = st.hp ? T.yes : T.no;
    $('#fTo').value = qq.onRequest ? T.onReq : eur2(qq.total);
    $('#fDe').value = $('#sumBody').innerText.replace(/\n+/g, ' | ');
    const btn = $('#submitBtn'); btn.disabled = true; btn.textContent = T.sending;
    try {
      await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() });
    } catch (err) { /* Entwurfsansicht ohne Server: Bestätigung trotzdem zeigen */ }
    const an = $('#b-anrede').value, nm = $('#b-nn').value.trim();
    $('#doneName').textContent = an && an !== 'Divers' && an !== 'Other' && an !== 'Altro' ? `${$('#b-anrede').selectedOptions[0].text} ${nm}` : $('#b-vn').value.trim() + ' ' + nm;
    $('#doneRef').textContent = ref;
    go(4);
  });

  /* ---------- Start ---------- */
  renderCal(); renderGuests(); renderSum();
  if (st.start && st.end) { renderOpts(); go(2); window.scrollTo(0, 0); }
})();
