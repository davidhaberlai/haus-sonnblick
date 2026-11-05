// Haus Sonnblick – Karibu Studio
// Wird von Netlify automatisch bei jeder neuen (nicht als Spam erkannten)
// Formular-Anfrage aufgerufen und schickt sie per E-Mail ans Hotel.
// Versand über den World4You-Mailserver (SMTP, Port 587, STARTTLS).
//
// Einstellungen in Netlify unter "Environment variables":
//   SMTP_PASS  Passwort des Postfachs info@haus-sonnblick.at   (Pflicht)
//   MAIL_TO    Empfänger (optional, Standard: info@haus-sonnblick.at)
//   SMTP_USER  Absender/Login (optional, Standard: info@haus-sonnblick.at)
// Ohne SMTP_PASS wird nichts verschickt – die Anfrage bleibt in Netlify
// unter "Forms" gespeichert.

import net from 'node:net';
import tls from 'node:tls';

const LABELS = {
  buchungsnummer: 'Anfrage-Nr.', anreise: 'Anreise', abreise: 'Abreise', zimmer: 'Zimmer',
  gaeste: 'Gäste', halbpension: 'Halbpension', gesamtpreis: 'Gesamtpreis (lt. Website)',
  aufstellung: 'Aufstellung', anrede: 'Anrede', vorname: 'Vorname', nachname: 'Nachname',
  name: 'Name', email: 'E-Mail', telefon: 'Telefon', land: 'Land', ankunft: 'Ankunftszeit',
  anmerkungen: 'Anmerkungen', betreff: 'Betreff', nachricht: 'Nachricht',
  bestellnummer: 'Bestell-Nr.', gutscheinwert: 'Gutscheinwert', einloesbar: 'Einlösbar bei',
  betrag: 'Betrag', eigener_betrag: 'Eigener Betrag', fuer: 'Für', von: 'Von',
  widmung: 'Widmung', zustellung: 'Zustellung', adresse: 'Adresse',
  agb: 'AGB akzeptiert', datenschutz: 'Datenschutz akzeptiert'
};
const SKIP = new Set(['form-name', 'firma', 'ip', 'user_agent', 'referrer']);
const FORMS = { buchung: 'Buchungsanfrage', kontakt: 'Kontaktanfrage', gutschein: 'Gutschein-Bestellung' };

const clean = v => (Array.isArray(v) ? v.join(', ') : String(v ?? '')).replace(/\r\n?/g, '\n').trim();
const oneLine = v => clean(v).replace(/\s+/g, ' ').slice(0, 140);
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const validMail = s => /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/.test(s);

