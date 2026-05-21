# Changelog

Alle nennenswerten Änderungen an diesem Design-System werden hier dokumentiert.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und das Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

---

## [Unreleased]

### Hinzugefügt
- **A11Y** (Phase 2 — Hardening):
  - `ARIA:`-Block in jedem interaktiven Component-File (toast, skeleton,
    tabs, modal, drawer, popover, tooltip, checkbox/radio, nav) —
    dokumentiert Pflicht-Rollen, Live-Regions, Focus-Pattern,
    Roving-Tabindex etc.
  - `.field__error` zeigt zusätzlich ein Warn-Icon (via CSS-Mask) —
    Fehler-Kommunikation ist nicht mehr nur farb-abhängig (WCAG 1.4.1).
  - `.nav__item[aria-current="page"]` triggert den aktiven Style —
    `aria-current` ist Source-of-Truth, `.nav__item--active` nur Fallback.
  - README-Abschnitte "ARIA Contracts" und "Non-Color Affordances"
    ergänzt.
- **Components** (Phase 1 — Lücken-Füller):
  - `input.css` — geteiltes Form-Control-Primitive mit Größen-Varianten,
    klassen-basierten Validierungs-Zuständen (`.is-invalid`, `.is-valid`)
    und `.input-group` für Prefix/Suffix-Adornments
  - `button-group.css` — verbundene Button-Reihe + Segmented Control
    (`aria-pressed="true"` als gedrückter Zustand)
  - `popover.css` — Anchor-positioniertes Menü auf Basis der nativen
    Popover-API (`[popover]`) mit Fallback und Menu/Separator-Pattern
  - `spinner.css` — indeterminate Loading-Indikator, respektiert
    `prefers-reduced-motion` (Opacity-Puls statt Rotation) und
    Forced-Colors (System-Highlight)
- **Table**: neue Modifier `--striped`, `--sticky-header`, `--responsive`
  (mobile Stack-Layout via `data-label`)
- **Tokens**: `--z-popover` (200) zwischen `--z-dropdown` und `--z-modal`

### Geändert
- README + Component-Listing auf 33 Components erweitert

### Entfernt
- —

---

## [0.1.0] — 2026-04-19

### Hinzugefügt
- **Architektur**
  - Contract-basiertes Component-Pattern (Themes setzen nur Tokens)
  - CSS `@layer`-Kaskade (reset < tokens < semantic < themes < base < state < components)
  - Contract-Lint-Script mit Nested-`@media`-Support
  - WCAG-AA-Contrast-Check-Script
  - W3C-DTCG-Token-Export (`dist/tokens.json`)
  - TypeScript-Type-Generator (`dist/tokens.d.ts`)
- **Themes** (6): trust, playful, premium, industrial, modern, minimal
- **Dark-Mode** als orthogonale Achse (`data-mode="dark"`) mit `prefers-color-scheme`-Auto
- **Tokens**: rem-basierte Spacing-Skala, fluide Typo (clamp), T-Shirt-Aliases
- **Base**: Reset, Typography, Layout, Print-Stylesheet
- **Components** (29):
  - *Foundation*: Button, Card, Section, Badge, Stat, Nav, Callout, Steps, Table
  - *Layout*: List-Row, Funnel, Stack-Variants
  - *Form*: Checkbox, Radio, Field, Search, Range-Slider
  - *Overlay*: Modal, Drawer, Tooltip
  - *Content*: Tabs, Accordion, Breadcrumbs, Pagination
  - *Feedback*: Empty-State, Skeleton, Toast, Progress, Trend
  - *Data*: Avatar, Code-Block, Panel-List, Divider, Banner
- **A11Y**:
  - `prefers-reduced-motion` (global via `!important` in reset)
  - `prefers-contrast: more` (border + text darkening)
  - `forced-colors: active` (Windows High-Contrast)
  - `prefers-reduced-data` (no shadows/bg-images)
  - Skip-to-Content-Pattern in Demo
  - Logische Properties überall (`padding-inline`, `margin-block`) → RTL-ready
- **Variable Fonts**: DM Sans + Playfair Display VF
- **Demo**: `index.html` mit live-toggle für alle 6 Themes + Dark-Mode
- **CI**: GitHub Actions Workflow (Lint + Contrast + Build bei jedem PR)
