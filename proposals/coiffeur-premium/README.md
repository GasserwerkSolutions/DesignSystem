# Coiffeur-Premium 01 — „Quiet Atelier“

**Dokumenttyp:** Gestaltungskandidat und Kompositionsvertrag · **Datum:** 2026-10-14 · **Status:** REVIEW_REQUIRED · **Freigabe:** keine · **Geltung:** Friseursalons/Coiffeure mit bewusstem Premium-Angebot, **nicht** automatisch alle Salons.

**Wichtig:** Dies ist **kein** neues Theme in der veröffentlichten DS-Bibliothek, keine Veröffentlichung und kein Ersatz für Salon-/SAFE-Fachdaten. Alle Formulierungen im visuellen Preview sind DEMO-Texte, keine Aussagen über einen existierenden Salon. Fotografien, Preisen, Standort, Team, Öffnungszeiten und Buchungslinks dürfen nur aus autorisierter Quelle kommen.

## Aktueller Arbeitsmodus: Copy vor visueller Überarbeitung

**Entscheid 2026-10-14:** Die experimentelle Variante „Bold Editorial“ wurde zurückgenommen. Diese Version („Quiet Atelier“) dient nur als **visuelle Ausgangslage**. Zuerst müssen emotionaler Hero-Titel und fachlich konkreter Subtext formuliert, verglichen und vom Owner freigegeben werden; erst danach wird die Gestaltung an die Botschaft angepasst.

Der Textentwurf und seine offenen Copy-Entscheidungen sind in [HERO-COPY-01.md](./HERO-COPY-01.md) dokumentiert. Demo-Text der Browser-Vorschau ist noch **nicht** ersetzt: Die Texte bleiben bis zur Freigabe Kandidaten.

## 1. Gestalterische Richtung

**Leitidee:** Editoriale Ruhe, echtes Haarhandwerk, menschliche Beratung, verständliche Buchung. Hochwertig durch sorgfältige Typografie, grosse Bildqualität, klare Hierarchie, konsistentes Materialgefühl, zurückhaltendes Feedback und echte Aussagen – nicht durch stereotype Gold-Effekte, Auto-Play-Videos oder künstliche Bewertungen.

