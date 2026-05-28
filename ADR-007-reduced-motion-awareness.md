# ADR-007: Reduced-Motion-Bewusstsein als Two-Layer-Garantie (CLEAR 4 Prinzip 5)

**Status**: Accepted (v0.31.0)
**Datum**: Mai 2026
**Verfassung**: [CLEAR 4 — Nervensystem-Philosophie](#) Prinzip 5

## Context

ADR-003/004 haben den Color-Pfad gefiltert (Status + Tone),
ADR-005 den Motion-Pfad (Bounce nur als Opt-In), ADR-006 den
Struktur-Pfad (Exit-Path-Hints via `:has()`). Letzter
ungefilterter Pfad: das **Bewusstsein für `prefers-reduced-motion`**.

> "Nutzer behält Kontrolle. Bewegung darf nicht die einzige Quelle
> von Zustandsverständnis sein. System-Präferenzen werden respektiert."

Audit vor v0.31 zeigte zwei Klassen von Lücken:

### 1. Spinner-Override greift faktisch nicht

`base/reset.css` setzt unter `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    …
  }
}
```

`components/spinner.css` versuchte, die Rotation zu erhalten:

```css
@media (prefers-reduced-motion: reduce) {
  .spinner { animation-duration: 2500ms; }   /* OHNE !important */
}
```

**Layer-Mathematik**: ohne `!important` gewinnen spätere Layer
(`components` > `reset`). Mit `!important` kehrt sich die Order um —
`reset` schlägt `components`. Der Spinner-Override war faktisch
toter Code; die Rotation stoppte unter reduced-motion komplett.
Der Header-Kommentar log.

Das war eine echte stille Diskrepanz zwischen CSS-Header und
Browser-Verhalten — die Sorte Bug die kein Test je gemeldet hat.

### 2. Bewusstsein war Konvention, nicht Pflicht

Component-Autoren konnten `animation:`-Properties hinzufügen ohne
sich aktiv mit reduced-motion zu beschäftigen. Der globale
`!important`-Override fängt den Default-Fall — aber:

- Wer eine Animation BEWUSST unter reduced-motion erhalten wollte
  (Affordance-Erhaltung), brauchte `!important` und hatte keinen
  Linter-Hinweis dass das die einzige Lösung ist.
- Wer das default-Stoppen wollte, hatte keinen sichtbaren Marker
  dass die Frage überhaupt gestellt wurde — Code-Reviewer mussten
  raten.
- Components werden in Konsumenten-Projekten teilweise isoliert
  verwendet. Der globale reset.css ist dann womöglich nicht da.

## Decision

**Two-Layer-Garantie**: Lint Check 7 prüft das **Bewusstsein**, ein
Browser-Self-Test in check-site.js prüft die **Wahrheit**.

### Spinner-Strategie

Der Override-Block wird **entfernt**. Unter reduced-motion stoppt die
Rotation vollständig durch den globalen Reset. Loading-Affordance kommt
aus dem `spinner-block`-Pattern via visible-text:

```html
<div class="spinner-block">
  <span class="spinner spinner--lg" aria-hidden="true"></span>
  <p>Lädt Buchungen …</p>
</div>
```

Ein **standalone** Indeterminate-Spinner ohne visible-text ist nicht
verboten, aber explizit **erklärungspflichtig**: er muss dokumentieren,
wie der Horizont ohne Bewegung kommuniziert wird. Der CSS-Header sagt
das jetzt unmissverständlich.

Begründung (User-Wortlaut):
> "Die ursprüngliche Idee 'langsame Rotation ist besser als Opacity-
> Pulse' war korrekt INNERHALB der Annahme, dass ein Indeterminate-
> Indicator Bewegung braucht. Aber für P5 ist die stärkere Regel:
> Der Nutzer behält Kontrolle; Bewegung darf nicht die einzige Quelle
> von Zustandsverständnis sein."

### Lint Check 7 (mandatory)

Jede `.css`-Datei in `components/`, `base/`, `semantic/` mit
`animation:`-Property MUSS eine von drei Bedingungen erfüllen:

**(a)** Lokaler `@media (prefers-reduced-motion: reduce)` Block in
derselben Datei. Layer-1-Garantie: der Autor hat die Frage gestellt.

**(b)** `/* reduced-motion: handled by reset.css */` Comment direkt
vor der `animation:`-Declaration. Für Cases wo der globale Override
ausreicht und der Autor das bewusst dokumentiert.

**(c)** Micro-Feedback: parsed duration ≤ 100ms UND value enthält
NICHT `infinite`. Die infinite-Klausel ist nicht kosmetisch — sie
schließt den Flimmer-Escape-Hatch: `animation: x 100ms infinite`
ist kurz, aber pathologisch wenn unbeschränkt.

### Layer-2-Self-Test (`runReducedMotionTruth`)

`scripts/check-site.js` rendert eine Fixture neben `main.css`,
emuliert `prefers-reduced-motion: reduce` per
`page.emulateMediaFeatures()`, und prüft `getComputedStyle().
animationDuration` ≤ 50ms für jede animation-using Component
(spinner, skeleton, toast, back-to-top).

**Trennung der Concerns** (User-Wortlaut):
> "Lint prüft Bewusstsein; Browser-Test prüft Wahrheit."

Lint allein reicht nicht weil reset.css's `!important` die Layer-
Order umkehrt — Component-Overrides ohne `!important` verlieren.
Nur der Browser kann das endgültig beantworten. Self-Test allein
reicht nicht weil er nur prüft was Components heute tun; Lint
verhindert dass jemand morgen eine animation-Stelle hinzufügt ohne
sich Gedanken zu machen.

## Files

- `components/spinner.css` — Header umgeschrieben (Standalone-
  Spinner ist erklärungspflichtig), Override-Block entfernt,
  `reduced-motion: handled by reset.css` Comment vor `animation:`
- `components/toast.css` — Comment vor `animation:`
- `scripts/lint-themes.js` — Check 7 + Helper-Funktionen
  (`parseAnimationDurationMs`, `precedingCommentMentionsReducedMotion`,
  `hasLocalReducedMotionBlock`, `lintComponentReducedMotion`)
- `scripts/test-lint.js` — 6 neue Fixtures für Check 7
- `scripts/check-site.js` — `runReducedMotionTruth()`

## Consequences

### Vorteile

- **Stille Diskrepanz gefixt** — spinner.css log nicht mehr; Header
  und Verhalten matchen.
- **Layer-1-Prevention** — Lint Check 7 zwingt jeden Component-Autor
  zu einer expliziten Entscheidung. Drei dokumentierte valide Wege.
- **Layer-2-Wahrheitsprüfung** — `!important`-Layer-Inversion wird
  vom Browser-Test eingefangen. Wenn jemand morgen einen Override
  schreibt der nicht greift, schreit der Test.
- **Erklärungspflicht für Standalone-Spinner** — schwächt nicht
  das Pattern, nutzt die spinner-block-Empfehlung als guided
  default.

### Trade-Offs

- **Eine zusätzliche Lint-Regel** — Check 7 ist die siebte
  Lint-Regel. Komplexitäts-Zuwachs ~80 LOC inklusive Helper.
- **Browser-Test braucht eine Fixture neben main.css** — wie beim
  Exit-Path-Test (ADR-006); data:URL kann file:// stylesheet nicht
  laden. Fixture wird nach Test gelöscht.
- **Existierende Animation-Stellen mussten markert werden** —
  toast.css bekam einen Comment, spinner.css auch. Skeleton + back-
  to-top hatten bereits eigene Blöcke (Bedingung a).
- **Micro-Feedback-Bedingung (c)** muss präzise sein — die
  `nicht infinite` Klausel war ein bewusster Schliessen-Schritt
  gegen Flimmer-Escape. Ohne sie wäre Check 7 unterminiert.

### Mitigations

- **CHANGELOG dokumentiert die Spinner-Verhaltensänderung explizit**
  — Konsumenten die standalone Spinner verwenden bekommen Hinweis.
- **Lint-Output zeigt alle drei valide Wege** — wenn der Check
  failed, ist der nächste Schritt offensichtlich.

## Alternatives Considered

### "spinner.css mit `!important` retten" (Reject)

Pro: Rotation als Affordance bleibt.
Contra: User-Veto. Bewegung darf nicht die einzige Quelle von
Zustandsverständnis sein. Spinner unter reduced-motion + visible-
text ist die ruhigere und konsequentere Lösung.

### "nur Lint, kein Layer-2-Self-Test" (Reject)

Pro: weniger Code.
Contra: Lint kann die `!important`-Layer-Inversion nicht erwischen.
Wer einen `@media`-Block schreibt der nicht greift, hat aus
Lint-Sicht alles richtig gemacht — aber der Browser zeigt was
anderes. Der Self-Test schließt diese Lücke.

### "nur Self-Test, kein Lint" (Reject)

Pro: simplere Build-Chain.
Contra: Self-Test prüft nur was Components heute tun. Lint
verhindert dass jemand morgen eine neue Component mit nackter
Animation hinzufügt. Layer-1-Prevention ist Verfassungs-konform —
Konstitutions-Treue wird vorne durchgesetzt, nicht hinten
abgefangen.

### "Bedingung (c) ohne infinite-Klausel" (Reject)

Pro: simpler Lint-Code.
Contra: 100ms infinite ist ein Flimmer-Escape-Hatch. User hat
explizit auf diese Schliesung bestanden: "Sonst könnte jemand
100ms infinite als Flimmern durchschmuggeln."

## Verfassungs-Mapping

| Prinzip | Wie diese Etappe es bedient |
|---|---|
| **1** Vorhersehbarkeit vor Überraschung | Indirekt — explizite Marker machen Reduced-Motion-Verhalten vorhersehbar |
| **2** Kein Zustand ohne Ausgang | Indirekt — Spinner ohne visible-text ist eine Sackgasse für reduced-motion-User; Erklärungspflicht macht das sichtbar |
| **3** Reizdichte ist Ressource | Direkt — weniger erzwungene Bewegung unter Nutzer-Wunsch ist weniger Reiz |
| **4** Statusfarben warnen, ohne zu alarmieren | n/a |
| **5** Nutzer behält Kontrolle | **Direkt** — Two-Layer-Garantie macht reduced-motion-Respekt nicht-umgehbar; Spinner-Strategie stellt Sprache vor Bewegung |
