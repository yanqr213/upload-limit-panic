(function () {
  const CRAZYGAMES_SDK_URL = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
  const YANDEX_SDK_URL = "https://yandex.ru/games/sdk/v2";
  let initPromise = null;
  const state = {
    ready: false,
    provider: "local",
    sdk: null,
  };

  if (isCrazyGamesContext()) document.documentElement.classList.add("platform-crazygames");
  if (isYandexContext()) document.documentElement.classList.add("platform-yandex");

  function init() {
    if (!initPromise) initPromise = initSdk();
    return initPromise;
  }

  async function initSdk() {
    if (isCrazyGamesContext() || window.CrazyGames?.SDK) return initCrazyGames();
    if (isYandexContext() || window.YaGames) return initYandexGames();
    return state;
  }

  async function initCrazyGames() {
    await loadScript(CRAZYGAMES_SDK_URL);
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

  async function initYandexGames() {
    await loadScript(YANDEX_SDK_URL);
    if (window.YaGames) {
      state.provider = "yandex-games";
      try {
        state.sdk = await window.YaGames.init();
        state.sdk.features?.LoadingAPI?.ready?.();
        state.ready = true;
      } catch (error) {
        console.warn("Yandex Games SDK init failed", error);
      }
    }
    return state;
  }

  function loadScript(src) {
    if (src === CRAZYGAMES_SDK_URL && window.CrazyGames?.SDK) return Promise.resolve();
    if (src === YANDEX_SDK_URL && window.YaGames) return Promise.resolve();
    return new Promise((resolve) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => resolve(), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  async function requestAd(kind, callbacks = {}) {
    await init();
    if (!adsAllowed()) {
      callbacks.onUnavailable?.();
      return false;
    }
    if (state.provider === "yandex-games") return requestYandexAd(kind, callbacks);
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

  function requestYandexAd(kind, callbacks = {}) {
    if (!state.ready || !state.sdk?.adv) {
      callbacks.onUnavailable?.();
      return Promise.resolve(false);
    }
    if (kind === "rewarded" && state.sdk.adv.showRewardedVideo) {
      try {
        state.sdk.adv.showRewardedVideo({
          callbacks: {
            onOpen: callbacks.onStart || (() => {}),
            onRewarded: callbacks.onRewarded || callbacks.onFinish || (() => {}),
            onClose: callbacks.onFinish || (() => {}),
            onError: callbacks.onError || (() => {}),
          },
        });
        return Promise.resolve(true);
      } catch (error) {
        callbacks.onError?.(error);
        return Promise.resolve(false);
      }
    }
    if (state.sdk.adv.showFullscreenAdv) {
      try {
        state.sdk.adv.showFullscreenAdv({
          callbacks: {
            onOpen: callbacks.onStart || (() => {}),
            onClose: callbacks.onFinish || (() => {}),
            onError: callbacks.onError || (() => {}),
          },
        });
        return Promise.resolve(true);
      } catch (error) {
        callbacks.onError?.(error);
        return Promise.resolve(false);
      }
    }
    callbacks.onUnavailable?.();
    return Promise.resolve(false);
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
    if (referrer.includes("yandex")) return "yandex-games";
    if (referrer.includes("itch.io")) return "itch";
    return "referral";
  }

  function normalizeSource(value) {
    const source = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    if (["github", "printable-tools-lab", "crazygames", "yandex-games", "itch", "community", "short-video"].includes(source)) return source;
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
    await init();
    if (state.provider === "yandex-games" && state.sdk?.features?.GameplayAPI?.start) {
      try {
        state.sdk.features.GameplayAPI.start();
        return true;
      } catch (error) {
        console.warn("Yandex gameplay start event failed", error);
        return false;
      }
    }
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
    await init();
    if (state.provider === "yandex-games" && state.sdk?.features?.GameplayAPI?.stop) {
      try {
        state.sdk.features.GameplayAPI.stop();
        return true;
      } catch (error) {
        console.warn("Yandex gameplay stop event failed", error);
        return false;
      }
    }
    if (!state.ready || !state.sdk?.game?.gameplayStop) return false;
    try {
      await state.sdk.game.gameplayStop();
      return true;
    } catch (error) {
      console.warn("Gameplay stop event failed", error);
      return false;
    }
  }

  function isCrazyGamesContext() {
    const host = window.location.hostname || "";
    const referrer = document.referrer || "";
    const params = new URLSearchParams(window.location.search);
    return host.includes("crazygames") || referrer.includes("crazygames") || params.get("platform") === "crazygames" || params.get("cg_sdk") === "1";
  }

  function isYandexContext() {
    const host = window.location.hostname || "";
    const referrer = document.referrer || "";
    const params = new URLSearchParams(window.location.search);
    return host.includes("yandex") || referrer.includes("yandex") || params.get("platform") === "yandex" || params.get("ysdk") === "1";
  }

  function adsAllowed() {
    const params = new URLSearchParams(window.location.search);
    return state.ready && params.get("ads") === "1";
  }

  window.UploadLimitPlatform = {
    init,
    requestAd,
    gameplayStart,
    gameplayStop,
    adsAllowed,
    track,
    state,
  };
})();