**Ausgangsprofil im existierenden DesignSystem:**
\`data-tone="premium" data-mode="light" data-space="wide" data-shape="soft" data-weight="fine"\`.

**Alternative zum Entscheiden:** derselbe Inhalt mit \`data-shape="defined"\` und \`data-space="normal"\`. Die Differenz ist bewusst auf Form und Raum begrenzt. Nicht jede Coiffeur-Marke benötigt Soft.

> Der derzeitige Premium-Tone besitzt \`--h1-transform:uppercase\` und \`--h1-letter:2px\`; lange de-CH-Headlines müssen visuell geprüft werden. Die Kombination warmes „Atelier“ und der vorhandene fast monochrome Premium-Tone ist zunächst ein separates **opt-in Behandlungsprofil**, kein Grund für eine rückwirkende Änderung aller bestehenden Premium-Consumers.

## 2. Visuelle Tokens (Entwurf, keine pauschale CSS-API)

| Rolle | Kandidatenwert | Verwendung und Grenzvertrag |
| --- | --- | --- |
| \`salon.canvas\` | \`#F6F2EB\` | Warme helle Fläche, keine globale \`--color-bg\`-Neudefinition |
| \`salon.surface\` | \`#FFFCF7\` | Inhaltsflächen, sparsam |
| \`salon.stone\` | \`#E4DCD0\` | Flächengliederung / subtile Layer |
| \`salon.ink\` | \`#292725\` | Text und primäre Aktion auf heller Fläche |
| \`salon.muted\` | \`#625B54\` | Sekundärtext, nach Kontrastprüfung |
| \`salon.accent\` | \`#806653\` | gedämpfter Material-Akzent, kein universeller Text-/Fokus-Token |
| \`salon.hairline\` | \`#CBC1B5\` | Haarlinien für Gruppen nur bei genügend 3:1 Non-Text-Kontrast, wenn funktional |
| \`salon.inverse\` | \`#262321\` | ruhiger dunkler Interlude mit sehr hellem Text |

Diese Werte sind **explizite Designhypothesen**. WCAG-Farbkontrast ist auf dem tatsächlichen Hintergrund und im gerenderten Modus zu messen; dekorative Haarlinien sind anders zu beurteilen als funktionsrelevante Input-/Control-Konturen. Dark Mode braucht semantische Neuauflösung, **keine** automatische Inversion.

### Typografische Rollen

Das erste neue Video hat 44 in Figma gesichtete DesignSystems und 127 Styles nach Display / Heading / Body / Label klassifiziert. Es berichtet, dass ca. 75 % der untersuchten Systeme am ehesten an einer Major-Second-Skala lagen, ausdrücklich mit Rundungen/Abweichungen. **Keine** ausreichend geprüfte Qualitätsnorm für Coiffeure und kein Auftrag, die existierende CSS-Skala zu ersetzen.

| Rolle | Entwurfsbereich bei 16px Root | Verhalten |
| --- | --- | --- |
| Display / Hero | 36–68px fluid (responsive \`clamp\`) | Serif oder markeneigene Headline; 1.05–1.17 Zeilenhöhe, optisches Tracking nur fontabhängig; 2–4 Zeilen vermeiden |
| Heading L / M | 28–40 / 22–30px | saubere semantische Heading-Hierarchie, kein dekoratives H1-Duplikat |
| Body / Lead | 16–18 / 18–20px | Sans, Zeilenhöhe 1.5–1.65; max 60–70ch, auch bei Zoom |
| Label/Navigation | 14–16px | nicht pauschal unter 14px, funktionale Labels nicht nur in Versalien |
| Preise/Zeiten | Textrollen je Aufgabenhierarchie | tabellarische Ziffern bei Tabellen, explizite Einheiten und Bedingungen |

Bestehender DS-Tokensatz: \`--font-serif\` derzeit Playfair Display→Georgia; \`--font-sans\` derzeit DM Sans→System. Der Consumer muss tatsächliche Lizenzen, self-hosting und Fallback-/Font-Loading-Layout-Shift prüfen. **Keine neue Schriftfamilie ohne einzelne Qualitätsprüfung.**

Responsive Typografie: kleine Bildschirme skalieren vorrangig Display und grosse Headings. Kleine Body-/Label-Textgrössen nicht automatisch schrumpfen. 200 % Textvergrösserung und 320 CSS px Reflow müssen bestehen.

### Abstands- und Formsprache

Die zweite neue Videoanalyse basiert laut Sprecher auf 43 Systemen und 611 Spacing-Einheiten. Häufige Werte: 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 und 128px. Dies bestätigt **nur deskriptiv** die grundsätzliche Struktur der bestehenden rem-basierten \`--space-*\`-Skala. Kein zwingender 8px-Grid für jedes Element und kein fester Wert von 1rem = 16px; Browser-Root ist konfigurierbar.

Der bestehende Formachsenvertrag bleibt maßgeblich:

| Einstellung | Normal | Wide (Zielrichtung) |
| --- | ---: | ---: |
| Interne Component-Gaps | 8px | 16px |
| Gruppen-/Layout-Gaps | 16px | 32px |
| Component-Padding | 16px | 32px |
| Abschnittsrhythmus | 48px | 96px |
| Inline-Seitenluft | 16px | 24px |

Shape: **Soft** für Medienecken / Cards / Controls im vorhandenen Rollenvertrag, **Defined** als bewusst deutlich kantigere Alternative. Stroke: **Fine** für dezente Kontrolle und Hierarchie; Strong nur bei Relevanz/Accessibility oder separater Branch-Identität. Ein innenliegender Radius ist bei eingerahmter Media-Komponente optisch zum Aussenradius und tatsächlichen Padding zu prüfen, nicht mechanisch immer „Radius = aussen − padding“.

**Keine** reinen Dekorationsabstände als Domänenfakten. Relative/rem Einheiten behalten; logische Eigenschaften statt \`left/right\` für layoutabhängige Kanten.

## 3. Startseitenkomposition (vertragliche Option, keine fixe Branchenvorlage)

| Reihenfolge | Pattern (bestehende DS-Quelle) | Kommunikationsaufgabe | Autorisierte Daten und Fallback |
| --- | --- | --- | --- |
| 0 | \`site-header\`, \`nav\`, \`button\` | Salonidentität, Leistungen, Team, Kontakt, klare erste Terminaktion | Salonname, Standort und Buchungsziel nur aus Fachdaten; ohne Buchungsziel auf Kontakt navigieren, keine funktionslose Buchungsaktion |
| 1 | \`hero--split\`, \`button\` | Was bietet der Salon für wen; prägnante H1, Lead, 1 primäre Handlung; reales Salonbild als stimmige Ergänzung | Foto/Textspezifikation durch Studio; ohne lizenziertes Bild hochwertige neutrale Fläche, keine fremde Salonfotografie |
| 2 | \`section-head\`, \`service-grid\` | verständliche Hauptleistungen sichtbar machen | Namen, Dauer, Preise und Buchbarkeit einzig aus vertraglich autorisierten Leistungen; fehlende Preise **nicht** erfinden |
| 3 | \`editorial-split\` | Handwerk, Atmosphäre, Team und Beratungsprozess zeigen | reale authentische Portraits/Prozessfotos mit Einwilligung; ohne Originalbilder keine künstlichen Teamprofile |
| 4 | \`trustbar\` / Referenzen | Vertrauen durch nachprüfbare Informationen, nicht Fake-Social-Proof | **optional**; nur echte, lizenzierte und belegte Testimonials / Plattformquellen |
| 5 | \`faq-section\` / Leistungsdetails | Unsicherheiten reduzieren: Terminablauf, Beratung, Pflege, Storno, Preise | nur faktisch autorisierte Antworten, keine pauschalen Policies |
| 6 | \`cta-band\`, \`contact-section\`, \`site-footer\` | nächste Handlung, echte Kontaktwege, Anreise, rechtlich erforderliche Informationen | Standort, Kontakt/Öffnungszeiten/Datenschutz nur aus autorisiertem Salon- und Website-Vertrag |

**Nicht im ersten Viewport erzwingen:** komplette Preisliste, alle Teamprofile, animierter Slider, Fake-Rezensionen. Die Videos widersprechen sich teilweise bei „alles über dem Fold“; Qualitätsziel ist schnelle Verständlichkeit plus sinnvolle Fortsetzung, nicht maximale Informationsdichte.

### Alternative Kompositionen

1. **Atelier Editorial** (hier bevorzugt): Hero Split → Leistungen → Arbeitsweise/Team → Fakten/FAQ → Abschluss. Gute Wahl bei individueller Beratung und hochwertigem Styling.
2. **Portfolio First**: Hero mit eigenem Referenzfoto → Hair-Portfolio → Leistungen → Team → Buchung. Nur bei tatsächlicher Bildqualität und vorhandenen Rechten.
3. **Book First**: konkretisiertes Angebot/Terminabsicht → schnelle Auswahl → FAQ → Team. Bei hoher Such-/Buchungsintention; Datenqualität/Buchungssystem ist Pflicht.

Ein einzelner Kunden-Webseiten-Compiler darf diese Reihenfolge nicht automatisch aus Servicepreisen, Salonname oder Fotos erfinden. Studio entscheidet Struktur, Content-Owner entscheidet Claims; DS zeichnet autorisierte Patterns.

## 4. CSS-Komponenten-Raster: die zwölf Kategoriegruppen vollständig berücksichtigt

| Kategorie | Konkreter Premium-Einsatz | Prüfung |
| --- | --- | --- |
| Layout/Position | Grid-Split-Hero, flexible Actions, sticky Header optional | Fokus/Sticky nicht verdeckt, keine unnötigen z-index-Konflikte, Container Queries mit \`.cq\` |
| Box/Dimensionen | rem-Padding, max Inline Content, intrinsische Bilder | 320px ohne Überlauf, keine abgeschnittenen Buttons/Preise, größere Schrift |
| Oberfläche/Farben | ruhige Flächen, wenige Linien, semantische Accent-Rollen | Text 4.5:1, relevante UI 3:1, reale Dark-/Forced-Colors-Fälle |
| Typografie | Display/Heading/Body/Label, zwei Schriftrollen, optische Rhythmik | H1 nur einmal; Lesbarkeit bei de-CH, Langwort, 200% Textvergrösserung |
| Interaktion/Zustand | CTA, Nav, Accordion, sichtbare Focus-/Hover-/Disabled-/Pending-Zustände | Tastatur/Enter/Space, zugängliche Namen, keine \`pointer-events:none\`-Pseudo-Deaktivierung |
| Motion | zurückhaltende 120–220ms Übergänge, kein Auto-Scroll-Zwang | \`prefers-reduced-motion\`, CLS, keine notwendigen Informationen hinter Animation |
| Responsivität/Overflow | Hero split nur bei Platz, Cards stapeln sinnvoll | echte 320px/Tablet/Zoom- und Container-Tests, keine Horizontal-Scroll-Unfälle |
| RTL/Schreibsystem | \`padding-inline\`, \`margin-block\`, \`inset-inline-start\`, \`text-align:start\` | Sprache/RTL und lange Beschriftungen testen |
| Accessibility | Focus Visible, 44px Ziel für wichtige Touch-Aktionen, 24px WCAG-AA-Target oder Ausnahmen | unabhängiges WCAG-2.2-AA-Gate, Screenreader + manuelles Review |
| Tokens/Modes | Premium + getrennte Formachsen, nicht produktgebundene semantische Rollen | altbewährte öffentliche Tokenwerte/Imports nicht brechen |
| Cascade/Isolation | Consumer-Premium-Behandlung nur opt-in und unter eigener Namespace | kein allgemeiner Komponenten-Selector aus Salon-CSS, keine zweite Button-Wahrheit |
| Assets/Inhalt | echte Bilder mit definierter Ratio, Alt/Consent/Srcset, Quellenbelege | reservierte Bildabmessungen, LCP-Bild prio wenn angezeigt, keine Rechte-/Datenhalluzination |

## 5. Reviewfragen & überprüfbare Zielgates

- **PV-01 Inhalte:** Echte Datenquelle pro Feld (Name, Leistungen, Preise, Zeiten, Buchbarkeit, Team, Media, Reviews). Unbekannte Angaben bleiben leer/blockiert. „Termin buchen“ nur mit funktionierendem Ziel.
- **PV-02 Erstverständnis:** Nutzer benennt in kurz begrenztem Hero-Blick **Salonart, relevanten Nutzen, nächste Handlung**. Nicht allein Konversionszahl messen.
- **PV-03 Typografie:** Display/Body/Label-Rollen mit überprüften Zeichenabständen, langen de-CH-Zeichenfolgen, Browser-Fallbackfonts, 200 % Zoom.
- **PV-04 Layout:** Hero/Grid/Media 320px/768px/1280px und in engen Embed-Containern; Inline/Block-Richtungen, kein Cut-off.
- **PV-05 A11y:** WCAG 2.2 AA Ziel, Color/Non-Text-Kontrast, Focus order, Keyboard, Screenreader, Reduced Motion, Forced Colors. Automatisierte Checks allein ≠ Konformität.
- **PV-06 Perf:** Reale LCP/INP/CLS im Consumer; Bildquellen/Responsive-Verteilung; keine heavy Auto-Play-Hero-Medien; poster/width/height und genau prioritisiertes Hero-Bild falls LCP.
- **PV-07 Theme/Form:** Premium × Normal/Wide × Soft/Defined × Fine/Strong, mindestens risikobasiertes Pairwise; keine Veränderung anderer Branchen.
- **PV-08 Distribution:** exakter DesignSystem-Pin, geschlossene CSS-Importkette inklusive Patternprofile, Visual Goldens menschlich reviewt, Rückrollbarkeit.
- **PV-09 Fachverhalten:** Preise/Serviceangebote/Team/Buchbarkeit aus Salon-/SAFE-Quelle; Verlagern der Verantwortung ins DesignSystem = FAIL.
- **PV-10 Sichtentscheid:** mindestens zwei Gestaltungsachsen mit identischen Inhalten und Blick-/Nutzungstests; ästhetisches Owner-Review erforderlich.

Mindestabnahme: **alle Pflichtgates PASS** mit Quellen-SHA, Testreport und visueller Owner-Freigabe. **UNKNOWN zählt nicht als PASS.**

## 6. Forschungsherkunft

**Vom Nutzer gelieferte Transkripte (keine Bildanalyse):**

- „Typography for 44 Design Systems“, 44 beobachtete Systeme, 127 Text-Styles: SHA-256 \`c5d46d9f856f2991fb885f0e056649ff4e80646f1a88c646606c9dce08cdaf5e\`.
- „Spacing Variables / 43 Design Systems“, 43 Systeme, 611 Spacing-Einheiten: SHA-256 \`77f29b50689ab5722292caa428737b2991212fbd567590c28701c4cfc467ee29\`.
- Frühere fünf Nutzer-Videos mit Landingpage/UX/Einzelkomponenten-Heuristiken sind in separatem Draft PR #24 erfasst. Dieses Dokument nutzt die Schlussfolgerungen als **Gestaltungshypothesen**, nicht als W3C-Norm.

**Unabhängige Prüfnormen/Forschung:**

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), AA-Ziel mit Handtests.
- [USWDS – Optical Size](https://designsystem.digital.gov/design-tokens/typesetting/overview/) als Hinweis auf Schriftmetriken und nicht nur nominale Pixel.
- [Google web.dev – Fetch Priority](https://web.dev/articles/fetch-priority) für echte LCP-Medien.
- [Nielsen Norman Group – Scrolling & Attention](https://www.nngroup.com/articles/scrolling-and-attention/) für First-Screen-Aufmerksamkeit **ohne** die falsche Gleichsetzung mit „60 % scrollen nie“.

## 7. Grenzen dieses Vorschlags

Hier wird **keine** Markenentscheidung oder neue branchenspezifische CSS-Wahrheit publiziert. Preview-Styles sind bewusst nur \`reviews\`/isoliertes Proposal, nicht in \`main.css\`, \`themes/premium.css\`, \`patterns/website.css\` oder \`dist/\`. Der dokumentierte DesignSystem-Standard aus Draft #24 und der Button-Review aus Draft #25 bleiben unabhängig und werden nicht still freigegeben.
