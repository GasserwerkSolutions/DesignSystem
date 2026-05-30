/**
 * OKLCH Color Math — Node-side
 * ==============================
 *
 * Identische Math wie die in-browser Version in scripts/build-site.js
 * (THEME_GEN_JS). Wird im Build verwendet um die initial-Palette für die
 * themes.html-Seite vorzurendern → vermeidet CLS-Shift wenn JS später
 * dieselben Werte berechnet.
 *
 * Source: Björn Ottosson, https://bottosson.github.io/posts/oklab/
 */

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const TARGET_L = [0.97, 0.93, 0.86, 0.76, 0.66, 0.55, 0.46, 0.39, 0.33, 0.27, 0.21];

const srgbToLinear = (v) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const linearToSrgb = (v) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

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

function oklabToOklch({ L, a, b }) {
  const C = Math.sqrt(a * a + b * b);
  const H = (Math.atan2(b, a) * 180) / Math.PI;
  return { L, C, H: H < 0 ? H + 360 : H };
}
function oklchToOklab({ L, C, H }) {
  const rad = (H * Math.PI) / 180;
  return { L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
}

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

function gamutMapToSrgb({ L, C, H }) {
  let lo = 0, hi = C, mid = C;
  for (let i = 0; i < 20; i++) {
    mid = (lo + hi) / 2;
    const lab = oklchToOklab({ L, C: mid, H });
    const lin = oklabToLinearRgb(lab.L, lab.a, lab.b);
    const r = linearToSrgb(lin.r);
    const g = linearToSrgb(lin.g);
    const b = linearToSrgb(lin.b);
    const inGamut =
      r >= -0.0001 && r <= 1.0001 &&
      g >= -0.0001 && g <= 1.0001 &&
      b >= -0.0001 && b <= 1.0001;
    if (inGamut) lo = mid; else hi = mid;
  }
  return { L, C: lo, H };
}

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

/* Brettel/Viénot-Mollon Color-Blind-Simulation (identisch zu in-browser). */
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

module.exports = {
  generatePalette,
  hexToOklch,
  oklchToHex,
  simulateColorBlind,
  checkColorBlindSafety,
};
