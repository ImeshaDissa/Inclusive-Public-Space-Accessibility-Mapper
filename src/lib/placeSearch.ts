/**
 * Multi-provider place search.
 *
 * Combines OpenStreetMap Nominatim + Photon (Komoot) so that any query style
 * works: different word orders ("colombo galle face sri lanka"), joined words
 * ("srilanka"), commas, small typos ("golface" ~ "galle face") and worldwide
 * locations (no country lock). Results from every provider are merged,
 * de-duplicated and re-ranked with a fuzzy score before being returned.
 */

export interface PlaceSearchResult {
  place_id: string;
  lat: number;
  lon: number;
  display_name: string;
  name?: string;
  country?: string;
  source: 'nominatim' | 'photon';
  /** True when the result came from the AI-rewritten query path. */
  viaAi?: boolean;
}

interface ScoredResult extends PlaceSearchResult {
  score: number;
}

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';
const REQUEST_TIMEOUT_MS = 8000;
const NOMINATIM_MIN_INTERVAL_MS = 1050; // Nominatim usage policy: max 1 req/sec
const MIN_SCORE = 0.15;
const FALLBACK_TOP_SCORE = 0.3;
const MAX_FALLBACK_QUERIES = 3;

/** Common joined/short country spellings expanded before searching. */
const QUERY_ALIASES: Record<string, string> = {
  srilanka: 'sri lanka',
  srilank: 'sri lanka',
  ceylon: 'sri lanka',
  uk: 'united kingdom',
  usa: 'united states',
  uae: 'united arab emirates',
};

/**
 * Country / region tokens: when a query mixes these with a place name, they
 * are treated as optional context for local list filtering (a saved place
 * rarely stores its country), but still required if the query is only them.
 */
const OPTIONAL_GEO_TOKENS = new Set([
  'sri', 'lanka', 'srilanka', 'ceylon',
  'india', 'indian', 'china', 'chinese', 'japan', 'japanese',
  'korea', 'korean', 'thailand', 'thai', 'vietnam', 'malaysia', 'indonesian',
  'indonesia', 'singapore', 'nepal', 'bangladesh', 'pakistan', 'maldives',
  'france', 'french', 'germany', 'german', 'italy', 'italian', 'spain',
  'spanish', 'portugal', 'greece', 'turkey', 'russia', 'russian',
  'united', 'kingdom', 'states', 'america', 'usa', 'uk', 'uae', 'emirates',
  'arab', 'australia', 'canada', 'brazil', 'europe', 'asia', 'africa',
]);

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/** Lowercase, strip accents/punctuation (keeps commas as query structure). */
function cleanText(input: string): string {
  let s = (input || '').toLowerCase();
  if (typeof s.normalize === 'function') {
    s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  }
  s = s.replace(/,/g, '\u0001'); // protect commas
  s = s.replace(/[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]/g, ' ');
  s = s.replace(/\u0001/g, ',');
  return s.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
}

/** Normalize a user query: casing, spaces, joined words, aliases. */
export function normalizeQuery(query: string): string {
  let s = cleanText(query);
  for (const [alias, replacement] of Object.entries(QUERY_ALIASES)) {
    s = s.replace(
      new RegExp(`(^|[^a-z])${alias}([^a-z]|$)`, 'g'),
      `$1${replacement}$2`
    );
  }
  return s.replace(/\s+/g, ' ').trim();
}

