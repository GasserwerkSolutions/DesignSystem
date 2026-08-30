# Contributing

## Setup

```bash
npm install
npm run check:full   # alles muss grün sein
```

## Architektur-Regeln

**Components definieren Contracts, Themes setzen Tokens.** Themes dürfen
niemals `.component` Selektoren ändern — nur `[data-tone~="X"]` und nur
Custom-Properties darin. `npm run lint` enforced.

Layer-Cascade:
```
reset → tokens → semantic → themes → mode → base → state → components → patterns → treatments → utilities → overrides
```

Komponente bekommt ihre Werte über Custom-Properties. Defaults im
semantic-Layer, Themes overriden, Components consumen mit `var(--token, fallback)`.

## Neue Component hinzufügen

1. `components/<name>.css` mit JSDoc-Header:
   ```
   /**
    * <Name> Component
    * ================
    *
    * Kurze Beschreibung.
    *
    * CONTRACT:
    *   Required:
    *     --<name>-required-token
    *   Optional:
    *     --<name>-optional-token
    *
    * Struktur:
    *   <div class="<name>">...</div>
    *
    * Modifier:
    *   .<name>--variant   beschreibung
    */

   .<name> { ... }
   ```

2. `@import` in `main.css` (am Ende, layer `components`).

3. Kategorisieren in `scripts/build-site.js` (siehe `CATEGORIES`-Map).

4. Optional: TypeScript-Setup in `js/setup-<name>.ts` + export in `js/index.ts`.
   Jeder Initialisierer muss idempotent sein und eine `Cleanup`-Funktion
   zurückgeben, damit Builder-Preview und SPAs sicher remounten können.

5. Validieren:
   ```bash
   npm run build:site && npm run check:site
   npm run lint
   npm run check:contrast
   ```

## Tests

| Script | Was wird geprüft |
|---|---|
| `lint` | Theme-Contract (5 checks) |
| `test:lint` | Lint-Regression-Tests (21 cases) |
| `check:contrast` | 1008 WCAG-AA Paare |
| `check:a11y` | axe-core lint |
| `check:visual` | 12 VRT baselines |
| `check:journeys` | Puppeteer user flows |
| `check:rendered` | axe + VRT + Journeys parallel |
| `check:examples` | Beispielseiten bei 320–1280 px inkl. Assets/Overflow |
| `check:profiles` | Builder-Profil, Manifest, Hash und Größenbudget |
| `check:site` | 50 site asserts (smoke + interactions) |
| `check:package` | files-list ∈ @imports + exports-map vs tarball |
| `measure:check` | Bundle-Budget |

`check:full` chained alles mit `lint:strict`. Muss grün vor PR sein.

## Commit-Style

Etappen-orientiert. Eine Etappe = ein vXX.YY.0-Commit mit:
- Multi-line description (Was, Warum, Stats, Pipeline)
- Bullet-Points pro Sub-Change
- Stats wo relevant (Bundle, Asserts, Coverage)

Siehe CHANGELOG.md für Stilbeispiele.

## Kontrollrunden

Nach jeder Etappe systematischer Audit (siehe historische Pattern):
- Pipeline-Run komplett
- Spot-Checks für stille Bugs
- Coverage-Self-Tests (Lint, Token, Package, Modifier-Preview)
- Mutation-Tests (Self-Test der Validatoren)

Wenn ein Bug entdeckt wird: **Layer-1-Prevention** (Build-Time-Check) +
**Layer-2-Self-Test** (Sensitivity-Suite mit kalibrierten Mutationen).

## Releases

```bash
npm run release           # interactive
npm run release -- patch  # 0.X.Y → 0.X.(Y+1)
npm run release -- minor  # 0.X.Y → 0.(X+1).0
```

Release-Pipeline: Pull Request → verpflichtendes `check:full` → Tarball-Audit →
GitHub-Release-Tag. Ein npm-Publish ist ein separater, bewusst autorisierter
Schritt und wird in Installationsanweisungen nicht vorausgesetzt.

## Browser-Support

- Modern CSS: Baseline 2024+
  - color-mix, light-dark, @container, @property, @starting-style,
    interpolate-size, popover API, dialog API, field-sizing,
    accent-color, scrollbar-gutter
- Graceful degradation: Browser ohne `light-dark` zeigen den ersten
  Argument; ohne `interpolate-size` toggelt accordion instant.
- View-Transitions optional (Chrome 111+, Safari 18+).

## ADRs

Architektur-Entscheidungen in `ADR-NNN-*.md`. Templates:
- Context
- Decision
- Consequences
- Alternatives considered

Siehe ADR-001 als Beispiel.
