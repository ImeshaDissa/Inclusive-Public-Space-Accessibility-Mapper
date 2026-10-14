/**
 * AI-assisted place search.
 *
 * The AI (OpenRouter via the ai-orchestrator Edge Function) rewrites the raw
 * query into up to 3 clean geocoder queries (spelling fixes, expansions,
 * aliases like "sl" -> "Sri Lanka", adding missing city/country context).
 * Those rewrites are then fed into the regular multi-provider search in
 * placeSearch.ts, which still does its own normalization, fallbacks and fuzzy
 * re-ranking — so the AI only ever *helps*, never replaces, normal search.
 *
 * If the AI is unavailable (no key, offline, rate-limited) we silently fall
 * back to a plain search so the search bar keeps working.
 */
import { supabase } from './supabase';
import { PlaceSearchResult, areResultsReliable, searchPlaces, topScore } from './placeSearch';

export interface AiSearchRewrite {
  /** Up to 3 cleaner queries the geocoders are more likely to understand. */
  queries: string[];
  /** Optional short human hint, e.g. "Did you mean Galle Face, Colombo?" */
  hint?: string;
}

const AI_REWRITE_TIMEOUT_MS = 6000;
/** Same query asked again within this window reuses the first rewrite. */
const REWRITE_CACHE_TTL_MS = 10 * 60 * 1000;

const rewriteCache = new Map<string, { at: number; value: AiSearchRewrite }>();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI search timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Ask the AI to rewrite a search query into geocoder-friendly queries.
 * Never throws — returns { queries: [] } when the AI cannot help.
 */
export async function rewriteSearchQuery(query: string): Promise<AiSearchRewrite> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { queries: [] };

  const key = trimmed.toLowerCase();
  const cached = rewriteCache.get(key);
  if (cached && Date.now() - cached.at < REWRITE_CACHE_TTL_MS) return cached.value;

  let value: AiSearchRewrite = { queries: [] };
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('ai-orchestrator', {
        body: { mode: 'search-rewrite', message: trimmed },
      }),
      AI_REWRITE_TIMEOUT_MS
    );

    if (!error && data) {
      const queries = Array.isArray(data.queries)
        ? data.queries
            .filter((q: unknown): q is string => typeof q === 'string')
            .map((q: string) => q.trim())
            .filter(Boolean)
            .slice(0, 3)
        : [];

      const hint =
        typeof data.hint === 'string' && data.hint.trim() ? data.hint.trim() : undefined;

      value = { queries, hint };
    }
  } catch {
    value = { queries: [] };
  }

  // Cache failures too: a rate-limited AI must not be hammered while typing.
  rewriteCache.set(key, { at: Date.now(), value });
  if (rewriteCache.size > 50) {
    const oldest = rewriteCache.keys().next().value;
    if (oldest !== undefined) rewriteCache.delete(oldest);
  }
  return value;
}

export interface AiSearchOutcome extends PlaceSearchResult {
  /** Optional AI hint shown above the result list. */
  aiHint?: string;
}

/**
 * Full AI search: a normal multi-provider search runs first. If those results
 * already clearly answer the query, they are returned as-is (no AI request
 * spent — the free OpenRouter tier allows only a handful per day). When the
 * results look unreliable (a misspelling the geocoders did not understand),
 * the AI rewrites the query and the search runs again with those variants.
 * Falls back to the normal search whenever the AI is unavailable.
 */
export async function searchPlacesWithAi(
  query: string,
  options: { limit?: number } = {}
): Promise<{ results: PlaceSearchResult[]; hint?: string }> {
  const limit = options.limit || 8;

  const plain = await searchPlaces(query, { limit });
  if (areResultsReliable(query, plain)) return { results: plain, hint: undefined };

  const rewrite = await rewriteSearchQuery(query);
  const usable = rewrite.queries.filter((q) => q.toLowerCase() !== query.trim().toLowerCase());
  if (usable.length === 0) return { results: plain, hint: rewrite.hint };

  const results = await searchPlaces(query, {
    limit,
    extraQueries: rewrite.queries,
    markAi: true,
  });

  // Keep whichever set actually answers the query best — a misspelling can
  // never match the corrected result by name, so compare scores instead.
  const aiWins = topScore(query, results) > topScore(query, plain);
  return { results: aiWins ? results : plain, hint: aiWins ? rewrite.hint : undefined };
}
