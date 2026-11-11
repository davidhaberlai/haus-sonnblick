/* Haus Sonnblick – Inhalte aus der Verwaltung (/admin) in die Seiten schreiben
   Karibu Studio · Läuft bei Netlify bei jedem Speichern im Admin-Bereich
   (Build command: node _cms/build.mjs). Keine Abhängigkeiten, nur Node.

   Liest   _data/preise.json, _data/packages.json, _data/galerie.json, _data/hinweis.json,
           _data/zimmer/*.json (Zimmerfotos), _data/saison/*.json (Sommer & Winter),
           _data/aktionswochen.json, _data/entfernungen.json und _cms/basis.json (feste Zimmerdaten, Übersetzungen)
   Schreibt assets/js/data.js (Buchungsrechner) und die Bereiche zwischen
           <!-- cms:NAME --> … <!-- /cms:NAME --> in den HTML-Seiten (DE/EN/IT).

   Findet das Skript einen Fehler in den Daten, bricht es mit einer Meldung ab.
   Netlify veröffentlicht dann nichts Neues – die Website bleibt unverändert online. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['de', 'en', 'it'];
const DIR = { de: '', en: 'en/', it: 'it/' };
const PRE = { de: '', en: '../', it: '../' };
const ROOMS = ['ez', 'dz', 'dzs', 'tw', 'wsz', 'wszs', 'suite', 'fam'];
const AB_GROUPS = { ez: ['ez'], doppel: ['dz', 'dzs', 'tw'], wsz: ['wsz', 'wszs'], suite: ['suite'], fam: ['fam'] };

const fehler = [];
const json = f => {
  const p = path.join(ROOT, f);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { throw new Error(`Datei ${f} kann nicht gelesen werden: ${e.message}`); }
};

const basis = json('_cms/basis.json');
const preise = json('_data/preise.json');
const packages = json('_data/packages.json');
const galerie = json('_data/galerie.json');
const hinweis = json('_data/hinweis.json');
/* Zimmerfotos – eine Datei je Zimmerseite (erstes Foto = großes Bild, Zimmerübersicht, Anfrage) */
const ZSEITEN = {
  einzelzimmer: { rooms: ['ez'], name: 'Einzelzimmer' },
  doppelzimmer: { var: ['dz', 'dzs', 'tw'], name: 'Doppel- & Zweibettzimmer' },
  'wohn-schlafzimmer': { var: ['wsz', 'wszs'], name: 'Wohn-Schlafzimmer' },
  'sonnblick-suite': { rooms: ['suite'], name: 'Sonnensuite' },
  familiensuite: { rooms: ['fam'], name: 'Familienappartement' }
};
const zimmer = Object.fromEntries(Object.keys(ZSEITEN).map(k => [k, json(`_data/zimmer/${k}.json`)]));
/* Sommer & Winter (Abschnitte, Kennzahlen, Bild oben, Karte auf der Startseite),
   Aktionswochen der Bergbahnen, Entfernungen – seit V4.14 */
const SAISONEN_SEITEN = { sommer: 'Sommer', winter: 'Winter' };
const saisonSeite = Object.fromEntries(Object.keys(SAISONEN_SEITEN).map(k => [k, json(`_data/saison/${k}.json`)]));
const aktionswochen = json('_data/aktionswochen.json');
const entfernungen = json('_data/entfernungen.json');

