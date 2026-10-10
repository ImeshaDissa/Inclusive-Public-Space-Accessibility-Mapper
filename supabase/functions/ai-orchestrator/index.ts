import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Supabase Admin Client Initialization
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// 1. Tool Schemas
export const TOOLS = [
  {
    type: "function",
    function: {
      name: "searchAccessiblePlaces",
      description:
        "Search accessible public places by location, radius, disability type, and what the user is looking for (e.g. park, library, toilet). Use ONLY for places near a location — for a specific named place use findPlaceInDatabase instead.",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude" },
          lng: { type: "number", description: "Longitude" },
          radius: { type: "number", description: "Search radius in km" },
          disabilityType: { type: "string", description: "Target disability type" },
          query: {
            type: "string",
            description:
              "What kind of place the user asked for, e.g. 'park', 'library', 'toilet'. Only matching places are returned. Omit it when the user just wants anything nearby.",
          },
        },
        required: ["lat", "lng"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "findPlaceInDatabase",
      description:
        "Search our database for a place by name OR by a category keyword (temple, school, hospital). Pass lat/lng to keep only results near the user's GPS. Always call this first — never answer with unrelated places.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The place name ('Galle Face Green') or the category keyword the user asked for ('temple', 'school')",
          },
          lat: { type: "number", description: "User latitude — keeps only places near them" },
          lng: { type: "number", description: "User longitude — keeps only places near them" },
          radius: {
            type: "number",
            description: "Search radius in km around lat/lng (default 25)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "webSearch",
      description:
        "Search the web and OpenStreetMap for general information about a place that is NOT in our database: description, accessibility info, phone number and official website.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Place name plus city/country, e.g. 'Temple of the Tooth Kandy Sri Lanka phone website'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addAccessiblePlace",
      description: "Add a new accessible place entry with accessibility features.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the place" },
          lat: { type: "number", description: "Latitude" },
          lng: { type: "number", description: "Longitude" },
          features: {
            type: "array",
            items: { type: "string" },
            description: "List of accessibility features",
          },
          address: {
            type: "string",
            description: "Street address or short location description of the place",
          },
          category: {
            type: "string",
            description: "Category of the place, e.g. 'Public Transit Hub', 'Park', 'Public Facility'",
          },
        },
        required: ["name", "lat", "lng", "features"],
      },
    },
  },
];

// ── Place-type keyword matching ────────────────────────────────────────────

/** Place types users ask for. Longest first so "post office" wins over "office". */
const PLACE_KEYWORDS = [
  "post office", "bus station", "train station", "shopping mall", "supermarket",
  "automatic door", "tactile paving", "step free", "playground", "pharmacy",
  "hospital", "restaurant", "university", "library", "museum", "stadium",
  "airport", "clinic", "garden", "toilet", "restroom", "elevator", "parking",
  "ramp", "park", "mall", "market", "station", "cafe", "bank", "school",
  "college", "temple", "church", "mosque", "beach", "cinema", "hotel", "zoo",
  "square", "plaza", "centre", "center", "shop", "store",
];

/** Keywords that mean a feature of a place, not a type of place. */
const FEATURE_KEYWORDS: Record<string, string> = {
  toilet: "toilet",
  restroom: "toilet",
  ramp: "ramp",
  elevator: "elevator",
  lift: "elevator",
  parking: "parking",
  "tactile paving": "tactilePaving",
  "automatic door": "automaticDoor",
  "step free": "stepFree",
};

function keywordKey(keyword: string): string {
  return keyword.split(/\s+/).map(normalizeWord).join(" ");
}

/** "libraries" -> "library", "parks" -> "park", but "parking" stays "parking". */
function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/ies$/, "y")
    .replace(/(s|es)$/, "");
}

function normalizeText(text: string): string {
  return ` ${String(text ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(normalizeWord).join(" ")} `;
}

/** "What is a park near me?" -> "park" ("" when the user wants anything). */
function extractPlaceKeyword(message: string): string {
  const haystack = normalizeText(message);
  const found = PLACE_KEYWORDS.filter((keyword) =>
    haystack.includes(` ${keyword.split(/\s+/).map(normalizeWord).join(" ")} `)
  );
  return found.sort((a, b) => b.length - a.length)[0] ?? "";
}

/** Does this saved place match what the user asked for? */
function matchesKeyword(place: Record<string, unknown>, keyword: string): boolean {
  if (!keyword) return true;
  const key = keywordKey(keyword);

  // "toilet near me" -> only places whose features.toilet is true.
  const featureKey = FEATURE_KEYWORDS[key];
  if (featureKey) {
    const features = (place.features ?? {}) as Record<string, unknown>;
    const value = features[featureKey];
    return value === true || value === "true";
  }

  const haystack = normalizeText(
    `${place.name ?? ""} ${place.category ?? ""} ${place.address ?? ""}`
  );
  return haystack.includes(` ${key} `);
}

