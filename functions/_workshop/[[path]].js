/**
 * Catch-all 404 für /_workshop/* — internes Workshop-Material (Build-Scripts,
 * Audits, Methodology-Docs) bleibt für Crawler und Direct-Hits unzugänglich.
 *
 * Functions haben Routing-Priorität vor Static-Assets — fängt also auch Pfade
 * ab, deren Files real im Upload-Bucket liegen. `robots.txt` enthält
 * zusätzlich `Disallow: /_workshop/` als zweite Verteidigungslinie.
 */

const BODY = `<!DOCTYPE html><html lang="de-CH"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>404 — Zahnärztehaus Arch</title><style>body{margin:0;padding:64px 24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fbf8f3;color:#1f2a24;text-align:center}h1{font-family:"Iowan Old Style",Palatino,Georgia,serif;font-weight:400;font-size:2rem;margin:0 0 .6em;color:#1A4585}a{color:#1A4585}</style></head><body><h1>Seite nicht gefunden</h1><p><a href="/">Zur Startseite</a></p></body></html>`;

const INIT = {
  status: 404,
  headers: {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=3600, s-maxage=86400',
    'x-robots-tag': 'noindex, nofollow',
  },
};

export const onRequest = () => new Response(BODY, INIT);
