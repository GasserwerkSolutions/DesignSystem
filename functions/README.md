# Cloudflare Pages Functions — Setup-Anleitung

Diese Site nutzt zwei Pages Functions als API-Endpunkte:

```
/api/contact   POST → /functions/api/contact.js   (Form-Submission)
/api/reviews   GET  → /functions/api/reviews.js   (Google Reviews Cache)
```

## 1. Pages-Project anlegen

Im Cloudflare Dashboard:

1. **Pages → Create a project → Connect to Git** (oder Direct Upload für den Anfang)
2. Production-Branch: `main` (oder Direct Upload des `build/`-Folders)
3. **Build-Command: `node _workshop/scripts/validate-html.js`** — statische HTML-Validierung als Deploy-Gate. Fehlt das Closing-Tag, ist ein `<script>` mid-statement abgeschnitten, oder hat eine inline-IIFE einen JS-Syntax-Error → Deploy bricht ab. Verhindert genau die Truncation-Klasse von Bugs, die am 2026-05-10 die ganze Mobile-Nav lahmgelegt hat (Details: `_workshop/scripts/validate-html.js`-Header).
4. Build-Output-Directory: `/` (wenn `build/` direkt deployed wird) oder `build` (wenn aus Repo-Root)

Pages erkennt den `functions/`-Folder automatisch und deployt die Functions als Worker.

## 2. KV-Namespace anlegen

Im Cloudflare Dashboard:

1. **Workers & Pages → KV → Create a namespace**
2. Name: `zaa-arch-kv` (oder beliebig)
3. Notiere die Namespace-ID

## 3. KV an Pages-Project binden

1. **Pages-Project → Settings → Functions → KV namespace bindings**
2. **Add binding**
   - Variable name: `KV`
   - KV namespace: das eben angelegte Namespace
3. **Save**

> Variable name muss exakt `KV` sein — die Workers greifen via `env.KV` zu.

## 4. Environment Variables setzen

**Pages-Project → Settings → Environment variables → Production:**

### Für `/api/contact`

| Variable | Wert | Beschreibung |
|----------|------|--------------|
| `RESEND_API_KEY` | `re_...` | Resend API-Key (siehe Schritt 6) |
| `TURNSTILE_SECRET` | `0x4AAAAAA...` | Cloudflare Turnstile Secret Key |
| `RECIPIENT_EMAIL` | `info@zahnaerztehaus-arch.ch` | Empfänger der Anfragen |
| `SENDER_EMAIL` | `onboarding@resend.dev` (Test) oder `noreply@zahnaerztehaus-arch.ch` (Produktion mit DKIM) | Absender, siehe Schritt 6 |

### Für `/api/reviews`

| Variable | Wert | Beschreibung |
|----------|------|--------------|
| `GOOGLE_PLACES_API_KEY` | `AIza...` | Server-Key, Restricted auf Places API |
| `PLACE_ID` | `ChIJ...` | Google Place ID des Zahnärztehaus Arch |
| `EXCLUDE_AUTHORS_CSV` | `Max Muster,Jane Doe` | Komma-separierte Liste der Review-Autoren, die rausgefiltert werden sollen (Mitarbeiter, Konflikte). Kann leer bleiben. Ersetzt frühere Hardcode-Liste — keine Mitarbeiter-Namen mehr im Git-Repo. |

> **Encrypted** anhaken bei `RESEND_API_KEY`, `TURNSTILE_SECRET` und `GOOGLE_PLACES_API_KEY` — die Keys sind dann im Dashboard nicht mehr lesbar.

## 5. Cloudflare Turnstile einrichten

1. **Cloudflare Dashboard → Turnstile → Add site**
2. Domain: `zahnaerztehaus-arch.ch` (plus `localhost` für Dev)
3. Widget Mode: **Managed**
4. Notiere Sitekey + Secret
5. Sitekey gehört in den Mainsite-HTML-Code (siehe `frontend-integration.md`)
6. Secret als Environment Variable `TURNSTILE_SECRET`

Turnstile ist kostenlos. Standard-Limit 1 Mio Verifications/Monat — für eine KMU-Site weit mehr als genug.

## 6. Mail-Versand: Resend einrichten