/* ------------------------------------------------------------ Helfer */
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isoOk = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const num = v => (v === '' || v == null ? NaN : Number(String(v).replace(',', '.')));
/* [Text](adresse) → Link; alles andere wird maskiert */
const inline = s => esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
  const ext = /^https?:/i.test(u);
  return `<a href="${u.replace(/"/g, '')}"${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
});
const absaetze = (s, cls) => String(s || '').trim().split(/\n\s*\n/).filter(Boolean)
  .map(a => `<p${cls ? ` class="${cls}"` : ''}>${inline(a.trim()).replace(/\n/g, '<br>')}</p>`).join('');
/* letztes Wort kursiv – wie im Design der Überschriften („Adventliche <em>Auszeit</em>.“) */
const emLast = (s, punkt) => {
  const t = String(s || '').trim().replace(/[.!]$/, '');
  const i = t.lastIndexOf(' ');
  const h = i < 0 ? `<em>${esc(t)}</em>` : `${esc(t.slice(0, i))} <em>${esc(t.slice(i + 1))}</em>`;
  return punkt ? h + '.' : h;
};
const nb = s => esc(s).replace(/ /g, '&nbsp;');
const heute = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(new Date());
const sName = (o, base, l) => (l !== 'de' && ((o[l] && o[l][base]) || o[`${base}_${l}`])) || o[base];
/* Übersetzung mit Rückfall auf Deutsch – Feld für Feld */
const leer = v => v == null || v === '' || (Array.isArray(v) && !v.filter(x => x && (typeof x === 'string' ? x : x.punkt)).length);
const pick = (o, lang) => {
  const de = (o && o.de) || {};
  if (lang === 'de' || !o || !o[lang]) return { ...de };
  const out = { ...de };
  Object.entries(o[lang]).forEach(([k, v]) => { if (!leer(v)) out[k] = v; });
  return out;
};

const MON = {
  de: ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  it: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
};
const dp = s => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };
const datVoll = (s, l) => { const { y, m, d } = dp(s); return l === 'de' ? `${d}.${m}.${y}` : `${d}/${m}/${y}`; };
const datKurz = (s, l) => { const { m, d } = dp(s); return l === 'de' ? `${d}.${m}.` : `${d}/${m}`; };
const datLang = (s, l) => { const { y, m, d } = dp(s); return l === 'de' ? `${d}. ${MON.de[m - 1]} ${y}` : `${d} ${MON[l][m - 1]} ${y}`; };
/* „18.–23. Dezember 2026“ · „18–23 December 2026“ · „28. Dezember 2026 – 3. Jänner 2027“ */
const spanne = (a, b, l) => {
  const A = dp(a), B = dp(b);
  if (A.y === B.y && A.m === B.m) return l === 'de' ? `${A.d}.–${B.d}. ${MON.de[A.m - 1]} ${A.y}` : `${A.d}–${B.d} ${MON[l][A.m - 1]} ${A.y}`;
  if (A.y === B.y) return l === 'de' ? `${A.d}. ${MON.de[A.m - 1]} – ${B.d}. ${MON.de[B.m - 1]} ${A.y}` : `${A.d} ${MON[l][A.m - 1]} – ${B.d} ${MON[l][B.m - 1]} ${A.y}`;
  return `${datLang(a, l)} – ${datLang(b, l)}`;
};
const eur = (v, l) => {
  const n = Number(v);
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return '€ ' + (l === 'en' ? s : s.replace('.', ','));
};
const pfeil = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';

const T = {
  de: {
    zimmer: 'Zimmer', und: ' und ', tabs: 'Saison wählen', naechte: 'Nächte', zumPkg: 'Zum Package', anfragen: 'Package anfragen', kontakt: 'Kontakt',
    note: (s, g) => `Preise pro Person und Nacht inkl. Frühstücksbuffet und MwSt. Halbpension ${eur(g.hp, 'de')} pro Person und Tag zubuchbar · Nächtigungsabgabe ${eur(s.tax, 'de')} pro Person und Nacht · Kinder im Zusatzbett pro Tag: ${g.kidAges[0]} ${eur(s.kids[0], 'de')}, ${g.kidAges[1]} ${eur(s.kids[1], 'de')}, ${g.kidAges[2]} ${eur(s.kids[2], 'de')} · Aufenthalte von 1–2 Nächten +${g.kurz} % · Zimmer zur Einzelnutzung: Preis für zwei Personen abzüglich ${g.einzel} %.`,
    lupe: 'Bild vergrößern: ', aktuell: 'Aktuell',
    fallback: { tag: 'Angebote', titel: 'Angebote & Packages', text: 'Unsere Packages und die Aktionswochen der Bergbahnen – für einen Urlaub, der sich doppelt lohnt.', link: 'Zu den Angeboten' }
  },
  en: {
    zimmer: 'Room', und: ' and ', tabs: 'Choose season', naechte: 'nights', zumPkg: 'To the package', anfragen: 'Request package', kontakt: 'Contact',
    note: (s, g) => `Prices per person per night incl. breakfast buffet and VAT. Half board ${eur(g.hp, 'en')} per person per day can be added · Local tourist tax ${eur(s.tax, 'en')} per person per night · Children in an extra bed per day: ${g.kidAges[0]} ${eur(s.kids[0], 'en')}, ${g.kidAges[1]} ${eur(s.kids[1], 'en')}, ${g.kidAges[2]} ${eur(s.kids[2], 'en')} · Stays of 1–2 nights +${g.kurz} % · Room for single use: price for two people less ${g.einzel} %.`,
    lupe: 'Enlarge image: ', aktuell: 'News',
    fallback: { tag: 'Offers', titel: 'Offers & packages', text: 'Our packages and the cable cars’ special weeks – for a holiday that pays off twice.', link: 'To the offers' }
  },
  it: {
    zimmer: 'Camera', und: ' e ', tabs: 'Scegli la stagione', naechte: 'notti', zumPkg: 'Al pacchetto', anfragen: 'Richiedi il pacchetto', kontakt: 'Contatti',
    note: (s, g) => `Prezzi a persona a notte, colazione a buffet e IVA incluse. Mezza pensione prenotabile a ${eur(g.hp, 'it')} a persona al giorno · Imposta di soggiorno ${eur(s.tax, 'it')} a persona a notte · Bambini in letto aggiuntivo al giorno: ${g.kidAges[0]} ${eur(s.kids[0], 'it')}, ${g.kidAges[1]} ${eur(s.kids[1], 'it')}, ${g.kidAges[2]} ${eur(s.kids[2], 'it')} · Soggiorni di 1–2 notti +${g.kurz} % · Camera ad uso singola: prezzo per due persone meno il ${g.einzel} %.`,
    lupe: 'Ingrandisci l’immagine: ', aktuell: 'Novità',
    fallback: { tag: 'Offerte', titel: 'Offerte e pacchetti', text: 'I nostri pacchetti e le settimane promozionali degli impianti – per una vacanza che conviene due volte.', link: 'Alle offerte' }
  }
};
const KID_AGES = { de: ['0–2 Jahre', '3–8 Jahre', '9–13 Jahre'], en: ['0–2 years', '3–8 years', '9–13 years'], it: ['0–2 anni', '3–8 anni', '9–13 anni'] };

/* Bildgröße aus JPEG/PNG/WebP lesen (für width/height, damit nichts springt oder verzerrt) */
function bildgroesse(datei) {
  try {
    const b = fs.readFileSync(datei);
    if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const t = b.toString('ascii', 12, 16);
      if (t === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
      if (t === 'VP8L') { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
      if (t === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2, orient = 1, size = null;
      while (i < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1], len = b.readUInt16BE(i + 2);
        if (m === 0xe1 && b.toString('ascii', i + 4, i + 8) === 'Exif') { // Ausrichtung von Handyfotos
          const t = i + 10, le = b.toString('ascii', t, t + 2) === 'II';
          const r16 = o => (le ? b.readUInt16LE(o) : b.readUInt16BE(o)), r32 = o => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
          const ifd = t + r32(t + 4), n = r16(ifd);
          for (let k = 0; k < n; k++) { const e = ifd + 2 + k * 12; if (r16(e) === 0x0112) orient = r16(e + 8); }
        }
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { size = { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }; break; }
        i += 2 + len;
      }
      if (size && orient >= 5) return { w: size.h, h: size.w };
      return size;
    }
  } catch (e) { /* Datei fehlt */ }
  return null;
}

/* Bildquelle für eine Seite. Hochgeladene Bilder laufen über das Netlify Image CDN:
   automatisch verkleinert und komprimiert, auch wenn ein 6-MB-Handyfoto hochgeladen wird. */
function bild(src, lang, breiten = [800, 1400, 2000]) {
  const s = String(src || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return { src: s, ext: true };
  const lokal = s.replace(/^\//, '');
  const g = bildgroesse(path.join(ROOT, lokal));
  if (!g) fehler.push(`Bild nicht gefunden: ${s}`);
  if (lokal.startsWith('assets/img/uploads/')) {
    const cdn = w => `/.netlify/images?url=/${encodeURI(lokal)}&w=${w}&q=80`;
    const ws = breiten.filter(w => !g || w < g.w).concat(g && g.w < breiten[breiten.length - 1] ? [g.w] : []);
    return { src: cdn(ws[Math.min(1, ws.length - 1)] || 1400), srcset: ws.map(w => `${cdn(w)} ${w}w`).join(', '), full: cdn(Math.min(g ? g.w : 2400, 2400)), g };
  }
  return { src: PRE[lang] + lokal, g };
}
const imgTag = (b, alt, extra = '', sizes = '') => {
  if (!b) return '';
  const wh = b.g ? ` width="${b.g.w}" height="${b.g.h}"` : (b.w ? ` width="${b.w}" height="${b.h}"` : '');
  const ss = b.srcset ? ` srcset="${esc(b.srcset)}"${sizes ? ` sizes="${sizes}"` : ''}` : '';
  const full = b.full ? ` data-full="${esc(b.full)}"` : ''; // große Fassung für die Lightbox
  const ext = b.ext ? ' referrerpolicy="no-referrer" class="ext"' : '';
  return `<img src="${esc(b.src)}"${ss}${wh}${full} alt="${esc(alt)}"${extra}${ext}>`;
};

/* ------------------------------------------------------------ Preise prüfen */
const G = {
  hp: num(preise.halbpension), einzel: num(preise.einzelnutzung_abzug_prozent), kurz: num(preise.kurzaufenthalt_prozent)
};
if (!(G.hp >= 0)) fehler.push('Preise: Halbpension fehlt.');
if (!(G.einzel >= 0 && G.einzel < 100)) fehler.push('Preise: Abzug bei Einzelnutzung fehlt oder ist zu hoch.');
if (!(G.kurz >= 0)) fehler.push('Preise: Zuschlag Kurzaufenthalt fehlt.');

const idsGesehen = new Set();
const saisonen = (preise.saisonen || []).map((s, si) => {
  const wo = `Saison „${s.name || si + 1}“`;
  if (!s.name) fehler.push(`Saison ${si + 1}: Name fehlt.`);
  if (!isoOk(s.von) || !isoOk(s.bis) || s.von > s.bis) fehler.push(`${wo}: Datum von/bis prüfen.`);
  let id = s.id || ('S' + (s.von || '').replace(/-/g, '').slice(2, 8));
  if (idsGesehen.has(id)) id = 'S' + (s.von || '').replace(/-/g, '').slice(2, 8) + '-' + si; // kopierte Saison
  idsGesehen.add(id);
  const pr = (o, w) => {
    const out = {};
    ROOMS.forEach(r => { const v = num(o && o[r]); if (!(v > 0)) fehler.push(`${wo}, ${w}: Preis für ${basis.rooms[r].name} fehlt.`); out[r] = v; });
    return out;
  };
  const grund = { name: s.grundpreis_name || 'Grundpreis', en: { name: sName(s, 'grundpreis_name', 'en') }, it: { name: sName(s, 'grundpreis_name', 'it') }, preise: pr(s.grundpreise, s.grundpreis_name || 'Grundpreise') };
  const zr = (s.zeitraeume || []).map((z, zi) => {
    const daten = (z.daten || []).filter(d => d && (d.von || d.bis));
    if (!z.name) fehler.push(`${wo}: Zeitraum ${zi + 1} braucht einen Namen.`);
    if (!daten.length) fehler.push(`${wo}, ${z.name}: Datum fehlt.`);
    daten.forEach(d => { if (!isoOk(d.von) || !isoOk(d.bis) || d.von > d.bis) fehler.push(`${wo}, ${z.name}: Datum von/bis prüfen.`); });
    return { id: 'p' + (zi + 1), name: z.name, en: z.en, it: z.it, name_en: z.name_en, name_it: z.name_it, daten, preise: pr(z.preise, z.name) };
  });
  const kids = [num(s.kinder && s.kinder.k0_2), num(s.kinder && s.kinder.k3_8), num(s.kinder && s.kinder.k9_13)];
  if (kids.some(k => !(k >= 0))) fehler.push(`${wo}: Kinderpreise prüfen.`);
  const tax = num(s.ortstaxe);
  if (!(tax >= 0)) fehler.push(`${wo}: Nächtigungsabgabe fehlt.`);
  return { ...s, id, grund, zr, kids, tax };
}).sort((a, b) => (a.von < b.von ? -1 : 1));
if (!saisonen.length) fehler.push('Preise: Es muss mindestens eine Saison geben.');
saisonen.forEach((s, i) => { if (i && s.von <= saisonen[i - 1].bis) fehler.push(`Saisonen „${saisonen[i - 1].name}“ und „${s.name}“ überschneiden sich.`); });

/* Packages prüfen */
const pkgIds = new Set();
const pkgs = (packages.packages || []).filter(p => p.aktiv !== false).map((p, i) => {
  const name = (p.de && p.de.titel) || `Package ${i + 1}`;
  if (!p.de || !p.de.titel) fehler.push(`Package ${i + 1}: Titel (Deutsch) fehlt.`);
  if (!isoOk(p.von) || !isoOk(p.bis) || p.von >= p.bis) fehler.push(`Package „${name}“: Anreise/Abreise prüfen.`);
  const id = (p.id || name).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const uid = pkgIds.has(id) ? `${id}-${i + 1}` : id; pkgIds.add(uid);
  return { ...p, id: uid, naechte: Math.round((Date.parse(p.bis) - Date.parse(p.von)) / 864e5), gratis: num(p.gratis_naechte) || 0 };
});

/* Zimmerfotos prüfen */
const zListe = a => (Array.isArray(a) ? a : []).filter(x => x && String(x.bild || '').trim());
Object.entries(ZSEITEN).forEach(([k, z]) => {
  const d = zimmer[k];
  const pruefe = (liste, wo) => {
    if (!liste.length) fehler.push(`Zimmerfotos ${wo}: Es muss mindestens ein Foto geben.`);
    liste.forEach((x, i) => {
      if (!String(x.de || '').trim()) fehler.push(`Zimmerfotos ${wo}, Foto ${i + 1}: Bildbeschreibung (Deutsch) fehlt.`);
      const s = String(x.bild).trim();
      if (!/^https?:\/\//i.test(s) && !bildgroesse(path.join(ROOT, s.replace(/^\//, '')))) fehler.push(`Zimmerfotos ${wo}, Foto ${i + 1}: Bild nicht gefunden (${s}).`);
    });
  };
  pruefe(zListe(d.fotos), z.name);
  (z.var || []).forEach(r => pruefe(zListe(d.varianten && d.varianten[r]), `${z.name} – ${basis.rooms[r].name}`));
});

/* Sommer & Winter prüfen */
const leerS = v => !String(v == null ? '' : v).trim();
const bildPruefen = (s, wo) => {
  const b = String(s || '').trim();
  if (!b) { fehler.push(`${wo}: Bild fehlt.`); return; }
  if (!/^https?:\/\//i.test(b) && !bildgroesse(path.join(ROOT, b.replace(/^\//, '')))) fehler.push(`${wo}: Bild nicht gefunden (${b}).`);
};
Object.entries(SAISONEN_SEITEN).forEach(([k, name]) => {
  const d = saisonSeite[k];
  bildPruefen(d.bild_oben && d.bild_oben.bild, `${name}, Bild oben`);
  if (leerS(d.bild_oben && d.bild_oben.de)) fehler.push(`${name}, Bild oben: Bildbeschreibung fehlt.`);
  const hl = (d.highlights || []).filter(Boolean);
  if (!hl.length) fehler.push(`${name}: Es muss mindestens einen Abschnitt geben.`);
  hl.forEach((h, i) => {
    const wo = `${name}, Abschnitt ${i + 1}${h.titel ? ` „${h.titel}“` : ''}`;
    bildPruefen(h.bild, wo);
    ['titel', 'text', 'bild_alt'].forEach(f => { if (leerS(h[f])) fehler.push(`${wo}: ${{ titel: 'Titel', text: 'Text', bild_alt: 'Bildbeschreibung' }[f]} fehlt.`); });
  });
  (d.kennzahlen || []).filter(Boolean).forEach((x, i) => { if (leerS(x.zahl) || leerS(x.text)) fehler.push(`${name}, Kennzahl ${i + 1}: Zahl und Text ausfüllen.`); });
  if ((d.kennzahlen || []).length > 4) fehler.push(`${name}: höchstens 4 Kennzahlen.`);
  const st = d.startseite || {};
  bildPruefen(st.bild, `${name}, Karte auf der Startseite`);
  ['zeitraum', 'titel', 'text', 'bild_alt'].forEach(f => { if (leerS(st[f])) fehler.push(`${name}, Karte auf der Startseite: ${{ zeitraum: 'Zeitraum', titel: 'Titel', text: 'Text', bild_alt: 'Bildbeschreibung' }[f]} fehlt.`); });
});
/* Aktionswochen prüfen */
const AW = aktionswochen;
if (leerS(AW.saison)) fehler.push('Aktionswochen: Saison fehlt (z. B. 2026/27).');
if (!isoOk(AW.saisonende)) fehler.push('Aktionswochen: Saisonende fehlt.');
const awListe = (AW.angebote || []).filter(Boolean).map((a, i) => {
  const wo = `Aktionswochen, Angebot ${i + 1}${a.titel ? ` „${a.titel}“` : ''}`;
  if (leerS(a.titel)) fehler.push(`${wo}: Titel fehlt.`);
  if (leerS(a.kurzname)) fehler.push(`${wo}: Kurzname für die Zeitleiste fehlt.`);
  const zr = (a.zeitraeume || []).filter(z => z && (z.von || z.bis));
  if (!zr.length) fehler.push(`${wo}: Zeitraum fehlt.`);
  zr.forEach((z, zi) => {
    if (!isoOk(z.von)) fehler.push(`${wo}: „Von“ fehlt.`);
    else if (z.bis && (!isoOk(z.bis) || z.bis < z.von)) fehler.push(`${wo}: „Bis“ liegt vor „Von“.`);
    else if (!z.bis && zi < zr.length - 1) fehler.push(`${wo}: Nur der letzte Zeitraum darf ohne „Bis“ sein (= bis Saisonende).`);
    if (isoOk(AW.saisonende) && isoOk(z.von) && z.von > AW.saisonende) fehler.push(`${wo}: beginnt nach dem Saisonende.`);
    /* Schutz vor vergessenen Angeboten aus der Vorsaison: höchstens 9 Monate vor Saisonende */
    if (isoOk(AW.saisonende) && isoOk(z.von) && (Date.parse(AW.saisonende) - Date.parse(z.von)) / 864e5 > 275) fehler.push(`${wo}: Datum ${datVoll(z.von, 'de')} liegt nicht in der Saison ${AW.saison} – bitte prüfen.`);
  });
  if (!(a.punkte || []).some(p => p && !leerS(p.punkt))) fehler.push(`${wo}: mindestens eine Leistung eintragen.`);
  return { ...a, zr };
});
/* Entfernungen prüfen */
[['lage', 'Lage & Anreise'], ['sommer', 'Sommerseite']].forEach(([k, n]) => {
  const liste = (entfernungen[k] || []).filter(Boolean);
  if (!liste.length) fehler.push(`Entfernungen ${n}: Die Liste ist leer.`);
  liste.forEach((e, i) => { if (leerS(e.ziel) || leerS(e.entfernung)) fehler.push(`Entfernungen ${n}, Zeile ${i + 1}: Ziel und Entfernung ausfüllen.`); });
});

if (fehler.length) {
  console.error('\n✖ Die Website wurde NICHT aktualisiert. Bitte im Admin-Bereich korrigieren:\n  - ' + fehler.join('\n  - ') + '\n');
  process.exit(1);
}

/* ------------------------------------------------------------ Bausteine */
const roomName = (r, l) => (l === 'de' ? basis.rooms[r].name : basis.i18n[l].rooms[r].name);
const aktuell = s => s.bis >= heute;

function preistabellen(l) {
  const g = { ...G, kidAges: KID_AGES[l] };
  const reihe = saisonen.filter(aktuell).concat(saisonen.filter(s => !aktuell(s)).reverse());
  const tabs = `<div class="ptabs" role="tablist" aria-label="${T[l].tabs}">` + reihe.map((s, i) =>
    `<button type="button" role="tab" id="t-${s.id}" aria-controls="p-${s.id}" aria-selected="${i === 0}">${esc(sName(s, 'name', l))}</button>`).join('') + '</div>';
  const panels = reihe.map((s, i) => {
    const kopf = `<th scope="col">${T[l].zimmer}</th><th scope="col">${esc(sName(s.grund, 'name', l))}<span>${datVoll(s.von, l)}–${datVoll(s.bis, l)}</span></th>` +
      s.zr.map(z => `<th scope="col">${esc(sName(z, 'name', l))}<span>${z.daten.map(d => `${datKurz(d.von, l)}–${datKurz(d.bis, l)}`).join(T[l].und)}</span></th>`).join('');
    const rows = ROOMS.map(r => `<tr><td>${esc(roomName(r, l))}</td><td>${eur(s.grund.preise[r], l)}</td>${s.zr.map(z => `<td>${eur(z.preise[r], l)}</td>`).join('')}</tr>`).join('');
    const zusatz = sName(s, 'zusatz', l);
    const note = `<p class="pnote">${esc(T[l].note(s, g))}${zusatz ? ' ' + inline(zusatz) : ''}</p>`;
    const teaser = pkgs.filter(p => p.von >= s.von && p.von <= s.bis).map(p => {
      const t = pick(p, l);
      return `<a class="pkg" href="angebote.html#${p.id}" data-bis="${p.bis}"><span class="pkg__k">${nb(p.badge || '')}</span><span><b>${esc(t.titel)}, ${spanne(p.von, p.bis, l)}</b>${esc(t.kurztext || '')}</span>${pfeil}</a>`;
    }).join('');
    const hin = sName(s, 'hinweis', l);
    return `<div class="ppanel" role="tabpanel" id="p-${s.id}" aria-labelledby="t-${s.id}"${i ? ' hidden' : ''}><div class="ptable-wrap"><table class="ptable"><thead><tr>${kopf}</tr></thead><tbody>${rows}</tbody></table></div>${note}${teaser}${hin ? `<p class="pnote">${inline(hin)}</p>` : ''}</div>`;
  }).join('');
  return tabs + panels;
}

function abPreis(gruppe) {
  const quelle = saisonen.filter(aktuell).length ? saisonen.filter(aktuell) : saisonen;
  const werte = [];
  quelle.forEach(s => AB_GROUPS[gruppe].forEach(r => { werte.push(s.grund.preise[r]); s.zr.forEach(z => werte.push(z.preise[r])); }));
  return Math.min(...werte);
}

function packageSektionen(l) {
  return pkgs.map((p, i) => {
    const t = pick(p, l);
    const b = bild(p.bild, l, [800, 1400, 2000]);
    if (b && !b.g && p.bild_breite && p.bild_hoehe) { b.w = p.bild_breite; b.h = p.bild_hoehe; }
    const leist = (t.leistungen || []).map(x => (typeof x === 'string' ? x : x.punkt)).filter(Boolean);
    const preis = t.preis_ab ? `<div class="pk__price">${esc(t.preis_vor || '')} <b>${esc(t.preis_ab)}</b> ${esc(t.preis_text || '')}${t.preis_statt ? ` <s>${esc(t.preis_statt)}</s>` : ''}</div>` : '';
    return `<section class="sec--tight pk-sec" id="${p.id}" data-bis="${p.bis}" style="padding-top:${i ? 'clamp(2.5rem,6vw,4rem)' : '0'}">
  <div class="wrap">
    <div class="pk">
      <div class="pk__img">
        <div class="pic rv">${imgTag(b, t.bild_alt || p.de.bild_alt || '', ` loading="${i ? 'lazy' : 'eager'}" decoding="async"`, '(min-width: 900px) 50vw, 100vw')}</div>
        ${p.badge ? `<div class="pk__badge" aria-hidden="true"><span><b>${nb(p.badge)}</b><small>${esc(t.badge_unten || T[l].naechte)}</small></span></div>` : ''}
      </div>
      <div class="pk__txt rv-up">
        <span class="eyebrow">${spanne(p.von, p.bis, l)}</span>
        <h2>${emLast(t.titel, true)}</h2>
        ${absaetze(t.text, 'lead')}
        ${leist.length ? `<ul class="ticks">\n          ${leist.map(x => `<li>${esc(x)}</li>`).join('\n          ')}\n        </ul>` : ''}
        ${preis}
        ${t.beispiel ? `<p class="draft-note">${inline(t.beispiel)}</p>` : ''}
        <div class="pk__btns"><a class="btn btn--sun" href="kontakt.html?package=${encodeURIComponent(t.titel)}#kontakt">${T[l].anfragen}</a><a class="btn btn--ghost" href="tel:+434240331">+43 4240 331</a></div>
        ${t.kleingedrucktes ? `<p class="draft-note pk__fine">${inline(t.kleingedrucktes)}</p>` : ''}
      </div>
    </div>
  </div>
