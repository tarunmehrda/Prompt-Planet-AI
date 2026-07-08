"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "water";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "transition-all duration-200 focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink " +
  "disabled:opacity-50 disabled:pointer-events-none select-none";

const variants: Record<Variant, string> = {
  primary:
    "text-ink font-semibold bg-gradient-to-r from-brand to-water shadow-[0_8px_30px_-8px_rgba(52,211,153,0.7)] " +
    "hover:shadow-[0_10px_40px_-6px_rgba(52,211,153,0.85)] hover:-translate-y-0.5",
  water:
    "text-ink font-semibold bg-gradient-to-r from-water-2 to-water shadow-[0_8px_30px_-8px_rgba(34,211,238,0.7)] " +
    "hover:-translate-y-0.5",
  outline:
    "text-white border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25",
  ghost: "text-mist hover:text-white hover:bg-white/5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type ButtonAsLink = CommonProps & { href: string };

export const Button = forwardRef<HTMLButtonElement, ButtonAsButton | ButtonAsLink>(
  function Button({ variant = "primary", size = "md", className, children, ...props }, ref) {
    const classes = cn(base, variants[variant], sizes[size], className);
    if ("href" in props && props.href) {
      return (
        <Link href={props.href} className={classes}>
          {children}
        </Link>
      );
    }
    return (
      <button ref={ref} className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    );
  },
);
