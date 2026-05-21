/**
 * Cloudflare Pages Function: Contact Form Handler
 * Path:       /api/contact   (POST only)
 * Runtime:    Cloudflare Workers
 *
 * Pipeline:
 *   1. Body-Size-Cap (10 KB)
 *   2. Honeypot prüfen (Feld `website` muss leer sein)
 *   3. Cloudflare Turnstile verifizieren
 *   4. Felder validieren (Name, Tel, E-Mail, Anliegen, Datenschutz-Checkbox)
 *   5. Rate-Limit pro IP via KV (5/h)
 *   6. E-Mail an Praxis via Resend (https://resend.com — 3000 Mails/Monat gratis)
 *   7. JSON-Response { ok: true } oder { error: '...', fields?: [...] }
 *
 * Bindings (im Cloudflare Pages Dashboard zu konfigurieren):
 *   Environment Variables (alle als "Encrypted" anlegen, ausser RECIPIENT_EMAIL):
 *     - RESEND_API_KEY       (Resend API Key, beginnt mit re_)
 *     - TURNSTILE_SECRET     (Turnstile Secret Key, Server-side)
 *     - RECIPIENT_EMAIL      (z.B. info@zahnaerztehaus-arch.ch oder Test-Adresse)
 *     - SENDER_EMAIL         (Default: onboarding@resend.dev für Test ohne Domain-Verifikation,
 *                             später: noreply@zahnaerztehaus-arch.ch nach Resend-Domain-Verify)
 *   KV Namespaces:
 *     - KV  (für Rate-Limit)
 *
 * Deployment-Hinweise:
 *   - Für Test/MVP reicht SENDER_EMAIL=onboarding@resend.dev. Resend versendet
 *     in diesem Fall nur an die mit dem Resend-Account verifizierte Mail-Adresse.
 *   - Für Produktion: Domain in Resend verifizieren (SPF, DKIM, DMARC DNS-Records)
 *     und SENDER_EMAIL auf noreply@zahnaerztehaus-arch.ch umstellen.
 *   - Resend-API-Doku: https://resend.com/docs/api-reference/emails/send-email
 */

const RATE_LIMIT_PER_HOUR = 5;
const RATE_LIMIT_TTL_SECONDS = 3600;
const MAX_BODY_BYTES = 10240;

const ANLIEGEN_OPTIONS = [
  'kontrolle', 'zahnreinigung', 'erstbesuch', 'schmerz',
  'beratung', 'zahnersatz', 'kindertermin', 'sonstiges',
];

// Termin-Wunsch-Felder — alle optional, leere Werte sind erlaubt (= keine Präferenz)
const ZEITRAUM_OPTIONS = ['', 'zeitnah', '2_wochen', '1_monat', 'flexibel'];
const TAGESZEIT_OPTIONS = ['', 'vormittag', 'nachmittag'];
const ZEITRAUM_LABELS = {
  'zeitnah': 'Möglichst zeitnah',
  '2_wochen': 'Innerhalb 2 Wochen',
  '1_monat': 'Innerhalb 1 Monat',
  'flexibel': 'Flexibel — hat Zeit',
};
const TAGESZEIT_LABELS = {
  'vormittag': 'Vormittag (08–12 Uhr)',
  'nachmittag': 'Nachmittag (12–17 Uhr)',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function htmlEscape(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function validate(data) {
  const errors = [];
  const name = String(data.name || '').trim();
  const tel = String(data.tel || '').trim();
  const email = String(data.email || '').trim();
  const anliegen = String(data.anliegen || '');
  const zeitraum = String(data.zeitraum || '');
  const tageszeit = String(data.tageszeit || '');
  const message = String(data.message || '');
  const datenschutz = data.datenschutz;

  if (name.length < 2 || name.length > 200) errors.push('name');
  if (!/^[0-9+\s\-()/]{7,30}$/.test(tel)) errors.push('tel');
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.push('email');
  if (!ANLIEGEN_OPTIONS.includes(anliegen)) errors.push('anliegen');
  if (!ZEITRAUM_OPTIONS.includes(zeitraum)) errors.push('zeitraum');
  if (!TAGESZEIT_OPTIONS.includes(tageszeit)) errors.push('tageszeit');
  if (message.length > 2000) errors.push('message');
  if (datenschutz !== true && datenschutz !== 'on' && datenschutz !== '1' && datenschutz !== 'true') {
    errors.push('datenschutz');
  }

  return errors;
}

async function verifyTurnstile(token, secret, ip) {
  if (!token) return false;
  const fd = new FormData();
  fd.append('secret', secret);
  fd.append('response', token);
  if (ip) fd.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: fd,
    });
    if (!r.ok) return false;
    const j = await r.json();
    return j.success === true;
  } catch {
    return false;
  }
}