/** Split any text into comparable lowercase tokens. */
export function tokenize(text: string): string[] {
  return cleanText(text)
    .replace(/,/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[b.length];
}

/** Similarity of two tokens, 0..1 (exact = 1, prefix = 0.92, fuzzy otherwise). */
function tokenSimilarity(queryToken: string, candidate: string): number {
  if (queryToken === candidate) return 1;
  if (queryToken.length >= 3 && candidate.startsWith(queryToken)) return 0.92;
  const maxLen = Math.max(queryToken.length, candidate.length);
  if (maxLen === 0) return 0;
  const distance = levenshtein(queryToken, candidate);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Local (in-memory) matcher used to filter saved places / reports.
 * - Query is normalized first, so "srilanka" == "sri lanka".
 * - Every query token must match some haystack token (order independent,
 *   tolerant to small typos and partial words).
 * - Country/region tokens are optional when other tokens are present, so
 *   "galle face srilanka" matches a place saved as "Galle Face, Colombo".
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const tokens = tokenize(normalizeQuery(query));
  if (tokens.length === 0) return true;
  const hayTokens = tokenize(haystack);
  if (hayTokens.length === 0) return false;

  const required = tokens.filter((t) => !OPTIONAL_GEO_TOKENS.has(t));
  const effective = required.length > 0 ? required : tokens;
  return effective.every((qt) =>
    hayTokens.some((ht) => tokenSimilarity(qt, ht) >= 0.8)
  );
}

// ---------------------------------------------------------------------------
// Scoring / ranking
// ---------------------------------------------------------------------------

/**
 * Best fuzzy match of a query token against a result's words (including
 * two-word joins like "galle"+"face" -> "galleface", so joined typos such as
 * "golface" still recognise a place called "Galle Face").
 */
function bestTokenMatch(queryToken: string, words: string[]): number {
  let best = 0;
  for (const word of words) {
    const sim = tokenSimilarity(queryToken, word);
    if (sim > best) best = sim;
    if (best === 1) break;
  }
  if (best < 1) {
    for (let i = 0; i + 1 < words.length; i++) {
      const sim = tokenSimilarity(queryToken, words[i] + words[i + 1]);
      if (sim > best) best = sim;
      if (best === 1) break;
    }
  }
  return best;
}

function scoreResult(
  queryPlain: string,
  queryTokens: string[],
  originalRequiredTokens: string[],
  result: PlaceSearchResult
): number {
  const nameTokens = tokenize(result.name || result.display_name.split(',')[0]);
  const allTokens = tokenize(result.display_name);
  const displayPlain = result.display_name.toLowerCase().replace(/,/g, ' ');

  let score = 0;
  if (queryPlain && displayPlain.indexOf(queryPlain) !== -1) score += 0.5;

  // How much of the *query* this result answers (0..1). Dividing by the query
  // length keeps short generic hits ("Sri Lanka") from scoring 1.0 while only
  // covering part of a longer query.
  const coverage = (tokens: string[]) => {
    if (queryTokens.length === 0 || tokens.length === 0) return 0;
    let sum = 0;
    for (const qt of queryTokens) sum += bestTokenMatch(qt, tokens);
    return sum / queryTokens.length;
  };

  const allCoverage = coverage(allTokens);
  score += 0.45 * allCoverage;
  score += 0.35 * coverage(nameTokens);

  // Prefer results inside the country/region the user asked for, and demote
  // look-alikes from elsewhere ("Sri Lanka" query but a hit in Sweden).
  const geoTokens = queryTokens.filter((t) => OPTIONAL_GEO_TOKENS.has(t));
  if (geoTokens.length > 0) {
    let geoHits = 0;
    for (const token of geoTokens) {
      if (allTokens.indexOf(token) !== -1) geoHits++;
    }
    const geoRatio = geoHits / geoTokens.length;
    score += 0.12 * geoRatio - 0.12 * (1 - geoRatio);
  }

  // A result that matches *none* of the words the user actually typed (only
  // the country/region context) is generic filler — push it below real hits
  // so "golface srilanka" returns Galle Face, not the country itself. The
  // check always uses the ORIGINAL query: an AI rewrite like "Sri Lanka" must
  // not let every place in the country score as a perfect match.
  if (originalRequiredTokens.length > 0) {
    let bestRequired = 0;
    for (const qt of originalRequiredTokens) {
      const sim = bestTokenMatch(qt, allTokens);
      if (sim > bestRequired) bestRequired = sim;
      if (bestRequired === 1) break;
    }
    if (bestRequired < 0.6) score *= 0.5;
  }

  return score;
}

function rankResults(
  results: PlaceSearchResult[],
  normQueries: string[],
  limit: number
): ScoredResult[] {
  const queries = normQueries.filter((q) => Boolean(q && q.trim()));
  const queryTokenLists = queries.map((q) => tokenize(q));
  const queryPlainList = queries.map((q) => q.replace(/,/g, ' ').replace(/\s+/g, ' '));
  // Words the user actually typed (country/region context excluded) — used to
  // demote generic admin results regardless of which AI rewrite matched.
  const originalRequiredTokens = (queryTokenLists[0] || []).filter(
    (t) => !OPTIONAL_GEO_TOKENS.has(t)
  );
  const byKey = new Map<string, ScoredResult>();
  const byDisplay = new Map<string, ScoredResult[]>();

  for (const result of results) {
    if (!isFinite(result.lat) || !isFinite(result.lon)) continue;
    // Best score across every query variant (original + AI rewrites).
    let score = 0;
    for (let i = 0; i < queries.length; i++) {
      score = Math.max(
        score,
        scoreResult(queryPlainList[i], queryTokenLists[i], originalRequiredTokens, result)
      );
      if (score >= 1.4) break;
    }
    if (score < MIN_SCORE) continue;

    const nameKey = (result.name || result.display_name.split(',')[0] || '')
      .toLowerCase()
      .trim();
    const key = `${nameKey}@${result.lat.toFixed(3)},${result.lon.toFixed(3)}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.score = Math.max(existing.score, score);
      if (!existing.country) existing.country = result.country;
      const existingDepth = existing.display_name.split(',').length;
      const newDepth = result.display_name.split(',').length;
      if (newDepth > existingDepth) {
        existing.display_name = result.display_name;
        existing.name = result.name || existing.name;
      }
      continue;
    }

    // Same place returned by another provider (identical label, nearby coords).
    const displayKey = result.display_name.toLowerCase().replace(/\s+/g, ' ').trim();
    const bucket = byDisplay.get(displayKey) || [];
    const nearby =
      bucket.find(
        (entry) =>
          Math.abs(entry.lat - result.lat) < 0.01 && Math.abs(entry.lon - result.lon) < 0.01
      ) ||
      // Very short labels ("Sri Lanka") can have divergent centroid coordinates.
      (displayKey.length <= 12 ? bucket[0] : undefined);
    if (nearby) {
      nearby.score = Math.max(nearby.score, score);
      if (!nearby.country) nearby.country = result.country;
      continue;
    }

    const entry: ScoredResult = { ...result, score };
    byKey.set(key, entry);
    bucket.push(entry);
    byDisplay.set(displayKey, bucket);
  }

  let entries = Array.from(byKey.values());

  // If the user named a country/region, drop look-alikes located elsewhere
  // (e.g. "Embassy of Sri Lanka" in Sweden for the query "golface srilanka").
  const geoTokens = Array.from(
    new Set(queryTokenLists.reduce<string[]>((acc, tokens) => acc.concat(tokens), []))
  ).filter((t) => OPTIONAL_GEO_TOKENS.has(t));
  if (geoTokens.length > 0) {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      const country = (entry.country || '').toLowerCase();
      if (country) counts.set(country, (counts.get(country) || 0) + 1);
    }
    let majorityCountry = '';
    let majorityCount = 0;
    counts.forEach((count, country) => {
      if (count > majorityCount) {
        majorityCount = count;
        majorityCountry = country;
      }
    });
    if (majorityCountry) {
      entries = entries.filter((entry) => {
        const country = (entry.country || '').toLowerCase();
        if (!country || country === majorityCountry) return true;
        return geoTokens.some((token) => country.indexOf(token) !== -1);
      });
    }
  }

  return entries.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Result quality (used by the AI search path to decide if it is needed)
// ---------------------------------------------------------------------------

/**
 * Do these results actually answer the words the user typed?
 *
 * Checks how well the *names* of the top results cover the query's real
 * (non country/region) tokens. "golface srilanka" -> top hit "Buddhist &
 * Pali University of Sri Lanka" covers 0% of "golface", so the AI rewrite is
 * worth spending a request on; "london eye" -> "London Eye" covers 100%, so
 * it is not.
 */
export function areResultsReliable(
  query: string,
  results: PlaceSearchResult[]
): boolean {
  if (!results.length) return false;
  const required = tokenize(normalizeQuery(query)).filter(
    (t) => !OPTIONAL_GEO_TOKENS.has(t)
  );
  // Pure country/region query ("sri lanka") — anything there is a fair hit.
  if (required.length === 0) return true;

  let matched = 0;
  for (const qt of required) {
    let inName = 0;
    let inAddress = 0;
    for (const result of results.slice(0, 3)) {
      const nameTokens = tokenize(result.name || result.display_name.split(',')[0]);
      inName = Math.max(inName, bestTokenMatch(qt, nameTokens));
      inAddress = Math.max(inAddress, bestTokenMatch(qt, tokenize(result.display_name)));
      if (inName >= 0.85) break;
    }
    // The place name must recognise the word, or the word must appear almost
    // verbatim somewhere in the address (a city the user also typed).
    if (inName >= 0.85 || inAddress >= 0.95) matched++;
  }
  return matched / required.length >= 0.75;
}

/**
 * How well does the best of these results answer the query (0..~1.4)?
 * Used to compare a normal search against an AI-rewritten one: the typo the
 * user typed can never "match" a corrected result by name, so a raw score is
 * the only fair way to tell which set is better.
 */
export function topScore(query: string, results: PlaceSearchResult[]): number {
  const normQuery = normalizeQuery(query);
  if (!normQuery || results.length === 0) return 0;
  const queryTokens = tokenize(normQuery);
  const queryPlain = normQuery.replace(/,/g, ' ');
  const required = queryTokens.filter((t) => !OPTIONAL_GEO_TOKENS.has(t));
  let best = 0;
  for (const result of results.slice(0, 5)) {
    const score = scoreResult(queryPlain, queryTokens, required, result);
    if (score > best) best = score;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

async function fetchJson(url: string, headers?: Record<string, string>): Promise<any> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => {
        try {
          controller.abort();
        } catch {
          // ignore
        }
      }, REQUEST_TIMEOUT_MS)
    : null;
  try {
    const res = await fetch(url, { headers, signal: controller ? controller.signal : undefined });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let nominatimChain: Promise<unknown> = Promise.resolve();
let lastNominatimCallAt = 0;

function withNominatimRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const wait = NOMINATIM_MIN_INTERVAL_MS - (Date.now() - lastNominatimCallAt);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastNominatimCallAt = Date.now();
    return fn();
  };
  const next = nominatimChain.then(run, run);
  nominatimChain = next.catch(() => undefined);
  return next;
}

async function nominatimSearch(query: string, limit: number): Promise<PlaceSearchResult[]> {
  return withNominatimRateLimit(async () => {
    const url =
      `${NOMINATIM_ENDPOINT}?format=jsonv2&addressdetails=1&limit=${limit}` +
      `&accept-language=en&q=${encodeURIComponent(query)}`;
    const data = await fetchJson(url, {
      Accept: 'application/json',
      // Nominatim rejects requests without a proper User-Agent (403).
      // Browsers ignore this forbidden header and use their own UA instead.
      'User-Agent': 'InclusiveAccessibilityMapperApp/1.0',
    });
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      place_id: `nominatim-${item.place_id}`,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      display_name: item.display_name || '',
      name: item.name || undefined,
      country: item.address ? item.address.country : undefined,
      source: 'nominatim' as const,
    }));
  });
}

async function photonSearch(query: string, limit: number): Promise<PlaceSearchResult[]> {
  const url = `${PHOTON_ENDPOINT}?limit=${limit}&lang=en&q=${encodeURIComponent(query)}`;
  const data = await fetchJson(url, { Accept: 'application/json' });
  if (!data || !Array.isArray(data.features)) return [];
  return data.features.map((feature: any, index: number) => {
    const p = feature.properties || {};
    const coords = (feature.geometry && feature.geometry.coordinates) || [];
    const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ');
    const name = p.name || streetLine;
    const displayParts: string[] = [];
    const push = (value?: string) => {
      if (value && displayParts.indexOf(value) === -1) displayParts.push(value);
    };
    push(name);
    if (streetLine && streetLine !== name) push(streetLine);
    push(p.district);
    push(p.city || p.county);
    push(p.state);
    push(p.country);
    return {
      place_id: `photon-${p.osm_type || 'x'}-${p.osm_id || index}`,
      lat: parseFloat(coords[1]),
      lon: parseFloat(coords[0]),
      display_name: displayParts.join(', '),
      name: name || undefined,
      country: p.country || undefined,
      source: 'photon' as const,
    };
  });
}

// ---------------------------------------------------------------------------
// Query fallbacks
// ---------------------------------------------------------------------------

/**
 * When the full query returns nothing useful, retry without one token at a
 * time ("one goalfave srilanka" -> "one srilanka" -> "goalfave srilanka" ...)
 * so a single unknown/misspelled word still leaves enough context to resolve
 * the rest of the query.
 */
function buildFallbackQueries(normQuery: string): string[] {
  const tokens = normQuery.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return [];
  const variants: string[] = [];
  const push = (variant: string) => {
    const v = variant.trim();
    if (v && variants.indexOf(v) === -1) variants.push(v);
  };
  for (let i = 0; i < tokens.length; i++) {
    push(tokens.filter((_, index) => index !== i).join(' '));
    if (variants.length >= MAX_FALLBACK_QUERIES) break;
  }
  if (tokens.length > MAX_FALLBACK_QUERIES + 1) {
    push(tokens.slice(-2).join(' '));
  }
  return variants.slice(0, MAX_FALLBACK_QUERIES);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function searchPlaces(
  query: string,
  options: { limit?: number; extraQueries?: string[]; markAi?: boolean } = {}
): Promise<PlaceSearchResult[]> {
  const limit = options.limit || 8;
  const normQuery = normalizeQuery(query);
  if (!normQuery) return [];

  // AI-suggested rewrites of the query (spelling fixes, expansions, aliases).
  const extraQueries = (options.extraQueries || [])
    .map((q) => normalizeQuery(q))
    .filter((q) => Boolean(q) && q !== normQuery)
    .slice(0, 3);
  const queryVariants = [normQuery, ...extraQueries];

  const settled = await Promise.allSettled([
    nominatimSearch(normQuery, limit + 4),
    photonSearch(normQuery, limit + 4),
  ]);

  let raw: PlaceSearchResult[] = [];
  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') raw = raw.concat(outcome.value);
  }

  // AI variants run on Photon only (parallel) so Nominatim's 1 req/sec
  // policy never slows the search down.
  if (extraQueries.length > 0 && options.markAi) {
    const extraSettled = await Promise.allSettled(
      extraQueries.map((q) => photonSearch(q, limit))
    );
    for (const outcome of extraSettled) {
      if (outcome.status === 'fulfilled') {
        raw = raw.concat(outcome.value.map((r) => ({ ...r, viaAi: true })));
      }
    }
  }

  let ranked = rankResults(raw, queryVariants, limit);

  // Retry without one token at a time when the top hits score poorly *or*
  // clearly do not answer the query ("central park nyc" -> "Acuity NYC").
  const needsFallback = () =>
    ranked.length === 0 ||
    ranked[0].score < FALLBACK_TOP_SCORE ||
    !areResultsReliable(normQuery, ranked);

  if (needsFallback()) {
    const variants = buildFallbackQueries(normQuery);
    const photonSettled = await Promise.allSettled(
      variants.map((variant) => photonSearch(variant, 10))
    );
    for (const outcome of photonSettled) {
      if (outcome.status === 'fulfilled') raw = raw.concat(outcome.value);
    }
    ranked = rankResults(raw, queryVariants, limit);
  }

  if (needsFallback()) {
    // Photon can rate-limit; retry the most promising variants on Nominatim
    // (serialized to honour its 1 request/second policy).
    const variants = buildFallbackQueries(normQuery).slice(0, 2);
    for (const variant of variants) {
      try {
        const results = await nominatimSearch(variant, 6);
        if (results.length > 0) raw = raw.concat(results);
      } catch {
        // ignore provider failure, keep what we have
      }
    }
    ranked = rankResults(raw, queryVariants, limit);
  }

  if (ranked.length === 0 && raw.length === 0) {
    try {
      const lastResort = await nominatimSearch(normQuery.replace(/,/g, ' '), 6);
      ranked = rankResults(lastResort, queryVariants, limit);
    } catch {
      ranked = [];
    }
  }

  if (options.markAi) {
    ranked = ranked.map((r) => ({ ...r, viaAi: true }));
  }

  return ranked.map(({ score, ...result }) => result);
}
