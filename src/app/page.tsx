"use client";

import Link from "next/link";
import {
  Droplets,
  Zap,
  Cloud,
  ArrowRight,
  Calculator,
  LayoutDashboard,
  Globe2,
  Sparkles,
} from "lucide-react";
import { HeroCanvas } from "@/components/three/Scene3D";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import {
  footprintForPrompt,
  waterEquivalences,
  energyEquivalences,
  co2Equivalences,
  COMPARE_ITEMS,
  formatCo2,
  fmt,
} from "@/lib/impact";

const GRID = 480; // global average grid for the landing story
const typical = footprintForPrompt("chat", GRID);

// One illustrative billion prompts a day (order-of-magnitude, not exact).
const DAILY_PROMPTS = 1_000_000_000;

const metricCards = [
  {
    icon: Droplets,
    tint: "text-water",
    ring: "from-water/30",
    label: "Water",
    value: typical.waterMl,
    unit: "mL",
    equiv: waterEquivalences(typical.waterMl)[0],
    blurb: "for data-centre cooling & power",
  },
  {
    icon: Zap,
    tint: "text-energy",
    ring: "from-energy/30",
    label: "Energy",
    value: typical.energyWh,
    unit: "Wh",
    equiv: energyEquivalences(typical.energyWh)[1],
    blurb: "electricity to run the model",
  },
  {
    icon: Cloud,
    tint: "text-carbon",
    ring: "from-carbon/30",
    label: "CO₂",
    value: typical.co2g,
    unit: "g CO₂e",
    equiv: co2Equivalences(typical.co2g)[0],
    blurb: "on a global-average grid",
  },
];

