#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");
const EXAMPLES = path.join(ROOT, "examples");
const VIEWPORTS = [320, 360, 390, 768, 1280];

async function inspect(browser, file, width) {
  const page = await browser.newPage();
  const issues = [];
  await page.setViewport({ width, height: 900 });
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (request.url().startsWith("file:")) issues.push(`requestfailed: ${request.url()}`);
  });
  await page.goto(`file://${file}`, { waitUntil: "load" });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const layout = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = Math.max(doc.scrollWidth, document.body.scrollWidth) - doc.clientWidth;
    const clipped = [...document.querySelectorAll("a,button,input,select,textarea,img,svg")]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.left < -2 || rect.right > innerWidth + 2);
      })
      .map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}.${String(element.className || "").split(/\s+/).filter(Boolean).slice(0, 2).join(".")}`)
      .slice(0, 8);
    // Bildregeln: jedes <img> braucht alt und feste Masse (kein Layout-Sprung),
    // muss geladen sein, und Bilder im Projektseiten-Pack sitzen in einem
    // Rahmen des Formatrasters statt in freier Grösse.
    const usesProjectPack = !!document.querySelector('link[href$="patterns/project.css"]');
    const framed = ".media__frame, .hero__backdrop, .gallery__item, .reference-card__image, .lightbox__figure";
    const images = [...document.querySelectorAll("img")].flatMap((img) => {
      const id = img.getAttribute("src")?.split("/").pop() || "(ohne src)";
      const found = [];
      if (!img.hasAttribute("alt")) found.push(`img ${id}: alt fehlt`);
      if (img.closest(".lightbox")) return found;
      if (!img.getAttribute("width") || !img.getAttribute("height")) found.push(`img ${id}: width/height fehlt`);
      if (img.complete && img.naturalWidth === 0) found.push(`img ${id}: nicht geladen`);
      if (usesProjectPack && !img.closest(framed)) found.push(`img ${id}: ausserhalb des Formatrasters`);
      return found;
    });
    // Geschützte Bildbereiche: aus Bildmass, Rahmen und object-position
    // nachrechnen, welcher Teil des Originals sichtbar ist.
    const protect = [];
    for (const img of document.querySelectorAll("img")) {
      if (!img.complete || !img.naturalWidth) continue;
      // Bei <picture> gehört der Bereich zur gewählten Bildfamilie.
      let spec = img.dataset.protect;
      const picture = img.closest("picture");
      if (picture) {
        const file = (img.currentSrc || "").split("/").pop();
        for (const source of picture.querySelectorAll("source")) {
          if (file && (source.getAttribute("srcset") || "").includes(file) && source.dataset.protect) spec = source.dataset.protect;
        }
      }
      if (!spec) continue;
      const cs = getComputedStyle(img);
      const fw = img.clientWidth, fh = img.clientHeight;
      if (!fw || !fh) continue;
      const nw = img.naturalWidth, nh = img.naturalHeight;
      const fit = cs.objectFit;
      const scale = fit === "contain" || fit === "scale-down" ? Math.min(fw / nw, fh / nh)
        : fit === "cover" ? Math.max(fw / nw, fh / nh) : null;
      const dw = scale ? nw * scale : fw, dh = scale ? nh * scale : fh;
      const pos = cs.objectPosition.split(" ").map((v) => (v.endsWith("%") ? parseFloat(v) / 100 : null));
      const px = pos[0] ?? 0.5, py = pos[1] ?? 0.5;
      const ox = (fw - dw) * px, oy = (fh - dh) * py;
      const vis = { x0: Math.max(0, -ox / dw), x1: Math.min(1, (fw - ox) / dw), y0: Math.max(0, -oy / dh), y1: Math.min(1, (fh - oy) / dh) };
      const eps = 0.01;
      for (const part of spec.split(";")) {
        const [x, y, w, h] = part.trim().split(/\s+/).map(Number);
        if (![x, y, w, h].every(Number.isFinite)) { protect.push(`data-protect ungültig: «${part.trim()}»`); continue; }
        const cut = [];
        if (x < vis.x0 - eps) cut.push(`links ${Math.round((vis.x0 - x) * 100)} %`);
        if (x + w > vis.x1 + eps) cut.push(`rechts ${Math.round((x + w - vis.x1) * 100)} %`);
        if (y < vis.y0 - eps) cut.push(`oben ${Math.round((vis.y0 - y) * 100)} %`);
        if (y + h > vis.y1 + eps) cut.push(`unten ${Math.round((y + h - vis.y1) * 100)} %`);
        if (cut.length) {
          const id = (img.currentSrc || img.src).split("/").pop();
          protect.push(`geschützter Bereich beschnitten in ${id} (${fw}×${fh}): ${cut.join(", ")}`);
        }
      }
    }

    // Ladeverhalten: Einstiegsbild nicht verzögern, Priorität nicht streuen.
    const loading = [];
    if (usesProjectPack) {
      const first = document.querySelector(".hero img");
      if (first && first.loading === "lazy") loading.push("Einstiegsbild ist loading=lazy");
      const high = document.querySelectorAll('img[fetchpriority="high"]').length;
      if (high > 1) loading.push(`${high} Bilder mit fetchpriority=high (höchstens 1)`);
    }
    return { overflow, clipped, images: [...new Set(images)].slice(0, 12), protect, loading, usesProjectPack };
  });

  // srcset-Breitenangaben müssen den wirklichen Pixelmassen entsprechen.
  if (layout.usesProjectPack) {
    const wrong = await page.evaluate(async () => {
      const found = [];
      for (const el of document.querySelectorAll("img[srcset], source[srcset]")) {
        for (const candidate of el.getAttribute("srcset").split(",")) {
          const [url, descriptor] = candidate.trim().split(/\s+/);
          if (!descriptor || !descriptor.endsWith("w")) continue;
          const probe = new Image();
          probe.src = new URL(url, document.baseURI).href;
          await probe.decode().catch(() => {});
          if (!probe.naturalWidth) found.push(`srcset: ${url} lädt nicht`);
          else if (probe.naturalWidth !== parseInt(descriptor, 10)) {
            found.push(`srcset: ${url} ist ${probe.naturalWidth}px breit, angegeben ${descriptor}`);
          }
        }
      }
      return found;
    });
    issues.push(...wrong);
  }
  if (layout.overflow > 2) issues.push(`document overflow ${layout.overflow}px`);
  if (layout.clipped.length) issues.push(`clipped interactive/media: ${layout.clipped.join(", ")}`);
  issues.push(...layout.images, ...layout.protect, ...layout.loading);

  // Robustheit (nur Projekt-Pack): 200 % Textgrösse und WCAG-1.4.12-
  // Textabstände dürfen keinen Überlauf und keine abgeschnittenen Bedienteile
  // erzeugen.
  if (layout.usesProjectPack) {
    const stress = {
      "Text 200 %": "html { font-size: 200% !important; }",
      "Textabstände 1.4.12": "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }",
    };
    for (const [label, css] of Object.entries(stress)) {
      const result = await page.evaluate(async (css) => {
        const style = document.createElement("style");
        style.textContent = css;
        document.head.append(style);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const doc = document.documentElement;
        const overflow = Math.max(doc.scrollWidth, document.body.scrollWidth) - doc.clientWidth;
        // Text, der aus seinem eigenen Kasten läuft und dort abgeschnitten wird.
        const cut = [...document.querySelectorAll(".hero__title, .section-head__title, .project-facts__item > dd, .spec__row > dd, .reference-card__title, .media__label, .btn, .site-header__link")]
          .filter((el) => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== "visible")
          .map((el) => el.className.split(" ")[0]).slice(0, 5);
        style.remove();
        return { overflow, cut };
      }, css);
      if (result.overflow > 2) issues.push(`${label}: Überlauf ${result.overflow}px`);
      if (result.cut.length) issues.push(`${label}: Text abgeschnitten in ${[...new Set(result.cut)].join(", ")}`);
    }
  }
  await page.close();
  return issues;
}

async function main() {
  const files = fs.readdirSync(EXAMPLES).filter((file) => file.endsWith(".html")).sort();
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  let failures = 0;
  try {
    for (const name of files) {
      for (const width of VIEWPORTS) {
        const issues = await inspect(browser, path.join(EXAMPLES, name), width);
        const label = `${name} @ ${width}px`;
        if (!issues.length) console.log(`  [ok]   ${label}`);
        else {
          console.error(`  [FAIL] ${label}`);
          for (const issue of issues) console.error(`         ${issue}`);
          failures += issues.length;
        }
      }
    }
  } finally {
    await browser.close();
  }
  if (failures) {
    console.error(`[check-examples] ${failures} issue(s).`);
    process.exit(1);
  }
  console.log(`[check-examples] ${files.length} examples × ${VIEWPORTS.length} viewports passed.`);
}

main().catch((error) => {
  console.error("[check-examples] crashed:", error);
  process.exit(2);
});
