"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import {
  HEALTHY,
  DEGRADED,
  HEMI_GROUND,
  footprintToHealth,
  makeTreeLayout,
  makeMountains,
  clamp01,
  lerp,
  smoothstep,
} from "@/lib/biome";

const MAX_TREES = 90;
const MAX_LIFE = 46;
const MAX_ASH = 80;
const LAKE_BASE_R = 1.35;

export interface BiomeProps {
  /** Master 0..1 wellness. If omitted, derived from the three fractions. */
  health?: number;
  waterFraction?: number;
  energyFraction?: number;
  co2Fraction?: number;
  /** small-square framing (calculator) vs wide framing (hero) */
  compact?: boolean;
  /** accepted for backward-compat with old FootprintSceneProps; unused */
  coreScale?: number;
}

function usePrefersReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRm(m.matches);
    const handler = () => setRm(m.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);
  return rm;
}

/** Paint a mountain cone's vertex colors: rock below the snow line, snow above. */
function paintMountain(geo: THREE.BufferGeometry, height: number, health: number) {
  const pos = geo.attributes.position;
  const colorAttr = geo.attributes.color as THREE.BufferAttribute;
  const rock = new THREE.Color(DEGRADED.rock).lerp(new THREE.Color(HEALTHY.rock), health);
  const snowCol = new THREE.Color(DEGRADED.snow).lerp(new THREE.Color(HEALTHY.snow), health);
  const snowLine = lerp(1.12, 0.42, health);
  const out = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const yn = (pos.getY(i) + height / 2) / height; // 0 base .. 1 apex
    const snow = smoothstep(snowLine - 0.09, snowLine + 0.09, yn) * health;
    out.copy(rock).lerp(snowCol, snow);
    colorAttr.setXYZ(i, out.r, out.g, out.b);
  }
  colorAttr.needsUpdate = true;
}

