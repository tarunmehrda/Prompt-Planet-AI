/**
 * background.js — the extension's service worker.
 * Receives captured sizes from content scripts, estimates the footprint,
 * posts it to the Prompt Planet API, and keeps a local tally for the popup
 * and the toolbar badge.
 */
importScripts("footprint.js");

const DEFAULTS = {
  endpoint: "http://localhost:3000",
  regionId: "global",
  enabled: true,
};

async function getSettings() {
  const s = await chrome.storage.local.get(["endpoint", "regionId", "enabled"]);
  return {
    endpoint: s.endpoint || DEFAULTS.endpoint,
    regionId: s.regionId || DEFAULTS.regionId,
    enabled: s.enabled !== false,
  };
}

const todayStr = () => new Date().toISOString().slice(0, 10);

/** Merge a capture into the running local stats (today + lifetime). */
async function recordLocal(est) {
  const s = await chrome.storage.local.get(["stats"]);
  const day = todayStr();
  let stats = s.stats;
  if (!stats || stats.date !== day) {
    stats = { date: day, prompts: 0, energyWh: 0, waterMl: 0, co2g: 0 };
  }
  stats.prompts += 1;
  stats.energyWh += est.energyWh;
  stats.waterMl += est.waterMl;
  stats.co2g += est.co2g;

  const life = (await chrome.storage.local.get(["lifetime"])).lifetime || {
    prompts: 0,
    energyWh: 0,
    waterMl: 0,
    co2g: 0,
  };
  life.prompts += 1;
  life.energyWh += est.energyWh;
  life.waterMl += est.waterMl;
  life.co2g += est.co2g;

  await chrome.storage.local.set({ stats, lifetime: life });
  updateBadge(stats.prompts);
  return stats;
}

function updateBadge(count) {
  const text = count > 999 ? "999+" : String(count || 0);
  chrome.action.setBadgeText({ text: count ? text : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#2ee6a6" });
}

async function postToApi(payload) {
  const { endpoint } = await getSettings();
  const url = endpoint.replace(/\/+$/, "") + "/api/track";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function handleCapture(msg) {
  const { regionId, enabled } = await getSettings();
  if (!enabled) return;

  const est = self.PP.estimate(msg.promptChars, msg.replyChars, msg.isImage, regionId);

  // Always record locally so the popup works even if the site/app is offline.
  await recordLocal(est);

  const payload = {
    source: msg.source || "other",
    promptChars: msg.promptChars || 0,
    replyChars: msg.replyChars || 0,
    isImage: !!msg.isImage,
    regionId,
  };

  try {
    await postToApi(payload);
    await chrome.storage.local.set({ connected: true, lastSync: Date.now(), lastError: "" });
  } catch (e) {
    await chrome.storage.local.set({ connected: false, lastError: String(e && e.message ? e.message : e) });
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "pp_capture") {
    handleCapture(msg).finally(() => sendResponse({ ok: true }));
    return true; // async response
  }
  if (msg.type === "pp_hello") {
    // no-op: presence ping
    sendResponse({ ok: true });
    return false;
  }
});

// Restore the badge when the worker wakes up.
chrome.runtime.onStartup.addListener(async () => {
  const s = await chrome.storage.local.get(["stats"]);
  if (s.stats && s.stats.date === todayStr()) updateBadge(s.stats.prompts);
  else updateBadge(0);
});

chrome.runtime.onInstalled.addListener(async () => {
  const cur = await chrome.storage.local.get(["endpoint"]);
  if (!cur.endpoint) await chrome.storage.local.set(DEFAULTS);
  updateBadge(0);
});
