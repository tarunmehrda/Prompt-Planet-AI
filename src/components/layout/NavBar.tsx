"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Leaf, LayoutDashboard, Calculator, Puzzle, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/extension", label: "Extension", icon: Puzzle },
];

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-water shadow-glow-brand">
            <Leaf className="h-5 w-5 text-ink" strokeWidth={2.4} />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Prompt<span className="text-gradient">Planet</span>
          </span>
        </Link>

        {/* desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                  active ? "bg-white/10 text-white" : "text-mist hover:text-white hover:bg-white/5",
                )}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button href="/extension" variant="primary" size="sm">
            <Puzzle className="h-4 w-4" />
            Get the extension
          </Button>
        </div>

        {/* mobile toggle */}
        <button
          className="grid h-10 w-10 place-items-center rounded-lg text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="mx-4 mb-2 rounded-2xl glass-strong p-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-mist hover:bg-white/5 hover:text-white"
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
