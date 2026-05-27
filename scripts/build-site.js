#!/usr/bin/env node
/**
 * Site Generator — Interactive Documentation
 * ============================================
 *
 * Parst die JSDoc-Header aller Components/Tokens/Themes und generiert
 * statische HTML-Seiten unter dist/site/. Die Site nutzt das DS selbst,
 * damit Theme-/Mode-/Density-Switches im Doc-Stack live wirken.
 *
 * Pipeline:
 *   1) parseHeader(file)          → { title, description, contract, markup,
 *                                      modifier, aria, notes }
 *   2) categorize(componentName)  → Group für Sidebar-Sortierung
 *   3) renderComponentPage(meta)  → HTML mit Live-Demo + Token-Tabelle
 *   4) renderIndexPage(metaAll)   → Landing mit Component-Grid
 *   5) copyAssets()               → Site-CSS/JS in dist/site/assets/
 *
 * Eingang:  components/*.css, tokens/*.css, themes/*.css
 * Ausgang:  dist/site/
 *
 * Konvention: Strict-Parser. Wo ein Header CONTRACT/Struktur fehlt,
 * gibt der Generator eine Warnung aus, statt zu raten.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const COMPONENTS_DIR = path.join(ROOT, "components");
const OUT_DIR = path.join(ROOT, "dist", "site");
const PKG_VERSION = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
).version;

/* =========================================================================
   1) HEADER PARSER
   ========================================================================= */

/**
 * Extrahiert den JSDoc-Header (alles zwischen erstem `/**` und schließendem
 * `* /`). Liefert das Innere ohne die ` *`-Präfixe.
 */
function extractHeaderRaw(source) {
  const match = source.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return null;
  return match[1]
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, ""))
    .join("\n")
    .trim();
}

/**
 * Trennt den Header in:
 *   - title:    erste Zeile (vor dem ===-Underline)
 *   - sections: Map { sectionName → bodyLines[] } für labeled blocks
 *                (CONTRACT, Struktur, Modifier, ARIA, Use-Cases, …)
 *   - intro:    freitext-Absätze zwischen Underline und erstem Label
 */
const SECTION_LABELS = [
  "CONTRACT",
  "Contract",
  "Required",
  "Optional",
  "Struktur",
  "Markup",
  "Beispiel",
  "Beispiele",
  "Modifier",
  "Modifiers",
  "ARIA",
  "Child",
];
const LABEL_START_RE = new RegExp(`^(${SECTION_LABELS.join("|")})\\b(.*)$`);

function detectLabelStart(line) {
  if (/^ {2,}/.test(line)) return null;
  const trimmed = line.trim();
  const m = trimmed.match(LABEL_START_RE);
  if (!m) return null;
  return { label: m[1], rest: m[2] };
}

function splitSections(headerText) {
  const lines = headerText.split("\n");
  const result = { title: "", intro: [], sections: {} };
  if (lines.length === 0) return result;

  result.title = lines[0].trim();

  let i = 1;
  while (i < lines.length && /^[=\-]+$/.test(lines[i].trim())) i++;

  let currentLabel = null;
  let currentBody = [];

  const flush = () => {
    if (currentLabel) {
      if (result.sections[currentLabel]) {
        result.sections[currentLabel].push("", ...currentBody);
      } else {
        result.sections[currentLabel] = currentBody;
      }
    } else if (currentBody.length) {
      result.intro = currentBody;
    }
    currentBody = [];
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    const start = detectLabelStart(line);

    if (start) {
      let labelTail = start.rest;
      let j = i;
      while (!/:\s*$|:\s/.test(labelTail) && j + 1 < lines.length) {
        const next = lines[j + 1];
        if (!next.trim()) break;
        if (detectLabelStart(next)) break;
        j++;
        labelTail += " " + next.trim();
      }
      if (/:/.test(labelTail)) {
        flush();
        currentLabel = start.label;
        const afterColon = labelTail.split(/:\s*/).slice(1).join(": ").trim();
        currentBody = afterColon ? [afterColon] : [];
        i = j;
        continue;
      }
    }
    currentBody.push(line);
  }
  flush();

  for (const folded of ["Required", "Optional"]) {
    if (result.sections[folded]) {
      const target = result.sections.CONTRACT || result.sections.Contract;
      const merged = target ? [...target, "", `${folded}:`] : [`${folded}:`];
      merged.push(...result.sections[folded]);
      const key = result.sections.Contract ? "Contract" : "CONTRACT";
      result.sections[key] = merged;
      delete result.sections[folded];
    }
  }

  return result;
}

