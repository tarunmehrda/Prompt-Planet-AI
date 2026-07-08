"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

interface Props {
  value: number;
  /** decimals to render */
  decimals?: number;
  duration?: number;
  className?: string;
  /** optional compact formatter that overrides decimals rendering */
  format?: (n: number) => string;
}

/** Smoothly counts from the previous value to the new one. */
export function AnimatedNumber({ value, decimals = 0, duration = 0.9, className, format }: Props) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration]);

  const text = format
    ? format(display)
    : display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return <span className={className}>{text}</span>;
}
