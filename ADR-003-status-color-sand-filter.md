# ADR-003: Status-Farben Sand-Filter (CLEAR 4 Prinzip 4)

**Status**: Accepted (v0.27.0)
**Datum**: Mai 2026
**Verfassung**: [CLEAR 4 — Nervensystem-Philosophie](#) Prinzip 4

## Context

Die ursprünglichen Status-Basisfarben des Systems waren Tailwind-Signal-
Farben:

```css
--color-error:   #dc2626;          /* sattes Signal-Rot */
--color-info:    #0284c7;          /* sattes Cyan-600 */
--color-warning: var(--playful-600);  /* sattes Amber */
--color-success: var(--trust-600);    /* sattes Trust-Grün */
```

Die `--status-*-bg/fg`-Tripel wurden korrekt durch `color-mix()` gefiltert
(Pastell-Backgrounds, mittlere Foreground-Mixes). Aber die `--status-*-
border` und alle direkten `var(--color-error)`-Nutzungen (in Alerts, Toasts,
Banners, Badges, Trends) griffen auf das **pure Signal** zu.

Mit der Adoption der CLEAR 4 Nervensystem-Philosophie wurde das als
direkte Verletzung von Prinzip 4 identifiziert:

> "Die klassischen Statusfarben — sattes Rot für Fehler, grelles Gelb für
> Warnung, leuchtendes Grün für Erfolg — sind aus der Welt der Ampeln und
> Alarme entlehnt. Sie funktionieren, indem sie eine kleine Stressreaktion
> auslösen. Genau das will CLEAR 4 nicht."
>
> "`--color-error` ist keine reine Signalfarbe, sondern eine durch den
> Hintergrundton gemischte Variante. Die ursprüngliche CLEAR-4-Idee —
> Warnfarben 'gefiltert durch einen Sand-Layer' — ist hier die Regel,
> nicht die Ausnahme."

## Decision

Die vier Status-Basisfarben werden **standardmäßig sand-gefiltert**:

```css
/* Raw-Signale bleiben als Escape-Hatch erhalten */
--color-error-signal:   #dc2626;
--color-warning-signal: var(--playful-600);
--color-success-signal: var(--trust-600);
--color-info-signal:    #0284c7;

/* Die normalen Tokens werden über --color-text-primary gemischt */
--color-error:   color-mix(in oklch, var(--color-error-signal)   78%, var(--color-text-primary));
--color-warning: color-mix(in oklch, var(--color-warning-signal) 78%, var(--color-text-primary));
--color-success: color-mix(in oklch, var(--color-success-signal) 78%, var(--color-text-primary));
--color-info:    color-mix(in oklch, var(--color-info-signal)    78%, var(--color-text-primary));
```

### Kalibrierung — warum 78% / 22%?

Drei harte Constraints, zwei weiche:

1. **Identität muss erkennbar bleiben** (hart) — Rot muss noch Rot sein,
   Grün noch Grün. Bei Mix-Ratios unter ~70% kippt die Hue in den
   neutralen Bereich.
2. **WCAG-AA-Kontrast erhalten** (hart) — alle 1008 kritischen Paare über
   6 Tones × 4 Modi × Nested-Scopes müssen ≥ 4.5:1 bleiben. Bei Ratios
   unter ~70% wird der Hue zu nah am Background.
3. **Mode-aware funktional** (hart) — `--color-text-primary` ist
   `light-dark()`, dadurch wandert der Filter automatisch mit. In Light
   mischt mit dunkel, in Dark mit hell. Beides verschiebt zur Mitte hin.
4. **Wahrnehmbare Stress-Dämpfung** (weich) — Chroma-Reduktion um ~30%
   ist empirisch der Punkt, an dem das sympathische Nervensystem nicht
   mehr "Signal!" liest.
5. **Wenig Aufwand für Theme-Autoren** (weich) — die Filter-Formel sitzt
   einmal in semantic.css, jedes Theme erbt automatisch.

Empirisch verifiziert mit `npm run check:contrast` (alle 1008 Paare grün)
und visueller Inspektion (`_ab.js` Screenshot-Probe). 78% bewahrt
Identität bei maximalem Filter-Effekt.

### Escape-Hatch: `--color-*-signal`

Die ursprünglichen Signalfarben bleiben unter dem `-signal`-Suffix
erhalten. Verwendung:

- **Chart-Datenpunkte** die maximale Differenzierbarkeit zwischen vielen
  Werten brauchen. Filterung würde Datenkategorien einander annähern.
- **Brand-Akzente** in expliziter Tone-Identität (z.B. wenn ein Theme
  bewusst eine signal-rote Marke führt).
- **Print-Output** wo die Filterung durch fehlende Mode-Adjustment ihre
  Funktion verliert.

Lint sollte später durchsetzen, dass `*-signal`-Tokens **nicht im
normalen UI-Pfad** auftauchen — nur in den drei genannten Kontexten.

## Consequences

### Vorteile

- **Direktes Mapping** zu CLEAR 4 Prinzip 4 ("Information ohne Bedrohung")
- **Cascade-Effekt** — jeder Alert/Badge/Banner/Toast/Callout/Trend wird
  automatisch leiser, ohne Component-Änderungen
- **Mode-Symmetrie** — Sand-Filter wandert via `--color-text-primary` mit;
  Light-Mode dunkler Filter, Dark-Mode heller Filter, in beiden Fällen
  Chroma-reduziert
- **Escape-Hatch erhalten** — kein Verlust von Funktion, nur Verlust
  von Default-Aktivierung

### Trade-Offs

- **Status-Farben sehen für Designer aus anderen Systemen ungewohnt aus**
  — gewohnt sind Signal-Rot etc. Erforderliche Erklärung: "Ja, das ist
  ein gedämpfter Ton, das ist beabsichtigt, hier ist der Grund (Verfassung)."
- **Dark-Mode Status-Border-Helligkeit** — durch Filter mit gray-50
  werden Borders in Dark-Mode etwas heller (mehr Aufmerksamkeit). Visuell
  noch kalm, aber im Mode-Vergleich asymmetrisch.
- **VRT-Baseline-Update notwendig** — alle 12 Baselines neu generiert
  (status-Color-Shifts cascade-weit sichtbar).

### Mitigations

- **`check:contrast` als Bremse** — wenn die Filterung jemals zu weit
  geht und WCAG-AA reißt, blockiert die Pipeline. Strenge der
  Architektur durchsetzt Strenge der Philosophie.
- **ADR-Dokumentation** (dieses Dokument) erklärt die Rationale für
  Theme-Autoren und Onboarding.
- **`*-signal`-Escape-Hatch** für die wenigen legitimen Ausnahmen.

## Alternatives Considered

### "Filter nur auf -bg und -fg, Border bleibt Signal" (Reject)

So war es vor v0.27. Pro: Border-Akzent bleibt scharf. Contra: violates
Prinzip 4 direkt — Border ist exakt das prominente Signal-Element. Die
Pastell-Backgrounds versteckten das Problem nicht, sie linderten es.

### "Pro-Color individuell kalibriert" (Reject vorläufig)

Z.B. Rot bei 75%, Grün bei 80% (Grün ist von Natur aus weniger alarmierend).
Pro: feinere Kontrolle. Contra: mehr Wartungs-Komplexität, jedes Theme
müsste Filter-Ratios pflegen wenn es eigene Signal-Farben definiert.
Uniform 78% ist der einfachere Weg, der "good enough" ist.

Eintragung in zukünftige ADR möglich falls einzelne Status visuell
unrecognized werden.

### "Filter über warmen Sand-Ton statt text-primary" (Reject vorläufig)

Der Verfassungstext referenziert "Sand-Layer". Eine wörtliche Umsetzung
wäre `color-mix(in oklch, signal, #d4c5a8)` (warmer Beige-Ton).

Pro: matched die Metapher direkt. Contra: erfordert ein neues System-
Token (`--color-sand`) das selbst mode-aware definiert werden muss
(in Dark ein dunklerer Sand). Die `text-primary`-Lösung ist
funktional-äquivalent — perceptually-uniform Chroma-Reduktion in
beiden Modi — bei niedrigerer architektonischer Komplexität.

Falls visuelle Wärme später als Identitätsmangel bemerkt wird,
Eintragung in eine ADR-004 möglich.
