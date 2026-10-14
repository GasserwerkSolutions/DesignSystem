# DesignSystem-Standard 2026 — Konsolidierungskandidat 01

**Status:** REVIEW_REQUIRED · **Geltung:** ausschliesslich Gasserwerk DesignSystem als zukünftige öffentliche UI-/Interaktionsquelle · **Stand:** 2026-10-14.

**Nicht:** verabschiedeter neuer Release, WCAG-Konformitätserklärung, Browserabnahme oder Erlaubnis zur automatischen Übernahme. Erst fachliche Review/Owner-Freigabe und nachweisbare Gates machen diesen Vorschlag normativ.

## 1. Ziel und harte Eigentumsgrenze

Das eigenständige `GasserwerkSolutions/DesignSystem` ist die **eine kanonische Bibliothek** für wiederverwendbare UI-Grammatik: primitive/semantische Tokenverträge, CSS-Skins, Zustände, zugelassene Komponenten- und Pattern-DOM-Verträge sowie deren eigener Lifecycle-JS. Es bleibt CSS-first und frameworkneutral.

Konsumierende Produkte (Studio, Salon, Kundeneditor, Musikraum) sind verantwortlich für ihre Domänenfakten, zugelassene Kompositionen, Inhalte, Markenwahl, Berechtigungen und Serverfunktion. Kein Produkt darf einen gleichnamigen öffentlichen DesignSystem-Baustein parallel implementieren. Produktinterne UI und Domänenvisualisierungen bleiben dort, solange sie nicht nachweislich verallgemeinerbar sind.

**Qualität ist zweistufig:** (A) die Bibliothek muss isoliert, real gerendert und paketiert korrekt sein; (B) jeder konkrete Consumer muss sein Profil, seine Slots, Daten, Interaktionen und Release-Pins zusätzlich beweisen. A ist notwendig, niemals hinreichend für B.

## 2. Gebundene Quellinventur: zwei, nicht drei Design-System-Linien

Quelle A: `GasserwerkSolutions/DesignSystem@acb1dc6036947b6a7b6f27d2b9dc35dd4c75f900` (`main`, zur Prüfung gebunden).
Quelle B: `GasserwerkSolutions/gasserwerk@0767375a42e6ab5e5220b3da660ec4617fc83a97`, Teilbaum `packages/design-system/` (`main`, zur Prüfung gebunden).

Die vollständige maschinenlesbare, pfad- und Git-Blob-hashgebundene Inventur liegt in `audit/two-source-inventory-2026-10.json`. Es sind 210 nicht generierte, eindeutige Dateipfade: 108 byteidentisch, 50 verschieden, 25 nur in B, 27 nur in A. Das ist eine **Datei-** und keine Verhaltenszählung. `dist/` ist absichtlich ausgeschlossen: Generierte Dateien müssen beim Ziel-Release reproduzierbar aus den Quellen entstehen.

Von 57 Komponenten-CSS-Dateien in A und 58 in B liegt genau `components/calendar.css` nur in B; 15 gemeinsam benannte Komponenten-CSS-Dateien unterscheiden sich. Unter anderem `card`, `button`, `nav`, `combobox`, `popover`, `otp-input`, `stat` und `tree`. Zehn gemeinsame JS-Quelldateien divergieren. Die vollständigen Pfade sind im JSON.

### Eigentumsentscheid vor Übernahme — Vorschlag

