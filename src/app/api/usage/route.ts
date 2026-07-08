import { addUsage, getUsageForUser } from "@/lib/db";
import { getSession } from "@/lib/session";
import { GRID_REGION_MAP } from "@/lib/impact";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }
  const usage = await getUsageForUser(session.userId);
  return Response.json({ usage });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: {
    prompts?: number;
    energyWh?: number;
    waterMl?: number;
    co2g?: number;
    regionId?: string;
    date?: string;
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

  const entry = await addUsage({
    userId: session.userId,
    date,
    prompts: Math.round(num(body.prompts)),
    energyWh: num(body.energyWh),
    waterMl: num(body.waterMl),
    co2g: num(body.co2g),
    regionId,
  });

  return Response.json({ entry });
}
