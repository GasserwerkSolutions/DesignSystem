# Startseite / Landingpage: Video-Hypothesen und unabhängige Gegenprüfung 01

**Status:** RESEARCH_CANDIDATE — KEIN normativer Komponenten- oder Kompositionsentscheid.
**Datum:** 2026-10-14.
**Ausgangsquelle:** https://www.youtube.com/watch?v=PcwuZJNJny4
**Transkript:** Vom Auftraggeber bereitgestellter Tactiq-Export mit Zeitmarken, keine Video-Bildanalyse.
**Im Video berichteter Umfang:** >1.500 untersuchte Landingpages (Selbstaussage; keine prüfbare Primärstichprobe, Analyseprotokolle oder Rohdaten vorgelegt).
**Kontext:** Conversion-orientierte Landingpages (Lead/Sales). Nicht ohne Weiteres universell für Startseiten, Navigation, Behörden-, Informations- oder Portfolioseiten.
**Owner:** Website-Strategie/Studio entscheidet Seitenziel, Claims und Struktur. DesignSystem besitzt die Darstellung/States/DOM seiner Pattern-Bausteine.

## Sieben konkrete Kandidaten

| ID | Quelle (Video-Zeit) | Behauptung/Empfehlung aus dem Transkript | Prüffähige Hypothese – keine Norm | DS-Komponente/Pattern oder externe Zuständigkeit |
| --- | --- | --- | --- | --- |
| LP01 | 00:45–04:54 | Klarer erster Eindruck, benefit headline, USP-Lead, Vertrauensnachweis, CTA, Risikoabbau, ergänzendes Bild | Nutzende erkennen Zielgruppe, Nutzen und nächste Handlung nach kurzem Blick; Mobilversion transportiert Wesentliches | `hero`, `site-header`, `button`, optional `trustbar`; Claim/Hero-Auswahl gehört dem Studio |
| LP02 | 05:07–07:22 | Emotionale Passung über Bilder und Copy; Problem–Agitate–Solve | Zielgruppentypische Bild-/Textbeispiele sind verständlicher/relevanter als neutrale Alternativen, ohne irreführende Aussagen | `editorial-split`/Medienbehandlung; Texte/Bilder/Rechte bei Content-Owner |
| LP03 | 07:25–09:16 | Seitenlänge an Entscheidungsbedarf binden; wichtige Inhalte auf Mobile nicht in Carousels verstecken | Aufgabenabschluss/Informationsauffindbarkeit hängt von klarer Struktur und Präsentation ab, nicht allein von Seitenlänge | `section`, `service-grid`, `faq-section`; Reihenfolge Studio/Seitenvertrag |
| LP04 | 09:17–10:37 | Nutzer scannen; aussagekräftige Zwischenüberschriften | Überschriften-only-Skimming erklärt das Angebot und erleichtert Auffindbarkeit | Heading/Type-Rollen, Layout-Abstände, semantische Struktur; Copy bei Content-Owner |
| LP05 | 10:38–12:49 | Verifizierbare statt generische Social-Proof-Elemente | Reale Reviews mit Quellen sind glaubwürdiger als unattribuierte generische Behauptungen | `trustbar`, `testimonial` nur bei erlaubter Daten-/Rechte-Basis; keine erfundenen Bewertungen |
| LP06 | 12:50–14:50 | Klarer visueller Primär-/Sekundär-Hierarchieverlauf | Nutzer erkennen und finden die primäre Handlungsoption ohne visuelle Konkurrenz | `hero`, `button`, Typografie- und Kontrasttokens |
| LP07 | 14:50–16:15 | Konventionelle, verständliche Anordnung vor unverständlicher Originalität | Gestaltungsvarianten dürfen Brandcharakter tragen, ohne Verständlichkeit/Task Completion zu senken | Komponentenvarianten; Studio entscheidet Akzente, UX-Tests prüfen Auswirkungen |

## Nicht als universelle Evidenz übernehmen

1. **„60 % scrollen nicht“**, **„80–90 % Gestaltungsaufwand nur oben“**: Keine Quelle/Stichprobe im Transkript. Unabhängige NN/g-Forschung berichtet **57 % der Viewing-Time** oberhalb des Folds und **74 %** in den ersten zwei Viewports (Studie 2018); das ist eine *andere Messgrösse*, keine Bestätigung der 60%-Nichtscrollrate. Quelle: https://www.nngroup.com/articles/scrolling-and-attention/
2. **„Bilder 60.000-mal schneller als Text“**: Im Transkript unbelegte populäre Behauptung; nicht normieren.
3. **Conversion-Lifts 38 %, 40–60 %, 64 %, 80 %, 108 %, 132 %, 282 %**: vom Sprecher berichtete Einzelfälle/Tests. Ohne Segment/Control/Sample/Statistik nicht verallgemeinerbar. Das Video zeigt kein reproduzierbares Datenset.
4. **Zwei Proofs oberhalb des Folds, eine CTA, immer lange Landingpage**: kontextsensitive Marketingheuristik. Navigation, Angebotsbreite, Such-/Informationsaufgaben und Mobile können andere Architektur erfordern.
5. **„Simplicity beats creativity every single time“**: absolute Aussage; unser Vertrag formuliert stattdessen „Klarheit und Aufgabenlösung dürfen durch Kreativität nicht beschädigt werden“.

