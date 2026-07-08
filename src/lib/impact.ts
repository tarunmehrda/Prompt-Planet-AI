/**
 * impact.ts — The environmental-footprint model for AI usage.
 * =========================================================================
 * IMPORTANT / HONESTY NOTE
 * The numbers below are *estimates*. Real-world figures vary enormously by
 * model, data-centre, cooling design and the local electricity grid. Public
 * research disagrees by more than 100x. We therefore expose a small model with
 * adjustable assumptions rather than pretending there is one exact number.
 *
 * Anchoring sources (all publicly reported):
 *  - Google 2025 Environmental Report: median Gemini text prompt ≈ 0.24 Wh
 *    energy, ≈ 0.26 mL water, ≈ 0.03 g CO2e. (An efficient, best-case figure.)
 *  - UC Riverside "Making AI Less Thirsty" (Li et al., 2023): GPT-3 uses
 *    ~500 mL water per 10–50 medium responses (≈ 10–50 mL each); GPT-4 higher.
 *  - Widely cited older ChatGPT estimate: ≈ 2.9 Wh per query (~10x a search).
 *  - Grid carbon intensity: global avg ≈ 480 g CO2e/kWh; ranges from ~30
 *    (hydro/nuclear grids) to ~820 (coal-heavy grids).
 *
 * We default to a "typical" middle-of-the-range scenario and let the UI move
 * the sliders. Treat every output as an order-of-magnitude guide, not gospel.
 * ========================================================================= */

export type PromptTypeId = "short" | "chat" | "long" | "image";

export interface PromptType {
  id: PromptTypeId;
  label: string;
  emoji: string;
  /** energy drawn by the data-centre for one prompt, in watt-hours */
  energyWh: number;
  /** blended on-site + off-site water for one prompt, in millilitres */
  waterMl: number;
  description: string;
}

/** One prompt's cost, by category. Energy/water are independent estimates. */
export const PROMPT_TYPES: PromptType[] = [
  {
    id: "short",
    label: "Quick question",
    emoji: "💬",
    energyWh: 0.3,
    waterMl: 1,
    description: "A short factual question with a brief answer.",
  },
  {
    id: "chat",
    label: "Typical chat reply",
    emoji: "🤖",
    energyWh: 3,
    waterMl: 25,
    description: "A normal back-and-forth answer of a few paragraphs.",
  },
  {
    id: "long",
    label: "Long / reasoning",
    emoji: "🧠",
    energyWh: 20,
    waterMl: 150,
    description: "A long, step-by-step or 'thinking' response.",
  },
  {
    id: "image",
    label: "Image generation",
    emoji: "🎨",
    energyWh: 5,
    waterMl: 40,
    description: "Generating a single AI image.",
  },
];

export const PROMPT_TYPE_MAP: Record<PromptTypeId, PromptType> = Object.fromEntries(
  PROMPT_TYPES.map((p) => [p.id, p]),
) as Record<PromptTypeId, PromptType>;

/** Grid carbon intensity presets (grams CO2e per kWh). */
export interface GridRegion {
  id: string;
  label: string;
  gCO2ePerKwh: number;
}

export const GRID_REGIONS: GridRegion[] = [
  { id: "clean", label: "Clean grid (hydro / nuclear)", gCO2ePerKwh: 40 },
  { id: "eu", label: "Europe (avg)", gCO2ePerKwh: 250 },
  { id: "us", label: "United States (avg)", gCO2ePerKwh: 380 },
  { id: "global", label: "Global average", gCO2ePerKwh: 480 },
  { id: "india", label: "India (avg)", gCO2ePerKwh: 630 },
  { id: "coal", label: "Coal-heavy grid", gCO2ePerKwh: 820 },
];

export const GRID_REGION_MAP: Record<string, GridRegion> = Object.fromEntries(
  GRID_REGIONS.map((g) => [g.id, g]),
);

export const DEFAULT_REGION_ID = "global";

export interface Footprint {
  energyWh: number;
  waterMl: number;
  co2g: number;
}

export const EMPTY_FOOTPRINT: Footprint = { energyWh: 0, waterMl: 0, co2g: 0 };

/** CO2 for a given energy use, at a given grid intensity. */
export function co2ForEnergy(energyWh: number, gCO2ePerKwh: number): number {
  return (energyWh / 1000) * gCO2ePerKwh;
}

/** The footprint of a single prompt of a given type on a given grid. */
export function footprintForPrompt(typeId: PromptTypeId, gCO2ePerKwh: number): Footprint {
  const t = PROMPT_TYPE_MAP[typeId];
  return {
    energyWh: t.energyWh,
    waterMl: t.waterMl,
    co2g: co2ForEnergy(t.energyWh, gCO2ePerKwh),
  };
}

/* ---------------------------------------------------------------------------
 * Capture classification — turn measured prompt/reply sizes (from the browser
 * extension) into one of our prompt types. Kept deliberately simple and
 * mirrored in `extension/footprint.js` so the popup and server agree.
 * ------------------------------------------------------------------------- */

/** Classify a captured exchange by how many characters the prompt & reply held. */
export function classifyPromptType(
  promptChars: number,
  replyChars: number,
  isImage = false,
): PromptTypeId {
  if (isImage) return "image";
  const total = Math.max(0, promptChars) + Math.max(0, replyChars);
  if (replyChars <= 240 && total <= 600) return "short";
  if (replyChars <= 1600 && total <= 4000) return "chat";
  return "long";
}

