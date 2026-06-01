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
    window.dispatchEvent(new CustomEvent("ulp:event", { detail: event }));
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
