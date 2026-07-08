/**
 * footprint.js — the estimation model, shared by the extension.
 * Mirrors the website's src/lib/impact.ts so the popup and dashboard agree.
 * Loaded into the background service worker via importScripts().
 */
(function (root) {
  // Per-prompt baselines: energy in watt-hours, water in millilitres.
  const PROMPT_TYPES = {
    short: { energyWh: 0.3, waterMl: 1 },
    chat: { energyWh: 3, waterMl: 25 },
    long: { energyWh: 20, waterMl: 150 },
    image: { energyWh: 5, waterMl: 40 },
  };

  // Grid carbon intensity presets (g CO₂e per kWh).
  const GRID = {
    clean: 40,
    eu: 250,
    us: 380,
    global: 480,
    india: 630,
    coal: 820,
  };

  function classify(promptChars, replyChars, isImage) {
    if (isImage) return "image";
    const p = Math.max(0, promptChars || 0);
    const r = Math.max(0, replyChars || 0);
    const total = p + r;
    if (r <= 240 && total <= 600) return "short";
    if (r <= 1600 && total <= 4000) return "chat";
    return "long";
  }

  function estimate(promptChars, replyChars, isImage, regionId) {
    const type = classify(promptChars, replyChars, isImage);
    const t = PROMPT_TYPES[type];
    const g = GRID[regionId] != null ? GRID[regionId] : GRID.global;
    return {
      type,
      energyWh: t.energyWh,
      waterMl: t.waterMl,
      co2g: (t.energyWh / 1000) * g,
    };
  }

  root.PP = { PROMPT_TYPES, GRID, classify, estimate };
})(typeof self !== "undefined" ? self : this);