/** Footprint of a captured exchange, plus the type we classified it as. */
export function footprintForCapture(
  promptChars: number,
  replyChars: number,
  isImage: boolean,
  gCO2ePerKwh: number,
): { type: PromptTypeId; footprint: Footprint } {
  const type = classifyPromptType(promptChars, replyChars, isImage);
  return { type, footprint: footprintForPrompt(type, gCO2ePerKwh) };
}

/** A "mix" = how many prompts of each type. */
export type PromptMix = Partial<Record<PromptTypeId, number>>;

export function footprintForMix(mix: PromptMix, gCO2ePerKwh: number): Footprint {
  return PROMPT_TYPES.reduce<Footprint>(
    (acc, t) => {
      const n = mix[t.id] ?? 0;
      const f = footprintForPrompt(t.id, gCO2ePerKwh);
      return {
        energyWh: acc.energyWh + f.energyWh * n,
        waterMl: acc.waterMl + f.waterMl * n,
        co2g: acc.co2g + f.co2g * n,
      };
    },
    { ...EMPTY_FOOTPRINT },
  );
}

export function scaleFootprint(f: Footprint, factor: number): Footprint {
  return {
    energyWh: f.energyWh * factor,
    waterMl: f.waterMl * factor,
    co2g: f.co2g * factor,
  };
}

export function addFootprints(a: Footprint, b: Footprint): Footprint {
  return {
    energyWh: a.energyWh + b.energyWh,
    waterMl: a.waterMl + b.waterMl,
    co2g: a.co2g + b.co2g,
  };
}

/* ---------------------------------------------------------------------------
 * Real-world equivalences — turn abstract numbers into things you can feel.
 * ------------------------------------------------------------------------- */

export interface Equivalence {
  icon: string;
  value: number;
  unit: string;
  label: string;
}

export function waterEquivalences(ml: number): Equivalence[] {
  return [
    { icon: "🍶", value: ml / 500, unit: "bottles", label: "500 mL water bottles" },
    { icon: "🥤", value: ml / 250, unit: "glasses", label: "glasses of water" },
    { icon: "🚿", value: ml / 150, unit: "seconds", label: "of a running shower" },
  ];
}

export function energyEquivalences(wh: number): Equivalence[] {
  return [
    { icon: "📱", value: wh / 15, unit: "charges", label: "full smartphone charges" },
    { icon: "💡", value: wh / 10, unit: "hours", label: "of a 10 W LED bulb" },
    { icon: "☕", value: wh / 30, unit: "cups", label: "of water boiled for tea" },
  ];
}

export function co2Equivalences(g: number): Equivalence[] {
  return [
    { icon: "🚗", value: g / 0.12, unit: "metres", label: "driven in a petrol car" },
    { icon: "🌳", value: g / 57.5, unit: "tree-days", label: "a tree needs to reabsorb it" },
    { icon: "🎈", value: g / 2, unit: "balloons", label: "of CO₂ gas (~2 g each)" },
  ];
}

/* ---------------------------------------------------------------------------
 * "AI vs everyday life" — context so people don't panic OR dismiss it.
 * A single prompt is tiny; the point is scale (billions of prompts a day).
 * ------------------------------------------------------------------------- */

export interface CompareItem {
  label: string;
  emoji: string;
  co2g: number;
  waterMl: number;
  note: string;
}

export const COMPARE_ITEMS: CompareItem[] = [
  { label: "One AI prompt", emoji: "🤖", co2g: 1.4, waterMl: 25, note: "A typical chat reply." },
  { label: "Google search", emoji: "🔍", co2g: 0.2, waterMl: 0.5, note: "A single web search." },
  { label: "Sending an email", emoji: "✉️", co2g: 4, waterMl: 0, note: "A short email with no attachment." },
  { label: "1 hr HD streaming", emoji: "📺", co2g: 36, waterMl: 0, note: "One hour of video streaming." },
  { label: "1 km by car", emoji: "🚗", co2g: 120, waterMl: 0, note: "One kilometre in a petrol car." },
  { label: "One cup of coffee", emoji: "☕", co2g: 21, waterMl: 140000, note: "Includes growing the beans." },
  { label: "One beef burger", emoji: "🍔", co2g: 3000, waterMl: 2500000, note: "Farm-to-plate footprint." },
];

/* ---------------------------------------------------------------------------
 * Number formatting helpers used across the UI.
 * ------------------------------------------------------------------------- */

export function formatWater(ml: number): { value: string; unit: string } {
  if (ml >= 1_000_000) return { value: fmt(ml / 1_000_000), unit: "m³" };
  if (ml >= 1000) return { value: fmt(ml / 1000), unit: "L" };
  return { value: fmt(ml), unit: "mL" };
}

export function formatEnergy(wh: number): { value: string; unit: string } {
  if (wh >= 1_000_000) return { value: fmt(wh / 1_000_000), unit: "MWh" };
  if (wh >= 1000) return { value: fmt(wh / 1000), unit: "kWh" };
  return { value: fmt(wh), unit: "Wh" };
}

export function formatCo2(g: number): { value: string; unit: string } {
  if (g >= 1_000_000) return { value: fmt(g / 1_000_000), unit: "t CO₂e" };
  if (g >= 1000) return { value: fmt(g / 1000), unit: "kg CO₂e" };
  return { value: fmt(g), unit: "g CO₂e" };
}

/** Compact, human number formatting (1.2k, 3.4M, 12, 0.42). */
export function fmt(n: number): string {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1000) return (n / 1000).toFixed(1) + "k";
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  if (abs >= 1) return n.toFixed(1);
  if (abs === 0) return "0";
  if (abs >= 0.01) return n.toFixed(2);
  return n.toExponential(1);
}
