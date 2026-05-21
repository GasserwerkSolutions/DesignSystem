/**
 * Cloudflare Pages Function: Reviews Cache
 * Path:       /api/reviews   (GET only)
 * Runtime:    Cloudflare Workers
 *
 * Pipeline:
 *   1. KV-Cache prüfen (TTL 24h)
 *   2. Cache miss → Google Places Details API
 *   3. Reviews filtern (Mitarbeiter raus, < 4 Sterne raus, Stern-only raus)
 *   4. Top 5 Reviews behalten
 *   5. KV speichern, Response zurückgeben
 *
 * Bindings (im Cloudflare Pages Dashboard):
 *   Environment Variables:
 *     - GOOGLE_PLACES_API_KEY  (Server-Key, Restricted: nur Places API)
 *     - PLACE_ID               (Google Place ID des Zahnärztehaus Arch)
 *   KV Namespaces:
 *     - KV  (für Cache)
 *
 * Place-ID-Lookup:
 *   https://developers.google.com/maps/documentation/places/web-service/place-id
 */

const CACHE_TTL_SECONDS = 86400;          // 24h
const CACHE_KEY = 'reviews:zaa-arch:v1';
const PLACES_FIELDS = 'rating,user_ratings_total,reviews';
const REVIEW_LIMIT = 5;
const MIN_RATING = 4;
const MIN_TEXT_LENGTH = 20;

// Manuelle Filter-Liste — Reviews die nicht angezeigt werden sollen.
// Default leer; im Cloudflare Pages Dashboard via ENV `EXCLUDE_AUTHORS_CSV`
// zu setzen (z.B. "Max Muster,Jane Doe"). Vermeidet, dass Mitarbeiter-Namen
// im public Git-Repository sichtbar werden (Datenschutz/Würde-Aspekt).
function getExcludeAuthors(env) {
  const raw = (env && env.EXCLUDE_AUTHORS_CSV) || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
      // Same-origin only — Frontend ist auf gleicher Domain
      'access-control-allow-origin': 'https://www.URL-DES-KUNDEN.CH // TODO',
    },
  });
}

function filterReviews(reviews, excludeAuthors) {
  return (reviews || [])
    .filter(r => !excludeAuthors.includes(r.author_name))
    .filter(r => typeof r.rating === 'number' && r.rating >= MIN_RATING)
    .filter(r => typeof r.text === 'string' && r.text.trim().length >= MIN_TEXT_LENGTH)
    .map(r => ({
      author_name: r.author_name,
      rating: r.rating,
      relative_time_description: r.relative_time_description,
      text: r.text,
    }))
    .slice(0, REVIEW_LIMIT);
}

async function fetchFromGoogle(placeId, apiKey, excludeAuthors) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${encodeURIComponent(PLACES_FIELDS)}&language=de&reviews_sort=newest&key=${encodeURIComponent(apiKey)}`;
  const r = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!r.ok) throw new Error(`http_${r.status}`);
  const j = await r.json();
  if (j.status !== 'OK') throw new Error(`places_${j.status}`);
  return {
    rating: j.result.rating,
    user_ratings_total: j.result.user_ratings_total,
    reviews: filterReviews(j.result.reviews, excludeAuthors),
    cached: false,
    fetched_at: new Date().toISOString(),
  };
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  // 1. Cache lesen
  if (env.KV) {
    try {
      const cached = await env.KV.get(CACHE_KEY, 'json');
      if (cached) {
        return jsonResponse({ ...cached, cached: true });
      }
    } catch {
      // Cache-Lese-Fehler — nicht-fatal, wir holen frisch
    }
  }

  // 2. Config-Check
  if (!env.GOOGLE_PLACES_API_KEY || !env.PLACE_ID) {
    return jsonResponse({ error: 'config_missing' }, 503);
  }

  // 3. Frisch holen
  let data;
  try {
    data = await fetchFromGoogle(env.PLACE_ID, env.GOOGLE_PLACES_API_KEY, getExcludeAuthors(env));
  } catch (err) {
    return jsonResponse({
      error: 'fetch_failed',
      message: String((err && err.message) || err),
    }, 502);
  }

  // 4. Cachen
  if (env.KV) {
    try {
      await env.KV.put(CACHE_KEY, JSON.stringify(data), {
        expirationTtl: CACHE_TTL_SECONDS,
      });
    } catch {
      // Cache-Schreib-Fehler — nicht-fatal, Daten sind valide
    }
  }

  return jsonResponse(data);
}
