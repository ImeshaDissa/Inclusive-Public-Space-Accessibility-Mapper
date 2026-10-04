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
      description: "Search accessible public places by location, radius, and disability type.",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number", description: "Latitude" },
          lng: { type: "number", description: "Longitude" },
          radius: { type: "number", description: "Search radius in km" },
          disabilityType: { type: "string", description: "Target disability type" },
        },
        required: ["lat", "lng"],
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

// 2. Real Supabase Database Interactions
export async function executeDatabaseInteraction(name: string, args: Record<string, unknown>) {
  if (name === "searchAccessiblePlaces") {
    const lat = Number(args.lat);
    const lng = Number(args.lng);
    const radius = Number(args.radius ?? 5);
    const disability_type = String(args.disabilityType ?? "General");

    const { data, error } = await supabaseAdmin.rpc("find_nearby_accessible_places", {
      p_lat: lat,
      p_lng: lng,
      p_radius: radius,
      p_disability_type: disability_type,
    });

    if (error) throw new Error(`Database RPC error: ${error.message}`);
    return { status: "success", places: data };
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

// 3. OpenRouter API Caller
export async function callOpenRouter(messages: unknown[], apiKey: string, model: string) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://inclusive-mapper.supabase.co",
      "X-Title": "InclusiveMapper AI Orchestrator",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message;
}

// 4. Main Request Handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

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

    const userMessage = body.message || body.prompt;
    if (!userMessage && (!body.messages || body.messages.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Missing 'message' or 'messages'." }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const messages = body.messages || [
      {
        role: "system",
        content: [
          "You are the chat helper for InclusiveMapper, an app that maps accessible public places.",
          "",
          "How to talk to the user:",
          "- Use simple, everyday English. Short words and short sentences.",
          "- Be warm and friendly, like a helpful person, not a robot.",
          "- Keep answers short. A few sentences is enough.",
          "- Avoid jargon, technical words, and long lists unless the user asks for them.",
          "",
          "What you can do:",
          "- Find accessible places near the user.",
          "- Add a new accessible place to the map.",
          "- Explain which accessibility features a place has.",
          "- Answer simple questions about accessibility.",
          "",
          "When the request is unclear:",
          "- Ask one short clarifying question instead of guessing.",
          "- Say what you did not understand in plain words.",
          "- Offer a simple example the user can copy, such as 'Find parks near me'.",
          "",
          "When you do not know or cannot help:",
          "- Say so plainly and suggest what the user can try next.",
        ].join("\n"),
      },
      { role: "user", content: userMessage },
    ];

    // Initial message to OpenRouter
    const assistantMsg = await callOpenRouter(messages, apiKey, model);
    messages.push(assistantMsg);

    const executedActions = [];

    // Process tool calls if triggered by LLM
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments || "{}");

        const toolResult = await executeDatabaseInteraction(fnName, fnArgs);
        executedActions.push({ tool: fnName, args: fnArgs, result: toolResult });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Second call to OpenRouter with tool outputs included
      const finalMsg = await callOpenRouter(messages, apiKey, model);

      return new Response(
        JSON.stringify({
          text: finalMsg.content,
          actionResponse: executedActions,
        }),
        { headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({
        text: assistantMsg.content,
        actionResponse: null,
      }),
      { headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