</section>`;
  }).join('\n') + `\n<section class="sec--tight" style="padding-top:0" data-pkg-leer${pkgs.length ? ' hidden' : ''}><div class="wrap"><p class="lead">${esc((packages.leer && packages.leer[l]) || '')}</p></div></section>`;
}

function startKarte(l) {
  const f = T[l].fallback;
  const fb = (versteckt) => `<a class="offer offer--hl rv-up" href="angebote.html" data-pkg-fallback${versteckt ? ' hidden' : ''}>
        <span class="offer__tag">${esc(f.tag)}</span>
        <h3>${esc(f.titel)}</h3>
        <p>${esc(f.text)}</p>
        <span class="link">${f.link} ${pfeil}</span>
      </a>`;
  const karten = pkgs.map((p, i) => {
    const t = pick(p, l);
    return `<a class="offer offer--hl rv-up" href="angebote.html#${p.id}" data-bis="${p.bis}" data-pkg-karte${i ? ' hidden' : ''}>
        <span class="offer__tag">${spanne(p.von, p.bis, l)}</span>
        <h3>${esc(t.titel)}</h3>
        <p>${esc(t.kurztext || '').replace(/(\d) %/g, '$1&nbsp;%')}</p>
        ${p.badge ? `<span class="offer__big">${nb(p.badge)}</span>` : ''}
        <span class="link">${T[l].zumPkg} ${pfeil}</span>
      </a>`;
  });
  return karten.join('\n      ') + (karten.length ? '\n      ' : '') + fb(karten.length > 0);
}

function galerieHtml(l) {
  return (galerie.bilder || []).filter(x => x && x.bild).map(x => {
    const cap = (l !== 'de' && x[l]) || x.de || '';
    const b = bild(x.bild, l, [600, 1000, 1600]);
    if (b && !b.g && x.breite && x.hoehe) { b.w = x.breite; b.h = x.hoehe; }
    return `<figure data-cat="${esc(x.kategorie || 'haus')}"><button type="button" data-lb aria-label="${esc(T[l].lupe + cap)}">${imgTag(b, cap, ' loading="lazy" decoding="async"', '(min-width: 1100px) 33vw, (min-width: 640px) 50vw, 100vw')}</button><figcaption>${esc(cap)}</figcaption></figure>`;
  }).join('\n');
}

function hinweisHtml(l) {
  const h = hinweis || {};
  const t = h[l] || {};
  if (!h.aktiv || !t.text || (h.anzeigen_bis && h.anzeigen_bis < heute)) return '';
  const link = t.link_text && t.link_ziel ? ` <a class="notice__a" href="${esc(t.link_ziel)}">${esc(t.link_text)} ${pfeil}</a>` : '';
  return `<aside class="notice" aria-label="${T[l].aktuell}"${h.anzeigen_bis ? ` data-bis="${h.anzeigen_bis}"` : ''}><div class="wrap"><div class="notice__in rv-up"><span class="notice__k">${T[l].aktuell}</span><p>${inline(t.text)}${link}</p></div></div></aside>`;
}

/* ------------------------------------------------------------ Zimmerfotos */
const zAlt = (x, l) => String((l !== 'de' && x[l]) || x.de || '').trim();
const anzahl = { de: n => (n === 1 ? '1 Foto' : `${n} Fotos`), en: n => (n === 1 ? '1 photo' : `${n} photos`), it: n => `${n} foto` };
/* Bild für eine Zimmerseite; alte Fotos von der bisherigen Website behalten ihre leichte Farbkorrektur (.ext) */
function zImg(x, l, breiten, extra, sizes) {
  const b = bild(x.bild, l, breiten);
  if (b && !b.g && x.breite && x.hoehe) { b.w = x.breite; b.h = x.hoehe; }
  /* eigene Bilder wie dz-golf-1560.jpg: kleinere Fassungen daneben (dz-golf-800.jpg) mitverwenden */
  const m = !b.srcset && !b.ext && String(x.bild).trim().replace(/^\//, '').match(/^(assets\/img\/.+)-(\d+)\.(jpe?g|webp|png)$/i);
  if (m) {
    const dir = path.dirname(m[1]), stem = path.basename(m[1]);
    const ws = fs.readdirSync(path.join(ROOT, dir)).map(f => f.match(new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.${m[3]}$`, 'i'))).filter(Boolean).map(f => Number(f[1])).sort((a, c) => a - c);
    if (ws.length > 1) b.srcset = ws.map(w => `${PRE[l]}${dir}/${stem}-${w}.${m[3]} ${w}w`).join(', ');
  }
  const alt = zAlt(x, l);
  const tag = imgTag(b, alt, extra, sizes);
  return /^\/?images\//.test(String(x.bild).trim()) && !b.ext ? tag.replace(/>$/, ' class="ext">') : tag;
}
const lbBtn = (x, l, inner, cls = '', style = '') =>
  `<button type="button"${cls ? ` class="${cls}"` : ''} data-lb aria-label="${esc(T[l].lupe + zAlt(x, l))}"${style ? ` style="${style}"` : ''}>${inner}</button>`;

