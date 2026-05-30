# ADR-004: Tone-Paletten Chroma-Filter (CLEAR 4 Prinzip 3)

**Status**: Accepted (v0.28.0)
**Datum**: Mai 2026
**Verfassung**: [CLEAR 4 — Nervensystem-Philosophie](#) Prinzip 3
**Vorgänger**: [ADR-003 — Status-Farben Sand-Filter](./ADR-003-status-color-sand-filter.md)

## Context

ADR-003 hat die Status-**Basisfarben** (`--color-error/warning/success/
info`) sand-gefiltert. Die Tone-**Paletten** (`--trust-*`, `--playful-*`,
`--modern-*` in `tokens/tokens.css`) blieben unverändert — Tailwind-
Vollsättigung mit Chroma ~0.18 in OKLCH.

Diese Paletten sind die Quelle für jeden interaktiven Akzent: `--btn-bg`,
`--color-interactive`, `--color-focus`, `--card-border` in Trust, plus
äquivalent in den anderen Tones. Per CLEAR 4 Prinzip 3:

> "Sättigung wird gefiltert. Satte, hochgesättigte Farben sind
> Signalfarben — sie ziehen Aufmerksamkeit mit einer Dringlichkeit, die
> selten gerechtfertigt ist. Die Palette ist bewusst gedämpft."

Trust, Playful, Modern sind die drei Tones mit hoher Chroma. Premium,
Industrial, Minimal nutzen bereits Gray-Skalen / low-chroma — bereits
verfassungskonform.

## Decision

Die drei saturierten Paletten werden via **Relative-Color-Syntax**
chroma-reduziert:

```css
--trust-50:  oklch(from #f0fdf4 l calc(c * 0.7) h);
--trust-100: oklch(from #dcfce7 l calc(c * 0.7) h);
/* ... 50 bis 900 für jede der 3 Paletten ... */
```

Pro Step:
- **L unverändert** — Step-Hierarchie 50→900 bleibt, Kontrast-Verhältnisse
  bleiben, alle 1008 WCAG-AA-Paare grün ohne Re-Kalibrierung.
- **C × 0.7** — Chroma -30%, perceptually-uniform in OKLCH.
- **H unverändert** — Tone-Identität (Grün bleibt Grün, Amber bleibt
  Amber, Blau bleibt Blau).

Industrial/Premium/Minimal bleiben unverändert — bereits low-chroma.

## Warum Relative-Color-Syntax, nicht color-mix?

ADR-003 nutzte `color-mix(in oklch, signal 78%, text-primary 22%)` für
Status-Farben. Diese Wahl mischt sowohl L als auch C in Richtung
text-primary — die Lightness driftet zur Mitte (was bei Status okay
ist: Filter macht Farbe etwas dunkler in Light, heller in Dark).

Für die Tone-Paletten ist L-Drift fatal: trust-50 (sehr hell) und
trust-900 (sehr dunkel) sind absichtlich an den Extremen der
Lightness-Skala. Wenn beide um 22% in Richtung text-primary mischen,
verlieren beide ihre Position in der Step-Hierarchie. trust-50 würde
plötzlich nicht mehr ein zarter Pastell sein, trust-900 nicht mehr
ein tiefer Schatten.

`oklch(from ... l calc(c * 0.7) h)` greift chirurgisch: nur Chroma wird
reduziert, L und H bleiben Bit-genau bei den Original-Werten. Step-
Hierarchie bleibt erhalten, Hue bleibt erhalten, nur die Sättigung
sinkt.

## Kalibrierung — warum 0.7?

Drei Constraints:

1. **Identität muss erkennbar bleiben** (hart) — Grün muss Grün bleiben.
   Bei Faktor < 0.5 kippt die Wahrnehmung in den neutralen Bereich. 0.7
   reduziert spürbar (ca. 30%) ohne die Hue-Wahrnehmung zu zerstören.
2. **WCAG-AA-Kontrast unverändert** (hart) — weil L unverändert bleibt,
   verändern sich die Kontrast-Verhältnisse nur minimal (Chroma trägt
   wenig zur Luminanz bei). Verifiziert: alle 1008 Paare grün.
3. **Symmetrie zur Status-Filter-Stärke** (weich) — ADR-003 nutzt 78%
   Mix-Ratio, was in oklch grob ~30% Chroma-Reduktion entspricht. 0.7
   matched diese Stärke — beide Filter wirken visuell konsistent.

## Consequences

### Vorteile

- **Vollständige Realisierung von Prinzip 3** — die Sättigung der
  gesamten Palette ist jetzt gedämpft, nicht nur die Status-Tripel.
- **Massive Cascade** — jeder Button, Link, Focus-Ring, Avatar-Akzent,
  Badge, Chart-Datenpunkt in Trust/Playful/Modern Themes wird automatisch
  ruhiger. Eine Stelle, sichtbar in 100+ Component-Slots.
- **Architektur-Elegant** — die Filter-Logik sitzt direkt in tokens.css,
  visuell auf Token-Source-Ebene erkennbar. Kein Build-Step-Magic.
- **L-preserving** — Step-Hierarchie 50→900 unangetastet, keine
  Re-Kalibrierung der Theme-Definitions nötig.

### Trade-Offs

- **Brand-Identität visuell gedämpft** — Trust-Grün ist jetzt Sage-Grün,
  Playful-Orange ist warmer Tan, Modern-Blau ist Steel-Blau. Für Teams
  die Tailwind-Vollsättigung gewohnt sind, ungewohnt. Dokumentation
  (dieses ADR + CHANGELOG) erklärt das Warum.
- **Browser-Support eingeschränkt** — `oklch(from ...)` ist Baseline
  2024+ (Chrome 119, Safari 16.4, Firefox 128). Browser ohne Support
  bekommen `undefined`. Components müssen mit `var(--token, fallback)`
  arbeiten — was wir bereits durchgehend tun.
- **Bundle leicht größer** — die Expressions sind verbose im Source.
  +6 KB raw / +0.4 KB gzip. Budget angehoben auf 145 KB raw.
- **Contrast-Parser musste OKLCH lernen** — `scripts/check-contrast.js`
  bekommt einen Mini-OKLCH-Evaluator inkl. `from`-Syntax + calc()-
  Expressions. ~150 LOC. Nutzt das vorhandene `scripts/_oklch.js`-Modul.

### Mitigations

- **`check:contrast` als Bremse** — alle 1008 Paare verifiziert grün.
  Die Strenge der Architektur durchsetzt die Strenge der Philosophie.
- **Visuelle A/B-Probe** während der Entwicklung verifiziert: Paletten-
  Steps und Trust/Playful/Modern-Buttons bleiben eindeutig erkennbar
  in ihrer Tone-Identität.
- **VRT-Self-Test bleibt grün** — 3 kalibrierte Mutationen gecatcht;
  die Sensitivität ist unverändert.

## Alternatives Considered

### "color-mix wie bei Status-Farben" (Reject)

Pro: Konsistent mit ADR-003.
Contra: Mischt L mit text-primary → zerstört Step-Hierarchie. Trust-50
wäre nicht mehr ein zarter Pastell.

### "Build-Time pre-compute statische Hex-Werte" (Reject vorläufig)

Pro: breitere Browser-Compat (sRGB hex statt oklch()).
Contra: Filter-Logik versteckt im Build-Script, nicht im Token-Source.
Philosophie weniger sichtbar. Browser-Support von `oklch(from ...)` ist
gut genug (Baseline 2024+) um auf den runtime-Pfad zu setzen.

Eintragung in eine spätere ADR möglich falls Compat-Requirements das
nötig machen.

### "Per-Tone-Filter-Stärke" (Reject)

Z.B. Trust 0.7, Playful 0.65 (Orange ist subjektiv "lauter"), Modern
0.75 (Blau wirkt von Natur aus ruhiger).
Pro: feinere Kontrolle.
Contra: mehr Wartungskomplexität, schwer zu rechtfertigen ohne A/B-Tests
mit echten Nutzern. Uniform 0.7 ist der einfachere Weg, der "good enough"
ist.

Eintragung in spätere ADR möglich falls einzelne Tones empirisch zu
laut oder zu fade wirken.

### "Escape-Hatch via `--trust-*-signal`-Tokens" (Reject)

Pro: Konsistenz mit ADR-003 (`--color-*-signal` für Status-Farben).
Contra: 30 zusätzliche Tokens (3 Paletten × 10 Steps). Verfassung sagt
"die Palette ist bewusst gedämpft" — ohne Ausnahme. Wer pure Saturation
braucht, kann den Hex direkt nutzen (z.B. `#22c55e`) oder die Inverse-
Operation: `oklch(from var(--trust-600) l calc(c / 0.7) h)`.

## Verfassungs-Mapping

| Prinzip | Wie diese Etappe es bedient |
|---|---|
| **1** Vorhersehbarkeit vor Überraschung | Step-Hierarchie unverändert — Layout-Kontraste sind weiterhin vorhersehbar |
| **2** Kein Zustand ohne Ausgang | n/a (nicht-Status-Komponenten) |
| **3** Reizdichte ist Ressource | **Direkt** — Sättigung filterung erfüllt das Wörtliche der Verfassung |
| **4** Statusfarben warnen, ohne zu alarmieren | Indirekt — Status nutzt Trust-/Playful-Hue, Filter wirkt jetzt durch beide Schichten |
| **5** Nutzer behält Kontrolle | n/a (kein Interaktions-Pattern berührt) |
