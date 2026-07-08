/* popup.js — reads local stats + settings from storage and renders the popup. */
const $ = (id) => document.getElementById(id);
const DEFAULTS = { endpoint: "http://localhost:3000", regionId: "global", enabled: true };

function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  if (n >= 1) return n.toFixed(1);
  if (n === 0) return "0";
  return n.toFixed(2);
}
// choose a friendly unit for water / energy
function water(ml) {
  if (ml >= 1000) return [fmt(ml / 1000), "L"];
  return [fmt(ml), "mL"];
}
function energy(wh) {
  if (wh >= 1000) return [fmt(wh / 1000), "kWh"];
  return [fmt(wh), "Wh"];
}
function co2(g) {
  if (g >= 1000) return [fmt(g / 1000), "kg"];
  return [fmt(g), "g"];
}

async function render() {
  const s = await chrome.storage.local.get([
    "stats",
    "lifetime",
    "connected",
    "endpoint",
    "regionId",
    "enabled",
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const stats = s.stats && s.stats.date === today ? s.stats : { prompts: 0, energyWh: 0, waterMl: 0, co2g: 0 };
  const life = s.lifetime || { prompts: 0, energyWh: 0, waterMl: 0, co2g: 0 };

  $("promptCount").textContent = `${stats.prompts} prompt${stats.prompts === 1 ? "" : "s"}`;
  const [wv, wu] = water(stats.waterMl);
  const [ev, eu] = energy(stats.energyWh);
  const [cv, cu] = co2(stats.co2g);
  $("water").textContent = wv;
  $("waterU").textContent = wu;
  $("energy").textContent = ev;
  $("energyU").textContent = eu;
  $("co2").textContent = cv;
  $("co2U").textContent = cu;

  $("lifetime").textContent = life.prompts
    ? `All time: ${fmt(life.prompts)} prompts · ${co2(life.co2g)[0]} ${co2(life.co2g)[1]} CO₂e`
    : "No prompts tracked yet — open ChatGPT, Claude, Gemini or Copilot.";

  const connected = s.connected === true;
  const st = $("status");
  st.className = "status " + (connected ? "status--on" : "status--off");
  $("statusText").textContent = connected ? "connected" : "offline";

  $("endpoint").value = s.endpoint || DEFAULTS.endpoint;
  $("region").value = s.regionId || DEFAULTS.regionId;
  $("enabled").checked = s.enabled !== false;
}

$("openDash").addEventListener("click", async () => {
  const s = await chrome.storage.local.get(["endpoint"]);
  chrome.tabs.create({ url: s.endpoint || DEFAULTS.endpoint });
});

$("save").addEventListener("click", async () => {
  let endpoint = ($("endpoint").value || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(endpoint)) endpoint = DEFAULTS.endpoint;
  await chrome.storage.local.set({
    endpoint,
    regionId: $("region").value,
    enabled: $("enabled").checked,
  });
  $("saved").textContent = "Saved ✓";
  setTimeout(() => ($("saved").textContent = ""), 1500);
  render();
});

$("reset").addEventListener("click", async () => {
  await chrome.storage.local.set({ stats: { date: new Date().toISOString().slice(0, 10), prompts: 0, energyWh: 0, waterMl: 0, co2g: 0 } });
  chrome.action.setBadgeText({ text: "" });
  $("saved").textContent = "Today reset ✓";
  setTimeout(() => ($("saved").textContent = ""), 1500);
  render();
});

// Live-update while the popup is open.
chrome.storage.onChanged.addListener(render);
render();
