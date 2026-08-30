# Website Patterns

Higher-level, content-first sections for normal customer websites.

This layer sits above `components/`: components are reusable UI parts, patterns are page sections composed from components and layout primitives.

## Included patterns

- `site-header` — brand, navigation, optional sticky header
- `hero` — centered, split, soft, fullbleed landing sections
- `section-head` — eyebrow, title, lead text for repeatable sections
- `trustbar` — compact facts, signals, opening hours, review snippets
- `service-grid` / `service-card` — services, treatments, offers, feature cards
- `feature-grid` / `feature-card` — benefit or concept grids
- `editorial-split` — text/media sections for story and explanation blocks
- `cta-band` — boxed, centered, split or strong call-to-action sections
- `faq-section` / `faq-list` — wrapper for accordion/disclosure content
- `contact-section` / `contact-card` — form plus contact details
- `sticky-action` — mobile contact, booking or urgent action bar
- `site-footer` — multi-column footer with bottom row

## Import

Full bundle:

```css
@import "@gasserwerksolutions/design-system";
```

Pattern-only import, when the rest of the system is already loaded:

```css
@import "@gasserwerksolutions/design-system/patterns/website.css";
```

## Contract style

Patterns expose CSS custom properties and consume existing semantic tokens. Themes should still set tokens, not pattern selectors.

```css
.hero {
  --hero-bg: var(--color-bg-secondary);
  --hero-py: var(--space-96);
}

.cta-band--strong {
  --cta-band-bg: var(--color-bg-inverse);
  --cta-band-fg: var(--color-text-on-dark);
}
```

## Example

```html
<html data-tone="trust" data-mode="light" data-density="comfortable">
  <body>
    <header class="site-header site-header--sticky">
      <div class="container site-header__inner">
        <a class="site-header__brand" href="/">Praxis Beispiel</a>
        <nav class="site-header__nav" aria-label="Hauptnavigation">
          <a href="#leistungen">Leistungen</a>
          <a href="#team">Team</a>
          <a href="#kontakt">Kontakt</a>
        </nav>
      </div>
    </header>

    <main>
      <section class="section hero hero--split hero--soft cq">
        <div class="container hero__inner">
          <div class="hero__content">
            <p class="hero__eyebrow">Lokale Dienstleistung</p>
            <h1 class="hero__title">Eine klare Startseite für normale Kunden.</h1>
            <p class="hero__lead">Erklärt Angebot, Vertrauen und nächsten Schritt ohne Sonderlayout.</p>
            <div class="hero__actions">
              <a class="btn" href="#kontakt">Anfragen</a>
              <a class="btn btn--ghost" href="#leistungen">Leistungen ansehen</a>
            </div>
          </div>
          <div class="hero__media">
            <img src="hero.jpg" alt="" />
          </div>
        </div>
      </section>

      <section class="trustbar cq">
        <div class="container trustbar__grid">
          <div class="trustbar__item">
            <strong class="trustbar__value">24h</strong>
            <span class="trustbar__label">Antwortzeit</span>
          </div>
          <div class="trustbar__item">
            <strong class="trustbar__value">4.9/5</strong>
            <span class="trustbar__label">Bewertung</span>
          </div>
        </div>
      </section>

      <section id="leistungen" class="section cq">
        <div class="container">
          <header class="section-head section-head--center">
            <p class="section-head__eyebrow">Leistungen</p>
            <h2 class="section-head__title">Was Kunden häufig brauchen</h2>
            <p class="section-head__lead">Drei bis sechs Karten reichen für die meisten Websites.</p>
          </header>

          <div class="service-grid">
            <article class="service-card">
              <h3 class="service-card__title">Beratung</h3>
              <p class="service-card__text">Kurze Beschreibung des Angebots.</p>
              <a class="service-card__more" href="#kontakt">Mehr erfahren</a>
            </article>
          </div>
        </div>
      </section>

      <section id="kontakt" class="section cq">
        <div class="container">
          <div class="cta-band cta-band--split">
            <div>
              <h2 class="cta-band__title">Bereit für den nächsten Schritt?</h2>
              <p class="cta-band__text">Ein klarer Kontaktblock beendet die Seite.</p>
            </div>
            <div class="cta-band__actions">
              <a class="btn" href="mailto:info@example.com">Kontakt aufnehmen</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>
```

## Naming rule

Keep pattern names industry-neutral:

- use `service-card`, not `treat-card`
- use `sticky-action`, not `emergency-bar`
- use `editorial-split`, not a project-specific story block name
- use `trustbar` for compact proof/fact strips across industries
