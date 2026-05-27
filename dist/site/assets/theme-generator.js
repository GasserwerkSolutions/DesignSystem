/* Theme-Generator: HEX → OKLCH-Palette + Color-Blind-Check.
   Eingang: HEX-Hauptfarbe → 11-Step-Skala (50–950) in OKLCH-Lightness-Achse.
   Mathematik:
     sRGB → linear → OKLab → OKLCH (Björn Ottosson 2020).
     Color-Blind-Simulation: LMS-Space mit Brettel/Viénot-Mollon-Achsen-
     Kollaps. Quelle: brettel.org / Viénot et al. 1999. */
(function () {
  const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const TARGET_L = [0.97, 0.93, 0.86, 0.76, 0.66, 0.55, 0.46, 0.39, 0.33, 0.27, 0.21];

  /* ---------- sRGB ↔ Linear ---------- */
  const srgbToLinear = (v) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const linearToSrgb = (v) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

  /* ---------- HEX ↔ sRGB ---------- */
  function hexToRgb(hex) {
    let h = hex.trim().replace(/^#/, "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return {
      r: ((n >> 16) & 255) / 255,
      g: ((n >> 8) & 255) / 255,
      b: (n & 255) / 255,
    };
  }

  function rgbToHex({ r, g, b }) {
    const to = (v) => {
      const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
      return c.toString(16).padStart(2, "0");
    };
    return "#" + to(r) + to(g) + to(b);
  }

  /* ---------- linear-sRGB ↔ OKLab (Ottosson 2020) ---------- */
  function linearRgbToOklab(r, g, b) {
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    return {
      L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
      a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
      b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    };
  }

  function oklabToLinearRgb(L, a, b) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    return {
      r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    };
  }

  /* ---------- OKLab ↔ OKLCH ---------- */
  function oklabToOklch({ L, a, b }) {
    const C = Math.sqrt(a * a + b * b);
    const H = (Math.atan2(b, a) * 180) / Math.PI;
    return { L, C, H: H < 0 ? H + 360 : H };
  }
  function oklchToOklab({ L, C, H }) {
    const rad = (H * Math.PI) / 180;
    return { L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
  }

  /* ---------- HEX ↔ OKLCH ---------- */
  function hexToOklch(hex) {
    const { r, g, b } = hexToRgb(hex);
    const lab = linearRgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
    return oklabToOklch(lab);
  }
  function oklchToHex({ L, C, H }) {
    const lab = oklchToOklab({ L, C, H });
    const lin = oklabToLinearRgb(lab.L, lab.a, lab.b);
    return rgbToHex({
      r: linearToSrgb(lin.r),
      g: linearToSrgb(lin.g),
      b: linearToSrgb(lin.b),
    });
  }

  /* ---------- Gamut-Mapping ----------
     OKLCH erlaubt Farben außerhalb des sRGB-Gamuts. Reduziere Chroma bis
     die Konversion in 0..1 fällt. */
  function gamutMapToSrgb({ L, C, H }) {
    let lo = 0, hi = C, mid = C;
    for (let i = 0; i < 20; i++) {
      mid = (lo + hi) / 2;
      const lab = oklchToOklab({ L, C: mid, H });
      const lin = oklabToLinearRgb(lab.L, lab.a, lab.b);
      const r = linearToSrgb(lin.r);
      const g = linearToSrgb(lin.g);
      const b = linearToSrgb(lin.b);
      const inGamut = r >= -0.0001 && r <= 1.0001 && g >= -0.0001 && g <= 1.0001 && b >= -0.0001 && b <= 1.0001;
      if (inGamut) lo = mid; else hi = mid;
    }
    return { L, C: lo, H };
  }

  /* ---------- Palette generieren ---------- */
  function generatePalette(hex) {
    const base = hexToOklch(hex);
    const result = [];
    for (let i = 0; i < STEPS.length; i++) {
      const targetL = TARGET_L[i];
      const dropoff = Math.max(0, 1 - Math.abs(targetL - 0.6) * 2.2);
      const targetC = base.C * (0.3 + 0.7 * dropoff);
      const mapped = gamutMapToSrgb({ L: targetL, C: targetC, H: base.H });
      result.push({
        step: STEPS[i],
        L: mapped.L,
        C: mapped.C,
        H: mapped.H,
        hex: oklchToHex(mapped),
      });
    }
    return result;
  }

  /* ---------- Color-Blind-Simulation (Brettel/Viénot-Mollon) ----------
     LMS-Konversion + Achsen-Kollaps. Vereinfachte Konstanten. */
  const RGB_TO_LMS = [
    [0.31399022, 0.63951294, 0.04649755],
    [0.15537241, 0.75789446, 0.08670142],
    [0.01775239, 0.10944209, 0.87256922],
  ];
  const LMS_TO_RGB = [
    [5.47221206, -4.6419601, 0.16963708],
    [-1.1252419, 2.29317094, -0.1678952],
    [0.02980165, -0.19318073, 1.16364789],
  ];
  const CB_MATRICES = {
    deutan: [[1, 0, 0], [0.494207, 0, 1.24827], [0, 0, 1]],
    protan: [[0, 2.02344, -2.52581], [0, 1, 0], [0, 0, 1]],
    tritan: [[1, 0, 0], [0, 1, 0], [-0.395913, 0.801109, 0]],
  };

  function applyMatrix(m, [a, b, c]) {
    return [
      m[0][0] * a + m[0][1] * b + m[0][2] * c,
      m[1][0] * a + m[1][1] * b + m[1][2] * c,
      m[2][0] * a + m[2][1] * b + m[2][2] * c,
    ];
  }

  function simulateColorBlind(hex, type) {
    const { r, g, b } = hexToRgb(hex);
    const lms = applyMatrix(RGB_TO_LMS, [r, g, b]);
    const simulated = applyMatrix(CB_MATRICES[type], lms);
    const [sr, sg, sb] = applyMatrix(LMS_TO_RGB, simulated);
    return rgbToHex({
      r: Math.max(0, Math.min(1, sr)),
      g: Math.max(0, Math.min(1, sg)),
      b: Math.max(0, Math.min(1, sb)),
    });
  }

  /* ---------- Min-Delta-L für adjacent steps unter CB-Sim ---------- */
  function checkColorBlindSafety(palette) {
    const verdicts = {};
    for (const type of ["deutan", "protan", "tritan"]) {
      let minDelta = Infinity;
      let worstPair = "";
      for (let i = 1; i < palette.length; i++) {
        const a = hexToOklch(simulateColorBlind(palette[i - 1].hex, type));
        const b = hexToOklch(simulateColorBlind(palette[i].hex, type));
        const delta = Math.abs(a.L - b.L);
        if (delta < minDelta) {
          minDelta = delta;
          worstPair = palette[i - 1].step + "↔" + palette[i].step;
        }
      }
      verdicts[type] = { minDelta, worstPair, safe: minDelta >= 0.04 };
    }
    return verdicts;
  }

  /* ---------- DOM-Rendering ---------- */
  function renderPalette(palette) {
    const ol = document.querySelector("[data-theme-gen-palette]");
    if (!ol) return;
    ol.innerHTML = palette
      .map(
        (s) => `
        <li class="theme-gen__swatch">
          <div class="theme-gen__swatch-color" style="background:${s.hex};"></div>
          <div class="theme-gen__swatch-meta">
            <strong>${s.step}</strong>
            <code>${s.hex}</code>
            <span class="site-muted">L ${s.L.toFixed(2)} · C ${s.C.toFixed(3)} · H ${Math.round(s.H)}°</span>
          </div>
        </li>`
      )
      .join("");
  }

  function renderColorBlind(palette, verdicts) {
    const host = document.querySelector("[data-theme-gen-cb]");
    if (!host) return;
    const types = [
      ["deutan", "Deuteranopie"],
      ["protan", "Protanopie"],
      ["tritan", "Tritanopie"],
    ];
    host.innerHTML = types
      .map(([type, label]) => {
        const row = palette
          .map(
            (s) =>
              `<div class="theme-gen__cb-swatch" style="background:${simulateColorBlind(
                s.hex,
                type
              )};" title="${s.step}"></div>`
          )
          .join("");
        const v = verdicts[type];
        const status = v.safe ? "ok" : "warn";
        return `
          <div class="theme-gen__cb-row">
            <div class="theme-gen__cb-label">
              <strong>${label}</strong>
              <span class="badge ${v.safe ? "badge--success" : "badge--warning"}">
                ${v.safe ? "ok" : "knapp"} · Δ${v.minDelta.toFixed(3)} (${v.worstPair})
              </span>
            </div>
            <div class="theme-gen__cb-strip">${row}</div>
          </div>`;
      })
      .join("");

    const allSafe = Object.values(verdicts).every((v) => v.safe);
    document.querySelector("[data-theme-gen-cb-verdict]").innerHTML = allSafe
      ? `<div class="alert alert--success" role="status"><span class="alert__icon" aria-hidden="true">✓</span><div class="alert__body"><strong>Color-Blind-safe</strong><p>Alle adjacenten Steps haben ein Lightness-Delta ≥ 0.04 unter Deutan-, Protan- und Tritan-Simulation.</p></div></div>`
      : `<div class="alert alert--warning" role="alert"><span class="alert__icon" aria-hidden="true">!</span><div class="alert__body"><strong>Knappe Stufen</strong><p>Mindestens ein adjacenter Schritt fließt unter einer CB-Simulation ineinander. Wähle eine andere Hauptfarbe oder akzeptiere bewusst, dass diese Stufen nicht als Encoding-Differenz taugen.</p></div></div>`;
  }

  function renderPreview(palette, name) {
    const host = document.querySelector("[data-theme-gen-preview]");
    if (!host) return;
    const map = Object.fromEntries(palette.map((s) => [s.step, s.hex]));
    const style = host.querySelector("style") || document.createElement("style");
    style.textContent = `
      .theme-gen__preview[data-tone~="${name}"] {
        --color-interactive: ${map[600]};
        --color-interactive-light: ${map[100]};
        --color-interactive-dark: ${map[800]};
        --btn-bg: ${map[600]};
        --btn-bg-hover: ${map[700]};
        --btn-fg: white;
        --card-border: 1px solid ${map[100]};
        --card-bg: white;
        --color-success: ${map[600]};
        --status-success-border: ${map[600]};
        --status-success-bg: ${map[50]};
        --status-success-fg: ${map[800]};
      }`;
    host.appendChild(style);
    host.setAttribute("data-tone", name);
  }

  function renderCss(palette, name) {
    const code = document.querySelector("[data-theme-gen-css]");
    if (!code) return;
    const lines = palette.map((s) => `  --${name}-${s.step}: ${s.hex};`).join("\n");
    const css = `:root {
${lines}
}

[data-tone~="${name}"] {
  --color-interactive:       var(--${name}-600);
  --color-interactive-light: var(--${name}-100);
  --color-interactive-dark:  var(--${name}-800);
  --color-focus:             var(--${name}-600);
  --color-focus-ring:        var(--${name}-100);

  --btn-bg:       var(--${name}-600);
  --btn-bg-hover: var(--${name}-700);
  --btn-fg:       white;
  --btn-radius:   var(--radius-8);

  --card-bg:     white;
  --card-border: 1px solid var(--${name}-100);
  --card-radius: var(--radius-12);

  --color-success: var(--${name}-600);

  --input-focus-border: var(--${name}-600);
  --input-focus-ring:   var(--${name}-100);
}`;
    code.textContent = css;
  }

  function regenerate() {
    const hex = document.querySelector("[data-theme-gen-hex]").value.trim();
    const name = (document.querySelector("[data-theme-gen-name]").value.trim() || "custom").toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!/^#[0-9a-f]{6}$/i.test(hex) && !/^#[0-9a-f]{3}$/i.test(hex)) return;
    try {
      const palette = generatePalette(hex);
      const verdicts = checkColorBlindSafety(palette);
      renderPalette(palette);
      renderColorBlind(palette, verdicts);
      renderPreview(palette, name);
      renderCss(palette, name);
    } catch (e) {
      console.error("[theme-gen] error:", e);
    }
  }

  function init() {
    const colorInput = document.querySelector("[data-theme-gen-color]");
    const hexInput = document.querySelector("[data-theme-gen-hex]");
    const nameInput = document.querySelector("[data-theme-gen-name]");
    if (!colorInput || !hexInput || !nameInput) return;

    colorInput.addEventListener("input", () => {
      hexInput.value = colorInput.value;
      regenerate();
    });
    hexInput.addEventListener("input", () => {
      if (/^#[0-9a-f]{6}$/i.test(hexInput.value)) {
        colorInput.value = hexInput.value;
        regenerate();
      }
    });
    nameInput.addEventListener("input", regenerate);

    const copyBtn = document.querySelector("[data-theme-gen-copy]");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const code = document.querySelector("[data-theme-gen-css]");
        try {
          await navigator.clipboard.writeText(code.textContent);
          copyBtn.textContent = "✓ Kopiert";
          setTimeout(() => (copyBtn.textContent = "In Zwischenablage kopieren"), 1500);
        } catch {
          copyBtn.textContent = "× Kopie fehlgeschlagen";
        }
      });
    }

    regenerate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