/** Great-circle distance in metres between two GPS points. */
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// 2. Real Supabase Database Interactions + web lookups
export async function executeTool(name: string, args: Record<string, unknown>) {
  if (name === "searchAccessiblePlaces") {
    const lat = Number(args.lat);
    const lng = Number(args.lng);
    let radius = Number(args.radius ?? 10);
    if (!Number.isFinite(radius) || radius <= 0) radius = 10;
    const disability_type = String(args.disabilityType ?? "General");
    const keyword = String(args.query ?? "").trim();

    const runRpc = async (km: number) => {
      const { data, error } = await supabaseAdmin.rpc("find_nearby_accessible_places", {
        p_lat: lat,
        p_lng: lng,
        p_radius: km,
        p_disability_type: disability_type,
      });
      if (error) throw new Error(`Database RPC error: ${error.message}`);
      return Array.isArray(data) ? data : [];
    };

    let places = await runRpc(radius);
    if (keyword) {
      places = places.filter((p: Record<string, unknown>) => matchesKeyword(p, keyword));
      // Nothing of that type this close — widen the search once before giving up.
      if (places.length === 0 && radius < 25) {
        radius = Math.min(25, Math.max(radius * 3, 15));
        places = (await runRpc(radius)).filter((p: Record<string, unknown>) =>
          matchesKeyword(p, keyword)
        );
      }
    }

    return {
      status: "success",
      places,
      query: keyword || null,
      searchedRadiusKm: radius,
      count: places.length,
      note: keyword && places.length === 0
        ? `No saved place matching "${keyword}" within ${radius} km. Do not list unrelated places — say clearly that nothing matching was found and offer to search wider or add it.`
        : undefined,
    };
  }

  if (name === "findPlaceInDatabase") {
    const query = String(args.query ?? "").trim();
    if (!query) return { status: "not_found", places: [] };

    // PostgREST .or() treats , ( ) as syntax — strip them from user input.
    const safe = query.replace(/[(),%_'"`]/g, " ").replace(/\s+/g, " ").trim();
    if (!safe) return { status: "not_found", places: [] };

    // Whole database, NO distance limit. Match on name, address or category.
    const stopWords = new Set(["the", "of", "a", "an", "in", "at", "on", "to", "for", "near", "by", "and"]);
    const tokens = safe
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stopWords.has(w))
      .map(normalizeWord)
      .filter(Boolean);
    const phrase = tokens.length > 0 ? tokens.join(" ") : normalizeWord(safe);
    if (!phrase) return { status: "not_found", places: [] };

    const conditions = (tokens.length > 0 ? tokens : [phrase])
      .map((t) => `name.ilike.%${t}%,address.ilike.%${t}%,category.ilike.%${t}%`)
      .join(",");

    const { data, error } = await supabaseAdmin
      .from("places")
      .select("*")
      .or(conditions)
      .limit(50);

    if (error) throw new Error(`Database search error: ${error.message}`);
    const rows: Record<string, unknown>[] = Array.isArray(data) ? data : [];

    // Keep only places containing every word, so "temple of tooth" matches
    // "Temple of the Tooth Relic" but not just any temple.
    const haystack = (r: Record<string, unknown>) =>
      normalizeText(`${r.name ?? ""} ${r.address ?? ""} ${r.category ?? ""}`);
    const strict =
      tokens.length > 1
        ? rows.filter((r) => {
            const hay = haystack(r);
            return tokens.every((t) => hay.includes(` ${t} `));
          })
        : rows;

    let matched: Record<string, unknown>[] = strict;

    if (matched.length === 0) {
      // Fall back to the exact phrase ("Galle Face Green").
      const phraseMatch = await supabaseAdmin
        .from("places")
        .select("*")
        .or(`name.ilike.%${safe}%,address.ilike.%${safe}%`)
        .limit(5);
      if (phraseMatch.error) throw new Error(`Database search error: ${phraseMatch.error.message}`);
      matched = Array.isArray(phraseMatch.data) ? phraseMatch.data : [];
    }

    if (matched.length === 0) return { status: "not_found", places: [] };

    // Optional GPS filter: keep only what is actually near the user, sorted by
    // distance, so a keyword search never returns places from another city.
    const lat = Number(args.lat);
    const lng = Number(args.lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasCoords) return { status: "found", places: matched.slice(0, 5) };

    let radiusKm = Number(args.radius ?? 25);
    if (!Number.isFinite(radiusKm) || radiusKm <= 0) radiusKm = 25;

    const withDistance = matched
      .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
      .map((r) => ({
        ...r,
        distance: Math.round(distanceMetres(lat, lng, r.lat as number, r.lng as number)),
      }))
      .filter((r) => (r.distance as number) <= radiusKm * 1000)
      .sort((a, b) => (a.distance as number) - (b.distance as number));

    if (withDistance.length > 0) {
      return { status: "found", places: withDistance.slice(0, 5), searchedRadiusKm: radiusKm };
    }

    return {
      status: "not_found",
      places: [],
      searchedRadiusKm: radiusKm,
      note:
        `${matched.length} place(s) match "${query}" in our database, but none within ` +
        `${radiusKm} km of the user. Never show far-away places as if they were nearby — ` +
        `say they exist further away (and how far), offer to search wider, or use webSearch ` +
        `to find some closer.`,
    };
  }

  if (name === "webSearch") {
    return await webSearchPlace(String(args.query ?? ""));
  }

  if (name === "addAccessiblePlace") {
    const { name: placeName, lat, lng, features, address, category } = args;

    // public.places.features is a JSONB dictionary of booleans
    // (e.g. { "ramp": true, "stepFree": true }), not an array.
    const featureDict: Record<string, boolean> = Array.isArray(features)
      ? Object.fromEntries(features.map((f: unknown) => [String(f), true] as const))
      : features && typeof features === "object"
        ? { ...(features as Record<string, boolean>) }
        : {};

    const { data, error } = await supabaseAdmin
      .from("places")
      .insert([
        {
          // public.places.id is TEXT — generate a unique, readable id.
          id: `place-${crypto.randomUUID()}`,
          name: placeName,
          lat: Number(lat),
          lng: Number(lng),
          features: featureDict,
          // category/address are NOT NULL columns with no defaults.
          category:
            typeof category === "string" && category.trim()
              ? category
              : "Public Facility",
          address:
            typeof address === "string" && address.trim()
              ? address
              : `${lat}, ${lng}`,
        },
      ])
      .select();

    if (error) throw new Error(`Database insert error: ${error.message}`);
    return { status: "created", place: data?.[0] };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ── Web lookup helpers (for places that are NOT in our database) ──────────

interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

const HTML_STRIP_RE = /<[^>]*>/g;

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(HTML_STRIP_RE, " "));
}

/** Turn DuckDuckGo redirect links into the real destination URL. */
function cleanDuckDuckGoUrl(href: string): string {
  let url = decodeEntities(href.trim());
  const uddg = url.match(/[?&]uddg=([^&]+)/);
  if (uddg) {
    try {
      url = decodeURIComponent(uddg[1]);
    } catch {
      // keep the raw href
    }
  }
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

/** Sponsored results use duckduckgo.com/y.js tracking links — never show them. */
function isAdUrl(url: string): boolean {
  return /duckduckgo\.com\/y\.js|ad_provider=|ad_domain=|bing\.com\/aclick/i.test(url);
}

/**
 * The model sometimes copies an ad/tracking link into its answer. Drop those
 * links and any line that was only a label for a link we removed, so the chat
 * never shows a wall of percent-encoded junk.
 */
function sanitizeAssistantText(text: string): string {
  if (!text) return text;

  const withoutAds = text.replace(/https?:\/\/[^\s<>"']+/gi, (url) =>
    isAdUrl(url) ? "" : url,
  );

  const lines = withoutAds.split("\n").map((line) => line.trimEnd());
  const kept = lines.filter(
    (line) =>
      !/^[-*•]\s*(?:more info|website|web site|site|link|official (?:website|site)|phone|tel|contact(?: details)?)\s*:?\s*$/i.test(
        line.trim(),
      ),
  );

  const result = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  // Never reply with nothing — but never fall back to the ad link either.
  return result || "I could not find a usable link for that. Please try asking again.";
}

/** Free, keyless web search via the DuckDuckGo HTML endpoint. */
async function searchDuckDuckGo(query: string): Promise<WebResult[]> {
  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: "https://duckduckgo.com/",
    },
    body: new URLSearchParams({ q: query }).toString(),
  });
  if (!res.ok) return [];

  const html = await res.text();
  const titles: string[] = [];
  const urls: string[] = [];
  const snippets: string[] = [];

  const linkRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRe = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null) {
    urls.push(cleanDuckDuckGoUrl(match[1]));
    titles.push(stripTags(match[2]));
  }
  while ((match = snippetRe.exec(html)) !== null) {
    snippets.push(stripTags(match[1]));
  }

  return titles
    .map((title, i) => ({
      title,
      url: urls[i] ?? "",
      snippet: snippets[i] ?? "",
    }))
    .filter((r) => r.title && r.url && !isAdUrl(r.url) && /^https?:\/\//i.test(r.url))
    .slice(0, 5);
}

