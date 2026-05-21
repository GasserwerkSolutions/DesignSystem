# Changelog

Alle nennenswerten Änderungen an diesem Design-System werden hier dokumentiert.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und das Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

---

## [Unreleased]

### Hinzugefügt
- **Site-Integration** (Mobile-Hardening):
  - Eigener "Mobile / Touch Hardening"-Block in `assets/main.css`
    und `assets/subpages.css`:
    - `input, select, textarea { font-size: max(16px, 1rem) }` —
      verhindert iOS-Zoom beim Fokus auf Form-Felder.
    - `-webkit-tap-highlight-color: transparent` + `touch-action:
      manipulation` auf allen interaktiven Controls.
    - `@media (hover: none)`-Guard entfernt Hover-Lift +
      Sticky-Hover-Effekt auf Touch-Geräten.
    - Hero auf `min-height: clamp(28rem, 70dvh, 44rem)` (dvh statt
      vh — Safari-Adressleiste schluckt sonst Höhe). Subpage-Hero
      analog mit `50dvh`.
    - Hero-H1 auf Viewports <480 px zurückgenommen
      (`clamp(2.5rem, 11vw, 3.5rem)`) — vorher overflowte der Text
      horizontal auf 320 px-Geräten.
    - Header-Buttons auf Touch 44×44 px (statt 40×40), Nav-Links im
      Drawer min-height 44 px, Form-Inputs min-height 44 px — WCAG
      2.5.5 + Apple HIG.
    - Form-`<select>`: eigenes SVG-Caret, sauberes Padding statt
      iOS-Default-Dropdown.
    - Auf Viewports <360 px wird das Praxis-Quick-Icon im Header
      ausgeblendet, sonst überfüllt sich der Header.
    - `body.has-sticky-bar` bekommt 4.5 rem Bottom-Padding — sonst
      verdeckt die Sticky-Bar die letzten 64 px Content.
    - `body.nav-open` lockt Body-Scroll via `overflow:hidden +
      position:fixed` (iOS-Rubber-Band-Schutz). JS merkt sich
      `scrollY` und stellt nach dem Schliessen die Position wieder
      her — iOS scrollt sonst zurück nach oben.
    - `html { scroll-padding-block-start: var(--header-h) }` →
      Anchor-Sprünge landen nicht unter dem Sticky-Header.
    - Subpage-spezifisch: Editorial-Layouts auf <560 px verschlankt
      (kleinerer Tan-Frame, 4:3-Bilder, kleinerer Drop-Cap).
  - `assets/main.js` + `assets/common.js` erweitert: lockBody /
    unlockBody mit Scroll-Position-Preservation, body-Class-Toggle
    für `has-sticky-bar`, Resize-Handler schliesst Drawer beim
    Wechsel ≥768 px.
  - Cache-Buster hochgezählt: `main.css?v=78→79`, `subpages.css?v=34→35`,
    `main.js?v=10→11`, `common.js?v=1→2`.