/**
 * Parst den CONTRACT-Block in Required/Optional-Tokenlisten.
 * Format:
 *   Required:
 *     --foo, --bar
 *   Optional:
 *     --baz   Kommentar dazu
 */
function parseContract(bodyLines) {
  const out = { required: [], optional: [] };
  if (!bodyLines || !bodyLines.length) return out;

  let bucket = null;
  for (const raw of bodyLines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^Required:?$/i.test(line)) {
      bucket = "required";
      continue;
    }
    if (/^Optional:?$/i.test(line)) {
      bucket = "optional";
      continue;
    }
    const tokens = line.match(/--[a-z0-9-]+/gi);
    if (tokens && bucket) {
      const comment = line.split(/--[a-z0-9-]+/i).pop().trim();
      const note = comment.replace(/^[,/\s]+/, "").trim();
      for (const t of tokens) {
        out[bucket].push({ name: t, note: tokens.length === 1 ? note : "" });
      }
    }
  }
  return out;
}

/**
 * Extrahiert HTML-Snippets aus dem Struktur-Block. Trennt mehrere Beispiele,
 * wenn sie durch eine Leerzeile + Kommentarzeile (z.B. "Mit Error:") getrennt
 * sind.
 */
function parseMarkup(bodyLines) {
  if (!bodyLines || !bodyLines.length) return [];
  const examples = [];
  let buffer = [];
  let captionForNext = "";
  let inHtml = false;

  const flush = () => {
    if (buffer.some((l) => l.trim().startsWith("<"))) {
      const html = dedentHtml(buffer.join("\n"));
      examples.push({ caption: captionForNext, html });
    }
    buffer = [];
    captionForNext = "";
    inHtml = false;
  };

  const isCaption = (line) => {
    const trimmed = line.trim();
    if (!trimmed.endsWith(":")) return false;
    if (trimmed.startsWith("<")) return false;
    const leading = line.match(/^\s*/)[0].length;
    return leading < 4 && trimmed.length < 80;
  };

  for (const raw of bodyLines) {
    const line = raw;
    const trimmed = line.trim();

    if (!inHtml) {
      if (!trimmed) continue;
      if (trimmed.startsWith("<")) {
        inHtml = true;
        buffer.push(line);
        continue;
      }
      if (isCaption(line)) {
        captionForNext = trimmed.replace(/:$/, "");
        continue;
      }
      continue;
    }

    if (!trimmed) {
      buffer.push(line);
      continue;
    }
    if (isCaption(line)) {
      flush();
      captionForNext = trimmed.replace(/:$/, "");
      continue;
    }
    const indent = line.match(/^\s*/)[0].length;
    if (indent < 2 && !trimmed.startsWith("<")) {
      flush();
      if (isCaption(line)) captionForNext = trimmed.replace(/:$/, "");
      continue;
    }
    buffer.push(line);
  }
  flush();

  return examples;
}

function dedentHtml(text) {
  const lines = text.split("\n");
  const indents = lines
    .filter((l) => l.trim())
    .map((l) => l.match(/^\s*/)[0].length);
  const minIndent = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l) => l.slice(minIndent))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

function parseModifiers(bodyLines) {
  if (!bodyLines) return [];
  const mods = [];
  for (const raw of bodyLines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\.[a-z][a-z0-9_-]+)\s+(.*)$/i);
    if (m) {
      mods.push({ selector: m[1], description: m[2].trim() });
    } else if (line.startsWith(".")) {
      const parts = line.split(/\s+/);
      mods.push({ selector: parts[0], description: parts.slice(1).join(" ") });
    }
  }
  return mods;
}

