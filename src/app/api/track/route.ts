/**
 * /api/track — ingest a single captured AI exchange from the browser extension.
 * No authentication: the app is local/single-user. CORS is open so the
 * extension's service worker (a chrome-extension:// origin) can post here.
 */
import { addTrackedUsage } from "@/lib/db";
import { GRID_REGION_MAP, DEFAULT_REGION_ID, footprintForCapture } from "@/lib/impact";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

const KNOWN_SOURCES = new Set([
  "chatgpt",
  "claude",
  "gemini",
  "copilot",
  "perplexity",
  "poe",
  "deepseek",
  "meta",
  "grok",
  "mistral",
  "huggingface",
  "manual",
  "other",
]);

export async function POST(request: Request) {
  let body: {
    source?: string;
    promptChars?: number;
    replyChars?: number;
    isImage?: boolean;
    regionId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const num = (v: unknown) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : 0);
  const promptChars = num(body.promptChars);
  const replyChars = num(body.replyChars);
  const isImage = body.isImage === true;

  // Ignore empty/no-op captures so we don't pollute the dashboard.
  if (!isImage && promptChars + replyChars < 2) {
    return json({ error: "Nothing to log." }, 400);
  }

  const regionId = GRID_REGION_MAP[body.regionId ?? ""] ? body.regionId! : DEFAULT_REGION_ID;
  const grid = GRID_REGION_MAP[regionId].gCO2ePerKwh;
  const source =
    typeof body.source === "string" && KNOWN_SOURCES.has(body.source) ? body.source : "other";

  // Server is the source of truth for the footprint — recompute from sizes.
  const { type, footprint } = footprintForCapture(promptChars, replyChars, isImage, grid);

  const entry = await addTrackedUsage({
    date: new Date().toISOString().slice(0, 10),
    prompts: 1,
    energyWh: footprint.energyWh,
    waterMl: footprint.waterMl,
    co2g: footprint.co2g,
    regionId,
    source,
    promptType: type,
  });

  return json({ ok: true, entry });
}
