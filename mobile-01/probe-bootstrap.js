(function bootstrapPwaProbe() {
  "use strict";

  const LAYOUT_KEY = "ember-loop-ember-mobile-01-layout-v1";
  const HAPTICS_KEY = "ember-loop-ember-mobile-01-vibration-v1";
  const REQUIRED_SCOPE_SUFFIX = new URL("./", window.location.href).pathname;
  const COMPARISON_CLASS = "post-g4-fixed-world-platform-projection";
  const AREA_RATIO_TARGET = 0.85;
  const LIFECYCLE_LOG_CAPACITY = 48;
  const LOGICAL_ARENA = Object.freeze({ width: 750, height: 332 });
  const allowedLayouts = new Set(["a", "b"]);
  const state = {
    candidateIdentity: {
      status: "pending",
      buildId: null,
      runtimeContentSha256: null,
      error: null
    },
    layout: "b",
    serviceWorker: "pending",
    serviceWorkerScope: null,
    lifecycle: "boot",
    lifecycleSequence: 0,
    lifecycleLog: [],
    audio: {
      requests: 0,
      responses: 0,
      lastRequest: null,
      lastState: null
    },
    haptics: {
      enabled: true,
      supported: typeof window.navigator.vibrate === "function",
      requests: 0,
      lastOutcome: "idle"
    },
    platform: {
      requests: 0,
      responses: 0,
      lastSnapshot: null
    },
    diagnostics: {
      exports: 0,
      lastExportAt: null
    }
  };

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function cloneJsonSafe(value) {
    if (value === undefined) return null;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return { unavailable: true, reason: "non-serializable-platform-detail" };
    }
  }

  function rounded(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    const factor = 10 ** (digits || 0);
    return Math.round(number * factor) / factor;
  }

  function resolveLayout() {
    return "b";
  }

  function resolveHapticsPreference() {
    return safeStorageGet(HAPTICS_KEY) !== "0";
  }

  function currentDisplayMode() {
    if (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return "standalone";
    if (window.navigator.standalone === true) return "standalone-ios";
    return "browser";
  }

  function currentOrientation() {
    const orientation = window.screen && window.screen.orientation;
    if (orientation) {
      return {
        type: orientation.type || null,
        angle: Number.isFinite(orientation.angle) ? orientation.angle : null
      };
    }
    return {
      type: window.innerWidth >= window.innerHeight ? "landscape-fallback" : "portrait-fallback",
      angle: null
    };
  }

  function viewportSnapshot() {
    const visual = window.visualViewport;
    return {
      layout: {
        width: rounded(window.innerWidth, 3),
        height: rounded(window.innerHeight, 3)
      },
      visual: visual
        ? {
          x: rounded(visual.offsetLeft, 3),
          y: rounded(visual.offsetTop, 3),
          width: rounded(visual.width, 3),
          height: rounded(visual.height, 3),
          scale: rounded(visual.scale, 4)
        }
        : {
          x: 0,
          y: 0,
          width: rounded(window.innerWidth, 3),
          height: rounded(window.innerHeight, 3),
          scale: 1
        },
      devicePixelRatio: rounded(window.devicePixelRatio || 1, 3),
      orientation: currentOrientation()
    };
  }

  function recordLifecycle(type, details) {
    state.lifecycle = type;
    state.lifecycleSequence += 1;
    const entry = {
      sequence: state.lifecycleSequence,
      type,
      epochMs: Date.now(),
      monotonicMs: rounded(window.performance && window.performance.now ? window.performance.now() : 0, 3),
      visibilityState: document.visibilityState,
      hidden: Boolean(document.hidden),
      displayMode: currentDisplayMode(),
      orientation: currentOrientation()
    };
    if (details !== undefined) entry.details = cloneJsonSafe(details);
    state.lifecycleLog.push(entry);
    if (state.lifecycleLog.length > LIFECYCLE_LOG_CAPACITY) {
      state.lifecycleLog.splice(0, state.lifecycleLog.length - LIFECYCLE_LOG_CAPACITY);
    }
    return entry;
  }

  function rectSnapshot(rect) {
    if (!rect) return null;
    return {
      x: rounded(rect.x, 3),
      y: rounded(rect.y, 3),
      width: rounded(rect.width, 3),
      height: rounded(rect.height, 3),
      right: rounded(rect.x + rect.width, 3),
      bottom: rounded(rect.y + rect.height, 3)
    };
  }

  function numericPadding(style, property) {
    const value = Number.parseFloat(style.getPropertyValue(property));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function safeAreaSnapshot() {
    const probe = document.querySelector("#pwa-safe-area-probe");
    const style = probe ? window.getComputedStyle(probe) : null;
    const viewport = viewportSnapshot().visual;
    const maximumHorizontal = Math.max(0, viewport.width - 1);
    const maximumVertical = Math.max(0, viewport.height - 1);
    const raw = style
      ? {
        top: numericPadding(style, "padding-top"),
        right: numericPadding(style, "padding-right"),
        bottom: numericPadding(style, "padding-bottom"),
        left: numericPadding(style, "padding-left")
      }
      : { top: 0, right: 0, bottom: 0, left: 0 };
    const insets = {
      top: Math.min(raw.top, maximumVertical),
      right: Math.min(raw.right, maximumHorizontal),
      bottom: Math.min(raw.bottom, maximumVertical),
      left: Math.min(raw.left, maximumHorizontal)
    };
    const width = Math.max(0, viewport.width - insets.left - insets.right);
    const height = Math.max(0, viewport.height - insets.top - insets.bottom);
    return {
      insets: {
        top: rounded(insets.top, 3),
        right: rounded(insets.right, 3),
        bottom: rounded(insets.bottom, 3),
        left: rounded(insets.left, 3)
      },
      rect: {
        x: rounded(viewport.x + insets.left, 3),
        y: rounded(viewport.y + insets.top, 3),
        width: rounded(width, 3),
        height: rounded(height, 3),
        right: rounded(viewport.x + insets.left + width, 3),
        bottom: rounded(viewport.y + insets.top + height, 3)
      }
    };
  }

  function intersectRects(first, second) {
    if (!first || !second) return null;
    const left = Math.max(first.x, second.x);
    const top = Math.max(first.y, second.y);
    const right = Math.min(first.x + first.width, second.x + second.width);
    const bottom = Math.min(first.y + first.height, second.y + second.height);
    return {
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    };
  }

  function area(rect) {
    return rect ? Math.max(0, rect.width) * Math.max(0, rect.height) : 0;
  }

  function coverageSnapshot(arenaRect, shellRect) {
    const safeArea = safeAreaSnapshot();
    const safeRect = safeArea.rect;
    const arenaIntersection = intersectRects(arenaRect, safeRect);
    const shellIntersection = intersectRects(shellRect, safeRect);
    const denominator = area(safeRect);
    const arenaAreaRatio = denominator > 0 ? area(arenaIntersection) / denominator : 0;
    const shellAreaRatio = denominator > 0 ? area(shellIntersection) / denominator : 0;
    return {
      metric: "arena-intersection-over-visual-viewport-safe-area",
      target: AREA_RATIO_TARGET,
      safeInsets: safeArea.insets,
      safeRect,
      arenaIntersection: rectSnapshot(arenaIntersection),
      shellIntersection: rectSnapshot(shellIntersection),
      arenaAreaRatio: rounded(arenaAreaRatio, 6),
      shellAreaRatio: rounded(shellAreaRatio, 6),
      passesTarget: arenaAreaRatio + 1e-9 >= AREA_RATIO_TARGET
    };
  }

  function updateBadge() {
    const offlineStatus = document.getElementById("help-offline-status");
    if (offlineStatus) {
      const ready = ["controlled", "ready-reload-required"].includes(state.serviceWorker);
      offlineStatus.dataset.offlineReady = ready ? "true" : "false";
      offlineStatus.textContent = ready ? "离线资源已就绪。添加到主屏幕后，可以断网开局。"
        : ["unsupported", "insecure-context", "registration-failed", "scope-refused"].includes(state.serviceWorker)
          ? "当前浏览器还未准备好离线资源。请用 Chrome 或 Safari 联网打开后重试。"
          : "正在准备离线资源，请保持联网片刻。";
    }
    const badge = document.querySelector("#pwa-probe-badge");
    const mode = document.querySelector("#pwa-probe-mode");
    if (mode) mode.textContent = state.layout.toUpperCase();
    if (badge) {
      badge.dataset.layout = state.layout;
      badge.dataset.swStatus = state.serviceWorker;
      badge.title = `固定世界布局 ${state.layout.toUpperCase()} · SW ${state.serviceWorker}`;
    }
  }

  function updateHapticsButton() {
    const button = document.querySelector("#pwa-haptics-toggle");
    if (!button) return;
    button.setAttribute("aria-pressed", state.haptics.enabled ? "true" : "false");
    button.dataset.supported = state.haptics.supported ? "true" : "false";
    button.textContent = state.haptics.enabled ? "震动开" : "震动关";
    button.title = state.haptics.supported
      ? `震动偏好：${state.haptics.enabled ? "开启" : "关闭"}`
      : "本设备不支持网页震动；偏好仍会保存";
  }

  function dispatchPlatformEvent(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: cloneJsonSafe(detail) }));
  }

  function requestPlatformSnapshot(reason) {
    state.platform.requests += 1;
    dispatchPlatformEvent("ember:platform-snapshot-request", {
      requestId: state.platform.requests,
      reason: reason || "probe-request",
      epochMs: Date.now()
    });
    return state.platform.lastSnapshot;
  }

  function requestAudioRecovery(reason) {
    state.audio.requests += 1;
    state.audio.lastRequest = {
      requestId: state.audio.requests,
      reason: reason || "probe-request",
      epochMs: Date.now()
    };
    dispatchPlatformEvent("ember:platform-audio-resume", state.audio.lastRequest);
    return state.audio.lastRequest.requestId;
  }

  function setHapticsEnabled(nextEnabled, source) {
    state.haptics.enabled = Boolean(nextEnabled);
    safeStorageSet(HAPTICS_KEY, state.haptics.enabled ? "1" : "0");
    updateHapticsButton();
    dispatchPlatformEvent("ember:platform-haptics-preference", {
      enabled: state.haptics.enabled,
      source: source || "probe-api"
    });
    return state.haptics.enabled;
  }

  function requestHaptic(pattern) {
    state.haptics.requests += 1;
    if (!state.haptics.enabled) {
      state.haptics.lastOutcome = "disabled";
      return state.haptics.lastOutcome;
    }
    if (typeof window.navigator.vibrate !== "function") {
      state.haptics.supported = false;
      state.haptics.lastOutcome = "unsupported";
      updateHapticsButton();
      return state.haptics.lastOutcome;
    }
    try {
      const accepted = window.navigator.vibrate(pattern === undefined ? 18 : pattern);
      state.haptics.lastOutcome = accepted === false ? "rejected" : "requested";
    } catch (error) {
      state.haptics.lastOutcome = "failed";
    }
    return state.haptics.lastOutcome;
  }

  async function loadCandidateIdentity() {
    try {
      const response = await window.fetch("./build-manifest.json", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error(`Candidate identity HTTP ${response.status}`);
      const identity = await response.json();
      if (identity.candidateId !== "EMBER-MOBILE-01" || identity.sourceCommit !== "27ee268a966440e1f5bcb5417af5ffffdd2cb583" || identity.productionSha256 !== "afa997cdce15166431bec0f3f7263e9a32b70ab1a4fc5b0c06ff527664b0d582") {
        throw new Error("Candidate identity manifest binding mismatch");
      }
      if (!/^[a-f0-9]{16}$/.test(String(identity.buildId || "")) || !/^[a-f0-9]{64}$/.test(String(identity.runtimeContentSha256 || ""))) {
        throw new Error("Candidate identity hashes are malformed");
      }
      state.candidateIdentity = {
        status: "ready",
        buildId: identity.buildId,
        runtimeContentSha256: identity.runtimeContentSha256,
        error: null
      };
    } catch (error) {
      state.candidateIdentity = {
        status: "unavailable",
        buildId: null,
        runtimeContentSha256: null,
        error: String(error && error.message || error)
      };
    }
    return state.candidateIdentity;
  }

  let candidateIdentityPromise = null;

  function snapshot() {
    requestPlatformSnapshot("diagnostic-read");
    const shell = document.querySelector(".app-shell");
    const arena = document.querySelector(".arena-shell");
    const shellRect = shell ? shell.getBoundingClientRect() : null;
    const arenaRect = arena ? arena.getBoundingClientRect() : null;
    return {
      schema: 2,
      candidate: true,
      candidateId: "EMBER-MOBILE-01",
      deliveryClass: "pwa-candidate",
      sourceCommit: document.querySelector('meta[name="ember-source-commit"]')?.content || null,
      productionSha256: document.querySelector('meta[name="ember-production-sha256"]')?.content || null,
      buildId: state.candidateIdentity.buildId,
      runtimeContentSha256: state.candidateIdentity.runtimeContentSha256,
      candidateIdentityStatus: state.candidateIdentity.status,
      candidateIdentityError: state.candidateIdentity.error,
      comparisonClass: COMPARISON_CLASS,
      layout: state.layout,
      fixedWorld: LOGICAL_ARENA,
      displayMode: currentDisplayMode(),
      secureContext: window.isSecureContext,
      serviceWorker: state.serviceWorker,
      serviceWorkerScope: state.serviceWorkerScope,
      lifecycle: state.lifecycle,
      lifecycleLogCapacity: LIFECYCLE_LOG_CAPACITY,
      lifecycleLog: cloneJsonSafe(state.lifecycleLog),
      viewport: viewportSnapshot(),
      safeAreaCoverage: coverageSnapshot(arenaRect, shellRect),
      shell: rectSnapshot(shellRect),
      arena: rectSnapshot(arenaRect),
      audio: cloneJsonSafe(state.audio),
      haptics: cloneJsonSafe(state.haptics),
      platform: cloneJsonSafe(state.platform),
      diagnostics: cloneJsonSafe(state.diagnostics)
    };
  }

  function diagnosticReport() {
    return {
      schema: 1,
      kind: "ember-loop-g7-candidate-diagnostic",
      generatedAt: new Date().toISOString(),
      privacy: "No save contents or player-entered data are included.",
      sourceAppSha256: document.querySelector('meta[name="ember-source-app-sha256"]')?.content || null,
      bundledAppSha256: document.querySelector('meta[name="ember-bundled-app-sha256"]')?.content || null,
      userAgent: window.navigator.userAgent,
      platform: window.navigator.userAgentData && window.navigator.userAgentData.platform
        ? window.navigator.userAgentData.platform
        : window.navigator.platform || null,
      snapshot: snapshot()
    };
  }

  function diagnosticJson() {
    return `${JSON.stringify(diagnosticReport(), null, 2)}\n`;
  }

  async function exportDiagnostics() {
    if (candidateIdentityPromise) await candidateIdentityPromise;
    const json = diagnosticJson();
    const blob = new Blob([json], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `ember-loop-g7-candidate-diagnostic-${timestamp}.json`;
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function releaseDiagnosticUrl() { URL.revokeObjectURL(objectUrl); }, 0);
    state.diagnostics.exports += 1;
    state.diagnostics.lastExportAt = new Date().toISOString();
    return { ok: true, filename, bytes: blob.size };
  }

  const candidateDiagnostics = new URL(window.location.href).searchParams.get("diagnostics") === "1";
  document.documentElement.dataset.candidateDiagnostics = candidateDiagnostics ? "true" : "false";
  ["pwa-probe-badge", "pwa-probe-tools"].forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.hidden = !candidateDiagnostics;
    if (candidateDiagnostics) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", "true");
  });
  candidateIdentityPromise = loadCandidateIdentity();
  state.layout = resolveLayout();
  state.haptics.enabled = resolveHapticsPreference();
  document.documentElement.dataset.probeLayout = state.layout;
  document.documentElement.dataset.pwaCandidate = "true";
  recordLifecycle("boot", { comparisonClass: COMPARISON_CLASS, layout: state.layout });

  Object.defineProperty(window, "__EMBER_PWA_PROBE__", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze({
      getSnapshot: snapshot,
      createDiagnosticReport: diagnosticReport,
      createDiagnosticJson: diagnosticJson,
      exportDiagnostics,
      requestAudioRecovery,
      requestHaptic,
      requestPlatformSnapshot,
      setHapticsEnabled
    })
  });

  document.addEventListener("ember:platform-audio-state", function platformAudioState(event) {
    state.audio.responses += 1;
    state.audio.lastState = cloneJsonSafe(event.detail);
  });
  document.addEventListener("ember:platform-snapshot", function platformSnapshot(event) {
    state.platform.responses += 1;
    state.platform.lastSnapshot = cloneJsonSafe(event.detail);
    if (event.detail && event.detail.haptics) { state.haptics.enabled = Boolean(event.detail.haptics.enabled); updateHapticsButton(); }
  });

  let firstGestureRecorded = false;
  function recordFirstGesture(event) {
    if (firstGestureRecorded || event.isTrusted === false) return;
    firstGestureRecorded = true;
    recordLifecycle("first-user-gesture", { type: event.type, pointerType: event.pointerType || null, key: event.key || null });
    requestAudioRecovery("first-user-gesture");
  }
  document.addEventListener("pointerdown", recordFirstGesture, { capture: true, passive: true });
  document.addEventListener("keydown", recordFirstGesture, { capture: true });

  document.addEventListener("DOMContentLoaded", function probeDomReady() {
    recordLifecycle("dom-content-loaded");
    updateBadge();
    updateHapticsButton();
    // Core owns the saved vibration preference; diagnostics only observe it.
    const hapticsButton = document.querySelector("#pwa-haptics-toggle");
    const exportButton = document.querySelector("#pwa-diagnostics-export");
    if (hapticsButton) {
      hapticsButton.addEventListener("click", function toggleProbeHaptics() {
        const enabled = setHapticsEnabled(!state.haptics.enabled, "probe-control");
        if (enabled) requestHaptic(18);
      });
    }
    if (exportButton) exportButton.addEventListener("click", exportDiagnostics);
    requestPlatformSnapshot("dom-content-loaded");
  }, { once: true });

  document.addEventListener("visibilitychange", function recordVisibility() {
    const type = document.hidden ? "visibility-hidden" : "visibility-visible";
    recordLifecycle(type);
    requestPlatformSnapshot(type);
    if (!document.hidden) requestAudioRecovery(type);
  });
  window.addEventListener("pagehide", function recordPageHide(event) {
    recordLifecycle("pagehide", { persisted: Boolean(event.persisted) });
    requestPlatformSnapshot("pagehide");
  });
  window.addEventListener("pageshow", function recordPageShow(event) {
    recordLifecycle("pageshow", { persisted: Boolean(event.persisted) });
    requestPlatformSnapshot("pageshow");
    requestAudioRecovery("pageshow");
  });
  document.addEventListener("freeze", function recordFreeze() {
    recordLifecycle("freeze");
    requestPlatformSnapshot("freeze");
  });
  document.addEventListener("resume", function recordResume() {
    recordLifecycle("resume");
    requestPlatformSnapshot("resume");
    requestAudioRecovery("resume");
  });
  window.addEventListener("blur", function recordBlur() {
    recordLifecycle("blur");
    requestPlatformSnapshot("blur");
  });
  window.addEventListener("focus", function recordFocus() {
    recordLifecycle("focus");
    requestPlatformSnapshot("focus");
    requestAudioRecovery("focus");
  });
  window.addEventListener("orientationchange", function recordOrientationChange() {
    recordLifecycle("orientationchange");
    requestPlatformSnapshot("orientationchange");
  });

  let resizeQueued = false;
  function queueResizeRecord(source) {
    if (resizeQueued) return;
    resizeQueued = true;
    window.requestAnimationFrame(function recordResizeFrame() {
      resizeQueued = false;
      recordLifecycle("resize", { source, viewport: viewportSnapshot() });
    });
  }
  window.addEventListener("resize", function recordWindowResize() { queueResizeRecord("window"); });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function recordVisualViewportResize() { queueResizeRecord("visual-viewport"); });
  }

  window.addEventListener("load", async function registerProbeWorker() {
    recordLifecycle("load");
    if (!("serviceWorker" in window.navigator)) {
      state.serviceWorker = "unsupported";
      updateBadge();
      return;
    }
    if (!window.isSecureContext) {
      state.serviceWorker = "insecure-context";
      updateBadge();
      return;
    }

    const expectedScope = new URL("./", window.location.href);
    if (!expectedScope.pathname.endsWith(REQUIRED_SCOPE_SUFFIX)) {
      state.serviceWorker = "scope-refused";
      updateBadge();
      return;
    }

    try {
      const registration = await window.navigator.serviceWorker.register("./sw.js", {
        scope: "./",
        updateViaCache: "none"
      });
      if (registration.scope !== expectedScope.href) {
        await registration.unregister();
        throw new Error(`Unexpected service worker scope: ${registration.scope}`);
      }
      await window.navigator.serviceWorker.ready;
      state.serviceWorkerScope = registration.scope;
      state.serviceWorker = window.navigator.serviceWorker.controller ? "controlled" : "ready-reload-required";
      updateBadge();
    } catch (error) {
      state.serviceWorker = "registration-failed";
      updateBadge();
    }
  }, { once: true });

  if ("serviceWorker" in window.navigator) {
    window.navigator.serviceWorker.addEventListener("controllerchange", function workerControllerChanged() {
      state.serviceWorker = "controlled";
      updateBadge();
      recordLifecycle("service-worker-controllerchange");
    });
  }
})();