export default function LandingPage() {
  const maxCo2 = Math.max(...COMPARE_ITEMS.map((c) => c.co2g));
  const dailyCo2Tonnes = (typical.co2g * DAILY_PROMPTS) / 1_000_000;

  return (
    <div className="relative">
      {/* ============================ HERO ============================ */}
      <section className="relative mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 pt-10 sm:px-6 lg:flex-row lg:gap-4 lg:pt-16">
        <div className="relative z-10 max-w-xl text-center lg:text-left">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-mist">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            The hidden footprint of every prompt
          </div>
          <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            The real cost of AI,
            <br />
            <span className="text-gradient animate-sheen">made visible.</span>
          </h1>
          <p className="mt-6 text-pretty text-base leading-relaxed text-mist sm:text-lg">
            Every time you ask an AI a question, somewhere a data-centre sips water,
            burns electricity and breathes out CO₂. Log in and watch it happen in 3D —
            then track and shrink your own footprint.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <Button href="/signup" variant="primary" size="lg">
              Start exploring
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/calculator" variant="outline" size="lg">
              <Calculator className="h-4 w-4" />
              Try the calculator
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-mist-2 lg:justify-start">
            <span className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-water" /> Water
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-energy" /> Energy
            </span>
            <span className="flex items-center gap-1.5">
              <Cloud className="h-4 w-4 text-carbon" /> Carbon
            </span>
          </div>
        </div>

        <div className="relative h-[46vh] w-full sm:h-[56vh] lg:h-[72vh] lg:flex-1">
          <HeroCanvas />
          <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] text-mist-2">
            drag to spin the planet
          </div>
        </div>
      </section>

      {/* ===================== ONE PROMPT ===================== */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-brand">Chapter 1</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">What one prompt really costs</h2>
          <p className="mt-4 text-mist">
            Here&rsquo;s a single, typical AI chat reply — the kind you send dozens of times a
            day without thinking. These are estimated, order-of-magnitude figures.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {metricCards.map((c, i) => (
            <Reveal key={c.label} delay={i * 0.1}>
              <div className="group relative h-full overflow-hidden rounded-3xl glass p-7">
                <div
                  className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${c.ring} to-transparent blur-2xl`}
                />
                <c.icon className={`h-8 w-8 ${c.tint}`} />
                <div className="mt-6 flex items-baseline gap-2">
                  <AnimatedNumber
                    value={c.value}
                    decimals={c.value < 10 ? 2 : 0}
                    className={`text-5xl font-bold tabular-nums ${c.tint}`}
                  />
                  <span className="text-lg text-mist">{c.unit}</span>
                </div>
                <p className="mt-1 text-sm text-mist-2">{c.blurb}</p>
                <div className="mt-6 flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm text-mist">
                  <span className="text-lg">{c.equiv.icon}</span>
                  <span>
                    ≈ <b className="text-white">{fmt(c.equiv.value)}</b> {c.equiv.unit}{" "}
                    {c.equiv.label}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== SCALE ===================== */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-surface to-ink-2 p-8 sm:p-14">
            <Globe2 className="absolute -right-10 -top-10 h-56 w-56 text-white/[0.03]" />
            <p className="text-sm font-medium uppercase tracking-wider text-water">Chapter 2</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
              One prompt is tiny. Now multiply it by the whole planet.
            </h2>
            <p className="mt-4 max-w-2xl text-mist">
              The world sends on the order of <b className="text-white">a billion</b> AI prompts
              every single day. At that scale, those milligrams of CO₂ add up fast.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <div>
                <div className="text-4xl font-bold tabular-nums text-water sm:text-5xl">
                  <AnimatedNumber
                    value={(typical.waterMl * DAILY_PROMPTS) / 1_000_000_000}
                    decimals={0}
                  />
                  <span className="ml-1 text-xl text-mist">ML</span>
                </div>
                <p className="mt-1 text-sm text-mist-2">
                  megalitres of water / day (≈{" "}
                  {fmt((typical.waterMl * DAILY_PROMPTS) / 1_000_000_000 / 2.5)} Olympic pools)
                </p>
              </div>
              <div>
                <div className="text-4xl font-bold tabular-nums text-energy sm:text-5xl">
                  <AnimatedNumber
                    value={(typical.energyWh * DAILY_PROMPTS) / 1_000_000_000}
                    decimals={0}
                  />
                  <span className="ml-1 text-xl text-mist">GWh</span>
                </div>
                <p className="mt-1 text-sm text-mist-2">
                  gigawatt-hours / day (≈ a small country&rsquo;s draw)
                </p>
              </div>
              <div>
                <div className="text-4xl font-bold tabular-nums text-carbon sm:text-5xl">
                  <AnimatedNumber value={dailyCo2Tonnes} decimals={0} />
                  <span className="ml-1 text-xl text-mist">t</span>
                </div>
                <p className="mt-1 text-sm text-mist-2">tonnes of CO₂e / day</p>
              </div>
            </div>
            <p className="mt-8 text-xs text-mist-2">
              Illustrative: assumes ~1 billion &ldquo;typical&rdquo; prompts/day. Real totals depend
              on model mix and hardware — the point is the order of magnitude.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ===================== COMPARE ===================== */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-carbon">Chapter 3</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">How AI stacks up against daily life</h2>
          <p className="mt-4 text-mist">
            Perspective matters. A prompt is small next to a burger or a car — but it&rsquo;s not
            nothing, and it scales. (CO₂e per item, compressed scale for visibility.)
          </p>
        </Reveal>

        <div className="mt-12 space-y-3">
          {COMPARE_ITEMS.map((item, i) => {
            // toFixed keeps server + client render byte-identical (avoids
            // Math.pow last-digit hydration mismatches).
            const width = Math.max(Math.pow(item.co2g / maxCo2, 0.4) * 100, 4).toFixed(2);
            const isAI = item.label.startsWith("One AI");
            const co2 = formatCo2(item.co2g);
            return (
              <Reveal key={item.label} delay={i * 0.05}>
                <div className="flex items-center gap-4">
                  <div className="flex w-40 shrink-0 items-center gap-2 text-sm">
                    <span className="text-lg">{item.emoji}</span>
                    <span className={isAI ? "font-semibold text-white" : "text-mist"}>
                      {item.label}
                    </span>
                  </div>
                  <div className="relative h-9 flex-1 overflow-hidden rounded-lg bg-white/[0.04]">
                    <div
                      className={`h-full rounded-lg ${
                        isAI
                          ? "bg-gradient-to-r from-brand to-water"
                          : "bg-gradient-to-r from-carbon-2/60 to-carbon/60"
                      }`}
                      style={{ width: `${width}%` }}
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-white/90">
                      {co2.value} {co2.unit}
                    </span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Calculator,
              title: "Interactive calculator",
              body: "Set how you use AI and watch a live 3D world fill with your water, energy and carbon.",
              href: "/calculator",
            },
            {
              icon: LayoutDashboard,
              title: "Personal dashboard",
              body: "Log your usage and track your footprint over time with clean charts, saved to your account.",
              href: "/dashboard",
            },
            {
              icon: Globe2,
              title: "Grounded in research",
              body: "Estimates anchored to public reports, with adjustable assumptions and honest ranges.",
              href: "/signup",
            },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.1}>
              <Link
                href={f.href}
                className="group flex h-full flex-col rounded-3xl glass p-7 transition-all hover:-translate-y-1 hover:border-white/20"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand/20 to-water/20 text-brand">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-mist">{f.body}</p>
                <span className="mt-5 flex items-center gap-1 text-sm text-brand">
                  Explore
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="mx-auto max-w-4xl px-4 py-24 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-brand/15 via-surface to-water/10 p-10 text-center sm:p-16">
            <h2 className="text-3xl font-bold sm:text-4xl">See your own AI footprint</h2>
            <p className="mx-auto mt-4 max-w-lg text-mist">
              Create a free account, run the calculator, and start a dashboard that grows with you.
              No cost, no external tracking — your data stays on this server.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/signup" variant="primary" size="lg">
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="/login" variant="outline" size="lg">
                I already have one
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
