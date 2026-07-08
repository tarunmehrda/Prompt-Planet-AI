import Link from "next/link";
import { Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-water">
              <Leaf className="h-4 w-4 text-ink" strokeWidth={2.4} />
            </span>
            <span className="font-semibold">
              Prompt<span className="text-gradient">Planet</span>
            </span>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-mist-2">
            Figures shown are estimates drawn from public research (Google 2025
            Environmental Report, UC Riverside &ldquo;Making AI Less Thirsty&rdquo;, and
            others). Real impact varies widely by model, data-centre and electricity
            grid. Use these numbers as an order-of-magnitude guide, not exact truth.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2 text-xs text-mist-2 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Prompt Planet · A demo project.</span>
          <div className="flex gap-4">
            <Link href="/calculator" className="hover:text-white">
              Calculator
            </Link>
            <Link href="/dashboard" className="hover:text-white">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