export function Biome(props: BiomeProps) {
  const { compact = false } = props;
  const reducedMotion = usePrefersReducedMotion();

  // ---- refs to everything we mutate imperatively ----
  const rootRef = useRef<THREE.Group>(null); // the spinning diorama
  const grassMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const lakeMeshRef = useRef<THREE.Mesh>(null);
  const lakeMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const foliageRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const firefliesRef = useRef<THREE.Points>(null);
  const ashRef = useRef<THREE.Points>(null);
  const hazeMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const sunMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);

  // ---- static, memoised data ----
  const trees = useMemo(() => makeTreeLayout(MAX_TREES), []);
  const mountains = useMemo(() => makeMountains(), []);
  const mountainGeos = useMemo(
    () =>
      mountains.map((m) => {
        const g = new THREE.ConeGeometry(m.radius, m.height, 5, 1);
        const colors = new Float32Array(g.attributes.position.count * 3);
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        paintMountain(g, m.height, 0.85);
        return g;
      }),
    [mountains],
  );

  const foliageGeo = useMemo(() => new THREE.ConeGeometry(0.34, 0.95, 7), []);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.05, 0.075, 0.5, 6), []);

  const fireflyGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(MAX_LIFE * 3);
    for (let i = 0; i < MAX_LIFE; i++) {
      const a = (i / MAX_LIFE) * Math.PI * 2;
      const r = 0.8 + (i % 5) * 0.32;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = 0.4 + (i % 7) * 0.22;
      p[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);

  const ashGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(MAX_ASH * 3);
    for (let i = 0; i < MAX_ASH; i++) {
      p[i * 3] = (((i * 71) % 100) / 100 - 0.5) * 6;
      p[i * 3 + 1] = ((i * 37) % 100) / 100 * 4;
      p[i * 3 + 2] = (((i * 53) % 100) / 100 - 0.5) * 6;
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);

  const skyUniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(HEALTHY.skyTop) },
      uHorizon: { value: new THREE.Color(HEALTHY.skyHorizon) },
    }),
    [],
  );

  // ---- smoothed environment state (mutated in useFrame, never React state) ----
  const env = useRef({ health: 0.85, water: 0.15, energy: 0.15, co2: 0.15, painted: -1 });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  // reusable color endpoints
  const cols = useMemo(
    () => ({
      grassA: new THREE.Color(DEGRADED.grass),
      grassB: new THREE.Color(HEALTHY.grass),
      waterA: new THREE.Color(DEGRADED.water),
      waterB: new THREE.Color(HEALTHY.water),
      folA: new THREE.Color(DEGRADED.foliage),
      folB: new THREE.Color(HEALTHY.foliage),
      skyTopA: new THREE.Color(DEGRADED.skyTop),
      skyTopB: new THREE.Color(HEALTHY.skyTop),
      skyHorA: new THREE.Color(DEGRADED.skyHorizon),
      skyHorB: new THREE.Color(HEALTHY.skyHorizon),
      sunA: new THREE.Color(DEGRADED.sun),
      sunB: new THREE.Color(HEALTHY.sun),
      hemiA: new THREE.Color(DEGRADED.hemiSky),
      hemiB: new THREE.Color(HEALTHY.hemiSky),
      hazeA: new THREE.Color(HEALTHY.haze),
      hazeB: new THREE.Color(DEGRADED.haze),
      fireA: new THREE.Color(DEGRADED.firefly),
      fireB: new THREE.Color(HEALTHY.firefly),
    }),
    [],
  );

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = state.clock.elapsedTime;
    const e = env.current;

    // 1) targets
    const wT = clamp01(props.waterFraction ?? (props.health != null ? 1 - props.health : 0.15));
    const eT = clamp01(props.energyFraction ?? (props.health != null ? 1 - props.health : 0.15));
    const cT = clamp01(props.co2Fraction ?? (props.health != null ? 1 - props.health : 0.15));
    const hT = props.health != null ? clamp01(props.health) : footprintToHealth(wT, eT, cT);

    // 2) exponential smoothing
    const k = Math.min(1, dt * 2.2);
    e.health += (hT - e.health) * k;
    e.water += (wT - e.water) * k;
    e.energy += (eT - e.energy) * k;
    e.co2 += (cT - e.co2) * k;

    const health = e.health;
    const load = 1 - health;
    const skyHealth = 1 - e.energy;
    const degradeFx = smoothstep(0.5, 0.0, health);

    // 3) grass
    if (grassMatRef.current) {
      grassMatRef.current.color.copy(cols.grassA).lerp(cols.grassB, health);
    }

    // 4) lake — radius by water, colour + roughness by water
    const lakeR = lerp(0.55, 1.0, 1 - e.water);
    if (lakeMeshRef.current) lakeMeshRef.current.scale.setScalar(lakeR);
    if (lakeMatRef.current) {
      lakeMatRef.current.color.copy(cols.waterA).lerp(cols.waterB, 1 - e.water);
      lakeMatRef.current.roughness = lerp(0.92, 0.08, 1 - e.water);
    }

    // 5) forest — count, size, browning, dead spikes
    const treeCount = Math.round(lerp(compact ? 16 : 24, compact ? 58 : MAX_TREES, health));
    const bareFraction = smoothstep(0.42, 0.05, health);
    tmpColor.copy(cols.folA).lerp(cols.folB, health);
    const windAmp = reducedMotion ? 0 : 0.05 * health;
    if (foliageRef.current && trunkRef.current) {
      for (let i = 0; i < treeCount; i++) {
        const tr = trees[i];
        const scale = lerp(0.55, 1.0, health) * tr.sizeJitter;
        const sway = windAmp * Math.sin(tr.swayPhase + t * 1.3);
        // trunk
        dummy.position.set(tr.x, 0.25 * scale, tr.z);
        dummy.rotation.set(0, tr.rot, sway);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        trunkRef.current.setMatrixAt(i, dummy.matrix);
        // foliage (hidden for dead/bare trees)
        const bare = i / treeCount < bareFraction;
        if (bare) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
        } else {
          dummy.position.set(tr.x, 0.95 * scale, tr.z);
          dummy.rotation.set(0, tr.rot, sway);
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();
        }
        foliageRef.current.setMatrixAt(i, dummy.matrix);
        foliageRef.current.setColorAt(i, tmpColor);
      }
      trunkRef.current.count = treeCount;
      foliageRef.current.count = treeCount;
      trunkRef.current.instanceMatrix.needsUpdate = true;
      foliageRef.current.instanceMatrix.needsUpdate = true;
      if (foliageRef.current.instanceColor) foliageRef.current.instanceColor.needsUpdate = true;
    }

    // 6) mountains — repaint snow/rock only when health moves enough
    if (Math.abs(health - e.painted) > 0.012) {
      mountainGeos.forEach((g, idx) => paintMountain(g, mountains[idx].height, health));
      e.painted = health;
    }

    // 7) sky + sun + hemisphere
    if (skyMatRef.current) {
      const u = skyMatRef.current.uniforms;
      (u.uTop.value as THREE.Color).copy(cols.skyTopA).lerp(cols.skyTopB, skyHealth);
      (u.uHorizon.value as THREE.Color).copy(cols.skyHorA).lerp(cols.skyHorB, skyHealth);
    }
    if (sunMatRef.current) sunMatRef.current.color.copy(cols.sunA).lerp(cols.sunB, skyHealth);
    if (sunLightRef.current) {
      sunLightRef.current.color.copy(cols.sunA).lerp(cols.sunB, skyHealth);
      sunLightRef.current.intensity = lerp(0.9, 1.7, health);
    }
    if (hemiRef.current) {
      hemiRef.current.color.copy(cols.hemiA).lerp(cols.hemiB, health);
    }

    // 8) haze bubble (smog)
    if (hazeMatRef.current) {
      hazeMatRef.current.color.copy(cols.hazeA).lerp(cols.hazeB, load);
      hazeMatRef.current.opacity = 0.05 + load * 0.3;
    }

    // 9) fireflies (healthy) vs ash (degraded)
    if (firefliesRef.current) {
      const m = firefliesRef.current.material as THREE.PointsMaterial;
      m.opacity = health * 0.9;
      m.size = lerp(0.09, 0.05, health);
      m.color.copy(cols.fireA).lerp(cols.fireB, health);
      if (!reducedMotion) {
        firefliesRef.current.position.y = Math.sin(t * 0.8) * 0.06;
        firefliesRef.current.rotation.y = t * 0.15;
      }
    }
    if (ashRef.current) {
      const m = ashRef.current.material as THREE.PointsMaterial;
      m.opacity = degradeFx * 0.6;
      if (!reducedMotion && degradeFx > 0.01) {
        const p = ashRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < MAX_ASH; i++) {
          let y = p.getY(i) - dt * (0.25 + (i % 5) * 0.05);
          if (y < 0) y += 4;
          p.setY(i, y);
        }
        p.needsUpdate = true;
      }
    }

    // 10) diorama motion
    if (rootRef.current) {
      if (!reducedMotion) {
        rootRef.current.rotation.y += dt * 0.08;
        rootRef.current.position.y = Math.sin(t * 0.9) * 0.05;
      }
    }

    // 11) camera parallax toward pointer (elevated 3/4 view)
    const cam = state.camera;
    const baseZ = compact ? 6.0 : 7.0;
    const baseY = compact ? 3.2 : 3.6;
    if (reducedMotion) {
      cam.position.set(0, baseY, baseZ);
    } else {
      cam.position.x += (state.pointer.x * 0.9 - cam.position.x) * 0.04;
      cam.position.y += (baseY + state.pointer.y * 0.5 - cam.position.y) * 0.04;
      cam.position.z += (baseZ - cam.position.z) * 0.04;
    }
    cam.lookAt(0, 0.35, 0);

    if (typeof window !== "undefined") {
      (window as unknown as { __biomeHealth?: number }).__biomeHealth = health;
    }
  });

  return (
    <group>
      {/* lights (world) */}
      <ambientLight intensity={0.4} />
      <hemisphereLight ref={hemiRef} args={[HEALTHY.hemiSky, HEMI_GROUND, 0.7]} />
      <directionalLight ref={sunLightRef} position={[7, 9, -5]} intensity={1.5} color={HEALTHY.sun} />

      {/* sky dome */}
      <mesh scale={40}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          ref={skyMatRef}
          side={THREE.BackSide}
          depthWrite={false}
          uniforms={skyUniforms}
          vertexShader={`varying float vH;
            void main(){ vH = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`varying float vH; uniform vec3 uTop; uniform vec3 uHorizon;
            void main(){ float t = smoothstep(-0.15, 0.55, vH); gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0); }`}
        />
      </mesh>

      {/* sun glow */}
      <mesh position={[9, 8, -14]}>
        <sphereGeometry args={[1.5, 24, 24]} />
        <meshBasicMaterial ref={sunMatRef} color={HEALTHY.sun} toneMapped={false} />
      </mesh>

      {/* spinning diorama */}
      <group ref={rootRef}>
        {/* island top (grass) */}
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[3, 2.85, 0.5, 48]} />
          <meshStandardMaterial ref={grassMatRef} color={HEALTHY.grass} roughness={0.95} flatShading />
        </mesh>
        {/* island underside (rock cone) */}
        <mesh position={[0, -1.85, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[2.85, 2.7, 16]} />
          <meshStandardMaterial color="#5b4d3a" roughness={1} flatShading />
        </mesh>

        {/* exposed lakebed (mud) */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.42, 48]} />
          <meshStandardMaterial color={DEGRADED.mud} roughness={1} />
        </mesh>
        {/* lake (planar reflections of sky + mountains) */}
        <mesh ref={lakeMeshRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[LAKE_BASE_R, 64]} />
          <MeshReflectorMaterial
            ref={lakeMatRef as never}
            resolution={compact ? 256 : 512}
            mixBlur={1}
            mixStrength={3}
            blur={[200, 60]}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            metalness={0.2}
            roughness={0.25}
            color={HEALTHY.water}
          />
        </mesh>

        {/* mountains */}
        {mountains.map((m, i) => (
          <mesh key={i} geometry={mountainGeos[i]} position={[m.x, m.height / 2, m.z]} rotation={[0, m.rot, 0]}>
            <meshStandardMaterial vertexColors flatShading roughness={0.9} />
          </mesh>
        ))}

        {/* forest — instanced trunks + foliage */}
        <instancedMesh ref={trunkRef} args={[trunkGeo, undefined, MAX_TREES]} frustumCulled={false}>
          <meshStandardMaterial color={HEALTHY.trunk} roughness={1} flatShading />
        </instancedMesh>
        <instancedMesh ref={foliageRef} args={[foliageGeo, undefined, MAX_TREES]} frustumCulled={false}>
          <meshStandardMaterial color="#ffffff" roughness={0.85} flatShading />
        </instancedMesh>

        {/* life */}
        <points ref={firefliesRef} geometry={fireflyGeo} position={[0, 0.4, 0]}>
          <pointsMaterial
            size={0.07}
            color={HEALTHY.firefly}
            transparent
            opacity={0.8}
            depthWrite={false}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </points>
        <points ref={ashRef} geometry={ashGeo} position={[0, 0, 0]}>
          <pointsMaterial
            size={0.045}
            color="#9a9488"
            transparent
            opacity={0}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      </group>

      {/* haze / smog bubble (world) */}
      <mesh scale={9}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          ref={hazeMatRef}
          color={DEGRADED.haze}
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