- **IDENTICAL:** eine Kanonquelle behalten, Dublette später entfernen.
- **DIVERGED:** eine funktions- und regelbasierte Drei-Wege-Synthese; niemals neueste Datei allein per Datum oder Copy-overwrite gewinnen lassen. Jede geänderte Funktion erhält einen Herkunftsvermerk und Test.
- **ONLY_CANONICAL:** aktuell bestehen lassen.
- **ONLY_MONOREPO:** auf Wiederverwendbarkeit prüfen; `components/calendar.css` ist Kandidat für einen allgemeinen Calendar/Time-Grid-Vertrag, jedoch **noch kein freigegebener Import**.
- **`themes/studio.css`:** Studio-Produktfarbe und `--studio-*`-Tokens nicht als allgemeine DesignSystem-Semantik deklarieren. Entweder beim Consumer belassen oder in ein strikt opt-in, klar benanntes Produkt-Profil auslagern, nach dokumentiertem Eigentumsentscheid.
- **`theme.css`:** technisch sinnvoller Token-only-Entry für Consumer ohne globale Reset/Component-CSS; generischen Exportvertrag im DS erproben, **nicht** die alte Kopie blind übernehmen.
- **Beide Pattern-Implementierungen:** CSS-Selektoren, Semantik, Container-Voraussetzungen, Bindings, responsive Informationsvollständigkeit und Provenance diffen; weder Website-Generator noch Editor/Factory zur zweiten Quelle erheben.

### No-Go

Kein direkter `main`-Merge von Konsumenten-CSS, kein Repository-Grosskopieren, keine unautorisierten Design-/Fachentscheidungen, keine automatische Entfernung alter Consumer-Styles, kein Publish auf Basis dieses Dokuments.

## 3. Quellenhierarchie: externe Norm versus interner Vertrag

| Thema | Autoritative Primärquelle | Unser messbarer Mindestvertrag |
| --- | --- | --- |
| Accessibility | W3C WCAG 2.2 (Recommendation): https://www.w3.org/TR/WCAG22/ | **WCAG 2.2 AA** als angestrebter Lieferstandard; Component-Tests plus finale Seitentests; keine blosse Testtool-Zahl als Konformitätsbeweis |
| Widget-Interaktion | WAI-ARIA APG: https://www.w3.org/WAI/ARIA/apg/ | Native HTML bevorzugen; bei Custom Widgets semantische Rollen, Name/Description, Tastatur, roving focus, Escape/Tab/Focus Restore gemäss passendem Pattern nachweisen. APG ist Guidance, keine eigene W3C Recommendation |
| Design-Tokens | DTCG Format/Color/Resolver 2025.10: https://www.designtokens.org/tr/2025.10/ | vendorneutraler, expliziter, versionierter DTCG-Export als **Kompatibilitätsziel**; Alias-Ketten, Typen und Mode-Auflösung validieren; bestehende CSS-Custom-Properties bleiben stabil, bis Migration getestet ist |
| CSS-Layers | MDN + CSS: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40layer | ein deterministischer Layer-Vertrag; keine Spezifitäts-Eskalation und keine verdeckten Overrides |
| Container-Queries | https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries | Komponenten verhalten sich in engen und weiten Hosts korrekt; Medien-/Container-Fallbacks und kleine Viewports testen |
| Web Performance | https://web.dev/articles/vitals | Komponentenkosten und reale Seitenqualität getrennt messen: LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1 bei p75 sind **Seitengrenzen**, nicht garantierbar durch DS allein |

DTCG 2025.10 ist ein **stabiler Community Group Report**, keine W3C Recommendation. WCAG AA ist ebenfalls kein blosses CSS-Style-Profil; Autoreninhalte, Integrationen und vollständige Seiten bestimmen mit, ob der Endzustand konform ist.

## 4. Kanonische Architektur und Importgrenzen

Die bisherige Ordnerstruktur bleibt erste Wahl, um öffentliche Pfade nicht unberechtigt zu brechen:

- `tokens/`: primitive Werte; DTCG-Quellen oder dokumentierte Konverter, keine inkonsistenten Shadow-Werte.
- `semantic/`: Rollen, Zustände, Modes, Dichte und festgelegte Formachsen; keine Produkt- oder Salonfakten.
- `themes/`: ausschliesslich semantische Tokenbelegungen, keine direkten Komponenten-Selektoren.
- `base/` und `state/`: kontrollierte Foundations.
- `components/`: eine deklarierte DOM-/Styling-/State-Grammatik pro Komponente.
- `patterns/`: wiederverwendbare semantische Kompositionen mit dokumentierten notwendigen Kindern, nicht Geschäftslogik.
- `js/`: minimaler, auf- und abbaubarer Lifecycle; keine geheimen Listener, keine Produktautorisierung.
- `profiles/` und `manifest/`: tatsächlich baubare, import-geschlossene und paketierte Consumer-Profile.
- `dist/`: **nur** deterministisch erzeugte Derivate mit Hash- und Quellmanifest.
- `docs/` und `tests/`: Verträge, positive/negative Browser-Fixtures, Designreview und Versionierung.

### Kaskaden- und Achsenverträge

Aktuelle öffentliche Achsen aus dem Bestands-DS: `data-tone` (sieben Tones), `data-mode` (light/dark/auto), `data-density` (compact/comfortable/spacious) und `@container`. Die neu integrierten Formen verwenden zusätzlich `data-space=compact|spacious`, `data-shape=defined|soft`, `data-weight=fine|strong`. Diese **nicht durch Namensgleichheit vermischen**: `density` ist nicht ohne Entscheid dasselbe wie `space`, und `weight` meint Strichstärke, nicht Schriftschnitt. Produktseitige Brand-Variablen ebenfalls nicht still zum vierten Formparameter erklären.

Erwartete Schichtenfolge: `reset, tokens, semantic, themes, mode, base, state, components, patterns, treatments, utilities, overrides`. Das verbindliche Verhalten umfasst die Import-Semantik: CSS-`@import` vor gewöhnlichen Style-Regeln; Profile müssen die tatsächlich importierte, erreichbare Kette liefern, nicht lediglich CSS-Dateien im Manifest nennen. Die bestehende DS-Cascade/Export-Politik bleibt bis zur Review unverändert.

`defined` mit 2px Mindest-Eckenradius für gestaltbare Formen ist eine **Gasserwerk-Produktentscheidung**, keine WCAG-Forderung. Ausnahme funktionaler Geometrien (z. B. Kreisavatar) bleibt erlaubt; zugehörige Scope-Tests Pflicht.

## 5. Qualitätsvertrag pro Komponente (Definition of Done)

Eine Komponente darf erst als **PUBLIC_SUPPORTED** geführt werden, wenn all dies dokumentiert und nachweisbar ist:

1. **Eigentum/Benennung:** stabiler ID, Autor, Zweck, Nichtzweck, semantische Rolle, kein zweiter öffentlicher Implementierungseigner; Status `INTERNAL|CANDIDATE|PUBLIC_SUPPORTED|DEPRECATED`.
2. **DOM-Slots:** exakte HTML-Struktur, verpflichtende/optionale Kinder, Name/Description, Content-Überlauf, leere und fehlerhafte Zustände; keine versteckte Abschneidung erforderlicher Informationen.
3. **Zustände:** default, hover, active, focus-visible, selected, disabled, loading, error, success, empty sofern fachlich sinnvoll; Zustände nicht allein über Farbe vermitteln.
4. **Barrierefreiheit:** native Semantik, Keyboard/APG, Focus Order/Restore, Screenreader-Name/Status, 1.4.3 Textkontrast (4.5:1 normal, 3:1 gross), 1.4.11 Non-Text-Kontrast (3:1 für relevante UI-Bestandteile), 2.4.11 Focus Not Obscured, 2.5.8 Target Size (mindestens 24×24 CSS px oder normgerechte Ausnahmen), 1.4.10 Reflow (320 CSS px), Zoom/Textabstände; Projektziel **44×44 px** für wichtige Touch-Aktionen ist stärker als WCAG-AA-Mindestmass.
5. **Variabilität:** light/dark, Tone-Auswahl, Density/Space/Shape/Weight-Kombinationen wo anwendbar; High Contrast/forced-colors, reduced-motion, rtl/dir und lange de-CH/fremdsprachige Texte; CSS logical properties bevorzugen.
6. **Layout:** Containerbreite und responsive Kontext statt nur Viewport; Listen/Tabellen dürfen dokumentierte 2D-Ausnahmen nutzen, nicht still Information verstecken.
7. **JavaScript:** setup/cleanup idempotent, keine Leaks beim Re-Mount/SSR, Escape/Focus, Abbruch, fehlende DOM-Kinder, Touch/Pointer/Keyboard, keine HTML-Injection; per-Komponente Import neben opt-in SetupAll.
8. **Styles:** dokumentierte Tokenrollen und CSS-Hooks, keine beliebigen Consumer-overrides oder `!important`-Waffen; Styleisolierung, globaler Reset und Theme-Only-Einstieg getrennt.
9. **Paketierung:** CSS/JS/Typen tatsächlich im exakten Release, Importketten geschlossen, deklarierte Profile gebaut, npm-pack und CDN-/Selfhost-Pin, keine Nachladen-von-main-Abhängigkeit.
10. **Tests/Evidenz:** Unit-/Contract-/DOM-/Browser-/Visual-/A11y-Proben inklusive Negativfälle, mehrere Browser-Engines und Viewports, Release-Hash, dokumentierter Reviewer.
11. **Versionierung:** SemVer/Changelog pro public API, Deprecated-Pfade mit Migrationsplan, Consumer-Fixture und definierter Breaking-Change-Regel.
12. **Sicherheit & Datenschutzeffekte:** kein untrusted HTML/URL-Sink, keine impliziten Netzwerkanfragen, keine Secrets in CSS/JS/HTML, keine verdeckte Telemetrie.

Es besteht **kein** Automatismus, dass alle Kombinationen aller Zustände pixelgenau sein müssen; die kombinatorische Matrix wird mit paarweiser Abdeckung und gezielten harten Risikofällen konstruiert. Kontrast, Focus, Lesbarkeit und Funktion sind für kritische Kombinationen systematisch zu prüfen.

## 6. Prüf- und Freigabegates (Vorschlag, noch nicht implementiert)

| Gate | Exakter PASS-Beweis | Negativfall |
| --- | --- | --- |
| DS-G00 Quellen/Eigentum | Git-SHAs, File-/Token-/Selector-Owner eindeutig; Disposition pro Differenz | Produkt-CSS überschreibt öffentliches Card-Verhalten |
| DS-G01 Tokenmodell | primitive → semantic → mode/theme deterministisch; DTCG-Export validiert | zirkuläre Token-Aliase, unbekannte Token-/Typwerte |
| DS-G02 DOM/State | benannte Fixtures pro Komponente mit allen vertraglichen Slots, State-Transition und Focus | fehlende Labels, Focus-Trap, doppelte ID |
| DS-G03 A11y | automatisiert + manuelle Keyboard-/Screenreader-Prüfung der kritischen Patterns, WCAG-Matrix | unsichtbarer Fokus, 320px-Reflow-Verlust, Kontrast |
| DS-G04 Theme/Achsen | alle dokumentierten relevanten Achsen gegen echte Hosts und Build | `defined` = 0px; Shape beeinflusst Density |
| DS-G05 Styles/Scope | Cascade-Order, Profil-CSS und product-private Token-Grenzen | zweiter `.card`-Writer; Theme stylt Component |
| DS-G06 JS/Lifecycle | Setup/Cleanup/SSR/Reinitialisierung und validierte States | doppelter Listener nach Re-Mount |
| DS-G07 Distribution | npm-pack + geschlossene Importkette + dist-Reproduktion + Manifest-Hashes | existierende Quelldatei, aber fehlendes gepinntes Profil |
| DS-G08 Visuelle Qualität | menschliche Reviews gegen dokumentierte visuelle Referenzen + Browser-Screenshots | Golden ohne fachliche Freigabe erneuert |
| DS-G09 Consumer-Verträge | mindestens ein neutraler Fixture und ein realer Consumer pro Profil, pinned version | Salon braucht nicht ausgelieferte Aussage |
| DS-G10 Release | alle Pflichtgates grün, Reviewer, Changelog, Rollbackversion | rot/grün durch stillen Fixture-Wechsel |