async function checkRateLimit(kv, ip) {
  if (!ip || !kv) return { allowed: true };
  const key = `rl:contact:${ip}`;
  const cur = parseInt((await kv.get(key)) || '0', 10);
  if (cur >= RATE_LIMIT_PER_HOUR) return { allowed: false };
  await kv.put(key, String(cur + 1), { expirationTtl: RATE_LIMIT_TTL_SECONDS });
  return { allowed: true };
}

async function sendEmailViaResend({ apiKey, from, fromName, to, replyTo, subject, text, html }) {
  // Resend erwartet From als "Name <email>" oder nur "email"
  const fromHeader = fromName ? `${fromName} <${from}>` : from;
  const payload = {
    from: fromHeader,
    to: [to],
    subject,
    text,
    html,
  };
  if (replyTo) payload.reply_to = replyTo;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      // Resend gibt im Fehlerfall { name, message, statusCode } zurück —
      // wir loggen das in den Cloudflare Worker-Logs für Debugging.
      const errText = await r.text().catch(() => '');
      console.error('Resend API error', r.status, errText);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Resend fetch failed', e);
    return false;
  }
}

function buildEmailBodies(data, ip) {
  const ts = new Date().toLocaleString('de-CH', {
    timeZone: 'Europe/Zurich',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const zeitraumLabel = ZEITRAUM_LABELS[data.zeitraum] || '';
  const tageszeitLabel = TAGESZEIT_LABELS[data.tageszeit] || '';

  const text = [
    'Neue Anfrage über das Kontaktformular zahnaerztehaus-arch.ch',
    '─'.repeat(60),
    `Name:      ${data.name}`,
    `Telefon:   ${data.tel}`,
    `E-Mail:    ${data.email || '(nicht angegeben)'}`,
    `Anliegen:  ${data.anliegen}`,
    ...(zeitraumLabel ? [`Zeitraum:  ${zeitraumLabel}`] : []),
    ...(tageszeitLabel ? [`Tageszeit: ${tageszeitLabel}`] : []),
    ...(data.message ? ['', 'Bemerkung:', data.message] : []),
    '─'.repeat(60),
    `Eingegangen: ${ts}`,
    `IP:          ${ip}`,
  ].join('\n');

  const wunschRow = (zeitraumLabel || tageszeitLabel)
    ? `<tr><td style="padding:8px 16px 8px 0;color:#57534e;vertical-align:top">Wunsch-Termin</td><td style="padding:8px 0;color:#1c1917">${
        [zeitraumLabel, tageszeitLabel].filter(Boolean).map(htmlEscape).join(' · ')
      }</td></tr>`
    : '';

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#fafaf9;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:8px;padding:32px">
  <h2 style="font-family:Georgia,serif;font-weight:400;color:#0f4c5c;margin:0 0 8px;font-size:24px">Neue Anfrage</h2>
  <p style="color:#57534e;margin:0 0 24px">Über das Kontaktformular zahnaerztehaus-arch.ch</p>
  <table style="border-collapse:collapse;width:100%;font-size:15px;line-height:1.5">
    <tr><td style="padding:8px 16px 8px 0;color:#57534e;vertical-align:top;width:120px">Name</td><td style="padding:8px 0;color:#1c1917"><strong>${htmlEscape(data.name)}</strong></td></tr>
    <tr><td style="padding:8px 16px 8px 0;color:#57534e;vertical-align:top">Telefon</td><td style="padding:8px 0"><a href="tel:${htmlEscape(data.tel.replace(/\s/g, ''))}" style="color:#0f4c5c">${htmlEscape(data.tel)}</a></td></tr>
    <tr><td style="padding:8px 16px 8px 0;color:#57534e;vertical-align:top">E-Mail</td><td style="padding:8px 0">${data.email ? `<a href="mailto:${htmlEscape(data.email)}" style="color:#0f4c5c">${htmlEscape(data.email)}</a>` : '<em style="color:#999">nicht angegeben</em>'}</td></tr>
    <tr><td style="padding:8px 16px 8px 0;color:#57534e;vertical-align:top">Anliegen</td><td style="padding:8px 0;color:#1c1917"><strong>${htmlEscape(data.anliegen)}</strong></td></tr>
    ${wunschRow}
    ${data.message ? `<tr><td style="padding:8px 16px 8px 0;color:#57534e;vertical-align:top">Bemerkung</td><td style="padding:8px 0;color:#1c1917;white-space:pre-wrap">${htmlEscape(data.message)}</td></tr>` : ''}
  </table>
  <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0">
  <p style="color:#a8a29e;font-size:12px;margin:0">Eingegangen: ${ts}<br>IP: ${htmlEscape(ip)}</p>
</div>
</body></html>`;

  return { text, html };
}

export async function onRequest(context) {
  const { request, env } = context;

  // Method
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  // Body-Size
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'payload_too_large' }, 413);
  }

  // Body parsen
  let data;
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await request.json();
    } else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const fd = await request.formData();
      data = Object.fromEntries(fd.entries());
    } else {
      return jsonResponse({ error: 'invalid_content_type' }, 400);
    }
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400);
  }

  // Honeypot
  if (data.website && String(data.website).length > 0) {
    return jsonResponse({ error: 'spam' }, 400);
  }

  // Turnstile
  if (env.TURNSTILE_SECRET) {
    const ip = request.headers.get('cf-connecting-ip') || '';
    const token = data['cf-turnstile-response'] || data.turnstile;
    const ok = await verifyTurnstile(token, env.TURNSTILE_SECRET, ip);
    if (!ok) return jsonResponse({ error: 'turnstile_failed' }, 400);
  }

  // Validation
  const fieldErrors = validate(data);
  if (fieldErrors.length > 0) {
    return jsonResponse({ error: 'validation', fields: fieldErrors }, 400);
  }

  // Rate-Limit
  const ip = request.headers.get('cf-connecting-ip') || '';
  const rl = await checkRateLimit(env.KV, ip);
  if (!rl.allowed) {
    return jsonResponse({ error: 'rate_limit' }, 429);
  }

  // Config-Check: ohne Resend-Key können wir nichts versenden
  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY ist nicht gesetzt');
    return jsonResponse({ error: 'config_missing' }, 503);
  }

  // E-Mail bauen + senden
  const { text, html } = buildEmailBodies(data, ip);
  // Newline-Strip im subject — schützt gegen E-Mail-Header-Injection
  // via name-Feld (\r\n könnte sonst zusätzliche Header einschmuggeln).
  const safeName = String(data.name || '').replace(/[\r\n]/g, ' ').slice(0, 80);
  // Urgency-Tag im Betreff — hilft Céline beim Triage im Posteingang
  const urgencyTag = data.zeitraum === 'zeitnah' ? ' (zeitnah)'
                   : data.anliegen === 'schmerz' ? ' (Schmerz)'
                   : '';
  const subject = `Neue Anfrage: ${safeName} — ${data.anliegen}${urgencyTag}`;
  const sent = await sendEmailViaResend({
    apiKey: env.RESEND_API_KEY,
    from: env.SENDER_EMAIL || 'onboarding@resend.dev',
    fromName: 'Zahnärztehaus Arch — Anfrage-Form',
    to: env.RECIPIENT_EMAIL || 'info@zahnaerztehaus-arch.ch',
    replyTo: data.email || undefined,
    subject,
    text,
    html,
  });

  if (!sent) return jsonResponse({ error: 'email_send_failed' }, 502);
  return jsonResponse({ ok: true });
}