- **Site-Integration** (Phase B — Overlay):
  - `assets/main.css` (~36 KB, 212 Rule-Blöcke) — komplette Site-Layer
    auf Homepage-Markup. Eigene `@layer site` über dem DS-`components`-
    Layer. Komponenten: site-header (sticky + backdrop-blur), notfall-bar,
    skip-link, .nav mit Sub-Dropdowns, .nav-quick-Mobile-Panels, hero
    (--fullbleed mit 4-Layer-Overlay-Gradient + Off-White-CTA-Invert),
    .trustbar (5/7-Split + 4-up-Grid), .triage-path (24 px radius,
    `--urgent`-Variante mit Tan-Wash), .treat-card, .intro-spread
    (8/4-Magazine, --reverse-Wechsel, 6 px Tan-Frame), .team-lead +
    .team-avatars (Ring-Shadow), .faq-stack, .form (mit honeypot,
    Turnstile-Slot, status-feedback), .standort, .flow-closing
    (Tan-Highlight), .sticky-bar (Mobile-Bottom), .site-footer
    (Near-Black mit footer-grid, footer-trust, footer-bottom).
  - `assets/subpages.css` (~25 KB, 149 Rule-Blöcke) — geteiltes Chrome
    (Header/Nav/Notfall/Sticky/Footer) plus Subpage-Editorial-Flow:
    .breadcrumb, .editorial-split (5/7), .flow-pair (7/5 + --reverse +
    --accent), .flow-prose mit .has-dropcap, .marginalia, .concept-card/
    .concept-grid, .info-box, .first-visit-list (counter-reset), .praxis-
    haltung, .praxis-praktisch, .hero--sub-bg. Wärmere Bg-Töne
    (`#fbf8f3`) per CLAUDE.md.
  - `assets/main.js` (~9 KB) — Mobile-Nav-Toggle, Quick-Icon-Dropdowns
    (Klon der .nav__sub-Liste, an `<header>` angehängt), Submenu-Inline-
    Collapse <768 px, Click-outside + Escape schliessen, Sticky-Bar
    zeigt sich nach 200 px Scroll, /api/contact-Submit mit Turnstile-
    Token + Status-Feedback.
  - `assets/common.js` (~4 KB) — gleiche Mobile-Nav-/Sticky-Logik für
    Subpages, footer-year. Defensiv via `data-bound`-Marker, falls
    main.js bereits gebunden hat.
  - Logo + Icons: `assets/favicon.svg`, `assets/apple-touch-icon.svg`,
    `assets/logo-text.svg`, `assets/logo-alb-text.svg` (Off-White-
    Variante für Footer).
  - Cache-Buster gemäss CLAUDE.md hochgezählt: `main.css?v=77` → `v=78`
    (index.html), `subpages.css?v=33` → `v=34` (8 Subpages).
- **Site-Integration** (Foundation, ein Commit zuvor):
  - Neues `themes/arch.css` — Token-Set für Zahnärztehaus Arch
    (Teal-CTA `#134e4a`, Off-White-Body, Warm-Tan-Akzent `#f0e6d3`,
    Deep-Blue Hero-Akzent `#1B5BC0` als site-spezifischer Token).
    Serif-Display + System-Sans-Body, 8 px Button-Radius, 24 px
    Card-Radius (per CLAUDE.md "Aktuelle Design-Reality").
  - `check-contrast.js` validiert das Theme jetzt mit — alle kritischen
    Paare ≥ WCAG AA.
  - 9 Production-HTML-Seiten (`index.html`, `praxis/index.html`,
    `behandlungen/{notfall,prophylaxe,zahnerhalt,zahnersatz,implantat,
    parodontose,kinder}/index.html`) bekommen:
      - `data-tone="arch"` auf dem `<html>`-Element
      - `<link rel="stylesheet" href="/main.css?v=1">` vor dem
        bestehenden `/assets/*.css`-Link, sodass das Design-System die
        Foundation liefert und `/assets/main.css` (sobald wieder vor-
        handen) die site-spezifischen Komponenten on top übernimmt.
  - Die drei Standalone-Seiten (`404.html`, `datenschutz.html`,
    `impressum.html`) und der Redirect-Stub (`behandlungen/index.html`)
    bleiben unberührt — sie tragen eigene Inline-Styles und brauchen
    die Foundation nicht.
- **Quality & DX** (Phase 3):
  - `scripts/dark.tokens.js` — Single Source of Truth für Dark-Mode-Werte.
  - `scripts/build-dark.js` — generiert `semantic/dark.css` aus dem
    Source und emittiert beide Trigger-Blöcke ([data-mode="dark"] +
    @media prefers-color-scheme) ohne Hand-Duplikation.
  - `scripts/check-tokens.js` — validiert, dass jede `var(--x)`-Referenz
    auf eine deklarierte Custom-Property zeigt (oder einen Fallback hat).
    Catcht Typos und gelöschte Tokens.
  - npm-Scripts: `check:tokens`, `build:dark`. In `check` und `build`
    integriert; läuft auch via `prepublishOnly`.
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
- `semantic/dark.css` ist jetzt eine generierte Artifact-Datei. Änderungen
  bitte in `scripts/dark.tokens.js` und mit `npm run build:dark` neu erzeugen.
- README + Component-Listing auf 33 Components erweitert.

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