Jeder Gate-Bericht hat `PASS|FAIL|UNKNOWN|NOT_APPLICABLE`, Source SHA, ausführbares Kommando, Bericht und Reviewer; `UNKNOWN` zählt nie als PASS. Ein geglückter DS-Publish ist keine Freigabe eines Website-Releases.

### Schwachstellen am heutigen Stand

- Builder-Profil besitzt eigenes Manifest, aber positive Auslieferung muss rekursiv gegen die echte CSS-Importkette und den tatsächlichen Release geprüft werden.
- `aussage` ist noch Gegenstand eines **separaten Draft-PR #23**; kein stilles Einrechnen in v0.32.0 oder main.
- Produktinternes `themes/studio.css` darf nicht versehentlich einen allgemeinen Tone-Vertrag verändern.
- Das Monorepo hat eigene `components/calendar.css` sowie Divergenzen in 15 Component-CSS-/10 JS-Dateien. Für diese Unterschiede fehlen in dieser Arbeitseinheit noch Browser-Differenztests.
- README-Aussagen wie „WCAG-AA validiert“ müssen an konkretes Scope, Komponenten, Version und Testevidenz gebunden werden; keine pauschale Zertifizierung ableiten.

## 7. Migrationsreihenfolge ohne Big Bang

**M0 — Gate-Basis:** Inventar auf SHAs pinnen; jede DIVERGED/ONLY_MONOREPO-Datei klassifizieren; Prüftools und Owner-Review beschliessen. Keine Laufzeitänderung.

**M1 — DesignSystem-Hauptzweig:** zuvor vorgesehenen Branch-/PR-Scope bereinigen; vor jedem Merge Commit/Abhängigkeit/CI/A11y/Visual-Goldens prüfen; nicht alle Dependabot-PRs automatisch mergen. Gegenwärtig separate Aussage- und Golden-Drafts; main nicht nachträglich durch alten Branch zurücksetzen.

**M2 — Foundations:** Tokenformat, Formachsen, Theme-Only-Profil, Layer- und Style-Isolation in eigenem kleinen PR. Alte öffentliche CSS-Variablennamen bis nach proven migration nicht brechen.

**M3 — Komponenten:** pro zusammengehöriger Domäne kleine, revertierbare PRs. Erst Dialog-/Form-/Navigation-/Feedback-/Layout-Risiken und die 15 divergierten CSS-Komponenten; Calendar nur nach Eigentumsentscheid. Funktion, Semantik, QA vor Optik.

**M4 — Patterns/Lifecycle:** fünf divergierte Patterns und zehn divergierte JS-Quellen, Importclosure und Consumer-Fixtures; keine Site-Komposition aus Branchenheuristiken in die DS-Library importieren.

**M5 — Release:** unabhängiger DS-Release aus dem kanonischen Repo, maschinenlesbare öffentliche Komponenten/Profilmanifest-Bindung, echte Browsermatrix, deterministische dist-Hashes. Unfertige Einträge nur als INTERNAL/CANDIDATE.

**M6 — Consumer-Umstellung:** zuerst Gasserwerk-Salon-Pilot/Builder-Fixture, anschliessend Studio und weitere Systeme auf exakt gepinnte Releases umstellen. Duplikate erst entfernen, wenn Consumer-Build und Rollback nachgewiesen sind.

Der abschliessende Normstatus dieses Dokuments wird erst mit gesonderter Owner-/Reviewer-Freigabe geändert. Die Quelle aller noch ungelösten Unterschiede bleibt das unveränderte Hash-Inventar.
