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
        "Search accessible public places by location, radius, disability type, and what the user is looking for (e.g. park, library, toilet).",
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
        "Check if a specific place already exists in the InclusiveMapper database. Always call this first when the user asks about a named place.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The place name to look up, e.g. 'Galle Face Green'",
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
    const safe = query.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
    if (!safe) return { status: "not_found", places: [] };

    // Match on name or address, ignore case, tolerate partial names.
    const { data, error } = await supabaseAdmin
      .from("places")
      .select("*")
      .or(`name.ilike.%${safe}%,address.ilike.%${safe}%`)
      .limit(5);

    if (error) throw new Error(`Database search error: ${error.message}`);
    return { status: data && data.length > 0 ? "found" : "not_found", places: data ?? [] };
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
  /^(i want to know about|i want to know|i would like to know about|could you tell me about|tell me about|please tell me about|what is|what's|whats|info about|information about|describe|do you know about|does|is there|is|are|was|were|can|could|should|will|do|can you tell me about|about)\s+/i;

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
          '- When the user says "near me", "nearby" or "around here", use these coordinates as lat and lng in searchAccessiblePlaces.',
          "- Never invent coordinates or distances.",
        ].join("\n")
      : [
          "User's current GPS location: not available.",
          "- If the user asks for places near them, ask them to share their location or to type a city/area name first.",
        ].join("\n");

  return [
    "You are the Accessibility Assistant for InclusiveMapper, an app that maps accessible public spaces.",
    "",
    "Your primary focus is accessibility:",
    "- Always give accessibility details first: wheelchair ramps, step-free entrances, elevators, accessible restrooms, tactile paving, accessible parking, automatic doors.",
    "- Answer questions about accessibility in a clear, practical way for people who need accessible spaces.",
    "",
    "Language and tone:",
    "- Match the language of the user's message. If they write in Sinhala, reply in Sinhala. If they write in Singlish (romanized Sinhala), reply in Singlish. Otherwise reply in English.",
    "- Be polite, warm and encouraging, like a helpful person, not a robot.",
    "- Keep answers short: a few sentences, short words, no jargon and no long lists unless the user asks.",
    "",
    gps,
    "",
    "Finding nearby places (GPS):",
    "- When the user asks for accessible places near them, call searchAccessiblePlaces with their GPS coordinates above.",
    "- Pass 'query' with the kind of place they asked for (for example 'park', 'library', 'toilet') so only matching places come back. Omit 'query' only when they want anything nearby.",
    "- List ONLY places that match what the user asked for. If the tool returns none, say plainly that no matching place is saved nearby (and offer to search wider or add one). Never show unrelated places as the answer.",
    "- If no GPS is available, use the city or area the user gave. Ask one short question if you do not know where they mean.",
    "",
    "About a specific place (always check our database FIRST):",
    "- When the user asks about a named place, FIRST call findPlaceInDatabase with that name.",
    "- If it IS in the database: give the saved accessibility details and general information (category, address, status) directly from the tool result. Do not use webSearch in that case.",
    "- If it is NOT in the database (findPlaceInDatabase returns no places), you MUST follow all four steps below, in order:",
    "  1) Say exactly: \"This place is not currently saved in our database. However, as a helpful gesture, I have searched for some information for you.\"",
    "  2) Call webSearch with the place name and city, then give a general description of the place and any known accessibility information from the results.",
    "  3) Always give a phone number or official website so the user can contact the place directly to confirm accessibility features. Take it from the webSearch results or place tags (phone, contact:phone, website, url). If you truly cannot find any, say so clearly and tell the user how they can find it.",
    "  4) End with exactly: \"If you visit this place, please help our community by updating the map and adding its accessibility details to our app!\"",
    "  Translate those two quoted sentences naturally when the user is writing in another language (Sinhala, Singlish, etc.).",
    "",
    "When you list places from a search, ALWAYS include for each place:",
    "- its name,",
    "- which accessibility features it has (ramp, step-free entrance, accessible toilet, elevator, parking, tactile paving, automatic door),",
    "- its distance from the searched point, in metres under 1000 and kilometres otherwise (for example '350 m' or '1.4 km').",
    "Read those values from the tool result: 'features' is a boolean map and 'distance' is in metres. Never invent a distance.",
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

    const messages: unknown[] = [{ role: "system", content: buildSystemPrompt(location) }];
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

    return new Response(
      JSON.stringify({
        // If the tool budget ran out with no prose, still give the user text.
        text: assistantMsg.content ||
          "Sorry, I could not finish that answer. Please ask me again.",
        actionResponse: executedActions.length > 0 ? executedActions : null,
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
          return new Response(JSON.stringify(direct), { headers: CORS_HEADERS });
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
