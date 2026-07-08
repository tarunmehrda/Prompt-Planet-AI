/**
 * /api/usage — read + write the local footprint log.
 * The app is single-user now, so there is no session: usage is global.
 * GET  → all logged entries.
 * POST → append one entry (used by the manual calculator's "Log today").
 */
import { addTrackedUsage, getAllUsage } from "@/lib/db";
import { GRID_REGION_MAP } from "@/lib/impact";

export async function GET() {
  const usage = await getAllUsage();
  return Response.json({ usage });
}

export async function POST(request: Request) {
  let body: {
    prompts?: number;
    energyWh?: number;
    waterMl?: number;
    co2g?: number;
    regionId?: string;
    date?: string;
    source?: string;
    promptType?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const num = (v: unknown) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : 0);
  const regionId = GRID_REGION_MAP[body.regionId ?? ""] ? body.regionId! : "global";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date ?? "")
    ? body.date!
    : new Date().toISOString().slice(0, 10);

  const entry = await addTrackedUsage({
    date,
    prompts: Math.round(num(body.prompts)),
    energyWh: num(body.energyWh),
    waterMl: num(body.waterMl),
    co2g: num(body.co2g),
    regionId,
    source: typeof body.source === "string" ? body.source : "manual",
    promptType: typeof body.promptType === "string" ? body.promptType : undefined,
  });

  return Response.json({ entry });
}