/** OSM tags we care about: contact details + accessibility info. */
const OSM_TAG_KEYS = [
  "name",
  "amenity",
  "tourism",
  "shop",
  "leisure",
  "office",
  "historic",
  "healthcare",
  "operator",
  "phone",
  "contact:phone",
  "mobile",
  "contact:mobile",
  "website",
  "url",
  "contact:website",
  "opening_hours",
  "wheelchair",
  "step_free_access",
  "elevator",
  "toilets",
  "toilets:wheelchair",
  "addr:housenumber",
  "addr:street",
  "addr:city",
];

interface OsmPlace {
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

/**
 * Nominatim geocodes the name, then the OSM element is fetched for its tags —
 * phone, website and the `wheelchair` accessibility tag.
 */
async function searchOpenStreetMap(query: string): Promise<OsmPlace[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=3&q=${
      encodeURIComponent(query)
    }`,
    {
      headers: {
        "User-Agent": "InclusiveMapper/1.0 (accessible places mapping app)",
        "Accept-Language": "en",
      },
    },
  );
  if (!res.ok) return [];
  const hits: Array<Record<string, unknown>> = await res.json();
  if (!Array.isArray(hits)) return [];

  const places: OsmPlace[] = [];
  for (const hit of hits.slice(0, 3)) {
    let tags: Record<string, string> = {};
    const osmType = String(hit.osm_type ?? "");
    const osmId = Number(hit.osm_id ?? 0);
    if (osmType && osmId) {
      try {
        const elRes = await fetch(
          `https://api.openstreetmap.org/api/0.6/${osmType}/${osmId}.json`,
        );
        if (elRes.ok) {
          const elJson = await elRes.json();
          const rawTags = elJson?.elements?.[0]?.tags;
          if (rawTags && typeof rawTags === "object") {
            tags = Object.fromEntries(
              OSM_TAG_KEYS.filter((k) => typeof rawTags[k] === "string").map((k) => [
                k,
                String(rawTags[k]),
              ]),
            );
          }
        }
      } catch {
        // Tags are optional — keep the geocoded hit without them.
      }
    }

    const display = String(hit.display_name ?? "");
    places.push({
      name: String(hit.name ?? display.split(",")[0] ?? query),
      type: String(hit.type ?? hit.category ?? ""),
      address: display,
      lat: Number(hit.lat ?? 0),
      lng: Number(hit.lon ?? 0),
      tags,
    });
  }
  return places;
}

/**
 * One tool call that answers "what is this place, and how do I contact them?".
 * Never throws: a failed lookup just returns fewer results.
 */
async function webSearchPlace(query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { query, webResults: [], places: [], note: "Empty search query." };
  }

  let webResults: WebResult[] = [];
  let places: OsmPlace[] = [];
  let note = "";

  try {
    webResults = await searchDuckDuckGo(cleanQuery);
  } catch {
    note = "Web search was unavailable.";
  }

  try {
    places = await searchOpenStreetMap(cleanQuery);
  } catch {
    note = note || "Map lookup was unavailable.";
  }

  if (webResults.length === 0 && places.length === 0) {
    note = note || "No external information was found for this place.";
  }

  return { query: cleanQuery, webResults, places, note };
}

// ── AI-free fallback (used when the LLM quota is exhausted) ───────────────

const FALLBACK_FEATURE_NAMES: Record<string, string> = {
  ramp: "ramp",
  stepFree: "step-free entrance",
  stepfree: "step-free entrance",
  toilet: "accessible toilet",
  elevator: "elevator",
  parking: "parking",
  tactilePaving: "tactile paving",
  automaticDoor: "automatic door",
};

