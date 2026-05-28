# ADR-005: Bounce nur als explizites Opt-In (CLEAR 4 Prinzip 1)

**Status**: Accepted (v0.29.0)
**Datum**: Mai 2026
**Verfassung**: [CLEAR 4 — Nervensystem-Philosophie](#) Prinzip 1

## Context

ADR-003 und ADR-004 haben den COLOR-Pfad der Verfassung umgesetzt
(Status-Filter + Tone-Filter). Übrig blieb Prinzip 1:

> "Bewegung ist linear und gedämpft, nicht federnd. Bounce- und Overshoot-
> Easing (`cubic-bezier` mit Werten > 1) erzeugen einen kleinen, körperlich
> spürbaren Überraschungsimpuls. Charmant für ein ruhiges System,
> irritierend für ein angespanntes. Die Default-Bewegung des Systems ist
> `ease-smooth`, nicht `ease-bounce`."

Audit vor v0.29 zeigte zwei Verletzungen:

1. **`semantic.css`**: `--easing-slow: var(--ease-bounce)` — bounce als
   System-Default für "slow"-Easing. "Slow" ist semantisch eine Dauer-
   Angabe, nicht eine federnde Bewegungs-Qualität.
2. **`themes/playful.css`**: nutzt `cubic-bezier(0.34, 1.56, 0.64, 1)`
   (= bounce mit 1.56 Overshoot) als `--easing-medium` UND in
   `--btn-transition`. Jeder Button-Hover in playful federt — exakt das
   was die Verfassung als "körperlich spürbaren Überraschungsimpuls"
   beschreibt.

## Decision

Bounce bleibt im System, aber als **ausschließlich explizites Opt-In**
via `--motion-emphasis`. Die Verfassung selbst lässt das so vor:

> "**Token-Konsequenz:** Es gibt ein `--motion-calm` als Default.
> `--motion-emphasis` (mit Bounce) existiert, ist aber explizit als
> Ausnahme markiert und nie der Default einer Komponente."

Drei konkrete Änderungen:

1. **`semantic.css`**: `--easing-slow: var(--ease-smooth)` (war
   `--ease-bounce`). "Slow" wird langsamer, nicht federnder.
2. **`themes/playful.css`**: `--easing-medium`-Override gestrichen.
   `--btn-transition`-Override gestrichen — fall-back auf System-Default
   (`var(--motion-fast)` mit `--easing-fast`).
3. **Lint Check 6**: Themes dürfen die Default-Motion-Slots
   (`--easing-*`, `--motion-*`, `--*-transition`) nicht mit Bounce
   füllen. Detection via cubic-bezier-Y-Parse (Overshoot wenn Y > 1.0)
   ODER direkter `--ease-bounce`-Referenz. `--motion-emphasis` ist die
   einzige zulässige Bounce-Trägerstelle.

### Warum nicht `--ease-bounce` ganz entfernen?

Drei Gründe — die der User explizit abgewogen hat:

1. **Verfassungstreue** — die Verfassung preserved `--motion-emphasis`
   explizit. Es zu entfernen wäre strenger als die Verfassung selbst.
2. **Expressiver Register für Anlass-Aktivierung** — eine Buchungs-
   Bestätigung darf einen kleinen "ta-da"-Moment haben. Solange das
   Ausnahme ist und der User die Kontrolle behält (`prefers-reduced-
   motion`), ist das Aktivierung-mit-Anlass.
3. **Playful-Tone-Identität** — Trust = sage-grün, Modern = steel-blau,
   Playful = warmes Amber. Wenn alle Hues gedämpft sind, braucht Playful
   eine andere Identitäts-Achse, um sich abzuheben. Bounce-via-emphasis-
   opt-in ist diese Achse — ohne sie als Default zu zwingen.

## Consequences

### Vorteile

- **Konstitutions-konform** — keine bounce-Bewegung mehr im Default-Pfad
  einer Komponente.
- **Cascade-Effekt** — jeder Button-Hover in playful wird smooth statt
  federnd. Jede `--easing-slow`-Verwendung system-weit verliert den
  Bounce.
- **Hard-enforced via Lint** — Layer-1-Prevention. Zukünftige Theme-
  Autoren können diese Verletzung nicht versehentlich wiederherstellen
  (Lint failed).
- **`--motion-emphasis` bleibt als legitime Ausnahme** — der expressive
  Register für Anlass-Momente ist verfügbar, aber nur via expliziter
  Variable.

### Trade-Offs

- **Playful verliert Bounce-Identität** — die "federnde" Charakter-
  Eigenschaft von playful war eine erkennbare Tone-Distinktion. Sie
  bleibt erreichbar, aber nur via explizite `--motion-emphasis`-Nutzung
  in einzelnen Components.
- **Eine zusätzliche Lint-Regel** — Check 6 erweitert die Lint-Suite
  von 5 auf 6 Checks. Komplexitäts-Zuwachs niedrig (~25 LOC inkl.
  cubic-bezier-Y-Parse), Test-Coverage 4 neue Fixtures.

### Mitigations

- **`--motion-emphasis` bleibt explizit verfügbar** — wer Bounce für
  eine Confirmation-Animation will, kann ihn pro Component opt-in nutzen.
- **`prefers-reduced-motion: reduce`** wird durchgehend respektiert —
  selbst die emphasis-Bounce-Stelle wäre damit deaktiviert.

## Lint Check 6 — Implementierung

```js
function isBounceValue(value) {
  if (/--ease-bounce\b/.test(value)) return true;
  const cb = /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/g;
  let m;
  while ((m = cb.exec(value))) {
    if (parseFloat(m[2]) > 1.0 || parseFloat(m[4]) > 1.0) return true;
  }
  return false;
}

function isMotionDefaultSlot(prop) {
  if (prop === "--motion-emphasis") return false;  // explizite Ausnahme
  if (/^--easing-/.test(prop)) return true;
  if (/^--motion-/.test(prop)) return true;
  if (/-transition$/.test(prop)) return true;
  return false;
}
```

Wenn `isMotionDefaultSlot(decl.prop) && isBounceValue(decl.value)` →
exit 1 mit präziser Token + Line-Number + Verfassungs-Referenz.

Test-Fixtures verifizieren:
- bounce in `--easing-medium` → exit 1 ✓
- bounce in `--btn-transition` via `--ease-bounce` → exit 1 ✓
- bounce in `--motion-emphasis` → exit 0 ✓ (erlaubt)
- non-overshoot `cubic-bezier(0.25, 0.46, 0.45, 0.94)` → exit 0 ✓

## Alternatives Considered

### "`--ease-bounce` komplett entfernen" (Reject)

Pro: Null Risiko der Fehl-Verwendung. Simplste Vocabulary.
Contra: Strenger als die Verfassung. Verlust eines expressiven
Registers. Playful würde Identität verlieren ohne Ersatz.

### "Bounce in 1 Komponente erlauben, sonst nicht" (Reject)

Pro: noch granularere Kontrolle.
Contra: arbiträre Wahl welche Komponente. Lint-Regel komplexer.
Vorteil minimal gegenüber `--motion-emphasis`-Pattern.

### "Soft-Warn statt Hard-Fail in Lint" (Reject)

Pro: weniger restriktiv für Theme-Autoren.
Contra: Verletzung wird ignoriert in CI. Konstitutions-Treue ist
hart, nicht weich.

## Verfassungs-Mapping

| Prinzip | Wie diese Etappe es bedient |
|---|---|
| **1** Vorhersehbarkeit vor Überraschung | **Direkt** — bounce raus aus Default-Pfaden, opt-in-Bounce über `--motion-emphasis` ist die Konstitutions-konforme Ausnahme |
| **2** Kein Zustand ohne Ausgang | n/a |
| **3** Reizdichte ist Ressource | Indirekt — Bewegung ist Teil der Reizdichte, weniger Default-Bewegung ist weniger Default-Reiz |
| **4** Statusfarben warnen, ohne zu alarmieren | n/a |
| **5** Nutzer behält Kontrolle | Indirekt verstärkt — `prefers-reduced-motion` greift weiterhin auch auf das jetzt seltenere emphasis-Pattern |