function zimmerMedia(k, l) {
  const [h, ...rest] = zListe(zimmer[k].fotos);
  const main = lbBtn(h, l, zImg(h, l, [800, 1400, 2000], ' loading="eager" decoding="async" fetchpriority="high"', '(min-width: 900px) 800px, 100vw'), 'rd__main pic rv', 'aspect-ratio:3/2;max-width:800px');
  if (!rest.length) return `\n      ${main}\n      `;
  const cls = rest.length === 5 ? ' thumbs--5' : rest.length === 4 ? ' thumbs--4' : '';
  const th = rest.map(x => lbBtn(x, l, zImg(x, l, [400, 800, 1400], ' loading="lazy" decoding="async"', '(min-width: 900px) 270px, 50vw'))).join('');
  return `\n      ${main}\n      <div class="thumbs${cls}">${th}</div>\n      `;
}
const zimmerVar = (k, r) => zListe(zimmer[k].varianten && zimmer[k].varianten[r]);
function zimmerVarGrid(k, r, l) {
  const f = zimmerVar(k, r);
  return `<div class="var__grid" data-n="${f.length}">` + f.map((x, i) => lbBtn(x, l, zImg(x, l, [400, 800, 1400], ' loading="lazy" decoding="async"', f.length === 5 && !i ? '(min-width: 900px) 400px, 100vw' : '(min-width: 900px) 200px, 50vw'))).join('') + '</div>';
}
const zimmerKarte = (k, l) => zImg(zListe(zimmer[k].fotos)[0], l, [800, 1400], ' loading="lazy" decoding="async"', '(max-width: 600px) 100vw, (max-width: 900px) 50vw, 40vw');
/* Fotos fürs Anfrage-System: Einzelseiten → Seitenfotos, Varianten → Fotos der Variante */
const zimmerFuerAnfrage = {};
Object.entries(ZSEITEN).forEach(([k, z]) => {
  (z.rooms || []).forEach(r => { zimmerFuerAnfrage[r] = zListe(zimmer[k].fotos); });
  (z.var || []).forEach(r => { zimmerFuerAnfrage[r] = zimmerVar(k, r); });
});
const anfrageImg = r => (zimmerFuerAnfrage[r] || []).slice(0, 3).map(x => ({ src: bild(x.bild, 'de', [800, 1400]).src, alt: zAlt(x, 'de') }));
const anfrageAlt = l => {
  const m = { ...basis.i18n[l].alt };
  Object.values(zimmerFuerAnfrage).flat().forEach(x => { const de = zAlt(x, 'de'), t = zAlt(x, l); if (t && t !== de) m[de] = t; });
  return m;
};