function parseHeader(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const headerText = extractHeaderRaw(source);
  if (!headerText) {
    return {
      file: filePath,
      title: path.basename(filePath, ".css"),
      intro: [],
      contract: { required: [], optional: [] },
      markup: [],
      modifiers: [],
      aria: [],
      notes: {},
      missing: true,
    };
  }

  const { title, intro, sections } = splitSections(headerText);

  const findSection = (regex) => {
    for (const key of Object.keys(sections)) {
      if (regex.test(key)) return sections[key];
    }
    return null;
  };

  return {
    file: filePath,
    title: title.replace(/\s*\([^)]+\)\s*$/, "").trim() || title,
    titleFull: title,
    intro,
    contract: parseContract(findSection(/^CONTRACT|^Contract/i)),
    markup: parseMarkup(
      findSection(/^Struktur|^Markup|^Beispiel/i)
    ),
    modifiers: parseModifiers(findSection(/^Modifier/i)),
    aria: findSection(/^ARIA/i) || [],
    notes: sections,
    missing: false,
  };
}

/* =========================================================================
   2) CATEGORIZATION (Sidebar-Gruppen)
   ========================================================================= */

const CATEGORIES = {
  Layout: [
    "app-shell",
    "section",
    "card",
    "panel-list",
    "divider",
    "list-row",
  ],
  Form: [
    "field",
    "checkbox",
    "switch",
    "select",
    "search",
    "date-input",
    "combobox",
    "file-upload",
    "range",
    "slider",
    "button",
  ],
  Feedback: [
    "alert",
    "banner",
    "callout",
    "toast",
    "progress",
    "spinner",
    "skeleton",
    "empty-state",
  ],
  Navigation: [
    "nav",
    "tabs",
    "breadcrumbs",
    "pagination",
    "tree",
    "steps",
    "accordion",
  ],
  Overlay: ["modal", "drawer", "tooltip", "popover"],
  "Data Display": [
    "table",
    "chart",
    "stat",
    "trend",
    "badge",
    "tag",
    "avatar",
    "avatar-stack",
    "code-block",
    "timeline",
    "funnel",
  ],
  Primitive: ["chevron"],
};

function categoryOf(name) {
  for (const [cat, names] of Object.entries(CATEGORIES)) {
    if (names.includes(name)) return cat;
  }
  return "Other";
}

/* =========================================================================
   3) HTML TEMPLATES
   ========================================================================= */

const NAV_ITEMS = [
  { label: "Overview", href: "./index.html" },
  { label: "Foundations", href: "./foundations.html" },
  { label: "Components", href: "./components/button.html" },
  { label: "Themes", href: "./themes.html" },
  { label: "Playground", href: "./playground.html" },
];

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Page-Shell — App-Shell-Layout aus dem DS, Sidebar = Component-Index,
 * Topbar = Tone/Mode/Density-Switcher.
 */
function pageShell({ title, navHref, body, sidebar, relRoot = "./" }) {
  const projectRoot = `${relRoot}../../`;
  return `<!DOCTYPE html>
<html lang="de" data-tone="trust" data-mode="light" data-density="comfortable">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — Design System</title>
  <link rel="stylesheet" href="${projectRoot}main.css">
  <link rel="stylesheet" href="${relRoot}assets/site.css">
  <script defer src="${projectRoot}dist/js/design-system.iife.js"></script>
  <script defer src="${relRoot}assets/site.js"></script>
</head>
<body>
  <div class="app-shell">
    <header class="app-shell__topbar">
      <div class="site-topbar">
        <a class="site-topbar__brand" href="${relRoot}index.html">
          <strong>Design System</strong>
          <span class="badge badge--neutral">v${PKG_VERSION}</span>
        </a>
        <nav class="site-topbar__nav" aria-label="Hauptnavigation">
          ${NAV_ITEMS.map(
            (n) =>
              `<a class="site-topbar__link${
                n.href.endsWith(navHref) ? " is-active" : ""
              }" href="${relRoot}${n.href.replace(/^\.\//, "")}">${escapeHtml(
                n.label
              )}</a>`
          ).join("\n          ")}
        </nav>
        <div class="site-topbar__switches">
          ${toneSwitcher()}
          ${modeSwitcher()}
          ${densitySwitcher()}
        </div>
      </div>
    </header>
    <aside class="app-shell__sidebar">
      ${sidebar}
    </aside>
    <main class="app-shell__main">
      ${body}
    </main>
  </div>
</body>
</html>`;
}

