import Link from "next/link";
import {
  Puzzle,
  Download,
  ShieldCheck,
  Zap,
  MousePointerClick,
  FolderOpen,
  ToggleRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Prompt Planet — Browser extension",
  description:
    "Install the Prompt Planet extension to automatically track the water, energy and CO₂ of your AI chats.",
};

const SITES = [
  { emoji: "🤖", name: "ChatGPT" },
  { emoji: "🧠", name: "Claude" },
  { emoji: "✨", name: "Gemini" },
  { emoji: "🧑‍✈️", name: "Copilot" },
  { emoji: "🔎", name: "Perplexity" },
  { emoji: "🐋", name: "DeepSeek" },
  { emoji: "🎭", name: "Poe" },
  { emoji: "🤗", name: "HuggingChat" },
  { emoji: "💬", name: "…and more" },
];

const STEPS = [
  {
    icon: Download,
    title: "Get the extension folder",
    body: "Download the ZIP below and unzip it, or grab the /extension folder from the project. You'll point the browser at that folder.",
  },
  {
    icon: FolderOpen,
    title: "Open your browser's extensions page",
    body: "In Chrome or Edge, go to chrome://extensions (or edge://extensions), then turn on “Developer mode” in the top-right corner.",
  },
  {
    icon: MousePointerClick,
    title: "Load unpacked",
    body: "Click “Load unpacked” and select the unzipped extension folder. Prompt Planet appears in your toolbar. 🌱",
  },
  {
    icon: ToggleRight,
    title: "Chat as usual",
    body: "Open ChatGPT, Claude, Gemini or Copilot and send a message. Each exchange is measured and shows up on your dashboard automatically.",
  },
];

export default function ExtensionPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* hero */}
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand to-water shadow-glow-brand">
          <Puzzle className="h-8 w-8 text-ink" strokeWidth={2.2} />
        </div>
        <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
          The Prompt Planet <span className="text-gradient">extension</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-mist">
          A lightweight browser add-on that watches your AI conversations and quietly measures the
          water, energy and carbon each one costs — then streams the estimates straight to your
          dashboard. No copy-paste, no accounts.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button href="/prompt-planet-extension.zip" variant="primary" size="lg">
            <Download className="h-4 w-4" />
            Download extension (.zip)
          </Button>
          <Button href="/" variant="outline" size="lg">
            Back to dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* supported sites */}
      <div className="mt-12 rounded-3xl glass p-6">
        <h2 className="text-center text-sm font-medium uppercase tracking-wider text-mist-2">
          Works automatically on
        </h2>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {SITES.map((s) => (
            <span
              key={s.name}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm"
            >
              <span className="text-base">{s.emoji}</span>
              {s.name}
            </span>
          ))}
        </div>
      </div>

      {/* steps */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold">Install in four steps</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-3xl glass p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-brand">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-mist-2">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-mist">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* privacy + how */}
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-brand/20 bg-gradient-to-br from-brand/10 to-transparent p-6">
          <ShieldCheck className="h-6 w-6 text-brand" />
          <h3 className="mt-4 text-lg font-semibold">Private by design</h3>
          <p className="mt-2 text-sm text-mist">
            The extension only counts <b className="text-white">how many characters</b> your prompt
            and the reply contain — it never reads, stores or sends the actual text of your
            conversations. Everything lives on your machine.
          </p>
        </div>
        <div className="rounded-3xl glass p-6">
          <Zap className="h-6 w-6 text-energy" />
          <h3 className="mt-4 text-lg font-semibold">How the estimate works</h3>
          <p className="mt-2 text-sm text-mist">
            Each exchange is classified by size into a prompt type, then mapped to a water/energy
            baseline and multiplied by your chosen electricity grid for carbon. Change the grid in
            the extension popup&rsquo;s settings. Figures are order-of-magnitude guides.
          </p>
        </div>
      </div>

      <p className="mt-10 text-center text-sm text-mist-2">
        By default the extension talks to{" "}
        <code className="rounded bg-white/5 px-1.5 py-0.5 text-mist">http://localhost:3000</code>.
        Running Prompt Planet elsewhere? Set the dashboard URL in the popup&rsquo;s settings.{" "}
        <Link href="/calculator" className="text-brand hover:underline">
          Prefer to estimate manually?
        </Link>
      </p>
    </div>
  );
}
