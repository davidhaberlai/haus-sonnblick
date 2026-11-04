(() => {
  'use strict';
  const form = document.getElementById('vForm');
  if (!form) return;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const LANG = (document.documentElement.lang || 'de').slice(0, 2);
  const TX = {
    de: { kind: 'Gutschein', forP: n => `für ${n}`, forDef: 'für Sie', from: n => `von ${n}`, fromDef: 'Bad Kleinkirchheim', msgDef: 'Eine kleine Auszeit auf der Sonnenseite der Nockberge.', err: 'Bitte prüfen Sie die markierten Felder.', sending: 'Wird gesendet …' },
    en: { kind: 'Gift voucher', forP: n => `for ${n}`, forDef: 'for you', from: n => `from ${n}`, fromDef: 'Bad Kleinkirchheim', msgDef: 'A little break on the sunny side of the Nock Mountains.', err: 'Please check the highlighted fields.', sending: 'Sending …' },
    it: { kind: 'Buono regalo', forP: n => `per ${n}`, forDef: 'per te', from: n => `da ${n}`, fromDef: 'Bad Kleinkirchheim', msgDef: 'Una piccola pausa sul versante soleggiato dei Monti Nock.', err: 'Controllate i campi evidenziati.', sending: 'Invio in corso …' }
  };
  const T = TX[LANG] || TX.de;
  const eur = v => '€ ' + Number(v).toLocaleString('de-DE');
  const card = $('#voucher'), vVal = $('#vVal'), vFor = $('#vFor'), vMsg = $('#vMsg'), vFrom = $('#vFrom'), vKind = $('#vKind'), total = $('#vTotal');
  const own = $('#v-own'), ownWrap = $('#ownWrap');

  const amount = () => {
    const sel = $('input[name="betrag"]:checked', form).value;
    if (sel !== 'eigen') return +sel;
    const v = Math.round(+own.value);
    return v >= 20 && v <= 2000 ? v : null;
  };
  let lastVal = null;
  const render = () => {
    const sel = $('input[name="betrag"]:checked', form).value;
    ownWrap.classList.toggle('is-on', sel === 'eigen');
    const a = amount();
    const txt = a ? eur(a) : '€ –';
    if (txt !== lastVal) { vVal.textContent = txt; card.classList.remove('is-bump'); void card.offsetWidth; card.classList.add('is-bump'); lastVal = txt; }
    total.textContent = txt;
    const f = $('#v-for').value.trim(), fr = $('#v-from').value.trim(), m = $('#v-msg').value.trim();
    vFor.textContent = f ? T.forP(f) : T.forDef;
    vFrom.textContent = fr ? T.from(fr) : T.fromDef;
    vMsg.textContent = m || T.msgDef;
    $('#vCount').textContent = $('#v-msg').value.length;
    const k = $('input[name="einloesbar"]:checked', form);
    vKind.innerHTML = `${T.kind}<br>${k.dataset.kind}`;
  };
  form.addEventListener('input', render);
  form.addEventListener('change', e => {
    render();
    if (e.target.name === 'betrag' && e.target.value === 'eigen') own.focus();
  });
  $$('input,textarea', form).forEach(i => i.addEventListener('input', () => { const f = i.closest('.field,.check'); if (f) f.classList.remove('is-bad'); }));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true;
    $$('.field [required]', form).forEach(i => {
      const bad = !i.value.trim() || (i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.value.trim()));
      i.closest('.field').classList.toggle('is-bad', bad); if (bad) ok = false;
    });
    const a = amount();
    ownWrap.classList.toggle('is-bad', !a); if (!a) ok = false;
    const ds = $('#v-ds'); $('#vdsWrap').classList.toggle('is-bad', !ds.checked); if (!ds.checked) ok = false;
    if (!ok) { $('#vMsgErr').textContent = T.err; const b = $('.is-bad', form); if (b) b.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    $('#vMsgErr').textContent = '';
    const ref = 'SB-G-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    $('#vRef').value = ref; $('#vWert').value = eur(a);
    const btn = $('#vSubmit'); btn.disabled = true; btn.textContent = T.sending;
    try { await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() }); } catch (err) { /* Entwurf ohne Server */ }
    form.hidden = true; $('#vDoneRef').textContent = ref; $('#vDone').hidden = false;
    const top = $('#gestalten').getBoundingClientRect().top + scrollY - 110;
    scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  render();
})();