function toneSwitcher() {
  const tones = ["trust", "playful", "premium", "industrial", "modern", "minimal"];
  return `<label class="visually-hidden" for="site-tone">Tone</label>
        <select id="site-tone" class="site-select" data-axis="tone">
          ${tones
            .map(
              (t) =>
                `<option value="${t}">${
                  t[0].toUpperCase() + t.slice(1)
                }</option>`
            )
            .join("")}
        </select>`;
}

function modeSwitcher() {
  return `<button type="button" class="btn btn--ghost btn--sm" data-axis="mode">Light/Dark</button>`;
}

function densitySwitcher() {
  return `<label class="visually-hidden" for="site-density">Density</label>
        <select id="site-density" class="site-select" data-axis="density">
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
          <option value="spacious">Spacious</option>
        </select>`;
}

function componentSidebar(components, activeName, relRoot) {
  const groups = {};
  for (const c of components) {
    const cat = categoryOf(c.name);
    (groups[cat] ??= []).push(c);
  }
  const order = [
    "Layout",
    "Form",
    "Feedback",
    "Navigation",
    "Overlay",
    "Data Display",
    "Primitive",
    "Other",
  ];

  return `<nav class="site-sidebar" aria-label="Components">
        <input type="search" class="site-sidebar__search" placeholder="Suchen …" data-sidebar-search>
        ${order
          .filter((g) => groups[g])
          .map(
            (g) => `
        <div class="site-sidebar__group">
          <div class="site-sidebar__group-label">${escapeHtml(g)}</div>
          <ul class="site-sidebar__list">
            ${groups[g]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(
                (c) =>
                  `<li><a class="site-sidebar__link${
                    c.name === activeName ? " is-active" : ""
                  }" href="${relRoot}components/${c.name}.html">${escapeHtml(
                    c.title
                  )}</a></li>`
              )
              .join("\n            ")}
          </ul>
        </div>`
          )
          .join("\n        ")}
      </nav>`;
}

function renderTokenTable(contract) {
  const rows = [];
  for (const t of contract.required)
    rows.push({ ...t, kind: "Required" });
  for (const t of contract.optional)
    rows.push({ ...t, kind: "Optional" });

  if (!rows.length) {
    return `<p class="site-muted">Keine eigenen Tokens — Component nutzt zentrale semantic-Tokens.</p>`;
  }

  return `<table class="table site-token-table">
    <thead>
      <tr><th>Token</th><th>Status</th><th>Notiz</th></tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) => `
      <tr>
        <td><code>${escapeHtml(r.name)}</code></td>
        <td><span class="badge ${
          r.kind === "Required" ? "badge--info" : "badge--neutral"
        }">${r.kind}</span></td>
        <td>${escapeHtml(r.note || "—")}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

function renderMarkupExamples(markup) {
  if (!markup.length) return "";
  return markup
    .map(
      (ex, i) => `
    <section class="site-example">
      ${ex.caption ? `<h3 class="site-example__caption">${escapeHtml(ex.caption)}</h3>` : ""}
      <div class="site-example__preview">${ex.html}</div>
      <details class="site-example__source">
        <summary>HTML anzeigen</summary>
        <pre class="code-block"><code>${escapeHtml(ex.html)}</code></pre>
      </details>
    </section>`
    )
    .join("\n");
}

