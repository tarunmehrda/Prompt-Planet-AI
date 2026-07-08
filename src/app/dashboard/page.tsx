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
} from "lucide-react";
import type { UsageEntry } from "@/lib/db";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import {
  formatWater,
  formatEnergy,
  formatCo2,
  co2Equivalences,
  fmt,
  GRID_REGION_MAP,
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

export default function DashboardPage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<UsageEntry[] | null>(null);
  const [metric, setMetric] = useState<MetricKey>("co2g");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/usage", { cache: "no-store" });
        const data = await res.json();
        if (active) setEntries(data.usage ?? []);
      } catch {
        if (active) setError("Could not load your usage.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const list = entries ?? [];
    return list.reduce(
      (acc, e) => ({
        prompts: acc.prompts + e.prompts,
        waterMl: acc.waterMl + e.waterMl,
        energyWh: acc.energyWh + e.energyWh,
        co2g: acc.co2g + e.co2g,
      }),
      { prompts: 0, waterMl: 0, energyWh: 0, co2g: 0 },
    );
  }, [entries]);

  const chartData: ChartPoint[] = useMemo(() => {
    return (entries ?? []).map((e, i) => ({
      label: shortDate(e.createdAt) || `#${i + 1}`,
      value: Number(e[metric].toFixed(metric === "co2g" ? 2 : 1)),
    }));
  }, [entries, metric]);

  const activeMetric = METRICS.find((m) => m.key === metric)!;
  const water = formatWater(totals.waterMl);
  const energy = formatEnergy(totals.energyWh);
  const co2 = formatCo2(totals.co2g);
  const daysLogged = entries?.length ?? 0;

  if (entries === null && !error) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Hey {user?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="mt-2 text-mist">Your AI footprint over time, all in one place.</p>
        </div>
        <Button href="/calculator" variant="primary" size="md">
          Log a new day
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {daysLogged === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Cloud} tint="text-carbon" label="Total carbon" value={co2.value} unit={co2.unit} />
            <StatCard icon={Droplets} tint="text-water" label="Total water" value={water.value} unit={water.unit} />
            <StatCard icon={Zap} tint="text-energy" label="Total energy" value={energy.value} unit={energy.unit} />
            <StatCard
              icon={MessageSquare}
              tint="text-brand"
              label="Prompts logged"
              value={fmt(totals.prompts)}
              unit=""
            />
          </div>

          {/* Chart */}
          <div className="mt-6 rounded-3xl glass p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Footprint per logged day</h3>
                <p className="text-sm text-mist-2">
                  {daysLogged} {daysLogged === 1 ? "entry" : "entries"} · showing{" "}
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

          {/* Insight + recent */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-brand/20 bg-gradient-to-br from-brand/10 to-transparent p-6 lg:col-span-1">
              <h3 className="text-lg font-semibold">In perspective</h3>
              <p className="mt-3 text-sm text-mist">
                Your logged carbon so far is like driving
              </p>
              <p className="mt-1 text-3xl font-bold text-brand">
                <AnimatedNumber value={co2Equivalences(totals.co2g)[0].value} decimals={0} /> m
              </p>
              <p className="text-sm text-mist-2">in a petrol car — and a tree would need</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {fmt(co2Equivalences(totals.co2g)[1].value)} days
              </p>
              <p className="text-sm text-mist-2">to reabsorb it.</p>
            </div>

            <div className="rounded-3xl glass p-6 lg:col-span-2">
              <h3 className="mb-4 text-lg font-semibold">Recent logs</h3>
              <div className="space-y-2">
                {[...(entries ?? [])]
                  .slice(-6)
                  .reverse()
                  .map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-4 w-4 text-mist-2" />
                        <span>{fullDate(e.createdAt)}</span>
                        <span className="text-mist-2">· {e.prompts} prompts</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-water">{formatWater(e.waterMl).value}{formatWater(e.waterMl).unit}</span>
                        <span className="text-energy">{formatEnergy(e.energyWh).value}{formatEnergy(e.energyWh).unit}</span>
                        <span className="text-carbon">{formatCo2(e.co2g).value}{formatCo2(e.co2g).unit}</span>
                        <span className="hidden text-mist-2 sm:inline">
                          {GRID_REGION_MAP[e.regionId]?.label.split(" ")[0] ?? ""}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
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
    <div className="rounded-3xl glass p-12 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand/20 to-water/20">
        <Droplets className="h-8 w-8 text-water" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">No logs yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-mist">
        Head to the calculator, set your daily AI habit, and hit{" "}
        <b className="text-white">Log today</b> to start building your footprint history.
      </p>
      <div className="mt-6">
        <Button href="/calculator" variant="primary" size="lg">
          Open the calculator
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
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
