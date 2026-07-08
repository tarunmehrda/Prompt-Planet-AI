"use client";

import dynamic from "next/dynamic";
import type { FootprintSceneProps } from "./FootprintScene";

function SceneLoader() {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-water" />
        <span className="text-xs text-mist-2">Rendering 3D scene…</span>
      </div>
    </div>
  );
}

/** Hero "water planet" — WebGL, client-only. */
export const HeroCanvas = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <SceneLoader />,
});

const FootprintSceneDynamic = dynamic(() => import("./FootprintScene"), {
  ssr: false,
  loading: () => <SceneLoader />,
});

/** Calculator footprint orb — reacts to the current values. */
export function FootprintCanvas(props: FootprintSceneProps) {
  return <FootprintSceneDynamic {...props} />;
}
