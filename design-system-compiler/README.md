# DesignSystem Compiler · Altseite → überprüfbare Spezifikation → Element

**Status: interner Extraktionspilot.** Dieser Code gehört zum bestehenden DesignSystem, übernimmt keine Token-/Komponentenwahrheit und veröffentlicht nichts.

## Ausführung

Aus dem Repository-Root mit Node.js 22 und installiertem npm-Lockfile:

```sh
npm ci
npx playwright install chromium
node design-system-compiler/cli.mjs --source design-system-compiler/tests/fixtures/old-site/index.html --out /tmp/ds-import-proof --visual
node --test design-system-compiler/tests/pipeline.test.mjs
```

**Eingänge:** eine **lokale**, statische HTML-Datei mitsamt lokalen CSS-/Bild-/Font-Dateien unterhalb desselben Verzeichnisses; `--repo-root` optional (Standard: DesignSystem-Repo). Keine URL-Fetches oder Crawls. Browser-JavaScript ist beim Parsen ausdrücklich deaktiviert; externe Netzwerkressourcen werden abgebrochen. Ein `script`, Formular, iframe, remote CSS, CSS-Import, inline Eventhandler, SVG/JS-Asset oder Pfad ausserhalb des Eingangsverzeichnisses blockiert mit adressiertem Fehler.

## Aufbau

```text
design-system-compiler/
├── extraction/
│   ├── design-extractor/     # Browser-DOM, zwei tatsächlich beobachtete Viewports, CSS-Erhalt
│   └── source-inventory/     # SHA-256 und sichere lokale Pfade
├── analysis/
│   ├── design-analyzer/     # berechnete Browserstile, Overflow, offene Navigation
│   ├── design-normalizer/   # reproduzierbares JSON ohne freie Designableitung
│   └── semantic-mapper/     # ausschliesslich bekannte DS-Klassen und Achsen
├── registry/
│   ├── design-tokens/       # aus dist/tokens.json / semantischen Quellen, nicht kopiert
│   ├── components/          # manifest/builder-profile.json
│   ├── patterns/            # manifest/builder-profile.json
│   ├── layouts/             # base/layout.css
│   └── assets/              # lokale Snapshot-Assets: Hash statt Kopie ohne Nachweis
├── schema/
│   └── design-system/       # eigenes partielles Extraktionsschema, kein SF-Vollschema
├── composition/
│   └── composition-agent/   # deterministische Ausgabe, kein KI-Neuentwurf
└── validation/
    ├── schema-validation/   # Preview-/Struktur-Gate
    └── visual-regression/   # Chromium-Pixelvergleich 390 und 1280 px
```

Der orchestrierende Code liegt in `core.mjs`; die fachlichen Schnittstellen befinden sich in den jeweils genannten Ordnern.

## Lieferartefakte

- `specification.json`: Quellen-Hashes, beobachtete berechnete Stile, vorhandene CSS-Klassen, exakt passende DesignSystem-Registrierungen, **nicht gemappte** Klassen, offene Interaktionen und Prüfbedarf.
- `element.html`: Original-DOM mit geprüften lokalen CSS-Regeln und gehashten lokalen Assets. **Nur statischer Snapshot**.
- `element.mjs`: importierbares Custom Element (`legacy-site-<sourcehash>`), das die alte Seite **isoliert in einem skriptlosen Sandbox-iframe** hält. Die Elternseite passt die Elementhöhe technisch an. Ein gerendertes Snapshot-iframe ist bewusst **kein** neu gebautes natives DesignSystem-Pattern.
- `BUILD-REPORT.json`: erzeugte Dateihashes und optionale visuelle Regression.

```js
import {elementTag} from "./element.mjs";
document.body.append(document.createElement(elementTag));
```

**Grenze:** Die automatische Analyse ordnet nur existierende Bezeichnungen zu und kopiert keine fremden Designentscheidungen in die DesignSystem-Registry. DesignSystem-`data-space`, `data-shape`, `data-weight`, `.prose`, `.card--content-fit` usw. werden nur übernommen, wenn sie in der Quelle wirklich vorkommen. Nicht bekannte Klassen behalten den Originalstil im isolierten Snapshot. Sie werden **nicht** mit irgendeiner ähnlich aussehenden Komponente ersetzt.

Eine optisch ähnliche Seite ist keine Garantie für Inhaltswahrheit, Medienrechte, Barrierefreiheit, Buchung oder CMS-Anbindung. Ohne browserbasierten visuellen Vergleich bleibt `visualRegression: NOT_RUN`; selbst bei PASS bleibt `publication: BLOCKED` und die Strength-First-/E-07-/Rechtefreigabe notwendig. Bestehende Ausgabeordner werden nie überschrieben. Kein Merge oder Release über dieses Modul.