function renderIntro(intro) {
  if (!intro || !intro.length) return "";

  const blocks = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length) {
      blocks.push(buffer);
      buffer = [];
    }
  };
  for (const line of intro) {
    if (!line.trim()) {
      flush();
    } else {
      buffer.push(line);
    }
  }
  flush();

  const bulletRe = /^\s*[-•]\s+/;
  const fragments = [];
  for (const block of blocks) {
    const bulletStart = block.findIndex((l) => bulletRe.test(l));
    if (bulletStart === -1) {
      const text = block.join(" ").replace(/\s+/g, " ").trim();
      if (text) fragments.push(`<p>${escapeHtml(text)}</p>`);
    } else {
      if (bulletStart > 0) {
        const lead = block
          .slice(0, bulletStart)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (lead) fragments.push(`<p>${escapeHtml(lead)}</p>`);
      }
      const items = [];
      let current = "";
      for (const l of block.slice(bulletStart)) {
        if (bulletRe.test(l)) {
          if (current) items.push(current.trim());
          current = l.replace(bulletRe, "");
        } else {
          current += " " + l.trim();
        }
      }
      if (current) items.push(current.trim());
      fragments.push(
        `<ul class="site-intro-list">${items
          .map((it) => `<li>${escapeHtml(it.replace(/\s+/g, " "))}</li>`)
          .join("")}</ul>`
      );
    }
  }
  return fragments.join("\n");
}

function renderModifiers(mods) {
  if (!mods.length) return "";
  return `
  <h2>Modifier</h2>
  <ul class="site-modifier-list">
    ${mods
      .map(
        (m) =>
          `<li><code>${escapeHtml(m.selector)}</code> — ${escapeHtml(
            m.description
          )}</li>`
      )
      .join("\n    ")}
  </ul>`;
}

function renderComponentPage(meta, allComponents) {
  const sidebar = componentSidebar(allComponents, meta.name, "../");
  const body = `
      <article class="site-doc">
        <header class="site-doc__header">
          <span class="site-doc__category">${escapeHtml(categoryOf(meta.name))}</span>
          <h1 class="site-doc__title">${escapeHtml(meta.title)}</h1>
          ${renderIntro(meta.intro)}
        </header>

        <section class="site-doc__section">
          <h2>Beispiele</h2>
          ${renderMarkupExamples(meta.markup) || `<p class="site-muted">Kein Markup-Beispiel im Header — siehe Source.</p>`}
        </section>

        <section class="site-doc__section">
          <h2>Token-Contract</h2>
          ${renderTokenTable(meta.contract)}
        </section>

        ${renderModifiers(meta.modifiers)}

        <footer class="site-doc__footer">
          <a class="btn btn--ghost btn--sm" href="../../../components/${meta.name}.css">Source-CSS ansehen</a>
        </footer>
      </article>`;

  return pageShell({
    title: meta.title,
    navHref: "components/button.html",
    body,
    sidebar,
    relRoot: "../",
  });
}

function renderStubPage({ title, navHref, intro, components, relRoot = "./" }) {
  const sidebar = componentSidebar(components, null, relRoot);
  const body = `
      <article class="site-doc">
        <header class="site-doc__header">
          <h1 class="site-doc__title">${escapeHtml(title)}</h1>
          <p class="site-doc__lede">${escapeHtml(intro)}</p>
        </header>
        <section class="site-doc__section">
          <div class="card">
            <p class="site-muted">Diese Seite wird in einem nachfolgenden Etappen-Commit aufgebaut.</p>
            <p>Bis dahin: <a href="./index.html">zurück zur Übersicht</a>.</p>
          </div>
        </section>
      </article>`;
  return pageShell({ title, navHref, body, sidebar, relRoot });
}

function firstIntroLine(intro) {
  for (const line of intro || []) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("-") && !trimmed.startsWith("=")) {
      return trimmed.replace(/\s+/g, " ");
    }
  }
  return "";
}

const CATEGORY_ORDER = [
  "Layout",
  "Form",
  "Feedback",
  "Navigation",
  "Overlay",
  "Data Display",
  "Primitive",
  "Other",
];