/* ------------------------------------------------------------ data.js (Buchungsrechner) */
function dataJs() {
  const rooms = ROOMS.map(r => {
    const price = {};
    saisonen.forEach(s => { const o = { base: s.grund.preise[r] }; s.zr.forEach(z => { o[z.id] = z.preise[r]; }); price[s.id] = o; });
    return { ...basis.rooms[r], img: anfrageImg(r), id: r, price };
  });
  const i18n = {};
  ['en', 'it'].forEach(l => {
    const per = {};
    saisonen.forEach(s => { per[s.grund.name] = sName(s.grund, 'name', l); s.zr.forEach(z => { per[z.name] = sName(z, 'name', l); }); });
    const pk = {}, pkx = {};
    pkgs.forEach(p => { const t = pick(p, l); pk[p.id] = t.titel; pkx[p.id] = { badge: p.badge || '', note: t.kurztext || '' }; });
    i18n[l] = { rooms: basis.i18n[l].rooms, alt: anfrageAlt(l), periods: per, kidAges: KID_AGES[l], packages: pk, packageText: pkx };
  });
  const SB = {
    seasons: saisonen.map(s => ({ id: s.id, name: s.name, from: s.von, to: s.bis, base: s.grund.name, periods: s.zr.map(z => ({ id: z.id, name: z.name, ranges: z.daten.map(d => [d.von, d.bis]) })), hp: G.hp, tax: s.tax, kids: s.kids })),
    rooms, singleUse: 2 * (1 - G.einzel / 100) - 1, /* Einzelnutzung: Preis für 2 Personen minus Abzug, als Aufschlag auf den Personenpreis */ shortStay: G.kurz / 100, kidAges: KID_AGES.de,
    packages: pkgs.map(p => ({ id: p.id, name: p.de.titel, from: p.von, to: p.bis, nights: p.naechte, free: p.gratis, badge: p.badge || '', note: p.de.kurztext || '' })),
    i18n
  };
  return `/* Automatisch erzeugt aus _data/preise.json und _data/packages.json (node _cms/build.mjs).
   Nicht von Hand ändern – Preise im Admin-Bereich unter /admin pflegen.
   Preise in Euro pro Person und Nacht inkl. Frühstück. */
window.SB = ${JSON.stringify(SB)};
`;
}

