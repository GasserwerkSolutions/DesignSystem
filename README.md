# Zahnärztehaus Arch — Build-Verzeichnis

Stand: Mai 2026 · Übergabe an Daniela Tamas-Hess geplant

---

## Was hier ist

```
build/
├── index.html              Startseite (13-Section-System)
├── behandlungen/
│   └── index.html          Sammelseite mit 7 Behandlungen (Anker)
├── impressum.html          UWG-konform, mit Platzhaltern
├── datenschutz.html        revDSG-konform, Hostpoint als Hoster
├── 404.html                Branded Error-Page
├── .htaccess               Hostpoint Apache: HTTPS, Security-Header, Caching
├── robots.txt
├── sitemap.xml
└── assets/
    ├── favicon.svg
    └── logo.svg
```

## Vor dem Hochladen — Platzhalter ersetzen

In **impressum.html** suchen und ersetzen:
- `{{VR_PERSONEN_AM_MONTAG}}` → Verwaltungsräte aus HR-Auszug Bern
- `{{BEWILLIGUNG_NR}}` → Bewilligungsnummer Kt. BE (von GSI)
- `{{GLN_NUMMER}}` → GLN aus refdata.ch
- `{{SSO_MITGLIEDSCHAFT_JA_NEIN}}` → "Mitglied der SSO" oder "—"
- `{{DATUM_VEROEFFENTLICHUNG}}` → z.B. "1. Mai 2026"

In **datenschutz.html**:
- `{{DATUM_VEROEFFENTLICHUNG}}` → gleiches Datum

## Was am Montag bei Tamas-Hess klären

| Brauche | Wofür |
|---------|-------|
| VR-Personen | Impressum |
| Bewilligungsnummer Kt. BE | Impressum |
| GLN-Nummer | Impressum |
| SSO-Mitgliedschaft ja/nein | Impressum + ggf. Trust-Bar |
| Familienbezug Claudiu Tamas | Team-Beschreibung schärfen |
| Studienort + Schwerpunkte | Team-Bio aufbauen |
| Bilder-Verwendungsrechte | Hero-Porträt + Team-Fotos |
| Anfahrt: Parkplätze, ÖV, Rollstuhl | Kontakt-Section ergänzen |
| Mailprovider für `info@` | Form-Backend aufsetzen |

## Hostpoint-Deployment

1. **FTP/SSH-Login** an Hostpoint Control Panel
2. Inhalt von `build/` per SFTP nach `/httpdocs/` (oder `public_html/`) hochladen — **inklusive `.htaccess`**
3. **DNS-Check**: domain `zahnaerztehaus-arch.ch` zeigt auf Hostpoint, www-Variante als CNAME
4. **SSL**: Hostpoint Auto-SSL via Let's Encrypt einschalten (Standard im Control Panel)
5. **Test-Aufruf**:
   - `https://zahnaerztehaus-arch.ch/` → soll auf `https://www.URL-DES-KUNDEN.CH // TODO/` umleiten
   - `https://www.URL-DES-KUNDEN.CH // TODO/index.html` → 200 OK
   - `https://www.URL-DES-KUNDEN.CH // TODO/quatsch` → 404-Seite
   - `https://www.URL-DES-KUNDEN.CH // TODO/sthetischer-zahnerhalt` → 301 auf `#zahnerhalt`
6. **Validatoren laufen lassen**:
   - https://search.google.com/test/rich-results — Schema.org Dentist + FAQ
   - https://validator.schema.org — JSON-LD-Syntax
   - https://pagespeed.web.dev — Lighthouse Mobile/Desktop

## Was technisch noch fehlt (Phase 2)

- **Echte Fotos**: Hero-Porträt Tamas-Hess, Team-Porträts (ersetzen Initialen-Platzhalter), Praxis-Aufnahmen
- **Form-Backend**: aktuell `mailto:` — für Production server-seitiger PHP-Endpoint via Hostpoint
- **Self-hosted Fonts**: DM Serif Display + DM Sans als WOFF2 in `/assets/fonts/` (aktuell System-Fallback)
- **Open-Graph-Bild**: `assets/og-image.jpg` (1200×630, Praxis-Foto + Logo) für Social-Sharing
- **Apple Touch Icon**: `assets/apple-touch-icon.png` (180×180)

## Was inhaltlich noch geplant ist (Phase 2)

- **7 echte Detail-Subpages** unter `/behandlungen/{slug}/` für SEO-Long-Tail
- **Praxiseintrag** auf Google Business Profile aktualisieren (neue Inhaberin, Bilder)
- **Bewertungen** sammeln und nach Genehmigung einbinden (Schema.org `aggregateRating`)
- **OnlineTermine.ch oder Denteo** anbinden, sobald Tamas-Hess das wünscht

## Quality-Checkliste durchgegangen

48-Punkt-Audit (`quality/dentist/48-punkt-audit-checkliste.md`):

| Bereich | Status |
|---------|--------|
| A — Erster Eindruck | ✓ Hero, Trust-Bar, Notfall-Bar above the fold |
| B — Vertrauen | ✓ Echtes Team, keine erfundenen Reviews |
| C — Leistung | ✓ 7 Kategorien, patientengerechte Sprache |
| D — Entscheidung | ✓ Triage, FAQ, klare Navigation |
| E — Buchung | ✓ Click-to-call, Form mit Datenschutz-Hinweis, Mobile Sticky-Bar |
| F — SEO | ✓ Schema.org Dentist, kanonische URLs, Sitemap |
| G — Technik | ✓ HTTPS, Security-Header, Impressum + Datenschutz, cookie-frei |
| H — Copy | ✓ SSO-konform, alle Heilversprechen entschärft |

Score: **48/48** zur Übergabe (sobald Platzhalter ausgefüllt + echte Bilder da).
