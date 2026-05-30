# ADR-006: Exit-Path-Enforcement via `:has()` (CLEAR 4 Prinzip 2)

**Status**: Accepted (v0.30.0)
**Datum**: Mai 2026
**Verfassung**: [CLEAR 4 — Nervensystem-Philosophie](#) Prinzip 2

## Context

ADR-003/004/005 haben den Color- und Motion-Pfad der Verfassung
gefiltert. Übrig blieb Prinzip 2:

> "Kein Zustand ohne Ausgang. Jeder Fehlerzustand zeigt einen Weg nach
> vorn. Jeder Empty-State zeigt eine nächste Handlung. Jeder Ladezustand
> hat ein erkennbares Ende."

Drei Component-Familien tragen diese Verantwortung konkret:

1. **`.empty-state`** — laut Spec/Docs immer mit CTA, in der Praxis
   konnte man das Markup ohne `button`/`a` schreiben, ohne dass das
   System irgendetwas sagte. Stille Verletzung.
2. **`.alert--danger`** — Fehler ohne sichtbare Vorwärts-Bewegung
   (Action ODER Close-Button) ist eine Sackgasse. Markup-Level nicht
   erzwungen.
3. **`.spinner`** — Indeterminate-Loading hat per se kein Ende; der
   Horizont muss durch SPRACHE entstehen (`aria-label` mit Subjekt;
   visible-text-Companion). Dokumentation war nicht streng genug,
   `aria-label` wirkte optional.

Layer-1-Prevention (Lint) ist für diese Verletzungen ungeeignet — das
Lint-Tool kennt nur CSS, nicht HTML-Konsument-Markup. Ein Konsument
schreibt sein Markup außerhalb des Repos.

## Decision

**Strukturelle Selbst-Anzeige via `:has()` direkt in der Komponenten-
CSS.** Wenn die Component die Exit-Path-Verpflichtung verletzt, zeigt
sie SELBST einen sichtbaren Hint — im Markup, in Production, neben dem
eigentlichen Inhalt. Drei konkrete Mechanismen:

### 1. `.empty-state:not(:has(button, a))::after`

```css
.empty-state:not(:has(button, a))::after {
  content: "ℹ Empty-State braucht eine nächste Handlung (CLEAR 4 P2)";
  display: block;
  margin-block-start: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--status-info-bg);
  color: var(--color-text-secondary);
  border-inline-start: 3px solid var(--color-info);
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  font-family: var(--font-mono);
}
```

Ein `.empty-state` ohne `button` ODER `a` zeigt einen status-info-
gefärbten Hinweis. In Production sichtbar — Verfassungs-Verletzung
ist ein Bug, kein zu versteckendes Detail.

### 2. `.alert--danger:not(:has(button, a))::after`

Gleicher Mechanismus, andere Botschaft:
`"ℹ Fehler braucht einen Weg nach vorn (CLEAR 4 P2)"`. Zusätzlich
`flex-wrap: wrap` auf den Verletzungs-Fall, damit der `::after`-Block
auf eine neue Zeile rutschen kann — der nicht-verletzende Standardfall
bleibt single-row.

### 3. Spinner — Header reinforced, `aria-label` mandatory

Spinner ist keine CSS-Verletzung sondern ein Sprach-Pattern.
`spinner.css`-Header wurde umgeschrieben:

- `aria-label` ist nicht mehr "ARIA-Hinweis" sondern **explizite
  Verpflichtung**: "Ohne ihn ist der Spinner ein Verfassungs-Verstoß
  (Loading ohne erkennbares Ende für SR-Nutzer)."
- Beispiel-Markup zeigt `aria-label="Lädt Buchungen …"` — Subjekt
  benannt, nicht generisches "Lädt …"
- Empfehlung: für `>3s`-Operationen `.progress` mit determinable
  Anteil statt `.spinner`. (Konstitutionell — kein CSS-Enforcement.)
- `spinner-block`-Pattern dokumentiert den visible-text-Companion
  als bevorzugte Variante: der Horizont entsteht durch das Wort,
  nicht durch die Bewegung.

### 4. Forced-Colors-Sichtbarkeit der Hints

`state/state.css` ergänzt im `@media (forced-colors: active)`-Block:

```css
.empty-state:not(:has(button, a))::after,
.alert--danger:not(:has(button, a))::after {
  background: Canvas;
  color: CanvasText;
  border-inline-start-color: CanvasText;
  forced-color-adjust: none;
}
```

Damit bleibt der Hint auch unter Windows-High-Contrast lesbar.

## Layer-2 Self-Test — `runExitPathEnforcement()`

`scripts/check-site.js` verifiziert die `:has()`-Regeln am echten
Browser-Computed-Style. Eine Fixture-HTML neben `main.css` rendert
vier Markup-Varianten und probt `getComputedStyle(el, "::after").content`:

| Markup | Erwartung |
|---|---|
| `.empty-state` ohne CTA | ::after hint sichtbar |
| `.empty-state` mit CTA | KEIN ::after |
| `.alert--danger` ohne button/a | ::after hint sichtbar |
| `.alert--danger` mit `.alert__close` | KEIN ::after |

`hasHint(p)` ist heuristisch: `content !== "none"`, `!== "normal"`,
`length > 5`. Reicht für die binäre Frage "hint rendered or not".

Jeder failing Check exited mit 1 — Layer-2-Self-Test verhindert
deterministisch, dass jemand die `:has()`-Regel versehentlich
breaking commitet (z.B. durch typo in Selektor, neue Subkomponente
die `button`-Match stiehlt, oder Tone-Override der content-Eigenschaft).

## Consequences

### Vorteile

- **Konstitutions-konform** — Empty-State ohne nächste Handlung
  zeigt sich selbst an, Alert-Sackgasse zeigt sich selbst an.
- **Markup-Layer-Enforcement aus CSS heraus** — kein zusätzliches
  Tooling am Konsumenten-HTML notwendig. Funktioniert sofort.
- **Production-visible** — Verletzungen sind keine Debug-Only-
  Warnings sondern visible Hints. Designer + Reviewer sehen sie
  ohne DevTools.
- **Layer-2-Self-Test deterministisch** — keine Mutation-Magic
  notwendig, die computed-style-Probe ist der Test.
- **forced-colors-safe** — auch im High-Contrast-Mode lesbar.

### Trade-Offs

- **Hint ist sichtbar in Production** — ein Konsument der das
  Markup falsch schreibt sieht den Hint live. Das ist
  beabsichtigt, kann aber überraschen. Mitigation: ADR + CHANGELOG
  + sichtbarer Hint dokumentieren das Pattern.
- **`:has()` Browser-Support** — Baseline 2024+. Älteres Chromium
  vor 105 / Safari vor 15.4 würde den Hint nicht zeigen, aber auch
  nicht regressieren — die Component bleibt funktional, nur das
  Self-Anzeige-Feature fehlt. Akzeptabel.
- **Test-Setup über data:URL funktionierte nicht** — Chrome erlaubt
  keine `file://`-Stylesheets aus data:URL-Kontext. Korrekt-Setup
  schreibt eine temporäre Fixture neben `main.css`, navigiert per
  `file://` dort hin. Cleanup im finally.

### Mitigations

- **Hint-Botschaft enthält Component + Prinzip + Verfassungs-Ref**
  — ein Reviewer der den Hint sieht weiß sofort woran es liegt
  und welche Stelle im Markup fehlt.
- **status-info Farb-Coding** — der Hint sieht nicht aus wie ein
  Fehler, sondern wie ein hinweisender Status. Ruhige Farbe, nicht
  alarmierend (in Übereinstimmung mit Prinzip 4).

## Alternatives Considered

### "Build-Time HTML-Lint" (Reject)

Pro: keine Production-visible-Marker.
Contra: braucht Knowledge über das Konsumenten-Markup (das wir nicht
haben — das System ist eine reine CSS-Library). Funktioniert nur
für die eigene Doc-Site, nicht für Library-Konsumenten.

### "DevTools-Warning via JS" (Reject)

Pro: präzise Konsolen-Message.
Contra: erfordert JS in einer CSS-only-Library. Direkter Verfassungs-
Bruch ("keine Framework-Lock-in").

### "Hint nur im Dev-Build" (Reject)

Pro: Production-Markup bleibt clean.
Contra: User hat explizit `"Production-visible because Verfassungs-
Verletzung ein Bug ist, kein zu versteckendes Detail."` entschieden.
Halbierte Strenge.

### "Spinner mit Opacity-Pulse als Static-Variante" (Reject)

Pro: visuelles Signal auch ohne Rotation.
Contra: User-Veto — "Ein Opacity-Pulse ist selbst eine Bewegung,
und oszillierende Aufmerksamkeit ist schlimmer als gleichmäßige
Rotation." Statisch + visible-text ist die ruhigere Variante.

## Verfassungs-Mapping

| Prinzip | Wie diese Etappe es bedient |
|---|---|
| **1** Vorhersehbarkeit vor Überraschung | Indirekt — Hint ist kalm und vorhersagbar |
| **2** Kein Zustand ohne Ausgang | **Direkt** — strukturelle Selbst-Anzeige via `:has()` für Empty-State + Danger-Alert; Spinner-Sprache erzwingt Horizont |
| **3** Reizdichte ist Ressource | Indirekt — Hint nutzt status-info (ruhige Farbe), nicht alarm-rot |
| **4** Statusfarben warnen, ohne zu alarmieren | Indirekt — Hint-Coloring folgt der gefilterten status-info-Palette |
| **5** Nutzer behält Kontrolle | Indirekt — forced-colors-Override garantiert dass der Hint nicht den User-Mode überschreibt |