function fallbackFeatureList(features: unknown): string[] {
  if (!features || typeof features !== "object") return [];
  return Object.entries(features as Record<string, unknown>)
    .filter(([, value]) => value === true || value === "true")
    .map(([key]) => FALLBACK_FEATURE_NAMES[key] ?? key);
}

function fallbackDistance(metres: unknown): string {
  const m = Number(metres);
  if (!Number.isFinite(m)) return "";
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/**
 * When OpenRouter is unavailable, questions about saved places can still be
 * answered straight from the database — no language model needed.
 * Only places that match what the user actually asked for are returned.
 */
async function directNearbyAnswer(message: string, location?: ChatLocation) {
  if (!location) return null;

  const wantsNearby = /\b(near|nearby|close|around|surrounding|in my area|here|find|show|list|give me)\b/i
    .test(message);
  const keyword = extractPlaceKeyword(message);
  if (!wantsNearby && !keyword) return null;
  const isFeature = !!FEATURE_KEYWORDS[keywordKey(keyword)];

  const runRpc = async (km: number) => {
    const { data, error } = await supabaseAdmin.rpc("find_nearby_accessible_places", {
      p_lat: location.lat,
      p_lng: location.lng,
      p_radius: km,
      p_disability_type: "General",
    });
    if (error || !Array.isArray(data)) return [];
    return data as Record<string, unknown>[];
  };

  let radius = 10;
  let matches = (await runRpc(radius)).filter((p) => matchesKeyword(p, keyword));
  if (matches.length === 0) {
    radius = 25;
    matches = (await runRpc(radius)).filter((p) => matchesKeyword(p, keyword));
  }

  // Nothing matching was saved nearby: say so honestly instead of listing
  // unrelated places as if they were the answer.
  if (matches.length === 0) {
    if (!keyword) return null;
    const notFound = isFeature
      ? `I searched our map up to ${radius} km around you, but no saved place with "${keyword}" was found near you yet.`
      : `I searched our map up to ${radius} km around you, but no "${keyword}" is saved near you yet.`;
    return {
      text: [
        notFound,
        "",
        "You can also ask me about a specific place by name — for example 'Tell me about Temple of the Tooth' — and I will give you its accessibility details and contact information.",
        "",
        "If you visit one, please help our community by updating the map and adding its accessibility details to our app!",
      ].join("\n"),
      actionResponse: [],
      degraded: true,
    };
  }

  const top = matches.slice(0, 6);
  const lines = top.map((place: Record<string, unknown>, index: number) => {
    const features = fallbackFeatureList(place.features);
    const distance = fallbackDistance(place.distance);
    const parts = [distance, features.length > 0 ? features.join(", ") : ""].filter(Boolean);
    return `${index + 1}. ${String(place.name)}${parts.length ? ` — ${parts.join(" — ")}` : ""}`;
  });

  const heading = !keyword
    ? "Here are the closest accessible public spaces saved near you:"
    : isFeature
      ? `Here are accessible places near you that have: ${keyword}`
      : `Here are accessible ${keyword} places saved near you:`;

  return {
    text: [heading, "", ...lines, "", "Details come from our community accessibility map."].join("\n"),
    actionResponse: [
      {
        tool: "searchAccessiblePlaces",
        args: { lat: location.lat, lng: location.lng, radius, query: keyword || undefined },
        result: { status: "success", places: top },
      },
    ],
    degraded: true,
  };
}

const LEAD_IN_PHRASES =
  /^(i want (?:to )?know about|i want (?:to )?know|i need to know about|i would like to know about|could you tell me about|tell me about|please tell me about|what is|what's|whats|info about|information about|describe|do you know about|does|is there|is|are|was|were|can|could|should|will|do|can you tell me about|about)\s+/i;

/** "Tell me about X has accessibility" -> "X", so the database can be searched by name. */
function stripLeadIn(message: string): string {
  let text = String(message ?? "").trim();
  for (let i = 0; i < 4; i++) {
    const next = text.replace(LEAD_IN_PHRASES, "").trim();
    if (next === text) break;
    text = next;
  }
  text = text.replace(/[?!.]+$/g, "").trim();

  // Drop the sentence tail: "jaela thilakawarden has accessibility" -> name only.
  const cut = text.search(/\s+(has|have|is|are|was|were|with|in|for|near|about|that|which)\s+/i);
  if (cut >= 3) text = text.slice(0, cut).trim();

  return text.replace(/\b(accessibility|accessible|features?|details?|information)\b\s*$/i, "").trim();
}

/**
 * Offline answer for "what about <place>" questions: check the database first
 * (rule 3), and if it is not saved there, run the web lookup (rule 4).
 */
async function directPlaceAnswer(message: string) {
  const name = stripLeadIn(message);
  if (name.length < 3 || name.split(/\s+/).length > 8) return null;
  // General questions are not place names — leave those to the AI.
  if (/^(what|why|how|when|who|which|where|why|does|did|can|should|would|will|please)\b/i.test(name)) {
    return null;
  }

  const found = await executeTool("findPlaceInDatabase", { query: name });
  const places = Array.isArray((found as { places?: unknown[] }).places)
    ? ((found as { places: Record<string, unknown>[] }).places)
    : [];

  if (places.length > 0) {
    const place = places[0];
    const features = fallbackFeatureList(place.features);
    const lines = [
      `Name: ${String(place.name)}`,
      `Category: ${String(place.category ?? "Public place")}`,
      `Address: ${String(place.address ?? "-")}`,
      `Status: ${String(place.status ?? "pending")}`,
      features.length > 0
        ? `Accessibility: ${features.join(", ")}`
        : "Accessibility: no features recorded yet",
    ];
    return {
      text: [
        `Yes — "${String(place.name)}" is saved in our database:`,
        "",
        ...lines,
        "",
        "These details come from our community map. If you have just visited and they are wrong, please update the map so everyone benefits!",
      ].join("\n"),
      actionResponse: [
        { tool: "findPlaceInDatabase", args: { query: name }, result: found },
      ],
      degraded: true,
    };
  }

  // Not in the database → the four required steps, using the web lookup.
  const web = await webSearchPlace(name);
  const osm = web.places[0];
  const tags = osm?.tags ?? {};

  // Only trust search hits that actually mention the place (ignores junk hits).
  const stopWords = new Set([
    "want", "know", "about", "tell", "info", "information", "accessibility",
    "accessible", "feature", "features", "detail", "details", "place", "near",
    "nearby", "have", "does", "what", "when", "where", "which", "with", "from",
    "this", "that", "their", "there", "official", "website", "contact",
  ]);
  const tokens = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !stopWords.has(t));
  const relevant = web.webResults.find((r) => {
    const hay = `${r.title} ${r.snippet}`.toLowerCase();
    return tokens.some((t) => hay.includes(t));
  });

  const contact: string[] = [];
  const phone = tags.phone || tags["contact:phone"] || tags.mobile || tags["contact:mobile"];
  const site = tags.website || tags.url || tags["contact:website"];
  if (phone) contact.push(`Phone: ${phone}`);
  if (site) contact.push(`Website: ${site}`);
  if (relevant?.url) contact.push(`More info: ${relevant.url}`);

  const description = relevant?.snippet
    ? relevant.snippet
    : osm
      ? `${osm.name} is a ${osm.type || "place"} recorded on OpenStreetMap at ${osm.address}.`
      : "I could not find a reliable description of this place in a quick lookup.";

  const body = [
    description,
    contact.length > 0
      ? ["", "Contact:", ...contact.map((line) => `- ${line}`)].join("\n")
      : "",
    contact.length === 0
      ? "I could not find a phone number or website in this quick lookup — please search online for their official contact details to confirm accessibility."
      : "",
    "",
    "How to get full details before you go:",
    "- Call the number above and ask about step-free entry, ramps and accessible toilets.",
    "- Check the official website or Facebook page for opening hours and entrance photos.",
    "- The local tourism office or the place's management can also confirm wheelchair access.",
  ].filter(Boolean).join("\n");

  return {
    text: [
      "This place is not currently saved in our database. However, as a helpful gesture, I have searched for some information for you.",
      "",
      body,
      "",
      "If you visit this place, please help our community by updating the map and adding its accessibility details to our app!",
    ].join("\n"),
    actionResponse: [],
    degraded: true,
  };
}

// ── Pre-lookup for questions about a specific place ───────────────────────

/** Nearby questions are handled by searchAccessiblePlaces — not by the pre-lookup. */
function wantsNearbySearch(message: string): boolean {
  return /\b(near\s+me|nearby|around\s+me|close\s+to\s+me|in\s+my\s+area|in\s+my\s+vicinity|closest|surrounding|surroundings|within\s+\d+\s*km|in\s+the\s+(?:area|city|vicinity))\b/i
    .test(message);
}

interface PreLookup {
  /** Extra instructions and data appended to the system prompt. */
  context: string;
  /** Saved place(s) to show as a card in the chat, when the place exists. */
  action: {
    tool: string;
    args: Record<string, unknown>;
    result: unknown;
  } | null;
}

/** "what accessibility features does galle face have" -> "galle face" */
const LEADING_FILLER =
  /^(?:(?:what|which|how|where|why|when|who|does|did|do|is|are|was|were|can|could|should|would|will|the|a|an|this|that|there|any|some|about|accessibility|accessible|features?|details?|information|info|place|places|near|nearby)\s+)+/i;
const TRAILING_FILLER =
  /\s+(?:(?:has|have|is|are|was|were|does|do|can|could|with|for|near|nearby|in|on|at|accessibility|accessible|features?|details?|information|info|place|places|there|here|please)\s*)+$/i;

function refinePlaceName(raw: string): string {
  let text = raw.trim();
  for (let i = 0; i < 4; i++) {
    const next = text.replace(LEADING_FILLER, "").replace(TRAILING_FILLER, "").trim();
    if (next === text) break;
    text = next;
  }
  return text;
}

/**
 * "I want to know about temple of tooth" must be answered from the WHOLE
 * database (or the web) — never from a 25 km radius search. This runs before
 * the model so the answer does not depend on which tool the model picks.
 * Never throws: any failure just means no pre-lookup context.
 */
async function namedPlacePreLookup(message: string): Promise<PreLookup | null> {
  const text = String(message ?? "").trim();
  if (text.length < 4 || wantsNearbySearch(text)) return null;

  const name = refinePlaceName(stripLeadIn(text));
  if (name.length < 3 || name.split(/\s+/).length > 8) return null;
  // A bare category ("temple", "beach") means "find me one" — leave it alone.
  if (PLACE_KEYWORDS.includes(name.toLowerCase())) return null;
  // Still a sentence, not a place name — let the model handle it.
  if (
    /^(what|why|how|when|who|which|where|does|did|do|can|could|should|would|will|is|are)\b/i
      .test(name) ||
    /\b(are|was|were|does|did|can|could|should|would|will|many|much|why|when|where|who|there|here)\b/i
      .test(name)
  ) {
    return null;
  }

  // "who can help me" / "is this place wheelchair accessible" refine down to
  // words that are not a place name — do not spend a web search on them.
  const nameWords = name.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  const GENERIC_NAME_WORDS = new Set([
    "help", "thanks", "thank", "sorry", "hello", "welcome", "you", "your", "mine",
    "this", "that", "these", "those", "something", "anything", "everything",
    "place", "places", "wheelchair", "accessible", "accessibility", "open",
    "closed", "today", "tomorrow", "now", "wheel", "chair",
  ]);
  if (nameWords.length === 0 || nameWords.every((w) => GENERIC_NAME_WORDS.has(w))) {
    return null;
  }

  try {
    const found = (await executeTool("findPlaceInDatabase", { query: name })) as {
      status?: string;
      places?: Record<string, unknown>[];
    };
    const places = Array.isArray(found.places) ? found.places : [];

    if (places.length > 0) {
      const rows = places.slice(0, 5).map((p) => ({
        name: p.name,
        category: p.category ?? null,
        address: p.address ?? null,
        status: p.status ?? null,
        features: p.features ?? {},
      }));
      return {
        context: [
          `PLACE LOOKUP (already done for you): these places match "${name}" and ARE saved in our database. They were searched across the WHOLE database with no distance limit.`,
          "If the user asked about one of them, answer from these rows: give the name, category, address and every accessibility feature, and say the details come from our community map. If they asked a general question, list the matching saved places.",
          "Do NOT run searchAccessiblePlaces or a nearby/radius search for this, and do NOT say it is missing or too far away.",
          JSON.stringify(rows, null, 2),
        ].join("\n"),
        action: {
          tool: "findPlaceInDatabase",
          args: { query: name },
          result: found,
        },
      };
    }

    const web = await webSearchPlace(name);
    const summary = {
      status: "not_in_database",
      searchedFor: name,
      webResults: web.webResults.slice(0, 5).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
      })),
      openStreetMap: web.places.slice(0, 3).map((p) => ({
        name: p.name,
        type: p.type,
        address: p.address,
        phone: p.tags.phone || p.tags["contact:phone"] || p.tags.mobile || null,
        website: p.tags.website || p.tags.url || p.tags["contact:website"] || null,
        opening_hours: p.tags.opening_hours || null,
        wheelchair: p.tags.wheelchair || null,
        step_free_access: p.tags.step_free_access || null,
        toilets_wheelchair: p.tags["toilets:wheelchair"] || null,
      })),
      note: web.note || "",
    };

    return {
      context: [
        `PLACE LOOKUP (already done for you): "${name}" is NOT saved in our database. These web and OpenStreetMap results were fetched for you:`,
        "Use them to answer with: what the place is, any known accessibility information, and how the user can get official details (phone number, official website, opening hours, and which office to contact).",
        "Do NOT run searchAccessiblePlaces or say 'nothing saved within 25 km' — this question is about a specific place, not places near the user.",
        "Only call webSearch yourself if these results are empty or clearly wrong.",
        JSON.stringify(summary, null, 2),
      ].join("\n"),
      action: null,
    };
  } catch {
    return null;
  }
}