## Unabhängige Triangulation

- NN/g, „Scrolling and Attention“ (2018): https://www.nngroup.com/articles/scrolling-and-attention/ — Priorisierung sichtbarer Inhalte; **kein** allgemeines starres Seitenlängen-/Fold-Gesetz.
- NN/g, „How Users Read on the Web“ (1997): https://www.nngroup.com/articles/how-users-read-on-the-web/ — Scanverhalten, präzise Subheadings, kurze Informationseinheiten.
- Baymard, Homepage & Category Navigation UX (2026): https://baymard.com/research-articles/ecommerce-navigation-best-practice — zeigt, dass die Homepage bei E-Commerce auch **Navigationsanker** und Produktsuche ist; Optimierung ist mehr als Conversion-Hero, Transfer auf Salon-/B2B-Sites separat zu prüfen.

## Vertrag statt Pauschaltemplate

**In DesignSystem:** klar dokumentierte, wiederverwendbare `site-header`, `hero`, CTA/Buttons, Text-Hierarchie, Trustbar-/Testimonial-*Behandlungen*, `service-grid`, `editorial-split`, `faq-section`, Footer – jeweils mit DOM, Slots, A11y/Keyboard, responsive Verhalten, Tone/Mode/Space/Shape/Weight und Proof-Optionalität. Eine Komponente wird nicht allein wegen Videoempfehlung neu erstellt: vorhandene Pattern zuerst auf Slot-Coverage und Profil-Auslieferung prüfen.

**Im Website-Studio:** Zielgruppe, emotionaler Ansatz, Primärziel, Textaussagen, Reihenfolge, Sichtbarkeit und Auswahl der Pattern; autorisiert und versioniert, nicht vom Compiler erfunden.

**In Content-/SAFE-Verträgen:** Beweistext, echte Quellen, Erlaubnis zur Veröffentlichung, Bildrechte, Fachinformationen und CTA-Ziel. Fehlende Reviews, Buchbarkeit oder Leistungsversprechen **offen lassen**, nicht generisch auffüllen.

## Kleine Widerlegungs-/Abnahme-Fixtures

- **T01 / 5-Sekunden-Test:** echte Nutzer sehen Desktop-/Mobil-Startseite kurz; benennen Zielgruppe, Angebot, primären nächsten Schritt. Bewertungsmassstäbe und Stichprobe **vor Test** definieren.
- **T02 / Überschriftenfolge:** Nur Überschriften und sichtbare primäre Links scannen; Angebot und Entscheidungsschritte sollen nachvollziehbar bleiben. Gegenprobe: generische Section-Titel.
- **T03 / No-proof:** Leeres, widersprüchliches oder nicht lizenziertes Review => kein Fake-Logo, kein künstlicher Stern, kein layoutbrechender Leerplatz.
- **T04 / Mobile:** notwendige Angebotsinformationen, CTA und evidenzkritische Texte werden bei 320 CSS px/Zoom weder versteckt noch abgeschnitten; Accordion/Carousel nur mit zugänglicher, sichtbarer Alternative, wenn erforderlich.
- **T05 / Brand vs Klarheit:** Varianten mit unterschiedlicher visueller Charakterstärke in Task-Tests; keine Verallgemeinerung aus subjektiver Präferenz.
- **T06 / Accessibility:** Screenreader-Heading-Sequenz, Keyboard-Zugang zur CTA, Fokus sichtbar, ausreichender Kontrast, Reduced Motion, Links mit verständlichen Namen.
- **T07 / Conversion:** Nur bei vergleichbarer Zielgruppe/Traffic/Attribution und ausreichend Messzeit experimentieren; kein öffentliches Website-Analytics-Modul im DesignSystem erforderlich.

**Bewertung:** Quelle = HEURISTIC / CONTEXTUAL; Normstatus = NOT_ADOPTED; DesignSystem-Pflichtcode = KEINER bis Review. Vollständige Bilder/Layouts aus dem Video sind aus dem vorliegenden Transkript **nicht** visuell analysierbar; für Pixel-/Kompositionsvergleiche braucht es das Bildmaterial und Nutzungsrechte.