function renderIndexPage(components) {
  const groups = {};
  for (const c of components) {
    const cat = categoryOf(c.name);
    (groups[cat] ??= []).push(c);
  }
  const sidebar = componentSidebar(components, null, "./");
  const orderedCategories = CATEGORY_ORDER.filter((c) => groups[c]);
  const body = `
      <article class="site-doc">
        <header class="site-doc__header">
          <h1 class="site-doc__title">Design System</h1>
          <p class="site-doc__lede">
            Contract-basiertes Multi-Tone CSS-System.
            6 Tones × 2 Modes × 3 Densities, ${components.length} Components,
            WCAG-AA validiert.
          </p>
          <div class="site-doc__cta">
            <a class="btn" href="./components/button.html">Components durchsuchen</a>
            <a class="btn btn--secondary" href="./themes.html">Theme generieren</a>
            <a class="btn btn--ghost" href="./foundations.html">Foundations</a>
          </div>
        </header>

        <section class="site-doc__section">
          <h2>Components nach Kategorie</h2>
          ${orderedCategories
            .map(
              (cat) => `
          <div class="site-category">
            <h3 class="site-category__title">${escapeHtml(cat)} <span class="site-muted">(${groups[cat].length})</span></h3>
            <ul class="site-component-grid">
              ${groups[cat]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => {
                  const desc = firstIntroLine(c.intro);
                  return `
              <li>
                <a class="card site-component-card" href="./components/${c.name}.html">
                  <strong>${escapeHtml(c.title)}</strong>
                  ${
                    desc
                      ? `<span class="site-muted">${escapeHtml(
                          desc.slice(0, 90)
                        )}${desc.length > 90 ? "…" : ""}</span>`
                      : ""
                  }
                </a>
              </li>`;
                })
                .join("")}
            </ul>
          </div>`
            )
            .join("\n")}
        </section>
      </article>`;
  return pageShell({
    title: "Design System",
    navHref: "index.html",
    body,
    sidebar,
    relRoot: "./",
  });
}

/* =========================================================================
   4) SITE ASSETS (CSS + JS)
   ========================================================================= */

