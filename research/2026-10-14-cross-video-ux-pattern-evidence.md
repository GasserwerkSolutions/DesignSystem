# Vier zusätzliche UX-/Landingpage-Analysen: evidenzgebundene Synthese 02

**Stand:** 2026-10-14 · **Status:** RESEARCH_CANDIDATE / NOT_ADOPTED · **Publication:** BLOCKED.
**Methode:** Vollständige Textdurchsicht von vier bereitgestellten Tactiq-Transkripten. Keine eigenständige visuelle Prüfung der Videos oder ihrer eingeblendeten Vorher/Nachher-Bilder, keine Nachprüfung von vom Sprecher berichteten Kundendaten. Nur präzise, kleine Schlussfolgerungen; **kein universelles Homepage-Template und kein direkter Komponenten-Merge**.

## 1. Eingangsquellen und integritätsgebundene Herkunft

| Kürzel | Video / URL | Transkript SHA-256 (Dateibytes der erhaltenen Textfassung) | Schwerpunkt |
| --- | --- | --- | --- |
| V2 | [Give Me 18 Minutes, I'll Save You Millions in Landing Page Mistakes](https://www.youtube.com/watch?v=K_7_9Ym91ns) | `90d0fd776b7d951adc556b17d084628fd8485720e6510a5660ac6d81702d92c4` | Fünf Landingpage-Fehler und nachhaltige Konversionsqualität |
| V3 | [8 Psychological Tricks That Make Any Website Feel Premium](https://www.youtube.com/watch?v=kBsS5313BmY) | `044b1607fc9a41cb0a5f2ac2fc5c788c6671f3cbe9b949d7161525cb84554625` | Acht Gestaltungs-/Vertrauensheuristiken |
| V4 | [Why Some Apps Just Feel Better (Junior vs Staff UI/UX Designer)](https://www.youtube.com/watch?v=U7jTCgIWS4w) | `988de8d1f7521d6c5341318b478b8d9d4e04b64fb1d2910d7633c098ea5eaf1a` | Vergleichs- und Filter-Interaktion, Entscheidungskontext |
| V5 | [Every UI/UX Concept Explained in Under 10 Minutes](https://www.youtube.com/watch?v=EcbgbKtOELY) | `a84122c66d70886af1622c8b54dc45d9d9a7efb7caa7c70650ece15f1c0eb688` | Signifiers, Hierarchie, Rhythmus, Farbrollen, UI-Zustände |

Früher erfasst: V1 https://www.youtube.com/watch?v=PcwuZJNJny4 — `research/2026-10-14-homepage-landingpage-video-evidence.md`.

Die Hashes dienen **Herkunft und Wiederauffindbarkeit**. Sie beweisen nicht die Richtigkeit der Aussagen. Die gelieferten Transkripte werden **nicht vollständig** als öffentliche Kopie im Repository abgelegt.

## 2. Extraktion: Was genau die Videos empfehlen

### V2 — fünf Landingpage-Fehler (18 Minuten)

| Stelle | Sprecherthese | Prüffähiger Zielvertrag | Eigentum |
| --- | --- | --- | --- |
| 00:33–04:50 | Erste Sekunden: Angebot, Zielgruppe, spezifischer Nutzen und glaubwürdiger Claim verständlich; er nennt Clarity, Specificity, Certainty. | Fünf-Sekunden-Task-Test mit Neuankömmlingen; fehlende Belege blockieren quantitative Claims. | Copy + Fakten = Inhaltsowner, visueller Hero = DS, Auswahl = Studio |
| 04:50–08:02 | Unterschiedliche Besucher-Intention (z. B. Social-Ad vs. Suchanfrage) kann unterschiedliche Seitenfolgen und Kontaktaktionen rechtfertigen. | Optional und **explizit freigegebene**, versionierte Landingpage-Varianten; niemals heimliches Profiling oder CMS-internes Runtime-Umschreiben. | Studio/Website-Vertrag |
| 08:03–13:08 | Jede Sektion soll einen klaren Entscheidungszweck erfüllen; in der Reihenfolge Fragen klären, nicht Füllbilder einsetzen. | Sektionen haben dokumentiertes Kommunikationsziel und notwendige Fakten; Storyboard/UX-Test statt starrer Seitenlänge. | Studio/Kompositionsowner |
| 13:10–14:52 | Nutzen aus Nutzerperspektive erklären statt durchgehend unternehmenszentriertes „wir“. | Copy-Review: Headlines erklären Nutzen ohne unprüfbare Marketingbehauptungen. Nicht jedes „wir“ wird technisch verboten. | Redaktion |
| 14:52–18:19 | Hohe Formular-Conversion kann bei unqualifizierten Leads oder missverständlichen Promotions schaden. Im Beispiel 900 Leads, 80 geeignet (Selbstaussage). | Erfolgsziel = **passende** Handlung, Verständnis und langfristiger Kundennutzen, nicht allein CTR/Conversion. Keine Fake-Knappheit/Countdowns. | Produkt-/Angebotsowner |

### V3 — acht „Premium“-Heuristiken (21 Minuten)

| Stelle | Inhalt | Kandidat für wiederverwendbare Fähigkeit |
| --- | --- | --- |
| 01:50–06:17 | Authentische, zur Leistung passende Bildsprache; auch mehrere reale Personen, Arbeiten oder Prozessschritte statt beliebiger KI-/Stock-Bilder. | `hero` mit optionalen, responsiven Mediengruppen; `editorial-split`/Gallery. Medienherkunft, Einwilligung und Rechte bleiben extern. |
| 06:17–08:00 | Visuelle Reihenfolge von Blick, Überschrift, Lead und Aktion bewusst gestalten. | Hierarchie-/Rhythmus-Tokens und vertragliche Slots in Hero/Section/Card. |
| 08:00–11:15 | Abstrakte Leistungen anhand von Workflow, Materialien, Tabellen oder Beispielen konkretisieren. | `process`, `steps`, `table`, `comparison` als allgemeine Patterns; echte Zahlen niemals erfinden. |
| 11:15–13:26 | Vertrauensnachweise mit greifbaren Quellen/Personen, gut lesbar auch auf Mobilgeräten. | Semantischer `testimonial`-/`proof`-Contract, optionale Quellenlinks, kein fingiertes Logo. |
| 13:26–15:25 | Lesbarkeit und „Chunking“ durch Abschnitte, gut benannte Überschriften und klar navigierbare Hierarchie. | Prose-, Navigation- und Spacing-Vertrag, verständliche Labels. |
| 15:25–17:03 | Abweichender Akzent lenkt Aufmerksamkeit (von-Restorff-Heuristik), z. B. hervorgehobene Wahl oder Aktion. | Semantische Hervorhebungsvarianten statt beliebiger Neonfarben; keine Irreführung. |
| 17:03–19:34 | Bewegungen nur dort, wo sie Bedeutung/Story stützen; keine dekorative Bewegung als Selbstzweck. | Optionaler Motion-Vertrag mit reduzierter Bewegung, statischer Entsprechung und stabiler Lesereihenfolge. |
| 19:34–21:06 | Konsistenter Ersteindruck und Orientierung beeinflussen wahrgenommene Vertrauenswürdigkeit (Halo-Heuristik). | Qualität des **Gesamterlebnisses** prüfen, nicht zusätzliche Einzeleffekt-Komponente erstellen. |

**Korrektur gegenüber Sprecherdetail:** Bei 12:00 empfiehlt der Sprecher eine nicht klickbare Google-Quellenkennung, um Nutzer nicht wegzuführen. Unser Transparenzvertrag darf das **nicht** als Scheinvalidierung übernehmen: Quelle muss echt und nachvollziehbar sein; wo sinnvoll tatsächlicher Nachweis/Link. Bei 15:00 wiederholt er „60.000-mal schneller verarbeitet“ ohne prüfbare Quelle. Bei 19:00 nennt er 50 ms; keine feste UI-Norm daraus ableiten.

### V4 — Interaktion, Vergleich und Entscheidungsfähigkeit (15 Minuten)

| Stelle | Beobachtetes Beispiel | DS-/Website-Anforderung |
| --- | --- | --- |
| 00:00–05:03 | Vier Restaurantlisten: grosse zweckmässige Produktbilder, prägnante Hierarchie, einheitliche Shapes, sichtbare Quick-Filter, wählbare Listenansicht, Details **unter** dem Bild statt fragiler Bild-Text-Overlays. | `card`/List-/Media-Slots, opt-in Layout-Switch, sichtbare Filter und kontextbezogene Suchbeschreibung; Bilder dürfen Daten nicht unlesbar machen. |
| 05:03–10:00 | Immobiliensuche: verstreute Filter auf separaten Seiten verursachen Kontextverlust und zusätzliche Schritte. | Filterzustände gemeinsam sichtbar, bedienbar und leicht rücksetzbar; Änderungen am Ergebnis nachvollziehbar. |
| 10:00–12:36 | Sheet hält Ergebniskontext; Slider + genaue Eingabe erlauben Exploration **und** Präzision; `Show 41 homes` nennt Trefferzahl; direkte Auswahl statt unnötiger Stepper. | `drawer`/Sheet, `slider` + numerische Eingabe, Count-/Statusslot, adaptive Optionen; keine erratenen Ergebniszahlen. |
| 12:36–15:15 | Histogramm, Quantile und verfügbare Zahlen schaffen Entscheidungskontext; Mehrinformationen helfen nur, wenn sie den konkreten Trade-off erklären. | `histogram`/Range/Facet-Pattern als **Kandidat**, nicht Standard für jede Filter-UI; Datenqualität, Live-Synchronisierung, Screenreader-Alternativen und Fehlerszenarien prüfen. |

Der Sprecher unterscheidet sinnvoll zwischen „wenig anzeigen“ und „eine Entscheidung leicht machen“ und weist am Ende selbst darauf hin, dass zusätzliche Information auch stören kann.

### V5 — allgemeine UI-Grundlagen (9 Minuten)

| Stelle | Sprecherempfehlung | Verallgemeinerbarer Contract |
| --- | --- | --- |
| 00:08–01:00 | Signifiers: Zugehörigkeit, ausgewählte Option, Deaktivierung, Hover/Press-State. | State-Grammatik: Auswahl, Disabled, Feedback **nicht nur über Farbe**; DOM-/ARIA-Statuswerte. |
| 01:00–02:05 | Informationshierarchie auf Cards: relevante Daten hervorheben; einfache Wiederholung statt Tabellenlook. | Slots, Typorollen, Medienrollen, Content-Dichte je Zweck statt universellem festen Card-Markup. |
| 02:05–03:18 | Grid als Hilfsmittel statt starrem Zwang; White Space und zusammengehörige Abstände. | Semantische Rhythmus- und Proximity-Tokens, Responsive-/Container-Test. |
| 03:18–04:55 | Typografische Skala, Zeilenhöhe, Tracking, bewusstes Schriftenmanagement. | Dokumentierte Textrollen, Fluid-/Zoom-Prüfung, i18n; keine pauschal fixen sechs Schriftgrössen oder `-3%` Letterspacing. |
| 04:55–06:22 | Primärfarbe, Rampen, semantische Farben; differenziertes Dark-Mode-Layering. | Primitive → Semantic → State; reale Kontrastberechnungen statt „Blau = Vertrauen“-Universalregel. |
| 06:22–07:10 | Zurückhaltende Shadows, eindeutige Icon-Masse/Alignment. | Elevation- und Iconrollen, Zustandssignale + semantische Labels. |
| 07:10–08:35 | Buttons/Input: Default, Hover, Pressed, Disabled, Loading, Focus, Fehler; Aktion bestätigt eine Rückmeldung. | `button`, `field`, `copy-button`, `toast`, Statusmeldungen; Screenreader-kompatibles asynchrones Feedback. |
| 08:35–09:10 | Lesbare Text-Overlays auf Bildern durch Gradient/Blur. | Media-Overlay als optionale, kontrastgeprüfte Behandlung; keine Textlesbarkeit allein abhängig vom Bildmotiv. |

## 3. Widersprüche und Nicht-Normen

| Spannung | Quellenlage | Unser begrenzter Entscheid |
| --- | --- | --- |
| „Above fold fast alles“ vs. „alle scrollen“ | V1/V2/V3 priorisieren Hero; V4 (00:55–01:28) kritisiert das Maximieren sichtbarer Elemente. | **Beides keine universelle Regel.** Erstkontakt muss Angebot/Nächsten Schritt vermitteln; Dichte und Scrolltiefe nach Aufgabe. |
| „Simplicity always wins“ vs. reichhaltige Filter | V1/V3 und V4. | **Entscheidungsaufwand minimieren statt Pixel/Elementzahl minimieren.** Relevante Counts, Kontext und Alternativen ausdrücklich zulassen. |
| Proof überall / nie im Carousel | V1/V3. | Proof nur wenn tatsächlich vorhanden und relevant, sichtbar und überprüfbar. Carousel mit A11y, Controls und Content-Auffindbarkeit als optionales Pattern – nicht pauschal verboten. |
| Immer eine primäre CTA | V1/V2/V3. | Pro Abschnitt ein erkennbares primäres Ziel, aber auf Such-/Vergleichs- und Serviceportalen auch mehrere legitime Handlungen. |
| Immer Benefits / immer „du“ | V2. | Klarer Outcome und faktentreue Claims; in de-CH Kontext **Du/Sie-Brand-Entscheidung**, keine Code-Regel für Wortwahl. |
| Motion als Premium | V3, V5. | Motion ist begründet, opt-in, reduced-motion-respektierend und nicht alleiniger Informationskanal. |
| 60.000x Bildverarbeitung / feste Farbpsychologie / „6 Fonts“ | V3/V5 | Nicht ausreichend belegt oder zu kontextabhängig. Kein Token-/Style-Gate daraus. |
| Quantifizierte Einkommen/Gewinne | V2/V3 | Explizite Fakten-/Provenance-Prüfung; nie exemplarische Einkommen als autorisierte Versprechen übernehmen. |
| Vertrauen durch scheinbar verifizierbare Logos | V3 | Keine reine Glaubwürdigkeitssimulation; Nachweis und Freigabe erforderlich. |
| KPI = maximaler Leadcount | V1 vs. V2 | V2 konkretisiert selbst, dass Leadqualität/Kundennutzen wichtiger sein können als eine isolierte Konversionsrate. |

## 4. Unabhängige Forschungsanker

- NN/g, *Scrolling and Attention* (2018): https://www.nngroup.com/articles/scrolling-and-attention/ — ca. **57 % Betrachtungszeit**, nicht **57 % Nutzer, die nie scrollen**, über dem Fold; Scope ist Messmethode.
- NN/g, *How People Read Online* (2020): https://www.nngroup.com/articles/how-people-read-online/ — scanning und Task-/Motivationsabhängigkeit, prägnante Überschriften.
- Baymard, *Display Applied Filters in an Overview* (aktualisiert 2026): https://baymard.com/research-articles/how-to-design-applied-filters — Kontext der aktiven Filter anzeigen und bequem ändern.
- Baymard, *Product Listing Page UX* (2026): https://baymard.com/blog/product-listing-page-plp-ux — Optionen und Result-Zähler bei grossen Katalogen; Übertragung auf Editor-/Salonfilter **separat testen**.
- W3C WCAG 2.2: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ — Fokus nicht verdeckt, Tastatur-/Target-/State-Prüfung; keine Videophilosophie ersetzt formelle Kriterien.
- W3C Understanding *Focus Visible*: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible — Fokusindikator darf nicht allein durch Hover entstehen.
- W3C Understanding *Contrast Minimum*: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html — Text auf Bild/Overlay muss gemessen werden.

Das Video-Versprechen „Millionen sparen“, CRO-Lift-Zahlen und die illustrativen Staff-vs-Junior-Screens sind **keine unabhängige quantitative Studie** und belegen nicht kausal die einzelnen Layoutentscheidungen. Kein blindes Kopieren fremder Screens oder Assets.

## 5. Kandidaten für unsere DS-Komponentenqualität

| Capability | Mögliche bestehende DS-Quelle | Zusätzliche Probe | Priorität |
| --- | --- | --- | --- |
| Hero-Hierarchie und Medienoption | `patterns/hero.css`, `patterns/editorial-split.css` | Ein CTA/mehrere rechtmässige Aktionen, Long Copy, 320px, Medienvarianten, Text auf Bildern | Hoch |
| Card-Content-Grammatik | `components/card.css`, `components/list-row.css` | Vollständigkeit und Hierarchie bei unterschiedlichen Medien/Aufgaben, Containerbreiten | Hoch |
| Signifier-/Feedback-Staaten | `button`, `field`, `copy-button`, `toast` | Loading, Fehler, Erfolg, Pressed, Disabled, Keyboard, SR-Live-Feedback | Hoch |
| Filter-/Result-Kontext | `components/segmented.css`, `slider.css`, `drawer.css`, `table.css` | kombinierte Auswahl, Undo/Reset, Livecounts (echte Daten), Range-Input, 320px | Hoch für Studio-Consumer, nicht jede Website |
| Vertrauensnachweise | `patterns/trustbar.css`, ggf. Testimonial-Pattern | Leerer Proof, fehlende Einwilligung, Quellenlink, kein fingiertes Logo, responsive | Hoch für geeignete Websites |
| Layout-/Textrollen | `base/typography.css`, `base/layout.css`, `semantic/` | Heading-Outline, Dichtevarianten, Scanning, 200%-Zoom, Fonts bei de-CH | Hoch |
| Purposeful Motion | `state/`, UI-JS | prefers-reduced-motion, statische Äquivalenz, kein Information-Loss | Mittel |
| Authentische Medien | Medien-/Bild-Pattern + Consumer Asset-Vertrag | Alt, Ratio, Crop, responsive, Copyright-/Rechtegates, Source/Consent | Hoch; Bildrechte nicht DS |
| Vergleich/Histogramm | `chart.css`, `range.css`, `table.css` | numerische Präzision, zugängliche Datenalternative, Verfügbarkeit, keine Scheinstatistik | Kandidat |

**Keine dieser Tabellenzeilen ermächtigt das DS zum Verfassen von Kundencontent, zur automatischen Seitenkomposition, zur Erhebung von Analytics oder zum Release.** Die Videos informieren die Fähigkeiten; Studio-/Inhaltsowner entscheiden die konkrete Verwendung.

## 6. Falsifizierende Tests und Gate-Vorschläge

1. **UX-V01 Hero-Relevanz:** zwei echte Aufgaben (informationssuchend vs. aktiv kontaktbereit), 5-Sekunden- und Task-Completion-Test auf Mobil/Desk; Ergebnis erklärt Unterschiede, kein pauschaler Konversionsclaim.
2. **UX-V02 Text-Hierarchie:** Überschriften-only/links-only lässt Thema, Zielgruppe und Handlung erkennen; keine leeren Marketingfloskeln als autorisierte Fachclaims.
3. **UX-V03 Kontextbewahrender Filter:** Nutzer setzt 2–3 Facetten, sieht aktive Werte, echte Resultcounts, entfernbare Auswahl und Feedback zu Null-Ergebnissen; Tab/Screenreader und schmale Viewports.
4. **UX-V04 Card-Medienrobustheit:** unterschiedliche Bilder/Verhältnisse/fehlende Bilder; Text bleibt ausserhalb unlesbarer Overlays, Crop verhindert kein Verständnis; gleicher DOM-Contract.
5. **UX-V05 Proof-Fail-Closed:** kein Quellnachweis/fehlende Rechte/Null Reviews → keine fake fünf Sterne, keine invented testimonial wall; kein Layoutbruch.
6. **UX-V06 Status-Feedback:** Toggle, Copy, Slider und Save: sichtbarer+programmgesteuert erfassbarer Status; Error, pending, complete; keine doppelte Aktion bei Re-Mount.
7. **UX-V07 Motion-Bewusstsein:** Scroll-/Aufbauanimation nicht notwendig für Informationszugang; reduced-motion-Alternative behält Text, Reihenfolge und Aktionen.
8. **UX-V08 Content-Rechte:** Traffic-spezifische Variantenseite und emotionale Bildgruppe nur nach Studiofreigabe und Quellen/Rechte-Prüfung, kein heimliches Visitor-Profiling.
9. **UX-V09 False-Friend:** Höherer Leadcount gilt **nicht** als PASS, wenn Missverständnisse/ungeeignete Leads/Abbrüche zunehmen; Produktowner definiert Zielmetrik.
10. **UX-V10 Pattern-Diff:** bei zwei divergierten Implementierungen gleiche semantische Fixture, Styles/Tokens/Keyboard/Bildfälle vergleichen; Rückwärtskompatibilität an Git-Pins.

**Gate-Modell:** Forschungseinschätzung = `HEURISTIC` oder `INDEPENDENT_RESEARCH`; Normannahme `NOT_ADOPTED` bis Review. Messresultate `PASS|FAIL|UNKNOWN|N_A`, je Test und Consumer. **Fehlende Messung bleibt UNKNOWN**, kein stiller PASS.

### Ergebnis / nächste Maßnahme

Vor einer Komponentenübernahme zuerst konkrete DOM-/State-/Slot-Contracts und Test-Fixtures für **Hero, Card, Filter, Button/Feedback, Trust/Proof und Medien** definieren. Die beiden DS-Quellimplementierungen danach gegen denselben Vertrag ausführen, und nur dann den Implementierungseigentümer auswählen. Website-Studio, Salon und Kundensysteme bleiben ausserhalb dieses Research-PR unverändert.