function language(ref) {
  if (/\/en\//.test(ref || '')) return 'Englisch';
  if (/\/it\//.test(ref || '')) return 'Italienisch';
  return 'Deutsch';
}

export function buildMail(payload) {
  const d = payload.data || {};
  const form = payload.form_name || d['form-name'] || 'Formular';
  const art = FORMS[form] || `Anfrage (${form})`;
  const person = oneLine(d.name || [d.vorname, d.nachname].filter(Boolean).join(' ')) || 'ohne Namen';
  let extra = '';
  if (form === 'buchung' && (d.anreise || d.abreise)) extra = ` – ${oneLine(d.anreise)} bis ${oneLine(d.abreise)}`;
  if (form === 'kontakt' && d.betreff) extra = ` – ${oneLine(d.betreff)}`;
  if (form === 'gutschein' && (d.gutscheinwert || d.betrag)) extra = ` – ${oneLine(d.gutscheinwert || d.betrag)}`;
  const subject = `Neue ${art}: ${person}${extra}`;

  const rows = [];
  for (const [k, v] of Object.entries(d)) {
    if (SKIP.has(k)) continue;
    let val = clean(v);
    if (!val) continue;
    if (k === 'agb' || k === 'datenschutz') val = 'ja';
    rows.push([LABELS[k] || k, val]);
  }
  rows.push(['Sprache der Website', language(d.referrer)]);
  const when = new Date(payload.created_at || Date.now()).toLocaleString('de-AT', { timeZone: 'Europe/Vienna', dateStyle: 'medium', timeStyle: 'short' });
  rows.push(['Eingegangen', when]);

  const guest = clean(d.email);
  const replyTo = validMail(guest) ? guest : '';
  const hint = replyTo
    ? 'Mit „Antworten“ geht Ihre Antwort direkt an den Gast.'
    : 'Achtung: Keine gültige E-Mail-Adresse angegeben – bitte telefonisch Kontakt aufnehmen.';

  const text = `${art} über die Website haus-sonnblick.at\n\n` +
    rows.map(([l, v]) => `${l}:\n${v}\n`).join('\n') + `\n${hint}\n`;

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#2b2622">
<table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;border-collapse:separate">
<tr><td style="padding:24px 28px 8px"><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9a7b4f">Website haus-sonnblick.at</div>
<h1 style="margin:6px 0 0;font-size:22px;font-weight:normal">${esc(art)}</h1></td></tr>
<tr><td style="padding:8px 28px 4px"><table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;line-height:1.5">
${rows.map(([l, v]) => `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid #eee;color:#7a716a;vertical-align:top;white-space:nowrap">${esc(l)}</td><td style="padding:8px 0;border-top:1px solid #eee;vertical-align:top">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('\n')}
</table></td></tr>
<tr><td style="padding:12px 28px 24px;font-size:13px;color:#7a716a">${esc(hint)}</td></tr>
</table></body></html>`;

  return { subject, text, html, replyTo };
}

// ---- schlanker SMTP-Client (STARTTLS, AUTH LOGIN) ----
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const encWord = s => {
  if (/^[\x20-\x7e]*$/.test(s) && s.length < 70) return s;
  const parts = []; let cur = '';
  for (const ch of s) { if (Buffer.byteLength(cur + ch) > 42) { parts.push(cur); cur = ''; } cur += ch; }
  if (cur) parts.push(cur);
  return parts.map(p => `=?UTF-8?B?${b64(p)}?=`).join('\r\n ');
};
const wrap76 = s => s.replace(/.{1,76}/g, '$&\r\n');

function rfc822({ from, fromName, to, replyTo, subject, text, html }) {
  const boundary = 'sb-' + Math.random().toString(36).slice(2);
  const domain = from.split('@')[1];
  const h = [
    `From: ${encWord(fromName)} <${from}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: ${encWord(subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean);
  return h.join('\r\n') + '\r\n\r\n' +
    `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(b64(text))}` +
    `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(b64(html))}` +
    `--${boundary}--\r\n`;
}

export function sendMail(opts, msg) {
  const { host, port = 587, user, pass, tlsOptions = {}, timeout = 15000 } = opts;
  return new Promise((resolve, reject) => {
    let sock = net.connect(port, host);
    let buf = '';
    let waiter = null;
    const fail = err => { try { sock.destroy(); } catch {} reject(err); };
    const timer = setTimeout(() => fail(new Error('SMTP-Zeitüberschreitung')), timeout);
    const onData = chunk => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\r\n');
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) {
          const resp = lines.slice(0, i + 1).join('\n');
          buf = lines.slice(i + 1).join('\r\n');
          const w = waiter; waiter = null;
          if (w) w(resp);
          return;
        }
      }
    };
    const read = () => new Promise(r => { waiter = r; });
    const cmd = async (line, ok, label) => {
      if (line !== null) sock.write(line + '\r\n');
      const resp = await read();
      const code = Number(resp.match(/(\d{3}) [^\n]*$/)[1]);
      const name = label || (line ? line.split(/[ :]/)[0] : 'Begrüßung');
      if (!ok.includes(code)) throw new Error(`SMTP ${name}: ${resp}`);
      return resp;
    };
    sock.on('data', onData);
    sock.on('error', fail);
    (async () => {
      const me = 'haus-sonnblick.netlify.app';
      await cmd(null, [220]);
      await cmd(`EHLO ${me}`, [250]);
      await cmd('STARTTLS', [220]);
      sock.removeListener('data', onData);
      sock = await new Promise((res, rej) => {
        const t = tls.connect({ socket: sock, servername: host, ...tlsOptions }, () => res(t));
        t.on('error', rej);
      });
      sock.on('data', onData);
      sock.on('error', fail);
      await cmd(`EHLO ${me}`, [250]);
      await cmd('AUTH LOGIN', [334]);
      await cmd(b64(user), [334], 'Benutzername');
      await cmd(b64(pass), [235], 'Anmeldung (Passwort prüfen)');
      await cmd(`MAIL FROM:<${msg.from}>`, [250]);
      await cmd(`RCPT TO:<${msg.to}>`, [250, 251]);
      await cmd('DATA', [354]);
      const body = rfc822(msg).replace(/\r\n\./g, '\r\n..');
      await cmd(body + '\r\n.', [250], 'Nachricht');
      try { sock.write('QUIT\r\n'); sock.end(); } catch {}
      clearTimeout(timer);
      resolve();
    })().catch(e => { clearTimeout(timer); fail(e); });
  });
}

export const handler = async (event) => {
  let payload;
  try { payload = JSON.parse(event.body || '{}').payload || {}; }
  catch { return { statusCode: 400, body: 'Ungültige Daten' }; }

  const pass = process.env.SMTP_PASS;
  if (!pass) {
    console.log('SMTP_PASS fehlt – Anfrage nur in Netlify gespeichert:', payload.form_name);
    return { statusCode: 200, body: 'nicht versendet (kein SMTP_PASS)' };
  }
  const user = process.env.SMTP_USER || 'info@haus-sonnblick.at';
  const to = process.env.MAIL_TO || 'info@haus-sonnblick.at';
  const mail = buildMail(payload);
  try {
    await sendMail(
      { host: process.env.SMTP_HOST || 'smtp.world4you.com', port: Number(process.env.SMTP_PORT || 587), user, pass },
      { from: user, fromName: 'Website Haus Sonnblick', to, ...mail }
    );
    console.log('Anfrage verschickt:', payload.form_name, '→', to);
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('Versand fehlgeschlagen:', err.message);
    return { statusCode: 500, body: 'Versand fehlgeschlagen' };
  }
};