const SITE_CSS = `/* Site-Overlay — eigene Layout/Doc-Komponenten, baut aufs DS auf. */
@layer site-overlay {
  :root {
    --sidebar-width: 260px;
    --topbar-height: 56px;
  }

  body {
    margin: 0;
    background: var(--color-background);
    color: var(--color-text-primary);
  }

  .app-shell {
    display: grid;
    grid-template-columns: var(--sidebar-width) 1fr;
    grid-template-rows: var(--topbar-height) 1fr;
    grid-template-areas:
      "topbar topbar"
      "sidebar main";
    min-height: 100vh;
  }
  .app-shell__topbar  { grid-area: topbar;  border-bottom: 1px solid var(--color-border); background: var(--color-surface); position: sticky; top: 0; z-index: 10; }
  .app-shell__sidebar { grid-area: sidebar; border-right: 1px solid var(--color-border); background: var(--color-surface-subtle, var(--color-surface)); overflow-y: auto; max-height: calc(100vh - var(--topbar-height)); position: sticky; top: var(--topbar-height); }
  .app-shell__main    { grid-area: main;    padding: var(--space-32); max-width: 980px; }

  .site-topbar {
    display: flex;
    align-items: center;
    gap: var(--space-24);
    padding-inline: var(--space-24);
    height: 100%;
  }
  .site-topbar__brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-8);
    text-decoration: none;
    color: inherit;
  }
  .site-topbar__nav {
    display: flex;
    gap: var(--space-4);
    margin-inline-start: var(--space-16);
  }
  .site-topbar__link {
    padding: var(--space-6) var(--space-12);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: var(--font-sm);
    font-weight: var(--fw-500);
  }
  .site-topbar__link:hover { background: var(--color-surface-hover, var(--color-surface)); color: var(--color-text-primary); }
  .site-topbar__link.is-active {
    background: var(--color-interactive);
    color: var(--color-on-interactive, white);
  }
  .site-topbar__switches {
    display: flex;
    gap: var(--space-8);
    margin-inline-start: auto;
    align-items: center;
  }

  .site-select {
    padding: var(--space-6) var(--space-12);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-sm);
  }

  .site-sidebar { padding: var(--space-16); }
  .site-sidebar__search {
    width: 100%;
    padding: var(--space-8) var(--space-12);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    margin-bottom: var(--space-16);
  }
  .site-sidebar__group { margin-bottom: var(--space-16); }
  .site-sidebar__group-label {
    font-size: var(--font-xs);
    font-weight: var(--fw-700);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-tertiary, var(--color-text-secondary));
    margin-bottom: var(--space-4);
    padding-inline: var(--space-8);
  }
  .site-sidebar__list { list-style: none; margin: 0; padding: 0; }
  .site-sidebar__list li { padding: 0; margin: 0; position: static; }
  .site-sidebar__list li::before { content: none; }
  .site-sidebar__link {
    display: block;
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-sm);
    font-size: var(--font-sm);
    color: var(--color-text-secondary);
    text-decoration: none;
  }
  .site-sidebar__link:hover { background: var(--color-surface-hover, var(--color-surface)); color: var(--color-text-primary); }
  .site-sidebar__link.is-active {
    background: var(--color-interactive);
    color: var(--color-on-interactive, white);
  }

  .site-doc { display: flex; flex-direction: column; gap: var(--space-32); }
  .site-doc__category {
    font-size: var(--font-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-tertiary, var(--color-text-secondary));
    font-weight: var(--fw-700);
  }
  .site-doc__title { font-size: var(--font-3xl, 2rem); margin: var(--space-4) 0 var(--space-12); }
  .site-doc__lede  { font-size: var(--font-lg); color: var(--color-text-secondary); max-width: 60ch; }
  .site-doc__cta   { display: flex; gap: var(--space-12); margin-top: var(--space-24); }
  .site-doc__section { display: flex; flex-direction: column; gap: var(--space-16); }
  .site-doc__section > h2 { margin: 0; font-size: var(--font-xl); }
  .site-doc__footer { margin-top: var(--space-32); padding-top: var(--space-16); border-top: 1px solid var(--color-border); }

  .site-example { display: flex; flex-direction: column; gap: var(--space-12); padding: var(--space-24); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
  .site-example__caption { margin: 0; font-size: var(--font-sm); color: var(--color-text-secondary); font-weight: var(--fw-600); }
  .site-example__preview { display: flex; flex-direction: column; gap: var(--space-12); padding: var(--space-16); background: var(--color-background); border-radius: var(--radius-md); border: 1px dashed var(--color-border); }
  .site-example__source pre { margin: 0; max-height: 320px; overflow: auto; }

  .site-token-table code { font-size: var(--font-sm); }

  .site-intro-list { padding-inline-start: var(--space-24); display: flex; flex-direction: column; gap: var(--space-4); color: var(--color-text-secondary); max-width: 65ch; }
  .site-intro-list li { line-height: var(--lh-normal); }

  .site-modifier-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-8); }
  .site-modifier-list li { padding: var(--space-8) var(--space-12); background: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border); position: static; margin: 0; }
  .site-modifier-list li::before { content: none; }

  .site-category { display: flex; flex-direction: column; gap: var(--space-12); margin-bottom: var(--space-32); }
  .site-category__title { font-size: var(--font-lg); margin: 0; }
  .site-component-grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-12); }
  .site-component-grid li { list-style: none; position: static; margin: 0; }
  .site-component-grid li::before { content: none; }
  .site-component-card { display: flex; flex-direction: column; gap: var(--space-4); text-decoration: none; color: inherit; }
  .site-component-card:hover { transform: translateY(-2px); box-shadow: var(--elevation-4); }
  .site-component-card .site-muted { font-size: var(--font-sm); }

  .site-muted { color: var(--color-text-secondary); }
  .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); border: 0; }
}
`;