`/api/contact` sendet E-Mails über **Resend** (https://resend.com). Bis 2024 lief das über MailChannels — wurde umgestellt, weil MailChannels den Free-Tier für Cloudflare Workers gestrichen hat.

### Resend-Account und API-Key

1. Bei [resend.com](https://resend.com) registrieren
2. Im Dashboard → **API Keys** → **Create API Key**
3. Name z.B. `zaa-contact`, Permission `Sending access`, Domain `All domains`
4. API-Key kopieren (beginnt mit `re_`, wird nur einmal angezeigt)
5. Im Cloudflare-Pages-Dashboard als Environment Variable `RESEND_API_KEY` setzen (Encrypted!)

### Test-Modus: `onboarding@resend.dev`

Für initiale Tests reicht es, `SENDER_EMAIL=onboarding@resend.dev` zu setzen. Resend versendet damit aber **nur** an die Mail-Adresse, mit der der Resend-Account registriert ist. Reicht für Smoke-Tests, nicht für Produktion.

### Produktion: eigene Domain verifizieren

Damit Resend von `noreply@zahnaerztehaus-arch.ch` versenden darf, muss die Domain in Resend verifiziert werden:

1. Resend-Dashboard → **Domains** → **Add Domain** → `zahnaerztehaus-arch.ch`
2. Resend zeigt drei DNS-Records zum Eintragen:

```
Type:  TXT
Name:  resend._domainkey
Value: <DKIM-Public-Key, von Resend angezeigt>

Type:  TXT
Name:  @
Value: v=spf1 include:_spf.resend.com ~all

Type:  TXT
Name:  _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@zahnaerztehaus-arch.ch
```

3. DNS-Records bei deinem DNS-Provider (Cloudflare DNS oder beim Domain-Registrar) anlegen
4. In Resend auf **Verify** klicken — kann ein paar Minuten dauern
5. Sobald grün: `SENDER_EMAIL=noreply@zahnaerztehaus-arch.ch` in den Pages-Env-Vars setzen

### Resend Free-Tier

3000 Mails/Monat gratis, 100 Mails/Tag. Für eine Praxis-Site mit erwarteten 5–30 Anfragen/Monat reicht das mit grosser Reserve.

## 7. Google Places API einrichten

1. **Google Cloud Console → APIs & Services → Library**
2. **Places API** aktivieren
3. **Credentials → Create credentials → API key**
4. Restrict-Konfiguration:
   - **Application restrictions**: HTTP referrers — leer lassen (wir rufen Server-side auf)
   - **API restrictions**: Restrict key → nur **Places API** aktivieren
5. Place ID via https://developers.google.com/maps/documentation/places/web-service/place-id ermitteln
6. Beide Werte als Pages Environment Variables: `GOOGLE_PLACES_API_KEY` + `PLACE_ID`

> Places API ist nicht kostenlos. Place Details mit `reviews,rating,user_ratings_total` Fields kostet ~17 USD pro 1000 Requests. **Mit dem 24h-Cache des Workers sind das ~30 Requests pro Monat = praktisch null Kosten.**

## 8. Deployment-Verify

Nach dem ersten Deploy:

```bash
# Form-Endpoint Smoke-Test (Honeypot-Block sollte greifen)
curl -X POST https://www.URL-DES-KUNDEN.CH // TODO/api/contact \
  -H 'content-type: application/json' \
  -d '{"website":"http://spam.example","name":"Bot","tel":"123","anliegen":"sonstiges","datenschutz":true}'
# Erwartung: { "error": "spam" }, Status 400

# Reviews-Endpoint
curl https://www.URL-DES-KUNDEN.CH // TODO/api/reviews
# Erwartung: { "rating": 4.9, "user_ratings_total": 18, "reviews": [...], "cached": false, ... }
# Beim zweiten Call: { ..., "cached": true }
```

## 9. Lokales Testing (optional)

Für lokales Testing mit `wrangler`:

```bash
npm install -g wrangler
cd build/
wrangler pages dev . --kv=KV
```

Environment Variables lokal in `.dev.vars` (nicht in Git):

```
TURNSTILE_SECRET=1x0000000000000000000000000000000AA  # Test-Secret von CF
RECIPIENT_EMAIL=test@example.com
SENDER_EMAIL=noreply@zahnaerztehaus-arch.ch
GOOGLE_PLACES_API_KEY=AIza...
PLACE_ID=ChIJ...
```

> Test-Secret `1x0000000000000000000000000000000AA` (passing) und `2x0000000000000000000000000000000AA` (failing) — siehe https://developers.cloudflare.com/turnstile/troubleshooting/testing/