/* ------------------------------------------------------------ Sommer & Winter */
/* Feld in der Sprache l, sonst Deutsch (Deutsch steht direkt im Objekt, EN/IT in o.en / o.it) */
const voll = v => (Array.isArray(v) ? v.some(x => x && (typeof x === 'string' ? x.trim() : Object.values(x).some(y => String(y || '').trim()))) : !leer(v));
const tr = (o, l, k) => { const v = l !== 'de' && o && o[l] ? o[l][k] : undefined; return voll(v) ? v : o[k]; };
const AUSSCHNITT = { oben: '50% 25%', unten: '50% 70%', links: '40% 50%', rechts: '60% 50%' };
const posStil = a => (AUSSCHNITT[a] ? ` style="object-position:${AUSSCHNITT[a]}"` : '');
const altObj = (o, l) => ({ bild: o.bild, de: o.bild_alt, en: o.en && o.en.bild_alt, it: o.it && o.it.bild_alt });
const pad = n => String(n).padStart(2, '0');

function highlightsHtml(k, l) {
  return (saisonSeite[k].highlights || []).filter(Boolean).map((h, i) => {
    const tag = tr(h, l, 'kennzeichen');
    const img = zImg(altObj(h), l, [800, 1400, 2000], ` loading="lazy" decoding="async"${posStil(h.ausschnitt)}`, '(min-width: 900px) 50vw, 100vw');
    return `<div class="frow${i % 2 ? ' frow--flip' : ''}">
      <div class="frow__img"><div class="pic rv">${img}</div></div>
      <div class="frow__txt rv-up">
        <span class="frow__n">${pad(i + 1)}</span><h3>${esc(tr(h, l, 'titel'))}</h3>${tag ? `<span class="feature__tag">${esc(tag)}</span>` : ''}
        ${absaetze(tr(h, l, 'text'))}
      </div>
    </div>`;
  }).join('\n    ');
}
const kennzahlenHtml = (k, l) => (saisonSeite[k].kennzahlen || []).filter(Boolean)
  .map(x => `\n      <div class="kpi rv-up"><b>${esc(tr(x, l, 'zahl'))}</b><span>${esc(tr(x, l, 'text'))}</span></div>`).join('');
