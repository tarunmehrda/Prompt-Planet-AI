/**
 * biome.ts — pure math + palette for the reactive nature diorama.
 * No `three`, no React → SSR-safe and easy to reason about. The Biome
 * component turns these plain numbers/hex strings into materials.
 *
 * Concept: a floating snow-globe valley whose "health" (0 = dead, 1 = lush)
 * is driven by the AI footprint. Water drives the lake, energy the sky/smog,
 * CO₂ the forest. health = 1 − average of the three 0..1 load fractions.
 */
import { mulberry32, clamp01, lerp, smoothstep } from "./noise";

export { clamp01, lerp, smoothstep };

/** Healthy (lush) palette — hex strings, resolved to THREE.Color in the scene. */
export const HEALTHY = {
  grass: "#4f8f3a",
  rock: "#7d7566",
  snow: "#f4f8ff",
  water: "#2f7fb5",
  skyTop: "#3f8fe0",
  skyHorizon: "#bfe3ff",
  sun: "#fff4d6",
  foliage: "#2f6b34",
  trunk: "#3a2a1c",
  firefly: "#fff3b0",
  hemiSky: "#cfe8ff",
  haze: "#cfe0ef",
} as const;

/** Degraded (dying) palette. */
export const DEGRADED = {
  grass: "#8a7a44",
  mud: "#5c4a30",
  rock: "#6b6458",
  snow: "#d9d2c2",
  water: "#5c5236",
  skyTop: "#b98f52",
  skyHorizon: "#e0cfa2",
  sun: "#e8a45a",
  foliage: "#6b4f2a",
  trunk: "#33261a",
  firefly: "#9a9488",
  hemiSky: "#c9b18a",
  haze: "#b9a889",
} as const;

export const HEMI_GROUND = "#2a241d";

/** Convert the three load fractions (0 = none, 1 = heavy) into 0..1 health. */
export function footprintToHealth(
  waterFraction: number,
  energyFraction: number,
  co2Fraction: number,
): number {
  const load = (clamp01(waterFraction) + clamp01(energyFraction) + clamp01(co2Fraction)) / 3;
  return clamp01(1 - load);
}

export interface TreeTransform {
  x: number;
  z: number;
  /** base rotation about Y */
  rot: number;
  /** deterministic per-tree size jitter, ~0.8..1.2 */
  sizeJitter: number;
  /** phase offset so wind sway is not synchronised */
  swayPhase: number;
}

/**
 * Deterministic forest layout: `max` conifers scattered in the grassy ring
 * between the lakeshore and the back mountains. Generated once; the scene
 * shows the first N by index (N shrinks as the forest dies).
 */
export function makeTreeLayout(max: number, seed = 1337): TreeTransform[] {
  const rng = mulberry32(seed);
  const trees: TreeTransform[] = [];
  let guard = 0;
  while (trees.length < max && guard < max * 40) {
    guard++;
    const angle = rng() * Math.PI * 2;
    const radius = 1.55 + rng() * 1.15; // annulus 1.55..2.7 (lake ≤ ~1.35, island ≈ 3)
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    // Keep the back edge clear for the mountain ridge.
    if (z < -1.5 && Math.abs(x) < 2.2) continue;
    trees.push({
      x,
      z,
      rot: rng() * Math.PI * 2,
      sizeJitter: 0.8 + rng() * 0.4,
      swayPhase: rng() * Math.PI * 2,
    });
  }
  return trees;
}

export interface MountainTransform {
  x: number;
  z: number;
  radius: number;
  height: number;
  rot: number;
}

/** Fixed low-poly peaks arranged along the back arc of the island. */
export function makeMountains(): MountainTransform[] {
  return [
    { x: -1.9, z: -2.0, radius: 1.0, height: 2.2, rot: 0.4 },
    { x: -0.4, z: -2.5, radius: 1.25, height: 3.1, rot: 1.1 },
    { x: 1.3, z: -2.2, radius: 1.1, height: 2.6, rot: 2.0 },
    { x: 2.4, z: -1.4, radius: 0.8, height: 1.8, rot: 0.7 },
  ];
}
