/**
 * content.js — runs on supported AI chat sites.
 * Measures how big each prompt and its reply are (character counts only —
 * never the text itself), then hands the sizes to the background worker,
 * which estimates the footprint and forwards it to the Prompt Planet API.
 *
 * The DOM of every assistant differs and changes often, so this uses
 * per-site selectors with a site-agnostic fallback (observing how much text
 * appeared after you sent a message).
 */
(function () {
  if (window.__promptPlanetLoaded) return;
  window.__promptPlanetLoaded = true;

  // ----- which assistant are we on? -----
  function detectSource(host) {
    host = host || "";
    if (host.includes("chatgpt.com") || host.includes("openai.com")) return "chatgpt";
    if (host.includes("claude.ai")) return "claude";
    if (host.includes("gemini.google.com")) return "gemini";
    if (host.includes("copilot.microsoft.com")) return "copilot";
    if (host.includes("perplexity.ai")) return "perplexity";
    if (host.includes("poe.com")) return "poe";
    if (host.includes("deepseek.com")) return "deepseek";
    if (host.includes("meta.ai")) return "meta";
    if (host.includes("grok.com") || host.includes("x.com")) return "grok";
    if (host.includes("mistral.ai")) return "mistral";
    if (host.includes("huggingface.co")) return "huggingface";
    return "other";
  }

  const SOURCE = detectSource(location.hostname);

  // Per-site selectors. First match wins; generic fallback used otherwise.
  const CONFIG = {
    chatgpt: {
      composer: ["#prompt-textarea", 'textarea[data-testid="prompt-textarea"]'],
      assistant: ['[data-message-author-role="assistant"]'],
    },
    claude: {
      composer: ['div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"]'],
      assistant: ['[data-testid="assistant-message"]', ".font-claude-message", ".font-claude-response"],
    },
    gemini: {
      composer: ['.ql-editor[contenteditable="true"]', "rich-textarea textarea"],
      assistant: ["message-content", ".model-response-text", "[data-response-index]"],
    },
    copilot: {
      composer: ["textarea", 'div[contenteditable="true"]'],
      assistant: ['[data-content="ai-message"]', '[data-author="bot"]', ".ai-message"],
    },
    _generic: {
      composer: ['textarea', 'div[contenteditable="true"]'],
      assistant: [],
    },
  };
  const cfg = CONFIG[SOURCE] || CONFIG._generic;
  const composerSelectors = (cfg.composer || []).concat(CONFIG._generic.composer);
  const assistantSelectors = cfg.assistant || [];

  const isVisible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 12 && el.offsetParent !== null;
  };

  // Pick the largest visible composer element.
  function getComposer() {
    let best = null,
      bestArea = 0;
    for (const sel of composerSelectors) {
      let nodes;
      try {
        nodes = document.querySelectorAll(sel);
      } catch {
        continue;
      }
      for (const el of nodes) {
        if (!isVisible(el)) continue;
        const r = el.getBoundingClientRect();
        const area = r.width * r.height;
        if (area > bestArea) {
          best = el;
          bestArea = area;
        }
      }
    }
    return best;
  }

  const textOf = (el) => {
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value || "";
    return el.innerText || el.textContent || "";
  };

  function lastAssistantNode() {
    for (const sel of assistantSelectors) {
      let nodes;
      try {
        nodes = document.querySelectorAll(sel);
      } catch {
        continue;
      }
      if (nodes.length) return nodes[nodes.length - 1];
    }
    return null;
  }

  function assistantHasImage(node) {
    if (!node) return false;
    const imgs = node.querySelectorAll ? node.querySelectorAll("img") : [];
    for (const img of imgs) {
      const w = img.naturalWidth || img.width || 0;
      const src = img.src || "";
      if (w >= 200 && (src.includes("oaiusercontent") || src.includes("blob:") || w >= 256)) return true;
    }
    return false;
  }

  // ----- reply watcher -----
  let capturing = false;

  function watchReply(promptChars) {
    if (capturing) return;
    capturing = true;

    const bodyStart = (document.body.innerText || "").length;
    const before = lastAssistantNode();
    const beforeLen = before ? textOf(before).length : 0;

    let lastLen = -1;
    let stable = 0;
    let ticks = 0;
    const MAX_TICKS = 150; // ~90s at 600ms
    let sawImage = false;

    const timer = setInterval(() => {
      ticks++;
      const node = lastAssistantNode();
      let len;
      if (node) {
        // If a brand-new assistant node appeared, count its whole length.
        const raw = textOf(node).length;
        len = node === before ? Math.max(0, raw - beforeLen) : raw;
      } else {
        // Site-agnostic fallback: how much did the page's text grow?
        const grew = (document.body.innerText || "").length - bodyStart;
        len = Math.max(0, grew - promptChars);
      }
      if (assistantHasImage(node)) sawImage = true;

      if (len === lastLen && len > 0) {
        stable++;
      } else {
        stable = 0;
      }
      lastLen = len;

      // Settle when the reply stopped growing (~1.8s) or we time out.
      if ((stable >= 3 && len > 0) || ticks >= MAX_TICKS) {
        clearInterval(timer);
        capturing = false;
        let replyChars = len;
        if (!sawImage && replyChars < 1) replyChars = 400; // couldn't read → assume a chat-sized reply
        send(promptChars, replyChars, sawImage);
      }
    }, 600);
  }

  function send(promptChars, replyChars, isImage) {
    try {
      chrome.runtime.sendMessage({
        type: "pp_capture",
        source: SOURCE,
        promptChars: Math.round(promptChars) || 0,
        replyChars: Math.round(replyChars) || 0,
        isImage: !!isImage,
        url: location.href,
      });
    } catch {
      /* extension context may be gone on navigation — ignore */
    }
  }

  // ----- submit detection -----
  let lastSubmit = 0;
  function onSubmit() {
    const now = Date.now();
    if (now - lastSubmit < 1200) return; // de-dupe Enter + button click
    const composer = getComposer();
    const promptChars = textOf(composer).trim().length;
    if (promptChars < 1) return;
    lastSubmit = now;
    watchReply(promptChars);
  }

  // Enter to send (not Shift+Enter, not while composing with an IME).
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
      const composer = getComposer();
      if (!composer) return;
      const t = e.target;
      if (t === composer || (composer.contains && composer.contains(t))) onSubmit();
    },
    true,
  );

  // Click on a send button.
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target.closest ? e.target.closest("button, [role='button'], [type='submit']") : null;
      if (!el) return;
      const label = ((el.getAttribute("aria-label") || "") + " " + (el.getAttribute("data-testid") || "")).toLowerCase();
      const looksSend = /send|submit|ask|prompt/.test(label) || el.type === "submit";
      if (looksSend) onSubmit();
    },
    true,
  );

  // Let the background know a supported tab is active.
  try {
    chrome.runtime.sendMessage({ type: "pp_hello", source: SOURCE });
  } catch {
    /* ignore */
  }
})();