const bildObenHtml = (k, l) => zImg(saisonSeite[k].bild_oben, l, [800, 1400, 2000], ' loading="lazy" decoding="async"', '100vw');
function jzKarte(k, l) {
  const st = saisonSeite[k].startseite;
  const punkte = (tr(st, l, 'punkte') || []).filter(p => p && !leerS(p.titel));
  return `<div class="pic season__img">${zImg(altObj(st), l, [800, 1400], ` loading="lazy" decoding="async"${posStil(st.ausschnitt)}`, '(min-width: 900px) 45vw, 100vw')}</div>
        <span class="season__tag">${esc(tr(st, l, 'zeitraum'))}</span>
        <h3>${esc(tr(st, l, 'titel'))}</h3>
        <p>${inline(tr(st, l, 'text'))}</p>${punkte.length ? `
        <div class="incl">${punkte.map(p => `
          <div><b>${esc(p.titel)}</b><span>${esc(p.text || '')}</span></div>`).join('')}
        </div>` : ''}`;
}

/* ------------------------------------------------------------ Aktionswochen der Bergbahnen */
const MON_K = {
  de: ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  it: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
};
const AWT = {
  de: { und: ' und ', ab: (d) => `ab ${d} bis Saisonende`, aria: s => `Zeitraum der Angebote im Winter ${s}`, tag: s => `Winter ${s}`, titel: 'Aktionswochen der Bergbahnen' },
  en: { und: ' and ', ab: (d) => `from ${d} to the end of the season`, aria: s => `Offer periods in winter ${s}`, tag: s => `Winter ${s}`, titel: 'Cable car special weeks' },
  it: { und: ' e ', ab: (d) => `dal ${d} a fine stagione`, aria: s => `Periodi delle offerte nell’inverno ${s}`, tag: s => `Inverno ${s}`, titel: 'Settimane promozionali degli impianti' }
};
const tagZahl = (d, l) => (l === 'de' ? `${pad(d)}.` : String(d));
const tagMon = (x, l) => `${tagZahl(x.d, l)} ${MON[l][x.m - 1]}`;
/* „04.–23. Dezember 2026“ · „09.–29. Jänner und 20. Februar – 05. März 2027“ · „ab 06. März 2027 bis Saisonende“ */
function awDatum(zr, l) {
  const offen = zr.filter(z => !z.bis), zu = zr.filter(z => z.bis);
  const jahre = new Set(zu.flatMap(z => [dp(z.von).y, dp(z.bis).y]));
  const einJahr = jahre.size === 1;
  const teil = z => {
    const A = dp(z.von), B = dp(z.bis);
    const mitJahr = !einJahr;
    if (A.y !== B.y) return `${tagMon(A, l)} ${A.y} – ${tagMon(B, l)} ${B.y}`;
    const s = A.m === B.m ? `${tagZahl(A.d, l)}–${tagMon(B, l)}` : `${tagMon(A, l)} – ${tagMon(B, l)}`;
    return mitJahr ? `${s} ${A.y}` : s;
  };
  const teile = zu.map(teil);
  let s = teile.join(AWT[l].und);
  if (zu.length && einJahr && !zu.some(z => dp(z.von).y !== dp(z.bis).y)) s += ` ${[...jahre][0]}`;
  const ab = offen.map(z => { const A = dp(z.von); return AWT[l].ab(`${tagMon(A, l)} ${A.y}`); });
  return [s, ...ab].filter(Boolean).join(AWT[l].und);
}
const tage = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const prozent = v => `${Math.max(0, Math.min(100, v)).toFixed(2)}%`;
function awZeitleiste(l) {
  const ende = AW.saisonende;
  const erster = awListe.flatMap(a => a.zr.map(z => z.von)).sort()[0];
  const start = `${erster.slice(0, 7)}-01`;
  const total = tage(start, ende);
  let { y, m } = dp(start);
  const monate = [];
  for (let d = start; d < ende;) {
    monate.push(`<span style="left:${prozent(tage(start, d) / total * 100)}">${MON_K[l][m - 1]}</span>`);
    m++; if (m > 12) { m = 1; y++; }
    d = `${y}-${pad(m)}-01`;
  }
  const reihen = awListe.map((a, i) => `<div class="skitl__r"><span class="skitl__l"><i>${pad(i + 1)}</i>${esc(tr(a, l, 'kurzname'))}</span><span class="skitl__t">${a.zr.map(z => {
    const links = tage(start, z.von) / total * 100;
    const breite = (z.bis ? tage(z.von, z.bis) + 1 : tage(z.von, ende)) / total * 100;
    return `<b class="${z.bis ? '' : 'is-open'}" style="left:${prozent(links)};width:${prozent(Math.min(breite, 100 - links))}"></b>`;
  }).join('')}</span></div>`).join('');
  return `<div class="skitl rv-up" role="img" aria-label="${esc(AWT[l].aria(AW.saison))}"><div class="skitl__m">${monate.join('')}</div>${reihen}</div>`;
}
function aktionswochenHtml(l) {
  const lis = awListe.map((a, i) => {
    const p = (tr(a, l, 'punkte') || []).map(x => x && x.punkt).filter(x => !leerS(x));
    const body = p.length === 1 ? `<p>${inline(p[0])}</p>` : `<ul>${p.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`;
    return `<li class="ski rv-up"><div class="ski__top"><span class="ski__no">${pad(i + 1)}</span><span class="ski__k">${esc(tr(a, l, 'kennzeichen') || '')}</span></div><h3>${esc(tr(a, l, 'titel'))}</h3><p class="ski__d">${awDatum(a.zr, l)}</p>${body}</li>`;
  }).join('');
  const hin = tr(AW, l, 'hinweis');
  return `${awZeitleiste(l)}
    <ol class="skis stagger">${lis}</ol>${hin ? `
    <p class="draft-note deals__note">${inline(hin)}</p>` : ''}`;
}
const awKarte = l => `<span class="offer__tag">${esc(AWT[l].tag(AW.saison))}</span>
        <h3>${AWT[l].titel}</h3>
        <p>${inline(tr(AW, l, 'startseite_text') || '')}</p>`;

