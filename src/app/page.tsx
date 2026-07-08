"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Droplets,
  Zap,
  Cloud,
  MessageSquare,
  CalendarDays,
  ArrowRight,
  Puzzle,
  Radio,
} from "lucide-react";
import type { UsageEntry } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { FootprintCanvas } from "@/components/three/Scene3D";
import {
  formatWater,
  formatEnergy,
  formatCo2,
  co2Equivalences,
  fmt,
} from "@/lib/impact";
import type { ChartPoint } from "@/components/dashboard/UsageChart";

const UsageChart = dynamic(() => import("@/components/dashboard/UsageChart"), {
  ssr: false,
  loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-white/[0.03]" />,
});

type MetricKey = "co2g" | "waterMl" | "energyWh";
const METRICS: { key: MetricKey; label: string; color: string; unit: string }[] = [
  { key: "co2g", label: "Carbon", color: "#a78bfa", unit: "g CO₂e" },
  { key: "waterMl", label: "Water", color: "#22d3ee", unit: "mL" },
  { key: "energyWh", label: "Energy", color: "#fbbf24", unit: "Wh" },
];

/** How each capture source is presented. */
const SOURCES: Record<string, { label: string; emoji: string }> = {
  chatgpt: { label: "ChatGPT", emoji: "🤖" },
  claude: { label: "Claude", emoji: "🧠" },
  gemini: { label: "Gemini", emoji: "✨" },
  copilot: { label: "Copilot", emoji: "🧑‍✈️" },
  perplexity: { label: "Perplexity", emoji: "🔎" },
  poe: { label: "Poe", emoji: "🎭" },
  deepseek: { label: "DeepSeek", emoji: "🐋" },
  meta: { label: "Meta AI", emoji: "♾️" },
  grok: { label: "Grok", emoji: "𝕏" },
  mistral: { label: "Mistral", emoji: "🌬️" },
  huggingface: { label: "HuggingChat", emoji: "🤗" },
  manual: { label: "Calculator", emoji: "🧮" },
  other: { label: "Other AI", emoji: "💬" },
};
const sourceOf = (s?: string) => SOURCES[s ?? "other"] ?? SOURCES.other;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function DashboardHome() {
  const [entries, setEntries] = useState<UsageEntry[] | null>(null);
  const [metric, setMetric] = useState<MetricKey>("co2g");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  // Poll so the dashboard updates live as the extension logs prompts.
  useEffect(() => {
    let active = true;
    async function load(mark = false) {
      try {
        const res = await fetch("/api/usage", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setEntries(data.usage ?? []);
        setError(null);
        if (mark) {
          setLive(true);
          setTimeout(() => active && setLive(false), 1200);
        }
      } catch {
        if (active) setError("Could not load your usage.");
      }
    }
    load();
    const t = setInterval(() => load(true), 4000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const list = useMemo(() => entries ?? [], [entries]);

  const totals = useMemo(
    () =>
      list.reduce(
        (a, e) => ({
          prompts: a.prompts + e.prompts,
          waterMl: a.waterMl + e.waterMl,
          energyWh: a.energyWh + e.energyWh,
          co2g: a.co2g + e.co2g,
        }),
        { prompts: 0, waterMl: 0, energyWh: 0, co2g: 0 },
      ),
    [list],
  );

  const today = useMemo(() => {
    const d = todayStr();
    return list
      .filter((e) => e.date === d)
      .reduce(
        (a, e) => ({
          prompts: a.prompts + e.prompts,
          waterMl: a.waterMl + e.waterMl,
          energyWh: a.energyWh + e.energyWh,
          co2g: a.co2g + e.co2g,
        }),
        { prompts: 0, waterMl: 0, energyWh: 0, co2g: 0 },
      );
  }, [list]);

  // Source breakdown (all-time).
  const bySource = useMemo(() => {
    const m = new Map<string, { prompts: number; co2g: number }>();
    for (const e of list) {
      const k = e.source ?? "other";
      const cur = m.get(k) ?? { prompts: 0, co2g: 0 };
      cur.prompts += e.prompts;
      cur.co2g += e.co2g;
      m.set(k, cur);
    }
    return [...m.entries()]
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => b.prompts - a.prompts);
  }, [list]);

  // Aggregate to one point per day for the chart.
  const chartData: ChartPoint[] = useMemo(() => {
    const days = new Map<string, number>();
    for (const e of list) days.set(e.date, (days.get(e.date) ?? 0) + e[metric]);
    return [...days.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({
        label: shortDate(date),
        value: Number(value.toFixed(metric === "co2g" ? 2 : 1)),
      }));
  }, [list, metric]);

  // Drive the 3D world from today's load (fall back to all-time if today is empty).
  const drive = today.prompts > 0 ? today : totals;
  const waterFraction = clamp01(drive.waterMl / 2000);
  const energyFraction = clamp01(drive.energyWh / 400);
  const co2Fraction = clamp01(drive.co2g / 250);
  const coreScale = 0.7 + clamp01((waterFraction + energyFraction + co2Fraction) / 3) * 0.7;

  const activeMetric = METRICS.find((m) => m.key === metric)!;
  const water = formatWater(totals.waterMl);
  const energy = formatEnergy(totals.energyWh);
  const co2 = formatCo2(totals.co2g);
  const tWater = formatWater(today.waterMl);
  const tEnergy = formatEnergy(today.energyWh);
  const tCo2 = formatCo2(today.co2g);
  const daysLogged = new Set(list.map((e) => e.date)).size;

  if (entries === null && !error) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-brand" />
      </div>
    );
  }

  const empty = list.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ---------------- hero band ---------------- */}
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1 text-xs text-mist">
            <Radio className={`h-3.5 w-3.5 ${live ? "text-brand animate-pulse" : "text-mist-2"}`} />
            {live ? "Syncing…" : "Live footprint tracker"}
          </div>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Your AI footprint,{" "}
            <span className="text-gradient">as it happens.</span>
          </h1>
          <p className="mt-3 max-w-xl text-mist">
            Every prompt captured by the Prompt&nbsp;Planet extension lands here — water, energy and
            carbon, drop by drop. The world on the right breathes with today&rsquo;s load.
          </p>

          {/* today's quick stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Today" value={fmt(today.prompts)} unit="prompts" tint="text-brand" />
            <MiniStat label="Water" value={tWater.value} unit={tWater.unit} tint="text-water" />
            <MiniStat label="Energy" value={tEnergy.value} unit={tEnergy.unit} tint="text-energy" />
            <MiniStat label="Carbon" value={tCo2.value} unit={tCo2.unit} tint="text-carbon" />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/extension" variant="primary" size="md">
              <Puzzle className="h-4 w-4" />
              {empty ? "Install the extension" : "Extension settings"}
            </Button>
            <Button href="/calculator" variant="outline" size="md">
              Open calculator
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative h-[38vh] min-h-[300px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-surface/60 to-ink">
          <FootprintCanvas
            waterFraction={waterFraction}
            energyFraction={energyFraction}
            co2Fraction={co2Fraction}
            coreScale={coreScale}
          />
          <div className="pointer-events-none absolute left-4 top-4 rounded-full glass px-3 py-1 text-xs text-mist">
            {today.prompts > 0 ? `today · ${today.prompts} prompts` : "waiting for prompts…"}
          </div>
        </div>
      </div>

      {empty ? (
        <EmptyState />
      ) : (
        <>
          {/* ---------------- all-time stat cards ---------------- */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Cloud} tint="text-carbon" label="Total carbon" value={co2.value} unit={co2.unit} />
            <StatCard icon={Droplets} tint="text-water" label="Total water" value={water.value} unit={water.unit} />
            <StatCard icon={Zap} tint="text-energy" label="Total energy" value={energy.value} unit={energy.unit} />
            <StatCard
              icon={MessageSquare}
              tint="text-brand"
              label="Prompts tracked"
              value={fmt(totals.prompts)}
              unit=""
            />
          </div>

          {/* ---------------- chart ---------------- */}
          <div className="mt-6 rounded-3xl glass p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Footprint per day</h3>
                <p className="text-sm text-mist-2">
                  {daysLogged} {daysLogged === 1 ? "day" : "days"} tracked · showing{" "}
                  {activeMetric.label.toLowerCase()}
                </p>
              </div>
              <div className="flex gap-1.5 rounded-full glass p-1">
                {METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                      metric === m.key ? "bg-white/10 text-white" : "text-mist hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <UsageChart data={chartData} color={activeMetric.color} unit={activeMetric.unit} />
          </div>

          {/* ---------------- sources + recent ---------------- */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl glass p-6">
              <h3 className="text-lg font-semibold">Where it came from</h3>
              <p className="mt-1 text-sm text-mist-2">Prompts by AI assistant.</p>
              <div className="mt-5 space-y-3">
                {bySource.map((s) => {
                  const meta = sourceOf(s.key);
                  const pct = totals.prompts ? (s.prompts / totals.prompts) * 100 : 0;
                  return (
                    <div key={s.key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span>{meta.emoji}</span>
                          <span className="font-medium">{meta.label}</span>
                        </span>
                        <span className="tabular-nums text-mist">{fmt(s.prompts)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand to-water"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl glass p-6 lg:col-span-2">
              <h3 className="mb-4 text-lg font-semibold">Recent prompts</h3>
              <div className="space-y-2">
                {[...list].reverse().slice(0, 7).map((e) => {
                  const meta = sourceOf(e.source);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">{meta.emoji}</span>
                        <span className="font-medium">{meta.label}</span>
                        <span className="hidden text-mist-2 sm:inline">
                          · {e.promptType ?? "chat"}
                        </span>
                        <span className="flex items-center gap-1 text-mist-2">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {fullDate(e.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-water">
                          {formatWater(e.waterMl).value}
                          {formatWater(e.waterMl).unit}
                        </span>
                        <span className="text-energy">
                          {formatEnergy(e.energyWh).value}
                          {formatEnergy(e.energyWh).unit}
                        </span>
                        <span className="text-carbon">
                          {formatCo2(e.co2g).value}
                          {formatCo2(e.co2g).unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ---------------- in perspective ---------------- */}
          <div className="mt-6 rounded-3xl border border-brand/20 bg-gradient-to-br from-brand/10 to-transparent p-6">
            <h3 className="text-lg font-semibold">In perspective</h3>
            <p className="mt-2 text-sm text-mist">
              Your tracked carbon so far is like driving{" "}
              <span className="font-bold text-brand">
                <AnimatedNumber value={co2Equivalences(totals.co2g)[0].value} decimals={0} /> m
              </span>{" "}
              in a petrol car — and a tree would need{" "}
              <span className="font-bold text-white">
                {fmt(co2Equivalences(totals.co2g)[1].value)} days
              </span>{" "}
              to reabsorb it.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, unit, tint }: { label: string; value: string; unit: string; tint: string }) {
  return (
    <div className="rounded-2xl glass p-3">
      <div className="text-xs text-mist-2">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-xl font-bold tabular-nums ${tint}`}>{value}</span>
        <span className="text-[11px] text-mist">{unit}</span>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  tint,
  label,
  value,
  unit,
}: {
  icon: typeof Cloud;
  tint: string;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-mist">{label}</span>
        <Icon className={`h-5 w-5 ${tint}`} />
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className={`text-3xl font-bold tabular-nums ${tint}`}>{value}</span>
        <span className="text-sm text-mist">{unit}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-3xl glass p-12 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand/20 to-water/20">
        <Puzzle className="h-8 w-8 text-brand" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">No prompts tracked yet</h3>
      <p className="mx-auto mt-2 max-w-md text-mist">
        Install the Prompt&nbsp;Planet browser extension, then chat with ChatGPT, Claude, Gemini or
        Copilot as usual. Each exchange shows up here automatically — no copy-paste, no accounts.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href="/extension" variant="primary" size="lg">
          <Puzzle className="h-4 w-4" />
          Get the extension
        </Button>
        <Button href="/calculator" variant="outline" size="lg">
          Or estimate manually
        </Button>
      </div>
    </div>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fullDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
