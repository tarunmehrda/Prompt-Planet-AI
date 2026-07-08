"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Biome } from "./Biome";

export interface FootprintSceneProps {
  waterFraction: number;
  energyFraction: number;
  co2Fraction: number;
  coreScale: number;
}

/** Calculator scene: the biome's health = 1 − your footprint. */
export default function FootprintScene({
  waterFraction,
  energyFraction,
  co2Fraction,
  coreScale,
}: FootprintSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 3.2, 6], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <Biome
          compact
          waterFraction={waterFraction}
          energyFraction={energyFraction}
          co2Fraction={co2Fraction}
          coreScale={coreScale}
        />
        <EffectComposer>
          <Bloom intensity={0.5} luminanceThreshold={0.55} luminanceSmoothing={0.9} mipmapBlur />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