type ChatAction = { tool: string; args: Record<string, unknown>; result: unknown };

/**
 * Put the pre-lookup result first and drop the model's duplicate/conflicting
 * calls, so the chat never shows the same place card twice or a "nothing
 * saved within 25 km" card next to a place we just found.
 */
function mergeActions(pre: ChatAction | null, executed: ChatAction[]): ChatAction[] {
  const all = pre ? [pre, ...executed] : executed;
  if (!pre) return all;

  return all.filter((action, index) => {
    if (index === 0) return true;
    if (pre.tool === "findPlaceInDatabase" && action.tool === "findPlaceInDatabase") return false;
    if (pre.tool === "findPlaceInDatabase" && action.tool === "searchAccessiblePlaces") return false;
    return true;
  });
}

// 3. OpenRouter API Caller

/** Upstream (OpenRouter) failure that we can turn into a friendly chat reply. */
export class AiUpstreamError extends Error {
  kind: "rate_limit" | "upstream";
  constructor(message: string, kind: "rate_limit" | "upstream") {
    super(message);
    this.kind = kind;
  }
}

export async function callOpenRouter(
  messages: unknown[],
  apiKey: string,
  model: string,
  extra: { jsonMode?: boolean } = {},
) {
  const body: Record<string, unknown> = {
    model,
    messages,
    tools: TOOLS,
    tool_choice: "auto",
  };
  if (extra.jsonMode) {
    // Search-rewrite mode: no tools, force a strict JSON answer.
    delete body.tools;
    delete body.tool_choice;
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://inclusive-mapper.supabase.co",
      "X-Title": "InclusiveMapper AI Orchestrator",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    // 429 = free-tier daily quota gone; 402/401/403/404/5xx = provider trouble.
    // Neither is the user's fault — surface them as a kind message, not a 500.
    if (res.status === 429) {
      throw new AiUpstreamError(`OpenRouter rate limit: ${err}`, "rate_limit");
    }
    if (res.status === 401 || res.status === 402 || res.status === 403 || res.status === 404 || res.status >= 500) {
      throw new AiUpstreamError(`OpenRouter error (${res.status}): ${err}`, "upstream");
    }
    throw new Error(`OpenRouter error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message;
}

/** Extract the first JSON object/array from possibly chatty model output. */
function extractJson(content: string): unknown {
  const text = (content || "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : text;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.search(/[{[]/);
    if (start >= 0) {
      const opener = candidate[start];
      const closer = opener === "{" ? "}" : "]";
      const end = candidate.lastIndexOf(closer);
      if (end > start) {
        try {
          return JSON.parse(candidate.slice(start, end + 1));
        } catch {
          // fall through
        }
      }
    }
    return null;
  }
}

/**
 * Search-rewrite mode: the AI cleans up what the user typed in the search bar
 * ("golface srilanka" -> ["galle face, colombo, sri lanka", ...]) so the free
 * geocoders can resolve it. Returns { queries, hint }.
 */
async function handleSearchRewrite(query: string, apiKey: string, model: string) {
  const messages = [
    {
      role: "system",
      content: [
        "You rewrite map search queries for an app called InclusiveMapper.",
        "The user types into a search bar; your job is to return cleaner queries that a map geocoder (OpenStreetMap) will understand.",
        "",
        "Rules:",
        "- Fix spelling mistakes and joined words (golface -> galle face, srilanka -> sri lanka).",
        "- Expand short names or aliases (sl -> sri lanka, uk -> united kingdom).",
        "- Keep the user's intent. Do not change the place they are looking for.",
        "- Return 1 to 3 alternative queries, from most specific to most general.",
        "- If the query is already clean, still return it as the first entry.",
        "- Optionally add a short hint (max 10 words) like 'Did you mean Galle Face, Colombo?' only when you changed the spelling meaningfully.",
        "",
        'Answer ONLY with JSON: {"queries": ["..."], "hint": "..."}',
        'Use "hint": "" when no hint is needed.',
      ].join("\n"),
    },
    { role: "user", content: query },
  ];

  let parsed: { queries?: unknown; hint?: unknown } | null = null;
  try {
    const msg = await callOpenRouter(messages, apiKey, model, { jsonMode: true });
    parsed = extractJson(msg?.content || "") as typeof parsed;
  } catch {
    parsed = null;
  }

  const queries = Array.isArray(parsed?.queries)
    ? (parsed.queries as unknown[])
        .filter((q): q is string => typeof q === "string")
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const hint = typeof parsed?.hint === "string" ? parsed.hint.trim() : "";

  // Never return an empty rewrite set: fall back to the raw query so the
  // client always has something to geocode.
  return { queries: queries.length > 0 ? queries : [query], hint };
}

// 4. Chat system prompt — the assistant's core rules.
type ChatLocation = { lat: number; lng: number };

function buildSystemPrompt(location?: ChatLocation) {
  const gps =
    location && Number.isFinite(location.lat) && Number.isFinite(location.lng)
      ? [
          "User's current GPS location:",
          `- latitude: ${location.lat}, longitude: ${location.lng}`,
          '- When the user says "near me", "nearby" or "around here", pass these as lat and lng to findPlaceInDatabase or searchAccessiblePlaces.',
          "- Never invent coordinates or distances.",
        ].join("\n")
      : [
          "User's current GPS location: not available.",
          "- If the user asks for places near them, ask them to share their location or to type a city/area name first.",
          "- Without GPS, call findPlaceInDatabase with only the query (no lat/lng), and use the city/area the user gave in webSearch.",
        ].join("\n");

  return [
    "You are the Accessibility Assistant for InclusiveMapper, an app that maps accessible public spaces.",
    "Your goal is to give accessibility information, but you MUST strictly follow the user's specific request.",
    "",
    "Your primary focus is accessibility:",
    "- Always give accessibility details first: wheelchair ramps, step-free entrances, elevators, accessible restrooms, tactile paving, accessible parking, automatic doors.",
    "- Answer in a clear, practical way for people who need accessible spaces.",
    "",
    "RULE 1 — specific category vs general request:",
    '- If the user asks for a SPECIFIC type of place ("temple", "school", "hospital", "supermarket", "park", "library") near their location, filter the search strictly by that keyword. DO NOT return random or unrelated saved places.',
    '- Only give a general list of nearby saved places when the user explicitly asks for "saved places", "any accessible places near me", or something general with no specific category — then omit the keyword so everything nearby can be listed.',
    "",
    "RULE 2 — strict search strategy for a category/keyword:",
    "  Step 1: call findPlaceInDatabase with query = that keyword and lat/lng from the GPS block below (radius 25). It searches our whole database for the keyword and keeps only places near the user.",
    "  Step 2: if it returns matching places, give them with their accessibility details (name, category, address, features, distance).",
    "  Step 3: if it returns NO places, DO NOT show unrelated saved places. IMMEDIATELY call webSearch for that category near the user's location — e.g. \"temples near Kandy Sri Lanka\" when a city is known, otherwise \"temples near <lat>, <lng>\".",
    "- searchAccessiblePlaces is an alternative for Step 1: it also filters by keyword and radius. Either tool is fine, but the keyword must always be passed.",
    "- If Step 1 says matching places exist but are further than the radius, say how far away they are and offer to search wider or use the web. Never present far-away places as if they were nearby.",
    "",
    "RULE 3 — when you had to use webSearch because the place or category is not in our database, respond with these exact steps in order:",
    '  1) Acknowledge — say exactly: "This place is not currently saved in our database. However, as a helpful gesture, I have searched for some information for you."',
    "  2) Provide info — the description and any known accessibility details from the web search.",
    "  3) Provide contact — a phone number or official website link so the user can verify accessibility features. Take them from the webSearch results or place tags (phone, contact:phone, website, url). If you found none, say so plainly and tell the user how to get them (call the local office or tourism board, check the official website/Facebook page).",
    '  4) Call to action — say exactly: "If you visit this place, please help our community by updating the map and adding its accessibility details to our app!"',
    "  Translate those two quoted sentences naturally when the user is writing in another language (Sinhala, Singlish, etc.).",
    "",
    "About a NAMED place (\"temple of tooth\", \"pothuwil beach\") — this is not a category search:",
    "- The place may be anywhere: call findPlaceInDatabase with just the name and NO lat/lng, so the whole database is searched with no distance limit.",
    "- I may already have run that lookup and pasted the result into this prompt. If so, answer from it directly and do not call the same tool again.",
    '- If it IS saved: give the full saved details (name, category, address, status, every accessibility feature) and say they come from our community map.',
    '- If it is NOT saved: follow RULE 3 exactly.',
    "",
    gps,
    "",
    "Links and contact details (the app makes these tappable):",
    "- Write a website on its own line as 'Website: https://example.com' — one clean link per line.",
    "- Never use ad, sponsored or tracking links (duckduckgo.com/y.js, bing.com/aclick, links with ad_provider or click_metadata). Use the official site only.",
    "- Write a phone number on its own line as 'Phone: 011 234 5678' so the app can offer a call button.",
    "- Do not paste long link addresses with query strings into prose.",
    "",
    "When you list places from a search, ALWAYS include for each place:",
    "- its name,",
    "- which accessibility features it has (ramp, step-free entrance, accessible toilet, elevator, parking, tactile paving, automatic door),",
    "- its distance from the searched point, in metres under 1000 and kilometres otherwise (for example '350 m' or '1.4 km').",
    "Read those values from the tool result: 'features' is a boolean map and 'distance' is in metres. Never invent a distance.",
    "",
    "Language and tone:",
    "- Match the language of the user's message. If they write in Sinhala, reply in Sinhala. If they write in Singlish (romanized Sinhala), reply in Singlish. Otherwise reply in English.",
    "- Be polite, warm and encouraging, like a helpful person, not a robot.",
    "- Keep answers short: a few sentences, short words, no jargon and no long lists unless the user asks.",
    "",
    "When the request is unclear:",
    "- Ask one short clarifying question instead of guessing.",
    "- Say what you did not understand in plain words.",
    '- Offer a simple example the user can copy, such as "Find parks near me".',
    "",
    "When you do not know or cannot help:",
    "- Say so plainly and suggest what the user can try next. Never invent facts, features, phone numbers or websites.",
  ].join("\n");
}

/** Parse the optional { lat, lng } the client sends with each message. */
function parseClientLocation(raw: unknown): ChatLocation | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const lat = Number((raw as Record<string, unknown>).lat);
  const lng = Number((raw as Record<string, unknown>).lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (lat === 0 && lng === 0) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

// 5. Main Request Handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Declared outside `try` so the catch block can build a fallback answer.
  let userMessage: unknown;
  let location: ChatLocation | undefined;

  try {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY secret missing." }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const model = Deno.env.get("OPENROUTER_MODEL") || "cohere/north-mini-code:free";
    const body = await req.json();

    userMessage = body.message || body.prompt;

    // ── Search-bar AI rewrite mode ────────────────────────────────────
    if (body.mode === "search-rewrite") {
      if (!userMessage || !String(userMessage).trim()) {
        return new Response(
          JSON.stringify({ error: "Missing 'message' for search-rewrite." }),
          { status: 400, headers: CORS_HEADERS }
        );
      }
      const rewrite = await handleSearchRewrite(String(userMessage), apiKey, model);
      return new Response(JSON.stringify(rewrite), { headers: CORS_HEADERS });
    }

    if (!userMessage && (!body.messages || body.messages.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Missing 'message' or 'messages'." }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    location = parseClientLocation(body.location ?? body.userLocation ?? body.coords);

    // Client history (oldest first), then the current message.
    const history: Array<{ role: string; content: string }> = Array.isArray(body.messages)
      ? body.messages
          .filter(
            (m: unknown) =>
              !!m &&
              typeof (m as Record<string, unknown>).content === "string" &&
              ((m as Record<string, unknown>).role === "user" ||
                (m as Record<string, unknown>).role === "assistant" ||
                (m as Record<string, unknown>).role === "bot"),
          )
          .map((m: Record<string, unknown>) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: String(m.content),
          }))
          .slice(-12)
      : [];

    // A question about a named place is looked up across the whole database
    // (then the web) before the model runs, so the answer never depends on
    // which tool the model happens to pick — and never on a distance radius.
    const questionText =
      String(userMessage ?? "").trim() ||
      [...history].reverse().find((m) => m.role === "user")?.content ||
      "";
    const preLookup = await namedPlacePreLookup(questionText);

    const messages: unknown[] = [
      {
        role: "system",
        content: buildSystemPrompt(location) + (preLookup ? `\n\n${preLookup.context}` : ""),
      },
    ];
    messages.push(...history);
    if (userMessage) messages.push({ role: "user", content: String(userMessage) });

    if (history.length === 0 && !userMessage) {
      return new Response(
        JSON.stringify({ error: "Missing 'message' or 'messages'." }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Initial message to OpenRouter
    let assistantMsg = await callOpenRouter(messages, apiKey, model);
    messages.push(assistantMsg);

    const executedActions: Array<{
      tool: string;
      args: Record<string, unknown>;
      result: unknown;
    }> = [];

    // Run the tool loop (max 2 rounds) so the assistant can, for example,
    // check the database first and only then search the web. Each round costs
    // one OpenRouter call, so keep the budget small.
    let rounds = 0;
    while (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0 && rounds < 2) {
      rounds++;
      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments || "{}");

        // A failing tool must not kill the whole chat — feed the error back.
        let toolResult: unknown;
        try {
          toolResult = await executeTool(fnName, fnArgs);
        } catch (toolErr: unknown) {
          toolResult = {
            status: "error",
            message: toolErr instanceof Error ? toolErr.message : String(toolErr),
          };
        }
        executedActions.push({ tool: fnName, args: fnArgs, result: toolResult });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      assistantMsg = await callOpenRouter(messages, apiKey, model);
      messages.push(assistantMsg);
    }

    const finalActions = mergeActions(preLookup?.action ?? null, executedActions);

    return new Response(
      JSON.stringify({
        // If the tool budget ran out with no prose, still give the user text.
        text: sanitizeAssistantText(
          assistantMsg.content ||
            "Sorry, I could not finish that answer. Please ask me again.",
        ),
        actionResponse: finalActions.length > 0 ? finalActions : null,
      }),
      { headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    // Upstream AI trouble: answer directly from the database when we can,
    // otherwise reply as a normal chat message instead of a red error bubble.
    if (err instanceof AiUpstreamError) {
      try {
        const text0 = String(userMessage ?? "");
        const direct = await directNearbyAnswer(text0, location) ?? await directPlaceAnswer(text0);
        if (direct) {
          return new Response(
            JSON.stringify({ ...direct, text: sanitizeAssistantText(String(direct.text ?? "")) }),
            { headers: CORS_HEADERS },
          );
        }
      } catch {
        // fall through to the friendly text reply
      }
      const text = err.kind === "rate_limit"
        ? "I am receiving a lot of questions right now, so my daily AI limit has been reached. Please try again a little later (the limit resets at 00:00 UTC / 5.30 AM in Sri Lanka)."
        : "I could not reach the AI service just now. Please try again in a moment.";
      return new Response(
        JSON.stringify({ text, actionResponse: null, degraded: true }),
        { headers: CORS_HEADERS }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
