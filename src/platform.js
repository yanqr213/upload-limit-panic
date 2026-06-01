(function () {
  const state = {
    ready: false,
    provider: "local",
    sdk: null,
  };

  async function init() {
    if (window.CrazyGames?.SDK) {
      state.provider = "crazygames";
      state.sdk = window.CrazyGames.SDK;
      try {
        await state.sdk.init();
        await state.sdk.game?.loadingStop?.();
        state.ready = true;
      } catch (error) {
        console.warn("Platform SDK init failed", error);
      }
    }
    return state;
  }

  async function requestAd(kind, callbacks = {}) {
    if (!state.ready || !state.sdk?.ad?.requestAd) {
      callbacks.onUnavailable?.();
      return false;
    }
    try {
      await state.sdk.ad.requestAd(kind, {
        adStarted: callbacks.onStart || (() => {}),
        adFinished: callbacks.onFinish || (() => {}),
        adError: callbacks.onError || (() => {}),
      });
      return true;
    } catch (error) {
      console.warn("Platform ad failed", error);
      callbacks.onError?.(error);
      return false;
    }
  }

  function track(eventName, payload = {}) {
    const event = {
      eventName,
      payload,
      at: new Date().toISOString(),
      provider: state.provider,
    };
    try {
      const key = "upload-limit-panic-events";
      const events = JSON.parse(localStorage.getItem(key) || "[]");
      events.push(event);
      localStorage.setItem(key, JSON.stringify(events.slice(-50)));
    } catch {
      // Local analytics are best-effort for platform review builds.
    }
    sendRemoteEvent(eventName, payload);
    window.dispatchEvent(new CustomEvent("ulp:event", { detail: event }));
  }

  function sendRemoteEvent(eventName, payload = {}) {
    const body = JSON.stringify({
      name: eventName,
      source: trafficSource(),
      path: window.location.pathname || "/",
      detail: safeDetail(payload),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
      return;
    }
    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  function trafficSource() {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source");
    if (utm) return normalizeSource(utm);
    const referrer = document.referrer || "";
    if (!referrer) return "direct";
    if (referrer.includes("github.com")) return "github";
    if (referrer.includes("printable-tools-lab")) return "printable-tools-lab";
    if (referrer.includes("crazygames")) return "crazygames";
    if (referrer.includes("itch.io")) return "itch";
    return "referral";
  }

  function normalizeSource(value) {
    const source = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    if (["github", "printable-tools-lab", "crazygames", "itch", "community", "short-video"].includes(source)) return source;
    return source ? "referral" : "direct";
  }

  function safeDetail(payload) {
    const output = {};
    for (const [key, value] of Object.entries(payload || {})) {
      if (["target", "lane", "practice", "score", "sorted", "mistakes"].includes(key)) output[key] = value;
    }
    return output;
  }

  async function gameplayStart() {
    if (!state.ready || !state.sdk?.game?.gameplayStart) return false;
    try {
      await state.sdk.game.gameplayStart();
      return true;
    } catch (error) {
      console.warn("Gameplay start event failed", error);
      return false;
    }
  }

  async function gameplayStop() {
    if (!state.ready || !state.sdk?.game?.gameplayStop) return false;
    try {
      await state.sdk.game.gameplayStop();
      return true;
    } catch (error) {
      console.warn("Gameplay stop event failed", error);
      return false;
    }
  }

  window.UploadLimitPlatform = {
    init,
    requestAd,
    gameplayStart,
    gameplayStop,
    track,
    state,
  };
})();
