/**
 * Dark-Mode Token-Source — Single Source of Truth
 * =================================================
 *
 * Wird von scripts/build-dark.js zu semantic/dark.css generiert.
 * Beide Trigger ([data-mode="dark"] + prefers-color-scheme) bekommen
 * dieselbe Token-Sektion, ohne hand-gewartete Duplikation.
 *
 * Struktur: Array von Sektionen mit Header-Kommentar und Token-Paaren.
 * Reihenfolge bleibt im Output erhalten.
 */

module.exports = {
  sections: [
    {
      heading: "Color-Scheme — Browser-Hint für UA-Defaults",
      tokens: [
        ["color-scheme", "dark"],
      ],
    },
    {
      heading: "Backgrounds",
      tokens: [
        ["--color-bg",           "var(--gray-950)"],
        ["--color-bg-secondary", "var(--gray-900)"],
        ["--color-bg-tertiary",  "var(--gray-800)"],
        ["--color-bg-inverse",   "var(--gray-100)"],
      ],
    },
    {
      heading: "Text",
      tokens: [
        ["--color-text-primary",   "var(--gray-50)"],
        ["--color-text-secondary", "var(--gray-300)"],
        ["--color-text-tertiary",  "var(--gray-500)"],
        ["--color-text-muted",     "var(--gray-600)"],
      ],
    },
    {
      heading: "Borders",
      tokens: [
        ["--color-border",       "var(--gray-700)"],
        ["--color-border-dark",  "var(--gray-600)"],
        ["--color-border-light", "var(--gray-800)"],
      ],
    },
    {
      heading: "Component-Contract-Defaults für Dark",
      tokens: [
        ["--card-bg",         "var(--gray-900)"],
        ["--card-border",     "1px solid var(--gray-800)"],
        ["--input-bg",        "var(--gray-900)"],
        ["--input-text",      "var(--gray-50)"],
        ["--table-bg",        "var(--gray-900)"],
        ["--table-header-bg", "var(--gray-800)"],
      ],
    },
    {
      heading: "Shadows — stärker (mehr Opacity) auf dunklem BG",
      tokens: [
        ["--shadow-sm",   "0 1px 2px 0 rgba(0, 0, 0, 0.4)"],
        ["--shadow-base", "0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.4)"],
        ["--shadow-md",   "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.4)"],
        ["--shadow-lg",   "0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.4)"],
        ["--shadow-xl",   "0 20px 25px -5px rgba(0, 0, 0, 0.6)"],
      ],
    },
    {
      heading: "Code-Block bleibt dunkel (war schon invers)",
      tokens: [
        ["--code-block-bg",      "var(--gray-800)"],
        ["--code-copy-bg",       "rgba(255, 255, 255, 0.06)"],
        ["--code-copy-hover-bg", "rgba(255, 255, 255, 0.12)"],
      ],
    },
    {
      heading: "Focus-Ring kontrastreicher",
      tokens: [
        ["--focus-ring", "3px solid var(--color-focus-ring)"],
      ],
    },
  ],
};
