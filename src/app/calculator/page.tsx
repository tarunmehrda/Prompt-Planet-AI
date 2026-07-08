"use client";

import { useMemo, useState } from "react";
import { Droplets, Zap, Cloud, Check, Loader2, Save, RotateCcw } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { FootprintCanvas } from "@/components/three/Scene3D";
import { Button } from "@/components/ui/Button";
import {
  PROMPT_TYPES,
  GRID_REGIONS,
  GRID_REGION_MAP,
  DEFAULT_REGION_ID,
  footprintForMix,
  scaleFootprint,
  waterEquivalences,
  energyEquivalences,
  co2Equivalences,
  formatWater,
  formatEnergy,
  formatCo2,
  fmt,
  type PromptTypeId,
  type PromptMix,
} from "@/lib/impact";

type Timeframe = "day" | "month" | "year";
const TIMEFRAMES: { id: Timeframe; label: string; factor: number }[] = [
  { id: "day", label: "Per day", factor: 1 },
  { id: "month", label: "Per month", factor: 30 },
  { id: "year", label: "Per year", factor: 365 },
];

const DEFAULT_MIX: Record<PromptTypeId, number> = { short: 20, chat: 12, long: 3, image: 2 };

export default function CalculatorPage() {
  return (
    <AuthGate>
      <Calculator />
    </AuthGate>
  );
}

function Calculator() {
  const [mix, setMix] = useState<Record<PromptTypeId, number>>(DEFAULT_MIX);
  const [regionId, setRegionId] = useState(DEFAULT_REGION_ID);
  const [timeframe, setTimeframe] = useState<Timeframe>("day");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const grid = GRID_REGION_MAP[regionId].gCO2ePerKwh;
  const factor = TIMEFRAMES.find((t) => t.id === timeframe)!.factor;

  const daily = useMemo(() => footprintForMix(mix as PromptMix, grid), [mix, grid]);
  const shown = useMemo(() => scaleFootprint(daily, factor), [daily, factor]);
  const dailyPrompts = Object.values(mix).reduce((a, b) => a + b, 0);

  // Normalise daily values to 0..1 for the 3D swarms (caps chosen for a heavy user).
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const waterFraction = clamp01(daily.waterMl / 2000);
  const energyFraction = clamp01(daily.energyWh / 400);
  const co2Fraction = clamp01(daily.co2g / 250);
  const coreScale = 0.7 + clamp01((waterFraction + energyFraction + co2Fraction) / 3) * 0.7;

  const water = formatWater(shown.waterMl);
  const energy = formatEnergy(shown.energyWh);
  const co2 = formatCo2(shown.co2g);

  function setCount(id: PromptTypeId, value: number) {
    setSaved(false);
    setMix((m) => ({ ...m, [id]: value }));
  }

  function reset() {
    setMix(DEFAULT_MIX);
    setRegionId(DEFAULT_REGION_ID);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompts: dailyPrompts,
          energyWh: daily.energyWh,
          waterMl: daily.waterMl,
          co2g: daily.co2g,
          regionId,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Could not save.");
      }
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Footprint calculator</h1>
        <p className="mt-2 max-w-2xl text-mist">
          Tune how you use AI and watch your world respond. Cyan is water, amber is energy,
          violet is carbon — the denser the swarm, the heavier your day.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* -------------------- 3D + readouts -------------------- */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="relative h-[42vh] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-surface/60 to-ink sm:h-[48vh]">
            <FootprintCanvas
              waterFraction={waterFraction}
              energyFraction={energyFraction}
              co2Fraction={co2Fraction}
              coreScale={coreScale}
            />
            <div className="pointer-events-none absolute left-4 top-4 rounded-full glass px-3 py-1 text-xs text-mist">
              {dailyPrompts} prompts / day
            </div>
          </div>

          {/* Timeframe toggle */}
          <div className="mt-5 flex gap-2 rounded-2xl glass p-1.5">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`flex-1 rounded-xl py-2 text-sm transition-colors ${
                  timeframe === t.id ? "bg-white/10 text-white" : "text-mist hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Metric cards */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MetricReadout
              icon={Droplets}
              tint="text-water"
              value={water.value}
              unit={water.unit}
              equiv={`${fmt(waterEquivalences(shown.waterMl)[0].value)} bottles`}
            />
            <MetricReadout
              icon={Zap}
              tint="text-energy"
              value={energy.value}
              unit={energy.unit}
              equiv={`${fmt(energyEquivalences(shown.energyWh)[0].value)} phone charges`}
            />
            <MetricReadout
              icon={Cloud}
              tint="text-carbon"
              value={co2.value}
              unit={co2.unit}
              equiv={`${fmt(co2Equivalences(shown.co2g)[0].value)} m driven`}
            />
          </div>
        </div>

        {/* -------------------- controls -------------------- */}
        <div className="space-y-5">
          <div className="rounded-3xl glass p-6">
            <h3 className="text-lg font-semibold">Your daily AI habit</h3>
            <p className="mt-1 text-sm text-mist-2">How many prompts of each kind, per day?</p>
            <div className="mt-6 space-y-6">
              {PROMPT_TYPES.map((t) => (
                <div key={t.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-lg">{t.emoji}</span>
                      <span className="font-medium">{t.label}</span>
                    </span>
                    <span className="tabular-nums text-sm text-mist">
                      {mix[t.id]} / day
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={mix[t.id]}
                    onChange={(e) => setCount(t.id, Number(e.target.value))}
                    className="w-full accent-brand"
                  />
                  <p className="mt-1 text-xs text-mist-2">
                    {t.description} · ~{t.energyWh} Wh, ~{t.waterMl} mL each
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl glass p-6">
            <h3 className="text-lg font-semibold">Your electricity grid</h3>
            <p className="mt-1 text-sm text-mist-2">
              Carbon depends heavily on where the data-centre gets its power.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GRID_REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRegionId(r.id);
                    setSaved(false);
                  }}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                    regionId === r.id
                      ? "border-brand/60 bg-brand/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-mist hover:border-white/20"
                  }`}
                >
                  <span className="block font-medium">{r.label}</span>
                  <span className="text-mist-2">{r.gCO2ePerKwh} g/kWh</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl glass p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Save to your dashboard</h3>
                <p className="mt-1 text-sm text-mist-2">
                  Logs today&rsquo;s footprint so you can track it over time.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-mist transition-colors hover:bg-white/5 hover:text-white"
                  title="Reset"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <Button onClick={save} variant="primary" size="md" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : saved ? (
                    <>
                      <Check className="h-4 w-4" /> Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Log today
                    </>
                  )}
                </Button>
              </div>
            </div>
            {saveError && <p className="mt-3 text-sm text-red-300">{saveError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricReadoutProps {
  icon: typeof Droplets;
  tint: string;
  value: string;
  unit: string;
  equiv: string;
}

function MetricReadout({ icon: Icon, tint, value, unit, equiv }: MetricReadoutProps) {
  return (
    <div className="rounded-2xl glass p-4">
      <Icon className={`h-5 w-5 ${tint}`} />
      <div className="mt-3 flex items-baseline gap-1">
        <span className={`text-2xl font-bold tabular-nums ${tint}`}>{value}</span>
        <span className="text-xs text-mist">{unit}</span>
      </div>
      <p className="mt-1 text-xs text-mist-2">≈ {equiv}</p>
    </div>
  );
}