const SITE_JS = `/* Site-Runtime — axis-switchers (tone/mode/density) + sidebar-search. */
(function () {
  const root = document.documentElement;

  function readState() {
    const params = new URLSearchParams(location.search);
    const tone = params.get("tone") || localStorage.getItem("ds-tone") || "trust";
    const mode = params.get("mode") || localStorage.getItem("ds-mode") || "light";
    const density = params.get("density") || localStorage.getItem("ds-density") || "comfortable";
    root.setAttribute("data-tone", tone);
    root.setAttribute("data-mode", mode);
    root.setAttribute("data-density", density);
    document.querySelectorAll('[data-axis="tone"]').forEach((el) => (el.value = tone));
    document.querySelectorAll('[data-axis="density"]').forEach((el) => (el.value = density));
  }

  function persist() {
    localStorage.setItem("ds-tone", root.getAttribute("data-tone"));
    localStorage.setItem("ds-mode", root.getAttribute("data-mode"));
    localStorage.setItem("ds-density", root.getAttribute("data-density"));
  }

  document.addEventListener("change", (e) => {
    const t = e.target.closest('[data-axis="tone"]');
    if (t) { root.setAttribute("data-tone", t.value); persist(); return; }
    const d = e.target.closest('[data-axis="density"]');
    if (d) { root.setAttribute("data-density", d.value); persist(); return; }
  });

  document.addEventListener("click", (e) => {
    const m = e.target.closest('[data-axis="mode"]');
    if (m) {
      const next = root.getAttribute("data-mode") === "dark" ? "light" : "dark";
      root.setAttribute("data-mode", next);
      persist();
    }
  });

  document.addEventListener("input", (e) => {
    const s = e.target.closest("[data-sidebar-search]");
    if (!s) return;
    const q = s.value.trim().toLowerCase();
    document.querySelectorAll(".site-sidebar__link").forEach((a) => {
      const match = !q || a.textContent.toLowerCase().includes(q);
      a.style.display = match ? "" : "none";
    });
  });

  readState();
  if (window.DS && typeof DS.setupAll === "function") DS.setupAll();
})();
`;

/* =========================================================================
   5) ORCHESTRATION
   ========================================================================= */

function main() {
  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true });
  }
  fs.mkdirSync(path.join(OUT_DIR, "components"), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, "assets"), { recursive: true });

  const files = fs
    .readdirSync(COMPONENTS_DIR)
    .filter((f) => f.endsWith(".css"))
    .sort();

  const components = files.map((f) => {
    const name = path.basename(f, ".css");
    const meta = parseHeader(path.join(COMPONENTS_DIR, f));
    return { ...meta, name };
  });

  const missing = components.filter((c) => c.missing);
  if (missing.length) {
    console.warn(
      `[build-site] ${missing.length} components without parsable header:`,
      missing.map((m) => m.name).join(", ")
    );
  }

  for (const c of components) {
    const html = renderComponentPage(c, components);
    fs.writeFileSync(path.join(OUT_DIR, "components", `${c.name}.html`), html);
  }

  fs.writeFileSync(path.join(OUT_DIR, "index.html"), renderIndexPage(components));

  const stubs = [
    {
      file: "foundations.html",
      title: "Foundations",
      navHref: "foundations.html",
      intro:
        "Tokens, Spacing, Typografie, Farben — die Atome des Systems. Live-Editor und Token-Browser folgen.",
    },
    {
      file: "themes.html",
      title: "Theme-Generator",
      navHref: "themes.html",
      intro:
        "HEX-Picker → OKLCH-12-Step-Skala, Color-Blind-Safety-Check, Export als CSS. In Vorbereitung.",
    },
    {
      file: "playground.html",
      title: "Playground",
      navHref: "playground.html",
      intro:
        "Interaktive Sandbox mit URL-State-Persistierung. In Vorbereitung.",
    },
  ];
  for (const s of stubs) {
    fs.writeFileSync(
      path.join(OUT_DIR, s.file),
      renderStubPage({ ...s, components, relRoot: "./" })
    );
  }

  fs.writeFileSync(path.join(OUT_DIR, "assets", "site.css"), SITE_CSS);
  fs.writeFileSync(path.join(OUT_DIR, "assets", "site.js"), SITE_JS);

  console.log(
    `[build-site] generated ${components.length} component pages + index → dist/site/`
  );
}

main();