/* ------------------------------------------------------------ Entfernungen */
const entfHtml = (k, l, einr) => (entfernungen[k] || []).filter(Boolean)
  .map(e => `${einr}<li><span>${esc((l !== 'de' && e[`ziel_${l}`]) || e.ziel)}</span><span>${esc((l !== 'de' && e[`entfernung_${l}`]) || e.entfernung)}</span></li>`).join('');

/* ------------------------------------------------------------ Schreiben */
let geaendert = 0;
function ersetze(datei, name, inhalt) {
  const p = path.join(ROOT, datei);
  const s = fs.readFileSync(p, 'utf8');
  const re = new RegExp(`(<!-- cms:${name} -->)[\\s\\S]*?(<!-- /cms:${name} -->)`, 'g');
  if (!re.test(s)) throw new Error(`Markierung cms:${name} fehlt in ${datei}`);
  const neu = s.replace(re, (m, a, b) => `${a}${inhalt}${b}`);
  if (neu !== s) { fs.writeFileSync(p, neu); geaendert++; }
}
function ersetzeAlle(datei, name, f) {
  const p = path.join(ROOT, datei);
  const s = fs.readFileSync(p, 'utf8');
  const re = new RegExp(`(<!-- cms:${name}:([a-z0-9-]+) -->)[\\s\\S]*?(<!-- /cms:${name} -->)`, 'g');
  const neu = s.replace(re, (m, a, key, b) => `${a}${f(key)}${b}`);
  if (neu !== s) { fs.writeFileSync(p, neu); geaendert++; }
}

const dj = path.join(ROOT, 'assets/js/data.js');
const djNeu = dataJs();
if (fs.readFileSync(dj, 'utf8') !== djNeu) { fs.writeFileSync(dj, djNeu); geaendert++; }

LANGS.forEach(l => {
  const d = DIR[l];
  ersetze(d + 'preise.html', 'preistabellen', preistabellen(l));
  ersetze(d + 'angebote.html', 'packages', '\n' + packageSektionen(l) + '\n');
  ersetze(d + 'index.html', 'startkarte', '\n      ' + startKarte(l) + '\n      ');
  ersetze(d + 'index.html', 'hinweis', hinweisHtml(l));
  ersetze(d + 'galerie.html', 'galerie', '\n' + galerieHtml(l) + '\n');
  ['preise.html', 'ausstattung.html'].forEach(f => ersetzeAlle(d + f, 'hp', () => eur(G.hp, l)));
  ['zimmer.html', 'einzelzimmer.html', 'doppelzimmer.html', 'wohn-schlafzimmer.html', 'sonnblick-suite.html', 'familiensuite.html']
    .forEach(f => ersetzeAlle(d + f, 'ab', g => eur(abPreis(g), l)));
  Object.entries(ZSEITEN).forEach(([k, z]) => {
    ersetze(d + k + '.html', 'zfotos', zimmerMedia(k, l));
    if (z.var) {
      ersetzeAlle(d + k + '.html', 'zvar', r => zimmerVarGrid(k, r, l));
      ersetzeAlle(d + k + '.html', 'zanz', r => anzahl[l](zimmerVar(k, r).length));
    }
  });
  ersetzeAlle(d + 'zimmer.html', 'zkarte', k => zimmerKarte(k, l));
  Object.keys(SAISONEN_SEITEN).forEach(k => {
    ersetze(d + k + '.html', 'highlights', highlightsHtml(k, l));
    ersetze(d + k + '.html', 'kennzahlen', kennzahlenHtml(k, l));
    ersetze(d + k + '.html', 'bildoben', bildObenHtml(k, l));
  });
  ersetzeAlle(d + 'index.html', 'jzkarte', k => jzKarte(k, l));
  ['winter.html', 'angebote.html'].forEach(f => {
    ersetze(d + f, 'aktionswochen', aktionswochenHtml(l));
    ersetze(d + f, 'aw-intro', inline(tr(AW, l, f === 'winter.html' ? 'einleitung_winter' : 'einleitung_angebote') || ''));
  });
  ersetze(d + 'angebote.html', 'aw-saison', esc(AW.saison));
  ersetze(d + 'index.html', 'aw-karte', awKarte(l));
  ersetzeAlle(d + 'lage.html', 'entf', k => entfHtml(k, l, '\n        '));
  ersetzeAlle(d + 'sommer.html', 'entf', k => entfHtml(k, l, '\n          '));
});

console.log(`✔ Inhalte übernommen (${geaendert} Datei${geaendert === 1 ? '' : 'en'} aktualisiert, Stand ${heute}).`);
