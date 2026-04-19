# Changelog

Alle nennenswerten Änderungen an diesem Design-System werden hier dokumentiert.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und das Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

---

## [Unreleased]

### Hinzugefügt
- —

### Geändert
- —

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
