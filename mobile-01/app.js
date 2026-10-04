(function bootstrapEmberLoop() {
  "use strict";

  const Logic = window.EmberLoopLogic;
  if (!Logic) throw new Error("EmberLoopLogic failed to load.");

  const REMAKE_CURVE_ID = Logic.REMAKE_CURVE_ID;
  const SAVE_KEY = "ember-loop-ember-mobile-01-save-v6";
  const PREVIOUS_SAVE_KEYS = ["ember-loop-ember-mobile-01-save-v5", "ember-loop-ember-mobile-01-save-v4", "ember-loop-ember-mobile-01-save-v3", "ember-loop-ember-mobile-01-save-v2", "ember-loop-ember-mobile-01-save-v1"];
  const SPEED_PREFERENCE_KEY = "ember-loop-ember-mobile-01-speed-v1";
  const MUTE_PREFERENCE_KEY = "ember-loop-ember-mobile-01-mute-v1";
  const VIBRATION_PREFERENCE_KEY = "ember-loop-ember-mobile-01-vibration-v1";
  const AUTO_SWITCH_PREFERENCE_KEY = "ember-loop-ember-mobile-01-auto-switch-v1";
  const TUTORIAL_PREFERENCE_KEY = "ember-loop-ember-mobile-01-tutorial-v1";
  const TUTORIAL_TARGET_DURATION_SECONDS = 60;
  const TUTORIAL_HARD_TIMEOUT_SECONDS = 90;
  const TUTORIAL_CHALLENGE_TARGET = 6;
  const TUTORIAL_STEP_ORDER = ["move", "switch", "flash", "growth", "challenge"];
  const TUTORIAL_BALANCE_RULESET = "c10-safe-six-targets-v1";
  const BASE_DAMAGE = 18;
  const BASE_HEALTH = 100;
  const BASE_MOVE_SPEED = 182;
  const BASE_PROJECTILE_SPEED = 430;
  const BASE_ATTACK_RANGE = 275;
  const BASE_PICKUP_RADIUS = 52;
  const MAX_PICKUP_RADIUS = 150;
  const HOLSTER_CHARGE_SECONDS = 4;
  const WEAPON_SWITCH_LOCK = 0.45;
  const FIXED_SIMULATION_STEP = 1 / 60;
  const MAX_ENEMIES = 80;
  const MAX_PLAYER_BULLETS = 150;
  const MAX_ENEMY_BULLETS = 120;
  const SOFT_PARTICLE_LIMIT = 110;
  const MAX_PARTICLES = 180;
  const MAX_WORLD_EFFECTS = 32;
  const MAX_FIRE_DROPS = 18;
  const MAX_SAFE_LANES = 4;
  const MAX_BOSS_WAVES = 3;
  const JOYSTICK_DEAD_ZONE = 8;
  const JOYSTICK_FULL_RADIUS = 48;
  const JOYSTICK_KNOB_TRAVEL = 25;
  const MAJOR_THREAT_LOCK_SECONDS = 0.42;
  const MAJOR_THREAT_MAX_DELAY_SECONDS = 0.65;
  const AUDIO_TOTAL_VOICE_LIMIT = 8;
  const AUDIO_NONCRITICAL_VOICE_LIMIT = 6;
  const AUDIO_LAYER_LIMITS = Object.freeze({ S: 2, A: 3, B: 3 });
  const AUDIO_LAYER_BASE_GAINS = Object.freeze({ S: 0.90, A: 0.72, B: 0.52 });
  const C13_WEAPON_RUNTIME = Object.freeze({
    carbine: Object.freeze({ baseInterval: 0.36, damageMultiplier: 0.72, projectileSpeed: 520, attackRange: 340, drawDamageMultiplier: 2.6, drawPierce: 5 }),
    fireflyBranch: Object.freeze({ baseInterval: 0.58, damageMultiplier: 0.58, projectileSpeed: 285, attackRange: 330, drawDamageMultiplier: 1.18 }),
    cinderRing: Object.freeze({ baseInterval: 0.64, damageMultiplier: 0.52, projectileSpeed: 310, attackRange: 210, baseProjectileCount: 6, drawDamageMultiplier: 1.45, drawRadius: 112, drawKnockback: 64 }),
    hearthSeed: Object.freeze({ baseInterval: 0.84, damageMultiplier: 1.50, projectileSpeed: 260, attackRange: 330, explosionRadius: 48, drawDamageMultiplier: 1.10 })
  });
  const C13_WEAPONS = Object.freeze(Object.keys(Logic.C13_WEAPON_DEFS).reduce(function buildRuntimeWeapons(index, weaponId) {
    index[weaponId] = Object.freeze(Object.assign({}, Logic.getC13WeaponDefinition(weaponId), C13_WEAPON_RUNTIME[weaponId]));
    return index;
  }, Object.create(null)));
  // G4 freezes the combat world to the exact C11 canvas content measured at
  // 844x390 (750x332 client pixels; the 752x334 arena includes its border).
  // Viewports only change this world's uniform projection; they never change
  // spawn, movement, collision, range, or cleanup.
  const ARENA_GEOMETRY = Object.freeze({
    width: 750,
    height: 332,
    centerX: 375,
    centerY: 166,
    diagonal: Math.hypot(750, 332)
  });
  const TAU = Math.PI * 2;
  const dom = {
    topEmbers: document.querySelector("#top-embers"),
    topBestWave: document.querySelector("#top-best-wave"),
    topRelayCount: document.querySelector("#top-relay-count"),
    topRecordGrade: document.querySelector("#top-record-grade"),
    muteButton: document.querySelector("#mute-button"),
    vibrationButton: document.querySelector("#vibration-button"),
    pauseMuteButton: document.querySelector("#pause-mute-button"),
    autoSwapToggle: document.querySelector("#auto-swap-toggle"),
    pauseAutoSwapToggle: document.querySelector("#pause-auto-swap-toggle"),
    homeScreen: document.querySelector("#home-screen"),
    gameScreen: document.querySelector("#game-screen"),
    homeUpgrades: document.querySelector("#home-upgrades"),
    resetSaveButton: document.querySelector("#reset-save-button"),
    exportSaveButton: document.querySelector("#export-save-button"),
    importSaveButton: document.querySelector("#import-save-button"),
    importSaveInput: document.querySelector("#import-save-input"),
    startButton: document.querySelector("#start-button"),
    loadoutToggleButton: document.querySelector("#loadout-toggle-button"),
    setupStack: document.querySelector("#setup-stack"),
    tutorialStartButton: document.querySelector("#tutorial-start-button"),
    tutorialRecommendation: document.querySelector("#tutorial-recommendation"),
    tutorialStartLabel: document.querySelector("#tutorial-start-label"),
    startSummary: document.querySelector("#start-summary"),
    currentBearerSigil: document.querySelector("#current-bearer-sigil"),
    currentBearerName: document.querySelector("#current-bearer-name"),
    currentBearerDescription: document.querySelector("#current-bearer-description"),
    homeClassicRecord: document.querySelector("#home-classic-record"),
    homeAttemptRecord: document.querySelector("#home-attempt-record"),
    homeNextTarget: document.querySelector("#home-next-target"),
    characterOptions: document.querySelector("#character-options"),
    weaponStyleOptions: document.querySelector("#weapon-style-options"),
    fireTraitOptions: document.querySelector("#fire-trait-options"),
    bearerUnlockCount: document.querySelector("#bearer-unlock-count"),
    dangerUnlockCount: document.querySelector("#danger-unlock-count"),
    summaryBearer: document.querySelector("#summary-bearer"),
    summaryLoadout: document.querySelector("#summary-loadout"),
    summaryDanger: document.querySelector("#summary-danger"),
    summaryMultiplier: document.querySelector("#summary-multiplier"),
    archiveButton: document.querySelector("#archive-button"),
    legacyButton: document.querySelector("#legacy-button"),
    legacyRankCount: document.querySelector("#legacy-rank-count"),
    homeDrawer: document.querySelector("#home-drawer"),
    homeDrawerTitle: document.querySelector("#home-drawer-title"),
    homeDrawerBody: document.querySelector("#home-drawer-body"),
    homeDrawerClose: document.querySelector("#home-drawer-close"),
    archiveDrawerPanel: document.querySelector("#archive-drawer-panel"),
    legacyDrawerPanel: document.querySelector("#legacy-drawer-panel"),
    drawerAchievementCount: document.querySelector("#drawer-achievement-count"),
    classicRecordMatrix: document.querySelector("#classic-record-matrix"),
    achievementList: document.querySelector("#achievement-list"),
    achievementCount: document.querySelector("#achievement-count"),
    waveLabel: document.querySelector("#wave-label"),
    waveCaption: document.querySelector("#wave-caption"),
    levelLabel: document.querySelector("#level-label"),
    killsLabel: document.querySelector("#kills-label"),
    timeScaleButton: document.querySelector("#time-scale-button"),
    pauseButton: document.querySelector("#pause-button"),
    healthFill: document.querySelector("#health-fill"),
    healthLabel: document.querySelector("#health-label"),
    xpFill: document.querySelector("#xp-fill"),
    xpLabel: document.querySelector("#xp-label"),
    stageLabel: document.querySelector("#stage-label"),
    contractLabel: document.querySelector("#contract-label"),
    encounterChip: document.querySelector("#encounter-chip"),
    encounterLabel: document.querySelector("#encounter-label"),
    fireSlots: document.querySelector("#fire-slots"),
    fireCore: document.querySelector("#fire-core"),
    fireTechnique: document.querySelector("#fire-technique"),
    relayChip: document.querySelector("#relay-chip"),
    relayLabel: document.querySelector("#relay-label"),
    relayBurst: document.querySelector("#relay-burst"),
    relayBurstLabel: document.querySelector("#relay-burst-label"),
    tutorialGuide: document.querySelector("#tutorial-guide"),
    tutorialStepCount: document.querySelector("#tutorial-step-count"),
    tutorialProgressFill: document.querySelector("#tutorial-progress-fill"),
    tutorialStepTitle: document.querySelector("#tutorial-step-title"),
    tutorialStepCopy: document.querySelector("#tutorial-step-copy"),
    tutorialSkipButton: document.querySelector("#tutorial-skip-button"),
    arena: document.querySelector(".arena-shell"),
    canvas: document.querySelector("#game-canvas"),
    joystickZone: document.querySelector("#joystick-zone"),
    joystickBase: document.querySelector("#joystick-base"),
    joystickKnob: document.querySelector("#joystick-knob"),
    waveBanner: document.querySelector("#wave-banner"),
    bossBar: document.querySelector("#boss-bar"),
    bossName: document.querySelector("#boss-name"),
    bossFill: document.querySelector("#boss-fill"),
    bossPhaseMark: document.querySelector("#boss-phase-mark"),
    dragHint: document.querySelector("#drag-hint"),
    weaponRack: document.querySelector("#weapon-rack"),
    carbineSlot: document.querySelector("#carbine-slot"),
    ringSlot: document.querySelector("#ring-slot"),
    carbineName: document.querySelector("#carbine-name"),
    ringName: document.querySelector("#ring-name"),
    carbineHeat: document.querySelector("#carbine-heat"),
    ringHeat: document.querySelector("#ring-heat"),
    coreChip: document.querySelector("#core-chip"),
    switchButton: document.querySelector("#switch-button"),
    switchGlyph: document.querySelector("#switch-glyph"),
    switchLabel: document.querySelector("#switch-label"),
    flashButton: document.querySelector("#flash-button"),
    flashGlyph: null,
    flashCooldown: document.querySelector("#flash-cooldown"),
    damageStat: document.querySelector("#damage-stat"),
    speedStat: document.querySelector("#speed-stat"),
    fireRateStat: document.querySelector("#fire-rate-stat"),
    choiceOverlay: document.querySelector("#choice-overlay"),
    choiceKicker: document.querySelector("#choice-kicker"),
    choiceTitle: document.querySelector("#choice-title"),
    choiceList: document.querySelector("#choice-list"),
    contractOverlay: document.querySelector("#contract-overlay"),
    contractKicker: document.querySelector("#contract-kicker"),
    contractPreview: document.querySelector("#contract-preview"),
    contractList: document.querySelector("#contract-list"),
    coreOverlay: document.querySelector("#core-overlay"),
    coreKicker: document.querySelector("#core-kicker"),
    coreList: document.querySelector("#core-list"),
    victoryOverlay: document.querySelector("#victory-overlay"),
    victoryKicker: document.querySelector("#victory-kicker"),
    victoryTitle: document.querySelector("#victory-title"),
    victoryCopy: document.querySelector("#victory-copy"),
    victoryProgressCaption: document.querySelector("#victory-progress-caption"),
    victoryProgress: document.querySelector("#victory-progress"),
    victoryKills: document.querySelector("#victory-kills"),
    victoryEmbersCaption: document.querySelector("#victory-embers-caption"),
    victoryEmbers: document.querySelector("#victory-embers"),
    victoryReport: document.querySelector("#victory-report"),
    victoryHomeButton: document.querySelector("#victory-home-button"),
    victoryContinueButton: document.querySelector("#victory-continue-button"),
    victoryScoreCard: document.querySelector("#victory-score-card"),
    victoryGrade: document.querySelector("#victory-grade"),
    victoryScore: document.querySelector("#victory-score"),
    victoryScoreBreakdown: document.querySelector("#victory-score-breakdown"),
    victoryUnlocks: document.querySelector("#victory-unlocks"),
    resultOverlay: document.querySelector("#result-overlay"),
    resultKicker: document.querySelector("#result-kicker"),
    resultTitle: document.querySelector("#result-title"),
    resultWave: document.querySelector("#result-wave"),
    resultKills: document.querySelector("#result-kills"),
    resultEmbers: document.querySelector("#result-embers"),
    resultRecordStatus: document.querySelector("#result-record-status"),
    resultTarget: document.querySelector("#result-target"),
    resultUnlocks: document.querySelector("#result-unlocks"),
    resultNote: document.querySelector("#result-note"),
    resultRelay: document.querySelector("#result-relay"),
    resultRelayList: document.querySelector("#result-relay-list"),
    resultScoreCard: document.querySelector("#result-score-card"),
    resultGrade: document.querySelector("#result-grade"),
    resultScore: document.querySelector("#result-score"),
    resultScoreNote: document.querySelector("#result-score-note"),
    retryButton: document.querySelector("#retry-button"),
    returnHomeButton: document.querySelector("#return-home-button"),
    pauseOverlay: document.querySelector("#pause-overlay"),
    pauseTitle: document.querySelector("#pause-title"),
    resumeButton: document.querySelector("#resume-button"),
    quitRunButton: document.querySelector("#quit-run-button"),
    tutorialCompleteOverlay: document.querySelector("#tutorial-complete-overlay"),
    tutorialEnterRunButton: document.querySelector("#tutorial-enter-run-button"),
    tutorialHomeButton: document.querySelector("#tutorial-home-button"),
    toast: document.querySelector("#toast")
  };
  dom.flashGlyph = dom.flashButton.firstElementChild;

  const context = dom.canvas.getContext("2d", { alpha: true });
  let arenaProjection = createArenaProjection(1, 1, 1);
  let storageAvailable = true;
  let storageNoticeShown = false;
  let profile = loadProfile();
  let tutorialPreference = loadTutorialPreference();
  let run = null;
  let helpUi = null;
  let nextEntityId = 1;
  let nextFeedbackId = 1;
  let lastFrameTime = performance.now();
  let simulationAccumulator = 0;
  // Reforged feedback uses wall time and never moves collision geometry.
  let impactStopRemaining = 0;
  let nextImpactStopAt = 0;
  let impactMarks = [];
  const enemyImpactStates = new Map();
  let impactStopsApplied = 0;
  let impactStopSeconds = 0;
  let canvasResizeObserver = null;
  let bannerTimer = 0;
  let toastTimer = 0;
  let relayBurstTimer = 0;
  let relayResumeTimer = 0;
  let lifecycleSuspended = false;
  let choiceSerial = 0;
  let preferredTimeScale = 1;
  let audioContext = null;
  let audioGraph = null;
  let soundMuted = safeStorageGet(MUTE_PREFERENCE_KEY) === "1";
  let vibrationEnabled = safeStorageGet(VIBRATION_PREFERENCE_KEY) !== "0";
  let autoSwitchEnabled = safeStorageGet(AUTO_SWITCH_PREFERENCE_KEY) !== "0";
  let activeSoundVoices = 0;
  let nextAudioVoiceId = 1;
  const activeAudioVoices = new Map();
  const audioLastStartedAt = Object.create(null);
  const audioCauseIds = new Set();
  const audioCauseOrder = [];
  let audioClosedWave = null;
  const reducedMotionQuery = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reducedMotion = Boolean(reducedMotionQuery && reducedMotionQuery.matches);
  let lifecyclePauseCount = 0;
  let lastLifecycleReason = "boot";
  let lastLifecycleAt = Date.now();
  const lastSfxAt = Object.create(null);
  const audioDiagnostics = createAudioDiagnostics();
  const feedbackDiagnostics = createFeedbackDiagnostics();
  preferredTimeScale = safeStorageGet(SPEED_PREFERENCE_KEY) === "2" ? 2 : 1;
  let selectedAnchorWave = getAvailableAnchorWaves().slice(-1)[0];
  let lastDrawerTrigger = null;
  const pressedKeys = new Set();

  const input = {
    movePointerId: null,
    movePointerActive: false,
    movePointerType: null,
    movePointerSource: null,
    joystickCenterX: 0,
    joystickCenterY: 0,
    joystickVectorX: 0,
    joystickVectorY: 0,
    abilityPointerId: null,
    abilityPointerActive: false,
    switchPointerId: null,
    switchPointerActive: false,
    hasTarget: false,
    targetX: 0,
    targetY: 0
  };
  const inputDebug = {
    ignoredCanvasPointerDowns: 0,
    ignoredTouchCanvasPointerDowns: 0,
    joystickPointerDownAttempts: 0,
    joystickPointerDowns: 0,
    joystickPointerMoveCount: 0,
    joystickPointerCancels: 0,
    joystickLostCaptureCount: 0,
    joystickRecenteringCount: 0,
    touchOutsideMoveZoneCount: 0,
    lastMovementReleaseReason: null,
    flashPointerDownAttempts: 0,
    flashQueueAcceptedCount: 0,
    nonPrimaryFlashAcceptedCount: 0,
    suppressedCompatibilityClicks: 0,
    movementPointerCancelCount: 0,
    abilityPointerCancelCount: 0,
    switchPointerDownAttempts: 0,
    switchQueueAcceptedCount: 0,
    nonPrimarySwitchAcceptedCount: 0,
    switchPointerCancelCount: 0,
    lastFlashInputSource: null,
    lastFlashPointerId: null,
    lastFlashPointerType: null,
    lastFlashPointerIsPrimary: null,
    lastSwitchInputSource: null,
    lastSwitchPointerId: null,
    lastSwitchPointerType: null,
    lastSwitchPointerIsPrimary: null
  };
  let lastDirectFlashPointerAt = -Infinity;
  let lastDirectSwitchPointerAt = -Infinity;

  const contractIcons = {
    "still-hunt": "猎",
    "surging-tide": "潮",
    "lone-edge": "锋"
  };

  const upgradeIcons = {
    "iron-heart": "心",
    windstep: "风",
    "ember-magnet": "引",
    "carbine-temper": "铳",
    "carbine-rail": "贯",
    "carbine-salvo": "四",
    "carbine-brand": "印",
    "ring-temper": "轮",
    "ring-blades": "齿",
    "ring-gravity": "牵",
    "ring-afterburn": "灼",
    "quick-temper": "炉",
    "draw-force": "拔",
    "fusion-feed": "合",
    "swap-haste": "奏"
  };
  const QUICK_UPGRADE_PRIORITY = Object.freeze([
    "iron-heart", "ring-gravity", "windstep", "ring-blades", "carbine-rail",
    "quick-temper", "ember-magnet", "swap-haste", "ring-afterburn", "carbine-salvo",
    "draw-force", "fusion-feed", "carbine-brand", "ring-temper", "carbine-temper"
  ]);
  const QUICK_CORE_PRIORITY = Object.freeze(["return-core", "twin-core", "headhunt-core"]);
  const C13_SUPPORT_UPGRADE_IDS = Object.freeze([
    "iron-heart", "windstep", "ember-magnet", "quick-temper", "draw-force", "fusion-feed", "swap-haste"
  ]);

  function getUpgradeDefinition(upgradeId) {
    return Logic.RUN_UPGRADES.find(function findUpgrade(upgrade) { return upgrade.id === upgradeId; }) || null;
  }

  function getWeaponDefinition(weaponId) {
    return C13_WEAPONS[weaponId] || C13_WEAPONS.carbine;
  }

  function getWeaponLevel(weaponId) {
    if (!run || !run.weaponProgress || !run.weaponProgress.levels) return 1;
    return clamp(Number(run.weaponProgress.levels[weaponId]) || 1, 1, Logic.C13_WEAPON_LEVEL_CAP);
  }

  function getWeaponLevelBehavior(weaponId, requestedLevel) {
    const level = clamp(Number(requestedLevel) || getWeaponLevel(weaponId), 1, Logic.C13_WEAPON_LEVEL_CAP);
    const behavior = {};
    for (let currentLevel = 1; currentLevel <= level; currentLevel += 1) {
      const definition = Logic.getC13WeaponLevelDefinition(weaponId, currentLevel);
      if (definition && definition.behavior) Object.assign(behavior, definition.behavior);
    }
    return behavior;
  }

  function getWeaponTechniqueFamily(weaponId) {
    const weapon = getWeaponDefinition(weaponId);
    return weapon.slot === "clearing" ? "cinderRing" : "carbine";
  }

  function getEquippedWeaponIds() {
    return run && run.weaponProgress && Array.isArray(run.weaponProgress.weaponIds)
      ? run.weaponProgress.weaponIds.slice(0, 2)
      : ["carbine", "cinderRing"];
  }

  function getPairForLoadout(loadoutId) {
    return Logic.getC13WeaponPairForLoadout(loadoutId || Logic.C13_DEFAULT_PAIR_ID);
  }

  function getAvailableAnchorWaves() {
    const bestCompletedWave = profile.bestCompletedWave || 0;
    return profile.relayUpgradeId && profile.relayTargetWave > 0
      ? Logic.getRelayAnchorWaves(bestCompletedWave, profile.relayTargetWave)
      : Logic.getUnlockedAnchorWaves(bestCompletedWave);
  }

  function resolveAvailableAnchor(requestedWave) {
    const bestCompletedWave = profile.bestCompletedWave || 0;
    return profile.relayUpgradeId && profile.relayTargetWave > 0
      ? Logic.resolveAnchorWave(bestCompletedWave, requestedWave, profile.relayTargetWave)
      : Logic.resolveAnchorWave(bestCompletedWave, requestedWave);
  }

  function safeInteger(value, fallback, maximum) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return fallback;
    return Math.min(Math.trunc(number), maximum === undefined ? Number.MAX_SAFE_INTEGER : maximum);
  }

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      storageAvailable = false;
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function safeStorageRemove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function showStorageNotice() {
    if (storageAvailable || storageNoticeShown) return;
    storageNoticeShown = true;
    showToast("浏览器未开放本地存储，本次进度仅保留到关闭页面");
  }

  function normalizeProfile(rawProfile) {
    const raw = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
    const clean = Logic.sanitizeSave(raw);
    clean.bestWave = safeInteger(raw.bestWave, 0);
    clean.bestCompletedWave = safeInteger(raw.bestCompletedWave, Math.max(0, clean.bestWave - 1));
    clean.runs = safeInteger(raw.runs, 0);
    clean.victories = safeInteger(raw.victories, 0);
    clean.firstSettlementClaimed = Boolean(raw.firstSettlementClaimed);
    return clean;
  }

  function readStoredProfile(key) {
    const serialized = safeStorageGet(key);
    if (!serialized) return null;
    try {
      const parsed = JSON.parse(serialized);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function loadProfile() {
    const current = readStoredProfile(SAVE_KEY);
    if (current) return normalizeProfile(current);
    let legacy = null;
    for (let index = 0; index < PREVIOUS_SAVE_KEYS.length && !legacy; index += 1) {
      legacy = readStoredProfile(PREVIOUS_SAVE_KEYS[index]);
    }
    const migrated = normalizeProfile(legacy || {});
    if (legacy) safeStorageSet(SAVE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  function loadTutorialPreference() {
    const serialized = safeStorageGet(TUTORIAL_PREFERENCE_KEY);
    const completed = serialized === "1";
    return { seen: completed, completed: completed };
  }

  function saveTutorialPreference(seen, completed) {
    tutorialPreference = { seen: true, completed: true };
    if (!safeStorageSet(TUTORIAL_PREFERENCE_KEY, "1")) showStorageNotice();
    updateTutorialHomeUi();
    return tutorialPreference;
  }

  function saveProfile() {
    if (!safeStorageSet(SAVE_KEY, JSON.stringify(profile))) showStorageNotice();
  }

  function exportSave() {
    const payload = {
      format: "ember-loop-save",
      schema: Logic.SAVE_VERSION,
      exportedAt: new Date().toISOString(),
      profile: JSON.parse(JSON.stringify(profile)),
      preferredTimeScale: preferredTimeScale
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "薪火循环-存档-v" + Logic.SAVE_VERSION + ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function releaseObjectUrl() { URL.revokeObjectURL(objectUrl); }, 0);
    showToast("存档已导出，可用于换设备或换文件名");
  }

  function importSaveFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", function loadImportedSave() {
      try {
        const payload = JSON.parse(String(reader.result || ""));
        if (!payload || payload.format !== "ember-loop-save" || ![1, 2, 3, 4, 5, Logic.SAVE_VERSION].includes(payload.schema) || !payload.profile) {
          throw new Error("Unsupported save format.");
        }
        profile = normalizeProfile(payload.profile);
        preferredTimeScale = payload.preferredTimeScale === 2 ? 2 : 1;
        selectedAnchorWave = getAvailableAnchorWaves().slice(-1)[0];
        saveProfile();
        if (!safeStorageSet(SPEED_PREFERENCE_KEY, String(preferredTimeScale))) showStorageNotice();
        updateAccountUi();
        showToast(storageAvailable ? "存档导入成功" : "存档已导入，本次会话有效");
      } catch (error) {
        showToast("无法导入：文件格式或版本不正确");
      } finally {
        dom.importSaveInput.value = "";
      }
    });
    reader.addEventListener("error", function importReadError() {
      dom.importSaveInput.value = "";
      showToast("无法读取这个存档文件");
    });
    reader.readAsText(file, "utf-8");
  }

  function replaceCoreSave(coreSave) {
    profile = Object.assign({}, Logic.sanitizeSave(coreSave), {
      bestWave: profile.bestWave,
      bestCompletedWave: profile.bestCompletedWave,
      runs: profile.runs,
      victories: profile.victories,
      firstSettlementClaimed: profile.firstSettlementClaimed
    });
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "∞";
    if (value < 1000) return String(Math.round(value));
    const units = ["K", "M", "B", "T"];
    let scaled = value;
    let unit = -1;
    while (scaled >= 1000 && unit < units.length - 1) {
      scaled /= 1000;
      unit += 1;
    }
    return scaled.toFixed(scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2) + units[unit];
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function hideToast() {
      dom.toast.hidden = true;
    }, 1800);
  }

  // Original score: 《余烬与星》. D Dorian, 88 BPM, 8 bars / 64 eighth notes.
  // One scheduling clock; music never follows simulation speed or attack count.
  const MUSIC_PREFERENCE_KEY = "ember-loop-ember-mobile-01-music-v1";
  const MUSIC_VOLUME_KEY = "ember-loop-ember-mobile-01-music-volume-v1";
  const MUSIC_VOICE_LIMIT = 6;
  const MUSIC_STEP_SECONDS = 60 / 88 / 2;
  const MUSIC_SCORE = Object.freeze({
    melody: [
      74, 0, 77, 76, 74, 0, 69, 0,
      71, 0, 74, 0, 79, 77, 76, 0,
      76, 0, 79, 0, 81, 79, 76, 0,
      77, 76, 74, 0, 69, 0, 72, 0,
      72, 0, 76, 77, 81, 0, 79, 0,
      79, 0, 76, 74, 71, 0, 76, 0,
      74, 0, 71, 0, 69, 71, 74, 76,
      77, 76, 74, 0, 69, 0, 74, 0
    ],
    chords: [[50, 57, 64], [55, 62, 69], [48, 55, 64], [50, 57, 65], [53, 60, 69], [52, 59, 67], [55, 62, 69], [50, 57, 64]],
    countermelody: [69, 71, 72, 69, 72, 71, 74, 69]
  });
  let musicEnabled = safeStorageGet(MUSIC_PREFERENCE_KEY) !== "0";
  const storedMusicVolume = safeStorageGet(MUSIC_VOLUME_KEY);
  let musicVolume = storedMusicVolume === null ? 0.62 : clamp(Number(storedMusicVolume) || 0, 0, 1);
  const musicState = {
    timer: null,
    playing: false,
    mode: "rest",
    level: 0,
    pendingLevel: 0,
    lowerLevelSince: null,
    step: 0,
    nextStepAt: 0,
    phrase: 0,
    context: null,
    voices: new Map(),
    nextVoiceId: 1,
    peakVoices: 0,
    scheduledNotes: 0,
    droppedNotes: 0,
    schedulerStarts: 0,
    duckCount: 0,
    duckUntil: 0,
    duckDepth: 1,
    pluckWave: null,
    hearthWave: null
  };

  function getMusicWantedState() {
    if (!musicEnabled || musicVolume <= 0 || soundMuted || lifecycleSuspended || document.hidden ||
        !audioContext || audioContext.state !== "running" || !audioGraph || !audioGraph.music || !run || !run.active || run.ended || run.paused ||
        run.choiceOpen || run.contractOpen || run.coreOpen || !run.waveStarted || run.transition) return { mode: "rest", level: 0 };
    let living = 0;
    let elite = false;
    let boss = false;
    (run.enemies || []).forEach(function musicThreat(enemy) {
      if (enemy.dead || enemy.health <= 0) return;
      living += 1;
      boss = boss || enemy.kind === "boss";
      elite = elite || Boolean(enemy.majorThreatKind) || ["switchGuard", "ashRam", "tidecaller", "artillery"].includes(enemy.kind);
    });
    const level = boss ? 3 : elite ? 2 : living >= 8 ? 1 : 0;
    return { mode: boss ? "boss" : elite ? "elite" : "combat", level: level };
  }

  function holdAudioParamAt(param, time) {
    if (!param) return;
    if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(time);
    else {
      if (typeof param.cancelScheduledValues === "function") param.cancelScheduledValues(time);
      setAudioParam(param, "setValueAtTime", Math.max(0.0001, Number(param.value) || 0.0001), time);
    }
  }

  function makeOriginalMusicWaves(audio) {
    if (musicState.context === audio) return;
    musicState.context = audio;
    musicState.pluckWave = null;
    musicState.hearthWave = null;
    if (typeof audio.createPeriodicWave !== "function") return;
    try {
      musicState.pluckWave = audio.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, 0.21, 0.10, 0.035, 0.015, 0.008]));
      musicState.hearthWave = audio.createPeriodicWave(new Float32Array(5), new Float32Array([0, 1, 0.055, 0.018, 0.004]));
    } catch (error) {}
  }

  function releaseMusicVoice(voice) {
    if (!voice || !musicState.voices.has(voice.id)) return;
    musicState.voices.delete(voice.id);
    if (voice.releaseTimer) clearTimeout(voice.releaseTimer);
    [voice.source, voice.gain].forEach(function disconnectFinishedMusicNode(node) {
      if (node && typeof node.disconnect === "function") {
        try { node.disconnect(); } catch (error) {}
      }
    });
  }

  function reapMusicVoices(now) {
    musicState.voices.forEach(function releaseElapsedMusicVoice(voice) {
      if (voice.end <= now) releaseMusicVoice(voice);
    });
  }

  function scheduleMusicNote(midi, start, duration, level, instrument) {
    if (!audioContext || !audioGraph || !audioGraph.music || musicState.voices.size >= MUSIC_VOICE_LIMIT) {
      musicState.droppedNotes += 1;
      return false;
    }
    const audio = audioContext;
    const source = audio.createOscillator();
    const noteGain = audio.createGain();
    const end = start + duration;
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);
    source.type = instrument === "pulse" ? "sine" : "triangle";
    const wave = instrument === "hearth" ? musicState.hearthWave : musicState.pluckWave;
    if (instrument !== "pulse" && wave && typeof source.setPeriodicWave === "function") source.setPeriodicWave(wave);
    setAudioParam(source.frequency, "setValueAtTime", frequency, start);
    const peak = Math.max(0.0002, level);
    const attack = instrument === "hearth" ? 0.16 : instrument === "pulse" ? 0.003 : 0.008;
    const tail = instrument === "hearth" ? 0.34 : Math.min(0.11, duration * 0.45);
    setAudioParam(noteGain.gain, "setValueAtTime", 0.0001, start);
    setAudioParam(noteGain.gain, "exponentialRampToValueAtTime", peak, start + Math.min(attack, duration * 0.3));
    setAudioParam(noteGain.gain, "exponentialRampToValueAtTime", Math.max(0.0002, peak * (instrument === "hearth" ? 0.80 : 0.21)), end - tail);
    setAudioParam(noteGain.gain, "exponentialRampToValueAtTime", 0.0001, end);
    source.connect(noteGain);
    noteGain.connect(audioGraph.music);
    const voice = { id: musicState.nextVoiceId++, source: source, gain: noteGain, start: start, end: end + 0.008, releaseTimer: null };
    musicState.voices.set(voice.id, voice);
    if (typeof source.addEventListener === "function") source.addEventListener("ended", function endedMusicNote() { releaseMusicVoice(voice); }, { once: true });
    source.start(start);
    source.stop(voice.end);
    voice.releaseTimer = window.setTimeout(function releaseMusicFallback() { releaseMusicVoice(voice); }, Math.ceil(Math.max(0, voice.end - audio.currentTime + 0.06) * 1000));
    musicState.scheduledNotes += 1;
    musicState.peakVoices = Math.max(musicState.peakVoices, musicState.voices.size);
    return true;
  }

  function scheduleMusicStep(step, start) {
    const bar = Math.floor(step / 8) % 8;
    const beat = step % 8;
    const chord = MUSIC_SCORE.chords[bar];
    const level = musicState.level;
    const melody = MUSIC_SCORE.melody[step % 64];
    // The melodic line owns admission first; no chord can steal its voice.
    if (melody) scheduleMusicNote(melody, start, 0.51, 0.145 + level * 0.008, "pluck");
    if (beat === 0 || beat === 4) {
      scheduleMusicNote(chord[0], start, 1.15, 0.14, "hearth");
      scheduleMusicNote(chord[beat === 0 ? 1 : 2], start, 1.15, 0.095, "hearth");
    }
    // A restrained wooden heartbeat is present even in the calm arrangement.
    if (beat === 0 || beat === 4 || (level >= 2 && beat === 6)) {
      scheduleMusicNote(48, start + 0.010, 0.065, level >= 2 ? 0.070 : 0.040, "pulse");
    }
    if (level >= 1 && (beat === 2 || beat === 6)) scheduleMusicNote(chord[(beat / 2) % 3] + 12, start, 0.21, 0.062, "pluck");
    if (level >= 2 && beat === 7) scheduleMusicNote(chord[1] + 12, start, 0.19, 0.053, "pluck");
    // The upper answering phrase arrives after the first complete loop.
    if (level >= 3 && beat === 3) scheduleMusicNote(MUSIC_SCORE.countermelody[bar] + (musicState.phrase % 2 ? 12 : 0), start, 0.38, 0.062, "pluck");
  }

  function stopAdaptiveMusic(immediate) {
    if (musicState.timer !== null) { clearTimeout(musicState.timer); musicState.timer = null; }
    musicState.duckUntil = 0;
    musicState.duckDepth = 1;
    if (!musicState.playing && !musicState.voices.size) return;
    const now = audioContext ? audioContext.currentTime : 0;
    const fade = immediate ? 0 : 0.09;
    musicState.playing = false;
    musicState.mode = "rest";
    if (audioGraph && audioGraph.music) {
      holdAudioParamAt(audioGraph.music.gain, now);
      setAudioParam(audioGraph.music.gain, "linearRampToValueAtTime", 0.0001, now + fade);
    }
    musicState.voices.forEach(function cancelMusicNote(voice) {
      // Stop before start cancels future lookahead notes rather than replaying them.
      const stopAt = voice.start > now ? now : now + fade;
      holdAudioParamAt(voice.gain.gain, now);
      setAudioParam(voice.gain.gain, "linearRampToValueAtTime", 0.0001, stopAt);
      try { voice.source.stop(stopAt); } catch (error) {}
      if (voice.releaseTimer) clearTimeout(voice.releaseTimer);
      if (immediate || voice.start > now) releaseMusicVoice(voice);
      else {
        voice.end = stopAt + 0.008;
        voice.releaseTimer = window.setTimeout(function releaseCancelledMusic() { releaseMusicVoice(voice); }, Math.ceil((fade + 0.04) * 1000));
      }
    });
    musicState.nextStepAt = 0;
  }

  function updateMusicIntensity(wanted, now) {
    musicState.mode = wanted.mode;
    if (wanted.level >= musicState.pendingLevel) {
      musicState.pendingLevel = wanted.level;
      musicState.lowerLevelSince = null;
    } else if (musicState.lowerLevelSince === null) musicState.lowerLevelSince = now;
    else if (now - musicState.lowerLevelSince >= 1.8) {
      musicState.pendingLevel = wanted.level;
      musicState.lowerLevelSince = null;
    }
  }

  function adaptiveMusicScheduler() {
    musicState.timer = null;
    const wanted = getMusicWantedState();
    if (wanted.mode === "rest") { stopAdaptiveMusic(false); return; }
    const now = audioContext.currentTime;
    reapMusicVoices(now);
    updateMusicIntensity(wanted, now);
    if (musicState.nextStepAt < now - 0.08) musicState.nextStepAt = now + 0.025;
    while (musicState.nextStepAt < now + 0.14) {
      if (musicState.step % 2 === 0) musicState.level = musicState.pendingLevel;
      scheduleMusicStep(musicState.step, musicState.nextStepAt);
      musicState.nextStepAt += MUSIC_STEP_SECONDS;
      musicState.step = (musicState.step + 1) % 64;
      if (musicState.step === 0) musicState.phrase += 1;
    }
    musicState.timer = window.setTimeout(adaptiveMusicScheduler, 40);
  }

  function syncAdaptiveMusic() {
    const wanted = getMusicWantedState();
    if (wanted.mode === "rest") {
      if (musicState.playing || musicState.timer !== null) stopAdaptiveMusic(false);
      return;
    }
    if (musicState.playing) return;
    makeOriginalMusicWaves(audioContext);
    musicState.playing = true;
    musicState.mode = wanted.mode;
    musicState.pendingLevel = wanted.level;
    musicState.level = wanted.level;
    musicState.lowerLevelSince = null;
    musicState.nextStepAt = audioContext.currentTime + 0.045;
    musicState.schedulerStarts += 1;
    holdAudioParamAt(audioGraph.music.gain, audioContext.currentTime);
    setAudioParam(audioGraph.music.gain, "linearRampToValueAtTime", musicVolume * 0.60, audioContext.currentTime + 0.38);
    adaptiveMusicScheduler();
  }

  function duckMusicForEvent(start, eventName) {
    if (!audioGraph || !audioGraph.music || !musicState.playing) return;
    const critical = ["boss-windup", "elite-windup", "player-hurt", "player-death"].includes(eventName);
    const depth = critical ? 0.22 : 0.45;
    const recovery = eventName === "boss-windup" ? 0.62 : 0.36;
    const param = audioGraph.music.gain;
    const base = musicVolume * 0.60;
    musicState.duckDepth = start < musicState.duckUntil ? Math.min(musicState.duckDepth, depth) : depth;
    musicState.duckUntil = Math.max(musicState.duckUntil, start + recovery);
    musicState.duckCount += 1;
    holdAudioParamAt(param, start);
    setAudioParam(param, "linearRampToValueAtTime", Math.max(0.0001, base * musicState.duckDepth), start + 0.012);
    setAudioParam(param, "setValueAtTime", Math.max(0.0001, base * musicState.duckDepth), start + 0.10);
    setAudioParam(param, "linearRampToValueAtTime", Math.max(0.0001, base), musicState.duckUntil);
  }

  function updateMusicToggleUi() {
    [document.getElementById("music-toggle"), document.getElementById("pause-music-toggle")].forEach(function musicButton(button) {
      if (!button) return;
      button.textContent = musicEnabled ? "音乐 · 开" : "音乐 · 关";
      button.setAttribute("aria-pressed", musicEnabled ? "true" : "false");
      button.setAttribute("aria-label", musicEnabled ? "关闭背景音乐" : "开启背景音乐");
    });
    [document.getElementById("music-volume"), document.getElementById("pause-music-volume")].forEach(function musicSlider(slider) {
      if (slider) slider.value = String(Math.round(musicVolume * 100));
    });
  }

  function setMusicEnabled(nextEnabled) {
    musicEnabled = Boolean(nextEnabled);
    safeStorageSet(MUSIC_PREFERENCE_KEY, musicEnabled ? "1" : "0");
    if (!musicEnabled) stopAdaptiveMusic(false);
    else { primeAudio(); syncAdaptiveMusic(); }
    updateMusicToggleUi();
    return musicEnabled;
  }

  function setMusicVolume(nextVolume) {
    musicVolume = clamp(Number(nextVolume) || 0, 0, 1);
    safeStorageSet(MUSIC_VOLUME_KEY, String(musicVolume));
    if (musicVolume <= 0) stopAdaptiveMusic(false);
    else if (musicState.playing && audioGraph && audioGraph.music) {
      const now = audioContext.currentTime;
      holdAudioParamAt(audioGraph.music.gain, now);
      setAudioParam(audioGraph.music.gain, "linearRampToValueAtTime", musicVolume * 0.60 * (now < musicState.duckUntil ? musicState.duckDepth : 1), now + 0.10);
      if (now < musicState.duckUntil) setAudioParam(audioGraph.music.gain, "linearRampToValueAtTime", musicVolume * 0.60, musicState.duckUntil);
    } else syncAdaptiveMusic();
    updateMusicToggleUi();
    return musicVolume;
  }

  function getMusicDiagnosticsSnapshot() {
    return {
      schema: "hearth-score-v1", title: "余烬与星", enabled: musicEnabled, volume: musicVolume,
      playing: musicState.playing, mode: musicState.mode, intensity: musicState.level,
      activeVoices: musicState.voices.size, peakVoices: musicState.peakVoices, voiceLimit: MUSIC_VOICE_LIMIT,
      scheduledNotes: musicState.scheduledNotes, droppedNotes: musicState.droppedNotes,
      timerActive: musicState.timer !== null, schedulerStarts: musicState.schedulerStarts, duckCount: musicState.duckCount,
      tempo: 88, key: "D Dorian", bars: 8, lookaheadMs: 140, schedulerMs: 40,
      speedIndependent: true, route: "M>master", networkDependencies: 0
    };
  }

  function createAudioDiagnostics() {
    return {
      requestedByEvent: Object.create(null),
      startedByEvent: Object.create(null),
      droppedByEvent: Object.create(null),
      requestedByLayer: { S: 0, A: 0, B: 0 },
      startedByLayer: { S: 0, A: 0, B: 0 },
      droppedByLayer: { S: 0, A: 0, B: 0 },
      droppedByReason: Object.create(null),
      peakVoices: 0,
      peakByLayer: { S: 0, A: 0, B: 0 },
      voiceSteals: 0,
      directDestinationConnections: 0,
      waveClearStartsByWave: Object.create(null),
      recent: []
    };
  }

  function createFeedbackDiagnostics() {
    return {
      peakParticles: 0,
      spawnedByClass: Object.create(null),
      spawnedByEvent: Object.create(null),
      droppedByClass: Object.create(null),
      droppedByEvent: Object.create(null),
      evictedByClass: Object.create(null),
      criticalEvicted: 0,
      cameraShakeApplied: 0,
      playerMinimumRenderedAlpha: 1,
      trailParticlesSpawned: 0,
      recent: []
    };
  }

  function incrementDiagnostic(bucket, key, amount) {
    bucket[key] = (bucket[key] || 0) + (amount === undefined ? 1 : amount);
  }

  function audioTone(type, from, to, duration, gain, offset) {
    return {
      type: type === "sine" ? "sine" : "triangle",
      from: from,
      to: to,
      duration: duration,
      gain: gain,
      offset: offset || 0
    };
  }

  function audioNoise(from, to, duration, gain, offset, filterType, q) {
    const resolvedFilterType = ["lowpass", "highpass"].includes(filterType) ? filterType : "bandpass";
    return {
      from: from,
      to: to,
      duration: duration,
      gain: gain,
      offset: offset || 0,
      filterType: resolvedFilterType,
      q: Number.isFinite(q) ? q : resolvedFilterType === "lowpass" ? 0.72 : resolvedFilterType === "highpass" ? 0.82 : 1.35
    };
  }

  function audioEventSpec(name, variant) {
    const definitions = {
      "player-death": {
        layer: "S", priority: 0,
        tones: [audioTone("triangle", 820, 620, 0.14, 0.14, 0), audioTone("sine", 620, 440, 0.26, 0.10, 0.10)],
        noises: [audioNoise(3600, 1800, 0.035, 0.065, 0, "highpass")]
      },
      "boss-enter": {
        layer: "S", priority: 0,
        tones: [audioTone("triangle", 560, 720, 0.12, 0.13, 0), audioTone("sine", 720, 960, 0.15, 0.14, 0.08)],
        noises: [audioNoise(3200, 2200, 0.018, 0.045, 0, "highpass")]
      },
      "boss-windup": {
        layer: "S", priority: 0,
        tones: [
          audioTone("triangle", 720, 760, 0.038, 0.12, 0),
          audioTone("triangle", 960, 1020, 0.038, 0.13, 0.062),
          audioTone("triangle", 1280, 1360, 0.045, 0.15, 0.124)
        ],
        noises: [audioNoise(4200, 3000, 0.012, 0.040, 0.124, "highpass")]
      },
      "boss-phase": {
        layer: "S", priority: 0,
        tones: [audioTone("triangle", 660, 720, 0.07, 0.13, 0), audioTone("triangle", 990, 1080, 0.10, 0.14, 0.09)],
        noises: [audioNoise(3800, 2400, 0.018, 0.055, 0, "highpass")]
      },
      "boss-defeat": {
        layer: "S", priority: 0,
        tones: [audioTone("triangle", 1100, 880, 0.09, 0.14, 0), audioTone("sine", 880, 520, 0.28, 0.10, 0.08)],
        noises: [audioNoise(3800, 1600, 0.04, 0.060, 0, "highpass")]
      },
      "relay-ignite": {
        layer: "S", priority: 0,
        tones: [audioTone("sine", 523, 554, 0.11, 0.12, 0), audioTone("sine", 659, 698, 0.12, 0.13, 0.08), audioTone("triangle", 880, 1046, 0.15, 0.14, 0.16)],
        noises: [audioNoise(2800, 4000, 0.018, 0.032, 0.16, "bandpass", 1.6)]
      },
      "player-hurt": {
        layer: "S", priority: 1, minimumGap: 0.15,
        tones: [audioTone("triangle", 560, 590, 0.055, 0.13, 0)],
        noises: [audioNoise(3400, 1400, 0.028, 0.060, 0, "highpass")]
      },
      "elite-enter": {
        layer: "S", priority: 2,
        tones: [audioTone("triangle", 720, 780, 0.06, 0.105, 0), audioTone("triangle", 960, 1040, 0.065, 0.11, 0.06)],
        noises: [audioNoise(3000, 2000, 0.014, 0.030, 0, "highpass")]
      },
      "elite-windup": {
        layer: "S", priority: 2,
        tones: [audioTone("triangle", 780, 840, 0.045, 0.11, 0), audioTone("triangle", 1040, 1160, 0.052, 0.12, 0.06)],
        noises: []
      },
      "wave-clear": {
        layer: "A", priority: 0,
        tones: [audioTone("sine", 659, 659, 0.08, 0.105, 0), audioTone("sine", 880, 880, 0.08, 0.105, 0.08), audioTone("triangle", 1046, 1046, 0.105, 0.11, 0.16)],
        noises: [audioNoise(3200, 2400, 0.012, 0.035, 0.16, "highpass")]
      },
      "flash-complete": variant === "backfire"
        ? {
          layer: "A", priority: 1,
          tones: [audioTone("triangle", 620, 980, 0.11, 0.125, 0.018)],
          noises: [audioNoise(3400, 1500, 0.034, 0.085, 0, "bandpass", 0.75)]
        }
        : {
          layer: "A", priority: 1,
          tones: [audioTone("triangle", 820, 680, 0.085, 0.115, 0.012)],
          noises: [audioNoise(3200, 1400, 0.028, 0.080, 0, "bandpass", 0.75)]
        },
      "elite-break": {
        layer: "A", priority: 1, minimumGap: 0.18,
        tones: [audioTone("triangle", 1280, 1050, 0.04, 0.12, 0.004)],
        noises: [audioNoise(5000, 2600, 0.014, 0.070, 0, "highpass")]
      },
      "elite-defeat": {
        layer: "A", priority: 1,
        tones: [audioTone("triangle", 980, 1320, 0.08, 0.105, 0)],
        noises: [audioNoise(3200, 2600, 0.012, 0.034, 0, "highpass")]
      },
      "heavy-impact": {
        layer: "A", priority: 2, minimumGap: 0.25,
        tones: [audioTone("triangle", 1280, 1100, 0.034, 0.125, 0), audioTone("triangle", 680, 680, 0.023, 0.055, 0)],
        noises: [audioNoise(2800, 1600, 0.021, 0.095, 0, "bandpass", 0.85)]
      },
      "impact-hit": {
        layer: "B", priority: 3, minimumGap: 0.12, deterministicVariation: true,
        tones: [audioTone("triangle", 940, 790, 0.016, 0.048, 0)],
        noises: [audioNoise(2400, 1350, 0.012, 0.058, 0, "bandpass", 0.85)]
      },
      "weapon-cycle": variant === "fireflyBranch"
        ? {
          layer: "B", priority: 2, minimumGap: 0.25, deterministicVariation: true,
          tones: [audioTone("sine", 1320, 1440, 0.018, 0.044, 0), audioTone("sine", 1580, 1720, 0.016, 0.038, 0.024)],
          noises: [audioNoise(3600, 4600, 0.008, 0.018, 0.024, "bandpass", 1.7)]
        }
        : variant === "hearthSeed"
          ? {
            layer: "B", priority: 2, minimumGap: 0.25, deterministicVariation: true,
            tones: [audioTone("triangle", 760, 810, 0.03, 0.052, 0)],
            noises: [audioNoise(1900, 2500, 0.012, 0.025, 0, "bandpass", 1.5)]
          }
          : variant === "cinderRing"
            ? {
              layer: "B", priority: 2, minimumGap: 0.25, deterministicVariation: true,
              tones: [audioTone("triangle", 920, 1020, 0.028, 0.052, 0)],
              noises: [audioNoise(2400, 2200, 0.01, 0.022, 0, "bandpass", 1.6)]
            }
            : {
              layer: "B", priority: 2, minimumGap: 0.25, deterministicVariation: true,
              tones: [audioTone("triangle", 1650, 1480, 0.018, 0.055, 0)],
              noises: [audioNoise(3600, 2300, 0.010, 0.034, 0, "bandpass", 0.80)]
            }
    };
    return definitions[name] || null;
  }

  function hashAudioCause(value) {
    const text = String(value || "audio");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function deterministicAudioVariation(spec, causeId, eventName) {
    if (!spec.deterministicVariation) return { pitch: 1, gain: 1, duration: 1, hash: hashAudioCause(causeId || eventName) };
    const hash = hashAudioCause((causeId || eventName) + ":v2");
    const pitchCents = (hash % 31) - 15;
    const gainDb = ((hash >>> 8) % 151) / 100 - 0.75;
    const duration = 0.95 + ((hash >>> 16) % 101) / 1000;
    return {
      pitch: Math.pow(2, pitchCents / 1200),
      gain: Math.pow(10, gainDb / 20),
      duration: duration,
      hash: hash
    };
  }

  function createAudioNoiseBuffer(audio) {
    if (!audio || typeof audio.createBuffer !== "function") return null;
    try {
      const sampleRate = Math.max(8000, Number(audio.sampleRate) || 48000);
      const buffer = audio.createBuffer(1, Math.ceil(sampleRate * 0.25), sampleRate);
      const data = buffer.getChannelData(0);
      let state = 0x6d2b79f5;
      for (let index = 0; index < data.length; index += 1) {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        data[index] = (state >>> 0) / 2147483647.5 - 1;
      }
      return buffer;
    } catch (error) {
      return null;
    }
  }

  function setAudioParam(param, method, value, time) {
    if (!param) return;
    if (typeof param[method] === "function") param[method](value, time);
    else param.value = value;
  }

  function ensureAudioGraph(audio) {
    if (!audio) return null;
    if (audioGraph && audioGraph.context === audio) return audioGraph;
    try {
      const buses = { S: audio.createGain(), A: audio.createGain(), B: audio.createGain() };
      const master = audio.createGain();
      const musicBus = audio.createGain();
      musicBus.gain.value = 0.0001;
      musicBus.connect(master);
      const compressor = audio.createDynamicsCompressor();
      Object.keys(buses).forEach(function connectLayer(layer) {
        buses[layer].gain.value = AUDIO_LAYER_BASE_GAINS[layer];
        buses[layer].connect(master);
      });
      master.gain.value = 0.50;
      if (compressor.threshold) compressor.threshold.value = -9;
      if (compressor.knee) compressor.knee.value = 8;
      if (compressor.ratio) compressor.ratio.value = 3;
      if (compressor.attack) compressor.attack.value = 0.010;
      if (compressor.release) compressor.release.value = 0.14;
      master.connect(compressor);
      compressor.connect(audio.destination);
      audioGraph = {
        context: audio,
        buses: buses,
        music: musicBus,
        master: master,
        compressor: compressor,
        noiseBuffer: createAudioNoiseBuffer(audio)
      };
      audioDiagnostics.directDestinationConnections = 0;
      return audioGraph;
    } catch (error) {
      audioGraph = null;
      return null;
    }
  }

  function primeAudio() {
    if (soundMuted) return null;
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    try {
      if (!audioContext || audioContext.state === "closed") {
        stopAdaptiveMusic(true);
        audioContext = new AudioContextConstructor();
        audioGraph = null;
      }
      ensureAudioGraph(audioContext);
      if (audioContext.state === "suspended") audioContext.resume().catch(function ignoreResumeError() {});
      return audioContext;
    } catch (error) {
      return null;
    }
  }

  function activeVoicesByLayer() {
    const counts = { S: 0, A: 0, B: 0 };
    activeAudioVoices.forEach(function countVoice(voice) { counts[voice.layer] += 1; });
    return counts;
  }

  function releaseAudioVoice(voice, disconnectDelayMs) {
    if (!voice || !activeAudioVoices.has(voice.id)) return;
    activeAudioVoices.delete(voice.id);
    if (voice.releaseTimer) clearTimeout(voice.releaseTimer);
    activeSoundVoices = activeAudioVoices.size;
    function disconnectReleasedVoice() {
      (voice.nodes || []).concat(voice.outputGain || []).forEach(function disconnectAudioNode(node) {
        if (node && typeof node.disconnect === "function") {
          try { node.disconnect(); } catch (error) {}
        }
      });
    }
    if (disconnectDelayMs > 0) window.setTimeout(disconnectReleasedVoice, disconnectDelayMs);
    else disconnectReleasedVoice();
  }

  function fadeAndStopAudioVoice(voice) {
    if (!voice) return;
    const now = audioContext ? audioContext.currentTime : 0;
    const fadeEnd = now + 0.006;
    const outputParam = voice.outputGain && voice.outputGain.gain;
    if (outputParam) {
      try {
        if (typeof outputParam.cancelAndHoldAtTime === "function") {
          outputParam.cancelAndHoldAtTime(now);
        } else {
          if (typeof outputParam.cancelScheduledValues === "function") outputParam.cancelScheduledValues(now);
          setAudioParam(outputParam, "setValueAtTime", Math.max(0.0001, Number(outputParam.value) || voice.outputLevel || 1), now);
        }
        setAudioParam(outputParam, "exponentialRampToValueAtTime", 0.0001, fadeEnd);
      } catch (error) {}
    }
    (voice.sources || []).forEach(function stopFadedSource(source) {
      try { source.stop(fadeEnd + 0.002); } catch (error) {}
    });
    releaseAudioVoice(voice, 12);
  }

  function stealAudioVoice(preferredLayers) {
    let candidate = null;
    preferredLayers.some(function findLayer(layer) {
      const matches = Array.from(activeAudioVoices.values()).filter(function matchingVoice(voice) { return voice.layer === layer; });
      matches.sort(function lowestValueFirst(first, second) {
        return second.priority - first.priority || first.startedAt - second.startedAt;
      });
      candidate = matches[0] || null;
      return Boolean(candidate);
    });
    if (!candidate) return false;
    fadeAndStopAudioVoice(candidate);
    audioDiagnostics.voiceSteals += 1;
    return true;
  }

  function admitAudioVoice(layer) {
    let counts = activeVoicesByLayer();
    if (layer === "S") {
      while (activeAudioVoices.size >= AUDIO_TOTAL_VOICE_LIMIT && stealAudioVoice(["B", "A", "S"])) counts = activeVoicesByLayer();
      while (counts.S >= AUDIO_LAYER_LIMITS.S && stealAudioVoice(["S"])) counts = activeVoicesByLayer();
      return activeAudioVoices.size < AUDIO_TOTAL_VOICE_LIMIT && counts.S < AUDIO_LAYER_LIMITS.S;
    }
    if (counts[layer] >= AUDIO_LAYER_LIMITS[layer]) return false;
    if (counts.A + counts.B >= AUDIO_NONCRITICAL_VOICE_LIMIT) return false;
    return activeAudioVoices.size < AUDIO_TOTAL_VOICE_LIMIT;
  }

  function duckAudioForCritical(start, eventName) {
    if (!audioGraph) return;
    duckMusicForEvent(start, eventName);
    const bGain = audioGraph.buses.B.gain;
    if (typeof bGain.cancelScheduledValues === "function") bGain.cancelScheduledValues(start);
    setAudioParam(bGain, "setValueAtTime", AUDIO_LAYER_BASE_GAINS.B, start);
    setAudioParam(bGain, "linearRampToValueAtTime", AUDIO_LAYER_BASE_GAINS.B * 0.355, start + 0.01);
    setAudioParam(bGain, "setValueAtTime", AUDIO_LAYER_BASE_GAINS.B * 0.355, start + 0.04);
    setAudioParam(bGain, "linearRampToValueAtTime", AUDIO_LAYER_BASE_GAINS.B, start + 0.24);
    if (eventName !== "boss-windup") return;
    const aGain = audioGraph.buses.A.gain;
    if (typeof aGain.cancelScheduledValues === "function") aGain.cancelScheduledValues(start);
    setAudioParam(aGain, "setValueAtTime", AUDIO_LAYER_BASE_GAINS.A, start);
    setAudioParam(aGain, "linearRampToValueAtTime", AUDIO_LAYER_BASE_GAINS.A * 0.631, start + 0.01);
    setAudioParam(aGain, "setValueAtTime", AUDIO_LAYER_BASE_GAINS.A * 0.631, start + 0.04);
    setAudioParam(aGain, "linearRampToValueAtTime", AUDIO_LAYER_BASE_GAINS.A, start + 0.24);
  }

  function recordAudioDrop(entry, reason) {
    entry.droppedReason = reason;
    incrementDiagnostic(audioDiagnostics.droppedByEvent, entry.event);
    audioDiagnostics.droppedByLayer[entry.layer] += 1;
    incrementDiagnostic(audioDiagnostics.droppedByReason, reason);
    return false;
  }

  function scheduleAudioEnvelope(param, start, duration, peak, noiseLike) {
    const end = start + duration;
    const attack = Math.min(noiseLike ? 0.0007 : 0.0015, duration * 0.18);
    const release = Math.min(noiseLike ? 0.006 : 0.018, duration * 0.42);
    const decayAt = Math.max(start + attack, end - release);
    setAudioParam(param, "setValueAtTime", 0.0001, start);
    setAudioParam(param, "exponentialRampToValueAtTime", Math.max(0.0002, peak), start + attack);
    if (decayAt > start + attack + 0.001) {
      setAudioParam(param, "exponentialRampToValueAtTime", Math.max(0.0002, peak * (noiseLike ? 0.16 : 0.42)), decayAt);
    }
    setAudioParam(param, "exponentialRampToValueAtTime", 0.0001, end);
  }

  function createAudioToneSource(audio, voiceGain, tone, start, variation, sourceRecords) {
    const duration = tone.duration * variation.duration;
    const toneStart = start + tone.offset * variation.duration;
    const toneEnd = toneStart + duration;
    const componentGain = audio.createGain();
    const oscillator = audio.createOscillator();
    oscillator.type = tone.type === "sine" ? "sine" : "triangle";
    scheduleAudioEnvelope(componentGain.gain, toneStart, duration, tone.gain, false);
    setAudioParam(oscillator.frequency, "setValueAtTime", Math.max(80, tone.from * variation.pitch), toneStart);
    setAudioParam(oscillator.frequency, "exponentialRampToValueAtTime", Math.max(80, tone.to * variation.pitch), toneEnd);
    oscillator.connect(componentGain);
    componentGain.connect(voiceGain);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.008);
    sourceRecords.push({ source: oscillator, end: toneEnd + 0.008, nodes: [oscillator, componentGain] });
  }

  function createAudioNoiseSource(audio, voiceGain, noise, start, variation, noiseIndex, sourceRecords) {
    if (!audioGraph || !audioGraph.noiseBuffer || typeof audio.createBufferSource !== "function") return;
    const duration = noise.duration * variation.duration;
    const noiseStart = start + noise.offset * variation.duration;
    const noiseEnd = noiseStart + duration;
    const componentGain = audio.createGain();
    const source = audio.createBufferSource();
    source.buffer = audioGraph.noiseBuffer;
    scheduleAudioEnvelope(componentGain.gain, noiseStart, duration, noise.gain, true);
    let inputNode = source;
    const ownedNodes = [source, componentGain];
    if (typeof audio.createBiquadFilter === "function") {
      const filter = audio.createBiquadFilter();
      filter.type = ["lowpass", "highpass"].includes(noise.filterType) ? noise.filterType : "bandpass";
      const nyquistSafe = Math.max(1000, (Number(audio.sampleRate) || 48000) * 0.45);
      setAudioParam(filter.frequency, "setValueAtTime", Math.min(nyquistSafe, noise.from * variation.pitch), noiseStart);
      setAudioParam(filter.frequency, "exponentialRampToValueAtTime", Math.min(nyquistSafe, noise.to * variation.pitch), noiseEnd);
      if (filter.Q) filter.Q.value = noise.q;
      source.connect(filter);
      inputNode = filter;
      ownedNodes.push(filter);
    }
    inputNode.connect(componentGain);
    componentGain.connect(voiceGain);
    const availableOffset = Math.max(0, audioGraph.noiseBuffer.duration - duration - 0.001);
    const offsetUnit = ((variation.hash + noiseIndex * 2654435761) >>> 0) / 4294967295;
    source.start(noiseStart, availableOffset * offsetUnit);
    source.stop(noiseEnd + 0.008);
    sourceRecords.push({ source: source, end: noiseEnd + 0.008, nodes: ownedNodes });
  }

  function getAudioSpecDuration(spec, variation) {
    let duration = 0.02;
    (spec.tones || []).forEach(function toneDuration(tone) {
      duration = Math.max(duration, (tone.offset + tone.duration) * variation.duration);
    });
    (spec.noises || []).forEach(function noiseDuration(noise) {
      duration = Math.max(duration, (noise.offset + noise.duration) * variation.duration);
    });
    return duration;
  }

  function requestAudioEvent(eventName, options) {
    const settings = options && typeof options === "object" ? options : {};
    const variant = typeof settings.variant === "string" ? settings.variant : null;
    const spec = audioEventSpec(eventName, variant);
    if (!spec) return false;
    const now = performance.now() / 1000;
    const entry = {
      event: eventName,
      variant: variant,
      layer: spec.layer,
      causeId: typeof settings.causeId === "string" ? settings.causeId.slice(0, 96) : null,
      requestedAt: now,
      startedAt: null,
      droppedReason: null
    };
    incrementDiagnostic(audioDiagnostics.requestedByEvent, eventName);
    audioDiagnostics.requestedByLayer[spec.layer] += 1;
    audioDiagnostics.recent.push(entry);
    if (audioDiagnostics.recent.length > 64) audioDiagnostics.recent.shift();
    if (entry.causeId) {
      const causeKey = eventName + ":" + entry.causeId;
      if (audioCauseIds.has(causeKey)) return recordAudioDrop(entry, "duplicate-cause");
      audioCauseIds.add(causeKey);
      audioCauseOrder.push(causeKey);
      if (audioCauseOrder.length > 192) audioCauseIds.delete(audioCauseOrder.shift());
    }
    if (spec.layer === "B" && run && audioClosedWave === run.wave && !run.waveStarted) return recordAudioDrop(entry, "wave-closed");
    const gapKey = eventName;
    if (spec.minimumGap && now - (audioLastStartedAt[gapKey] || -Infinity) + 1e-9 < spec.minimumGap) return recordAudioDrop(entry, "rate-limit");
    const audio = primeAudio();
    if (!audio) return recordAudioDrop(entry, soundMuted ? "muted" : "audio-unavailable");
    if (audio.state !== "running") return recordAudioDrop(entry, "context-suspended");
    if (!audioGraph || !admitAudioVoice(spec.layer)) return recordAudioDrop(entry, "voice-budget");
    const intensity = clamp(Number(settings.strength) || 1, 0.25, 1.5);
    const delay = clamp(Number(settings.delay) || 0, 0, 0.5);
    const start = audio.currentTime + delay;
    const variation = deterministicAudioVariation(spec, entry.causeId, eventName);
    const duration = getAudioSpecDuration(spec, variation);
    const voiceGain = audio.createGain();
    const outputLevel = intensity * variation.gain;
    const sourceRecords = [];
    setAudioParam(voiceGain.gain, "setValueAtTime", outputLevel, start);
    voiceGain.connect(audioGraph.buses[spec.layer]);
    (spec.tones || []).forEach(function createTone(tone) {
      createAudioToneSource(audio, voiceGain, tone, start, variation, sourceRecords);
    });
    (spec.noises || []).forEach(function createNoise(noise, noiseIndex) {
      createAudioNoiseSource(audio, voiceGain, noise, start, variation, noiseIndex, sourceRecords);
    });
    const voice = {
      id: nextAudioVoiceId++,
      event: eventName,
      layer: spec.layer,
      priority: spec.priority,
      startedAt: now + delay,
      sources: sourceRecords.map(function voiceSource(record) { return record.source; }),
      nodes: sourceRecords.reduce(function voiceNodes(nodes, record) { return nodes.concat(record.nodes || []); }, []),
      outputGain: voiceGain,
      outputLevel: outputLevel,
      releaseTimer: null
    };
    activeAudioVoices.set(voice.id, voice);
    activeSoundVoices = activeAudioVoices.size;
    voice.releaseTimer = window.setTimeout(function releaseScheduledVoice() { releaseAudioVoice(voice); }, Math.ceil((delay + duration + 0.04) * 1000));
    const finalSource = sourceRecords.slice().sort(function latestSource(first, second) { return second.end - first.end; })[0];
    if (finalSource && typeof finalSource.source.addEventListener === "function") {
      finalSource.source.addEventListener("ended", function endedVoice() { releaseAudioVoice(voice); }, { once: true });
    }
    if (spec.layer === "S") duckAudioForCritical(start, eventName);
    audioLastStartedAt[gapKey] = now;
    entry.startedAt = now + delay;
    incrementDiagnostic(audioDiagnostics.startedByEvent, eventName);
    audioDiagnostics.startedByLayer[spec.layer] += 1;
    const activeByLayer = activeVoicesByLayer();
    audioDiagnostics.peakVoices = Math.max(audioDiagnostics.peakVoices, activeAudioVoices.size);
    Object.keys(activeByLayer).forEach(function trackLayerPeak(layer) {
      audioDiagnostics.peakByLayer[layer] = Math.max(audioDiagnostics.peakByLayer[layer], activeByLayer[layer]);
    });
    if (eventName === "wave-clear" && Number.isSafeInteger(settings.wave)) incrementDiagnostic(audioDiagnostics.waveClearStartsByWave, String(settings.wave));
    return true;
  }

  function setSoundMuted(nextMuted) {
    const wasMuted = soundMuted;
    soundMuted = Boolean(nextMuted);
    if (soundMuted) {
      stopAdaptiveMusic(true);
      Array.from(activeAudioVoices.values()).forEach(function stopMutedVoice(voice) { fadeAndStopAudioVoice(voice); });
    }
    safeStorageSet(MUTE_PREFERENCE_KEY, soundMuted ? "1" : "0");
    if (soundMuted && audioContext && audioContext.state === "running") audioContext.suspend().catch(function ignoreSuspendError() {});
    // Rendering the initial home screen must not attempt autoplay.
    if (!soundMuted && (wasMuted || audioContext)) primeAudio();
    [dom.muteButton, dom.pauseMuteButton].forEach(function updateSoundToggle(button) {
      if (!button) return;
      button.textContent = soundMuted ? "静音" : "声音";
      button.setAttribute("aria-pressed", soundMuted ? "true" : "false");
      button.setAttribute("aria-label", soundMuted ? "开启声音" : "关闭声音");
    });
  }

  function setAutoSwitchEnabled(nextEnabled, options) {
    const settings = options && typeof options === "object" ? options : {};
    const enabled = Boolean(nextEnabled);
    const priorRunValue = run ? run.autoSwitch === true : autoSwitchEnabled;
    autoSwitchEnabled = enabled;
    if (settings.persist !== false && !safeStorageSet(AUTO_SWITCH_PREFERENCE_KEY, enabled ? "1" : "0")) showStorageNotice();
    if (run && run.mode !== "tutorial") {
      run.autoSwitch = enabled;
      if (enabled && !priorRunValue) {
        const inactiveId = getInactiveWeaponId();
        run.autoSwitchRequiresHeatReset = (run.weaponHeat[inactiveId] || 0) >= 0.995;
      }
      if (!enabled) run.autoSwitchRequiresHeatReset = false;
    }
    if (dom.autoSwapToggle) {
      dom.autoSwapToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
      dom.autoSwapToggle.setAttribute("aria-label", "自动换火已" + (enabled ? "开启，点击关闭" : "关闭，点击开启"));
      dom.autoSwapToggle.classList.toggle("is-off", !enabled);
      const label = dom.autoSwapToggle.querySelector("span");
      if (label) label.textContent = enabled ? "开启" : "关闭";
    }
    if (dom.pauseAutoSwapToggle) {
      dom.pauseAutoSwapToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
      dom.pauseAutoSwapToggle.setAttribute("aria-label", "自动换火已" + (enabled ? "开启，点击关闭" : "关闭，点击开启"));
      dom.pauseAutoSwapToggle.textContent = "自动换火 · " + (enabled ? "开" : "关");
      dom.pauseAutoSwapToggle.classList.toggle("is-off", !enabled);
    }
    if (settings.announce === true) showToast(enabled ? "自动换火已开启" : "自动换火已关闭 · 满热后由你决定");
    return enabled;
  }

  function setVibrationEnabled(nextEnabled) {
    vibrationEnabled = Boolean(nextEnabled);
    safeStorageSet(VIBRATION_PREFERENCE_KEY, vibrationEnabled ? "1" : "0");
    if (!dom.vibrationButton) return vibrationEnabled;
    const supported = typeof navigator.vibrate === "function";
    dom.vibrationButton.disabled = !supported;
    dom.vibrationButton.textContent = supported ? (vibrationEnabled ? "震动" : "无震") : "无震动";
    dom.vibrationButton.setAttribute("aria-pressed", vibrationEnabled && supported ? "true" : "false");
    dom.vibrationButton.setAttribute("aria-label", supported
      ? (vibrationEnabled ? "关闭震动" : "开启震动")
      : "此设备不支持网页震动");
    return vibrationEnabled;
  }

  function updateReducedMotionPreference(event) {
    reducedMotion = Boolean(event && event.matches);
    if (reducedMotion && run) run.screenShake = 0;
  }

  function pulseVibration(pattern) {
    if (!vibrationEnabled || typeof navigator.vibrate !== "function") return false;
    try {
      return navigator.vibrate(pattern) !== false;
    } catch (error) {
      return false;
    }
  }

  function getPlatformGameSnapshot() {
    return {
      schema: "ember-platform-game-v1",
      capturedAt: new Date().toISOString(),
      run: {
        active: Boolean(run && run.active),
        paused: Boolean(run && run.paused),
        ended: Boolean(run && run.ended),
        mode: run ? run.mode : null,
        wave: run ? run.wave : null
      },
      input: {
        movePointerOwned: input.movePointerId !== null,
        abilityPointerOwned: input.abilityPointerId !== null,
        switchPointerOwned: input.switchPointerId !== null,
        heldKeys: pressedKeys.size,
        hasTarget: input.hasTarget
      },
      storage: { available: storageAvailable },
      audio: {
        muted: soundMuted,
        state: audioContext ? audioContext.state : "uninitialized",
        activeVoices: activeSoundVoices,
        music: getMusicDiagnosticsSnapshot()
      },
      controls: {
        autoSwitchEnabled: autoSwitchEnabled,
        runAutoSwitch: Boolean(run && run.autoSwitch)
      },
      haptics: {
        enabled: vibrationEnabled,
        supported: typeof navigator.vibrate === "function"
      },
      lifecycle: {
        pauseCount: lifecyclePauseCount,
        lastReason: lastLifecycleReason,
        lastAt: new Date(lastLifecycleAt).toISOString()
      }
    };
  }

  function emitPlatformEvent(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail }));
  }

  function emitPlatformAudioState() {
    emitPlatformEvent("ember:platform-audio-state", getPlatformGameSnapshot().audio);
  }

  function requestPlatformAudioResume() {
    const audio = primeAudio();
    if (!audio || audio.state !== "suspended") {
      emitPlatformAudioState();
      return;
    }
    audio.resume().catch(function ignorePlatformResumeError() {}).finally(emitPlatformAudioState);
  }

  function suspendForLifecycle(reason) {
    lastLifecycleReason = reason;
    lastLifecycleAt = Date.now();
    lifecyclePauseCount += 1;
    lifecycleSuspended = true;
    stopAdaptiveMusic(true);
    clearInput();
    if (run && run.active && !run.ended) {
      const decisionVisible = run.choiceOpen || run.contractOpen || run.coreOpen ||
        !dom.victoryOverlay.hidden || (dom.tutorialCompleteOverlay && !dom.tutorialCompleteOverlay.hidden);
      if (!decisionVisible) {
        run.paused = true;
        simulationAccumulator = 0;
        dom.pauseOverlay.hidden = false;
      }
    }
    // Progression writes are already atomic at their mutation sites. Rewriting
    // the whole in-memory profile during pagehide can clobber a newer save from
    // another tab (and makes lifecycle handling a surprising write source).
  }

  function recoverFromLifecycle(reason) {
    lastLifecycleReason = reason;
    lastLifecycleAt = Date.now();
    lifecycleSuspended = Boolean(document.hidden);
    releasePointerOwnership();
    resizeCanvas();
    emitPlatformAudioState();
  }

  function renderBearerChoices() {
    if (!dom.characterOptions) return;
    const unlockedIds = new Set(Logic.getUnlockedBearerIds(profile));
    dom.characterOptions.replaceChildren();
    Object.keys(Logic.BEARER_DEFS).forEach(function renderBearer(id) {
      const bearer = Logic.BEARER_DEFS[id];
      const unlocked = unlockedIds.has(id);
      const selected = profile.selectedBearerId === id;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-card bearer-option" + (selected ? " is-selected" : "") + (unlocked ? "" : " is-locked");
      button.dataset.optionId = id;
      button.style.setProperty("--bearer-color", bearer.color);
      button.disabled = !unlocked;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.setAttribute("aria-label", unlocked ? bearer.name + "，" + bearer.role : bearer.name + "，尚未解锁");
      button.innerHTML = "<span class=\"option-icon\">" + bearer.icon + "</span><strong>" + bearer.name.replace(/^[^·]+·/, "") + "</strong><small>" + bearer.role + "</small><em>" +
        (unlocked ? selected ? "已选" : "选择" : "未解锁") + "</em>";
      if (unlocked) button.addEventListener("click", function chooseBearer() {
        const selection = Logic.selectBearer(profile, id);
        if (!selection.selected) return;
        replaceCoreSave(selection.save);
        saveProfile();
        updateAccountUi();
        showToast("承火者已更换 · " + bearer.name);
      });
      dom.characterOptions.appendChild(button);
    });
    if (dom.bearerUnlockCount) dom.bearerUnlockCount.textContent = unlockedIds.size + " / " + Object.keys(Logic.BEARER_DEFS).length;
  }

  function renderLoadoutChoices() {
    if (!dom.weaponStyleOptions) return;
    dom.weaponStyleOptions.replaceChildren();
    Object.keys(Logic.LOADOUT_DEFS).forEach(function renderLoadout(id) {
      const loadout = Logic.LOADOUT_DEFS[id];
      const pair = getPairForLoadout(id);
      const pursuit = getWeaponDefinition(pair.pursuitWeaponId);
      const clearing = getWeaponDefinition(pair.clearingWeaponId);
      const selected = profile.selectedLoadoutId === id;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-card loadout-option" + (selected ? " is-selected" : "");
      button.dataset.optionId = id;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.setAttribute("aria-label", pair.name + "，" + pursuit.name + "与" + clearing.name + "，" + pair.description);
      button.innerHTML = "<span class=\"option-icon weapon-pair-icon\"><i>" + pursuit.shortName + "</i><i>" + clearing.shortName + "</i></span><strong>" + pair.name + "</strong><small>" + pursuit.name + " ＋ " + clearing.name + "<br>" + pair.description + "</small><em>" + (selected ? "已选" : "选择") + "</em>";
      button.addEventListener("click", function chooseLoadout() {
        const selection = Logic.selectLoadout(profile, id);
        if (!selection.selected) return;
        replaceCoreSave(selection.save);
        saveProfile();
        updateAccountUi();
        showToast("双武器 · " + pair.name);
      });
      dom.weaponStyleOptions.appendChild(button);
    });
  }

  function renderDangerChoices() {
    if (!dom.fireTraitOptions) return;
    dom.fireTraitOptions.replaceChildren();
    Object.keys(Logic.DANGER_DEFS).forEach(function renderDanger(key) {
      const danger = Logic.getDifficultyDefinition(key, REMAKE_CURVE_ID);
      const unlocked = danger.id <= profile.maxUnlockedDanger;
      const selected = profile.selectedDanger === danger.id;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-card danger-option" + (selected ? " is-selected" : "") + (unlocked ? "" : " is-locked");
      button.dataset.optionId = String(danger.id);
      button.disabled = !unlocked;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.setAttribute("aria-label", danger.name + "，" + (unlocked ? danger.description : "通关前一难度后解锁"));
      button.innerHTML = "<span class=\"option-icon\">" + danger.id + "</span><strong>" + danger.shortName + "</strong><small>" + danger.description + "</small><em>" + (unlocked ? selected ? "已选" : "选择" : "未解锁") + "</em>";
      if (unlocked) button.addEventListener("click", function chooseDanger() {
        const selection = Logic.selectDanger(profile, danger.id);
        if (!selection.selected) return;
        replaceCoreSave(selection.save);
        saveProfile();
        updateAccountUi();
      showToast("难度 " + danger.name + " · 纪录倍率 ×" + danger.scoreMultiplier.toFixed(2));
      });
      dom.fireTraitOptions.appendChild(button);
    });
    if (dom.dangerUnlockCount) dom.dangerUnlockCount.textContent = (profile.maxUnlockedDanger + 1) + " / " + Object.keys(Logic.DANGER_DEFS).length;
  }

  function renderAchievements() {
    if (!dom.achievementList) return;
    const earned = profile.classicAchievements || {};
    dom.achievementList.replaceChildren();
    Logic.ACHIEVEMENT_DEFS.forEach(function renderAchievement(achievement, index) {
      const card = document.createElement("div");
      card.className = "achievement-card" + (earned[achievement.id] ? " is-earned" : "");
      card.title = achievement.description + " " + achievement.unlock;
      card.innerHTML = "<b>" + (earned[achievement.id] ? "火" : String(index + 1)) + "</b><span><strong>" + achievement.name + "</strong><small>" +
        (earned[achievement.id] ? achievement.unlock : achievement.description) + "</small></span>";
      dom.achievementList.appendChild(card);
    });
    const count = Logic.ACHIEVEMENT_DEFS.filter(function earnedAchievement(item) { return Boolean(earned[item.id]); }).length;
    if (dom.achievementCount) dom.achievementCount.textContent = count + " / " + Logic.ACHIEVEMENT_DEFS.length;
    if (dom.drawerAchievementCount) dom.drawerAchievementCount.textContent = count + " / " + Logic.ACHIEVEMENT_DEFS.length;
  }

  function renderClassicRecords() {
    if (!dom.classicRecordMatrix) return;
    dom.classicRecordMatrix.replaceChildren();
    Object.keys(Logic.BEARER_DEFS).forEach(function renderBearerRecord(bearerId) {
      Object.keys(Logic.DANGER_DEFS).forEach(function renderDangerRecord(dangerKey) {
        const bearer = Logic.BEARER_DEFS[bearerId];
        const danger = Logic.DANGER_DEFS[dangerKey];
        const record = profile.classicRecords[Logic.classicRecordKey(bearerId, danger.id)];
        const cell = document.createElement("div");
        cell.className = "record-cell" + (record ? " has-record" : "");
        cell.innerHTML = "<span>" + bearer.name.replace(/^[^·]+·/, "") + " · " + danger.name + "</span><strong>" + (record ? record.grade + " · " + formatNumber(record.score) : "—") + "</strong>";
        dom.classicRecordMatrix.appendChild(cell);
      });
    });
  }

  function getUpgradeName(upgradeId) {
    const definition = Logic.RUN_UPGRADES.find(function matchingUpgrade(upgrade) { return upgrade.id === upgradeId; });
    return definition ? definition.name : "未知薪种";
  }

  function getBestAttemptRecord(bearerId, dangerLevel) {
    const records = profile.attemptRecords || {};
    const clean = records[Logic.attemptRecordKey(bearerId, dangerLevel, false)] || null;
    const relay = records[Logic.attemptRecordKey(bearerId, dangerLevel, true)] || null;
    if (!clean) return relay;
    if (!relay) return clean;
    return Logic.compareAttemptRecords(relay, clean) > 0 ? relay : clean;
  }

  function nextWaveTargetForAttempt(record) {
    if (!record) return 5;
    return Math.min(Logic.VICTORY_WAVE, Math.max(1, (record.completedWaves || 0) + 1));
  }

  function updateHomeReplayUi(selectedBearer, selectedDanger, selectedOfficialRecord) {
    const bestAttempt = getBestAttemptRecord(selectedBearer.id, selectedDanger.id);
    if (dom.homeAttemptRecord) {
      dom.homeAttemptRecord.textContent = bestAttempt
        ? "最佳尝试 · " + (bestAttempt.relayIntervened ? "接火 " : "净炉 ") + "W" + bestAttempt.reachedWave + " · " + formatNumber(bestAttempt.score)
        : "最佳尝试 · 暂无";
    }
    if (!dom.homeNextTarget) return;
    if (profile.relayUpgradeId && profile.relayTargetWave > 0) {
      dom.homeNextTarget.textContent = "跨过 W" + profile.relayTargetWave + " · 「" + getUpgradeName(profile.relayUpgradeId) + "」+1";
    } else if (selectedOfficialRecord) {
      dom.homeNextTarget.textContent = "官方 " + selectedOfficialRecord.grade + " · " + formatNumber(selectedOfficialRecord.score) + "；下一目标：刷新纪录／提高难度";
    } else if (bestAttempt && bestAttempt.completedWaves >= Logic.VICTORY_WAVE) {
      dom.homeNextTarget.textContent = "下一目标：净炉 W15，写入官方纪录";
    } else if (bestAttempt) {
      dom.homeNextTarget.textContent = "下一目标：完成 W" + nextWaveTargetForAttempt(bestAttempt);
    } else {
      dom.homeNextTarget.textContent = "首个目标：守过 W5";
    }
  }

  function updateTutorialHomeUi() {
    if (!dom.tutorialStartButton || !dom.startButton) return;
    if (dom.tutorialRecommendation) dom.tutorialRecommendation.hidden = true;
    if (dom.tutorialStartLabel) dom.tutorialStartLabel.textContent = "动作练习（可选）";
    dom.tutorialStartButton.classList.remove("is-recommended");
    dom.tutorialStartButton.classList.add("secondary-button");
    dom.tutorialStartButton.classList.remove("primary-button");
    dom.startButton.classList.add("primary-button");
    dom.startButton.classList.remove("secondary-button");
    const selectedDanger = Logic.getDifficultyDefinition(profile.selectedDanger, REMAKE_CURVE_ID);
    dom.startButton.textContent = "开始守火 · " + selectedDanger.name;
    dom.tutorialStartButton.setAttribute("aria-label", "可选动作练习，不影响正式纪录");
  }

  function setLoadoutExpanded(expanded) {
    if (!dom.setupStack || !dom.loadoutToggleButton) return false;
    const open = expanded === true;
    dom.setupStack.hidden = !open;
    dom.loadoutToggleButton.setAttribute("aria-expanded", open ? "true" : "false");
    dom.loadoutToggleButton.textContent = open ? "收起构筑" : "更换构筑";
    dom.homeScreen.classList.toggle("is-loadout-open", open);
    return open;
  }

  function updateAccountUi() {
    dom.topEmbers.textContent = formatNumber(profile.embers);
    dom.topBestWave.textContent = String(profile.bestWave || 0);
    dom.topRelayCount.textContent = String(profile.relayCount || 0);
    const selectedBearer = Logic.BEARER_DEFS[profile.selectedBearerId] || Logic.BEARER_DEFS["fire-walker"];
    const selectedLoadout = Logic.LOADOUT_DEFS[profile.selectedLoadoutId] || Logic.LOADOUT_DEFS["sharp-ring"];
    const selectedPair = getPairForLoadout(selectedLoadout.id);
    const selectedDanger = Logic.getDifficultyDefinition(profile.selectedDanger, REMAKE_CURVE_ID);
    const selectedRecord = profile.classicRecords[Logic.classicRecordKey(selectedBearer.id, selectedDanger.id)];
    if (dom.topRecordGrade) dom.topRecordGrade.textContent = profile.bestClassicGrade || "—";
    if (dom.currentBearerSigil) dom.currentBearerSigil.textContent = selectedBearer.name.slice(-1);
    if (dom.currentBearerName) dom.currentBearerName.textContent = selectedBearer.name;
    if (dom.currentBearerDescription) dom.currentBearerDescription.textContent = selectedBearer.description;
    if (dom.homeClassicRecord) dom.homeClassicRecord.textContent = selectedRecord ? selectedRecord.grade + " · " + formatNumber(selectedRecord.score) : "暂无纪录";
    updateHomeReplayUi(selectedBearer, selectedDanger, selectedRecord);
    if (dom.summaryBearer) dom.summaryBearer.textContent = selectedBearer.name.replace(/^[^·]+·/, "");
    if (dom.summaryLoadout) dom.summaryLoadout.textContent = selectedPair.name;
    if (dom.summaryDanger) dom.summaryDanger.textContent = selectedDanger.name;
    if (dom.summaryMultiplier) dom.summaryMultiplier.textContent = "×" + selectedDanger.scoreMultiplier.toFixed(2);
    dom.startSummary.textContent = "W1—15 · 自动攻击 · 自动换火" + (autoSwitchEnabled ? "开启" : "关闭") + " · " + selectedDanger.name;
    renderBearerChoices();
    renderLoadoutChoices();
    renderDangerChoices();
    renderAchievements();
    renderClassicRecords();
    renderLegacyGrid(dom.homeUpgrades);
    if (dom.legacyRankCount) dom.legacyRankCount.textContent = String(Object.keys(profile.upgrades || {}).reduce(function totalRanks(total, id) {
      return total + (profile.upgrades[id] || 0);
    }, 0));
    updateTutorialHomeUi();
    setSoundMuted(soundMuted);
    setVibrationEnabled(vibrationEnabled);
    setAutoSwitchEnabled(autoSwitchEnabled, { persist: false });
  }

  function openHomeDrawer(section) {
    if (!dom.homeDrawer) return;
    const showLegacy = section === "legacy";
    lastDrawerTrigger = showLegacy ? dom.legacyButton : dom.archiveButton;
    dom.archiveDrawerPanel.hidden = showLegacy;
    dom.legacyDrawerPanel.hidden = !showLegacy;
    dom.homeDrawerTitle.textContent = showLegacy ? "传承与存档" : "档案与纪录";
    dom.homeDrawer.setAttribute("aria-hidden", "false");
    dom.homeDrawer.hidden = false;
    window.requestAnimationFrame(function focusDrawerClose() { dom.homeDrawerClose.focus(); });
  }

  function closeHomeDrawer() {
    if (!dom.homeDrawer || dom.homeDrawer.hidden) return;
    dom.homeDrawer.hidden = true;
    dom.homeDrawer.setAttribute("aria-hidden", "true");
    if (lastDrawerTrigger) lastDrawerTrigger.focus();
    lastDrawerTrigger = null;
  }

  function renderLegacyGrid(container) {
    if (!container) return;
    container.replaceChildren();
    Object.keys(Logic.LEGACY_DEFS).forEach(function renderLegacy(id) {
      const definition = Logic.LEGACY_DEFS[id];
      const rank = profile.upgrades[id];
      const maxed = definition.maxRank !== null && rank >= definition.maxRank;
      const cost = maxed ? 0 : Logic.getLegacyCost(rank);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "legacy-card" + (maxed ? " is-maxed" : "");
      button.disabled = true;
      button.dataset.legacyId = id;
      const effectiveRank = definition.maxRank === null ? rank : Math.min(rank, definition.maxRank);
      const effect = id === "attack" ? "当前 +" + effectiveRank * 4 + "% 攻击" :
        id === "health" ? "当前 +" + effectiveRank * 4 + "% 生命" :
          "开局获得 " + rank + " 次选择";
      button.innerHTML = "<span>等级 " + rank + (maxed ? " · 已满" : "") + "</span>" +
        "<strong>" + definition.name + "</strong>" +
        "<small>" + effect + "</small>" +
        "<b>历史等级 · 正式纪录不生效</b>";
      container.appendChild(button);
    });
  }

  function purchaseLegacy(id) {
    const metadata = {
      bestWave: profile.bestWave,
      bestCompletedWave: profile.bestCompletedWave,
      runs: profile.runs,
      victories: profile.victories,
      firstSettlementClaimed: profile.firstSettlementClaimed
    };
    const result = Logic.purchaseLegacy(profile, id);
    if (!result.ok) {
      if (result.reason === "insufficient-embers") showToast("余烬不足，还差 " + Math.max(0, result.cost - profile.embers));
      else if (result.reason === "max-rank") showToast("这项传承已经达到上限");
      return;
    }
    profile = Object.assign({}, result.save, metadata);
    saveProfile();
    updateAccountUi();
    const label = Logic.LEGACY_DEFS[id].name;
    showToast(label + "提升至 " + profile.upgrades[id] + " 级");
  }

  function createRun(requestedStartWave, mode, launchOptions) {
    impactStopRemaining = 0;
    nextImpactStopAt = 0;
    impactMarks = [];
    enemyImpactStates.clear();
    impactStopsApplied = 0;
    impactStopSeconds = 0;
    const tutorialMode = mode === "tutorial";
    const options = launchOptions && typeof launchOptions === "object" ? launchOptions : {};
    const quickStart = !tutorialMode && options.quickStart === true;
    const legacy = { attackMultiplier: 1, healthMultiplier: 1, initialLevel: 0 };
    const startWave = 1;
    const runSeed = Date.now() + (profile.classicRuns || 0) * 7919;
    const compensation = Logic.getAnchorCompensation(startWave);
    const runBuild = Logic.createDefaultRunState();
    runBuild.damageMultiplier *= compensation.damageMultiplier;
    runBuild.maxHealthMultiplier *= compensation.maxHealthMultiplier;
    runBuild.attackSpeedMultiplier *= compensation.attackSpeedMultiplier;
    runBuild.projectileCount += compensation.projectileBonus;
    runBuild.pierce += compensation.pierceBonus;
    const bearer = Logic.BEARER_DEFS[profile.selectedBearerId] || Logic.BEARER_DEFS["fire-walker"];
    const loadout = Logic.LOADOUT_DEFS[profile.selectedLoadoutId] || Logic.LOADOUT_DEFS["sharp-ring"];
    const weaponPair = getPairForLoadout(loadout.id);
    const weaponProgress = Logic.createC13WeaponProgress(weaponPair.id);
    const forgeSlot = loadout.forgeWeaponId === "carbine" ? "pursuit" : "clearing";
    const forgeWeaponId = forgeSlot === "pursuit" ? weaponPair.pursuitWeaponId : weaponPair.clearingWeaponId;
    const startWeaponId = forgeSlot === "pursuit" ? weaponPair.clearingWeaponId : weaponPair.pursuitWeaponId;
    weaponProgress.activeWeaponId = startWeaponId;
    const danger = tutorialMode ? Logic.DANGER_DEFS[0] : (Logic.getDifficultyDefinition(profile.selectedDanger, REMAKE_CURVE_ID));
    const initialForge = Logic.createDefaultForgeState();
    initialForge.pendingCoreTraitId = loadout.traitId;
    const maxHealth = BASE_HEALTH * legacy.healthMultiplier * runBuild.maxHealthMultiplier * bearer.healthMultiplier;
    return {
      mode: tutorialMode ? "tutorial" : "classic",
      curveProfile: tutorialMode ? null : REMAKE_CURVE_ID,
      quickStart: quickStart,
      autoSwitch: quickStart && autoSwitchEnabled,
      autoSwitchRequiresHeatReset: false,
      autoSwitches: 0,
      autoSwitchHintShown: false,
      recommendedChoices: 0,
      quickDecisionAutoPicks: 0,
      bearerId: bearer.id,
      bearer: bearer,
      loadoutId: loadout.id,
      loadout: loadout,
      weaponPair: weaponPair,
      weaponProgress: weaponProgress,
      dangerLevel: danger.id,
      danger: danger,
      active: true,
      paused: !tutorialMode,
      ended: false,
      outcome: null,
      startWave: startWave,
      rewardFloorWave: startWave - 1,
      completedWave: startWave - 1,
      wave: startWave,
      waveStarted: tutorialMode,
      waveClearDelay: 0,
      spawnTimer: 0,
      spawnPlan: [],
      waveSpawnTotal: 0,
      spawnSerial: 0,
      encounter: null,
      crossfire: null,
      kills: 0,
      elapsed: 0,
      realElapsed: 0,
      timeScale: tutorialMode ? 1 : preferredTimeScale,
      heldInputTime: 0,
      distanceTraveled: 0,
      peakEnemyCount: 0,
      peakEnemyBullets: 0,
      enemyBulletsFired: 0,
      enemyBulletHits: 0,
      contactHits: 0,
      damageTaken: 0,
      waveDamageStart: 0,
      noHitWaves: 0,
      threatResolutions: 0,
      threatEventIds: {},
      bossBreaks: 0,
      bearerPulseCooldown: 0,
      classicResultBanked: false,
      classicScoreCard: null,
      classicResultMeta: null,
      classicNewAchievementIds: [],
      classicNewBearerIds: [],
      relayIntervened: false,
      consumedRelay: null,
      lastDamageSource: null,
      level: 1 + legacy.initialLevel + compensation.levelBonus,
      xp: 0,
      xpNeeded: 12 + (legacy.initialLevel + compensation.levelBonus) * 3,
      pendingChoices: tutorialMode ? 0 : legacy.initialLevel + compensation.initialChoiceBonus,
      initialChoicesRemaining: tutorialMode ? 0 : legacy.initialLevel + compensation.initialChoiceBonus,
      build: runBuild,
      legacy: legacy,
      contract: null,
      usedContracts: [],
      contractHistory: [],
      contractOpen: false,
      transition: tutorialMode ? null : { type: quickStart ? "wave" : "contract", nextWave: startWave },
      victoryBanked: false,
      bankedRewardWave: startWave - 1,
      stationaryTime: 0,
      killsSinceHeal: 0,
      activeWeaponId: startWeaponId,
      weaponUsage: weaponPair.weaponIds.reduce(function initialWeaponUsage(index, weaponId) { index[weaponId] = 0; return index; }, {}),
      weaponHeat: weaponPair.weaponIds.reduce(function initialWeaponHeat(index, weaponId) { index[weaponId] = weaponId === forgeWeaponId ? 1 : 0; return index; }, {}),
      heatBudgetAvailable: true,
      ordinaryWeaponHits: weaponPair.weaponIds.reduce(function initialWeaponHits(index, weaponId) { index[weaponId] = false; return index; }, {}),
      switchQueued: false,
      switchLock: 0,
      switchUses: 0,
      drawSkillUses: 0,
      carbineShotSerial: 0,
      weaponCycleSerials: weaponPair.weaponIds.reduce(function initialWeaponCycles(index, weaponId) { index[weaponId] = 0; return index; }, {}),
      weaponVolleySerial: 0,
      weaponEffects: [],
      warmFieldId: null,
      doctrineId: null,
      carbineEvolutionId: null,
      ringEvolutionId: null,
      doctrineChoicesSeen: 0,
      doctrineChoiceHotkeys: 0,
      growthChoiceCompletedWave: -1,
      growthChoicesManuallySelected: 0,
      activeGrowthChoices: [],
      swapHasteWindow: 0,
      twinWindow: 0,
      fieldHeatGained: 0,
      heatPulse: 0,
      forge: initialForge,
      fireDrops: [],
      safeLanes: [],
      techniqueConnections: 0,
      techniqueResults: { "sever-line": 0, "lock-loop": 0, "tide-cross": 0, "open-tide": 0 },
      bossBreakMethod: "常规输出",
      lastTechniqueConnectionAt: -Infinity,
      nextCarrierOverrideTraitId: null,
      coreId: null,
      coreLevel: 0,
      coreOpen: false,
      coreUpgrades: 0,
      bossReinforcementWaves: 0,
      fusionFlash: 0,
      flashQueued: false,
      flashQueuedDirection: null,
      lastFlashDirection: null,
      flashCooldown: 0,
      flashUses: 0,
      flashBackfires: 0,
      flashBulletsThreaded: 0,
      flashBulletsReturned: 0,
      flashReturnHits: 0,
      flashReturnOrphans: 0,
      flashReturnTargetLost: 0,
      flashReturnCapacityDropped: 0,
      flashReturnDamage: 0,
      flashReturnBossDamage: 0,
      flashReturnKills: 0,
      lastFlashReturned: 0,
      pursuitBatchSerial: 0,
      pursuitBatch: null,
      pursuitBatchesCreated: 0,
      pursuitMarksApplied: 0,
      pursuitAttempts: 0,
      pursuitHits: 0,
      pursuitMisses: 0,
      pursuitExpired: 0,
      pursuitInvalidated: 0,
      pursuitDamage: 0,
      pursuitBossDamage: 0,
      pursuitKills: 0,
      pursuitCooldownRefund: 0,
      pursuitTargetDeaths: 0,
      lastFusion: null,
      flashHuntWindow: 0,
      flashEmpoweredShots: 0,
      lastMoveX: 0,
      lastMoveY: -1,
      trailTimer: 0,
      shockwaves: [],
      bossWaves: [],
      afterimages: [],
      callouts: [],
      screenShake: 0,
      majorThreatLockUntil: 0,
      majorThreatStarts: 0,
      majorThreatDelays: 0,
      majorThreatForcedReleases: 0,
      majorThreatMaxObservedDelay: 0,
      majorThreatEvents: [],
      lastMajorThreatKind: null,
      relayChoices: [],
      selectedRelayUpgradeId: null,
      relayFlash: 0,
      player: {
        x: 0,
        y: 0,
        radius: 12,
        health: maxHealth,
        maxHealth: maxHealth,
        damage: BASE_DAMAGE * legacy.attackMultiplier * bearer.damageMultiplier,
        speed: BASE_MOVE_SPEED * bearer.moveSpeedMultiplier,
        attackTimer: 0,
        invulnerable: tutorialMode ? 1.2 : 0,
        aimAngle: -Math.PI / 2,
        hitFlash: 0
      },
      enemies: [],
      playerBullets: [],
      enemyBullets: [],
      xpOrbs: [],
      particles: [],
      bossId: null,
      choiceOpen: false,
      choiceMode: null,
      seed: runSeed,
      randomState: seedToUint32(runSeed),
      visualRandomState: seedToUint32(runSeed + ":visual"),
      tutorial: tutorialMode ? {
        step: null,
        history: [],
        startedAt: 0,
        stepStartedAt: 0,
        walkDistance: 0,
        baselineWalkDistance: 0,
        baselineSwitchUses: 0,
        baselineFlashUses: 0,
        baselineKills: 0,
        growthOpened: false,
        challengeSpawned: 0,
        challengeSpawnTimer: 0,
        challengeRetries: 0,
        assistShown: false,
        completed: false
      } : null
    };
  }

  function startRun() {
    if (run && run.ended && run.outcome === "death" && run.relayChoices.length > 1 && !run.selectedRelayUpgradeId) return false;
    return launchRun("classic");
  }

  function startClassicFromHome() {
    if (!tutorialPreference.seen) saveTutorialPreference(true, true);
    return launchRun("classic", { quickStart: true });
  }

  function startTutorial() {
    return launchRun("tutorial");
  }

  function launchRun(mode, launchOptions) {
    const tutorialMode = mode === "tutorial";
    clearInput();
    resetInputDebug();
    hideAllOverlays();
    clearTimeout(bannerTimer);
    clearTimeout(relayResumeTimer);
    primeAudio();
    dom.waveBanner.textContent = "准备点燃";
    dom.waveBanner.classList.add("is-hidden");
    dom.bossBar.hidden = true;
    dom.bossPhaseMark.hidden = true;
    dom.encounterChip.hidden = true;
    dom.relayBurst.hidden = true;
    dom.homeScreen.hidden = true;
    dom.gameScreen.hidden = false;
    run = createRun(1, tutorialMode ? "tutorial" : "classic", launchOptions);
    if (!tutorialMode) {
      const previousMaxHealthMultiplier = run.build.maxHealthMultiplier;
      const consumed = Logic.consumePendingRelay(profile, run.build);
      run.build = consumed.runState;
      run.relayIntervened = Boolean(consumed.relay);
      run.consumedRelay = consumed.relay ? Object.assign({}, consumed.relay) : null;
      if (run.build.maxHealthMultiplier !== previousMaxHealthMultiplier) {
        const ratio = run.build.maxHealthMultiplier / previousMaxHealthMultiplier;
        run.player.maxHealth *= ratio;
        run.player.health *= ratio;
      }
      if (consumed.relay) {
        replaceCoreSave(consumed.save);
        saveProfile();
      }
    }
    simulationAccumulator = 0;
    run.player.x = ARENA_GEOMETRY.centerX;
    run.player.y = ARENA_GEOMETRY.centerY;
    resizeCanvas();
    dom.dragHint.classList.toggle("is-hidden", tutorialMode);
    lastFrameTime = performance.now();
    dom.gameScreen.classList.toggle("is-quick-run", Boolean(run.quickStart));
    if (tutorialMode) enterTutorialStep("move");
    else {
      if (dom.tutorialGuide) dom.tutorialGuide.hidden = true;
      if (dom.tutorialSkipButton) dom.tutorialSkipButton.hidden = true;
      if (run.quickStart) beginWave(1);
      else {
        updateRunUi();
        window.setTimeout(processDecisionQueue, 120);
      }
    }
    return true;
  }

  function returnHome() {
    clearInput();
    clearTimeout(relayResumeTimer);
    hideAllOverlays();
    simulationAccumulator = 0;
    run = null;
    if (dom.tutorialGuide) dom.tutorialGuide.hidden = true;
    if (dom.tutorialSkipButton) dom.tutorialSkipButton.hidden = true;
    dom.gameScreen.hidden = true;
    dom.gameScreen.classList.remove("is-quick-run", "is-simple-wave", "is-swap-wave", "is-full-wave");
    dom.homeScreen.hidden = false;
    setLoadoutExpanded(false);
    updateAccountUi();
    return true;
  }

  function hideAllOverlays() {
    if (helpUi) helpUi.close();
    dom.choiceOverlay.hidden = true;
    dom.contractOverlay.hidden = true;
    dom.coreOverlay.hidden = true;
    dom.victoryOverlay.hidden = true;
    dom.resultOverlay.hidden = true;
    dom.pauseOverlay.hidden = true;
    if (dom.tutorialCompleteOverlay) dom.tutorialCompleteOverlay.hidden = true;
  }

  function tutorialUsesTouchCopy() {
    return (navigator.maxTouchPoints || 0) > 0 || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  }

  function tutorialCopyFor(step) {
    const touch = tutorialUsesTouchCopy();
    if (step === "move") return {
      title: "先活着移动",
      copy: touch
        ? "在战场左下拖动浮动轮盘，移动一小段。"
        : "按 WASD／方向键，或点击地面移动一小段。"
    };
    if (step === "switch") return {
      title: "换火就是换打法",
      copy: touch
        ? "点右下「轮」切换武器；满热换火会立即出招。"
        : "按 Q 切换武器；满热换火会立即出招。"
    };
    if (step === "flash") return {
      title: "爆闪穿过危险",
      copy: touch
        ? "点右下「闪」：位移、短暂无敌，并清掉近身弹幕。"
        : "按空格爆闪：位移、短暂无敌，并清掉近身弹幕。"
    };
    if (step === "growth") return {
      title: "选一次真正的成长",
      copy: touch
        ? "从三张卡里选一张；战斗会暂停，不必慌。"
        : "从三张卡里选一张；也可以按 1／2／3 快选。"
    };
    if (step === "challenge") return {
      title: "把操作连成战斗",
      copy: "武器会自动攻击。继续移动，击败 6 只训练火偶。"
    };
    return { title: "试火完成", copy: "正式局会直接进入 W1；练习成长不会带入。" };
  }

  function updateTutorialGuide() {
    if (!run || run.mode !== "tutorial" || !run.tutorial || !dom.tutorialGuide) return;
    const step = run.tutorial.step;
    const stepIndex = Math.max(0, TUTORIAL_STEP_ORDER.indexOf(step));
    const copy = tutorialCopyFor(step);
    dom.tutorialGuide.hidden = step === "complete";
    if (dom.tutorialSkipButton) dom.tutorialSkipButton.hidden = step === "complete";
    dom.tutorialStepCount.textContent = Math.min(TUTORIAL_STEP_ORDER.length, stepIndex + 1) + " / " + TUTORIAL_STEP_ORDER.length;
    dom.tutorialProgressFill.style.width = Math.round((stepIndex + 1) / TUTORIAL_STEP_ORDER.length * 100) + "%";
    dom.tutorialStepTitle.textContent = copy.title;
    if (step === "challenge") {
      const defeated = Math.max(0, run.kills - run.tutorial.baselineKills);
      const moved = run.tutorial.walkDistance - run.tutorial.baselineWalkDistance >= 80;
      const switched = run.switchUses > run.tutorial.baselineSwitchUses;
      const flashed = run.flashUses > run.tutorial.baselineFlashUses;
      if (!moved) dom.tutorialStepCopy.textContent = "边移动边自动攻击，先走位一小段。";
      else if (!switched) dom.tutorialStepCopy.textContent = "走位完成 · 再换火一次。";
      else if (!flashed) dom.tutorialStepCopy.textContent = "换火完成 · 再爆闪一次。";
      else dom.tutorialStepCopy.textContent = "动作已连上 · 击败火偶 " + Math.min(TUTORIAL_CHALLENGE_TARGET, defeated) + " / " + TUTORIAL_CHALLENGE_TARGET;
    } else dom.tutorialStepCopy.textContent = copy.copy;
  }

  function seedTutorialFlashBullets() {
    if (!run || run.mode !== "tutorial") return;
    run.enemyBullets = [];
    for (let index = 0; index < 6; index += 1) {
      const angle = TAU * index / 6;
      const radius = 76;
      run.enemyBullets.push({
        id: nextEntityId++,
        ownerId: -10,
        ownerKind: "tutorial",
        projectileKind: "tutorial",
        x: run.player.x + Math.cos(angle) * radius,
        y: run.player.y + Math.sin(angle) * radius,
        vx: -Math.cos(angle) * 16,
        vy: -Math.sin(angle) * 16,
        radius: 4.5,
        damage: 0,
        life: 8,
        dead: false
      });
    }
  }

  function spawnTutorialEnemy(index) {
    const kind = index >= 4 ? "spitter" : "chaser";
    if (!run || run.mode !== "tutorial" || !spawnEnemy(kind)) return false;
    const enemy = run.enemies[run.enemies.length - 1];
    const angle = TAU * (index % TUTORIAL_CHALLENGE_TARGET) / TUTORIAL_CHALLENGE_TARGET + 0.35;
    const distance = Math.max(92, Math.min(ARENA_GEOMETRY.width, ARENA_GEOMETRY.height) * 0.3);
    enemy.x = clamp(run.player.x + Math.cos(angle) * distance, 24, ARENA_GEOMETRY.width - 24);
    enemy.y = clamp(run.player.y + Math.sin(angle) * distance, 24, ARENA_GEOMETRY.height - 24);
    enemy.maxHealth = kind === "spitter" ? 44 : 38;
    enemy.health = enemy.maxHealth;
    enemy.speed = kind === "spitter" ? 42 : 56 + index;
    enemy.damage = 3;
    if (kind === "spitter") enemy.shootTimer = 1.4 + (index - 4) * 0.35;
    enemy.xpValue = 0.2;
    enemy.carrierTraitId = null;
    return true;
  }

  function enterTutorialStep(step) {
    if (!run || run.mode !== "tutorial" || !run.tutorial || !TUTORIAL_STEP_ORDER.includes(step)) return false;
    const tutorial = run.tutorial;
    tutorial.step = step;
    tutorial.stepStartedAt = run.elapsed;
    tutorial.history.push({ step: step, at: Number(run.elapsed.toFixed(3)) });
    if (step === "move") {
      tutorial.startedAt = run.elapsed;
      tutorial.baselineWalkDistance = tutorial.walkDistance;
      run.paused = false;
    } else if (step === "switch") {
      tutorial.baselineSwitchUses = run.switchUses;
      run.weaponHeat[getInactiveWeaponId()] = 1;
      run.switchLock = 0;
    } else if (step === "flash") {
      tutorial.baselineFlashUses = run.flashUses;
      run.flashCooldown = 0;
      seedTutorialFlashBullets();
    } else if (step === "growth") {
      tutorial.growthOpened = true;
      run.enemies = [];
      run.enemyBullets = [];
      run.pendingChoices = 1;
      run.initialChoicesRemaining = 0;
      run.transition = null;
      run.paused = true;
      window.setTimeout(function openTutorialGrowth() {
        if (run && run.mode === "tutorial" && run.tutorial && run.tutorial.step === "growth") openUpgradeChoice();
      }, 120);
    } else if (step === "challenge") {
      tutorial.baselineKills = run.kills;
      tutorial.baselineWalkDistance = tutorial.walkDistance;
      tutorial.baselineSwitchUses = run.switchUses;
      tutorial.baselineFlashUses = run.flashUses;
      tutorial.challengeSpawned = 0;
      tutorial.challengeSpawnTimer = 0.8;
      run.enemies = [];
      run.enemyBullets = [];
      run.xpOrbs = [];
      run.paused = false;
      run.player.health = run.player.maxHealth;
      run.player.invulnerable = Math.max(run.player.invulnerable, 1.2);
      run.flashCooldown = 0;
      run.weaponHeat[getInactiveWeaponId()] = 1;
    }
    showWaveBanner(tutorialCopyFor(step).title);
    updateTutorialGuide();
    updateRunUi();
    return true;
  }

  function completeTutorial() {
    if (!run || run.mode !== "tutorial" || !run.tutorial || run.tutorial.completed) return false;
    run.tutorial.step = "complete";
    run.tutorial.completed = true;
    run.tutorial.history.push({ step: "complete", at: Number(run.elapsed.toFixed(3)) });
    run.active = false;
    run.paused = true;
    run.ended = true;
    run.outcome = "tutorial";
    run.enemies = [];
    run.playerBullets = [];
    run.enemyBullets = [];
    run.xpOrbs = [];
    clearInput();
    saveTutorialPreference(true, true);
    if (dom.tutorialGuide) dom.tutorialGuide.hidden = true;
    hideAllOverlays();
    dom.tutorialCompleteOverlay.hidden = false;
    updateRunUi();
    return true;
  }

  function skipTutorialToRun() {
    if (!run || run.mode !== "tutorial") return false;
    saveTutorialPreference(true, tutorialPreference.completed);
    return launchRun("classic", { quickStart: true });
  }

  function restartTutorialChallenge() {
    if (!run || run.mode !== "tutorial" || !run.tutorial) return false;
    const tutorial = run.tutorial;
    run.player.health = run.player.maxHealth;
    run.player.invulnerable = 1.2;
    run.enemies = [];
    run.playerBullets = [];
    run.enemyBullets = [];
    run.xpOrbs = [];
    run.bossWaves = [];
    clearInput();
    if (tutorial.step === "challenge") {
      tutorial.challengeRetries += 1;
      tutorial.baselineKills = run.kills;
      tutorial.baselineWalkDistance = tutorial.walkDistance;
      tutorial.baselineSwitchUses = run.switchUses;
      tutorial.baselineFlashUses = run.flashUses;
      tutorial.challengeSpawned = 0;
      tutorial.challengeSpawnTimer = 0.5;
      run.flashCooldown = 0;
      run.weaponHeat[getInactiveWeaponId()] = 1;
      showWaveBanner("再试一次 · 成长仍保留");
    }
    updateTutorialGuide();
    updateRunUi();
    return true;
  }

  function updateTutorial(delta) {
    if (!run || run.mode !== "tutorial" || !run.tutorial || run.tutorial.completed) return;
    const tutorial = run.tutorial;
    const tutorialElapsed = run.elapsed - tutorial.startedAt;
    if (tutorialElapsed >= TUTORIAL_HARD_TIMEOUT_SECONDS && !tutorial.assistShown) {
      tutorial.assistShown = true;
      showToast("可以随时点右上方按钮跳过试火，正式 W1 不会受影响");
    }
    if (tutorial.step === "move" && tutorial.walkDistance - tutorial.baselineWalkDistance >= 80) {
      enterTutorialStep("switch");
    } else if (tutorial.step === "switch" && run.switchUses > tutorial.baselineSwitchUses) {
      enterTutorialStep("flash");
    } else if (tutorial.step === "flash" && run.flashUses > tutorial.baselineFlashUses) {
      enterTutorialStep("growth");
    } else if (tutorial.step === "growth" && tutorial.growthOpened && !run.choiceOpen && run.pendingChoices === 0 && !run.paused) {
      enterTutorialStep("challenge");
    } else if (tutorial.step === "challenge") {
      tutorial.challengeSpawnTimer -= delta;
      if (tutorial.challengeSpawned < TUTORIAL_CHALLENGE_TARGET && tutorial.challengeSpawnTimer <= 0) {
        if (spawnTutorialEnemy(tutorial.challengeSpawned)) {
          tutorial.challengeSpawned += 1;
          tutorial.challengeSpawnTimer += tutorial.challengeSpawned === 3 ? 3.4 : 0.55;
        }
      }
      const challengeMoved = tutorial.walkDistance - tutorial.baselineWalkDistance >= 80;
      const challengeSwitched = run.switchUses > tutorial.baselineSwitchUses;
      const challengeFlashed = run.flashUses > tutorial.baselineFlashUses;
      if (run.kills - tutorial.baselineKills >= TUTORIAL_CHALLENGE_TARGET && challengeMoved && challengeSwitched && challengeFlashed) completeTutorial();
    }
    updateTutorialGuide();
  }

  function getTutorialSnapshot() {
    const tutorial = run && run.mode === "tutorial" ? run.tutorial : null;
    const balanceSignature = run && run.mode === "tutorial" ? {
      ruleset: TUTORIAL_BALANCE_RULESET,
      playerMaxHealth: run.player.maxHealth,
      playerDamage: run.player.damage,
      playerSpeed: run.player.speed,
      fireRate: run.build.attackSpeedMultiplier / getWeaponInterval(run.activeWeaponId),
      level: run.level,
      damageMultiplier: run.build.damageMultiplier,
      attackSpeedMultiplier: run.build.attackSpeedMultiplier,
      projectileCount: run.build.projectileCount,
      activeRelayUpgradeId: run.build.activeRelayUpgradeId || null
    } : null;
    return {
      preference: Object.assign({}, tutorialPreference),
      active: Boolean(run && run.mode === "tutorial" && run.active && !run.ended),
      step: tutorial ? tutorial.step : null,
      stepId: tutorial ? tutorial.step : null,
      stepIndex: tutorial && TUTORIAL_STEP_ORDER.includes(tutorial.step) ? TUTORIAL_STEP_ORDER.indexOf(tutorial.step) : -1,
      completed: Boolean(tutorial && tutorial.completed),
      elapsed: tutorial && run ? Math.max(0, run.elapsed - tutorial.startedAt) : 0,
      targetDurationSeconds: TUTORIAL_TARGET_DURATION_SECONDS,
      hardTimeoutSeconds: TUTORIAL_HARD_TIMEOUT_SECONDS,
      challengeTarget: TUTORIAL_CHALLENGE_TARGET,
      history: tutorial ? tutorial.history.map(function copyEntry(entry) { return Object.assign({}, entry); }) : [],
      balanceSignature: balanceSignature
    };
  }

  function updateQuickRunDisclosure() {
    if (!run || !dom.gameScreen) return;
    const quick = run.quickStart === true && run.mode === "classic";
    const wave = run.wave || 1;
    dom.gameScreen.classList.toggle("is-quick-run", quick);
    dom.gameScreen.classList.toggle("is-simple-wave", quick && wave <= 2);
    dom.gameScreen.classList.toggle("is-swap-wave", quick && wave === 3);
    dom.gameScreen.classList.toggle("is-full-wave", quick && wave >= 4);
    dom.gameScreen.dataset.wave = String(wave);
    if (!quick || !dom.dragHint) return;
    if (wave <= 2) dom.dragHint.textContent = "拖动移动 · 武器会自动攻击";
    else if (wave === 3) dom.dragHint.textContent = run.autoSwitch
      ? "满热会自动换火 · 也可以点“换”"
      : "副手满热后点“换” · 暂停页可开启自动";
    else if (wave === 4) dom.dragHint.textContent = "看见亮线就绕开 · 危险时点“闪”";
    else if (wave === 5) dom.dragHint.textContent = "离开实线 · 招式结束再反击";
    else if (wave === 6 || wave === 11) dom.dragHint.textContent = "收割波 · 保持移动就好";
    else dom.dragHint.textContent = "保持移动 · “闪”是救命键";
  }

  function beginWave(wave) {
    if (!run || run.ended || !Number.isFinite(wave)) return false;
    const resolvedWave = Math.trunc(wave);
    if (resolvedWave < 1 || resolvedWave > Logic.VICTORY_WAVE) return false;
    clearPursuitBatch("wave-start");
    run.wave = resolvedWave;
    audioClosedWave = null;
    if (resolvedWave === Logic.VICTORY_WAVE) {
      run.bossBreakMethod = "常规输出";
      run.bossBreaks = 0;
    }
    run.transition = null;
    run.paused = false;
    run.waveStarted = true;
    run.waveClearDelay = 0;
    run.waveDamageStart = run.damageTaken || 0;
    run.spawnTimer = 0.25;
    run.spawnSerial = 0;
    run.majorThreatLockUntil = run.elapsed;
    run.enemies.forEach(clearMajorThreatPending);
    run.bossWaves = [];
    run.fireDrops = [];
    run.safeLanes = [];
    run.forge = Logic.clearForgeWaveState(run.forge);
    run.crossfire = null;
    run.encounter = Logic.getEncounterSpec(run.wave, run.seed, run.contract ? run.contract.id : null, run.curveProfile);
    run.spawnPlan = createSpawnPlan(run.wave);
    run.crossfire = createCrossfireState(run.encounter);
    run.waveSpawnTotal = run.spawnPlan.length;
    run.bossId = null;
    dom.bossBar.hidden = true;
    dom.encounterChip.hidden = false;
    dom.encounterLabel.textContent = run.encounter.name;
    updateQuickRunDisclosure();
    showWaveBanner(run.encounter.banner);
    updateRunUi();
    return true;
  }

  function recordThreatResolution(eventId, label) {
    if (!run || !eventId) return false;
    const eventIds = run.threatEventIds;
    if (!eventIds || eventIds[eventId]) return false;
    eventIds[eventId] = true;
    run.threatResolutions += 1;
    addCallout(label || "破势 +100", run.player.x, run.player.y - 30, "#ffd184");
    requestAudioEvent("elite-break", { causeId: eventId, strength: 0.75 });
    return true;
  }

  function currentClassicScoreInput() {
    if (!run) return {};
    const techniqueIds = run.forge.techniqueHistory.map(function techniqueId(entry) { return entry.techniqueId; })
      .filter(function uniqueTechnique(id, index, list) { return list.indexOf(id) === index; });
    return {
      completedWaves: run.completedWave,
      reachedWave: run.completedWave >= Logic.VICTORY_WAVE ? Logic.VICTORY_WAVE : Math.max(1, run.wave),
      victory: run.completedWave >= Logic.VICTORY_WAVE,
      finalHealthRatio: clamp(run.player.health / Math.max(1, run.player.maxHealth), 0, 1),
      damageTakenRatio: clamp((run.damageTaken || 0) / Math.max(1, run.player.maxHealth * 3), 0, 1),
      threatResolutions: run.threatResolutions || 0,
      returnedBullets: run.flashBulletsReturned || 0,
      switchUses: run.switchUses || 0,
      techniqueConnections: run.techniqueConnections || 0,
      techniqueIds: techniqueIds,
      uniqueTechniques: techniqueIds.length,
      bossBreaks: run.bossBreaks || 0,
      bossBreakMethod: run.bossBreakMethod,
      bearerId: run.bearerId,
      dangerLevel: run.dangerLevel,
      loadoutId: run.loadoutId,
      relayIntervened: run.relayIntervened === true,
      noHitWaves: run.noHitWaves || 0,
      recordedAt: new Date().toISOString()
    };
  }

  function createCrossfireState(encounter) {
    if (!encounter || encounter.basePattern !== "crossfire") return null;
    const spec = Logic.getCrossfireReadabilitySpec(encounter.wave, run.seed, run.contract ? run.contract.id : null, run.curveProfile, run.dangerLevel);
    if (!spec) return null;
    return {
      phase: "waiting",
      phaseStartedAt: run.elapsed,
      phaseEndsAt: null,
      beatQueued: false,
      volleySerial: 0,
      nextAxis: spec.initialAxis,
      activeAxis: null,
      shooterIds: [],
      pendingShooterIds: [],
      firedShooterIds: [],
      lastShotAt: null,
      spawnSideSerial: [0, 0],
      telegraphsStarted: 0,
      shotsReleased: 0,
      recoveriesCompleted: 0,
      telegraphsCanceled: 0,
      spec: spec,
      events: []
    };
  }

  function recordCrossfireEvent(type, details) {
    const crossfire = run && run.crossfire;
    if (!crossfire) return;
    crossfire.events.push(Object.assign({ type: type, at: run.elapsed, serial: crossfire.volleySerial }, details || {}));
    if (crossfire.events.length > 64) crossfire.events.shift();
  }

  function crossfireEntryKind(entry) {
    return entry && typeof entry === "object" ? entry.kind : entry;
  }

  function futureCrossfireArtilleryCount(axis) {
    if (!run || !run.crossfire) return 0;
    return run.spawnPlan.reduce(function countFutureArtillery(total, entry) {
      return total + (crossfireEntryKind(entry) === "artillery" && entry && entry.axis === axis ? 1 : 0);
    }, 0);
  }

  function livingCrossfireArtillery(axis) {
    if (!run || !run.crossfire) return [];
    return run.enemies.filter(function selectCrossfireArtillery(enemy) {
      return !enemy.dead && enemy.kind === "artillery" && enemy.crossfireAxis === axis;
    });
  }

  function readyCrossfireArtillery(axis) {
    return livingCrossfireArtillery(axis).filter(function readyArtillery(enemy) {
      return enemy.attackState === "idle" && enemy.shootTimer <= 0;
    });
  }

  function crossfireRunnerThreatActive() {
    if (!run || !run.crossfire) return false;
    return run.enemies.some(function activeRunner(enemy) {
      return !enemy.dead && enemy.kind === "runner" &&
        (enemy.dashState === "windup" || enemy.dashState === "dashing" || enemy.majorThreatKind === "runner");
    });
  }

  function hasExternalCrossfireThreatPending() {
    const crossfire = run && run.crossfire;
    if (!crossfire) return false;
    return run.enemies.some(function pendingOutsideVolley(enemy) {
      return !enemy.dead && Boolean(enemy.majorThreatKind) && !crossfire.shooterIds.includes(enemy.id);
    });
  }

  function beginCrossfireTelegraph(shooters) {
    const crossfire = run && run.crossfire;
    if (!crossfire || crossfire.phase !== "waiting" || !shooters.length) return false;
    crossfire.volleySerial += 1;
    crossfire.phase = "telegraph";
    crossfire.phaseStartedAt = run.elapsed;
    crossfire.phaseEndsAt = run.elapsed + crossfire.spec.warningDuration;
    crossfire.activeAxis = crossfire.nextAxis;
    crossfire.beatQueued = true;
    crossfire.shooterIds = shooters.map(function shooterId(enemy) { return enemy.id; });
    crossfire.pendingShooterIds = [];
    crossfire.firedShooterIds = [];
    crossfire.lastShotAt = null;
    crossfire.telegraphsStarted += 1;
    const shotLocks = shooters.map(function lockCrossfireAim(enemy) {
      const aimX = run.player.x - enemy.x;
      const aimY = run.player.y - enemy.y;
      const length = Math.max(0.001, Math.hypot(aimX, aimY));
      enemy.lockedAimX = aimX / length;
      enemy.lockedAimY = aimY / length;
      enemy.attackState = "windup";
      enemy.attackWindup = crossfire.spec.warningDuration;
      clearMajorThreatPending(enemy);
      return {
        ownerId: enemy.id,
        axis: enemy.crossfireAxis,
        lockedAimX: enemy.lockedAimX,
        lockedAimY: enemy.lockedAimY
      };
    });
    recordCrossfireEvent("telegraph", {
      axis: crossfire.activeAxis,
      startedAt: crossfire.phaseStartedAt,
      endsAt: crossfire.phaseEndsAt,
      shooterIds: crossfire.shooterIds.slice(),
      shots: shotLocks
    });
    return true;
  }

  function cancelCrossfireTelegraph(reason) {
    const crossfire = run && run.crossfire;
    if (!crossfire || !["telegraph", "volley"].includes(crossfire.phase)) return;
    recordCrossfireEvent("cancel", {
      axis: crossfire.activeAxis,
      reason: reason || "shooters-lost",
      firedShooterIds: crossfire.firedShooterIds.slice()
    });
    crossfire.telegraphsCanceled += 1;
    startCrossfireRecovery(run.elapsed, reason || "shooters-lost");
  }

  function startCrossfireRecovery(anchorAt, reason) {
    const crossfire = run && run.crossfire;
    if (!crossfire || !["telegraph", "volley"].includes(crossfire.phase)) return false;
    const interrupted = !Number.isFinite(crossfire.lastShotAt);
    const recoveryStartedAt = Number.isFinite(anchorAt) ? anchorAt : crossfire.lastShotAt;
    if (!Number.isFinite(recoveryStartedAt)) return false;
    const releasedAxis = crossfire.activeAxis;
    crossfire.phase = "recovery";
    crossfire.phaseStartedAt = recoveryStartedAt;
    crossfire.phaseEndsAt = recoveryStartedAt + crossfire.spec.recoveryDuration;
    crossfire.beatQueued = false;
    crossfire.nextAxis = 1 - releasedAxis;
    recordCrossfireEvent("recovery-start", {
      at: recoveryStartedAt,
      axis: releasedAxis,
      endsAt: crossfire.phaseEndsAt,
      interrupted: interrupted,
      reason: reason || null,
      firedShooterIds: crossfire.firedShooterIds.slice()
    });
    return true;
  }

  function updateCrossfireState() {
    const crossfire = run && run.crossfire;
    if (!crossfire) return;

    if (crossfire.phase === "telegraph") {
      crossfire.shooterIds = crossfire.shooterIds.filter(function keepLivingShooter(id) {
        return Boolean(findLivingEnemyById(id));
      });
      if (!crossfire.shooterIds.length) {
        cancelCrossfireTelegraph("shooters-lost-before-volley");
        return;
      }
      const remaining = Math.max(0, crossfire.phaseEndsAt - run.elapsed);
      crossfire.shooterIds.forEach(function mirrorTelegraph(id) {
        const enemy = findLivingEnemyById(id);
        if (enemy) enemy.attackWindup = remaining;
      });
      if (remaining > 1e-9) return;
      crossfire.phase = "volley";
      crossfire.phaseStartedAt = run.elapsed;
      crossfire.phaseEndsAt = null;
      crossfire.pendingShooterIds = crossfire.shooterIds.slice().sort(function byId(a, b) { return a - b; });
      recordCrossfireEvent("volley", {
        axis: crossfire.activeAxis,
        pendingShooterIds: crossfire.pendingShooterIds.slice()
      });
      return;
    }

    if (crossfire.phase === "volley") {
      crossfire.pendingShooterIds = crossfire.pendingShooterIds.filter(function keepPendingShooter(id) {
        return Boolean(findLivingEnemyById(id));
      });
      if (!crossfire.pendingShooterIds.length) {
        if (crossfire.firedShooterIds.length) startCrossfireRecovery();
        else cancelCrossfireTelegraph("shooters-lost-during-volley");
        return;
      }
      const enemy = findLivingEnemyById(crossfire.pendingShooterIds[0]);
      if (!enemy) return;
      const pressure = Logic.getCombatPressure(run.wave, run.curveProfile, run.dangerLevel);
      const threatRelease = releaseMajorThreat(enemy, "artillery", {
        softCapacity: canAddEnemyBullets(1, pressure, enemy),
        hardCapacity: canAddEnemyBulletsHard(1)
      });
      if (!threatRelease) return;
      const bullet = fireEnemyBullet(
        enemy,
        enemy.lockedAimX,
        enemy.lockedAimY,
        pressure.enemyBulletSpeed * 0.72,
        enemy.damage * 0.82,
        8,
        {
          projectileKind: "crossfire-primary",
          crossfireBeatId: crossfire.volleySerial,
          crossfireAxis: crossfire.activeAxis,
          sourceLockedAimX: enemy.lockedAimX,
          sourceLockedAimY: enemy.lockedAimY
        }
      );
      enemy.artillerySerial += 1;
      enemy.attackState = "recoil";
      enemy.attackWindup = 0.28;
      enemy.shootTimer = Math.max(2.45, 3.2 - Logic.getStageNumber(run.wave) * 0.16);
      crossfire.pendingShooterIds.shift();
      crossfire.firedShooterIds.push(enemy.id);
      crossfire.lastShotAt = run.elapsed;
      crossfire.shotsReleased += 1;
      recordCrossfireEvent("shot", {
        axis: crossfire.activeAxis,
        ownerId: enemy.id,
        bulletId: bullet ? bullet.id : null,
        lockedAimX: enemy.lockedAimX,
        lockedAimY: enemy.lockedAimY,
        vx: bullet ? bullet.vx : null,
        vy: bullet ? bullet.vy : null,
        forced: Boolean(threatRelease.forced),
        delay: threatRelease.delay
      });
      return;
    }

    if (crossfire.phase === "recovery") {
      if (run.elapsed + 1e-9 < crossfire.phaseEndsAt) return;
      recordCrossfireEvent("recovery-end", { axis: crossfire.activeAxis });
      crossfire.recoveriesCompleted += 1;
      crossfire.phase = "waiting";
      crossfire.phaseStartedAt = run.elapsed;
      crossfire.phaseEndsAt = null;
      crossfire.activeAxis = null;
      crossfire.shooterIds = [];
      crossfire.pendingShooterIds = [];
      crossfire.firedShooterIds = [];
      crossfire.lastShotAt = null;
      return;
    }

    if (crossfire.phase !== "waiting") return;
    let axis = crossfire.nextAxis;
    let living = livingCrossfireArtillery(axis);
    let future = futureCrossfireArtilleryCount(axis);
    if (!living.length && future === 0) {
      const otherAxis = 1 - axis;
      const otherLiving = livingCrossfireArtillery(otherAxis);
      const otherFuture = futureCrossfireArtilleryCount(otherAxis);
      if (!otherLiving.length && otherFuture === 0) {
        crossfire.phase = "finished";
        crossfire.phaseStartedAt = run.elapsed;
        crossfire.phaseEndsAt = null;
        crossfire.beatQueued = false;
        crossfire.activeAxis = null;
        recordCrossfireEvent("finished", {});
        return;
      }
      crossfire.nextAxis = otherAxis;
      axis = otherAxis;
      living = otherLiving;
      future = otherFuture;
    }
    if (!living.length && future > 0) {
      crossfire.beatQueued = false;
      return;
    }
    const readyShooters = readyCrossfireArtillery(axis).sort(function byId(a, b) { return a.id - b.id; });
    if (!readyShooters.length) {
      crossfire.beatQueued = false;
      return;
    }
    const validShooters = readyShooters.filter(function validLockedAim(enemy) {
      return Number.isFinite(enemy.x) && Number.isFinite(enemy.y) &&
        Math.hypot(run.player.x - enemy.x, run.player.y - enemy.y) > 0.001;
    });
    if (!validShooters.length) {
      readyShooters.forEach(function retryInvalidAim(enemy) { enemy.shootTimer = 0.12; });
      crossfire.beatQueued = false;
      recordCrossfireEvent("cancel", { axis: axis, reason: "invalid-locked-aim" });
      return;
    }
    crossfire.beatQueued = true;
    if (crossfireRunnerThreatActive() || hasExternalCrossfireThreatPending()) return;
    if (run.elapsed + 1e-9 < run.majorThreatLockUntil) return;
    beginCrossfireTelegraph(validShooters.slice(0, crossfire.spec.maxShootersPerBeat));
  }

  function createRemakeSpawnPlan(wave) {
    const contractId = run.contract ? run.contract.id : null;
    const encounter = run.encounter || Logic.getEncounterSpec(wave, run.seed, contractId, run.curveProfile);
    const pressure = Logic.getCombatPressure(wave, run.curveProfile, run.dangerLevel);
    const kinds = Logic.createRemakeSpawnKinds(wave, run.seed, run.dangerLevel, contractId);
    // Special kinds already occupy distinct authored slots; keep only fire decoration.
    const fireDecoration = Object.assign({}, encounter, { switchGuardQuota: 0, tideCallerQuota: 0 });
    let decorated = decorateFireEncounterPlan(kinds, fireDecoration, wave);
    if (encounter.basePattern === "crossfire") {
      const spec = Logic.getCrossfireReadabilitySpec(wave, run.seed, contractId, run.curveProfile, run.dangerLevel);
      const crossfireEntries = Logic.createCrossfireSpawnEntries(decorated.map(function decoratedKind(entry) { return entry.kind; }), spec.initialAxis, pressure.spawnBatchSize);
      decorated = crossfireEntries.map(function mergeCrossfire(entry, index) { return Object.assign({}, decorated[index], entry); });
    }
    return decorated;
  }

  function createSpawnPlan(wave) {
    if (run.curveProfile === REMAKE_CURVE_ID) return createRemakeSpawnPlan(wave);
    const tuning = Logic.getWaveTuning(wave, run.curveProfile);
    const pressure = Logic.getCombatPressure(wave, run.curveProfile, run.dangerLevel);
    const contract = run.contract;
    const encounter = run.encounter || Logic.getEncounterSpec(wave, run.seed, contract ? contract.id : null, run.curveProfile);
    let plan;
    if (tuning.isBoss) {
      plan = ["boss"];
      const adds = Math.min(12, Math.ceil((3 + Math.floor(wave / 5)) * tuning.bossAddMultiplier * (contract ? contract.enemyCountMultiplier : 1)));
      const rangedAdds = Math.min(adds, Math.ceil(pressure.bossRangedAdds * (contract ? contract.rangedQuotaMultiplier : 1)));
      const rangedSlots = evenlySpacedSlots(adds, rangedAdds);
      const artilleryAdds = Math.min(adds, Math.max(0, Math.trunc(encounter.artilleryQuota || 0)));
      const artillerySlots = evenlySpacedSlots(adds, artilleryAdds);
      for (let index = 0; index < adds; index += 1) {
        if (artillerySlots.has(index)) plan.push("artillery");
        else if (rangedSlots.has(index)) plan.push("spitter");
        else if (index % 4 === 0) plan.push("swarm");
        else plan.push(index % 2 ? "runner" : "chaser");
      }
      return decorateFireEncounterPlan(plan, encounter, wave);
    }
    const rawBaseCount = Math.ceil((9 + wave * 0.9) * Math.min(1.6, 1 + (wave - 1) * 0.025));
    const baseCount = wave === 11 && (!contract || contract.id !== "surging-tide") ? Math.min(22, rawBaseCount) : rawBaseCount;
    const denseEncounter = encounter && encounter.basePattern === "dense-swarm";
    const countLimit = contract && contract.id === "surging-tide" ? 48 : denseEncounter ? 40 : 30;
    const encounterCountMultiplier = encounter && Number.isFinite(encounter.enemyCountMultiplier) ? encounter.enemyCountMultiplier : 1;
    const count = Math.min(countLimit, Math.ceil(baseCount * tuning.countMultiplier * (contract ? contract.enemyCountMultiplier : 1) * encounterCountMultiplier));
    const rangedCount = Math.min(count, Math.max(
      Math.ceil(pressure.rangedQuota * (contract ? contract.rangedQuotaMultiplier : 1)),
      Math.ceil(count * encounter.rangedRatioFloor)
    ));
    const rangedSlots = evenlySpacedSlots(count, rangedCount);
    const artilleryCount = Math.min(count, Math.max(0, Math.trunc(encounter.artilleryQuota || 0)));
    const artillerySlots = evenlySpacedSlots(count, artilleryCount);
    const swarmRatio = clamp(Number(encounter.swarmRatio) || 0, 0, 0.7);
    const casualPacing = !contract && typeof Logic.getWavePacing === "function" ? Logic.getWavePacing(wave, run.curveProfile) : null;
    const baseRunnerChance = contract && contract.id === "still-hunt" ? 0.45 : contract && contract.id === "surging-tide" ? 0.25 : casualPacing ? 0 : 0.32;
    const runnerChance = Math.min(0.70, casualPacing ? encounter.runnerChanceBonus : baseRunnerChance + encounter.runnerChanceBonus);
    plan = [];
    for (let index = 0; index < count; index += 1) {
      if (artillerySlots.has(index)) plan.push("artillery");
      else if (rangedSlots.has(index)) plan.push("spitter");
      else if (seededRandom(run.seed + wave * 1877 + index * 131) < swarmRatio) plan.push("swarm");
      else if (wave >= 2 && seededRandom(run.seed + wave * 997 + index * 53) < runnerChance) plan.push("runner");
      else plan.push("chaser");
    }
    let decorated = decorateFireEncounterPlan(plan, encounter, wave);
    if (encounter && encounter.basePattern === "crossfire") {
      const spec = Logic.getCrossfireReadabilitySpec(wave, run.seed, contract ? contract.id : null, run.curveProfile, run.dangerLevel);
      const batchSize = Math.min(pressure.maxSpawnBatchSize, pressure.spawnBatchSize + encounter.batchSizeBonus);
      const crossfireEntries = Logic.createCrossfireSpawnEntries(decorated.map(function entryKind(entry) { return entry.kind; }), spec.initialAxis, batchSize);
      decorated = crossfireEntries.map(function mergeCrossfireEntry(entry, index) {
        return Object.assign({}, decorated[index], entry);
      });
    }
    return decorated;
  }

  function decorateFireEncounterPlan(kinds, encounter, wave) {
    const entries = kinds.map(function createEntry(kind, index) {
      return { kind: kind, planIndex: index, carrierTraitId: null, groupId: null };
    });
    if (!encounter || !entries.length) return entries;
    const nonBossSlots = entries.map(function candidate(entry, index) {
      return entry.kind === "boss" ? null : index;
    }).filter(function valid(index) { return index !== null; });
    const specialSlots = nonBossSlots.filter(function specialCandidate(index) {
      return entries[index].kind !== "artillery";
    });
    const switchGuardSlots = evenlySpacedSlots(specialSlots.length, Math.min(specialSlots.length, encounter.switchGuardQuota || 0));
    switchGuardSlots.forEach(function placeSwitchGuard(slot) {
      const index = specialSlots[slot];
      if (Number.isSafeInteger(index)) entries[index].kind = "switchGuard";
    });
    const tideCandidates = specialSlots.filter(function unused(index) { return entries[index].kind !== "switchGuard"; });
    const tideCallerSlots = evenlySpacedSlots(tideCandidates.length, Math.min(tideCandidates.length, encounter.tideCallerQuota || 0));
    tideCallerSlots.forEach(function placeTideCaller(slot) {
      const index = tideCandidates[slot];
      if (Number.isSafeInteger(index)) entries[index].kind = "tidecaller";
    });

    const supplyMultiplier = run.contract && Number.isFinite(run.contract.carrierSupplyMultiplier)
      ? run.contract.carrierSupplyMultiplier
      : 1;
    const requestedCarrierQuota = Math.max(0, Number(encounter.carrierQuota) || 0);
    const carrierCount = requestedCarrierQuota <= 0
      ? 0
      : Math.min(entries.length, Math.max(1, Math.round(requestedCarrierQuota * supplyMultiplier)));
    const carrierSlots = evenlySpacedSlots(entries.length, carrierCount);
    let carrierOrdinal = 0;
    carrierSlots.forEach(function markCarrier(index) {
      const primary = encounter.primaryTraitId || (carrierOrdinal % 2 === 0 ? "sharp" : "tide");
      entries[index].carrierTraitId = carrierOrdinal % 3 === 2 ? (primary === "sharp" ? "tide" : "sharp") : primary;
      carrierOrdinal += 1;
    });
    entries.forEach(function forceSpecialCarrier(entry) {
      if (["switchGuard", "tidecaller"].includes(entry.kind) && !entry.carrierTraitId) {
        entry.carrierTraitId = encounter.primaryTraitId || (entry.kind === "tidecaller" ? "tide" : "sharp");
      }
    });
    if (run.nextCarrierOverrideTraitId) {
      const debtEntry = entries.find(function firstCarrier(entry) { return Boolean(entry.carrierTraitId) && entry.kind !== "boss"; });
      if (debtEntry) {
        debtEntry.kind = "switchGuard";
        debtEntry.carrierTraitId = run.nextCarrierOverrideTraitId;
        debtEntry.overrideDebt = true;
        run.nextCarrierOverrideTraitId = null;
      }
    }
    entries.forEach(function groupTideCaller(entry, leaderIndex) {
      if (entry.kind !== "tidecaller") return;
      const groupId = "tide:" + wave + ":" + leaderIndex;
      entry.groupId = groupId;
      entry.groupLeader = true;
      let followers = 0;
      for (let offset = 1; offset < entries.length && followers < 2; offset += 1) {
        const candidate = entries[(leaderIndex + offset) % entries.length];
        if (candidate.kind === "boss" || candidate.groupId || candidate === entry) continue;
        candidate.groupId = groupId;
        followers += 1;
      }
    });
    return entries;
  }

  function evenlySpacedSlots(total, requestedCount) {
    const count = Math.max(0, Math.min(total, Math.trunc(requestedCount)));
    const slots = new Set();
    for (let index = 0; index < count; index += 1) {
      slots.add(Math.floor((index + 1) * total / (count + 1)));
    }
    return slots;
  }

  function seededRandom(seed) {
    let value = Math.sin(Number(seed) * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function seedToUint32(seed) {
    const textValue = String(seed);
    let hash = 2166136261;
    for (let index = 0; index < textValue.length; index += 1) {
      hash ^= textValue.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function runRandom() {
    if (!run) return 0.5;
    run.randomState = (Math.imul(run.randomState >>> 0, 1664525) + 1013904223) >>> 0;
    return run.randomState / 4294967296;
  }

  function visualRandom() {
    if (!run) return 0.5;
    run.visualRandomState = (Math.imul(run.visualRandomState >>> 0, 22695477) + 1) >>> 0;
    return run.visualRandomState / 4294967296;
  }

  function showWaveBanner(message) {
    clearTimeout(bannerTimer);
    dom.waveBanner.textContent = message;
    dom.waveBanner.classList.remove("is-hidden");
    bannerTimer = window.setTimeout(function hideBanner() {
      dom.waveBanner.classList.add("is-hidden");
    }, 1250);
  }

  function spawnEnemy(kind, spawnMeta) {
    if (!run || run.enemies.length >= MAX_ENEMIES) return false;
    const width = ARENA_GEOMETRY.width;
    const height = ARENA_GEOMETRY.height;
    const margin = 24;
    const encounter = run.encounter;
    const isCrossfire = encounter && encounter.basePattern === "crossfire";
    const crossfireAxis = isCrossfire
      ? (spawnMeta && (spawnMeta.axis === 0 || spawnMeta.axis === 1) ? spawnMeta.axis : encounter.spawnAxis)
      : null;
    const crossfireSpawnAxis = isCrossfire && kind === "artillery" ? crossfireAxis : encounter && encounter.spawnAxis;
    const crossfireSideSerial = isCrossfire && kind === "artillery" && run.crossfire
      ? run.crossfire.spawnSideSerial[crossfireAxis]
      : run.spawnSerial;
    const edge = isCrossfire
      ? crossfireSpawnAxis + (crossfireSideSerial % 2) * 2
      : Math.floor(runRandom() * 4);
    const edgeOffset = isCrossfire
      ? 0.1 + seededRandom(run.seed + run.wave * 1301 + run.spawnSerial * 97) * 0.8
      : runRandom();
    run.spawnSerial += 1;
    let x;
    let y;
    if (edge === 0) { x = edgeOffset * width; y = -margin; }
    else if (edge === 1) { x = width + margin; y = edgeOffset * height; }
    else if (edge === 2) { x = edgeOffset * width; y = height + margin; }
    else { x = -margin; y = edgeOffset * height; }

    const tuning = Logic.getWaveTuning(run.wave, run.curveProfile);
    const pressure = Logic.getCombatPressure(run.wave, run.curveProfile, run.dangerLevel);
    const bossProfile = kind === "boss" ? Logic.getBossProfile(run.wave) : null;
    const base = kind === "swarm" ? { hp: 9, speed: 82, radius: 7, damage: 6, xp: 0.65 } :
      kind === "runner" ? { hp: 16, speed: 78, radius: 9, damage: 9, xp: 1 } :
        kind === "switchGuard" ? { hp: 38, speed: 45, radius: 14, damage: 12, xp: 2.5 } :
          kind === "tidecaller" ? { hp: 32, speed: 38, radius: 13, damage: 10, xp: 2.5 } :
        kind === "artillery" ? { hp: 34, speed: 34, radius: 14, damage: 12, xp: 3 } :
          kind === "spitter" ? { hp: 25, speed: 42, radius: 12, damage: 10, xp: 2 } :
            kind === "boss" ? { hp: 150, speed: 38, radius: 27, damage: 14, xp: 8 } :
              { hp: 24, speed: 52, radius: 12, damage: 12, xp: 1 };
    const contract = run.contract;
    const contractHealthMultiplier = !contract ? 1 :
      kind === "boss" ? contract.bossEnemyHealthMultiplier :
        ["spitter", "artillery", "tidecaller"].includes(kind) ? contract.rangedEnemyHealthMultiplier : contract.enemyHealthMultiplier;
    const encounterHealthMultiplier = encounter && Number.isFinite(encounter.enemyHealthMultiplier) ? encounter.enemyHealthMultiplier : 1;
    const dangerHealthMultiplier = run.danger ? run.danger.enemyHealthMultiplier : 1;
    const dangerDamageMultiplier = run.danger ? run.danger.enemyDamageMultiplier : 1;
    const dangerSpeedMultiplier = run.danger ? run.danger.enemySpeedMultiplier : 1;
    const healthMultiplier = (kind === "boss" ? tuning.healthMultiplier : tuning.baseHealthMultiplier) * contractHealthMultiplier * encounterHealthMultiplier * dangerHealthMultiplier;
    const damageMultiplier = (kind === "boss" ? tuning.damageMultiplier : tuning.baseDamageMultiplier) * (contract ? contract.enemyDamageMultiplier : 1) * dangerDamageMultiplier;
    const maxHealth = base.hp * healthMultiplier * (bossProfile ? bossProfile.healthMultiplier : 1);
    const chargeSpec = bossProfile ? Logic.getBossChargeSpec(run.wave, 1, run.curveProfile, run.dangerLevel) : null;
    const enemy = {
      id: nextEntityId++,
      kind: kind,
      x: x,
      y: y,
      radius: base.radius,
      health: maxHealth,
      maxHealth: maxHealth,
      speed: base.speed * tuning.speedMultiplier * (contract ? contract.enemySpeedMultiplier : 1) * dangerSpeedMultiplier,
      damage: base.damage * damageMultiplier,
      xpValue: base.xp,
      contactCooldown: 0,
      shootTimer: ["spitter", "tidecaller"].includes(kind)
        ? pressure.spitterFirstShotMin + runRandom() * (pressure.spitterFirstShotMax - pressure.spitterFirstShotMin)
        : kind === "artillery" ? 1.35 + runRandom() * 0.7
        : kind === "boss" ? 1.15 : 0,
      attackState: "idle",
      attackWindup: 0,
      lockedAimX: 0,
      lockedAimY: 0,
      artillerySerial: 0,
      crossfireAxis: crossfireAxis,
      crossfireBatchIndex: spawnMeta && Number.isSafeInteger(spawnMeta.batchIndex) ? spawnMeta.batchIndex : null,
      crossfirePlanIndex: spawnMeta && Number.isSafeInteger(spawnMeta.planIndex) ? spawnMeta.planIndex : null,
      carrierTraitId: spawnMeta && Logic.FIRE_TRAITS[spawnMeta.carrierTraitId] ? spawnMeta.carrierTraitId : null,
      carrierDropped: false,
      groupId: spawnMeta && typeof spawnMeta.groupId === "string" ? spawnMeta.groupId : null,
      groupLeader: Boolean(spawnMeta && spawnMeta.groupLeader),
      overrideDebt: Boolean(spawnMeta && spawnMeta.overrideDebt),
      armorBroken: false,
      guardWeaponId: null,
      sameWeaponHits: 0,
      dashTimer: kind === "runner" ? 1.8 + runRandom() * 1.2 : 0,
      dashState: "idle",
      dashWindup: 0,
      dashX: 0,
      dashY: 0,
      chargeTimer: chargeSpec ? chargeSpec.initialDelay : 0,
      chargeState: "idle",
      chargeWindup: 0,
      chargeX: 0,
      chargeY: 0,
      recoveryTimer: 0,
      bossMode: bossProfile ? bossProfile.id : null,
      bossName: bossProfile ? bossProfile.name : null,
      bossColor: bossProfile ? bossProfile.color : null,
      bossPatternReserve: bossProfile ? bossProfile.patternReserve : 0,
      bossPhaseThreshold: bossProfile ? bossProfile.phaseThreshold : 0,
      bossPhase: 1,
      bossPhasePause: 0,
      phaseWavePending: false,
      bossAttackState: "idle",
      bossAttackWindup: 0,
      bossPatternKind: null,
      patternAimX: 0,
      patternAimY: 0,
      patternGapAngle: 0,
      patternSerial: 0,
      chargeSerial: 0,
      vulnerableTimer: 0,
      aftershockPending: false,
      aftershockTimer: 0,
      majorThreatKind: null,
      majorThreatReadyAt: null,
      majorThreatWasBlocked: false,
      majorThreatAttackSerial: 0,
      debugMajorThreatBypassCrossfire: false,
      reinforcementsSpawned: false,
      burnTimer: 0,
      burnDamagePerSecond: 0,
      slowTimer: 0,
      slowMultiplier: 1,
      pursuitBatchId: null,
      pursuitDeadline: 0,
      dead: false,
      flash: 0
    };
    run.enemies.push(enemy);
    if (isCrossfire && kind === "artillery" && run.crossfire) run.crossfire.spawnSideSerial[crossfireAxis] += 1;
    if (kind === "boss") {
      run.bossId = enemy.id;
      dom.bossBar.hidden = false;
      dom.bossName.textContent = enemy.bossName;
      dom.bossPhaseMark.hidden = !enemy.bossPhaseThreshold;
      dom.bossPhaseMark.style.left = Math.round(enemy.bossPhaseThreshold * 100) + "%";
      dom.bossFill.style.background = "linear-gradient(90deg, " + enemy.bossColor + "99, " + enemy.bossColor + ")";
      emitCombatFeedback("boss-enter", { causeId: "boss-enter:" + enemy.id });
    }
    return true;
  }

  function update(delta) {
    if (!run || !run.active || run.paused || run.ended) return;
    run.elapsed += delta;
    run.weaponUsage[run.activeWeaponId] += delta;
    updatePursuitState();
    consumeFlash();
    consumeWeaponSwitch();
    updateSpawning(delta);
    updatePlayer(delta);
    updateCrossfireState();
    updateEnemies(delta);
    updatePlayerBullets(delta);
    updateWeaponEffects(delta);
    updateBossWaves(delta);
    updateSafeLanes(delta);
    updateEnemyBullets(delta);
    updateFireDrops(delta);
    updateXpOrbs(delta);
    updateParticles(delta);
    run.relayFlash = Math.max(0, run.relayFlash - delta);
    if (run.player.health <= 0) {
      if (run.mode === "tutorial") restartTutorialChallenge();
      else endRun();
      return;
    }
    if (run.mode === "tutorial") updateTutorial(delta);
    else checkWaveCompletion(delta);
  }

  function updateSpawning(delta) {
    if (!run.spawnPlan.length || run.enemies.length >= MAX_ENEMIES) return;
    run.spawnTimer -= delta;
    if (run.spawnTimer > 0) return;
    const pressure = Logic.getCombatPressure(run.wave, run.curveProfile, run.dangerLevel);
    const firstEntry = run.spawnPlan[0];
    const firstKind = crossfireEntryKind(firstEntry);
    const encounterBonus = run.encounter ? run.encounter.batchSizeBonus : 0;
    const batchSize = firstKind === "boss" ? 1 : Math.min(pressure.maxSpawnBatchSize, pressure.spawnBatchSize + encounterBonus);
    let spawned = 0;
    while (run.spawnPlan.length && run.enemies.length < MAX_ENEMIES && spawned < batchSize) {
      const entry = run.spawnPlan[0];
      const kind = crossfireEntryKind(entry);
      if (kind === "boss" && spawned > 0) break;
      if (!spawnEnemy(kind, entry && typeof entry === "object" ? entry : null)) break;
      run.spawnPlan.shift();
      spawned += 1;
    }
    run.peakEnemyCount = Math.max(run.peakEnemyCount, run.enemies.length);
    const nextSpawnDelay = run.curveProfile === REMAKE_CURVE_ID
      ? Logic.getRemakeSpawnDelay(run.wave, run.waveSpawnTotal - run.spawnPlan.length, run.waveSpawnTotal, run.dangerLevel)
      : pressure.spawnInterval;
    run.spawnTimer += firstKind === "boss" ? 0.95 : nextSpawnDelay;
  }

  function movementVector() {
    let x = 0;
    let y = 0;
    if (pressedKeys.has("arrowleft") || pressedKeys.has("a")) x -= 1;
    if (pressedKeys.has("arrowright") || pressedKeys.has("d")) x += 1;
    if (pressedKeys.has("arrowup") || pressedKeys.has("w")) y -= 1;
    if (pressedKeys.has("arrowdown") || pressedKeys.has("s")) y += 1;
    const keyboardLength = Math.hypot(x, y);
    if (keyboardLength > 0) {
      input.hasTarget = false;
      return keyboardLength > 1 ? { x: x / keyboardLength, y: y / keyboardLength } : { x: x, y: y };
    }
    if (input.movePointerActive && input.movePointerSource === "joystick") {
      return { x: input.joystickVectorX, y: input.joystickVectorY };
    }
    if (input.hasTarget && run) {
      const dx = input.targetX - run.player.x;
      const dy = input.targetY - run.player.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 7) {
        run.player.x = input.targetX;
        run.player.y = input.targetY;
        input.hasTarget = false;
        return { x: 0, y: 0 };
      }
      const strength = Math.min(1, distance / 24);
      return { x: dx / distance * strength, y: dy / distance * strength };
    }
    return { x: 0, y: 0 };
  }

  function getInactiveWeaponId() {
    if (!run) return "cinderRing";
    return getEquippedWeaponIds().find(function otherWeapon(weaponId) { return weaponId !== run.activeWeaponId; }) || "cinderRing";
  }

  function getWeaponInterval(weaponId) {
    const definition = getWeaponDefinition(weaponId);
    const behavior = getWeaponLevelBehavior(weaponId);
    return definition.baseInterval * (Number.isFinite(behavior.intervalMultiplier) ? behavior.intervalMultiplier : 1);
  }

  function getBaseCombatDamage() {
    const contract = run.contract;
    return BASE_DAMAGE * run.legacy.attackMultiplier * run.build.damageMultiplier * (contract ? contract.damageMultiplier : 1);
  }

  function resetHeatBudget() {
    if (!run) return;
    run.heatBudgetAvailable = true;
    getEquippedWeaponIds().forEach(function resetWeaponHit(weaponId) { run.ordinaryWeaponHits[weaponId] = false; });
  }

  function recordOrdinaryWeaponHit(weaponId) {
    if (!run || !Object.prototype.hasOwnProperty.call(run.ordinaryWeaponHits, weaponId)) return;
    run.ordinaryWeaponHits[weaponId] = true;
    if (getEquippedWeaponIds().every(function bothWeaponsHit(id) { return run.ordinaryWeaponHits[id]; })) resetHeatBudget();
  }

  function applyHeatAllocations(allocations, showFeedback) {
    if (!run || !run.heatBudgetAvailable || !allocations || typeof allocations !== "object") return 0;
    let totalGained = 0;
    const equipped = getEquippedWeaponIds();
    equipped.forEach(function applyWeaponHeat(weaponId) {
      const familyId = getWeaponTechniqueFamily(weaponId);
      const amount = Number(allocations[weaponId] !== undefined ? allocations[weaponId] : allocations[familyId]);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const previous = run.weaponHeat[weaponId] || 0;
      run.weaponHeat[weaponId] = clamp(previous + amount, 0, 1);
      const gained = run.weaponHeat[weaponId] - previous;
      if (gained <= 0) return;
      totalGained += gained;
      if (showFeedback && previous < 1 && run.weaponHeat[weaponId] >= 1) {
        const weapon = getWeaponDefinition(weaponId);
        addCallout(weapon.name + " · 炉热已满", run.player.x, run.player.y - 28, weapon.color);
      }
    });
    if (totalGained > 0) {
      run.heatBudgetAvailable = false;
      run.fieldHeatGained += totalGained;
      run.heatPulse = Math.max(run.heatPulse, 0.18);
    }
    return totalGained;
  }

  function addHolsteredHeat(amount, showFeedback) {
    if (!run || !Number.isFinite(amount) || amount <= 0) return 0;
    const allocations = {};
    allocations[getInactiveWeaponId()] = amount;
    return applyHeatAllocations(allocations, showFeedback);
  }

  function queueWeaponSwitch() {
    if (!run || !run.active || run.paused || run.ended || run.switchQueued || run.switchLock > 0) return false;
    if (run.choiceOpen || run.contractOpen || run.coreOpen || !dom.victoryOverlay.hidden) return false;
    if (run.mode === "tutorial" && run.tutorial && run.tutorial.step === "move") return false;
    run.switchQueued = true;
    return true;
  }

  function getFusionTarget() {
    const batch = run && run.pursuitBatch;
    if (!batch || batch.state !== "armed") return null;
    const candidates = batch.markedOwnerIds.map(findLivingEnemyById).filter(Boolean);
    candidates.sort(function prioritizeFusionTarget(first, second) {
      if (first.kind === "boss" && second.kind !== "boss") return -1;
      if (second.kind === "boss" && first.kind !== "boss") return 1;
      const firstDistance = Math.hypot(first.x - run.player.x, first.y - run.player.y);
      const secondDistance = Math.hypot(second.x - run.player.x, second.y - run.player.y);
      return firstDistance - secondDistance || first.id - second.id;
    });
    return candidates[0] || null;
  }

  function applyHeadhuntRefund(target) {
    if (!target || run.coreId !== "headhunt-core" || !["boss", "spitter"].includes(target.kind)) return 0;
    const refund = Math.min(0.8, 0.5 + run.coreLevel * 0.1);
    const gained = addHolsteredHeat(refund, false);
    if (gained > 0) addCallout("猎首回炉 +" + Math.round(gained * 100) + "%", run.player.x, run.player.y - 31, "#ffb4aa");
    return gained;
  }

  function triggerCarbineDraw(target, powerScale, isFusion) {
    if (run.playerBullets.length >= MAX_PLAYER_BULLETS) return 0;
    const player = run.player;
    const resolvedTarget = target || run.enemies.filter(function living(enemy) { return !enemy.dead; }).sort(function nearest(first, second) {
      return Math.hypot(first.x - player.x, first.y - player.y) - Math.hypot(second.x - player.x, second.y - player.y);
    })[0] || null;
    const angle = resolvedTarget ? Math.atan2(resolvedTarget.y - player.y, resolvedTarget.x - player.x) : player.aimAngle;
    player.aimAngle = angle;
    const definition = getWeaponDefinition("carbine");
    const scale = Number.isFinite(powerScale) ? powerScale : 1;
    const damage = getBaseCombatDamage() * definition.drawDamageMultiplier * run.build.drawDamageMultiplier * run.build.carbineDamageMultiplier * scale;
    run.playerBullets.push({
      id: nextEntityId++,
      projectileKind: "carbine-draw",
      weaponId: "carbine",
      fusion: Boolean(isFusion),
      headhuntAvailable: true,
      x: player.x + Math.cos(angle) * 16,
      y: player.y + Math.sin(angle) * 16,
      vx: Math.cos(angle) * definition.projectileSpeed * 1.18,
      vy: Math.sin(angle) * definition.projectileSpeed * 1.18,
      radius: 6,
      damage: damage,
      pierceLeft: definition.drawPierce + run.build.carbinePierce,
      hitIds: new Set(),
      life: 1.35,
      dead: false
    });
    run.drawSkillUses += 1;
    run.screenShake = Math.max(run.screenShake, isFusion ? 0.28 : 0.16);
    addShockwave(player.x, player.y, 58, isFusion ? "#fff0a6" : definition.color, 0.38);
    createParticles(player.x + Math.cos(angle) * 15, player.y + Math.sin(angle) * 15, isFusion ? "fusion" : "carbine", isFusion ? 18 : 10);
    return damage;
  }

  function triggerRingDraw(target, powerScale, isFusion) {
    const definition = getWeaponDefinition("cinderRing");
    const centerX = target ? target.x : run.player.x;
    const centerY = target ? target.y : run.player.y;
    const radius = definition.drawRadius + run.build.ringRepelStrength * 0.20 + (getWeaponLevel("cinderRing") >= 4 ? 18 : 0);
    const scale = Number.isFinite(powerScale) ? powerScale : 1;
    const damage = getBaseCombatDamage() * definition.drawDamageMultiplier * run.build.drawDamageMultiplier * run.build.ringDamageMultiplier * scale;
    let totalDamage = 0;
    let headhuntTarget = null;
    run.enemies.forEach(function ringDrawHit(enemy) {
      if (enemy.dead) return;
      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      if (distance > radius + enemy.radius) return;
      totalDamage += damageEnemy(enemy, damage * (enemy.kind === "boss" ? 0.82 : 1), isFusion ? "fusion" : "ring-draw", "cinderRing");
      if (enemy.kind !== "boss") {
        enemy.x += dx / distance * definition.drawKnockback;
        enemy.y += dy / distance * definition.drawKnockback;
      }
      if (!headhuntTarget && ["boss", "spitter"].includes(enemy.kind)) headhuntTarget = enemy;
    });
    applyHeadhuntRefund(headhuntTarget);
    run.drawSkillUses += 1;
    run.screenShake = Math.max(run.screenShake, isFusion ? 0.30 : 0.18);
    addShockwave(centerX, centerY, radius, isFusion ? "#fff0a6" : definition.color, 0.5);
    createParticles(centerX, centerY, isFusion ? "fusion" : "ring", isFusion ? 24 : 16);
    return totalDamage;
  }

  function triggerFireflyDraw(target, powerScale, isFusion) {
    const definition = getWeaponDefinition("fireflyBranch");
    const player = run.player;
    const candidates = run.enemies.filter(function livingFireflyDrawTarget(enemy) { return !enemy.dead; }).sort(function prioritizeFireflyDraw(first, second) {
      const firstPriority = first.kind === "boss" ? 0 : ["artillery", "spitter", "tidecaller", "switchGuard"].includes(first.kind) ? 1 : 2;
      const secondPriority = second.kind === "boss" ? 0 : ["artillery", "spitter", "tidecaller", "switchGuard"].includes(second.kind) ? 1 : 2;
      return firstPriority - secondPriority || Math.hypot(first.x - player.x, first.y - player.y) - Math.hypot(second.x - player.x, second.y - player.y);
    });
    if (target && !target.dead) {
      const targetIndex = candidates.indexOf(target);
      if (targetIndex > 0) candidates.splice(targetIndex, 1);
      if (targetIndex !== 0) candidates.unshift(target);
    }
    const count = Math.min(5, candidates.length || 1, Math.max(0, MAX_PLAYER_BULLETS - run.playerBullets.length));
    const scale = Number.isFinite(powerScale) ? powerScale : 1;
    const damage = getBaseCombatDamage() * definition.drawDamageMultiplier * run.build.drawDamageMultiplier * scale;
    for (let index = 0; index < count; index += 1) {
      const resolvedTarget = candidates[index % Math.max(1, candidates.length)] || null;
      const angle = resolvedTarget ? Math.atan2(resolvedTarget.y - player.y, resolvedTarget.x - player.x) : player.aimAngle + index / count * TAU;
      run.playerBullets.push({
        id: nextEntityId++, projectileKind: "firefly-draw", weaponId: "fireflyBranch", fusion: Boolean(isFusion),
        x: player.x + Math.cos(angle) * 14, y: player.y + Math.sin(angle) * 14,
        vx: Math.cos(angle) * definition.projectileSpeed * 1.24, vy: Math.sin(angle) * definition.projectileSpeed * 1.24,
        speed: definition.projectileSpeed * 1.24, radius: 5.4, damage: damage,
        targetId: resolvedTarget ? resolvedTarget.id : null, turnRate: 7.2, chainRemaining: getWeaponLevel("fireflyBranch") >= 3 ? 1 : 0,
        chainRadius: 170, pierceLeft: 0, hitIds: new Set(), life: 1.9, dead: false
      });
    }
    run.drawSkillUses += 1;
    run.screenShake = Math.max(run.screenShake, isFusion ? 0.25 : 0.14);
    addShockwave(player.x, player.y, 68, isFusion ? "#fff0a6" : definition.color, 0.4);
    createParticles(player.x, player.y, isFusion ? "fusion" : "heat", isFusion ? 20 : 12);
    return damage * count;
  }

  function triggerHearthSeedDraw(target, powerScale, isFusion) {
    const definition = getWeaponDefinition("hearthSeed");
    const behavior = getWeaponLevelBehavior("hearthSeed");
    const centerX = target ? target.x : run.player.x + Math.cos(run.player.aimAngle) * 64;
    const centerY = target ? target.y : run.player.y + Math.sin(run.player.aimAngle) * 64;
    const scale = Number.isFinite(powerScale) ? powerScale : 1;
    const damage = getBaseCombatDamage() * definition.drawDamageMultiplier * run.build.drawDamageMultiplier * scale;
    let totalDamage = 0;
    for (let index = 0; index < 3; index += 1) {
      const angle = -Math.PI / 2 + index / 3 * TAU;
      const seed = {
        x: clamp(centerX + Math.cos(angle) * 42, 16, ARENA_GEOMETRY.width - 16),
        y: clamp(centerY + Math.sin(angle) * 42, 16, ARENA_GEOMETRY.height - 16),
        explosionRadius: definition.explosionRadius * 0.92 * (behavior.radiusMultiplier || 1),
        damage: damage,
        petalCount: 0,
        fieldDuration: index === 0 ? behavior.fieldDuration || 0 : 0,
        fieldPulses: index === 0 ? behavior.fieldPulses || 0 : 0
      };
      totalDamage += detonateHearthSeed(seed, { source: isFusion ? "fusion" : "draw", fusion: isFusion, allowPetals: false, allowField: index === 0, knockback: 12 });
    }
    run.drawSkillUses += 1;
    run.screenShake = Math.max(run.screenShake, isFusion ? 0.30 : 0.18);
    return totalDamage;
  }

  function triggerWeaponDraw(weaponId, target, powerScale, isFusion) {
    if (weaponId === "carbine") return triggerCarbineDraw(target, powerScale, isFusion);
    if (weaponId === "fireflyBranch") return triggerFireflyDraw(target, powerScale, isFusion);
    if (weaponId === "hearthSeed") return triggerHearthSeedDraw(target, powerScale, isFusion);
    return triggerRingDraw(target, powerScale, isFusion);
  }

  function triggerFusion(weaponId, target, fullyCharged) {
    if (!target || target.dead) return false;
    const targetId = target.id;
    const targetX = target.x;
    const targetY = target.y;
    const scale = fullyCharged ? 1.35 : 1.08;
    run.pursuitAttempts += 1;
    run.pursuitHits += 1;
    clearPursuitBatch("hit");
    const totalDamage = triggerWeaponDraw(weaponId, target, scale, true);
    if (run.build.fusionHeatRefund > 0) addHolsteredHeat(run.build.fusionHeatRefund, false);
    run.pursuitDamage += totalDamage;
    if (target.kind === "boss") run.pursuitBossDamage += totalDamage;
    run.lastFusion = { targetId: targetId, weaponId: weaponId, damage: totalDamage, at: run.elapsed };
    run.fusionFlash = 0.20;
    run.screenShake = Math.max(run.screenShake, 0.34);
    addShockwave(targetX, targetY, target.radius + 78, "#fff0a6", 0.68);
    addCallout("合焰 · " + getWeaponDefinition(weaponId).shortName, targetX, targetY - target.radius - 20, "#fff4bd");
    createParticles(targetX, targetY, "fusion", 30);
    pulseVibration([30, 18, 42]);
    return true;
  }

  function triggerBearerSwitchPulse(fullyCharged) {
    if (!fullyCharged || !run || run.bearerId !== "fire-walker" || run.bearerPulseCooldown > 0) return false;
    const pulseX = run.player.x;
    const pulseY = run.player.y;
    let interrupted = 0;
    run.enemies.forEach(function interruptNearbyThreat(enemy) {
      if (enemy.dead) return;
      const dx = enemy.x - pulseX;
      const dy = enemy.y - pulseY;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      if (distance > 148 + enemy.radius) return;
      const push = enemy.kind === "boss" ? 18 : 82;
      enemy.x += dx / distance * push;
      enemy.y += dy / distance * push;
      enemy.slowTimer = Math.max(enemy.slowTimer, enemy.kind === "boss" ? 0.55 : 1.8);
      enemy.slowMultiplier = Math.min(enemy.slowMultiplier, enemy.kind === "boss" ? 0.78 : 0.48);
      interruptEnemyThreat(enemy);
      if (["boss", "switchGuard", "artillery", "tidecaller"].includes(enemy.kind)) recordThreatResolution("switch-pulse:" + enemy.id, "转火破势 +100");
      interrupted += 1;
    });
    run.bearerPulseCooldown = 8;
    addShockwave(pulseX, pulseY, 148, "#ffd08a", 0.62);
    createParticles(pulseX, pulseY, "fusion", 24);
    addCallout("燧 · 转火脉冲" + (interrupted ? " " + interrupted : ""), pulseX, pulseY - 42, "#ffe4aa");
    requestAudioEvent("heavy-impact", { causeId: "bearer-switch:" + run.wave + ":" + run.switchUses, strength: 1.05 });
    return true;
  }

  function consumeWeaponSwitch() {
    if (!run || !run.switchQueued || run.switchLock > 0) return;
    run.switchQueued = false;
    const previousWeaponId = run.activeWeaponId;
    const nextWeaponId = getInactiveWeaponId();
    const chargedHeat = run.weaponHeat[nextWeaponId] || 0;
    const fullyCharged = chargedHeat >= 0.995;
    const fusionTarget = getFusionTarget();
    const techniqueWeaponId = getWeaponTechniqueFamily(nextWeaponId);
    const forged = Logic.forgeTechnique(run.forge, techniqueWeaponId, fullyCharged, run.wave);
    run.forge = forged.state;
    run.activeWeaponId = nextWeaponId;
    run.weaponProgress.activeWeaponId = nextWeaponId;
    run.weaponHeat[nextWeaponId] = 0;
    run.weaponHeat[previousWeaponId] = 0;
    run.switchLock = WEAPON_SWITCH_LOCK;
    run.swapHasteWindow = 1.8;
    run.switchUses += 1;
    run.player.attackTimer = Math.min(run.player.attackTimer, 0.08);
    if (run.coreId === "twin-core") run.twinWindow = 2.4 + run.coreLevel * 0.35;
    if (forged.forged) {
      addCallout("成招 · " + forged.technique.name, run.player.x, run.player.y - 42, forged.technique.color);
      showToast(forged.technique.name + "：异兵命中招眼即可结算");
      run.screenShake = Math.max(run.screenShake, 0.20);
    }
    if (fusionTarget) {
      if (forged.forged) handleTechniqueHit(fusionTarget, techniqueWeaponId);
      triggerFusion(nextWeaponId, fusionTarget, fullyCharged);
    } else if (fullyCharged) {
      triggerWeaponDraw(nextWeaponId, null, 1, false);
      addCallout("拔焰 · " + getWeaponDefinition(nextWeaponId).shortName, run.player.x, run.player.y - 31, getWeaponDefinition(nextWeaponId).color);
    } else {
      addCallout("换火 · " + getWeaponDefinition(nextWeaponId).name, run.player.x, run.player.y - 29, getWeaponDefinition(nextWeaponId).color);
    }
    triggerBearerSwitchPulse(fullyCharged);
    createParticles(run.player.x, run.player.y, techniqueWeaponId === "carbine" ? "carbine" : "ring", fullyCharged ? 12 : 6);
  }

  function queueFlash() {
    if (!run || !run.active || run.paused || run.ended || run.flashCooldown > 0 || run.flashQueued) return false;
    if (run.choiceOpen || run.contractOpen || run.coreOpen || !dom.victoryOverlay.hidden) return false;
    if (run.mode === "tutorial" && run.tutorial && ["move", "switch"].includes(run.tutorial.step)) return false;
    run.flashQueuedDirection = flashDirection();
    run.flashQueued = true;
    return true;
  }

  function flashDirection() {
    let x = 0;
    let y = 0;
    if (pressedKeys.has("arrowleft") || pressedKeys.has("a")) x -= 1;
    if (pressedKeys.has("arrowright") || pressedKeys.has("d")) x += 1;
    if (pressedKeys.has("arrowup") || pressedKeys.has("w")) y -= 1;
    if (pressedKeys.has("arrowdown") || pressedKeys.has("s")) y += 1;
    if (Math.hypot(x, y) <= 0.01 && input.movePointerActive && input.movePointerSource === "joystick") {
      x = input.joystickVectorX;
      y = input.joystickVectorY;
    }
    if (Math.hypot(x, y) <= 0.01 && input.hasTarget) {
      x = input.targetX - run.player.x;
      y = input.targetY - run.player.y;
    }
    if (Math.hypot(x, y) <= 0.01) {
      x = run.lastMoveX;
      y = run.lastMoveY;
    }
    const length = Math.max(0.001, Math.hypot(x, y));
    return { x: x / length, y: y / length };
  }

  function pointToSegmentDistance(px, py, startX, startY, endX, endY) {
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY;
    if (lengthSquared <= 0.0001) return Math.hypot(px - startX, py - startY);
    const projection = clamp(((px - startX) * segmentX + (py - startY) * segmentY) / lengthSquared, 0, 1);
    return Math.hypot(px - (startX + segmentX * projection), py - (startY + segmentY * projection));
  }

  function findLivingEnemyById(id) {
    return run.enemies.find(function findOwner(enemy) {
      return enemy.id === id && !enemy.dead && enemy.health > 0;
    }) || null;
  }

  function getFlashSegment(direction) {
    const player = run.player;
    return {
      startX: player.x,
      startY: player.y,
      endX: clamp(player.x + direction.x * Logic.ACTIVE_ABILITY.distance, player.radius, ARENA_GEOMETRY.width - player.radius),
      endY: clamp(player.y + direction.y * Logic.ACTIVE_ABILITY.distance, player.radius, ARENA_GEOMETRY.height - player.radius)
    };
  }

  function getReturnFirePlan(segment) {
    const ability = Logic.ACTIVE_ABILITY;
    const threadedSelection = Logic.getReturnFireSelection(
      run.enemyBullets,
      segment.startX,
      segment.startY,
      segment.endX,
      segment.endY,
      ability.threadRadius,
      0
    );
    const bulletById = new Map();
    run.enemyBullets.forEach(function indexBullet(bullet) { bulletById.set(bullet.id, bullet); });
    const threadedBullets = threadedSelection.threadedIds.map(function resolveBullet(id) {
      return bulletById.get(id);
    }).filter(Boolean);
    const eligibleBullets = threadedBullets.filter(function hasLivingOwner(bullet) {
      return Boolean(findLivingEnemyById(bullet.ownerId));
    });
    const returnSelection = Logic.getReturnFireSelection(
      eligibleBullets,
      segment.startX,
      segment.startY,
      segment.endX,
      segment.endY,
      ability.threadRadius,
      ability.returnMaxCount
    );
    const capturedIds = new Set(returnSelection.capturedIds);
    return {
      threadedBullets: threadedBullets,
      eligibleCount: eligibleBullets.length,
      capturedBullets: eligibleBullets.filter(function captured(bullet) { return capturedIds.has(bullet.id); })
    };
  }

  function clearPursuitBatch(reason) {
    const batch = run && run.pursuitBatch;
    if (!batch) return null;
    run.enemies.forEach(function clearEnemyMark(enemy) {
      if (enemy.pursuitBatchId === batch.id) {
        enemy.pursuitBatchId = null;
        enemy.pursuitDeadline = 0;
      }
    });
    run.playerBullets.forEach(function clearBatchProjectile(bullet) {
      if (bullet.projectileKind === "returned" && bullet.markBatchId === batch.id) bullet.dead = true;
    });
    run.playerBullets = run.playerBullets.filter(function keepOtherProjectile(bullet) { return !bullet.dead; });
    run.pursuitBatch = null;
    if (reason === "expired") run.pursuitExpired += 1;
    else if (!["hit", "miss"].includes(reason)) run.pursuitInvalidated += 1;
    return batch;
  }

  function createPursuitBatch() {
    const batch = {
      id: ++run.pursuitBatchSerial,
      state: "in_flight",
      deadline: 0,
      markedOwnerIds: [],
      projectileIds: []
    };
    run.pursuitBatch = batch;
    run.pursuitBatchesCreated += 1;
    return batch;
  }

  function finishPursuitProjectile(bullet) {
    const batch = run.pursuitBatch;
    if (!batch || batch.id !== bullet.markBatchId) return;
    batch.projectileIds = batch.projectileIds.filter(function keepProjectile(id) { return id !== bullet.id; });
    if (batch.projectileIds.length === 0 && batch.markedOwnerIds.length === 0) clearPursuitBatch("empty");
  }

  function applyPursuitMark(target, batchId) {
    const batch = run.pursuitBatch;
    if (!batch || batch.id !== batchId || target.dead || target.health <= 0) return false;
    if (batch.markedOwnerIds.includes(target.id)) return true;
    if (batch.markedOwnerIds.length >= Logic.ACTIVE_ABILITY.returnMaxCount) return false;
    const firstMark = batch.markedOwnerIds.length === 0;
    if (!batch.deadline) batch.deadline = run.elapsed + Logic.ACTIVE_ABILITY.markDuration;
    batch.markedOwnerIds.push(target.id);
    batch.state = "armed";
    target.pursuitBatchId = batch.id;
    target.pursuitDeadline = batch.deadline;
    run.pursuitMarksApplied += 1;
    if (firstMark) {
      addCallout("熔印已成 · 换火合焰", target.x, target.y - target.radius - 18, "#fff1a8");
      run.screenShake = Math.max(run.screenShake, 0.08);
      pulseVibration(20);
    }
    return true;
  }

  function removePursuitMarkForEnemy(enemyId) {
    const batch = run.pursuitBatch;
    if (!batch || !batch.markedOwnerIds.includes(enemyId)) return;
    batch.markedOwnerIds = batch.markedOwnerIds.filter(function keepOwner(id) { return id !== enemyId; });
    run.pursuitTargetDeaths += 1;
    if (batch.markedOwnerIds.length === 0) {
      if (batch.projectileIds.length > 0) batch.state = "in_flight";
      else clearPursuitBatch("target-death");
    }
  }

  function updatePursuitState() {
    const batch = run.pursuitBatch;
    if (!batch || !batch.deadline) return;
    if (run.elapsed + 1e-9 >= batch.deadline) clearPursuitBatch("expired");
  }

  function spawnReturnFireBullets(capturedBullets, endX, endY, baseDamage, pursuitBatch) {
    const ability = Logic.ACTIVE_ABILITY;
    const availableSlots = Math.max(0, MAX_PLAYER_BULLETS - run.playerBullets.length);
    const bulletsToSpawn = capturedBullets.slice(0, availableSlots);
    bulletsToSpawn.forEach(function spawnReturnedBullet(sourceBullet, index) {
      const target = findLivingEnemyById(sourceBullet.ownerId);
      if (!target) return;
      const angle = Math.atan2(target.y - endY, target.x - endX);
      const lateralOffset = (index - (bulletsToSpawn.length - 1) / 2) * 6;
      const startX = endX - Math.sin(angle) * lateralOffset;
      const startY = endY + Math.cos(angle) * lateralOffset;
      const bossScale = target.kind === "boss" ? ability.returnBossDamageMultiplier : 1;
      const returnedBullet = {
        id: nextEntityId++,
        projectileKind: "returned",
        sourceBulletId: sourceBullet.id,
        sourceOwnerKind: sourceBullet.ownerKind,
        targetId: target.id,
        targetWasBoss: target.kind === "boss",
        x: startX,
        y: startY,
        vx: Math.cos(angle) * ability.returnSpeed,
        vy: Math.sin(angle) * ability.returnSpeed,
        radius: ability.returnRadius,
        damage: baseDamage * ability.returnDamageMultiplier * bossScale,
        pierceLeft: 0,
        hitIds: new Set(),
        markBatchId: pursuitBatch ? pursuitBatch.id : null,
        linkLife: 0.65,
        life: ability.returnLifetime,
        dead: false
      };
      run.playerBullets.push(returnedBullet);
      if (pursuitBatch) pursuitBatch.projectileIds.push(returnedBullet.id);
    });
    return bulletsToSpawn.length;
  }

  function addShockwave(x, y, radius, color, duration) {
    if (run.shockwaves.length >= MAX_WORLD_EFFECTS) run.shockwaves.shift();
    run.shockwaves.push({ x: x, y: y, radius: radius, life: duration, maxLife: duration, color: color });
  }

  function addCallout(textValue, x, y, color) {
    if (run.callouts.length >= 8) run.callouts.shift();
    run.callouts.push({ text: textValue, x: x, y: y, life: 0.7, maxLife: 0.7, color: color });
  }

  function resolveRuntimeFireEvent(baseTraitId, event) {
    return Logic.resolveFireEvent({
      baseTraitId: baseTraitId,
      contractId: run.contract ? run.contract.id : null,
      coreId: run.coreId,
      activeWeaponId: run.activeWeaponId,
      heatBudgetAvailable: run.heatBudgetAvailable,
      event: event || {}
    });
  }

  function spawnFireDrop(traitId, x, y, metadata) {
    if (!run || !Logic.FIRE_TRAITS[traitId]) return null;
    if (run.fireDrops.length >= MAX_FIRE_DROPS) run.fireDrops.shift();
    const drop = Object.assign({
      id: nextEntityId++,
      traitId: traitId,
      x: x,
      y: y,
      radius: 7,
      life: 12,
      maxLife: 12,
      storeCount: 1,
      refined: false,
      dead: false
    }, metadata || {});
    run.fireDrops.push(drop);
    return drop;
  }

  function normalizeFireKillSource(source) {
    if (source === "return-fire" || source === "fusion") return source;
    if (source === "draw" || source === "ring-draw") return "draw";
    return "projectile";
  }

  function spawnCarrierFireDrop(enemy, source, overrides) {
    if (!run || !enemy || !enemy.carrierTraitId || enemy.carrierDropped) return null;
    const event = Object.assign({
      type: "drop",
      killSource: normalizeFireKillSource(source),
      enemyKind: enemy.kind,
      armorBroken: enemy.armorBroken === true,
      refined: ["return-fire", "fusion"].includes(source)
    }, overrides || {});
    const resolution = resolveRuntimeFireEvent(enemy.carrierTraitId, event);
    enemy.carrierDropped = true;
    return spawnFireDrop(resolution.traitId, enemy.x, enemy.y, {
      storeCount: resolution.count,
      refined: resolution.feedback.refined === true,
      sourceEnemyId: enemy.id,
      sourceKind: enemy.kind,
      killSource: event.killSource
    });
  }

  function applyFireHeatResolution(resolution, x, y, label) {
    if (!resolution || resolution.heatTotal <= 0) return 0;
    const gained = applyHeatAllocations(resolution.heatAllocations, false);
    if (gained > 0) {
      addCallout((label || "焚火回热") + " +" + Math.round(gained * 100) + "%", x, y - 18, "#fff0a6");
      createParticles(x, y, "heat", 8);
    }
    return gained;
  }

  function collectFireDrop(drop) {
    if (!run || !drop || drop.dead) return false;
    const collected = Logic.collectFireFragment(run.forge, drop.traitId, {
      count: drop.storeCount === 2 ? 2 : 1,
      canOverride: true
    });
    if (!collected.accepted) {
      if (collected.reason === "slots-full") addCallout("火槽已满 · 先炼核或焚火", drop.x, drop.y - 16, "#ffd0a0");
      return false;
    }
    run.forge = collected.state;
    drop.dead = true;
    const trait = Logic.FIRE_TRAITS[drop.traitId];
    addCallout((drop.refined ? "精炼" : "收火") + " · " + trait.name + (collected.storedCount === 2 ? " ×2" : ""), drop.x, drop.y - 16, trait.color);
    createParticles(drop.x, drop.y, drop.traitId === "sharp" ? "carbine" : "ring", 9);
    if (collected.formedCoreTraitId) {
      const coreTrait = Logic.FIRE_TRAITS[collected.formedCoreTraitId];
      addCallout("炼核 · " + coreTrait.name, run.player.x, run.player.y - 36, coreTrait.color);
      run.screenShake = Math.max(run.screenShake, 0.12);
    }
    if (collected.replacedCoreTraitId) {
      const overrideResolution = resolveRuntimeFireEvent(collected.formedCoreTraitId, {
        type: "override",
        oldCoreTraitId: collected.replacedCoreTraitId
      });
      applyFireHeatResolution(overrideResolution, drop.x, drop.y, "覆核返热");
      if (overrideResolution.compensationFragmentTraitId) {
        spawnFireDrop(overrideResolution.compensationFragmentTraitId, drop.x + 12, drop.y - 8, { life: 8, maxLife: 8 });
        run.nextCarrierOverrideTraitId = collected.replacedCoreTraitId;
      }
    }
    return true;
  }

  function burnFireDrop(drop) {
    if (!run || !drop || drop.dead) return false;
    const burned = Logic.burnFireFragment(run.forge, drop.traitId);
    if (!burned.accepted) return false;
    run.forge = burned.state;
    drop.dead = true;
    const resolution = resolveRuntimeFireEvent(drop.traitId, { type: "burn" });
    applyFireHeatResolution(resolution, drop.x, drop.y, "焚火回热");
    addCallout("焚火 · " + Logic.FIRE_TRAITS[drop.traitId].name, drop.x, drop.y - 17, Logic.FIRE_TRAITS[drop.traitId].color);
    return true;
  }

  function burnFireDropsAlongSegment(segment) {
    run.fireDrops.forEach(function burnThreadedDrop(drop) {
      if (!drop.dead && pointToSegmentDistance(drop.x, drop.y, segment.startX, segment.startY, segment.endX, segment.endY) <= Logic.ACTIVE_ABILITY.threadRadius) {
        burnFireDrop(drop);
      }
    });
    run.fireDrops = run.fireDrops.filter(function keepFireDrop(drop) { return !drop.dead; });
  }

  function updateFireDrops(delta) {
    const player = run.player;
    const pickupRadius = Math.min(MAX_PICKUP_RADIUS, BASE_PICKUP_RADIUS * run.build.pickupRadiusMultiplier);
    run.fireDrops.forEach(function moveFireDrop(drop) {
      if (drop.dead) return;
      drop.life -= delta;
      if (drop.life <= 0) {
        drop.dead = true;
        return;
      }
      const pullTarget = player;
      const dx = pullTarget.x - drop.x;
      const dy = pullTarget.y - drop.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      if (distance < pickupRadius) {
        const speed = 80 + (pickupRadius - distance) * 2.4;
        drop.x += dx / distance * speed * delta;
        drop.y += dy / distance * speed * delta;
      }
      const playerDistance = Math.hypot(player.x - drop.x, player.y - drop.y);
      if (playerDistance <= player.radius + drop.radius + 3) collectFireDrop(drop);
    });
    run.fireDrops = run.fireDrops.filter(function keepFireDrop(drop) { return !drop.dead; });
  }

  function findNextHighThreat(excludedId) {
    const priority = { boss: 0, artillery: 1, switchGuard: 2, tidecaller: 3, spitter: 4, runner: 5, chaser: 6, swarm: 7 };
    return run.enemies.filter(function candidate(enemy) {
      return !enemy.dead && enemy.id !== excludedId;
    }).sort(function threatOrder(first, second) {
      return (priority[first.kind] === undefined ? 9 : priority[first.kind]) - (priority[second.kind] === undefined ? 9 : priority[second.kind]) ||
        Math.hypot(first.x - run.player.x, first.y - run.player.y) - Math.hypot(second.x - run.player.x, second.y - run.player.y);
    })[0] || null;
  }

  function interruptEnemyThreat(enemy) {
    if (!enemy || enemy.dead) return;
    clearMajorThreatPending(enemy);
    if (enemy.kind === "runner") {
      enemy.dashState = "recovery";
      enemy.dashWindup = 0.7;
    }
    if (["spitter", "artillery", "tidecaller"].includes(enemy.kind)) {
      enemy.attackState = "recoil";
      enemy.attackWindup = 0.55;
    }
    if (enemy.kind === "boss") {
      enemy.vulnerableTimer = Math.max(enemy.vulnerableTimer, 0.65);
      enemy.bossAttackState = "idle";
      enemy.shootTimer = Math.max(enemy.shootTimer, 0.8);
    }
  }

  function addSafeLane(startX, startY, endX, endY, color) {
    if (run.safeLanes.length >= MAX_SAFE_LANES) run.safeLanes.shift();
    run.safeLanes.push({
      startX: startX,
      startY: startY,
      endX: endX,
      endY: endY,
      width: 34 + run.build.ringTechniqueSweepBonus * 4,
      life: 1.45,
      maxLife: 1.45,
      color: color
    });
  }

  function applyTechniqueConnection(connection, triggerEnemy) {
    if (!connection || !connection.connected || !connection.technique || !connection.eye) return false;
    const technique = connection.technique;
    const eye = connection.eye;
    const targetX = triggerEnemy ? triggerEnemy.x : eye.x;
    const targetY = triggerEnemy ? triggerEnemy.y : eye.y;
    const baseDamage = getBaseCombatDamage();
    if (technique.resultKind === "break-line") {
      let endX = targetX;
      let endY = targetY;
      if (Math.hypot(endX - eye.x, endY - eye.y) < 8) {
        endX = eye.x + Math.cos(run.player.aimAngle) * 220;
        endY = eye.y + Math.sin(run.player.aimAngle) * 220;
      }
      const lineWidth = 26 + run.build.carbineTechniqueBreakBonus * 4;
      run.enemies.slice().forEach(function breakLineEnemy(enemy) {
        if (enemy.dead || pointToSegmentDistance(enemy.x, enemy.y, eye.x, eye.y, endX, endY) > lineWidth + enemy.radius) return;
        interruptEnemyThreat(enemy);
        damageEnemy(enemy, baseDamage * (1.15 + run.build.carbineTechniqueBreakBonus * 0.16), "technique", null);
      });
      addSafeLane(eye.x, eye.y, endX, endY, technique.color);
    } else if (technique.resultKind === "lock-loop") {
      const target = triggerEnemy && !triggerEnemy.dead ? triggerEnemy : findLivingEnemyById(eye.targetId) || findNextHighThreat(null);
      if (target) {
        interruptEnemyThreat(target);
        target.slowTimer = Math.max(target.slowTimer, 1.4 + run.build.ringTechniqueSweepBonus * 0.12);
        target.slowMultiplier = Math.min(target.slowMultiplier, 0.42);
        damageEnemy(target, baseDamage * (1.35 + run.build.ringTechniqueSweepBonus * 0.12), "technique", null);
      }
      addShockwave(targetX, targetY, 68 + run.build.ringTechniqueSweepBonus * 5, technique.color, 0.45);
    } else if (technique.resultKind === "cross-burst") {
      const sweepRadius = 150 + run.build.ringTechniqueSweepBonus * 8;
      const sweepWidth = 24 + run.build.ringTechniqueSweepBonus * 3;
      run.enemies.slice().forEach(function crossEnemy(enemy) {
        if (enemy.dead) return;
        const dx = Math.abs(enemy.x - eye.x);
        const dy = Math.abs(enemy.y - eye.y);
        if ((dx <= sweepRadius && dy <= sweepWidth + enemy.radius) || (dy <= sweepRadius && dx <= sweepWidth + enemy.radius)) {
          damageEnemy(enemy, baseDamage * 0.88, "technique", null);
        }
      });
      run.enemyBullets.forEach(function clearCrossBullet(bullet) {
        const dx = Math.abs(bullet.x - eye.x);
        const dy = Math.abs(bullet.y - eye.y);
        if ((dx <= sweepRadius && dy <= sweepWidth) || (dy <= sweepRadius && dx <= sweepWidth)) bullet.dead = true;
      });
      addShockwave(eye.x, eye.y, sweepRadius, technique.color, 0.52);
    } else if (technique.resultKind === "safe-lane") {
      let dx = targetX - eye.x;
      let dy = targetY - eye.y;
      const length = Math.max(0.001, Math.hypot(dx, dy));
      dx /= length;
      dy /= length;
      addSafeLane(eye.x, eye.y, eye.x + dx * 270, eye.y + dy * 270, technique.color);
    }
    run.techniqueConnections += 1;
    run.techniqueResults[technique.id] = (run.techniqueResults[technique.id] || 0) + 1;
    run.lastTechniqueConnectionAt = run.elapsed;
    if (triggerEnemy && triggerEnemy.kind === "boss") run.bossBreakMethod = technique.name;
    addCallout("接眼 · " + technique.name, eye.x, eye.y - 24, technique.color);
    createParticles(eye.x, eye.y, "fusion", 18);
    run.screenShake = Math.max(run.screenShake, 0.18);
    return true;
  }

  function handleTechniqueHit(enemy, weaponId) {
    if (!run || !enemy || !weaponId || !run.forge.currentTechniqueId) return;
    if (run.forge.eye) {
      const connection = Logic.resolveTechniqueEye(run.forge, weaponId);
      run.forge = connection.state;
      if (connection.connected) applyTechniqueConnection(connection, enemy);
      return;
    }
    const created = Logic.createTechniqueEye(run.forge, {
      weaponId: weaponId,
      targetId: enemy.id,
      x: enemy.x,
      y: enemy.y,
      wave: run.wave,
      twinFlexible: run.coreId === "twin-core"
    });
    run.forge = created.state;
    if (created.created) {
      const technique = Logic.getTechniqueById(created.eye.techniqueId);
      addCallout("招眼 · " + (technique ? technique.name : "待接"), enemy.x, enemy.y - enemy.radius - 14, technique ? technique.color : "#fff0a6");
    }
  }

  function updateSafeLanes(delta) {
    run.safeLanes.forEach(function updateLane(lane) {
      lane.life -= delta;
      if (lane.kind === "searing") return;
      run.enemyBullets.forEach(function clearLaneBullet(bullet) {
        if (!bullet.dead && pointToSegmentDistance(bullet.x, bullet.y, lane.startX, lane.startY, lane.endX, lane.endY) <= lane.width) bullet.dead = true;
      });
      run.enemies.forEach(function pushLaneEnemy(enemy) {
        if (enemy.dead || enemy.kind === "boss") return;
        const distance = pointToSegmentDistance(enemy.x, enemy.y, lane.startX, lane.startY, lane.endX, lane.endY);
        if (distance > lane.width + enemy.radius) return;
        const laneX = lane.endX - lane.startX;
        const laneY = lane.endY - lane.startY;
        const laneLength = Math.max(0.001, Math.hypot(laneX, laneY));
        const side = Math.sign(laneX * (enemy.y - lane.startY) - laneY * (enemy.x - lane.startX)) || 1;
        enemy.x += -laneY / laneLength * side * 42 * delta;
        enemy.y += laneX / laneLength * side * 42 * delta;
      });
    });
    run.safeLanes = run.safeLanes.filter(function keepLane(lane) { return lane.life > 0; });
  }

  function applyBearerFlashStyle(segment, endX, endY) {
    if (!run) return;
    if (run.bearerId === "ridge-breaker") {
      let scorched = 0;
      const baseDamage = getBaseCombatDamage();
      run.enemies.forEach(function scorchFlashLine(enemy) {
        if (enemy.dead || pointToSegmentDistance(enemy.x, enemy.y, segment.startX, segment.startY, segment.endX, segment.endY) > 27 + enemy.radius) return;
        enemy.burnTimer = Math.max(enemy.burnTimer, 2.6);
        enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, baseDamage * (enemy.kind === "boss" ? 0.34 : 0.62));
        if (["switchGuard", "artillery", "boss"].includes(enemy.kind)) recordThreatResolution("searing-line:" + enemy.id, "火线破势 +100");
        scorched += 1;
      });
      run.safeLanes.push({
        kind: "searing",
        startX: segment.startX,
        startY: segment.startY,
        endX: segment.endX,
        endY: segment.endY,
        width: 24,
        color: "#ff8b4c",
        life: 2.6,
        maxLife: 2.6
      });
      if (scorched > 0) addCallout("岚 · 踏焰火线 " + scorched, endX, endY - 38, "#ffb06c");
      createParticles(endX, endY, "heavy-hit", 14);
      return;
    }
    if (run.bearerId !== "tide-warden") return;
    let clearedBullets = 0;
    run.enemyBullets.forEach(function clearNearbyBullet(bullet) {
      if (Math.hypot(bullet.x - endX, bullet.y - endY) > 148) return;
      bullet.dead = true;
      clearedBullets += 1;
    });
    run.enemyBullets = run.enemyBullets.filter(function keepUnclearedBullet(bullet) { return !bullet.dead; });
    let pushed = 0;
    run.enemies.forEach(function pushFromTide(enemy) {
      if (enemy.dead || enemy.kind === "boss") return;
      const dx = enemy.x - endX;
      const dy = enemy.y - endY;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      if (distance > 132 + enemy.radius) return;
      enemy.x += dx / distance * 76;
      enemy.y += dy / distance * 76;
      enemy.slowTimer = Math.max(enemy.slowTimer, 1.5);
      enemy.slowMultiplier = Math.min(enemy.slowMultiplier, 0.55);
      if (["switchGuard", "artillery"].includes(enemy.kind)) recordThreatResolution("guardian-tide:" + enemy.id, "护潮退敌 +100");
      pushed += 1;
    });
    run.player.health = Math.min(run.player.maxHealth, run.player.health + run.player.maxHealth * 0.03);
    addShockwave(endX, endY, 142, "#72e6f1", 0.6);
    createParticles(endX, endY, "ring", 22);
    addCallout("澜 · 护火潮 " + (clearedBullets + pushed), endX, endY - 40, "#aaf7ff");
  }

  function consumeFlash() {
    if (!run.flashQueued || run.flashCooldown > 0) return;
    updatePursuitState();
    run.flashQueued = false;
    const ability = Logic.ACTIVE_ABILITY;
    const direction = run.flashQueuedDirection || flashDirection();
    run.flashQueuedDirection = null;
    run.lastFlashDirection = { x: direction.x, y: direction.y };
    const player = run.player;
    const segment = getFlashSegment(direction);
    const startX = segment.startX;
    const startY = segment.startY;
    const endX = segment.endX;
    const endY = segment.endY;
    burnFireDropsAlongSegment(segment);
    const returnPlan = getReturnFirePlan(segment);
    const threaded = returnPlan.threadedBullets.length;
    returnPlan.threadedBullets.forEach(function neutralizeBullet(bullet) { bullet.dead = true; });
    run.enemyBullets = run.enemyBullets.filter(function keepUnthreaded(bullet) { return !bullet.dead; });
    for (let index = 0; index < 6; index += 1) {
      if (run.afterimages.length >= MAX_WORLD_EFFECTS) run.afterimages.shift();
      const progress = index / 5;
      run.afterimages.push({
        x: startX + (endX - startX) * progress,
        y: startY + (endY - startY) * progress,
        life: 0.18 + index * 0.025,
        maxLife: 0.33,
        radius: player.radius,
        bearerId: run.bearerId
      });
    }
    player.x = endX;
    player.y = endY;
    player.invulnerable = Math.max(player.invulnerable, ability.invulnerability);
    run.distanceTraveled += Math.hypot(endX - startX, endY - startY);
    run.lastMoveX = direction.x;
    run.lastMoveY = direction.y;
    if (input.hasTarget && Math.hypot(input.targetX - endX, input.targetY - endY) <= 12) input.hasTarget = false;
    applyBearerFlashStyle(segment, endX, endY);

    const backfire = threaded > 0;
    const contract = run.contract;
    let impactRadius = ability.normalRadius;
    if (contract && contract.id === "surging-tide") impactRadius = Math.max(impactRadius, ability.tideRadius);
    const baseDamage = getBaseCombatDamage();
    const availableReturnSlots = Math.max(0, MAX_PLAYER_BULLETS - run.playerBullets.length);
    const willReturn = Math.min(returnPlan.capturedBullets.length, availableReturnSlots);
    const newPursuitBatch = willReturn > 0 ? (run.pursuitBatch || createPursuitBatch()) : null;
    const returned = spawnReturnFireBullets(returnPlan.capturedBullets, endX, endY, baseDamage, newPursuitBatch);
    if (newPursuitBatch && returned <= 0) clearPursuitBatch("empty");
    const impactDamage = baseDamage * ability.normalDamageMultiplier;
    run.enemies.forEach(function impactEnemy(enemy) {
      if (enemy.dead) return;
      const dx = enemy.x - endX;
      const dy = enemy.y - endY;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      if (distance > impactRadius + enemy.radius) return;
      const bossScale = enemy.kind === "boss" ? ability.bossDamageMultiplier : 1;
      damageEnemy(enemy, impactDamage * bossScale, "flash");
      if (contract && contract.id === "surging-tide" && enemy.kind !== "boss") {
        enemy.x += dx / distance * ability.tideKnockback;
        enemy.y += dy / distance * ability.tideKnockback;
      }
    });
    if (contract && contract.id === "still-hunt") run.flashHuntWindow = ability.huntWindow;
    if (contract && contract.id === "lone-edge" && returned > 0) run.flashEmpoweredShots = ability.edgeEmpoweredShots;
    if (backfire && run.coreId === "return-core") {
      const allocations = {};
      allocations[getInactiveWeaponId()] = 1;
      if (applyHeatAllocations(allocations, false) > 0) {
        run.heatPulse = 0.28;
        addCallout("回火炉心 · 共享回热", endX, endY - 42, "#fff1a8");
      }
    }
    run.flashCooldown = ability.cooldown;
    run.flashUses += 1;
    run.flashBulletsThreaded += threaded;
    run.flashBulletsReturned += returned;
    run.flashReturnOrphans += Math.max(0, threaded - returnPlan.eligibleCount);
    run.flashReturnCapacityDropped += Math.max(0, returnPlan.eligibleCount - returned);
    run.lastFlashReturned = returned;
    if (backfire) run.flashBackfires += 1;
    addShockwave(endX, endY, impactRadius, backfire ? "#ffd06f" : "#6fd6e7", backfire ? 0.48 : 0.36);
    addCallout(backfire ? "回火 · 借 " + returned : "爆闪", endX, endY - 24, backfire ? "#ffe39d" : "#b9f5ff");
    emitCombatFeedback("flash-complete", {
      x: endX,
      y: endY,
      variant: backfire ? "backfire" : "normal",
      causeId: "flash:" + run.wave + ":" + run.flashUses
    });
    dom.dragHint.classList.add("is-hidden");
    pulseVibration(backfire ? [18, 25, 24] : 18);
  }

  function updatePlayer(delta) {
    const player = run.player;
    const movement = movementVector();
    const movementStrength = Math.hypot(movement.x, movement.y);
    run.flashCooldown = Math.max(0, run.flashCooldown - delta);
    run.bearerPulseCooldown = Math.max(0, (run.bearerPulseCooldown || 0) - delta);
    if (run.flashCooldown < 1e-9) run.flashCooldown = 0;
    run.switchLock = Math.max(0, run.switchLock - delta);
    run.swapHasteWindow = Math.max(0, run.swapHasteWindow - delta);
    run.twinWindow = Math.max(0, run.twinWindow - delta);
    run.heatPulse = Math.max(0, run.heatPulse - delta);
    run.fusionFlash = Math.max(0, run.fusionFlash - delta);
    const holsteredWeaponId = getInactiveWeaponId();
    const previousHeat = run.weaponHeat[holsteredWeaponId] || 0;
    run.weaponHeat[holsteredWeaponId] = clamp(previousHeat + delta / HOLSTER_CHARGE_SECONDS * run.build.drawChargeRateMultiplier, 0, 1);
    if (previousHeat < 1 && run.weaponHeat[holsteredWeaponId] >= 1) {
      run.heatPulse = Math.max(run.heatPulse, 0.16);
      resetHeatBudget();
    }
    if (run.autoSwitchRequiresHeatReset && run.weaponHeat[holsteredWeaponId] < 0.995) run.autoSwitchRequiresHeatReset = false;
    if (run.autoSwitch && !run.autoSwitchRequiresHeatReset && run.wave >= 3 && run.weaponHeat[holsteredWeaponId] >= 0.995 && !run.switchQueued && run.switchLock <= 0) {
      if (queueWeaponSwitch()) run.autoSwitches += 1;
    }
    run.flashHuntWindow = Math.max(0, run.flashHuntWindow - delta);
    run.stationaryTime = movementStrength > 0.04 ? 0 : run.stationaryTime + delta;
    if (input.movePointerActive || pressedKeys.size > 0) run.heldInputTime += delta;
    const speed = BASE_MOVE_SPEED * run.build.moveSpeedMultiplier;
    player.speed = speed;
    const previousX = player.x;
    const previousY = player.y;
    player.x += movement.x * speed * delta;
    player.y += movement.y * speed * delta;
    player.x = clamp(player.x, player.radius, ARENA_GEOMETRY.width - player.radius);
    player.y = clamp(player.y, player.radius, ARENA_GEOMETRY.height - player.radius);
    const walkedDistance = Math.hypot(player.x - previousX, player.y - previousY);
    run.distanceTraveled += walkedDistance;
    if (run.mode === "tutorial" && run.tutorial) run.tutorial.walkDistance += walkedDistance;
    if (movementStrength > 0.04) {
      run.lastMoveX = movement.x / movementStrength;
      run.lastMoveY = movement.y / movementStrength;
      run.trailTimer -= delta;
      if (!reducedMotion && run.trailTimer <= 0) {
        run.trailTimer = 0.07;
        const trailSpawned = createParticles(previousX, previousY, "trail", 1, {
          feedbackClass: "ambient",
          eventName: "movement-trail",
          eventId: "trail:" + run.wave
        });
        feedbackDiagnostics.trailParticlesSpawned += trailSpawned;
      }
    } else {
      run.trailTimer = 0;
    }
    player.invulnerable = Math.max(0, player.invulnerable - delta);
    player.hitFlash = Math.max(0, player.hitFlash - delta);
    player.attackTimer -= delta;
    if (player.attackTimer <= 0) fireAtNearestEnemy();
  }

  function fireAtNearestEnemy() {
    const player = run.player;
    const activeWeaponId = run.activeWeaponId;
    const definition = getWeaponDefinition(activeWeaponId);
    const arenaLimitedRange = Math.max(180, Math.min(definition.attackRange || BASE_ATTACK_RANGE, Math.min(ARENA_GEOMETRY.width, ARENA_GEOMETRY.height) * 0.92));
    let target = null;
    let bestScore = Infinity;
    run.enemies.forEach(function findTarget(enemy) {
      if (enemy.dead || enemy.health <= 0) return;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > arenaLimitedRange * arenaLimitedRange) return;
      let priorityMultiplier = 1;
      if (definition.slot === "pursuit") {
        if (enemy.kind === "artillery") priorityMultiplier = 0.30;
        else if (enemy.kind === "spitter") priorityMultiplier = 0.58;
        else if (enemy.kind === "boss") priorityMultiplier = 0.72;
      } else if (activeWeaponId === "hearthSeed") {
        priorityMultiplier = enemy.kind === "swarm" ? 0.38 : enemy.kind === "boss" ? 1.18 : 0.78;
      } else if (enemy.kind === "swarm") {
        priorityMultiplier = 0.68;
      }
      const score = distanceSquared * priorityMultiplier;
      if (score < bestScore) {
        bestScore = score;
        target = enemy;
      }
    });
    if (!target) {
      player.attackTimer = 0.08;
      return;
    }
    const contract = run.contract;
    const empoweredMultiplier = run.flashEmpoweredShots > 0 ? Logic.ACTIVE_ABILITY.edgeDamageMultiplier : 1;
    const primaryShotCount = fireWeaponVolley(activeWeaponId, target, empoweredMultiplier, false);
    if (run.twinWindow > 0 && run.coreId === "twin-core") {
      const twinScale = Math.min(0.68, 0.42 + run.coreLevel * 0.08);
      fireWeaponVolley(getInactiveWeaponId(), target, twinScale, true);
    }
    if (run.flashEmpoweredShots > 0) run.flashEmpoweredShots -= 1;
    if (primaryShotCount > 0) emitCombatFeedback("weapon-cycle", { variant: activeWeaponId });
    const stationaryBoost = run.flashHuntWindow > 0 && contract && contract.id === "still-hunt"
      ? contract.stationaryAttackSpeedMultiplier
      : Logic.getContractAttackSpeedMultiplier(contract ? contract.id : null, run.stationaryTime);
    const swapBoost = run.swapHasteWindow > 0 ? run.build.swapAttackSpeedMultiplier : 1;
    player.attackTimer = getWeaponInterval(activeWeaponId) / (run.build.attackSpeedMultiplier * stationaryBoost * swapBoost);
  }

  function fireWeaponVolley(weaponId, target, damageScale, isTwinShot) {
    if (weaponId === "carbine") return fireCarbineVolley(target, damageScale, isTwinShot);
    if (weaponId === "fireflyBranch") return fireFireflyVolley(target, damageScale, isTwinShot);
    if (weaponId === "hearthSeed") return fireHearthSeedVolley(target, damageScale, isTwinShot);
    return fireRingVolley(target, damageScale, isTwinShot);
  }

  function fireCarbineVolley(target, damageScale, isTwinShot) {
    if (!target || run.playerBullets.length >= MAX_PLAYER_BULLETS) return 0;
    const player = run.player;
    const definition = getWeaponDefinition("carbine");
    const behavior = getWeaponLevelBehavior("carbine");
    const angle = Math.atan2(target.y - player.y, target.x - player.x);
    if (!isTwinShot) player.aimAngle = angle;
    const contract = run.contract;
    if (!isTwinShot) {
      run.carbineShotSerial += 1;
      run.weaponCycleSerials.carbine = (run.weaponCycleSerials.carbine || 0) + 1;
    }
    const railEvery = Number(behavior.railEvery) || 0;
    const railShot = !isTwinShot && railEvery > 0 && run.weaponCycleSerials.carbine % railEvery === 0;
    const burstBonus = !isTwinShot && run.carbineShotSerial % 4 === 0 ? run.build.carbineBurstBonus : 0;
    const carbineLiveLimit = definition.concurrency.maxLiveProjectiles || 8;
    const availableSlots = Math.max(0, Math.min(MAX_PLAYER_BULLETS - run.playerBullets.length, carbineLiveLimit - countLiveWeaponProjectiles("carbine")));
    const baseCount = isTwinShot ? 1 : run.build.projectileCount + (contract ? contract.projectileBonus : 0);
    const echoReserved = railShot && behavior.echoCount ? 1 : 0;
    const count = Math.min(8, baseCount + burstBonus, Math.max(0, availableSlots - echoReserved));
    const spread = count <= 1 ? 0 : Math.min(0.54, 0.11 * (count - 1));
    const speed = definition.projectileSpeed * run.build.projectileSpeedMultiplier * (behavior.projectileSpeedMultiplier || 1);
    const damage = getBaseCombatDamage() * definition.damageMultiplier * run.build.carbineDamageMultiplier * damageScale;
    let echoTemplate = null;
    for (let index = 0; index < count; index += 1) {
      const offset = count === 1 ? 0 : -spread / 2 + spread * index / (count - 1);
      const bulletAngle = angle + offset;
      const isRailProjectile = railShot && index === Math.floor(count / 2);
      run.playerBullets.push({
        id: nextEntityId++,
        projectileKind: isRailProjectile ? "carbine-rail" : "carbine",
        weaponId: "carbine",
        x: player.x + Math.cos(bulletAngle) * 14,
        y: player.y + Math.sin(bulletAngle) * 14,
        vx: Math.cos(bulletAngle) * speed,
        vy: Math.sin(bulletAngle) * speed,
        radius: isRailProjectile ? 6.5 * (behavior.railWidthMultiplier || 1) : isTwinShot ? 3 : 3.5,
        damage: damage * (isRailProjectile ? 1.75 : 1),
        pierceLeft: run.build.carbinePierce + run.build.pierce + (contract ? contract.pierceBonus : 0) + (behavior.pierceBonus || 0) + (isRailProjectile ? (behavior.railPierceBonus || 5) : 0),
        hitIds: new Set(),
        life: 1.25,
        dead: false
      });
      if (isRailProjectile && behavior.echoCount) {
        echoTemplate = { angle: bulletAngle, radius: 5.8 * (behavior.railWidthMultiplier || 1), damage: damage * 1.75 * (behavior.echoDamageMultiplier || 0.55), pierce: run.build.carbinePierce + run.build.pierce + (contract ? contract.pierceBonus : 0) + (behavior.railPierceBonus || 5) };
      }
    }
    if (echoTemplate && run.playerBullets.length < MAX_PLAYER_BULLETS) {
      run.playerBullets.push({
        id: nextEntityId++, projectileKind: "carbine-echo", weaponId: "carbine", delay: behavior.echoDelay || 0.16,
        x: player.x + Math.cos(echoTemplate.angle) * 14, y: player.y + Math.sin(echoTemplate.angle) * 14,
        vx: Math.cos(echoTemplate.angle) * speed, vy: Math.sin(echoTemplate.angle) * speed,
        radius: echoTemplate.radius, damage: echoTemplate.damage, pierceLeft: echoTemplate.pierce,
        hitIds: new Set(), life: 1.25 + (behavior.echoDelay || 0.16), dead: false
      });
    }
    createParticles(player.x + Math.cos(angle) * 13, player.y + Math.sin(angle) * 13, "carbine", isTwinShot ? 2 : 4);
    return count;
  }

  function countLiveWeaponProjectiles(weaponId) {
    return run.playerBullets.filter(function countWeaponProjectile(bullet) {
      return !bullet.dead && bullet.weaponId === weaponId;
    }).length;
  }

  function fireFireflyVolley(target, damageScale, isTwinShot) {
    if (!target || run.playerBullets.length >= MAX_PLAYER_BULLETS) return 0;
    const player = run.player;
    const definition = getWeaponDefinition("fireflyBranch");
    const behavior = getWeaponLevelBehavior("fireflyBranch");
    if (!isTwinShot) run.weaponCycleSerials.fireflyBranch = (run.weaponCycleSerials.fireflyBranch || 0) + 1;
    const burstCycle = !isTwinShot && behavior.burstEvery && run.weaponCycleSerials.fireflyBranch % behavior.burstEvery === 0;
    const requestedCount = isTwinShot ? 1 : burstCycle ? behavior.burstCount : behavior.projectileCount;
    const liveLimit = Math.min(8, behavior.maxLiveProjectiles || definition.concurrency.maxLiveProjectiles || 8);
    const available = Math.max(0, Math.min(MAX_PLAYER_BULLETS - run.playerBullets.length, liveLimit - countLiveWeaponProjectiles("fireflyBranch")));
    const count = Math.min(requestedCount || 2, available);
    if (count <= 0) return 0;
    const aimAngle = Math.atan2(target.y - player.y, target.x - player.x);
    if (!isTwinShot) player.aimAngle = aimAngle;
    const speed = definition.projectileSpeed * run.build.projectileSpeedMultiplier * (behavior.projectileSpeedMultiplier || 1);
    const damage = getBaseCombatDamage() * definition.damageMultiplier * damageScale * (burstCycle ? 0.82 : 1);
    for (let index = 0; index < count; index += 1) {
      const offset = count === 1 ? 0 : (index - (count - 1) / 2) * 0.17;
      const angle = aimAngle + offset;
      run.playerBullets.push({
        id: nextEntityId++,
        projectileKind: "firefly",
        weaponId: "fireflyBranch",
        x: player.x + Math.cos(angle) * 12,
        y: player.y + Math.sin(angle) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed: speed,
        radius: burstCycle ? 4.6 : 4.2,
        damage: damage,
        targetId: target.id,
        turnRate: 4.8 * (behavior.turnRateMultiplier || 1),
        chainRemaining: behavior.chainCount || 0,
        chainRadius: 150,
        pierceLeft: 0,
        hitIds: new Set(),
        life: 1.65,
        dead: false
      });
    }
    createParticles(player.x + Math.cos(aimAngle) * 12, player.y + Math.sin(aimAngle) * 12, "heat", isTwinShot ? 2 : 5);
    return count;
  }

  function findDenseSeedTarget(primaryTarget) {
    const candidates = run.enemies.filter(function livingSeedTarget(enemy) { return !enemy.dead && enemy.health > 0; });
    if (!candidates.length) return primaryTarget;
    let best = primaryTarget || candidates[0];
    let bestScore = -Infinity;
    candidates.forEach(function scoreSeedTarget(candidate) {
      let crowd = 0;
      candidates.forEach(function nearbySeedTarget(other) {
        const distance = Math.hypot(other.x - candidate.x, other.y - candidate.y);
        if (distance <= 84 + other.radius) crowd += other.kind === "boss" ? 1.4 : 1;
      });
      const distanceFromPlayer = Math.hypot(candidate.x - run.player.x, candidate.y - run.player.y);
      const score = crowd * 1000 - distanceFromPlayer;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    });
    return best;
  }

  function fireHearthSeedVolley(target, damageScale, isTwinShot) {
    if (!target || run.playerBullets.length >= MAX_PLAYER_BULLETS) return 0;
    const definition = getWeaponDefinition("hearthSeed");
    const behavior = getWeaponLevelBehavior("hearthSeed");
    const liveLimit = Math.min(4, definition.concurrency.maxLiveProjectiles || 4);
    if (countLiveWeaponProjectiles("hearthSeed") >= liveLimit) return 0;
    const player = run.player;
    const landingTarget = findDenseSeedTarget(target);
    const targetX = clamp(landingTarget.x, 20, ARENA_GEOMETRY.width - 20);
    const targetY = clamp(landingTarget.y, 20, ARENA_GEOMETRY.height - 20);
    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    if (!isTwinShot) player.aimAngle = angle;
    const speed = definition.projectileSpeed * run.build.projectileSpeedMultiplier;
    const startX = player.x + Math.cos(angle) * 12;
    const startY = player.y + Math.sin(angle) * 12;
    const targetDistance = Math.max(1, Math.hypot(targetX - startX, targetY - startY));
    const travelDuration = Math.min(0.40, Math.max(0.18, targetDistance / speed));
    const damage = getBaseCombatDamage() * definition.damageMultiplier * damageScale;
    run.playerBullets.push({
      id: nextEntityId++,
      projectileKind: "hearth-seed",
      weaponId: "hearthSeed",
      x: startX,
      y: startY,
      vx: (targetX - startX) / travelDuration,
      vy: (targetY - startY) / travelDuration,
      targetX: targetX,
      targetY: targetY,
      radius: 6.5,
      explosionRadius: definition.explosionRadius * (behavior.radiusMultiplier || 1),
      damage: damage,
      fuse: behavior.fuse || 0.5,
      petalCount: isTwinShot ? 0 : behavior.petalCount || 0,
      petalDelay: behavior.petalDelay || 0.20,
      fieldDuration: isTwinShot ? 0 : behavior.fieldDuration || 0,
      fieldPulses: behavior.fieldPulses || 0,
      hitIds: new Set(),
      life: 1.2,
      dead: false
    });
    createParticles(player.x + Math.cos(angle) * 12, player.y + Math.sin(angle) * 12, "heat", isTwinShot ? 2 : 5);
    return 1;
  }

  function fireRingVolley(target, damageScale, isTwinShot) {
    if (!target || run.playerBullets.length >= MAX_PLAYER_BULLETS) return 0;
    const player = run.player;
    const definition = getWeaponDefinition("cinderRing");
    const behavior = getWeaponLevelBehavior("cinderRing");
    const aimAngle = Math.atan2(target.y - player.y, target.x - player.x);
    if (!isTwinShot) player.aimAngle = aimAngle;
    const contract = run.contract;
    const ringLiveLimit = definition.concurrency.maxLiveProjectiles || 11;
    const availableSlots = Math.max(0, Math.min(MAX_PLAYER_BULLETS - run.playerBullets.length, ringLiveLimit - countLiveWeaponProjectiles("cinderRing")));
    const genericBonus = run.build.ringProjectileBonus + (contract ? contract.projectileBonus : 0);
    const requestedCount = (behavior.projectileCount || definition.baseProjectileCount) + (behavior.projectileBonus || 0) + genericBonus;
    const count = Math.min(isTwinShot ? 4 : 11, requestedCount, availableSlots);
    const speed = definition.projectileSpeed * run.build.projectileSpeedMultiplier;
    const damage = getBaseCombatDamage() * definition.damageMultiplier * run.build.ringDamageMultiplier * damageScale;
    const volleyId = ++run.weaponVolleySerial;
    for (let index = 0; index < count; index += 1) {
      let angle;
      if (index === 0) {
        angle = aimAngle;
      } else {
        angle = aimAngle + (index - 0.5) / Math.max(1, count - 1) * TAU + run.elapsed * 0.12;
      }
      const tracksTarget = index === 0;
      run.playerBullets.push({
        id: nextEntityId++,
        projectileKind: "ring",
        weaponId: "cinderRing",
        ringLevel: getWeaponLevel("cinderRing"),
        volleyId: volleyId,
        guardWaveOnReturn: !isTwinShot && Boolean(behavior.guardWavesPerCycle) && index === 0,
        x: player.x + Math.cos(angle) * 13,
        y: player.y + Math.sin(angle) * 13,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: getWeaponLevel("cinderRing") >= 3 ? 7 : 6.5,
        damage: damage,
        burnRatio: run.build.ringBurnRatio,
        repelStrength: run.build.ringRepelStrength + (behavior.repelStrength || 0),
        safetyRadius: 82 * (behavior.safetyRadiusMultiplier || 1),
        slowMultiplier: getWeaponLevel("cinderRing") >= 3 ? 0.70 : 0.82,
        targetId: tracksTarget ? target.id : null,
        turnRate: tracksTarget ? 3.2 : 0,
        returning: false,
        outboundAge: 0,
        outboundDuration: definition.attackRange / speed * 0.72,
        returnSpeed: speed * 1.08 * (behavior.returnSpeedMultiplier || 1),
        returnCanRehit: Boolean(behavior.returnCanRehit),
        pierceLeft: 1,
        basePierce: 1,
        hitIds: new Set(),
        life: 2.1,
        dead: false
      });
    }
    createParticles(player.x, player.y, "ring", isTwinShot ? 3 : 7);
    return count;
  }

  function damageWeaponArea(x, y, radius, damage, source, weaponId, knockback) {
    let totalDamage = 0;
    run.enemies.slice().forEach(function damageAreaEnemy(enemy) {
      if (enemy.dead) return;
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      if (distance > radius + enemy.radius) return;
      totalDamage += damageEnemy(enemy, damage * (enemy.kind === "boss" ? 0.82 : 1), source, weaponId);
      if (knockback > 0 && enemy.kind !== "boss" && !enemy.dead) {
        enemy.x += dx / distance * knockback;
        enemy.y += dy / distance * knockback;
      }
    });
    return totalDamage;
  }

  function addWarmField(x, y, radius, damage, duration, pulseCount) {
    if (!duration || !pulseCount) return null;
    run.weaponEffects = run.weaponEffects.filter(function replaceWarmField(effect) { return effect.kind !== "warm-field"; });
    const effect = {
      id: nextEntityId++,
      kind: "warm-field",
      weaponId: "hearthSeed",
      x: x,
      y: y,
      radius: radius * 1.15,
      damage: damage * 0.34,
      life: duration,
      maxLife: duration,
      pulsesRemaining: pulseCount,
      pulseTimer: Math.min(0.34, duration / (pulseCount + 1)),
      pulseInterval: duration / (pulseCount + 0.6)
    };
    run.weaponEffects.push(effect);
    run.warmFieldId = effect.id;
    return effect;
  }

  function detonateHearthSeed(seed, options) {
    const settings = options && typeof options === "object" ? options : {};
    const radius = seed.explosionRadius || getWeaponDefinition("hearthSeed").explosionRadius;
    const damage = seed.damage || getBaseCombatDamage();
    const totalDamage = damageWeaponArea(seed.x, seed.y, radius, damage, settings.source || "projectile", "hearthSeed", settings.knockback || 0);
    addShockwave(seed.x, seed.y, radius, settings.fusion ? "#fff0a6" : getWeaponDefinition("hearthSeed").color, settings.fusion ? 0.58 : 0.42);
    createParticles(seed.x, seed.y, settings.fusion ? "fusion" : "heavy-hit", settings.fusion ? 18 : 11);
    if (settings.allowPetals !== false && seed.petalCount > 0) {
      for (let index = 0; index < seed.petalCount; index += 1) {
        const angle = index / seed.petalCount * TAU + run.elapsed * 0.31;
        run.weaponEffects.push({
          id: nextEntityId++,
          kind: "seed-petal",
          weaponId: "hearthSeed",
          x: clamp(seed.x + Math.cos(angle) * radius * 0.78, 12, ARENA_GEOMETRY.width - 12),
          y: clamp(seed.y + Math.sin(angle) * radius * 0.78, 12, ARENA_GEOMETRY.height - 12),
          radius: radius * 0.48,
          damage: damage * 0.38,
          delay: (seed.petalDelay || 0.2) * (0.75 + index * 0.18),
          life: 0.45,
          maxLife: 0.45
        });
      }
    }
    if (settings.allowField !== false) addWarmField(seed.x, seed.y, radius, damage, seed.fieldDuration || 0, seed.fieldPulses || 0);
    return totalDamage;
  }

  function triggerCinderGuardWave(x, y) {
    const radius = 132;
    const damage = getBaseCombatDamage() * 0.42 * run.build.ringDamageMultiplier;
    const totalDamage = damageWeaponArea(x, y, radius, damage, "weapon-effect", "cinderRing", 32);
    run.enemyBullets.forEach(function clearGuardWaveBullet(bullet) {
      if (Math.hypot(bullet.x - x, bullet.y - y) <= radius) bullet.dead = true;
    });
    addShockwave(x, y, radius, "#9debf0", 0.5);
    addCallout("回潮 · 守界", x, y - 34, "#baf4f2");
    createParticles(x, y, "ring", 14);
    return totalDamage;
  }

  function updateWeaponEffects(delta) {
    run.weaponEffects.forEach(function updateWeaponEffect(effect) {
      if (effect.kind === "seed-petal") {
        effect.delay -= delta;
        if (effect.delay <= 0 && !effect.detonated) {
          effect.detonated = true;
          damageWeaponArea(effect.x, effect.y, effect.radius, effect.damage, "weapon-effect", "hearthSeed", 0);
          addShockwave(effect.x, effect.y, effect.radius, "#f4b18a", 0.34);
          createParticles(effect.x, effect.y, "heat", 7);
        }
        if (effect.detonated) effect.life -= delta;
        return;
      }
      if (effect.kind === "warm-field") {
        effect.life -= delta;
        effect.pulseTimer -= delta;
        if (effect.pulsesRemaining > 0 && effect.pulseTimer <= 0) {
          damageWeaponArea(effect.x, effect.y, effect.radius, effect.damage, "weapon-effect", "hearthSeed", 0);
          addShockwave(effect.x, effect.y, effect.radius, "#f7c29d", 0.28);
          effect.pulsesRemaining -= 1;
          effect.pulseTimer += effect.pulseInterval;
        }
      }
    });
    run.weaponEffects = run.weaponEffects.filter(function keepWeaponEffect(effect) {
      if (effect.kind === "seed-petal") return !effect.detonated || effect.life > 0;
      return effect.life > 0;
    });
    if (!run.weaponEffects.some(function hasWarmField(effect) { return effect.kind === "warm-field" && effect.id === run.warmFieldId; })) run.warmFieldId = null;
  }

  function updateEnemies(delta) {
    const player = run.player;
    const pressure = Logic.getCombatPressure(run.wave, run.curveProfile, run.dangerLevel);
    run.enemies.forEach(function moveEnemy(enemy) {
      if (enemy.dead) return;
      if (enemy.burnTimer > 0 && enemy.burnDamagePerSecond > 0) {
        const burnStep = Math.min(delta, enemy.burnTimer);
        enemy.burnTimer = Math.max(0, enemy.burnTimer - delta);
        damageEnemy(enemy, enemy.burnDamagePerSecond * burnStep, "burn");
        if (enemy.dead) return;
      }
      enemy.flash = Math.max(0, enemy.flash - delta);
      enemy.vulnerableTimer = Math.max(0, enemy.vulnerableTimer - delta);
      enemy.contactCooldown = Math.max(0, enemy.contactCooldown - delta);
      enemy.slowTimer = Math.max(0, enemy.slowTimer - delta);
      if (enemy.slowTimer <= 0) enemy.slowMultiplier = 1;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const aimX = dx / distance;
      const aimY = dy / distance;
      let directionX = aimX;
      let directionY = aimY;
      let speed = enemy.speed * (enemy.slowTimer > 0 ? enemy.slowMultiplier : 1);

      if (["spitter", "tidecaller"].includes(enemy.kind)) {
        if (distance < 135) { directionX *= -1; directionY *= -1; }
        else if (distance < 205) { directionX = -aimY * 0.55; directionY = aimX * 0.55; }
        if (enemy.attackState === "idle") {
          enemy.shootTimer -= delta;
          if (enemy.shootTimer <= 0) {
            if (bossTelegraphActive()) {
              enemy.shootTimer = 0.12;
            } else {
              enemy.attackState = "windup";
              enemy.attackWindup = pressure.spitterWindup || 0.45;
              enemy.lockedAimX = aimX;
              enemy.lockedAimY = aimY;
            }
          }
        } else if (enemy.attackState === "windup") {
          enemy.attackWindup -= delta;
          speed *= 0.35;
          if (enemy.attackWindup <= 0) {
            const volleySize = enemy.kind === "tidecaller" ? Math.min(4, pressure.spitterVolleySize + 1) : pressure.spitterVolleySize;
            if (!bossTelegraphActive() && canAddEnemyBullets(volleySize, pressure, enemy)) {
              fireEnemyVolley(enemy, enemy.lockedAimX, enemy.lockedAimY, volleySize, pressure.enemyBulletSpeed * (enemy.kind === "tidecaller" ? 0.88 : 1), enemy.damage * pressure.spitterBulletDamageMultiplier, enemy.kind === "tidecaller" ? 0.24 : 0.16);
              enemy.attackState = "recoil";
              enemy.attackWindup = 0.12;
              enemy.shootTimer = pressure.spitterFireInterval;
            } else {
              enemy.attackWindup = 0.12;
            }
          }
        } else {
          enemy.attackWindup -= delta;
          speed *= 0.55;
          if (enemy.attackWindup <= 0) enemy.attackState = "idle";
        }
      }

      if (enemy.kind === "artillery") {
        const crossfireControlled = Boolean(run.crossfire && run.crossfire.phase !== "finished" && !enemy.debugMajorThreatBypassCrossfire);
        if (distance < 220) { directionX *= -1; directionY *= -1; }
        else if (distance < 305) {
          const orbitDirection = enemy.id % 2 ? 1 : -1;
          directionX = -aimY * orbitDirection * 0.52;
          directionY = aimX * orbitDirection * 0.52;
        }
        const crossfireArenaInset = enemy.radius;
        const crossfireArtilleryOutside = crossfireControlled && (
          enemy.x < crossfireArenaInset || enemy.x > ARENA_GEOMETRY.width - crossfireArenaInset ||
          enemy.y < crossfireArenaInset || enemy.y > ARENA_GEOMETRY.height - crossfireArenaInset
        );
        if (crossfireArtilleryOutside && enemy.attackState === "idle") {
          const centerX = ARENA_GEOMETRY.centerX - enemy.x;
          const centerY = ARENA_GEOMETRY.centerY - enemy.y;
          const centerDistance = Math.max(0.001, Math.hypot(centerX, centerY));
          directionX = centerX / centerDistance;
          directionY = centerY / centerDistance;
          speed = enemy.speed;
        }
        if (enemy.attackState === "idle") {
          enemy.shootTimer -= delta;
          if (enemy.shootTimer <= 0 && !crossfireControlled) {
            enemy.attackState = "windup";
            enemy.attackWindup = pressure.artilleryWindup || 0.78;
            enemy.lockedAimX = aimX;
            enemy.lockedAimY = aimY;
          }
        } else if (enemy.attackState === "windup") {
          speed *= 0.18;
          if (!crossfireControlled) enemy.attackWindup -= delta;
          if (!crossfireControlled && enemy.attackWindup <= 0) {
            const threatRelease = releaseMajorThreat(enemy, "artillery", {
              softCapacity: canAddEnemyBullets(1, pressure, enemy),
              hardCapacity: canAddEnemyBulletsHard(1)
            });
            if (threatRelease) {
              fireEnemyBullet(enemy, enemy.lockedAimX, enemy.lockedAimY, pressure.enemyBulletSpeed * 0.72, enemy.damage * 0.82, 8);
              enemy.artillerySerial += 1;
              enemy.attackState = "recoil";
              enemy.attackWindup = 0.28;
              enemy.shootTimer = Math.max(2.45, 3.2 - Logic.getStageNumber(run.wave) * 0.16);
            } else enemy.attackWindup = 0;
          }
        } else {
          enemy.attackWindup -= delta;
          speed = 0;
          if (enemy.attackWindup <= 0) enemy.attackState = "idle";
        }
      }

      if (enemy.kind === "swarm") {
        const weave = Math.sin(run.elapsed * 3.4 + enemy.id * 0.77) * 0.22;
        const mixedX = directionX - directionY * weave;
        const mixedY = directionY + directionX * weave;
        const mixedLength = Math.max(0.001, Math.hypot(mixedX, mixedY));
        directionX = mixedX / mixedLength;
        directionY = mixedY / mixedLength;
      }

      if (enemy.kind === "runner" && run.wave >= 6) {
        if (enemy.dashState === "idle") {
          enemy.dashTimer -= delta;
          const crossfireStartAllowed = enemy.debugMajorThreatBypassCrossfire ||
            Logic.isCrossfireThreatAllowed(run.crossfire, "runner", enemy.crossfireAxis, "start");
          if (enemy.dashTimer <= 0 && distance < 340 && crossfireStartAllowed) {
            enemy.dashState = "windup";
            enemy.dashWindup = pressure.runnerWindup || 0.5;
            enemy.dashX = aimX;
            enemy.dashY = aimY;
          }
        }
        if (enemy.dashState === "windup") {
          enemy.dashWindup -= delta;
          directionX = enemy.dashX;
          directionY = enemy.dashY;
          speed = 0;
          if (enemy.dashWindup <= 0) {
            if (releaseMajorThreat(enemy, "runner")) {
              enemy.dashState = "dashing";
              enemy.dashWindup = 0.28;
              if (run.crossfire && run.crossfire.phase === "waiting") {
                recordCrossfireEvent("runner-release", { ownerId: enemy.id, axis: enemy.crossfireAxis });
              }
            } else enemy.dashWindup = 0;
          }
        } else if (enemy.dashState === "dashing") {
          enemy.dashWindup -= delta;
          directionX = enemy.dashX;
          directionY = enemy.dashY;
          speed *= 3;
          if (enemy.dashWindup <= 0) {
            enemy.dashState = "recovery";
            enemy.dashWindup = 0.45;
          }
        } else if (enemy.dashState === "recovery") {
          enemy.dashWindup -= delta;
          speed = 0;
          if (enemy.dashWindup <= 0) {
            enemy.dashState = "idle";
            enemy.dashTimer = 3;
          }
        }
      }

      if (enemy.kind === "boss") {
        const bossMotion = updateBossBehavior(enemy, delta, aimX, aimY, distance, pressure);
        directionX = bossMotion.x;
        directionY = bossMotion.y;
        speed = bossMotion.speed;
      }

      enemy.x += directionX * speed * delta;
      enemy.y += directionY * speed * delta;

      const collisionDistance = player.radius + enemy.radius;
      const collisionDistanceNow = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (collisionDistanceNow <= collisionDistance && enemy.contactCooldown <= 0) {
        if (player.invulnerable <= 0) run.contactHits += 1;
        damagePlayer(enemy.damage, enemy.kind);
        enemy.contactCooldown = 0.8;
        const push = collisionDistance - collisionDistanceNow + 6;
        enemy.x -= directionX * push;
        enemy.y -= directionY * push;
      }
    });
    run.enemies = run.enemies.filter(function alive(enemy) { return !enemy.dead; });
  }

  function canAddEnemyBullets(count, pressure, owner) {
    const boss = owner && owner.kind === "boss"
      ? owner
      : run.enemies.find(function activeBoss(enemy) { return enemy.kind === "boss" && !enemy.dead; });
    if (!boss) return run.enemyBullets.length + count <= Math.min(MAX_ENEMY_BULLETS, pressure.enemyBulletSoftCap);
    const totalCap = Math.min(MAX_ENEMY_BULLETS, Logic.getBossBulletSoftCap(run.wave, run.curveProfile, run.dangerLevel));
    if (owner && owner.kind === "boss") return run.enemyBullets.length + count <= totalCap;
    const nonBossCount = run.enemyBullets.reduce(function countAdds(total, bullet) {
      return total + (bullet.ownerKind === "boss" ? 0 : 1);
    }, 0);
    const addBudget = Math.max(0, totalCap - boss.bossPatternReserve);
    return nonBossCount + count <= addBudget && run.enemyBullets.length + count <= totalCap;
  }

  function canAddEnemyBulletsHard(count) {
    return Boolean(run) && Number.isSafeInteger(count) && count >= 0 && run.enemyBullets.length + count <= MAX_ENEMY_BULLETS;
  }

  function clearMajorThreatPending(enemy) {
    if (!enemy) return;
    enemy.majorThreatKind = null;
    enemy.majorThreatReadyAt = null;
    enemy.majorThreatWasBlocked = false;
  }

  function releaseMajorThreat(enemy, kind, capacity) {
    if (!run || !enemy || enemy.dead) return false;
    if (!enemy.debugMajorThreatBypassCrossfire &&
        !Logic.isCrossfireThreatAllowed(run.crossfire, kind, enemy.crossfireAxis, "release")) return false;
    const now = run.elapsed;
    if (enemy.majorThreatKind !== kind || !Number.isFinite(enemy.majorThreatReadyAt)) {
      enemy.majorThreatKind = kind;
      enemy.majorThreatReadyAt = now;
      enemy.majorThreatWasBlocked = false;
    }
    const delay = Math.max(0, now - enemy.majorThreatReadyAt);
    const lockActive = now + 1e-9 < run.majorThreatLockUntil;
    const softCapacity = !capacity || capacity.softCapacity !== false;
    const hardCapacity = !capacity || capacity.hardCapacity !== false;
    const blockedBySoftCap = !softCapacity;
    const blockedByHardCap = !hardCapacity;
    const reachedDelayCap = delay + 1e-9 >= MAJOR_THREAT_MAX_DELAY_SECONDS;
    const forced = reachedDelayCap && !blockedByHardCap && (lockActive || blockedBySoftCap);
    if (blockedByHardCap || ((lockActive || blockedBySoftCap) && !forced)) {
      if (!enemy.majorThreatWasBlocked) {
        enemy.majorThreatWasBlocked = true;
        run.majorThreatDelays += 1;
      }
      return false;
    }
    enemy.majorThreatAttackSerial += 1;
    run.majorThreatStarts += 1;
    if (forced) run.majorThreatForcedReleases += 1;
    run.majorThreatMaxObservedDelay = Math.max(run.majorThreatMaxObservedDelay, delay);
    run.lastMajorThreatKind = kind;
    run.majorThreatLockUntil = now + MAJOR_THREAT_LOCK_SECONDS;
    run.majorThreatEvents.push({
      kind: kind,
      enemyId: enemy.id,
      scheduledAt: enemy.majorThreatReadyAt,
      startedAt: now,
      delay: delay,
      forced: forced,
      softCapBypassed: forced && blockedBySoftCap,
      attackSerial: enemy.majorThreatAttackSerial
    });
    if (run.majorThreatEvents.length > 32) run.majorThreatEvents.shift();
    clearMajorThreatPending(enemy);
    enemy.debugMajorThreatBypassCrossfire = false;
    return {
      forced: forced,
      softCapBypassed: forced && blockedBySoftCap,
      delay: delay
    };
  }

  function bossAttackHasCapacity(enemy, spec, pressure) {
    if (!spec) return false;
    if (spec.kind === "boss-wave") return run.bossWaves.length < MAX_BOSS_WAVES;
    return canAddEnemyBullets(spec.count, pressure, enemy);
  }

  function bossAttackHasHardCapacity(spec) {
    if (!spec) return false;
    if (spec.kind === "boss-wave") return run.bossWaves.length < MAX_BOSS_WAVES;
    return canAddEnemyBulletsHard(spec.count);
  }

  function bossTelegraphActive() {
    return run.enemies.some(function warning(enemy) {
      return enemy.kind === "boss" && !enemy.dead && (
        (enemy.bossAttackState === "windup" && enemy.bossAttackWindup > 0) ||
        (enemy.chargeState === "windup" && enemy.chargeWindup > 0) ||
        enemy.aftershockPending ||
        (enemy.bossPhasePause > 0 && enemy.majorThreatKind !== "boss-phase") ||
        (enemy.phaseWavePending && enemy.majorThreatKind !== "boss-phase")
      );
    });
  }

  function updateChargeState(enemy, delta, directionX, directionY, settings) {
    if (enemy.chargeState === "idle") {
      enemy.chargeTimer -= delta;
      if (enemy.chargeTimer <= 0) {
        enemy.chargeState = "windup";
        enemy.chargeWindup = settings.windup;
        enemy.chargeX = directionX;
        enemy.chargeY = directionY;
        emitCombatFeedback("boss-windup", { causeId: "boss-charge:" + enemy.id + ":" + enemy.bossPhase + ":" + (enemy.chargeSerial + 1) });
      }
    } else if (enemy.chargeState === "windup") {
      enemy.chargeWindup -= delta;
      if (enemy.chargeWindup <= 0) {
        if (releaseMajorThreat(enemy, "boss-charge")) {
          enemy.chargeState = "charging";
          enemy.chargeWindup = settings.duration;
        } else {
          enemy.chargeWindup = 0;
        }
      }
    } else if (enemy.chargeState === "charging") {
      enemy.chargeWindup -= delta;
      if (enemy.chargeWindup <= 0) {
        enemy.chargeState = "recovery";
        enemy.recoveryTimer = settings.recovery;
      }
    } else {
      enemy.recoveryTimer -= delta;
      if (enemy.recoveryTimer <= 0) {
        enemy.chargeState = "idle";
        enemy.chargeTimer = settings.cooldown;
      }
    }
    if (enemy.chargeState === "windup" || enemy.chargeState === "recovery") return { x: enemy.chargeX, y: enemy.chargeY, speed: 0 };
    if (enemy.chargeState === "charging") return { x: enemy.chargeX, y: enemy.chargeY, speed: enemy.speed * settings.speedMultiplier };
    return { x: directionX, y: directionY, speed: enemy.speed };
  }

  function updateBossBehavior(enemy, delta, aimX, aimY, distance, pressure) {
    const healthRatio = enemy.health / Math.max(1, enemy.maxHealth);
    if (enemy.bossMode === "ember-core" && enemy.bossPhase === 1 && healthRatio <= enemy.bossPhaseThreshold) triggerEmberCorePhaseTwo(enemy);
    else if (enemy.bossPhase === 1 && enemy.bossPhaseThreshold > 0 && healthRatio <= enemy.bossPhaseThreshold) triggerBossPhaseTwo(enemy);
    if (!enemy.reinforcementsSpawned && healthRatio <= 0.64) spawnBossReinforcements(enemy);
    if (enemy.bossPhasePause > 0) {
      enemy.bossPhasePause = Math.max(0, enemy.bossPhasePause - delta);
      if (enemy.bossPhasePause <= 0 && enemy.phaseWavePending) {
        const waveSpec = Logic.getBossTransitionSpec(run.wave, run.curveProfile, run.dangerLevel);
        const hasCapacity = waveSpec && waveSpec.kind === "boss-wave" && run.bossWaves.length < MAX_BOSS_WAVES;
        const threatRelease = releaseMajorThreat(enemy, "boss-phase", {
          softCapacity: Boolean(hasCapacity),
          hardCapacity: Boolean(hasCapacity)
        });
        if (threatRelease && spawnBossWave(enemy, waveSpec)) {
          enemy.phaseWavePending = false;
        } else {
          enemy.bossPhasePause = hasCapacity ? FIXED_SIMULATION_STEP : 0.1;
        }
      }
      return { x: aimX, y: aimY, speed: 0 };
    }

    if (enemy.bossMode === "cinder-weaver") {
      let moveX = aimX;
      let moveY = aimY;
      if (distance < 175) { moveX *= -1; moveY *= -1; }
      else if (distance <= 225) {
        const orbitDirection = (enemy.id % 2 ? 1 : -1) * (enemy.bossPhase === 2 ? -1 : 1);
        moveX = -aimY * orbitDirection;
        moveY = aimX * orbitDirection;
      }
      updateBossAttack(enemy, delta, aimX, aimY, pressure);
      return { x: moveX, y: moveY, speed: enemy.speed * (enemy.bossAttackState === "windup" ? 0.45 : enemy.bossPhase === 2 ? 1.18 : 1) };
    }

    const chargeSpec = Logic.getBossChargeSpec(run.wave, enemy.bossPhase, run.curveProfile, run.dangerLevel);
    let motion = { x: aimX, y: aimY, speed: enemy.speed };
    if (chargeSpec && enemy.bossAttackState !== "windup") {
      const previousChargeState = enemy.chargeState;
      motion = updateChargeState(enemy, delta, aimX, aimY, chargeSpec);
      if (enemy.bossMode === "ash-ram" && previousChargeState === "charging" && enemy.chargeState === "recovery") {
        enemy.chargeSerial += 1;
        enemy.vulnerableTimer = 1.2;
        enemy.aftershockPending = true;
        enemy.aftershockTimer = 0.35;
        addCallout("破势 · 余震预警", enemy.x, enemy.y - enemy.radius - 18, "#fff4df");
      }
    }
    if (enemy.bossMode === "ash-ram" && enemy.aftershockPending) {
      enemy.aftershockTimer = Math.max(0, enemy.aftershockTimer - delta);
      if (enemy.aftershockTimer <= 0) {
        if (canAddEnemyBullets(6, pressure, enemy)) {
          fireRadialVolley(enemy, 6, pressure.enemyBulletSpeed * 0.72, enemy.damage * 0.32, enemy.chargeSerial % 2 * Math.PI / 6);
          enemy.aftershockPending = false;
          addShockwave(enemy.x, enemy.y, 84, "#fff4df", 0.38);
        } else {
          enemy.aftershockTimer = 0.1;
        }
      }
    }
    updateBossAttack(enemy, delta, aimX, aimY, pressure);
    if (enemy.bossAttackState === "windup" && enemy.chargeState === "idle") motion.speed *= 0.45;
    return motion;
  }

  function spawnBossReinforcements(enemy) {
    if (!run || !enemy || enemy.dead || enemy.reinforcementsSpawned) return false;
    enemy.reinforcementsSpawned = true;
    const finalePacing = run.curveProfile === REMAKE_CURVE_ID && run.wave === Logic.VICTORY_WAVE
      ? Logic.getWavePacing(run.wave, run.curveProfile) : null;
    const requested = finalePacing ? clamp(Math.trunc(finalePacing.bossAdds), 0, 8)
      : Math.min(8, 4 + Logic.getStageNumber(run.wave));
    let spawned = 0;
    for (let index = 0; index < requested && run.enemies.length < MAX_ENEMIES; index += 1) {
      const kind = enemy.bossMode === "ash-ram"
        ? (index % 3 === 0 ? "swarm" : index % 2 ? "runner" : "chaser")
        : enemy.bossMode === "cinder-weaver"
          ? (index === 0 ? "artillery" : index % 2 ? "spitter" : "chaser")
          : enemy.bossMode === "fire-keeper"
            ? (index === 0 ? "switchGuard" : index === 1 ? "tidecaller" : index % 3 === 0 ? "swarm" : "runner")
            : (index === 0 ? "artillery" : index % 3 === 0 ? "swarm" : index % 2 ? "spitter" : "runner");
      const reinforcementMeta = enemy.bossMode === "fire-keeper"
        ? { carrierTraitId: index % 2 === 0 ? "sharp" : "tide", groupId: kind === "tidecaller" ? "keeper:" + enemy.id : null, groupLeader: kind === "tidecaller" }
        : null;
      if (spawnEnemy(kind, reinforcementMeta)) spawned += 1;
    }
    if (spawned > 0) {
      run.bossReinforcementWaves += 1;
      run.screenShake = Math.max(run.screenShake, 0.16);
      addShockwave(enemy.x, enemy.y, 118, enemy.bossColor || "#ff9f43", 0.52);
      addCallout("首领半血 · 召来围阵", enemy.x, enemy.y - enemy.radius - 20, "#ffd0c7");
    }
    return spawned > 0;
  }

  function updateBossAttack(enemy, delta, aimX, aimY, pressure) {
    if (enemy.bossAttackState === "windup") {
      enemy.bossAttackWindup = Math.max(0, enemy.bossAttackWindup - delta);
      if (enemy.bossAttackWindup > 0) return;
      const activeSpec = Logic.getBossAttackSpec(run.wave, enemy.bossPhase, enemy.patternSerial, run.curveProfile, run.dangerLevel);
      const threatRelease = releaseMajorThreat(enemy, "boss-pattern", {
        softCapacity: bossAttackHasCapacity(enemy, activeSpec, pressure),
        hardCapacity: bossAttackHasHardCapacity(activeSpec)
      });
      if (!threatRelease) {
        enemy.bossAttackWindup = 0;
        return;
      }
      if (!executeBossAttack(enemy, activeSpec, pressure, threatRelease.softCapBypassed)) {
        enemy.bossAttackWindup = FIXED_SIMULATION_STEP;
        return;
      }
      enemy.patternSerial += 1;
      enemy.bossAttackState = "idle";
      enemy.bossPatternKind = null;
      enemy.shootTimer = activeSpec.interval;
      return;
    }
    if (enemy.chargeState !== "idle") return;
    enemy.shootTimer -= delta;
    if (enemy.shootTimer > 0) return;
    const spec = Logic.getBossAttackSpec(run.wave, enemy.bossPhase, enemy.patternSerial, run.curveProfile, run.dangerLevel);
    if (!spec) return;
    enemy.bossAttackState = "windup";
    enemy.bossAttackWindup = spec.windup;
    enemy.bossPatternKind = spec.kind;
    enemy.patternAimX = aimX;
    enemy.patternAimY = aimY;
    emitCombatFeedback("boss-windup", { causeId: "boss-pattern:" + enemy.id + ":" + enemy.bossPhase + ":" + enemy.patternSerial });
    if (spec.kind === "gap-ring") enemy.patternGapAngle = Math.atan2(aimY, aimX) + spec.gapOffset;
  }

  function executeBossAttack(enemy, spec, pressure, allowSoftCapBypass) {
    if (!spec) return false;
    if (spec.kind === "boss-wave") {
      return spawnBossWave(enemy, spec);
    }
    if (!canAddEnemyBulletsHard(spec.count)) return false;
    if (!allowSoftCapBypass && !canAddEnemyBullets(spec.count, pressure, enemy)) return false;
    if (spec.kind === "gap-ring") {
      fireGapRadialVolley(enemy, spec.slots, spec.gapCount, enemy.patternGapAngle, pressure.enemyBulletSpeed * spec.speedMultiplier, enemy.damage * spec.damageMultiplier);
    } else {
      fireEnemyVolley(enemy, enemy.patternAimX, enemy.patternAimY, spec.count, pressure.enemyBulletSpeed * spec.speedMultiplier, enemy.damage * spec.damageMultiplier, spec.angleStep);
    }
    return true;
  }

  function fireGapRadialVolley(enemy, slots, gapCount, gapAngle, speed, damage) {
    const step = TAU / slots;
    const rotation = gapAngle - (gapCount - 1) * step / 2;
    for (let index = gapCount; index < slots; index += 1) {
      const angle = rotation + index * step;
      fireEnemyBullet(enemy, Math.cos(angle), Math.sin(angle), speed, damage);
    }
    run.peakEnemyBullets = Math.max(run.peakEnemyBullets, run.enemyBullets.length);
  }

  function spawnBossWave(enemy, spec) {
    if (!run || !enemy || enemy.dead || !spec || run.bossWaves.length >= MAX_BOSS_WAVES) return false;
    run.bossWaves.push({
      id: nextEntityId++,
      ownerId: enemy.id,
      x: enemy.x,
      y: enemy.y,
      radius: enemy.radius + 10,
      previousRadius: enemy.radius + 10,
      speed: spec.waveSpeed,
      thickness: spec.waveThickness,
      maxRadius: ARENA_GEOMETRY.diagonal + 40,
      damage: enemy.damage * spec.damageMultiplier,
      hitPlayer: false,
      color: enemy.bossColor || "#ffd06f"
    });
    run.playerBullets = run.playerBullets.filter(function burnNearCore(bullet) {
      return Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) > enemy.radius + 22;
    });
    run.screenShake = Math.max(run.screenShake, 0.16);
    addCallout("终焰光波 · 爆闪可穿越", enemy.x, enemy.y - enemy.radius - 18, "#ffe49a");
    return true;
  }

  function updateBossWaves(delta) {
    run.bossWaves.forEach(function expandBossWave(wave) {
      wave.previousRadius = wave.radius;
      wave.radius += wave.speed * delta;
      const halfThickness = wave.thickness / 2;
      run.playerBullets.forEach(function burnPlayerBullet(bullet) {
        if (bullet.dead) return;
        const distance = Math.hypot(bullet.x - wave.x, bullet.y - wave.y);
        if (distance + bullet.radius >= wave.previousRadius - halfThickness && distance - bullet.radius <= wave.radius + halfThickness) bullet.dead = true;
      });
      if (!wave.hitPlayer) {
        const playerDistance = Math.hypot(run.player.x - wave.x, run.player.y - wave.y);
        if (playerDistance + run.player.radius >= wave.previousRadius - halfThickness && playerDistance - run.player.radius <= wave.radius + halfThickness) {
          wave.hitPlayer = true;
          damagePlayer(wave.damage, "boss-wave");
        }
      }
    });
    run.playerBullets = run.playerBullets.filter(function keepUnburnedBullet(bullet) { return !bullet.dead; });
    run.bossWaves = run.bossWaves.filter(function keepWave(wave) { return wave.radius <= wave.maxRadius; });
  }

  function fireRadialVolley(enemy, count, speed, damage, rotation) {
    for (let index = 0; index < count; index += 1) {
      const angle = rotation + index / count * TAU;
      fireEnemyBullet(enemy, Math.cos(angle), Math.sin(angle), speed, damage);
    }
    run.peakEnemyBullets = Math.max(run.peakEnemyBullets, run.enemyBullets.length);
  }

  function fireEnemyVolley(enemy, directionX, directionY, count, speed, damage, angleStep) {
    const baseAngle = Math.atan2(directionY, directionX);
    const totalSpread = Math.max(0, count - 1) * angleStep;
    for (let index = 0; index < count; index += 1) {
      const offset = count === 1 ? 0 : -totalSpread / 2 + index * angleStep;
      fireEnemyBullet(enemy, Math.cos(baseAngle + offset), Math.sin(baseAngle + offset), speed, damage);
    }
    run.peakEnemyBullets = Math.max(run.peakEnemyBullets, run.enemyBullets.length);
  }

  function fireEnemyBullet(enemy, directionX, directionY, speed, damage, radius, metadata) {
    const length = Math.max(0.001, Math.hypot(directionX, directionY));
    const bullet = Object.assign({
      id: nextEntityId++,
      ownerId: enemy.id,
      ownerKind: enemy.kind,
      x: enemy.x,
      y: enemy.y,
      vx: directionX / length * speed,
      vy: directionY / length * speed,
      radius: Number.isFinite(radius) && radius > 0 ? radius : 5,
      damage: damage,
      life: 4,
      dead: false
    }, metadata || {});
    run.enemyBullets.push(bullet);
    run.enemyBulletsFired += 1;
    return bullet;
  }

  function updatePlayerBullets(delta) {
    run.playerBullets.forEach(function moveBullet(bullet) {
      if (bullet.dead) return;
      if (bullet.delay > 0) {
        bullet.delay = Math.max(0, bullet.delay - delta);
        return;
      }
      if (bullet.projectileKind === "returned") {
        const target = findLivingEnemyById(bullet.targetId);
        if (!target) {
          bullet.dead = true;
          run.flashReturnTargetLost += 1;
          finishPursuitProjectile(bullet);
          return;
        }
        const angle = Math.atan2(target.y - bullet.y, target.x - bullet.x);
        bullet.vx = Math.cos(angle) * Logic.ACTIVE_ABILITY.returnSpeed;
        bullet.vy = Math.sin(angle) * Logic.ACTIVE_ABILITY.returnSpeed;
        bullet.x += bullet.vx * delta;
        bullet.y += bullet.vy * delta;
        bullet.life -= delta;
        bullet.linkLife = Math.max(0, bullet.linkLife - delta);
        if (bullet.life <= 0 || outsideCanvas(bullet.x, bullet.y, 40)) {
          bullet.dead = true;
          finishPursuitProjectile(bullet);
          return;
        }
        if (circleCollision(bullet, target)) {
          const targetWasAlive = !target.dead && target.health > 0;
          const actualDamage = damageEnemy(target, bullet.damage, "return-fire");
          run.flashReturnHits += 1;
          run.flashReturnDamage += actualDamage;
          if (bullet.targetWasBoss) run.flashReturnBossDamage += actualDamage;
          if (targetWasAlive && target.dead) {
            run.flashReturnKills += 1;
            addCallout("返焰击破", target.x, target.y - target.radius - 10, "#fff1b8");
          } else {
            applyPursuitMark(target, bullet.markBatchId);
          }
          bullet.dead = true;
          finishPursuitProjectile(bullet);
        }
        return;
      }
      if (bullet.projectileKind === "hearth-seed") {
        bullet.fuse -= delta;
        bullet.life -= delta;
        const targetDx = bullet.targetX - bullet.x;
        const targetDy = bullet.targetY - bullet.y;
        const targetDistance = Math.hypot(targetDx, targetDy);
        const travelStep = Math.max(1, Math.hypot(bullet.vx, bullet.vy)) * delta;
        if (targetDistance <= travelStep) {
          bullet.x = bullet.targetX;
          bullet.y = bullet.targetY;
          bullet.vx = 0;
          bullet.vy = 0;
        } else {
          bullet.x += bullet.vx * delta;
          bullet.y += bullet.vy * delta;
        }
        if (bullet.fuse <= 0 || bullet.life <= 0) {
          detonateHearthSeed(bullet);
          bullet.dead = true;
        }
        return;
      }
      if (bullet.projectileKind === "firefly" || bullet.projectileKind === "firefly-draw") {
        let trackedTarget = findLivingEnemyById(bullet.targetId);
        if (!trackedTarget) {
          trackedTarget = run.enemies.filter(function availableFireflyTarget(enemy) {
            return !enemy.dead && !bullet.hitIds.has(enemy.id);
          }).sort(function nearestFireflyTarget(first, second) {
            return Math.hypot(first.x - bullet.x, first.y - bullet.y) - Math.hypot(second.x - bullet.x, second.y - bullet.y);
          })[0] || null;
          bullet.targetId = trackedTarget ? trackedTarget.id : null;
        }
        if (trackedTarget) {
          const currentAngle = Math.atan2(bullet.vy, bullet.vx);
          const desiredAngle = Math.atan2(trackedTarget.y - bullet.y, trackedTarget.x - bullet.x);
          const deltaAngle = Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle));
          const steeredAngle = currentAngle + clamp(deltaAngle, -bullet.turnRate * delta, bullet.turnRate * delta);
          bullet.vx = Math.cos(steeredAngle) * bullet.speed;
          bullet.vy = Math.sin(steeredAngle) * bullet.speed;
        }
        bullet.x += bullet.vx * delta;
        bullet.y += bullet.vy * delta;
        bullet.life -= delta;
        if (bullet.life <= 0 || outsideCanvas(bullet.x, bullet.y, 50)) {
          bullet.dead = true;
          return;
        }
      }
      if (bullet.projectileKind === "ring") {
        bullet.life -= delta;
        if (bullet.returning) {
          const homeX = run.player.x - bullet.x;
          const homeY = run.player.y - bullet.y;
          const homeDistance = Math.max(0.001, Math.hypot(homeX, homeY));
          bullet.vx = homeX / homeDistance * bullet.returnSpeed;
          bullet.vy = homeY / homeDistance * bullet.returnSpeed;
          bullet.x += bullet.vx * delta;
          bullet.y += bullet.vy * delta;
          if (homeDistance <= run.player.radius + bullet.radius + 5) {
            if (bullet.guardWaveOnReturn) triggerCinderGuardWave(run.player.x, run.player.y);
            bullet.dead = true;
            return;
          }
        } else {
          if (bullet.targetId !== null && bullet.turnRate > 0) {
            const trackedTarget = findLivingEnemyById(bullet.targetId);
            if (trackedTarget) {
              const currentAngle = Math.atan2(bullet.vy, bullet.vx);
              const desiredAngle = Math.atan2(trackedTarget.y - bullet.y, trackedTarget.x - bullet.x);
              const deltaAngle = Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle));
              const steeredAngle = currentAngle + clamp(deltaAngle, -bullet.turnRate * delta, bullet.turnRate * delta);
              const currentSpeed = Math.max(1, Math.hypot(bullet.vx, bullet.vy));
              bullet.vx = Math.cos(steeredAngle) * currentSpeed;
              bullet.vy = Math.sin(steeredAngle) * currentSpeed;
            }
          }
          bullet.x += bullet.vx * delta;
          bullet.y += bullet.vy * delta;
          bullet.outboundAge += delta;
          if (bullet.outboundAge >= bullet.outboundDuration || outsideCanvas(bullet.x, bullet.y, 14)) {
            bullet.returning = true;
            if (bullet.returnCanRehit) {
              bullet.hitIds.clear();
              bullet.pierceLeft = bullet.basePierce;
            }
          }
        }
        if (bullet.life <= 0 || outsideCanvas(bullet.x, bullet.y, 90)) {
          bullet.dead = true;
          return;
        }
      } else if (bullet.projectileKind !== "firefly" && bullet.projectileKind !== "firefly-draw") {
        bullet.x += bullet.vx * delta;
        bullet.y += bullet.vy * delta;
        bullet.life -= delta;
        if (bullet.life <= 0 || outsideCanvas(bullet.x, bullet.y, 40)) {
          bullet.dead = true;
          return;
        }
      }
      for (let index = 0; index < run.enemies.length; index += 1) {
        const enemy = run.enemies[index];
        if (enemy.dead || bullet.hitIds.has(enemy.id)) continue;
        if (circleCollision(bullet, enemy)) {
          bullet.hitIds.add(enemy.id);
          const markedTarget = Boolean(run.pursuitBatch && enemy.pursuitBatchId === run.pursuitBatch.id);
          const markedMultiplier = bullet.weaponId === "carbine" && markedTarget ? run.build.carbineMarkedDamageMultiplier : 1;
          const bulletSource = bullet.fusion ? "fusion" : bullet.projectileKind === "carbine-draw" ? "draw" : "projectile";
          damageEnemy(enemy, bullet.damage * markedMultiplier, bulletSource, bullet.weaponId || null);
          if (bullet.weaponId === "cinderRing" && bullet.repelStrength > 0 && enemy.kind !== "boss" && !enemy.dead) {
            const repelX = enemy.x - run.player.x;
            const repelY = enemy.y - run.player.y;
            const repelDistance = Math.max(0.001, Math.hypot(repelX, repelY));
            if (repelDistance < bullet.safetyRadius) {
              const displacement = Math.min(bullet.repelStrength, bullet.safetyRadius - repelDistance + 4);
              enemy.x += repelX / repelDistance * displacement;
              enemy.y += repelY / repelDistance * displacement;
            } else {
              enemy.slowTimer = Math.max(enemy.slowTimer, 0.65);
              enemy.slowMultiplier = Math.min(enemy.slowMultiplier, bullet.slowMultiplier);
            }
          }
          if (bullet.weaponId === "cinderRing" && bullet.burnRatio > 0 && !enemy.dead) {
            enemy.burnTimer = Math.max(enemy.burnTimer, 1.25);
            enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, bullet.damage * bullet.burnRatio / 1.25);
          }
          if (bullet.projectileKind === "carbine-draw" && bullet.headhuntAvailable) {
            bullet.headhuntAvailable = false;
            applyHeadhuntRefund(enemy);
          }
          if ((bullet.projectileKind === "firefly" || bullet.projectileKind === "firefly-draw") && bullet.chainRemaining > 0) {
            const chainedTarget = run.enemies.filter(function availableChainTarget(candidate) {
              return !candidate.dead && !bullet.hitIds.has(candidate.id) &&
                Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) <= bullet.chainRadius + candidate.radius;
            }).sort(function nearestChainTarget(first, second) {
              return Math.hypot(first.x - enemy.x, first.y - enemy.y) - Math.hypot(second.x - enemy.x, second.y - enemy.y);
            })[0] || null;
            if (chainedTarget) {
              bullet.chainRemaining -= 1;
              bullet.targetId = chainedTarget.id;
              bullet.life = Math.max(bullet.life, 0.55);
              addShockwave(enemy.x, enemy.y, 22, "#f7d37a", 0.22);
              break;
            }
          }
          if (bullet.pierceLeft > 0) bullet.pierceLeft -= 1;
          else bullet.dead = true;
          break;
        }
      }
    });
    run.playerBullets = run.playerBullets.filter(function keep(bullet) { return !bullet.dead; });
  }

  function updateEnemyBullets(delta) {
    run.enemyBullets.forEach(function moveBullet(bullet) {
      if (bullet.dead) return;
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;
      if (bullet.life <= 0 || outsideCanvas(bullet.x, bullet.y, 40)) {
        bullet.dead = true;
        return;
      }
      if (circleCollision(bullet, run.player)) {
        bullet.dead = true;
        if (run.player.invulnerable <= 0) run.enemyBulletHits += 1;
        damagePlayer(bullet.damage, bullet.ownerKind || "projectile");
      }
    });
    run.enemyBullets = run.enemyBullets.filter(function keep(bullet) { return !bullet.dead; });
  }

  function triggerEmberCorePhaseTwo(enemy) {
    if (!run || !enemy || enemy.dead || enemy.bossMode !== "ember-core" || enemy.bossPhase !== 1) return false;
    enemy.bossPhase = 2;
    enemy.health = Math.max(enemy.health, enemy.maxHealth * enemy.bossPhaseThreshold);
    enemy.bossPhasePause = 0.75;
    enemy.phaseWavePending = true;
    enemy.chargeState = "idle";
    const chargeSpec = Logic.getBossChargeSpec(run.wave, 2, run.curveProfile, run.dangerLevel);
    enemy.chargeTimer = chargeSpec ? chargeSpec.initialDelay : 0;
    enemy.bossAttackState = "idle";
    enemy.bossAttackWindup = 0;
    enemy.bossPatternKind = null;
    clearMajorThreatPending(enemy);
    enemy.shootTimer = 0.7;
    enemy.patternSerial = 0;
    run.enemyBullets = [];
    clearPursuitBatch("phase-transition");
    run.playerBullets.forEach(function burnExistingShot(bullet) { bullet.dead = true; });
    run.playerBullets = [];
    run.screenShake = Math.max(run.screenShake, 0.22);
    addShockwave(enemy.x, enemy.y, 180, "#ffd06f", 0.65);
    emitCombatFeedback("boss-phase", { x: enemy.x, y: enemy.y, causeId: "boss-phase:" + enemy.id + ":2" });
    addCallout("终焰净场 · 光波蓄能", enemy.x, enemy.y - enemy.radius - 18, "#ffe49a");
    return true;
  }

  function triggerBossPhaseTwo(enemy) {
    if (!run || !enemy || enemy.dead || enemy.kind !== "boss" || enemy.bossPhase !== 1 || enemy.bossMode === "ember-core") return false;
    enemy.bossPhase = 2;
    enemy.bossPhasePause = 0.48;
    enemy.phaseWavePending = enemy.bossMode === "fire-keeper";
    enemy.chargeState = "idle";
    const chargeSpec = Logic.getBossChargeSpec(run.wave, 2, run.curveProfile, run.dangerLevel);
    enemy.chargeTimer = chargeSpec ? chargeSpec.initialDelay : 0;
    enemy.bossAttackState = "idle";
    enemy.bossAttackWindup = 0;
    enemy.bossPatternKind = null;
    clearMajorThreatPending(enemy);
    enemy.shootTimer = 0.55;
    enemy.patternSerial = 0;
    run.enemyBullets = run.enemyBullets.filter(function clearBossBullets(bullet) { return bullet.ownerId !== enemy.id; });
    if (enemy.bossMode === "fire-keeper") {
      spawnFireDrop("sharp", enemy.x - 18, enemy.y, { refined: true, life: 9, maxLife: 9 });
      spawnFireDrop("tide", enemy.x + 18, enemy.y, { refined: true, life: 9, maxLife: 9 });
      enemy.bossPhasePause = 0.72;
      if (run.curveProfile === REMAKE_CURVE_ID) {
        const transitionSpec = Logic.getBossTransitionSpec(run.wave, run.curveProfile, run.dangerLevel);
        enemy.bossPhasePause = Math.max(enemy.bossPhasePause, transitionSpec ? transitionSpec.windup : 0);
      }
    }
    addShockwave(enemy.x, enemy.y, 142, enemy.bossColor || "#ff9f43", 0.58);
    emitCombatFeedback("boss-phase", { x: enemy.x, y: enemy.y, causeId: "boss-phase:" + enemy.id + ":2" });
    addCallout(enemy.bossMode === "ash-ram"
      ? "半血狂奔 · 冲锋加速"
      : enemy.bossMode === "fire-keeper" ? "守火换势 · 锋潮落炉" : "半血逆织 · 弹环加密", enemy.x, enemy.y - enemy.radius - 20, "#fff0bd");
    return true;
  }

  function damageEnemy(enemy, amount, source, weaponId) {
    if (!run || !enemy || enemy.dead || !Number.isFinite(amount) || amount <= 0) return 0;
    if (["ember-core", "fire-keeper"].includes(enemy.bossMode) && enemy.bossPhase === 2 && enemy.bossPhasePause > 0) return 0;
    let multiplier = 1;
    if (enemy.bossMode === "ash-ram" && enemy.vulnerableTimer > 0) {
      multiplier *= 1.35;
      if (source === "flash") multiplier *= 1.5;
    }
    if (enemy.kind === "switchGuard" && weaponId && !enemy.armorBroken) {
      if (!enemy.guardWeaponId) {
        enemy.guardWeaponId = weaponId;
      } else if (enemy.guardWeaponId === weaponId) {
        enemy.sameWeaponHits += 1;
        multiplier *= 0.55;
      } else {
        enemy.armorBroken = true;
        multiplier *= 1.25;
        interruptEnemyThreat(enemy);
        spawnCarrierFireDrop(enemy, source, { armorBroken: true });
        addCallout("换火破甲 · 携火掉落", enemy.x, enemy.y - enemy.radius - 14, "#fff0a6");
        createParticles(enemy.x, enemy.y, "armor", 10, {
          feedbackClass: "heavy",
          eventName: "elite-break",
          eventId: "armor:" + enemy.id
        });
        applyScreenShake(0.16);
        recordThreatResolution("armor:" + enemy.id, "破甲处置 +100");
        run.bossBreakMethod = "换火破甲";
      }
    }
    const damage = amount * multiplier;
    const previousHealth = enemy.health;
    if (enemy.bossMode === "ember-core" && enemy.bossPhase === 1) {
      const thresholdHealth = enemy.maxHealth * enemy.bossPhaseThreshold;
      if (enemy.health - damage <= thresholdHealth) {
        enemy.health = thresholdHealth;
        enemy.flash = 0.12;
        triggerEmberCorePhaseTwo(enemy);
        return Math.max(0, previousHealth - enemy.health);
      }
    }
    if (enemy.bossMode === "fire-keeper" && enemy.bossPhase === 1) {
      const thresholdHealth = enemy.maxHealth * enemy.bossPhaseThreshold;
      if (enemy.health - damage <= thresholdHealth) {
        enemy.health = thresholdHealth;
        enemy.flash = 0.12;
        triggerBossPhaseTwo(enemy);
        return Math.max(0, previousHealth - enemy.health);
      }
    }
    enemy.health -= damage;
    enemy.flash = source === "flash" ? 0.12 : 0.08;
    const appliedDamage = Math.min(previousHealth, damage);
    addImpactMark(enemy, appliedDamage, source, weaponId, enemy.health <= 0);
    const heavyImpact = ["flash", "draw", "ring-draw", "fusion", "return-fire"].includes(source) || damage >= enemy.maxHealth * 0.11;
    if (heavyImpact) {
      emitCombatFeedback("heavy-impact", {
        x: enemy.x,
        y: enemy.y,
        kind: weaponId && getWeaponTechniqueFamily(weaponId) === "cinderRing" ? "ring-hit" : "heavy-hit",
        silent: source === "flash",
        causeId: "impact:" + enemy.id + ":" + source + ":" + Math.round(run.elapsed * 1000)
      });
    } else if (source === "projectile") {
      emitCombatFeedback("normal-impact", {
        x: enemy.x,
        y: enemy.y,
        kind: weaponId && getWeaponTechniqueFamily(weaponId) === "cinderRing" ? "ring-hit" : "hit",
        causeId: "impact:" + enemy.id + ":" + Math.round(run.elapsed * 1000)
      });
    }
    if (weaponId && ["projectile", "draw", "ring-draw"].includes(source)) {
      recordOrdinaryWeaponHit(weaponId);
      handleTechniqueHit(enemy, getWeaponTechniqueFamily(weaponId));
    }
    if (enemy.health <= 0 && !enemy.dead) killEnemy(enemy, source, weaponId);
    return appliedDamage;
  }

  function damagePlayer(amount, source) {
    if (!run || run.ended || run.player.invulnerable > 0) return;
    const previousHealth = run.player.health;
    run.player.health = Math.max(0, run.player.health - amount);
    run.damageTaken = (run.damageTaken || 0) + Math.max(0, previousHealth - run.player.health);
    run.lastDamageSource = source || "unknown";
    run.player.invulnerable = 0.30;
    run.player.hitFlash = 0.16;
    const fatal = run.player.health <= 0;
    emitCombatFeedback(fatal ? "player-death" : "player-hurt", {
      x: run.player.x,
      y: run.player.y,
      causeId: "player-damage:" + Math.round(run.elapsed * 1000) + ":" + (source || "unknown")
    });
    pulseVibration(fatal ? [28, 24, 52] : 22);
  }

  function killEnemy(enemy, source, weaponId) {
    if (enemy.dead) return;
    const groupMembers = enemy.groupId ? run.enemies.filter(function livingGroupMember(candidate) {
      return candidate.id !== enemy.id && !candidate.dead && candidate.groupId === enemy.groupId;
    }) : [];
    const livingLeader = enemy.groupId ? groupMembers.find(function findGroupLeader(candidate) { return candidate.groupLeader; }) : null;
    const remainingFollowers = groupMembers.filter(function groupFollower(candidate) { return !candidate.groupLeader; });
    if (enemy.carrierTraitId) {
      spawnCarrierFireDrop(enemy, source, {
        enemyKind: enemy.kind,
        leaderKilledFirst: enemy.groupLeader && groupMembers.length > 0,
        groupClearedFirst: !enemy.groupLeader && Boolean(livingLeader) && remainingFollowers.length === 0
      });
    }
    if (!enemy.groupLeader && livingLeader && remainingFollowers.length === 0) {
      const groupResolution = resolveRuntimeFireEvent("tide", {
        type: "drop",
        enemyKind: "tidecaller",
        groupClearedFirst: true,
        refined: true,
        killSource: normalizeFireKillSource(source)
      });
      spawnFireDrop(groupResolution.traitId, livingLeader.x, livingLeader.y, {
        storeCount: groupResolution.count,
        refined: true,
        sourceKind: "tide-group"
      });
      livingLeader.attackState = "windup";
      livingLeader.attackWindup = Math.max(livingLeader.attackWindup, 0.7);
      addCallout("完整清群 · 潮火精炼", livingLeader.x, livingLeader.y - livingLeader.radius - 15, "#78edf0");
    }
    enemy.dead = true;
    if (run.forge.eye && run.forge.eye.targetId === enemy.id) {
      const nextThreat = findNextHighThreat(enemy.id);
      const settlement = Logic.settleTechniqueEyeOwnerDeath(run.forge, {
        targetId: enemy.id,
        x: enemy.x,
        y: enemy.y,
        headhunt: run.coreId === "headhunt-core",
        nextHighThreat: nextThreat
      });
      run.forge = settlement.state;
      if (settlement.transferred && nextThreat) addCallout("猎首移眼", nextThreat.x, nextThreat.y - nextThreat.radius - 12, "#fff0a6");
    }
    removePursuitMarkForEnemy(enemy.id);
    run.kills += 1;
    run.killsSinceHeal += 1;
    const contract = run.contract;
    if (contract && contract.killHealEvery > 0 && run.killsSinceHeal >= contract.killHealEvery) {
      run.killsSinceHeal = 0;
      run.player.health = Math.min(run.player.maxHealth, run.player.health + run.player.maxHealth * contract.killHealRatio);
      createParticles(run.player.x, run.player.y, "heal", 12);
    }
    const xpValue = enemy.xpValue * (contract ? contract.xpMultiplier : 1);
    const orbCount = Math.min(8, Math.ceil(xpValue));
    for (let index = 0; index < orbCount; index += 1) {
      run.xpOrbs.push({
        x: enemy.x + (runRandom() - 0.5) * 12,
        y: enemy.y + (runRandom() - 0.5) * 12,
        value: xpValue / orbCount,
        radius: enemy.kind === "boss" ? 5 : 4,
        life: Infinity
      });
    }
    if (enemy.kind === "boss") {
      if (source === "fusion") run.bossBreakMethod = "合焰追击";
      else if (source === "return-fire") run.bossBreakMethod = "返焰反杀";
      else if (["draw", "ring-draw"].includes(source)) run.bossBreakMethod = "拔火破宗";
      if (run.wave === Logic.VICTORY_WAVE && run.bossBreakMethod !== "常规输出") run.bossBreaks = 1;
      run.bossId = null;
      run.enemyBullets = run.enemyBullets.filter(function removeDefeatedBossBullets(bullet) { return bullet.ownerId !== enemy.id; });
      run.bossWaves = run.bossWaves.filter(function removeDefeatedBossWaves(wave) { return wave.ownerId !== enemy.id; });
      dom.bossBar.hidden = true;
      addShockwave(enemy.x, enemy.y, 150, enemy.bossColor || "#ff9f43", 0.65);
      emitCombatFeedback("boss-defeat", { x: enemy.x, y: enemy.y, causeId: "boss-defeat:" + enemy.id });
    } else {
      const eliteDefeat = ["artillery", "switchGuard", "tidecaller"].includes(enemy.kind);
      emitCombatFeedback(eliteDefeat ? "elite-defeat" : "enemy-defeat", {
        x: enemy.x,
        y: enemy.y,
        causeId: "enemy-defeat:" + enemy.id
      });
    }
  }

  function updateXpOrbs(delta) {
    const player = run.player;
    const pickupRadius = Math.min(MAX_PICKUP_RADIUS, BASE_PICKUP_RADIUS * run.build.pickupRadiusMultiplier);
    run.xpOrbs.forEach(function moveOrb(orb) {
      orb.life -= delta;
      const dx = player.x - orb.x;
      const dy = player.y - orb.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      if (distance < pickupRadius) {
        const speed = 115 + (pickupRadius - distance) * 4;
        orb.x += dx / distance * speed * delta;
        orb.y += dy / distance * speed * delta;
      }
      if (distance < player.radius + orb.radius + 5) {
        orb.life = 0;
        applyFieldPickupHeat(orb.value);
        gainExperience(orb.value);
      }
    });
    run.xpOrbs = run.xpOrbs.filter(function keep(orb) { return orb.life > 0; });
  }

  function applyFieldPickupHeat(experienceAmount) {
    if (!run || !Number.isFinite(experienceAmount) || experienceAmount <= 0) return 0;
    const gained = addHolsteredHeat(experienceAmount * 0.06, true);
    if (gained > 0) createParticles(run.player.x, run.player.y, "heat", 3);
    return gained;
  }

  function gainExperience(amount, deferDecision) {
    if (!run || run.ended) return;
    run.xp += amount;
    while (run.xp + 1e-9 >= run.xpNeeded) {
      run.xp = Math.max(0, run.xp - run.xpNeeded);
      run.level += 1;
      run.xpNeeded = Math.floor(12 + run.level * 3.2);
      run.pendingChoices += 1;
    }
    updateRunUi();
    const awaitingWaveClear = run.waveStarted && run.spawnPlan.length === 0 && !run.enemies.some(function living(enemy) { return !enemy.dead; });
    const deferForClassicWave = run.mode === "classic" && run.waveStarted;
    if (!deferDecision && !deferForClassicWave && !awaitingWaveClear && run.pendingChoices > 0 && !run.choiceOpen) processDecisionQueue();
  }

  function collectRemainingExperience() {
    if (!run || !run.xpOrbs.length) return;
    const total = run.xpOrbs.reduce(function sumXp(sum, orb) { return sum + orb.value; }, 0);
    run.xpOrbs = [];
    if (total > 0) gainExperience(total, true);
  }

  function preferredChoice(choices, priorityIds) {
    if (!Array.isArray(choices) || !choices.length) return null;
    const priorities = Array.isArray(priorityIds) ? priorityIds : [];
    for (let index = 0; index < priorities.length; index += 1) {
      const matching = choices.find(function matchingChoice(choice) { return choice.id === priorities[index]; });
      if (matching) return matching;
    }
    return choices[0];
  }

  function applyUpgradeSelection(id) {
    const upgrade = getUpgradeDefinition(id);
    if (!run || !upgrade) return false;
    const previousMaxHealthMultiplier = run.build.maxHealthMultiplier;
    run.build = Logic.applyChosenRunUpgrade(run.build, id);
    if (run.build.maxHealthMultiplier !== previousMaxHealthMultiplier) {
      const ratio = run.build.maxHealthMultiplier / previousMaxHealthMultiplier;
      run.player.maxHealth *= ratio;
      run.player.health = Math.min(run.player.maxHealth, run.player.health + run.player.maxHealth * 0.2);
    }
    return true;
  }

  function applyDoctrineSelection(doctrineId) {
    if (!run || run.doctrineId) return null;
    const doctrine = Logic.getDoctrine(doctrineId);
    if (!doctrine) return null;
    run.doctrineId = doctrine.id;
    run.carbineEvolutionId = doctrine.carbineEvolutionId;
    run.ringEvolutionId = doctrine.ringEvolutionId;
    return doctrine;
  }

  function canOpenC13GrowthChoice() {
    if (!run || run.mode !== "classic" || run.pendingChoices <= 0) return false;
    const isCoreRest = run.completedWave > 0 && run.completedWave % 5 === 0;
    return !isCoreRest && run.growthChoiceCompletedWave !== run.completedWave;
  }

  function createC13RuntimeGrowthChoices() {
    const planned = Logic.createC13WeaponGrowthCards(run.weaponProgress);
    const supportPool = C13_SUPPORT_UPGRADE_IDS.map(getUpgradeDefinition).filter(Boolean);
    const offset = Math.abs((run.completedWave || 0) + choiceSerial++) % supportPool.length;
    const rotatedSupport = supportPool.slice(offset).concat(supportPool.slice(0, offset));
    const usedSupportIds = new Set();
    return planned.map(function resolveC13GrowthChoice(card, index) {
      if (card.kind === "weapon-level") {
        const weapon = getWeaponDefinition(card.weaponId);
        return Object.assign({}, card, {
          icon: weapon.shortName,
          color: weapon.color,
          recommended: card.lane === "active"
        });
      }
      const support = rotatedSupport.find(function unusedSupport(candidate) { return !usedSupportIds.has(candidate.id); }) || rotatedSupport[index % rotatedSupport.length];
      usedSupportIds.add(support.id);
      return {
        id: "c13-support:" + support.id + ":" + card.lane,
        kind: "support",
        lane: card.lane,
        upgradeId: support.id,
        weaponId: card.weaponId || null,
        name: support.name,
        description: support.description,
        icon: upgradeIcons[support.id] || "炉",
        color: "#d28a55",
        recommended: false,
        visibleEvolution: false
      };
    });
  }

  function processDecisionQueue() {
    if (!run || run.ended) return;
    run.paused = true;
    if (lifecycleSuspended || document.hidden || !dom.pauseOverlay.hidden) return;
    if (run.transition && run.transition.type === "victory") {
      openVictory();
      return;
    }
    if (run.transition && run.transition.type === "core") {
      openCoreChoice(run.transition.nextWave);
      return;
    }
    if (run.mode === "tutorial" && run.pendingChoices > 0) {
      openUpgradeChoice();
      return;
    }
    if (canOpenC13GrowthChoice()) {
      openUpgradeChoice();
      return;
    }
    if (!run.transition) {
      run.paused = false;
      return;
    }
    if (run.transition.type === "core") {
      openCoreChoice(run.transition.nextWave);
      return;
    }
    if (run.transition.type === "contract") {
      if (run.quickStart) {
        beginWave(run.transition.nextWave);
        return;
      }
      openContractChoice(run.transition.nextWave);
      return;
    }
    const nextWave = run.transition.nextWave;
    beginWave(nextWave);
  }

  function addChoiceHotkey(button, index) {
    if (!button || index < 0 || index > 2) return;
    button.dataset.hotkey = String(index + 1);
    const key = document.createElement("kbd");
    key.textContent = String(index + 1);
    key.setAttribute("aria-hidden", "true");
    button.appendChild(key);
  }

  function openUpgradeChoice() {
    if (!run || run.ended || run.pendingChoices <= 0 || run.choiceOpen) return;
    run.paused = true;
    if (lifecycleSuspended || document.hidden || !dom.pauseOverlay.hidden) return;
    run.choiceOpen = true;
    clearInput();
    const isTutorialGrowth = run.mode === "tutorial" && run.tutorial && run.tutorial.step === "growth";
    run.choiceMode = isTutorialGrowth ? "upgrade" : "c13-growth";
    dom.choiceKicker.textContent = isTutorialGrowth
      ? "新手试火 · 仅本次试火生效"
      : "波次成长 · 只会推荐，不会代选";
    dom.choiceTitle.textContent = isTutorialGrowth
      ? "选一项，立刻看见变强"
      : "亲手选择一项成长";
    const tutorialUpgradeIds = ["iron-heart", "windstep", getWeaponTechniqueFamily(run.activeWeaponId) === "carbine" ? "carbine-rail" : "ring-blades"];
    const choices = isTutorialGrowth
      ? tutorialUpgradeIds.map(getUpgradeDefinition).filter(Boolean)
      : createC13RuntimeGrowthChoices();
    run.activeGrowthChoices = isTutorialGrowth ? [] : choices.map(function copyGrowthChoice(choice) { return Object.assign({}, choice); });
    const recommended = isTutorialGrowth
      ? preferredChoice(choices, QUICK_UPGRADE_PRIORITY)
      : choices.find(function activeWeaponRecommendation(choice) { return choice.kind === "weapon-level" && choice.lane === "active"; }) || choices[0];
    if (recommended) run.recommendedChoices += 1;
    dom.choiceList.replaceChildren();
    choices.forEach(function renderChoice(choice, index) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-card" + (!isTutorialGrowth && choice.kind === "weapon-level" ? " weapon-level-card" : "");
      if (recommended && choice.id === recommended.id) {
        button.classList.add("is-recommended");
        button.setAttribute("aria-label", "推荐：" + choice.name + "，" + choice.description);
      }
      button.dataset.upgradeId = choice.id;
      const currentCount = isTutorialGrowth ? (run.build.upgradeCounts[choice.id] || 0) : choice.kind === "weapon-level" ? choice.currentLevel : (run.build.upgradeCounts[choice.upgradeId] || 0);
      const nextLabel = !isTutorialGrowth && choice.kind === "weapon-level" ? "Lv." + choice.nextLevel : "Lv." + (currentCount + 1);
      button.innerHTML = "<span class=\"choice-icon\">" + (choice.icon || upgradeIcons[choice.id] || "火") + "</span>" +
        "<span><strong>" + choice.name + "</strong><small>" + choice.description + "</small></span>" +
        "<b>" + nextLabel + "</b>";
      button.addEventListener("click", function selectChoice() {
        if (isTutorialGrowth) chooseUpgrade(choice.id);
        else chooseC13Growth(choice.id);
      }, { once: true });
      addChoiceHotkey(button, index);
      if (choice.visibleEvolution || (recommended && choice.id === recommended.id)) {
        const badge = document.createElement("em");
        badge.className = "quick-recommended";
        badge.textContent = choice.visibleEvolution ? "攻击质变" : "推荐";
        button.appendChild(badge);
      }
      dom.choiceList.appendChild(button);
    });
    dom.choiceOverlay.hidden = false;
  }

  function chooseUpgrade(id) {
    if (!run || !run.choiceOpen || run.choiceMode !== "upgrade" || run.ended) return;
    if (!applyUpgradeSelection(id)) return;
    run.pendingChoices = Math.max(0, run.pendingChoices - 1);
    if (run.initialChoicesRemaining > 0) run.initialChoicesRemaining -= 1;
    run.choiceOpen = false;
    run.choiceMode = null;
    dom.choiceOverlay.hidden = true;
    dom.choiceTitle.textContent = "选择一项成长";
    updateRunUi();
    if (run.pendingChoices > 0) {
      window.setTimeout(openUpgradeChoice, 80);
    } else {
      window.setTimeout(processDecisionQueue, 60);
    }
  }

  function chooseC13Growth(choiceId) {
    if (!run || !run.choiceOpen || run.choiceMode !== "c13-growth" || run.ended) return false;
    const choice = run.activeGrowthChoices.find(function matchingGrowthChoice(candidate) { return candidate.id === choiceId; });
    if (!choice) return false;
    let message = "";
    let color = choice.color || "#d28a55";
    if (choice.kind === "weapon-level") {
      const upgraded = Logic.upgradeC13Weapon(run.weaponProgress, choice.weaponId);
      if (!upgraded.upgraded) return false;
      run.weaponProgress = upgraded.state;
      run.activeWeaponId = run.weaponProgress.activeWeaponId;
      const weapon = getWeaponDefinition(choice.weaponId);
      message = weapon.name + "升至 Lv." + upgraded.afterLevel + " · " + upgraded.levelDefinition.name;
      color = weapon.color;
    } else {
      if (!applyUpgradeSelection(choice.upgradeId)) return false;
      message = choice.name + "已生效";
    }
    run.pendingChoices = Math.max(0, run.pendingChoices - 1);
    run.growthChoiceCompletedWave = run.completedWave;
    run.growthChoicesManuallySelected += 1;
    run.activeGrowthChoices = [];
    run.choiceOpen = false;
    run.choiceMode = null;
    dom.choiceOverlay.hidden = true;
    dom.choiceTitle.textContent = "选择一项成长";
    addCallout(message, run.player.x, run.player.y - 36, color);
    showToast(message);
    updateRunUi();
    window.setTimeout(processDecisionQueue, 70);
    return true;
  }

  function chooseDoctrine(doctrineId) {
    if (!run || !run.choiceOpen || run.choiceMode !== "doctrine" || run.ended || run.doctrineId) return;
    const doctrine = applyDoctrineSelection(doctrineId);
    if (!doctrine) return;
    run.pendingChoices = Math.max(0, run.pendingChoices - 1);
    run.choiceOpen = false;
    run.choiceMode = null;
    dom.choiceOverlay.hidden = true;
    dom.choiceTitle.textContent = "选择一项成长";
    updateRunUi();
    showToast("兵器锻型 · " + doctrine.name + "：" + doctrine.description);
    addCallout(doctrine.name, run.player.x, run.player.y - 34, "#fff0a6");
    if (run.pendingChoices > 0) window.setTimeout(openUpgradeChoice, 80);
    else window.setTimeout(processDecisionQueue, 60);
  }

  function openCoreChoice(nextWave) {
    if (!run || run.ended || run.coreOpen) return;
    run.paused = true;
    run.coreOpen = true;
    clearInput();
    const refining = Boolean(run.coreId);
    dom.coreKicker.textContent = refining
      ? "第 " + run.completedWave + " 波战利品 · 手动再锻"
      : "首领战利品 · 手动选择炉心";
    dom.coreList.replaceChildren();
    const coreChoices = Logic.createCoreChoices(run.seed + ":core:" + nextWave);
    const recommended = preferredChoice(coreChoices, QUICK_CORE_PRIORITY);
    coreChoices.forEach(function renderCore(core, index) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-card core-card";
      if (recommended && core.id === recommended.id) {
        button.classList.add("is-recommended");
        button.setAttribute("aria-label", "推荐：" + core.name + "，" + core.description);
      }
      button.dataset.core = core.id;
      button.innerHTML = "<span class=\"choice-icon\">" + core.icon + "</span>" +
        "<span><strong>" + (refining ? "再锻 · " : "") + core.name + "</strong><small>" + core.description + "</small></span>" +
        "<b>Lv." + (refining ? run.coreLevel + 1 : 1) + "</b>";
      button.addEventListener("click", function selectCore() {
        chooseCore(core.id, nextWave);
      }, { once: true });
      addChoiceHotkey(button, index);
      if (recommended && core.id === recommended.id) {
        const badge = document.createElement("em");
        badge.className = "quick-recommended";
        badge.textContent = "推荐";
        button.appendChild(badge);
      }
      dom.coreList.appendChild(button);
    });
    dom.coreOverlay.hidden = false;
    if (recommended) run.recommendedChoices += 1;
  }

  function chooseCore(coreId, nextWave) {
    if (!run || run.ended || !run.coreOpen) return;
    const core = Logic.getCoreEquipment(coreId);
    if (!core) return;
    const refining = Boolean(run.coreId);
    run.coreId = core.id;
    run.coreLevel = refining ? run.coreLevel + 1 : 1;
    if (refining) run.coreUpgrades += 1;
    run.coreOpen = false;
    run.transition = { type: run.quickStart ? "wave" : "contract", nextWave: nextWave };
    dom.coreOverlay.hidden = true;
    updateRunUi();
    showToast((refining ? "炉心再锻 · " : "") + core.name + " Lv." + run.coreLevel + "：" + core.description);
    window.setTimeout(processDecisionQueue, 80);
  }

  function openContractChoice(nextWave) {
    if (!run || run.ended || run.contractOpen) return;
    const lastContractId = run.contractHistory.length ? run.contractHistory[run.contractHistory.length - 1] : null;
    let choices = Logic.createContractChoices(run.seed + ":stage:" + nextWave, lastContractId ? [lastContractId] : []);
    if (!choices.length) {
      choices = Logic.createContractChoices(run.seed + ":stage:" + nextWave, []);
    }
    run.paused = true;
    run.contractOpen = true;
    clearInput();
    dom.contractKicker.textContent = "第 " + Logic.getStageNumber(nextWave) + " 幕 · 第 " + nextWave + "—" + (nextWave + 4) + " 波";
    if (dom.contractPreview) dom.contractPreview.textContent = "下一幕的首个模块已经按种子排定；不同契约会带来不同题目，卡片下方给出对应预报。";
    dom.contractList.replaceChildren();
    choices.forEach(function renderContract(contract, index) {
      const preview = Logic.getStageEncounterPreview(nextWave, run.seed, contract.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-card contract-card";
      button.dataset.contract = contract.id;
      button.innerHTML = "<span class=\"choice-icon\">" + (contractIcons[contract.id] || "令") + "</span>" +
        "<span><strong>" + contract.name + "</strong><small>" + contract.description + "</small><em>" +
        "预报 " + preview.moduleName + " · " + preview.enemyFocusLabel + " · " +
        (contract.primaryTraitId ? "契约偏 " + Logic.FIRE_TRAITS[contract.primaryTraitId].name : "火性稀少 · 合格击杀双枚") + "</em></span>";
      button.addEventListener("click", function selectContract() {
        chooseContract(contract.id, nextWave);
      }, { once: true });
      addChoiceHotkey(button, index);
      dom.contractList.appendChild(button);
    });
    dom.contractOverlay.hidden = false;
  }

  function chooseContract(contractId, nextWave) {
    if (!run || run.ended || !run.contractOpen) return;
    const contract = Logic.getStageContract(contractId);
    const lastContractId = run.contractHistory.length ? run.contractHistory[run.contractHistory.length - 1] : null;
    if (!contract || contract.id === lastContractId) return;
    const previousHealthMultiplier = run.contract ? run.contract.maxHealthMultiplier : 1;
    const healthRatio = run.player.health / Math.max(1, run.player.maxHealth);
    run.contract = contract;
    run.usedContracts.push(contract.id);
    run.contractHistory.push(contract.id);
    run.contractHistory = run.contractHistory.slice(-3);
    if (nextWave > run.startWave || nextWave > 1) run.forge = Logic.clearForgeStageState(run.forge);
    run.killsSinceHeal = 0;
    run.stationaryTime = 0;
    run.flashHuntWindow = 0;
    run.flashEmpoweredShots = 0;
    run.player.maxHealth = run.player.maxHealth / previousHealthMultiplier * contract.maxHealthMultiplier;
    run.player.health = Math.max(1, run.player.maxHealth * healthRatio);
    run.contractOpen = false;
    run.transition = null;
    dom.contractOverlay.hidden = true;
    beginWave(nextWave);
  }

  function checkWaveCompletion(delta) {
    if (run.spawnPlan.length || run.enemies.length) {
      run.waveClearDelay = 0;
      return;
    }
    run.waveClearDelay += delta;
    if (run.waveClearDelay < (run.fireDrops.length ? 2.6 : 1.15)) return;
    completeCurrentWave();
  }

  function showRelaySuccess(relay) {
    const upgrade = relay ? getUpgradeDefinition(relay.upgradeId) : null;
    if (!upgrade) return;
    clearTimeout(relayBurstTimer);
    dom.relayBurst.hidden = true;
    void dom.relayBurst.offsetWidth;
    dom.relayBurstLabel.textContent = upgrade.name + " +1";
    dom.relayBurst.hidden = false;
    dom.arena.classList.add("is-relay-lit");
    run.relayFlash = 0.8;
    createParticles(run.player.x, run.player.y, "fusion", 24);
    addShockwave(run.player.x, run.player.y, 124, "#ffd98d", 0.62);
    emitCombatFeedback("relay-ignite", { causeId: "relay:" + run.completedWave + ":" + relay.upgradeId });
    pulseVibration([35, 30, 65]);
    relayBurstTimer = window.setTimeout(function hideRelayBurst() {
      dom.relayBurst.hidden = true;
      dom.arena.classList.remove("is-relay-lit");
    }, 640);
  }

  function completeCurrentWave() {
    if (!run || run.mode !== "classic" || run.ended || !run.waveStarted) return;
    clearPursuitBatch("wave-complete");
    run.waveStarted = false;
    audioClosedWave = run.wave;
    run.completedWave = Math.max(run.completedWave, run.wave);
    run.waveClearDelay = 0;
    run.playerBullets = [];
    run.enemyBullets = [];
    run.bossWaves = [];
    run.weaponEffects = [];
    run.warmFieldId = null;
    run.crossfire = null;
    collectRemainingExperience();
    if (run.completedWave < Logic.VICTORY_WAVE && run.completedWave % 5 !== 0) {
      run.pendingChoices = Math.max(1, run.pendingChoices);
    }
    if ((run.damageTaken || 0) <= (run.waveDamageStart || 0) + 0.001) run.noHitWaves = (run.noHitWaves || 0) + 1;
    emitCombatFeedback("wave-clear", {
      wave: run.completedWave,
      strength: run.completedWave % 5 === 0 ? 1.2 : 0.85,
      causeId: "wave-clear:" + run.completedWave
    });
    const recoveryRatio = Logic.getWaveRecoveryRatio(run.completedWave, run.contract ? run.contract.id : null, run.curveProfile);
    run.player.health = Math.min(run.player.maxHealth, run.player.health + run.player.maxHealth * recoveryRatio);
    const previousRelayHealthMultiplier = run.build.maxHealthMultiplier;
    const relayCompletion = Logic.completeRelayWave(profile, run.build, run.completedWave);
    run.build = relayCompletion.runState;
    if (run.build.maxHealthMultiplier !== previousRelayHealthMultiplier) {
      const ratio = run.build.maxHealthMultiplier / previousRelayHealthMultiplier;
      run.player.maxHealth *= ratio;
      run.player.health = Math.min(run.player.maxHealth, run.player.health + run.player.maxHealth * 0.2);
    }
    if (relayCompletion.completed) {
      run.forge.nextStoredDouble = true;
      replaceCoreSave(relayCompletion.save);
      saveProfile();
      dom.topRelayCount.textContent = String(profile.relayCount || 0);
    }
    if (run.completedWave === Logic.VICTORY_WAVE && !run.victoryBanked) {
      run.fireDrops = [];
      run.safeLanes = [];
      run.transition = { type: "victory" };
      bankVictoryReward();
    } else if (run.completedWave % 5 === 0) {
      run.transition = { type: "core", nextWave: run.completedWave + 1 };
    } else if (run.quickStart) {
      run.transition = { type: "wave", nextWave: run.completedWave + 1 };
    } else {
      run.transition = { type: "wave", nextWave: run.completedWave + 1 };
    }
    if (relayCompletion.completed) {
      run.paused = true;
      clearInput();
      updateRunUi();
      showRelaySuccess(relayCompletion.relay);
      clearTimeout(relayResumeTimer);
      relayResumeTimer = window.setTimeout(processDecisionQueue, 220);
    } else processDecisionQueue();
  }

  function recordClassicOutcome() {
    if (!run || run.mode !== "classic" || run.classicResultBanked) return run ? run.classicScoreCard : null;
    const recorded = Logic.recordClassicResult(profile, currentClassicScoreInput());
    replaceCoreSave(recorded.save);
    run.classicResultBanked = true;
    run.classicScoreCard = recorded.scoreCard;
    run.classicResultMeta = {
      attemptRecordUpdated: recorded.attemptRecordUpdated,
      bestAttemptRecord: recorded.bestAttemptRecord,
      officialRecordEligible: recorded.officialRecordEligible,
      officialRecordUpdated: recorded.officialRecordUpdated
    };
    run.classicNewAchievementIds = recorded.newlyEarnedAchievementIds;
    run.classicNewBearerIds = recorded.newlyUnlockedBearerIds;
    return recorded.scoreCard;
  }

  function bankVictoryReward() {
    if (!run || run.mode !== "classic" || run.ended || run.victoryBanked) return false;
    profile.bestWave = Math.max(profile.bestWave || 0, run.completedWave);
    profile.bestCompletedWave = Math.max(profile.bestCompletedWave || 0, run.completedWave);
    profile.runs = (profile.runs || 0) + 1;
    profile.victories = (profile.victories || 0) + 1;
    profile.firstSettlementClaimed = true;
    run.victoryBanked = true;
    run.bankedRewardWave = run.completedWave;
    run.rewardFloorWave = run.completedWave;
    run.victoryReward = 0;
    run.runCounted = true;
    run.runReport = createRunReport("victory");
    recordClassicOutcome();
    saveProfile();
    updateAccountUi();
    return true;
  }

  function openVictory() {
    if (!run || run.ended) return;
    run.paused = true;
    clearInput();
    bankVictoryReward();
    const scoreCard = run.classicScoreCard || Logic.calculateClassicScore(currentClassicScoreInput());
    const resultMeta = run.classicResultMeta || {};
    dom.victoryKicker.textContent = "第 15 波已肃清 · 守火完成";
    dom.victoryTitle.textContent = scoreCard.grade + " 级 · " + formatNumber(scoreCard.total) + " 分";
    dom.victoryProgressCaption.textContent = "完成波次";
    dom.victoryProgress.textContent = "15";
    dom.victoryEmbersCaption.textContent = "纪录状态";
    dom.victoryScoreCard.hidden = false;
    dom.victoryGrade.textContent = scoreCard.grade;
    dom.victoryScore.textContent = formatNumber(scoreCard.total);
    dom.victoryScoreBreakdown.textContent = "推进 " + scoreCard.components.progress + " · 生存 " + scoreCard.components.survival + " · 战术 " + scoreCard.components.technique + " · 难度 ×" + scoreCard.dangerMultiplier.toFixed(2) + "；击杀数不计分";
    dom.victoryCopy.textContent = run.relayIntervened
      ? "接火完成了这一炉，并解锁正常进度；接火局不会覆盖未接火的官方纪录。"
      : resultMeta.officialRecordUpdated
        ? "新的官方纪录已经写入这一格。下一目标是刷新分数，或升一档难度。"
        : "这一炉已计入官方成绩，但没有刷新当前纪录。";
    dom.victoryHomeButton.textContent = "回到整备";
    dom.victoryContinueButton.textContent = "以当前组合再守一次";
    dom.victoryKills.textContent = String(run.kills);
    dom.victoryEmbers.textContent = run.relayIntervened ? "接火通关" : resultMeta.officialRecordUpdated ? "新纪录" : "已核对";
    dom.victoryUnlocks.replaceChildren();
    run.classicNewAchievementIds.forEach(function renderNewAchievement(id) {
      const definition = Logic.ACHIEVEMENT_DEFS.find(function findAchievement(item) { return item.id === id; });
      if (!definition) return;
      const line = document.createElement("span");
      line.textContent = "新火印 · " + definition.name;
      dom.victoryUnlocks.appendChild(line);
    });
    run.classicNewBearerIds.forEach(function renderNewBearer(id) {
      const bearer = Logic.BEARER_DEFS[id];
      if (!bearer) return;
      const line = document.createElement("span");
      line.textContent = "新承火者 · " + bearer.name;
      dom.victoryUnlocks.appendChild(line);
    });
    if (dom.victoryReport) {
      const report = run.runReport || createRunReport("victory");
      const techniqueNames = report.techniqueHistory.map(function techniqueName(id) {
        const technique = Logic.getTechniqueById(id);
        return technique ? technique.name : id;
      });
      dom.victoryReport.textContent = run.bearer.name + " · " + run.loadout.name + " · " + run.danger.name + " · 成招 " +
        (techniqueNames.length ? techniqueNames.join("、") : "未成招") + " · 破法 " + report.bossBreakMethod;
    }
    dom.victoryOverlay.hidden = false;
  }

  function createRunReport(outcome) {
    return Logic.normalizeRunReport({
      seed: run.seed,
      completedWave: run.completedWave,
      outcome: outcome,
      doctrineId: run.doctrineId,
      coreId: run.coreId,
      contractSequence: run.contractHistory,
      techniqueHistory: run.forge.techniqueHistory.map(function techniqueId(entry) { return entry.techniqueId; }),
      storedCount: run.forge.storedCount,
      burnedCount: run.forge.burnedCount,
      bossBreakMethod: run.bossBreakMethod,
      relayIntervened: run.relayIntervened === true
    });
  }

  function startNormalRun() {
    selectedAnchorWave = 1;
    if (run) {
      run.ended = true;
      run.active = false;
      run.relayChoices = [];
    }
    hideAllOverlays();
    launchRun("classic", { quickStart: true });
  }

  function retryRun() {
    return launchRun("classic", { quickStart: true });
  }

  function continueAfterVictory() {
    if (!run || run.ended || !run.victoryBanked) return;
    startNormalRun();
  }

  function finishVictoryAtHome() {
    if (!run || !run.victoryBanked) return;
    run.ended = true;
    run.active = false;
    run.outcome = "victory";
    returnHome();
  }

  function describeDamageSource(source) {
    const labels = {
      swarm: "蜂群围杀",
      runner: "冲锋怪突进",
      artillery: "炮手远射",
      spitter: "焰射手弹幕",
      tidecaller: "引潮者齐射",
      switchGuard: "换火卫封锁",
      chaser: "追猎者近身",
      boss: "首领攻击",
      "boss-wave": "首领终焰光波",
      projectile: "远程弹幕",
      debug: "未知薪火"
    };
    return labels[source] || "前线围攻";
  }

  function selectRelayChoice(upgradeId) {
    if (!run || !run.ended || run.outcome !== "death" || run.selectedRelayUpgradeId) return false;
    const choice = run.relayChoices.find(function matchingRelay(candidate) { return candidate.id === upgradeId; });
    if (!choice) return false;
    const relayTargetWave = Math.min(run.wave, Logic.MAX_RELAY_TARGET_WAVE);
    const nextCoreSave = Logic.setPendingRelay(profile, upgradeId, relayTargetWave);
    replaceCoreSave(nextCoreSave);
    saveProfile();
    run.selectedRelayUpgradeId = upgradeId;
    selectedAnchorWave = Logic.getRelayAnchorWaves(profile.bestCompletedWave || 0, run.wave).slice(-1)[0];
    Array.from(dom.resultRelayList.querySelectorAll(".relay-choice")).forEach(function markRelayChoice(button) {
      const selected = button.dataset.upgradeId === upgradeId;
      button.classList.toggle("is-selected", selected);
      button.disabled = !selected;
      const state = button.querySelector("b");
      if (state) state.textContent = selected ? "已留种" : "";
    });
    dom.retryButton.disabled = false;
    dom.returnHomeButton.disabled = false;
    dom.retryButton.textContent = "携「" + choice.name + "」挑战 W" + relayTargetWave;
    updateAccountUi();
    return true;
  }

  function renderRelayChoices() {
    dom.resultRelayList.replaceChildren();
    dom.resultRelay.hidden = !run || run.relayChoices.length === 0;
    if (!run || !run.relayChoices.length) return;
    run.relayChoices.forEach(function renderRelayChoice(choice) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "relay-choice";
      button.dataset.upgradeId = choice.id;
      const icon = document.createElement("span");
      icon.textContent = upgradeIcons[choice.id] || "火";
      const copy = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = choice.name;
      const description = document.createElement("small");
      description.textContent = choice.description + " · " + (choice.chosenCount > 0
        ? "本局主动取得 ×" + choice.chosenCount
        : "本局主用武器基础薪种");
      copy.append(name, description);
      const state = document.createElement("b");
      state.textContent = "选择";
      button.append(icon, copy, state);
      button.addEventListener("click", function chooseRelaySeed() { selectRelayChoice(choice.id); });
      dom.resultRelayList.appendChild(button);
    });
    if (run.relayChoices.length === 1) selectRelayChoice(run.relayChoices[0].id);
    else {
      dom.retryButton.disabled = true;
      dom.returnHomeButton.disabled = false;
      dom.retryButton.textContent = "先选一枚薪种";
    }
  }

  function setResultMetricCaption(metric, caption) {
    if (!metric || !metric.parentElement) return;
    const label = metric.parentElement.querySelector("span");
    if (label) label.textContent = caption;
  }

  function endRun() {
    if (!run || run.mode !== "classic" || run.ended) return false;
    clearPursuitBatch("run-ended");
    run.ended = true;
    run.active = false;
    run.paused = true;
    run.outcome = "death";
    clearInput();
    updateRunUi();

    const highestWave = run.wave;
    const completedWave = run.completedWave;
    const metadata = {
      bestWave: Math.max(profile.bestWave || 0, highestWave),
      bestCompletedWave: Math.max(profile.bestCompletedWave || 0, completedWave),
      runs: (profile.runs || 0) + (run.runCounted ? 0 : 1),
      victories: profile.victories || 0,
      firstSettlementClaimed: true
    };
    profile = Object.assign({}, Logic.sanitizeSave(profile), metadata);
    const scoreCard = recordClassicOutcome();
    saveProfile();
    updateAccountUi();

    clearTimeout(toastTimer);
    dom.toast.hidden = true;
    run.relayChoices = Logic.createRelayChoices(
      run.seed + ":relay:" + highestWave,
      run.build.chosenUpgradeCounts,
      run.weaponUsage,
      run.build.activeRelayUpgradeId
    );
    run.selectedRelayUpgradeId = null;
    setResultMetricCaption(dom.resultWave, "抵达波次");
    setResultMetricCaption(dom.resultKills, "完成波次");
    setResultMetricCaption(dom.resultEmbers, "本轮得分");
    dom.resultScoreCard.hidden = false;
    dom.resultGrade.textContent = scoreCard.grade;
    dom.resultScore.textContent = formatNumber(scoreCard.total);
    dom.resultScoreNote.textContent = "推进 " + scoreCard.components.progress + " · 生存 " + scoreCard.components.survival + " · 战术 " + scoreCard.components.technique + "；已计入最佳尝试，未通关不写官方纪录。";
    dom.retryButton.disabled = run.relayChoices.length > 1;
    dom.returnHomeButton.disabled = false;
    dom.retryButton.textContent = run.relayChoices.length > 1 ? "先选一枚薪种" : "再开一炉";
    renderRelayChoices();

    dom.resultWave.textContent = String(highestWave);
    dom.resultKills.textContent = String(completedWave);
    dom.resultEmbers.textContent = formatNumber(scoreCard.total);
    dom.resultKicker.textContent = "本轮薪火已经熄灭";
    dom.resultTitle.textContent = "止步 W" + highestWave + "，但这一局留下了目标";
    const resultMeta = run.classicResultMeta || {};
    const bestAttempt = resultMeta.bestAttemptRecord || null;
    if (dom.resultRecordStatus) {
      dom.resultRecordStatus.classList.toggle("is-best", resultMeta.attemptRecordUpdated === true);
      dom.resultRecordStatus.textContent = resultMeta.attemptRecordUpdated
        ? "新个人最佳 · " + (run.relayIntervened ? "接火" : "净炉") + " W" + highestWave
        : "未破最佳 · 当前完成 W" + (bestAttempt ? bestAttempt.completedWaves : completedWave);
    }
    if (dom.resultTarget) dom.resultTarget.textContent = "下一局完成 W" + nextWaveTargetForAttempt(bestAttempt || { completedWaves: completedWave });
    if (dom.resultUnlocks) {
      dom.resultUnlocks.replaceChildren();
      const unlockLines = [];
      run.classicNewAchievementIds.forEach(function addAchievementUnlock(id) {
        const achievement = Logic.ACHIEVEMENT_DEFS.find(function findAchievement(item) { return item.id === id; });
        if (achievement) unlockLines.push("新火印 · " + achievement.name);
      });
      run.classicNewBearerIds.forEach(function addBearerUnlock(id) {
        const bearer = Logic.BEARER_DEFS[id];
        if (bearer) unlockLines.push("新承火者 · " + bearer.name);
      });
      unlockLines.slice(0, 2).forEach(function renderUnlockLine(copy) {
        const line = document.createElement("span");
        line.textContent = copy;
        dom.resultUnlocks.appendChild(line);
      });
      dom.resultUnlocks.hidden = dom.resultUnlocks.childElementCount === 0;
    }
    dom.resultNote.textContent = "主要死因：" + describeDamageSource(run.lastDamageSource) + "。薪种只作用于下一局；跨过目标波次后再加一层。";
    dom.resultOverlay.hidden = false;
    pulseVibration([30, 45, 70]);
  }

  function particleClassForKind(kind) {
    if (["boss", "boss-phase", "damage", "player-death"].includes(kind)) return "critical";
    if (["fusion", "backfire", "flash", "armor", "heavy-hit"].includes(kind)) return "heavy";
    if (["carbine", "ring", "shot", "trail"].includes(kind)) return "ambient";
    return "hit";
  }

  function evictParticleForCritical() {
    if (!run || !run.particles.length) return false;
    const order = ["ambient", "hit", "heavy"];
    let index = -1;
    for (let classIndex = 0; classIndex < order.length && index < 0; classIndex += 1) {
      index = run.particles.findIndex(function evictableParticle(particle) { return particle.feedbackClass === order[classIndex]; });
    }
    if (index < 0) return false;
    const evicted = run.particles.splice(index, 1)[0];
    incrementDiagnostic(feedbackDiagnostics.evictedByClass, evicted.feedbackClass || "hit");
    if (evicted.feedbackClass === "critical") feedbackDiagnostics.criticalEvicted += 1;
    return true;
  }

  function createParticles(x, y, kind, count, options) {
    if (!run) return 0;
    const settings = options && typeof options === "object" ? options : {};
    const feedbackClass = settings.feedbackClass || particleClassForKind(kind);
    const eventName = settings.eventName || kind;
    const eventId = settings.eventId || null;
    const colors = kind === "damage" ? ["#ff756b", "#ffd0c7"] :
      kind === "heal" ? ["#76d7a5", "#d8ffe9"] :
      kind === "fusion" ? ["#fffdf1", "#fff0a6", "#ffb24f", "#72e6f1"] :
      kind === "carbine" ? ["#fff0b8", "#ffd08a", "#ff9f43"] :
      kind === "ring" || kind === "ring-hit" ? ["#d9fcff", "#72e6f1", "#329eb5"] :
      kind === "heat" ? ["#fff0a6", "#72e6f1"] :
      kind === "backfire" ? ["#fff1a8", "#ffb24f", "#6fd6e7"] :
      kind === "flash" ? ["#c7f8ff", "#6fd6e7", "#ffcf8a"] :
      kind === "armor" ? ["#effff9", "#9bd7c8", "#ffbd69"] :
      kind === "boss-phase" ? ["#fffdf1", "#ff8a60", "#ffd578"] :
      kind === "heavy-hit" ? ["#fff8db", "#ffc56f", "#ff7f45"] :
      kind === "boss" ? ["#ff756b", "#ff9f43", "#ffd08a"] :
        kind === "shot" ? ["#ffd08a", "#ff9f43"] :
          kind === "hit" ? ["#ffe3a9", "#ff9f43"] : ["#ff9f43", "#a85d40"];
    let spawned = 0;
    for (let index = 0; index < count; index += 1) {
      if (feedbackClass !== "critical" && run.particles.length >= SOFT_PARTICLE_LIMIT) {
        incrementDiagnostic(feedbackDiagnostics.droppedByClass, feedbackClass);
        incrementDiagnostic(feedbackDiagnostics.droppedByEvent, eventName);
        continue;
      }
      if (run.particles.length >= MAX_PARTICLES && (feedbackClass !== "critical" || !evictParticleForCritical())) {
        incrementDiagnostic(feedbackDiagnostics.droppedByClass, feedbackClass);
        incrementDiagnostic(feedbackDiagnostics.droppedByEvent, eventName);
        continue;
      }
      const angle = visualRandom() * TAU;
      const speed = 18 + visualRandom() * (["boss", "boss-phase", "armor", "backfire", "flash", "fusion", "ring"].includes(kind) ? 150 : 65);
      const shape = ["armor", "boss", "boss-phase"].includes(kind) ? "shard" :
        ["damage", "heavy-hit", "hit", "ring-hit"].includes(kind) ? "line" : "dot";
      run.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + visualRandom() * 0.45,
        maxLife: 0.7,
        radius: 1 + visualRandom() * (["boss", "boss-phase", "armor"].includes(kind) ? 4 : 2.5),
        shape: shape,
        rotation: angle,
        spin: (visualRandom() - 0.5) * 8,
        color: colors[Math.floor(visualRandom() * colors.length)],
        feedbackClass: feedbackClass,
        feedbackEvent: eventName,
        eventId: eventId
      });
      spawned += 1;
    }
    incrementDiagnostic(feedbackDiagnostics.spawnedByClass, feedbackClass, spawned);
    incrementDiagnostic(feedbackDiagnostics.spawnedByEvent, eventName, spawned);
    feedbackDiagnostics.peakParticles = Math.max(feedbackDiagnostics.peakParticles, run.particles.length);
    return spawned;
  }

  function applyScreenShake(amount) {
    if (!run || reducedMotion || !Number.isFinite(amount) || amount <= 0) return false;
    run.screenShake = Math.max(run.screenShake, amount);
    feedbackDiagnostics.cameraShakeApplied += 1;
    return true;
  }

  function requestImpactStop(seconds) {
    if (!run || run.mode === "tutorial" || reducedMotion || seconds <= 0) return false;
    const now = performance.now() / 1000;
    // Simultaneous multi-hit attacks share one stop. Ordinary bullets never stop
    // the world; this preserves movement control under a dense barrage.
    if (now < nextImpactStopAt) return false;
    impactStopRemaining = Math.min(0.065, Math.max(impactStopRemaining, seconds));
    nextImpactStopAt = now + 0.22;
    impactStopsApplied += 1;
    impactStopSeconds += impactStopRemaining;
    return true;
  }

  function addImpactMark(enemy, damage, source, weaponId, lethal) {
    const now = performance.now() / 1000;
    const deliberate = ["flash", "draw", "ring-draw", "fusion", "return-fire", "hearth-seed"].includes(source);
    const elite = ["boss", "artillery", "switchGuard", "tidecaller"].includes(enemy.kind);
    const angle = Math.atan2(enemy.y - run.player.y, enemy.x - run.player.x);
    enemyImpactStates.set(enemy.id, { at: now, angle: angle, strength: deliberate ? 1 : 0.55 });
    impactMarks = impactMarks.filter(function aliveMark(mark) { return now - mark.at < mark.duration; });
    if (impactMarks.length >= 28) impactMarks.shift();
    impactMarks.push({
      x: enemy.x, y: enemy.y, at: now, angle: angle,
      color: weaponId ? getWeaponDefinition(weaponId).color : "#ffe6b5",
      duration: deliberate || lethal ? 0.28 : 0.15,
      strong: deliberate, lethal: lethal, size: enemy.radius,
      // Damage numbers announce a deliberate blow, rather than a permanent fog.
      label: deliberate && damage >= 12 ? String(Math.round(damage)) : null
    });
    if (lethal && elite) requestImpactStop(enemy.kind === "boss" ? 0.065 : 0.038);
    else if (deliberate) requestImpactStop(0.024);
  }

  function drawImpactMarks() {
    const now = performance.now() / 1000;
    enemyImpactStates.forEach(function expireImpact(state, id) { if (now - state.at > 0.15) enemyImpactStates.delete(id); });
    impactMarks = impactMarks.filter(function aliveMark(mark) { return now - mark.at < mark.duration; });
    impactMarks.forEach(function drawImpact(mark) {
      const progress = clamp((now - mark.at) / mark.duration, 0, 1);
      context.save();
      context.translate(mark.x, mark.y);
      context.globalAlpha = Math.pow(1 - progress, 1.5);
      context.rotate(mark.angle);
      const length = (mark.strong ? 16 : 9) * (0.7 + progress);
      context.strokeStyle = "#fff9e9";
      context.lineWidth = mark.strong ? 2.4 : 1.4;
      context.beginPath();
      context.moveTo(-length * 0.6, -length * 0.55);
      context.lineTo(length * 0.6, length * 0.55);
      context.moveTo(-length * 0.4, length * 0.65);
      context.lineTo(length * 0.4, -length * 0.65);
      context.stroke();
      if (mark.strong || mark.lethal) {
        context.strokeStyle = mark.color;
        context.lineWidth = 1.3;
        context.beginPath();
        const radius = mark.size + 3 + progress * 15;
        context.arc(0, 0, radius, -0.65, 0.65);
        context.arc(0, 0, radius * 0.82, Math.PI - 0.55, Math.PI + 0.55);
        context.stroke();
      }
      context.restore();
      if (mark.label) {
        context.save();
        context.globalAlpha = Math.pow(1 - progress, 1.2);
        context.font = "600 11px Georgia, serif";
        context.textAlign = "center";
        context.lineWidth = 3;
        context.strokeStyle = "#111e1a";
        context.fillStyle = "#fff0ce";
        const labelY = mark.y - mark.size - 10 - progress * 15;
        context.strokeText(mark.label, mark.x, labelY);
        context.fillText(mark.label, mark.x, labelY);
        context.restore();
      }
    });
  }

  function emitCombatFeedback(eventName, payload) {
    if (!run) return false;
    const settings = payload && typeof payload === "object" ? payload : {};
    const eventId = typeof settings.causeId === "string" ? settings.causeId : eventName + ":" + nextFeedbackId++;
    feedbackDiagnostics.recent.push({ event: eventName, eventId: eventId, at: run.elapsed, wave: run.wave });
    if (feedbackDiagnostics.recent.length > 64) feedbackDiagnostics.recent.shift();
    if (eventName === "weapon-cycle") {
      return requestAudioEvent("weapon-cycle", { variant: settings.variant, causeId: eventId });
    }
    if (eventName === "normal-impact") {
      createParticles(settings.x, settings.y, settings.kind || "hit", 3, { feedbackClass: "hit", eventName: eventName, eventId: eventId });
      requestAudioEvent("impact-hit", { causeId: eventId });
      return true;
    }
    if (eventName === "heavy-impact") {
      createParticles(settings.x, settings.y, settings.kind || "heavy-hit", 5, { feedbackClass: "heavy", eventName: eventName, eventId: eventId });
      applyScreenShake(0.035);
      if (!settings.silent) requestAudioEvent("heavy-impact", { causeId: eventId, strength: settings.strength || 1 });
      return true;
    }
    if (eventName === "enemy-defeat") {
      createParticles(settings.x, settings.y, "death", 6, { feedbackClass: "hit", eventName: eventName, eventId: eventId });
      return true;
    }
    if (eventName === "elite-defeat") {
      createParticles(settings.x, settings.y, "death", 6, { feedbackClass: "hit", eventName: eventName, eventId: eventId });
      requestAudioEvent("elite-defeat", { causeId: eventId });
      return true;
    }
    if (eventName === "elite-break") {
      createParticles(settings.x, settings.y, "armor", Math.min(10, settings.count || 10), { feedbackClass: "heavy", eventName: eventName, eventId: eventId });
      requestAudioEvent("elite-break", { causeId: eventId, strength: settings.strength || 1 });
      return true;
    }
    if (eventName === "player-hurt" || eventName === "player-death") {
      createParticles(settings.x, settings.y, eventName === "player-death" ? "player-death" : "damage", 8, {
        feedbackClass: "critical", eventName: eventName, eventId: eventId
      });
      applyScreenShake(eventName === "player-death" ? 0.24 : 0.17);
      requestAudioEvent(eventName, { causeId: eventId });
      return true;
    }
    if (eventName === "flash-complete") {
      const backfire = settings.variant === "backfire";
      createParticles(settings.x, settings.y, backfire ? "backfire" : "flash", backfire ? 20 : 12, {
        feedbackClass: "heavy", eventName: eventName, eventId: eventId
      });
      applyScreenShake(backfire ? 0.16 : 0.08);
      requestAudioEvent("flash-complete", { variant: backfire ? "backfire" : "normal", causeId: eventId, strength: backfire ? 1.05 : 0.85 });
      return true;
    }
    if (eventName === "boss-enter" || eventName === "boss-windup") {
      requestAudioEvent(eventName, { causeId: eventId });
      return true;
    }
    if (eventName === "boss-phase" || eventName === "boss-defeat") {
      createParticles(settings.x, settings.y, eventName === "boss-phase" ? "boss-phase" : "boss", 24, {
        feedbackClass: "critical", eventName: eventName, eventId: eventId
      });
      applyScreenShake(eventName === "boss-phase" ? 0.20 : 0.42);
      requestAudioEvent(eventName, { causeId: eventId, strength: eventName === "boss-defeat" ? 1.2 : 1 });
      return true;
    }
    if (eventName === "wave-clear") {
      requestAudioEvent("wave-clear", { causeId: eventId, delay: 0.10, wave: settings.wave, strength: settings.strength || 1 });
      return true;
    }
    if (eventName === "relay-ignite") {
      requestAudioEvent("relay-ignite", { causeId: eventId });
      return true;
    }
    return false;
  }

  function enemySilhouetteId(enemyOrKind, bossMode) {
    const kind = typeof enemyOrKind === "string" ? enemyOrKind : enemyOrKind && enemyOrKind.kind;
    const resolvedBossMode = bossMode || (enemyOrKind && enemyOrKind.bossMode);
    if (kind === "boss") return resolvedBossMode === "ash-ram" ? "ash-ram-wedge" : "boss-core-" + (resolvedBossMode || "unknown");
    const ids = {
      chaser: "chaser-cut-coal",
      runner: "runner-direction-diamond",
      swarm: "swarm-direction-dart",
      spitter: "spitter-pear-mouth",
      artillery: "artillery-hex-cannon",
      switchGuard: "switch-guard-shield",
      tidecaller: "tidecaller-double-leaf"
    };
    return ids[kind] || "unknown";
  }

  function getAudioDiagnosticsSnapshot() {
    const activeByLayer = activeVoicesByLayer();
    return {
      schema: "c13-crisp-fire-audio-v3",
      palette: "crisp-fire-v3",
      graphTopology: {
        initialized: Boolean(audioGraph),
        routes: ["S>master", "A>master", "B>master", "master>compressor", "compressor>destination"]
      },
      mix: {
        layerBaseGains: Object.assign({}, AUDIO_LAYER_BASE_GAINS),
        masterGain: 0.50,
        compressor: { threshold: -9, knee: 8, ratio: 3, attack: 0.010, release: 0.14 }
      },
      music: getMusicDiagnosticsSnapshot(),
      contextState: audioContext ? audioContext.state : "uninitialized",
      muted: soundMuted,
      activeVoices: activeAudioVoices.size,
      activeByLayer: activeByLayer,
      peakVoices: audioDiagnostics.peakVoices,
      peakByLayer: Object.assign({}, audioDiagnostics.peakByLayer),
      requestedByEvent: Object.assign({}, audioDiagnostics.requestedByEvent),
      startedByEvent: Object.assign({}, audioDiagnostics.startedByEvent),
      droppedByEvent: Object.assign({}, audioDiagnostics.droppedByEvent),
      requestedByLayer: Object.assign({}, audioDiagnostics.requestedByLayer),
      startedByLayer: Object.assign({}, audioDiagnostics.startedByLayer),
      droppedByLayer: Object.assign({}, audioDiagnostics.droppedByLayer),
      droppedByReason: Object.assign({}, audioDiagnostics.droppedByReason),
      voiceSteals: audioDiagnostics.voiceSteals,
      directDestinationConnections: audioDiagnostics.directDestinationConnections,
      waveClearStartsByWave: Object.assign({}, audioDiagnostics.waveClearStartsByWave),
      queueDepth: 0,
      limits: { total: AUDIO_TOTAL_VOICE_LIMIT, reservedS: 2, S: 2, A: 3, B: 3, weaponCyclesPerSecond: 4, heavyImpactsPerSecond: 4 },
      ducking: { sToB: 0.355, sToBWithinMs: 10, recoveryMs: 240, bossWindupToA: 0.631 },
      recent: audioDiagnostics.recent.map(function cloneAudioEvent(entry) { return Object.assign({}, entry); })
    };
  }

  function getFeedbackDiagnosticsSnapshot() {
    const activeByClass = { ambient: 0, hit: 0, heavy: 0, critical: 0 };
    if (run) run.particles.forEach(function countParticle(particle) {
      const feedbackClass = particle.feedbackClass || "hit";
      activeByClass[feedbackClass] = (activeByClass[feedbackClass] || 0) + 1;
    });
    return {
      schema: "vs01-g6-feedback-v1",
      activeParticles: run ? run.particles.length : 0,
      activeByClass: activeByClass,
      peakParticles: feedbackDiagnostics.peakParticles,
      softLimit: SOFT_PARTICLE_LIMIT,
      hardLimit: MAX_PARTICLES,
      spawnedByClass: Object.assign({}, feedbackDiagnostics.spawnedByClass),
      spawnedByEvent: Object.assign({}, feedbackDiagnostics.spawnedByEvent),
      droppedByClass: Object.assign({}, feedbackDiagnostics.droppedByClass),
      droppedByEvent: Object.assign({}, feedbackDiagnostics.droppedByEvent),
      evictedByClass: Object.assign({}, feedbackDiagnostics.evictedByClass),
      criticalEvicted: feedbackDiagnostics.criticalEvicted,
      cameraShakeApplied: feedbackDiagnostics.cameraShakeApplied,
      hitFeel: { schema: "reforged-impact-v1", stopsApplied: impactStopsApplied, stopSeconds: impactStopSeconds,
        stopRemaining: impactStopRemaining, activeMarks: impactMarks.length, maxMarks: 28, cooldown: 0.22,
        maximumStop: 0.065, reducedMotionDisablesStop: true, collisionRecoil: false },
      playerMinimumRenderedAlpha: feedbackDiagnostics.playerMinimumRenderedAlpha,
      reducedMotion: reducedMotion,
      continuousDecorativeMotion: !reducedMotion,
      movementTrailEnabled: !reducedMotion,
      trailParticlesSpawned: feedbackDiagnostics.trailParticlesSpawned,
      silhouettes: {
        enemies: run ? run.enemies.filter(function livingEnemy(enemy) { return !enemy.dead; }).map(function enemyShape(enemy) {
          return { id: enemy.id, kind: enemy.kind, silhouetteId: enemySilhouetteId(enemy) };
        }) : [],
        catalog: {
          chaser: enemySilhouetteId("chaser"),
          runner: enemySilhouetteId("runner"),
          swarm: enemySilhouetteId("swarm"),
          spitter: enemySilhouetteId("spitter"),
          artillery: enemySilhouetteId("artillery"),
          switchGuard: enemySilhouetteId("switchGuard"),
          tidecaller: enemySilhouetteId("tidecaller"),
          ashRam: enemySilhouetteId("boss", "ash-ram")
        },
        pickups: { xp: "xp-three-leaf", sharp: "sharp-v-spear", tide: "tide-double-crescent" },
        projectiles: { artillery: "artillery-hex-core", spitter: "spitter-hollow-diamond", tidecaller: "tide-double-seed" }
      },
      recent: feedbackDiagnostics.recent.map(function cloneFeedbackEvent(entry) { return Object.assign({}, entry); })
    };
  }

  function updateParticles(delta) {
    run.particles.forEach(function moveParticle(particle) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= Math.pow(0.03, delta);
      particle.vy *= Math.pow(0.03, delta);
      particle.rotation += particle.spin * delta;
      particle.life -= delta;
    });
    run.particles = run.particles.filter(function keep(particle) { return particle.life > 0; });
    run.afterimages.forEach(function fadeAfterimage(effect) { effect.life -= delta; });
    run.afterimages = run.afterimages.filter(function keepAfterimage(effect) { return effect.life > 0; });
    run.shockwaves.forEach(function expandShockwave(effect) { effect.life -= delta; });
    run.shockwaves = run.shockwaves.filter(function keepShockwave(effect) { return effect.life > 0; });
    run.callouts.forEach(function floatCallout(callout) {
      callout.life -= delta;
      callout.y -= 20 * delta;
    });
    run.callouts = run.callouts.filter(function keepCallout(callout) { return callout.life > 0; });
    run.screenShake = reducedMotion ? 0 : Math.max(0, run.screenShake - delta * 2.6);
  }

  function updateRunUi() {
    if (!run) return;
    const player = run.player;
    if (dom.pauseTitle) dom.pauseTitle.textContent = run.mode === "tutorial" ? "试火暂停" : "游戏已暂停";
    if (dom.quitRunButton) dom.quitRunButton.textContent = run.mode === "tutorial" ? "退出试火" : "放弃本局";
    dom.waveCaption.textContent = "波次";
    dom.waveLabel.textContent = String(run.wave);
    dom.levelLabel.textContent = String(run.level);
    dom.killsLabel.textContent = String(run.kills);
    dom.timeScaleButton.textContent = run.timeScale + "×";
    dom.timeScaleButton.disabled = run.mode === "tutorial";
    dom.timeScaleButton.classList.toggle("is-active", run.timeScale === 2);
    dom.timeScaleButton.setAttribute("aria-label", "当前 " + run.timeScale + " 倍速，点击切换为 " + (run.timeScale === 1 ? 2 : 1) + " 倍速");
    const flashReady = run.flashCooldown <= 0;
    const pursuitArmed = Boolean(run.pursuitBatch && run.pursuitBatch.state === "armed" && run.pursuitBatch.markedOwnerIds.length > 0);
    const flashProgress = flashReady ? 1 : 1 - run.flashCooldown / Logic.ACTIVE_ABILITY.cooldown;
    dom.flashButton.classList.toggle("is-ready", flashReady);
    dom.flashButton.classList.remove("is-pursuit");
    dom.flashButton.classList.remove("is-recharging");
    dom.flashButton.style.setProperty("--cooldown-angle", Math.round(clamp(flashProgress, 0, 1) * 360) + "deg");
    dom.flashGlyph.textContent = "闪";
    dom.flashCooldown.textContent = flashReady ? "就绪" : run.flashCooldown.toFixed(1);
    dom.flashButton.setAttribute("aria-label", flashReady ? "薪火爆闪已就绪" : "薪火爆闪冷却 " + run.flashCooldown.toFixed(1) + " 秒");
    const inactiveWeaponId = getInactiveWeaponId();
    const inactiveWeapon = getWeaponDefinition(inactiveWeaponId);
    const inactiveHeat = clamp(run.weaponHeat[inactiveWeaponId] || 0, 0, 1);
    const switchAvailable = run.switchLock <= 0;
    dom.switchButton.classList.toggle("is-ready", switchAvailable && (inactiveHeat >= 0.995 || pursuitArmed));
    dom.switchButton.classList.toggle("is-fusion", pursuitArmed);
    dom.switchButton.classList.toggle("is-recharging", run.heatPulse > 0);
    dom.switchButton.style.setProperty("--heat-angle", Math.round(inactiveHeat * 360) + "deg");
    dom.switchGlyph.textContent = inactiveWeapon.shortName;
    dom.switchLabel.textContent = pursuitArmed ? "合焰" : inactiveHeat >= 0.995 ? "满热" : Math.round(inactiveHeat * 100) + "%";
    dom.switchButton.setAttribute("aria-label", !switchAvailable
      ? "换火短暂锁定"
      : pursuitArmed
        ? "换为" + inactiveWeapon.name + "并追击熔印完成合焰"
        : "换为" + inactiveWeapon.name + (inactiveHeat >= 0.995 ? "，满热技已就绪" : "，炉热 " + Math.round(inactiveHeat * 100) + "%"));
    const equippedWeaponIds = getEquippedWeaponIds();
    const weaponSlotBindings = [
      { slot: dom.carbineSlot, name: dom.carbineName, heat: dom.carbineHeat, weaponId: equippedWeaponIds[0] },
      { slot: dom.ringSlot, name: dom.ringName, heat: dom.ringHeat, weaponId: equippedWeaponIds[1] }
    ];
    weaponSlotBindings.forEach(function updateWeaponSlot(binding) {
      const weapon = getWeaponDefinition(binding.weaponId);
      const level = getWeaponLevel(binding.weaponId);
      binding.slot.dataset.weapon = binding.weaponId;
      binding.slot.style.setProperty("--weapon-color", weapon.color);
      binding.slot.classList.toggle("is-active", run.activeWeaponId === binding.weaponId);
      binding.slot.classList.toggle("is-charged", (run.weaponHeat[binding.weaponId] || 0) >= 0.995);
      const glyph = binding.slot.querySelector("span");
      if (glyph) glyph.textContent = weapon.shortName;
      binding.name.textContent = weapon.name + " Lv." + level;
      binding.heat.style.width = Math.round(clamp(run.weaponHeat[binding.weaponId] || 0, 0, 1) * 100) + "%";
    });
    if (dom.fireSlots) {
      dom.fireSlots.textContent = run.forge.slots.length
        ? run.forge.slots.map(function fireSlot(traitId) { return Logic.FIRE_TRAITS[traitId].icon; }).join(" ")
        : "◇ ◇ ◇";
      dom.fireSlots.setAttribute("aria-label", "火性槽：" + (run.forge.slots.length
        ? run.forge.slots.map(function fireSlotName(traitId) { return Logic.FIRE_TRAITS[traitId].name; }).join("、")
        : "空"));
    }
    if (dom.fireCore) {
      const pendingTrait = run.forge.pendingCoreTraitId ? Logic.FIRE_TRAITS[run.forge.pendingCoreTraitId] : null;
      dom.fireCore.textContent = pendingTrait ? pendingTrait.name + "核" : "炉核待炼";
      dom.fireCore.classList.toggle("is-ready", Boolean(pendingTrait));
    }
    if (dom.fireTechnique) {
      const technique = run.forge.currentTechniqueId ? Logic.getTechniqueById(run.forge.currentTechniqueId) : null;
      dom.fireTechnique.textContent = technique
        ? technique.name + (run.forge.eye ? " · 招眼待接" : " · 待生眼")
        : "尚未成招";
      dom.fireTechnique.classList.toggle("is-eye", Boolean(run.forge.eye));
    }
    const relayUpgrade = getUpgradeDefinition(run.build.activeRelayUpgradeId);
    dom.relayChip.hidden = !relayUpgrade;
    if (relayUpgrade) {
      dom.relayLabel.textContent = run.build.relayCompleted
        ? relayUpgrade.name + " · 已接火"
        : "W" + String(run.build.activeRelayTargetWave).padStart(2, "0") + " · " + relayUpgrade.name;
      dom.relayChip.classList.toggle("is-complete", run.build.relayCompleted);
    } else dom.relayChip.classList.remove("is-complete");
    const equippedCore = run.coreId ? Logic.getCoreEquipment(run.coreId) : null;
    dom.coreChip.textContent = equippedWeaponIds.map(function weaponLevelLabel(weaponId) {
      const weapon = getWeaponDefinition(weaponId);
      return weapon.shortName + " Lv." + getWeaponLevel(weaponId);
    }).join(" + ") + (equippedCore ? " / " + equippedCore.name + " Lv." + run.coreLevel : " / W5 选炉心");
    const healthRatio = clamp(player.health / Math.max(1, player.maxHealth), 0, 1);
    dom.healthFill.style.width = healthRatio * 100 + "%";
    dom.healthLabel.textContent = Math.ceil(player.health) + " / " + Math.ceil(player.maxHealth);
    const xpRatio = clamp(run.xp / Math.max(1, run.xpNeeded), 0, 1);
    dom.xpFill.style.width = xpRatio * 100 + "%";
    dom.xpLabel.textContent = (Math.floor(run.xp * 10) / 10) + " / " + run.xpNeeded;
    const contract = run.contract;
    const stage = Math.min(3, Logic.getStageNumber(run.wave));
    const stageStart = (stage - 1) * 5 + 1;
    dom.contractLabel.classList.remove("is-danger");
    dom.stageLabel.textContent = "炉温 " + stage + "/3 · W" + stageStart + "—" + (stageStart + 4);
    if (!contract) dom.contractLabel.textContent = run.quickStart
      ? "难度 " + run.danger.name + " · 自动攻击 · 自动换火" + (run.autoSwitch ? "开" : "关")
      : "等待选择战术契约";
    else if (contract.id === "still-hunt") {
      if (run.flashHuntWindow > 0) {
        dom.contractLabel.textContent = "疾猎令 · 爆闪疾射 " + run.flashHuntWindow.toFixed(1) + "s";
      } else if (run.stationaryTime < contract.stationaryChargeSeconds) {
        dom.contractLabel.textContent = "疾猎令 · 蓄势 " + Math.round(clamp(run.stationaryTime / contract.stationaryChargeSeconds, 0, 1) * 100) + "%";
      } else if (run.stationaryTime <= contract.stationaryOverheatSeconds) {
        dom.contractLabel.textContent = "疾猎令 · 爆发窗口 " + Math.max(0, contract.stationaryOverheatSeconds - run.stationaryTime).toFixed(1) + "s";
      } else {
        dom.contractLabel.textContent = "疾猎令 · 已过热，移动以重置";
        dom.contractLabel.classList.add("is-danger");
      }
    } else if (contract.id === "lone-edge" && run.flashEmpoweredShots > 0) {
      dom.contractLabel.textContent = "孤锋令 · 回火强化剩余 " + run.flashEmpoweredShots + " 发";
    } else dom.contractLabel.textContent = contract.name + " · " + contract.shortDescription;
    const temporaryDamage = run.flashEmpoweredShots > 0 ? Logic.ACTIVE_ABILITY.edgeDamageMultiplier : 1;
    const activeWeapon = getWeaponDefinition(run.activeWeaponId);
    const weaponDamageMultiplier = getWeaponTechniqueFamily(run.activeWeaponId) === "carbine" ? run.build.carbineDamageMultiplier : run.build.ringDamageMultiplier;
    const damage = getBaseCombatDamage() * activeWeapon.damageMultiplier * weaponDamageMultiplier * temporaryDamage;
    dom.damageStat.textContent = activeWeapon.shortName + "伤 " + formatNumber(damage);
    dom.speedStat.textContent = "移速 " + Math.round(run.build.moveSpeedMultiplier * 100) + "%";
    const stationaryBoost = run.flashHuntWindow > 0 && contract && contract.id === "still-hunt"
      ? contract.stationaryAttackSpeedMultiplier
      : Logic.getContractAttackSpeedMultiplier(contract ? contract.id : null, run.stationaryTime);
    const swapBoost = run.swapHasteWindow > 0 ? run.build.swapAttackSpeedMultiplier : 1;
    dom.fireRateStat.textContent = "射速 " + (run.build.attackSpeedMultiplier * stationaryBoost * swapBoost / getWeaponInterval(run.activeWeaponId)).toFixed(1) + "/s";
    const boss = run.bossId === null ? null : run.enemies.find(function findBoss(enemy) { return enemy.id === run.bossId; });
    if (boss) {
      dom.bossBar.hidden = false;
      const bossStatus = boss.bossMode === "ash-ram" && boss.vulnerableTimer > 0
        ? " · 破势"
        : boss.bossPhase === 2
          ? boss.bossMode === "ash-ram" ? " · 狂奔相" : boss.bossMode === "cinder-weaver" ? " · 逆织相" : boss.bossMode === "fire-keeper" ? " · 换势相" : " · 终焰相"
          : "";
      dom.bossName.textContent = (boss.bossName || "首领") + bossStatus;
      dom.bossFill.style.width = clamp(boss.health / boss.maxHealth, 0, 1) * 100 + "%";
      dom.bossPhaseMark.hidden = !boss.bossPhaseThreshold;
    } else {
      dom.bossBar.hidden = true;
    }
    if (run.mode === "tutorial" && run.tutorial) {
      const stepIndex = TUTORIAL_STEP_ORDER.includes(run.tutorial.step) ? TUTORIAL_STEP_ORDER.indexOf(run.tutorial.step) : TUTORIAL_STEP_ORDER.length - 1;
      const tutorialCopy = tutorialCopyFor(run.tutorial.step);
      dom.waveCaption.textContent = "试火";
      dom.waveLabel.textContent = Math.min(TUTORIAL_STEP_ORDER.length, stepIndex + 1) + "/" + TUTORIAL_STEP_ORDER.length;
      dom.stageLabel.textContent = "新手试火 · 不计入纪录";
      dom.contractLabel.textContent = tutorialCopy.title;
      dom.contractLabel.classList.remove("is-danger");
      dom.coreChip.textContent = "教程成长 · 离场清空";
      dom.timeScaleButton.textContent = "1×";
      dom.timeScaleButton.classList.remove("is-active");
      dom.timeScaleButton.setAttribute("aria-label", "新手试火固定为1倍速");
      dom.bossBar.hidden = true;
      updateTutorialGuide();
    }
  }

  function drawHearthBackdrop(width, height) {
    const warmth = clamp((run.wave - 1) / Math.max(1, Logic.VICTORY_WAVE - 1), 0, 1);
    const stage = Math.min(2, Math.floor((run.wave - 1) / 5));
    const palettes = [
      ["#263b32", "#1b2d27", "#101c19"],
      ["#34392b", "#262e23", "#151e19"],
      ["#463829", "#302b22", "#191e19"]
    ];
    const palette = palettes[stage];
    const floor = context.createRadialGradient(width * 0.5, height * 0.48, 18, width * 0.5, height * 0.5, width * 0.68);
    floor.addColorStop(0, palette[0]);
    floor.addColorStop(0.58, palette[1]);
    floor.addColorStop(1, palette[2]);
    context.fillStyle = floor;
    context.fillRect(0, 0, width, height);
    context.save();
    // An old forge court: stone joints and fine brass inlay stay below threats.
    context.globalAlpha = 0.17;
    context.strokeStyle = "#7b8871";
    context.lineWidth = 0.6;
    for (let row = 0; row < 9; row += 1) {
      const y = row * 43;
      context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
      for (let col = -1; col < 12; col += 1) {
        const x = col * 79 + (row % 2) * 39;
        context.beginPath(); context.moveTo(x, y); context.lineTo(x + 8, y + 43); context.stroke();
      }
    }
    context.globalAlpha = 0.12 + warmth * 0.035;
    context.strokeStyle = stage === 0 ? "#b0b793" : "#c9a66c";
    context.lineWidth = 1.1;
    for (let ring = 0; ring < 4; ring += 1) {
      context.beginPath();
      context.ellipse(width / 2, height / 2, 86 + ring * 76, 38 + ring * 33, 0, 0, TAU);
      context.stroke();
    }
    context.globalAlpha = 0.08;
    context.setLineDash([10, 18]);
    for (let ray = 0; ray < 12; ray += 1) {
      const angle = ray / 12 * TAU;
      context.beginPath();
      context.moveTo(width / 2 + Math.cos(angle) * 34, height / 2 + Math.sin(angle) * 16);
      context.lineTo(width / 2 + Math.cos(angle) * width * 0.72, height / 2 + Math.sin(angle) * height * 0.72);
      context.stroke();
    }
    context.setLineDash([]);
    const hearthGlow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 150 + warmth * 90);
    hearthGlow.addColorStop(0, "rgba(225, 166, 76, " + (0.08 + warmth * 0.07) + ")");
    hearthGlow.addColorStop(1, "rgba(255, 184, 108, 0)");
    context.fillStyle = hearthGlow;
    context.fillRect(0, 0, width, height);
    // Chipped stones only sit at the edge. Decoration never suggests a solid
    // obstacle inside the player's collision-free court.
    context.globalAlpha = 0.55;
    for (let index = 0; index < 12; index += 1) {
      const x = 14 + index * 66;
      const chip = (index * 17) % 6;
      [3, height - 12].forEach(function drawEdgeStone(y) {
        context.fillStyle = "#0c1714";
        context.fillRect(x, y, 48 + chip, 9);
        context.strokeStyle = "#405045";
        context.strokeRect(x, y, 48 + chip, 9);
      });
    }
    context.globalAlpha = 0.10;
    context.strokeStyle = "#d4aa66";
    context.lineWidth = 1;
    context.strokeRect(15, 15, width - 30, height - 30);
    const vignette = context.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, width * 0.65);
    vignette.addColorStop(0, "rgba(3,10,8,0)");
    vignette.addColorStop(1, "rgba(3,10,8,0.5)");
    context.globalAlpha = 1;
    context.fillStyle = vignette;
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  function draw() {
    const projection = arenaProjection;
    const width = ARENA_GEOMETRY.width;
    const height = ARENA_GEOMETRY.height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
    context.setTransform(projection.pixelRatio, 0, 0, projection.pixelRatio, 0, 0);
    context.fillStyle = "#101c19";
    context.fillRect(0, 0, projection.viewWidth, projection.viewHeight);
    if (!run) return;
    context.save();
    context.translate(projection.offsetX, projection.offsetY);
    context.scale(projection.scale, projection.scale);
    context.beginPath();
    context.rect(0, 0, width, height);
    context.clip();
    drawHearthBackdrop(width, height);
    const shake = reducedMotion ? 0 : run.screenShake * 18;
    const crossfireCorridors = collectCrossfireCorridors(width, height);
    context.save();
    if (shake > 0.01) context.translate(Math.sin(run.elapsed * 91) * shake, Math.cos(run.elapsed * 73) * shake * 0.75);
    drawArenaMotes(width, height);
    drawSafeLanes();
    drawCrossfireCorridorFill(crossfireCorridors);
    drawXpOrbs();
    drawFireDrops();
    drawWeaponEffects();
    drawAfterimages();
    drawParticles();
    drawCrossfireCorridorDetails(crossfireCorridors);
    drawBullets();
    drawBossWaves();
    drawEnemies();
    drawImpactMarks();
    drawTechniqueEye();
    drawShockwaves();
    drawPlayer();
    drawDestination();
    drawCallouts();
    context.restore();
    if (run.fusionFlash > 0) {
      context.fillStyle = "rgba(255, 244, 189, " + clamp(run.fusionFlash * 1.05, 0, 0.18) + ")";
      context.fillRect(0, 0, width, height);
    }
    if (run.player.hitFlash > 0) {
      context.fillStyle = "rgba(255, 75, 65, " + Math.min(0.18, run.player.hitFlash) + ")";
      context.fillRect(0, 0, width, height);
    }
    const healthRatio = run.player.health / Math.max(1, run.player.maxHealth);
    if (healthRatio < 0.35) {
      const danger = (0.35 - healthRatio) / 0.35;
      const vignette = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.28, width / 2, height / 2, Math.max(width, height) * 0.68);
      vignette.addColorStop(0, "rgba(100, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(143, 16, 20, " + (0.08 + danger * 0.12) + ")");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
    }
    context.restore();
  }

  function clipForwardRayToCanvas(originX, originY, directionX, directionY, width, height) {
    let minimum = 0;
    let maximum = Infinity;
    const slabs = [
      { origin: originX, direction: directionX, limit: width },
      { origin: originY, direction: directionY, limit: height }
    ];
    for (let index = 0; index < slabs.length; index += 1) {
      const slab = slabs[index];
      if (Math.abs(slab.direction) < 1e-8) {
        if (slab.origin < 0 || slab.origin > slab.limit) return null;
        continue;
      }
      const first = (0 - slab.origin) / slab.direction;
      const second = (slab.limit - slab.origin) / slab.direction;
      minimum = Math.max(minimum, Math.min(first, second));
      maximum = Math.min(maximum, Math.max(first, second));
      if (maximum < minimum) return null;
    }
    if (!Number.isFinite(maximum) || maximum <= minimum) return null;
    return {
      x0: originX + directionX * minimum,
      y0: originY + directionY * minimum,
      x1: originX + directionX * maximum,
      y1: originY + directionY * maximum
    };
  }

  function collectCrossfireCorridors(width, height) {
    const crossfire = run && run.crossfire;
    if (!crossfire || !["telegraph", "volley"].includes(crossfire.phase)) return [];
    const ids = crossfire.phase === "volley" ? crossfire.pendingShooterIds : crossfire.shooterIds;
    const remaining = crossfire.phase === "telegraph" ? Math.max(0, crossfire.phaseEndsAt - run.elapsed) : 0;
    const settle = crossfire.phase === "volley"
      ? 1
      : clamp((crossfire.spec.solidWarningDuration - remaining) / crossfire.spec.solidWarningDuration, 0, 1);
    const solid = crossfire.phase === "volley" || remaining <= crossfire.spec.solidWarningDuration + 1e-9;
    return ids.slice(0, crossfire.spec.maxShootersPerBeat).map(function corridorForShooter(id) {
      const enemy = findLivingEnemyById(id);
      if (!enemy || !Number.isFinite(enemy.lockedAimX) || !Number.isFinite(enemy.lockedAimY)) return null;
      const aimLength = Math.hypot(enemy.lockedAimX, enemy.lockedAimY);
      if (aimLength < 0.001) return null;
      const directionX = enemy.lockedAimX / aimLength;
      const directionY = enemy.lockedAimY / aimLength;
      const segment = clipForwardRayToCanvas(enemy.x, enemy.y, directionX, directionY, width, height);
      if (!segment) return null;
      return Object.assign(segment, {
        directionX: directionX,
        directionY: directionY,
        normalX: -directionY,
        normalY: directionX,
        halfWidth: 8 + run.player.radius,
        settle: settle,
        solid: solid
      });
    }).filter(Boolean);
  }

  function drawCrossfireCorridorFill(corridors) {
    if (!corridors.length) return;
    const settle = corridors[0].settle;
    context.save();
    context.beginPath();
    corridors.forEach(function addCorridor(corridor) {
      const offsetX = corridor.normalX * corridor.halfWidth;
      const offsetY = corridor.normalY * corridor.halfWidth;
      context.moveTo(corridor.x0 + offsetX, corridor.y0 + offsetY);
      context.lineTo(corridor.x1 + offsetX, corridor.y1 + offsetY);
      context.lineTo(corridor.x1 - offsetX, corridor.y1 - offsetY);
      context.lineTo(corridor.x0 - offsetX, corridor.y0 - offsetY);
      context.closePath();
    });
    context.fillStyle = "rgba(205, 64, 50, " + (0.07 + settle * 0.05) + ")";
    context.fill();
    context.restore();
  }

  function drawCrossfireCorridorDetails(corridors) {
    if (!corridors.length) return;
    context.save();
    context.lineCap = "butt";
    context.lineJoin = "miter";
    corridors.forEach(function drawCorridor(corridor) {
      const settle = corridor.settle;
      const offsetX = corridor.normalX * corridor.halfWidth;
      const offsetY = corridor.normalY * corridor.halfWidth;
      context.beginPath();
      context.moveTo(corridor.x0 + offsetX, corridor.y0 + offsetY);
      context.lineTo(corridor.x1 + offsetX, corridor.y1 + offsetY);
      context.moveTo(corridor.x0 - offsetX, corridor.y0 - offsetY);
      context.lineTo(corridor.x1 - offsetX, corridor.y1 - offsetY);
      context.setLineDash(corridor.solid ? [] : [10, 7]);
      context.strokeStyle = "rgba(255, 122, 102, " + (0.56 + settle * 0.34) + ")";
      context.lineWidth = 1.6 + settle;
      context.stroke();
      context.setLineDash([]);

      const length = Math.hypot(corridor.x1 - corridor.x0, corridor.y1 - corridor.y0);
      const arrowCount = length < 96 ? 1 : clamp(Math.floor(length / 140) + 1, 2, 3);
      context.beginPath();
      for (let index = 0; index < arrowCount; index += 1) {
        const ratio = arrowCount === 1 ? 0.5 : (index + 1) / (arrowCount + 1);
        const centerX = corridor.x0 + (corridor.x1 - corridor.x0) * ratio;
        const centerY = corridor.y0 + (corridor.y1 - corridor.y0) * ratio;
        const tipX = centerX + corridor.directionX * 6;
        const tipY = centerY + corridor.directionY * 6;
        const backX = centerX - corridor.directionX * 4;
        const backY = centerY - corridor.directionY * 4;
        context.moveTo(backX + corridor.normalX * 4.5, backY + corridor.normalY * 4.5);
        context.lineTo(tipX, tipY);
        context.lineTo(backX - corridor.normalX * 4.5, backY - corridor.normalY * 4.5);
      }
      context.strokeStyle = "rgba(255, 221, 177, " + (0.62 + settle * 0.34) + ")";
      context.lineWidth = 1.5 + settle * 0.6;
      context.stroke();
    });
    context.restore();
  }

  function drawArenaMotes(width, height) {
    context.save();
    const representativeSlice = run.wave <= 5;
    const count = representativeSlice ? (run.wave === 5 ? 8 : 6) : 10;
    const motionTime = reducedMotion ? 0 : run.elapsed;
    for (let index = 0; index < count; index += 1) {
      const x = (index * 71 + motionTime * (4 + index % 3) * 3) % (width + 30) - 15;
      const y = (index * 113 + Math.sin(motionTime * 0.4 + index) * 28 + height * 2) % height;
      context.globalAlpha = representativeSlice ? 0.045 + (index % 3) * 0.012 : 0.08 + (index % 4) * 0.018;
      context.beginPath();
      context.arc(x, y, 1 + index % 2, 0, TAU);
      context.fillStyle = representativeSlice ? (index % 2 ? "#857d72" : "#655f59") : index % 3 ? "#6fd6e7" : "#ffb567";
      context.fill();
    }
    context.restore();
  }

  function drawAfterimages() {
    run.afterimages.forEach(function drawAfterimage(effect) {
      context.globalAlpha = clamp(effect.life / effect.maxLife, 0, 1) * 0.34;
      context.save();
      context.translate(effect.x, effect.y);
      context.beginPath();
      if (effect.bearerId === "ridge-breaker") {
        context.moveTo(effect.radius + 7, 0);
        context.lineTo(-effect.radius, -effect.radius * 0.72);
        context.lineTo(-effect.radius * 0.45, 0);
        context.lineTo(-effect.radius, effect.radius * 0.72);
        context.closePath();
      } else if (effect.bearerId === "tide-warden") {
        context.arc(-effect.radius * 0.35, 0, effect.radius, -1.08, 1.08);
        context.arc(effect.radius * 0.35, 0, effect.radius, Math.PI - 1.08, Math.PI + 1.08);
      } else {
        context.arc(0, 0, effect.radius + 2, 0, TAU);
      }
      context.strokeStyle = effect.bearerId === "ridge-breaker" ? "#ffab69" : effect.bearerId === "tide-warden" ? "#9df6ff" : "#ffe0a0";
      context.lineWidth = 3;
      context.stroke();
      context.restore();
    });
    context.globalAlpha = 1;
  }

  function drawShockwaves() {
    run.shockwaves.forEach(function drawShockwave(effect) {
      const progress = reducedMotion ? 0.72 : 1 - effect.life / effect.maxLife;
      context.save();
      context.globalAlpha = clamp(effect.life / effect.maxLife, 0, 1) * 0.8;
      context.beginPath();
      context.arc(effect.x, effect.y, effect.radius * (0.2 + progress * 0.8), 0, TAU);
      context.strokeStyle = effect.color;
      context.lineWidth = 3 - progress * 2;
      context.stroke();
      context.restore();
    });
  }

  function drawBossWaves() {
    run.bossWaves.forEach(function drawBossWave(wave) {
      context.save();
      context.beginPath();
      context.arc(wave.x, wave.y, wave.radius, 0, TAU);
      context.strokeStyle = wave.color;
      context.globalAlpha = 0.24;
      context.lineWidth = wave.thickness + 8;
      context.shadowColor = wave.color;
      context.shadowBlur = 18;
      context.stroke();
      context.beginPath();
      context.arc(wave.x, wave.y, wave.radius, 0, TAU);
      context.globalAlpha = 0.86;
      context.lineWidth = 3;
      context.stroke();
      context.beginPath();
      context.arc(wave.x, wave.y, Math.max(0, wave.radius - wave.thickness / 2), 0, TAU);
      context.globalAlpha = 0.35;
      context.lineWidth = 1.5;
      context.stroke();
      context.restore();
    });
  }

  function drawCallouts() {
    run.callouts.forEach(function drawCallout(callout) {
      context.save();
      context.globalAlpha = clamp(callout.life / callout.maxLife, 0, 1);
      context.fillStyle = callout.color;
      context.font = "900 13px Inter, 'Microsoft YaHei', sans-serif";
      context.textAlign = "center";
      context.shadowColor = "rgba(0,0,0,.8)";
      context.shadowBlur = 6;
      context.fillText(callout.text, callout.x, callout.y);
      context.restore();
    });
  }

  function drawXpOrbs() {
    run.xpOrbs.forEach(function drawOrb(orb) {
      context.save();
      context.translate(orb.x, orb.y);
      context.fillStyle = "rgba(111, 221, 132, 0.16)";
      context.beginPath();
      context.arc(0, 0, orb.radius + 4, 0, TAU);
      context.fill();
      context.fillStyle = "#79df8c";
      for (let leaf = 0; leaf < 3; leaf += 1) {
        const angle = -Math.PI / 2 + leaf * TAU / 3;
        context.beginPath();
        context.ellipse(Math.cos(angle) * orb.radius * 0.58, Math.sin(angle) * orb.radius * 0.58, orb.radius * 0.62, orb.radius * 0.38, angle, 0, TAU);
        context.fill();
      }
      context.beginPath();
      context.arc(0, 0, Math.max(1, orb.radius * 0.28), 0, TAU);
      context.fillStyle = "#e8ffd9";
      context.fill();
      context.restore();
    });
  }

  function drawSafeLanes() {
    run.safeLanes.forEach(function drawLane(lane) {
      const alpha = clamp(lane.life / lane.maxLife, 0, 1);
      context.save();
      context.beginPath();
      context.moveTo(lane.startX, lane.startY);
      context.lineTo(lane.endX, lane.endY);
      context.strokeStyle = lane.color;
      context.globalAlpha = lane.kind === "searing" ? 0.10 + alpha * 0.22 : 0.08 + alpha * 0.16;
      context.lineWidth = lane.width * 2;
      context.lineCap = "round";
      context.shadowColor = lane.kind === "searing" ? "#ff6a38" : lane.color;
      context.shadowBlur = lane.kind === "searing" ? 14 : 0;
      context.stroke();
      context.shadowBlur = 0;
      context.globalAlpha = 0.35 + alpha * 0.4;
      context.lineWidth = lane.kind === "searing" ? 3 : 2;
      context.setLineDash(lane.kind === "searing" ? [3, 7] : [10, 8]);
      context.stroke();
      context.restore();
    });
  }

  function drawFireDrops() {
    run.fireDrops.forEach(function drawFireDrop(drop) {
      const trait = Logic.FIRE_TRAITS[drop.traitId];
      const pulse = reducedMotion ? 1 : 1 + Math.sin(run.elapsed * 6 + drop.id) * 0.12;
      context.save();
      context.translate(drop.x, drop.y);
      if (!reducedMotion) context.rotate(Math.sin(run.elapsed * 1.8 + drop.id) * 0.16);
      context.globalAlpha = clamp(drop.life / Math.min(drop.maxLife, 1.4), 0.18, 1);
      context.beginPath();
      if (drop.traitId === "sharp") {
        context.moveTo(drop.radius * 1.65 * pulse, 0);
        context.lineTo(-drop.radius * 0.2, -drop.radius * 0.62);
        context.lineTo(-drop.radius * 1.25, -drop.radius * 1.05);
        context.lineTo(-drop.radius * 0.72, 0);
        context.lineTo(-drop.radius * 1.25, drop.radius * 1.05);
        context.lineTo(-drop.radius * 0.2, drop.radius * 0.62);
        context.closePath();
      } else if (drop.traitId === "tide") {
        context.arc(-drop.radius * 0.34, 0, drop.radius * pulse, -1.08, 1.08);
        context.arc(drop.radius * 0.34, 0, drop.radius * pulse, Math.PI - 1.08, Math.PI + 1.08);
      } else {
        context.moveTo(0, -drop.radius * 1.45 * pulse);
        context.lineTo(drop.radius * pulse, 0);
        context.lineTo(0, drop.radius * 1.45 * pulse);
        context.lineTo(-drop.radius * pulse, 0);
        context.closePath();
      }
      context.fillStyle = trait.color;
      context.strokeStyle = trait.color;
      context.lineWidth = drop.refined ? 4 : 3;
      context.shadowColor = trait.color;
      context.shadowBlur = drop.refined ? 20 : 12;
      if (drop.traitId === "tide") context.stroke();
      else context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = "rgba(255,255,255,.78)";
      context.lineWidth = drop.refined ? 2 : 1;
      context.stroke();
      context.restore();
    });
  }

  function drawTechniqueEye() {
    const eye = run.forge.eye;
    if (!eye) return;
    const technique = Logic.getTechniqueById(eye.techniqueId);
    if (!technique) return;
    const target = eye.targetId === null ? null : findLivingEnemyById(eye.targetId);
    const x = target ? target.x : eye.x;
    const y = target ? target.y : eye.y;
    context.save();
    context.translate(x, y);
    context.rotate(reducedMotion ? 0 : run.elapsed * 1.2);
    const radius = reducedMotion ? 15 : 15 + Math.sin(run.elapsed * 7) * 2;
    context.beginPath();
    context.arc(0, 0, radius, 0, TAU);
    context.setLineDash([4, 5]);
    context.strokeStyle = technique.color;
    context.lineWidth = 2.5;
    context.shadowColor = technique.color;
    context.shadowBlur = 12;
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.moveTo(-7, 0);
    context.quadraticCurveTo(0, -5, 7, 0);
    context.quadraticCurveTo(0, 5, -7, 0);
    context.fillStyle = "rgba(255,255,255,.88)";
    context.fill();
    context.beginPath();
    context.arc(0, 0, 2.5, 0, TAU);
    context.fillStyle = technique.color;
    context.fill();
    context.restore();
  }

  function drawParticles() {
    run.particles.forEach(function drawParticle(particle) {
      context.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation || 0);
      context.fillStyle = particle.color;
      if (particle.shape === "line") {
        context.fillRect(-particle.radius * 3.4, -particle.radius * 0.45, particle.radius * 6.8, particle.radius * 0.9);
      } else if (particle.shape === "shard") {
        context.beginPath();
        context.moveTo(particle.radius * 2.8, 0);
        context.lineTo(-particle.radius, particle.radius * 0.9);
        context.lineTo(-particle.radius * 1.6, -particle.radius * 0.6);
        context.closePath();
        context.fill();
      } else {
        context.beginPath();
        context.arc(0, 0, particle.radius, 0, TAU);
        context.fill();
      }
      context.restore();
    });
    context.globalAlpha = 1;
  }

  function drawWeaponEffects() {
    run.weaponEffects.forEach(function drawWeaponEffect(effect) {
      context.save();
      context.translate(effect.x, effect.y);
      if (effect.kind === "warm-field") {
        const lifeRatio = clamp(effect.life / effect.maxLife, 0, 1);
        const pulse = reducedMotion ? 1 : 1 + Math.sin(run.elapsed * 5.2) * 0.05;
        const gradient = context.createRadialGradient(0, 0, 4, 0, 0, effect.radius * pulse);
        gradient.addColorStop(0, "rgba(255, 249, 222, " + (0.28 * lifeRatio) + ")");
        gradient.addColorStop(0.58, "rgba(244, 177, 126, " + (0.20 * lifeRatio) + ")");
        gradient.addColorStop(1, "rgba(239, 159, 120, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0, 0, effect.radius * pulse, 0, TAU);
        context.fill();
        context.setLineDash([5, 8]);
        context.strokeStyle = "rgba(250, 196, 151, " + (0.58 * lifeRatio) + ")";
        context.lineWidth = 1.8;
        context.stroke();
      } else if (effect.kind === "seed-petal") {
        const waitRatio = effect.detonated ? 0 : clamp(effect.delay / 0.28, 0, 1);
        context.rotate(run.elapsed * 1.8 + effect.id);
        for (let petal = 0; petal < 3; petal += 1) {
          context.rotate(TAU / 3);
          context.beginPath();
          context.ellipse(effect.radius * 0.22, 0, effect.radius * 0.26, effect.radius * 0.12, 0, 0, TAU);
          context.fillStyle = "rgba(244, 177, 138, " + (0.34 + (1 - waitRatio) * 0.42) + ")";
          context.fill();
        }
      }
      context.restore();
    });
  }

  function drawBullets() {
    const previewIds = new Set();
    if (run.flashCooldown <= 0 && !run.paused && !run.ended) {
      const previewPlan = getReturnFirePlan(getFlashSegment(flashDirection()));
      previewPlan.capturedBullets.forEach(function markPreview(bullet) { previewIds.add(bullet.id); });
    }
    run.playerBullets.forEach(function drawPlayerBullet(bullet) {
      const speed = Math.max(1, Math.hypot(bullet.vx, bullet.vy));
      if (bullet.projectileKind === "returned") {
        const target = findLivingEnemyById(bullet.targetId);
        if (target && bullet.linkLife > 0) {
          context.beginPath();
          context.moveTo(bullet.x, bullet.y);
          context.lineTo(target.x, target.y);
          context.strokeStyle = "rgba(255, 229, 150, " + Math.min(0.42, bullet.linkLife * 0.84) + ")";
          context.lineWidth = 1;
          context.stroke();
        }
        context.beginPath();
        context.moveTo(bullet.x - bullet.vx / speed * 20, bullet.y - bullet.vy / speed * 20);
        context.lineTo(bullet.x, bullet.y);
        context.strokeStyle = "rgba(255, 221, 117, 0.82)";
        context.lineWidth = 3.5;
        context.stroke();
        context.save();
        context.translate(bullet.x, bullet.y);
        context.rotate(Math.atan2(bullet.vy, bullet.vx));
        context.beginPath();
        context.moveTo(bullet.radius + 3, 0);
        context.lineTo(0, bullet.radius + 2);
        context.lineTo(-bullet.radius - 3, 0);
        context.lineTo(0, -bullet.radius - 2);
        context.closePath();
        context.fillStyle = "rgba(255, 177, 55, 0.96)";
        context.fill();
        context.strokeStyle = "#fff0ad";
        context.lineWidth = 1.6;
        context.stroke();
        context.beginPath();
        context.arc(0, 0, 1.8, 0, TAU);
        context.fillStyle = "#fffdf1";
        context.fill();
        context.restore();
        return;
      }
      if (bullet.delay > 0) {
        context.save();
        context.globalAlpha = 0.22 + (1 - clamp(bullet.delay / 0.16, 0, 1)) * 0.34;
        context.beginPath();
        context.arc(bullet.x, bullet.y, bullet.radius + 5, 0, TAU);
        context.strokeStyle = "#fff0a6";
        context.lineWidth = 1.5;
        context.stroke();
        context.restore();
        return;
      }
      if (bullet.projectileKind === "firefly" || bullet.projectileKind === "firefly-draw") {
        context.save();
        context.translate(bullet.x, bullet.y);
        context.rotate(Math.atan2(bullet.vy, bullet.vx));
        context.beginPath();
        context.moveTo(bullet.radius + 3, 0);
        context.quadraticCurveTo(-bullet.radius, bullet.radius, -bullet.radius * 1.6, 0);
        context.quadraticCurveTo(-bullet.radius, -bullet.radius, bullet.radius + 3, 0);
        context.fillStyle = bullet.projectileKind === "firefly-draw" ? "#fff6b9" : "#f6c86b";
        context.shadowColor = "#f6c86b";
        context.shadowBlur = bullet.projectileKind === "firefly-draw" ? 14 : 9;
        context.fill();
        context.restore();
        return;
      }
      if (bullet.projectileKind === "hearth-seed") {
        const fuseRatio = clamp(bullet.fuse / 0.5, 0, 1);
        context.save();
        context.translate(bullet.x, bullet.y);
        context.rotate(run.elapsed * 4 + bullet.id);
        context.beginPath();
        context.ellipse(0, 0, bullet.radius + 1, bullet.radius - 1, 0, 0, TAU);
        context.fillStyle = "#ef9f78";
        context.shadowColor = "#ffcc9e";
        context.shadowBlur = 10;
        context.fill();
        context.beginPath();
        context.arc(0, 0, bullet.radius + 4, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - fuseRatio));
        context.strokeStyle = "#fff2c7";
        context.lineWidth = 2;
        context.stroke();
        context.restore();
        return;
      }
      if (bullet.weaponId === "cinderRing") {
        context.save();
        context.translate(bullet.x, bullet.y);
        context.rotate(Math.atan2(bullet.vy, bullet.vx) + run.elapsed * 7);
        if (bullet.returning) {
          context.beginPath();
          context.moveTo(-bullet.radius - 12, 0);
          context.lineTo(-bullet.radius - 3, 0);
          context.strokeStyle = "rgba(255, 236, 166, 0.72)";
          context.lineWidth = 2.2;
          context.stroke();
        }
        context.beginPath();
        context.arc(0, 0, bullet.radius + 3, -Math.PI * 0.72, Math.PI * 0.72);
        context.strokeStyle = bullet.returning
          ? "rgba(255, 226, 139, 0.96)"
          : bullet.ringEvolutionId === "hunt" ? "rgba(135, 194, 255, 0.96)" : "rgba(114, 230, 241, 0.92)";
        context.lineWidth = bullet.ringEvolutionId === "hunt" ? 4.2 : 3.2;
        context.shadowColor = bullet.returning ? "#ffe28b" : bullet.ringEvolutionId === "hunt" ? "#7ebcff" : "#72e6f1";
        context.shadowBlur = bullet.ringEvolutionId === "hunt" ? 13 : 9;
        context.stroke();
        context.beginPath();
        context.arc(0, 0, 1.8, 0, TAU);
        context.fillStyle = "#ecfeff";
        context.fill();
        context.restore();
        return;
      }
      if (bullet.projectileKind === "carbine-rail" || bullet.projectileKind === "carbine-echo") {
        context.beginPath();
        context.moveTo(bullet.x - bullet.vx / speed * 34, bullet.y - bullet.vy / speed * 34);
        context.lineTo(bullet.x, bullet.y);
        context.strokeStyle = bullet.projectileKind === "carbine-echo" ? "rgba(255, 250, 218, .76)" : "rgba(255, 244, 190, .96)";
        context.lineWidth = bullet.projectileKind === "carbine-echo" ? 5 : 7;
        context.shadowColor = "#ffd06f";
        context.shadowBlur = 15;
        context.stroke();
        context.shadowBlur = 0;
      }
      if (bullet.projectileKind === "carbine-draw") {
        context.beginPath();
        context.moveTo(bullet.x - bullet.vx / speed * 30, bullet.y - bullet.vy / speed * 30);
        context.lineTo(bullet.x, bullet.y);
        context.strokeStyle = bullet.fusion ? "rgba(255, 250, 210, .98)" : "rgba(255, 224, 142, .94)";
        context.lineWidth = bullet.fusion ? 6 : 4.5;
        context.shadowColor = "#ffd06f";
        context.shadowBlur = 13;
        context.stroke();
        context.shadowBlur = 0;
      }
      context.beginPath();
      context.moveTo(bullet.x - bullet.vx / speed * 13, bullet.y - bullet.vy / speed * 13);
      context.lineTo(bullet.x, bullet.y);
      context.strokeStyle = "rgba(255, 208, 138, 0.62)";
      context.lineWidth = 2.5;
      context.stroke();
      context.beginPath();
      context.arc(bullet.x, bullet.y, bullet.radius + 3, 0, TAU);
      context.fillStyle = "rgba(255, 159, 67, 0.18)";
      context.fill();
      context.beginPath();
      context.arc(bullet.x, bullet.y, bullet.radius, 0, TAU);
      context.fillStyle = "#ffd08a";
      context.fill();
    });
    run.enemyBullets.forEach(function drawEnemyBullet(bullet) {
      const speed = Math.max(1, Math.hypot(bullet.vx, bullet.vy));
      const artilleryShot = bullet.ownerKind === "artillery";
      const spitterShot = ["spitter", "tidecaller"].includes(bullet.ownerKind);
      if (bullet.projectileKind === "crossfire-primary") {
        context.beginPath();
        context.moveTo(bullet.x - bullet.vx / speed * 9, bullet.y - bullet.vy / speed * 9);
        context.lineTo(bullet.x, bullet.y);
        context.strokeStyle = "rgba(255, 112, 82, .66)";
        context.lineWidth = 3.5;
        context.stroke();
        context.save();
        context.translate(bullet.x, bullet.y);
        context.rotate(Math.atan2(bullet.vy, bullet.vx));
        context.beginPath();
        context.moveTo(bullet.radius, 0);
        context.lineTo(-1, bullet.radius * 0.72);
        context.lineTo(-bullet.radius * 0.78, 0);
        context.lineTo(-1, -bullet.radius * 0.72);
        context.closePath();
        context.fillStyle = "#ff835f";
        context.fill();
        context.strokeStyle = "#ffe0b1";
        context.lineWidth = 1.4;
        context.stroke();
        context.restore();
      } else {
        context.beginPath();
        context.moveTo(bullet.x - bullet.vx / speed * 8, bullet.y - bullet.vy / speed * 8);
        context.lineTo(bullet.x, bullet.y);
        context.strokeStyle = artilleryShot ? "rgba(255, 155, 55, .72)" : spitterShot ? "rgba(143, 91, 181, .72)" : "rgba(123, 27, 35, 0.72)";
        context.lineWidth = artilleryShot ? 6 : 4;
        context.stroke();
        context.save();
        context.translate(bullet.x, bullet.y);
        context.rotate(Math.atan2(bullet.vy, bullet.vx));
        context.beginPath();
        if (artilleryShot) {
          for (let point = 0; point < 6; point += 1) {
            const angle = point / 6 * TAU;
            const px = Math.cos(angle) * (bullet.radius + 2.5);
            const py = Math.sin(angle) * (bullet.radius + 2.5);
            if (point === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
          }
          context.closePath();
          context.fillStyle = "#ffb151";
          context.fill();
        } else if (bullet.ownerKind === "spitter") {
          context.moveTo(bullet.radius + 2, 0);
          context.lineTo(0, bullet.radius);
          context.lineTo(-bullet.radius - 2, 0);
          context.lineTo(0, -bullet.radius);
          context.closePath();
          context.strokeStyle = "#d9a8f2";
          context.lineWidth = 2;
          context.stroke();
        } else if (bullet.ownerKind === "tidecaller") {
          context.ellipse(-bullet.radius * 0.28, 0, bullet.radius * 0.62, bullet.radius, -0.3, 0, TAU);
          context.ellipse(bullet.radius * 0.28, 0, bullet.radius * 0.62, bullet.radius, 0.3, 0, TAU);
          context.fillStyle = "#79e3df";
          context.fill();
        } else {
          context.arc(0, 0, bullet.radius, 0, TAU);
          context.fillStyle = "#ff756b";
          context.fill();
        }
        context.restore();
      }
      if (previewIds.has(bullet.id)) {
        const previewRadius = bullet.radius + 7 + Math.sin(run.elapsed * 8) * 1.2;
        context.save();
        context.translate(bullet.x, bullet.y);
        context.rotate(Math.PI / 4);
        context.strokeStyle = "rgba(255, 226, 142, 0.94)";
        context.lineWidth = 2;
        context.strokeRect(-previewRadius, -previewRadius, previewRadius * 2, previewRadius * 2);
        context.restore();
      }
    });
  }

  function drawEnemies() {
    const pursuitPreview = getFusionTarget();
    run.enemies.forEach(function drawEnemy(enemy) {
      context.save();
      context.translate(enemy.x, enemy.y);
      const impactState = enemyImpactStates.get(enemy.id);
      if (!reducedMotion && impactState) {
        const recoilProgress = clamp((performance.now() / 1000 - impactState.at) / 0.13, 0, 1);
        const recoil = Math.sin(recoilProgress * Math.PI) * (1 - recoilProgress) * 4 * impactState.strength;
        context.translate(Math.cos(impactState.angle) * recoil, Math.sin(impactState.angle) * recoil);
        const squash = 1 - Math.sin(recoilProgress * Math.PI) * 0.10 * impactState.strength;
        context.scale(1 / squash, squash);
      }
      context.beginPath();
      context.ellipse(0, enemy.radius * 0.72, enemy.radius * 0.86, enemy.radius * 0.34, 0, 0, TAU);
      context.fillStyle = "rgba(0,0,0,.3)";
      context.fill();

      if (run.pursuitBatch && enemy.pursuitBatchId === run.pursuitBatch.id) {
        const remainingRatio = clamp((run.pursuitBatch.deadline - run.elapsed) / Logic.ACTIVE_ABILITY.markDuration, 0, 1);
        const markRadius = enemy.radius + 9 + Math.sin(run.elapsed * 7 + enemy.id) * 1.5;
        context.beginPath();
        context.arc(0, 0, markRadius, 0, TAU);
        context.strokeStyle = "rgba(255, 205, 80, 0.32)";
        context.lineWidth = 6;
        context.stroke();
        context.beginPath();
        context.arc(0, 0, markRadius, -Math.PI / 2, -Math.PI / 2 + TAU * remainingRatio);
        context.strokeStyle = pursuitPreview && pursuitPreview.id === enemy.id ? "#fff7c6" : "#ffd45f";
        context.lineWidth = pursuitPreview && pursuitPreview.id === enemy.id ? 4 : 2.5;
        context.shadowColor = "#ffc547";
        context.shadowBlur = pursuitPreview && pursuitPreview.id === enemy.id ? 18 : 10;
        context.stroke();
        context.shadowBlur = 0;
        context.save();
        context.rotate(run.elapsed * 0.9);
        context.beginPath();
        for (let point = 0; point < 4; point += 1) {
          const angle = point * Math.PI / 2;
          const radius = markRadius + 5;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (point === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.strokeStyle = "rgba(255, 232, 142, 0.7)";
        context.lineWidth = 1.5;
        context.stroke();
        context.restore();
      }

      if (enemy.carrierTraitId) {
        const carrierTrait = Logic.FIRE_TRAITS[enemy.carrierTraitId];
        context.save();
        context.rotate(reducedMotion ? 0 : run.elapsed * (enemy.carrierTraitId === "sharp" ? 1.1 : -0.8));
        context.beginPath();
        context.arc(0, 0, enemy.radius + 6, 0, TAU);
        context.setLineDash(enemy.carrierTraitId === "sharp" ? [2, 5] : [8, 5]);
        context.strokeStyle = carrierTrait.color;
        context.globalAlpha = 0.72;
        context.lineWidth = 2;
        context.shadowColor = carrierTrait.color;
        context.shadowBlur = 9;
        context.stroke();
        context.restore();
      }

      if (enemy.kind === "runner" && enemy.dashState === "windup") {
        const pulse = 0.65 + 0.35 * Math.sin(run.elapsed * 24);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(enemy.dashX * 180, enemy.dashY * 180);
        context.setLineDash([7, 5]);
        context.strokeStyle = "rgba(255, 84, 89, " + pulse + ")";
        context.lineWidth = 2;
        context.stroke();
        context.setLineDash([]);
        context.beginPath();
        context.arc(0, 0, enemy.radius * (1.25 + pulse * 0.25), 0, TAU);
        context.strokeStyle = "rgba(255, 117, 107, .62)";
        context.stroke();
      }

      if (["spitter", "tidecaller"].includes(enemy.kind) && enemy.attackState === "windup") {
        const charge = clamp(1 - enemy.attackWindup / 0.45, 0, 1);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(enemy.lockedAimX * 230, enemy.lockedAimY * 230);
        context.setLineDash([3, 7]);
        context.strokeStyle = "rgba(192, 137, 235, " + (0.22 + charge * 0.5) + ")";
        context.lineWidth = 1.5;
        context.stroke();
        context.setLineDash([]);
        context.beginPath();
        context.arc(0, 0, enemy.radius * (1.2 + charge * 0.45), 0, TAU);
        context.strokeStyle = "rgba(205, 158, 241, " + (0.3 + charge * 0.55) + ")";
        context.lineWidth = 2;
        context.stroke();
      }

      const crossfireOwnsArtilleryTelegraph = Boolean(run.crossfire &&
        ["telegraph", "volley"].includes(run.crossfire.phase) &&
        (run.crossfire.shooterIds.includes(enemy.id) || run.crossfire.pendingShooterIds.includes(enemy.id)));
      if (enemy.kind === "artillery" && enemy.attackState === "windup" && !crossfireOwnsArtilleryTelegraph) {
        const charge = clamp(1 - enemy.attackWindup / 0.78, 0, 1);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(enemy.lockedAimX * 330, enemy.lockedAimY * 330);
        context.setLineDash([10, 5, 2, 5]);
        context.strokeStyle = "rgba(255, 174, 78, " + (0.28 + charge * 0.62) + ")";
        context.lineWidth = 2.2;
        context.stroke();
        context.setLineDash([]);
        context.beginPath();
        context.arc(0, 0, enemy.radius * (1.35 + charge * 0.55), 0, TAU);
        context.strokeStyle = "rgba(255, 196, 112, " + (0.34 + charge * 0.58) + ")";
        context.lineWidth = 3;
        context.stroke();
      }

      if (enemy.kind === "boss" && enemy.bossAttackState === "windup") {
        const attackSpec = Logic.getBossAttackSpec(run.wave, enemy.bossPhase, enemy.patternSerial, run.curveProfile, run.dangerLevel);
        const readiness = attackSpec ? clamp(1 - enemy.bossAttackWindup / attackSpec.windup, 0, 1) : 0;
        context.save();
        if (attackSpec && attackSpec.kind === "gap-ring") {
          const halfGap = TAU / attackSpec.slots * (attackSpec.gapCount + 0.4) / 2;
          const warningRadius = 142;
          context.beginPath();
          context.moveTo(0, 0);
          context.arc(0, 0, warningRadius, enemy.patternGapAngle - halfGap, enemy.patternGapAngle + halfGap);
          context.closePath();
          context.fillStyle = "rgba(111, 214, 231, " + (0.06 + readiness * 0.08) + ")";
          context.fill();
          [enemy.patternGapAngle - halfGap, enemy.patternGapAngle + halfGap].forEach(function drawGapEdge(angle) {
            context.beginPath();
            context.moveTo(Math.cos(angle) * (enemy.radius + 8), Math.sin(angle) * (enemy.radius + 8));
            context.lineTo(Math.cos(angle) * warningRadius, Math.sin(angle) * warningRadius);
            context.setLineDash([7, 6]);
            context.strokeStyle = "rgba(157, 238, 255, " + (0.42 + readiness * 0.45) + ")";
            context.lineWidth = 2;
            context.stroke();
          });
          context.setLineDash([]);
        } else if (attackSpec && attackSpec.kind === "fan") {
          context.beginPath();
          context.moveTo(0, 0);
          context.lineTo(enemy.patternAimX * 155, enemy.patternAimY * 155);
          context.setLineDash([5, 5]);
          context.strokeStyle = enemy.bossColor || "#ff756b";
          context.globalAlpha = 0.35 + readiness * 0.55;
          context.lineWidth = 2;
          context.stroke();
        } else if (attackSpec && attackSpec.kind === "boss-wave") {
          for (let ring = 0; ring < 3; ring += 1) {
            context.beginPath();
            context.arc(0, 0, enemy.radius + 12 + ring * 9 + readiness * 8, 0, TAU);
            context.strokeStyle = "#ffe49a";
            context.globalAlpha = 0.2 + readiness * 0.24;
            context.lineWidth = 2;
            context.stroke();
          }
        }
        context.restore();
      }

      if (enemy.kind === "boss" && enemy.bossMode === "ash-ram" && enemy.aftershockPending) {
        const readiness = clamp(1 - enemy.aftershockTimer / 0.35, 0, 1);
        const rotation = enemy.chargeSerial % 2 * Math.PI / 6;
        context.save();
        context.setLineDash([5, 5]);
        context.strokeStyle = "rgba(255, 244, 223, " + (0.28 + readiness * 0.62) + ")";
        context.lineWidth = 2;
        for (let ray = 0; ray < 6; ray += 1) {
          const angle = rotation + ray / 6 * TAU;
          context.beginPath();
          context.moveTo(Math.cos(angle) * (enemy.radius + 8), Math.sin(angle) * (enemy.radius + 8));
          context.lineTo(Math.cos(angle) * 145, Math.sin(angle) * 145);
          context.stroke();
        }
        context.restore();
      }

      if (enemy.kind === "boss" && enemy.chargeState === "windup") {
        const pulse = 1 + Math.sin(run.elapsed * 18.18) * 0.1;
        context.beginPath();
        context.arc(0, 0, enemy.radius * 1.65 * pulse, 0, TAU);
        context.strokeStyle = enemy.bossColor || "rgba(255, 117, 107, 0.68)";
        context.lineWidth = 2;
        context.stroke();
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(enemy.chargeX * 130, enemy.chargeY * 130);
        context.strokeStyle = "rgba(255, 117, 107, 0.45)";
        context.stroke();
      }

      if (enemy.kind === "boss") {
        context.save();
        context.rotate(reducedMotion ? 0 : run.elapsed * (enemy.bossMode === "cinder-weaver" ? 0.7 : -0.42));
        context.beginPath();
        context.arc(0, 0, enemy.radius + 8, 0, TAU);
        context.setLineDash(enemy.bossMode === "cinder-weaver" ? [5, 6] : ["ember-core", "fire-keeper"].includes(enemy.bossMode) ? [2, 5] : []);
        context.strokeStyle = enemy.bossColor || "#ff9c88";
        context.globalAlpha = 0.55;
        context.lineWidth = enemy.bossPhase === 2 ? 3 : 2;
        context.stroke();
        if (["ember-core", "fire-keeper"].includes(enemy.bossMode)) {
          context.beginPath();
          context.arc(0, 0, enemy.radius + 13, 0, TAU);
          context.globalAlpha = enemy.bossPhase === 2 ? 0.72 : 0.28;
          context.stroke();
        }
        if (enemy.bossMode === "ash-ram" && enemy.vulnerableTimer > 0) {
          context.beginPath();
          context.arc(0, 0, enemy.radius + 15, 0, TAU);
          context.setLineDash([2, 4]);
          context.strokeStyle = "#fff4df";
          context.globalAlpha = 0.9;
          context.lineWidth = 3;
          context.stroke();
          context.setLineDash([]);
        }
        context.restore();
      }

      context.beginPath();
      if (enemy.kind === "boss" && enemy.bossMode === "ash-ram") {
        const gateGap = enemy.bossPhase === 2 ? enemy.radius * 0.28 : enemy.radius * 0.42;
        context.moveTo(enemy.radius * 1.18, 0);
        context.lineTo(enemy.radius * 0.38, -enemy.radius * 0.9);
        context.lineTo(gateGap, -enemy.radius * 0.32);
        context.lineTo(-enemy.radius * 0.86, -enemy.radius * 0.82);
        context.lineTo(-enemy.radius * 0.58, 0);
        context.lineTo(-enemy.radius * 0.86, enemy.radius * 0.82);
        context.lineTo(gateGap, enemy.radius * 0.32);
        context.lineTo(enemy.radius * 0.38, enemy.radius * 0.9);
        context.closePath();
      } else if (enemy.kind === "runner") {
        context.moveTo(0, -enemy.radius);
        context.lineTo(enemy.radius, 0);
        context.lineTo(0, enemy.radius);
        context.lineTo(-enemy.radius, 0);
        context.closePath();
      } else if (enemy.kind === "swarm") {
        context.moveTo(0, -enemy.radius);
        context.lineTo(enemy.radius * 0.9, enemy.radius * 0.75);
        context.lineTo(-enemy.radius * 0.9, enemy.radius * 0.75);
        context.closePath();
      } else if (enemy.kind === "spitter") {
        context.moveTo(0, -enemy.radius * 1.08);
        context.bezierCurveTo(enemy.radius * 0.92, -enemy.radius * 0.72, enemy.radius * 0.9, enemy.radius * 0.68, 0, enemy.radius);
        context.bezierCurveTo(-enemy.radius * 0.9, enemy.radius * 0.68, -enemy.radius * 0.92, -enemy.radius * 0.72, 0, -enemy.radius * 1.08);
        context.closePath();
      } else if (enemy.kind === "tidecaller") {
        context.moveTo(0, -enemy.radius * 1.08);
        context.bezierCurveTo(enemy.radius * 1.08, -enemy.radius * 0.72, enemy.radius * 0.92, enemy.radius * 0.58, 0, enemy.radius * 0.72);
        context.bezierCurveTo(-enemy.radius * 0.92, enemy.radius * 0.58, -enemy.radius * 1.08, -enemy.radius * 0.72, 0, -enemy.radius * 1.08);
        context.closePath();
      } else if (enemy.kind === "switchGuard") {
        context.moveTo(0, -enemy.radius);
        context.lineTo(enemy.radius * 0.9, -enemy.radius * 0.48);
        context.lineTo(enemy.radius * 0.72, enemy.radius * 0.72);
        context.lineTo(0, enemy.radius);
        context.lineTo(-enemy.radius * 0.72, enemy.radius * 0.72);
        context.lineTo(-enemy.radius * 0.9, -enemy.radius * 0.48);
        context.closePath();
      } else if (enemy.kind === "artillery") {
        for (let point = 0; point < 6; point += 1) {
          const angle = -Math.PI / 2 + point / 6 * TAU;
          const px = Math.cos(angle) * enemy.radius;
          const py = Math.sin(angle) * enemy.radius;
          if (point === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
      } else if (enemy.kind === "chaser") {
        context.moveTo(-enemy.radius * 0.72, -enemy.radius);
        context.lineTo(enemy.radius * 0.72, -enemy.radius);
        context.lineTo(enemy.radius, enemy.radius * 0.48);
        context.lineTo(enemy.radius * 0.42, enemy.radius * 0.88);
        context.lineTo(enemy.radius * 0.18, enemy.radius * 0.52);
        context.lineTo(-enemy.radius * 0.18, enemy.radius * 0.52);
        context.lineTo(-enemy.radius * 0.42, enemy.radius * 0.88);
        context.lineTo(-enemy.radius, enemy.radius * 0.48);
        context.closePath();
      } else {
        context.arc(0, 0, enemy.radius, 0, TAU);
      }
      context.fillStyle = enemy.flash > 0 ? "#fff4df" :
        enemy.kind === "boss" ? (enemy.bossMode === "cinder-weaver" ? "#66518e" : enemy.bossMode === "fire-keeper" ? "#8b5f2c" : enemy.bossMode === "ember-core" ? "#8f592d" : "#b53f3d") :
          enemy.kind === "artillery" ? "#9b6238" :
            enemy.kind === "switchGuard" ? (enemy.armorBroken ? "#815d47" : "#60736d") :
              enemy.kind === "tidecaller" ? "#357f87" :
            enemy.kind === "spitter" ? "#8d68ad" :
              enemy.kind === "swarm" ? "#bd5b45" :
                enemy.kind === "runner" ? "#e36c77" : "#a84f3c";
      if (enemy.kind === "runner" && enemy.dashState === "recovery") context.globalAlpha = 0.62;
      context.fill();
      context.globalAlpha = 1;
      context.lineWidth = enemy.kind === "boss" ? 3 : 1.5;
      context.strokeStyle = enemy.kind === "boss" ? (enemy.bossColor || "#ff9c88") : "rgba(255,255,255,0.28)";
      context.stroke();
      if (enemy.kind === "spitter") {
        const charge = enemy.attackState === "windup" ? clamp(1 - enemy.attackWindup / 0.45, 0, 1) : 0;
        context.beginPath();
        context.ellipse(0, enemy.radius * 0.1, enemy.radius * (0.32 + charge * 0.16), enemy.radius * (0.2 + charge * 0.1), 0, 0, TAU);
        context.fillStyle = charge > 0.8 ? "#fff0ff" : "#2f183b";
        context.fill();
      } else if (enemy.kind === "tidecaller") {
        [-1, 1].forEach(function drawTideSeed(side) {
          context.beginPath();
          context.ellipse(side * enemy.radius * 0.24, 0, enemy.radius * 0.18, enemy.radius * 0.38, side * 0.35, 0, TAU);
          context.fillStyle = "#baf8f3";
          context.fill();
        });
      }
      if (enemy.kind === "switchGuard") {
        context.beginPath();
        context.arc(0, 0, enemy.radius * 0.48, 0, TAU);
        context.strokeStyle = enemy.armorBroken ? "#ffb45f" : "#d8fff4";
        context.lineWidth = enemy.armorBroken ? 1.5 : 3;
        context.setLineDash(enemy.armorBroken ? [3, 4] : []);
        context.stroke();
        context.setLineDash([]);
      }
      if (enemy.kind === "artillery") {
        const aimAngle = Math.atan2(enemy.lockedAimY || 0, enemy.lockedAimX || -1);
        context.save();
        context.rotate(aimAngle);
        context.fillStyle = "#f2b66f";
        context.fillRect(0, -3, enemy.radius + 9, 6);
        context.restore();
        context.beginPath();
        context.arc(0, 0, 5, 0, TAU);
        context.fillStyle = enemy.attackState === "windup" ? "#fff1c4" : "#ffc071";
        context.fill();
      }
      if (enemy.kind === "swarm") {
        context.beginPath();
        context.arc(0, 1, 2.2, 0, TAU);
        context.fillStyle = "#ffd0a4";
        context.fill();
      }
      if (enemy.kind === "boss") {
        context.beginPath();
        context.arc(0, 0, enemy.radius * 0.36, 0, TAU);
        context.fillStyle = enemy.bossColor || "#ffd08a";
        context.globalAlpha = enemy.bossPhase === 2 ? 1 : 0.72;
        context.fill();
        context.globalAlpha = 1;
      }
      if (enemy.kind !== "boss" && enemy.health < enemy.maxHealth) {
        context.fillStyle = "rgba(0,0,0,0.5)";
        context.fillRect(-enemy.radius, enemy.radius + 5, enemy.radius * 2, 3);
        context.fillStyle = "#ff8b7f";
        context.fillRect(-enemy.radius, enemy.radius + 5, enemy.radius * 2 * clamp(enemy.health / enemy.maxHealth, 0, 1), 3);
      }
      context.restore();
    });
  }

  function drawBearerSilhouette(player) {
    if (!run) return;
    const radius = player.radius + 11;
    const bearer = Logic.BEARER_DEFS[run.bearerId] || Logic.BEARER_DEFS["fire-walker"];
    context.save();
    context.strokeStyle = bearer.color;
    context.fillStyle = bearer.color;
    context.lineWidth = 2.3;
    context.globalAlpha = 0.78;
    context.shadowColor = bearer.color;
    context.shadowBlur = 9;
    if (run.bearerId === "ridge-breaker") {
      context.rotate(player.aimAngle);
      context.beginPath();
      context.moveTo(radius + 7, 0);
      context.lineTo(-radius * 0.72, -radius * 0.72);
      context.lineTo(-radius * 0.34, 0);
      context.lineTo(-radius * 0.72, radius * 0.72);
      context.closePath();
      context.stroke();
      context.beginPath();
      context.moveTo(radius + 7, 0);
      context.lineTo(radius - 2, -4);
      context.lineTo(radius - 2, 4);
      context.closePath();
      context.fill();
    } else if (run.bearerId === "tide-warden") {
      context.rotate(reducedMotion ? 0 : Math.sin(run.elapsed * 0.7) * 0.12);
      context.beginPath();
      context.arc(-radius * 0.36, 0, radius * 0.88, -1.18, 1.18);
      context.stroke();
      context.beginPath();
      context.arc(radius * 0.36, 0, radius * 0.88, Math.PI - 1.18, Math.PI + 1.18);
      context.stroke();
    } else {
      context.rotate(reducedMotion ? 0 : run.elapsed * 0.28);
      context.beginPath();
      context.arc(0, 0, radius - 2, 0, TAU);
      context.setLineDash([4, 7]);
      context.stroke();
      context.setLineDash([]);
      for (let tooth = 0; tooth < 6; tooth += 1) {
        const angle = tooth / 6 * TAU;
        context.beginPath();
        context.moveTo(Math.cos(angle) * (radius - 1), Math.sin(angle) * (radius - 1));
        context.lineTo(Math.cos(angle) * (radius + 5), Math.sin(angle) * (radius + 5));
        context.stroke();
      }
    }
    context.restore();
  }

  function drawPlayer() {
    const player = run.player;
    context.save();
    context.translate(player.x, player.y);
    if (run.relayFlash > 0) {
      const relayProgress = clamp(run.relayFlash / 0.8, 0, 1);
      context.beginPath();
      context.arc(0, 0, player.radius + 13 + (1 - relayProgress) * 18, 0, TAU);
      context.strokeStyle = "rgba(255, 222, 145, " + (0.18 + relayProgress * 0.72) + ")";
      context.lineWidth = 3;
      context.shadowColor = "#ffae45";
      context.shadowBlur = 18;
      context.stroke();
      context.shadowBlur = 0;
    }
    if (run.activeWeaponId === "cinderRing" && getWeaponLevel("cinderRing") >= 3) {
      const wardPulse = reducedMotion ? 108 : 108 + Math.sin(run.elapsed * 3.4) * 3;
      context.beginPath();
      context.arc(0, 0, wardPulse, 0, TAU);
      context.setLineDash([5, 8]);
      context.strokeStyle = "rgba(114, 230, 241, .30)";
      context.lineWidth = 2;
      context.shadowColor = "#72e6f1";
      context.shadowBlur = 8;
      context.stroke();
      context.setLineDash([]);
      context.shadowBlur = 0;
    }
    const invulnerableAlpha = player.invulnerable > 0 && Math.floor(run.elapsed / 0.055) % 2 ? 0.68 : 1;
    context.globalAlpha = invulnerableAlpha;
    feedbackDiagnostics.playerMinimumRenderedAlpha = Math.min(feedbackDiagnostics.playerMinimumRenderedAlpha, invulnerableAlpha);
    const activeWeapon = getWeaponDefinition(run.activeWeaponId);
    const corePulse = reducedMotion ? 1 : 1 + Math.sin(run.elapsed * 6) * 0.05;
    context.beginPath();
    context.ellipse(0, player.radius * 0.78, player.radius * 1.05, player.radius * 0.38, 0, 0, TAU);
    context.fillStyle = "rgba(73, 66, 56, 0.20)";
    context.fill();
    context.beginPath();
    context.arc(0, 0, (player.radius + 7) * corePulse, 0, TAU);
    const playerGlow = context.createRadialGradient(0, 0, 1, 0, 0, player.radius + 10);
    playerGlow.addColorStop(0, "rgba(255, 252, 224, 0.40)");
    playerGlow.addColorStop(1, "rgba(255, 184, 103, 0)");
    context.fillStyle = playerGlow;
    context.fill();
    context.save();
    context.rotate(reducedMotion ? 0 : -run.elapsed * 0.8);
    context.beginPath();
    context.arc(0, 0, player.radius + 6, 0, TAU);
    context.setLineDash([3, 5]);
    context.strokeStyle = activeWeapon.color;
    context.globalAlpha = run.weaponHeat[getInactiveWeaponId()] >= 0.995 ? 0.78 : 0.38;
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();
    drawBearerSilhouette(player);
    context.globalAlpha = 1;
    context.rotate(player.aimAngle);
    context.beginPath();
    const capeDrift = reducedMotion ? 0 : Math.sin(run.elapsed * 8) * 1.5;
    context.moveTo(7, -9);
    context.bezierCurveTo(-2, -15, -12, -11, -player.radius - 7, -10 + capeDrift);
    context.lineTo(-player.radius - 3, 1 + capeDrift);
    context.lineTo(-player.radius - 9, 10 + capeDrift);
    context.bezierCurveTo(-7, 15, 5, 12, 8, 7);
    context.closePath();
    const cape = context.createLinearGradient(-17, -12, 8, 12);
    cape.addColorStop(0, "#1b3431");
    cape.addColorStop(0.55, "#476559");
    cape.addColorStop(1, "#274336");
    context.fillStyle = cape;
    context.fill();
    context.lineWidth = 1.4;
    context.strokeStyle = "#bca476";
    context.stroke();
    context.beginPath();
    context.moveTo(-5, -8); context.lineTo(-15, -6 + capeDrift);
    context.moveTo(-5, 5); context.lineTo(-17, 8 + capeDrift);
    context.strokeStyle = "#688173";
    context.lineWidth = 0.8;
    context.stroke();
    // Hood, two eye slits and a carried flame make the bearer readable at the
    // smallest viewport without growing its collision radius.
    context.beginPath();
    context.moveTo(11, 0);
    context.bezierCurveTo(8, -10, -5, -12, -8, -4);
    context.bezierCurveTo(-12, 3, -4, 11, 4, 8);
    context.bezierCurveTo(8, 7, 10, 4, 11, 0);
    context.closePath();
    const playerCore = context.createRadialGradient(-3, -4, 1, 0, 0, player.radius);
    playerCore.addColorStop(0, "#f6e6b5");
    playerCore.addColorStop(0.58, "#cdb686");
    playerCore.addColorStop(1, "#8e7758");
    context.fillStyle = playerCore;
    context.fill();
    context.lineWidth = 1.5;
    context.strokeStyle = "#f8e4b5";
    context.stroke();
    context.beginPath();
    context.ellipse(5, 0, 4.5, 6, 0, 0, TAU);
    context.fillStyle = "#172c28";
    context.fill();
    context.beginPath();
    context.moveTo(6, -3.7); context.lineTo(8.2, -2.4);
    context.moveTo(6, 3.7); context.lineTo(8.2, 2.4);
    context.strokeStyle = "#fff3c7";
    context.lineWidth = 1.4;
    context.stroke();
    context.fillStyle = "#c4aa77";
    context.fillRect(3, 8, 7, 5);
    context.beginPath();
    context.moveTo(7, 7); context.quadraticCurveTo(3, 3, 8, 1);
    context.quadraticCurveTo(7, 4, 10, 6); context.quadraticCurveTo(10, 9, 7, 7);
    context.shadowColor = "#ffc777"; context.shadowBlur = 12;
    context.fillStyle = "#fff0b8"; context.fill(); context.shadowBlur = 0;
    context.beginPath();
    context.moveTo(player.radius - 1, 0);
    context.lineTo(player.radius + 9, -3.6);
    context.lineTo(player.radius + 9, 3.6);
    context.closePath();
    context.fillStyle = activeWeapon.color;
    context.fill();
    context.strokeStyle = "rgba(71, 72, 63, 0.72)";
    context.lineWidth = 1.2;
    context.stroke();
    context.restore();
    context.globalAlpha = 1;
  }

  function drawDestination() {
    if (!input.hasTarget || !run) return;
    const pulse = 1 + Math.sin(run.elapsed / 0.13) * 0.12;
    context.save();
    context.beginPath();
    context.moveTo(run.player.x, run.player.y);
    context.lineTo(input.targetX, input.targetY);
    context.setLineDash([4, 6]);
    context.strokeStyle = "rgba(255, 208, 138, 0.22)";
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.arc(input.targetX, input.targetY, 10 * pulse, 0, TAU);
    context.strokeStyle = "rgba(255, 208, 138, 0.7)";
    context.lineWidth = 2;
    context.stroke();
    context.restore();
  }

  function createArenaProjection(viewWidth, viewHeight, pixelRatio) {
    const resolvedWidth = Number.isFinite(viewWidth) && viewWidth > 0 ? viewWidth : 1;
    const resolvedHeight = Number.isFinite(viewHeight) && viewHeight > 0 ? viewHeight : 1;
    const resolvedRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? Math.min(2, pixelRatio) : 1;
    const scale = Math.min(resolvedWidth / ARENA_GEOMETRY.width, resolvedHeight / ARENA_GEOMETRY.height);
    const contentWidth = ARENA_GEOMETRY.width * scale;
    const contentHeight = ARENA_GEOMETRY.height * scale;
    return Object.freeze({
      viewWidth: resolvedWidth,
      viewHeight: resolvedHeight,
      pixelRatio: resolvedRatio,
      backingWidth: Math.max(1, Math.round(resolvedWidth * resolvedRatio)),
      backingHeight: Math.max(1, Math.round(resolvedHeight * resolvedRatio)),
      scale: scale,
      offsetX: (resolvedWidth - contentWidth) / 2,
      offsetY: (resolvedHeight - contentHeight) / 2,
      contentWidth: contentWidth,
      contentHeight: contentHeight
    });
  }

  function worldToArenaViewport(x, y, projection) {
    const resolved = projection || arenaProjection;
    return {
      x: resolved.offsetX + x * resolved.scale,
      y: resolved.offsetY + y * resolved.scale
    };
  }

  function arenaViewportToWorld(x, y, projection) {
    const resolved = projection || arenaProjection;
    // Pointer coordinates arrive through browser/CSS floating-point paths that
    // can differ by ~1e-14 across aspect ratios. A micro-pixel normalization
    // keeps the same physical waypoint bit-identical without affecting feel.
    const worldX = Math.round((x - resolved.offsetX) / resolved.scale * 1000000) / 1000000;
    const worldY = Math.round((y - resolved.offsetY) / resolved.scale * 1000000) / 1000000;
    return {
      x: worldX,
      y: worldY,
      inside: worldX >= 0 && worldX <= ARENA_GEOMETRY.width && worldY >= 0 && worldY <= ARENA_GEOMETRY.height
    };
  }

  function resizeCanvas() {
    const rect = dom.canvas.getBoundingClientRect();
    arenaProjection = createArenaProjection(rect.width, rect.height, window.devicePixelRatio || 1);
    if (dom.canvas.width !== arenaProjection.backingWidth) dom.canvas.width = arenaProjection.backingWidth;
    if (dom.canvas.height !== arenaProjection.backingHeight) dom.canvas.height = arenaProjection.backingHeight;
    dom.canvas.__ratio = arenaProjection.pixelRatio;
    context.setTransform(arenaProjection.pixelRatio, 0, 0, arenaProjection.pixelRatio, 0, 0);
    draw();
  }

  function frame(timestamp) {
    syncAdaptiveMusic();
    const realDelta = Math.min(0.1, Math.max(0, (timestamp - lastFrameTime) / 1000));
    lastFrameTime = timestamp;
    if (run && run.active && !run.paused && !run.ended) {
      run.realElapsed += realDelta;
      const frozenDelta = Math.min(realDelta, impactStopRemaining);
      impactStopRemaining = Math.max(0, impactStopRemaining - realDelta);
      simulationAccumulator = Math.min(0.25, simulationAccumulator + (realDelta - frozenDelta) * run.timeScale);
      let steps = 0;
      while (simulationAccumulator + 1e-9 >= FIXED_SIMULATION_STEP && steps < 15) {
        update(FIXED_SIMULATION_STEP);
        simulationAccumulator -= FIXED_SIMULATION_STEP;
        steps += 1;
        // Do not use this frame's backlog to erase a hit stop just requested.
        if (impactStopRemaining > 0) { simulationAccumulator = 0; break; }
        if (!run || run.paused || run.ended || !run.active) {
          simulationAccumulator = 0;
          break;
        }
      }
    } else {
      simulationAccumulator = 0;
    }
    if (run) updateRunUi();
    draw();
    window.requestAnimationFrame(frame);
  }

  function advanceRealTimeForDebug(seconds) {
    if (!run || run.ended || run.paused || !run.active || !Number.isFinite(seconds) || seconds <= 0) return 0;
    let remaining = Math.min(120, seconds);
    let totalSteps = 0;
    while (remaining > 1e-9 && run && run.active && !run.paused && !run.ended) {
      const realDelta = Math.min(FIXED_SIMULATION_STEP, remaining);
      run.realElapsed += realDelta;
      simulationAccumulator = Math.min(0.25, simulationAccumulator + realDelta * run.timeScale);
      let frameSteps = 0;
      while (simulationAccumulator + 1e-9 >= FIXED_SIMULATION_STEP && frameSteps < 15) {
        update(FIXED_SIMULATION_STEP);
        simulationAccumulator -= FIXED_SIMULATION_STEP;
        frameSteps += 1;
        totalSteps += 1;
        if (!run || run.paused || run.ended || !run.active) {
          simulationAccumulator = 0;
          break;
        }
      }
      remaining -= realDelta;
    }
    if (run) updateRunUi();
    draw();
    return totalSteps;
  }

  function resetInputDebug() {
    inputDebug.ignoredCanvasPointerDowns = 0;
    inputDebug.ignoredTouchCanvasPointerDowns = 0;
    inputDebug.joystickPointerDownAttempts = 0;
    inputDebug.joystickPointerDowns = 0;
    inputDebug.joystickPointerMoveCount = 0;
    inputDebug.joystickPointerCancels = 0;
    inputDebug.joystickLostCaptureCount = 0;
    inputDebug.joystickRecenteringCount = 0;
    inputDebug.touchOutsideMoveZoneCount = 0;
    inputDebug.lastMovementReleaseReason = null;
    inputDebug.flashPointerDownAttempts = 0;
    inputDebug.flashQueueAcceptedCount = 0;
    inputDebug.nonPrimaryFlashAcceptedCount = 0;
    inputDebug.suppressedCompatibilityClicks = 0;
    inputDebug.movementPointerCancelCount = 0;
    inputDebug.abilityPointerCancelCount = 0;
    inputDebug.switchPointerDownAttempts = 0;
    inputDebug.switchQueueAcceptedCount = 0;
    inputDebug.nonPrimarySwitchAcceptedCount = 0;
    inputDebug.switchPointerCancelCount = 0;
    inputDebug.lastFlashInputSource = null;
    inputDebug.lastFlashPointerId = null;
    inputDebug.lastFlashPointerType = null;
    inputDebug.lastFlashPointerIsPrimary = null;
    inputDebug.lastSwitchInputSource = null;
    inputDebug.lastSwitchPointerId = null;
    inputDebug.lastSwitchPointerType = null;
    inputDebug.lastSwitchPointerIsPrimary = null;
    lastDirectFlashPointerAt = -Infinity;
    lastDirectSwitchPointerAt = -Infinity;
  }

  function releasePointerOwnership() {
    const movePointerId = input.movePointerId;
    const abilityPointerId = input.abilityPointerId;
    const switchPointerId = input.switchPointerId;
    input.movePointerId = null;
    input.movePointerActive = false;
    input.movePointerType = null;
    input.movePointerSource = null;
    input.joystickCenterX = 0;
    input.joystickCenterY = 0;
    input.joystickVectorX = 0;
    input.joystickVectorY = 0;
    input.abilityPointerId = null;
    input.abilityPointerActive = false;
    input.switchPointerId = null;
    input.switchPointerActive = false;
    dom.joystickZone.classList.remove("is-active");
    dom.joystickKnob.style.transform = "";
    dom.flashButton.classList.remove("is-pressed");
    dom.switchButton.classList.remove("is-pressed");
    try {
      if (movePointerId !== null && dom.canvas.hasPointerCapture(movePointerId)) dom.canvas.releasePointerCapture(movePointerId);
    } catch (error) { /* capture release is optional */ }
    try {
      if (abilityPointerId !== null && dom.flashButton.hasPointerCapture(abilityPointerId)) dom.flashButton.releasePointerCapture(abilityPointerId);
    } catch (error) { /* capture release is optional */ }
    try {
      if (switchPointerId !== null && dom.switchButton.hasPointerCapture(switchPointerId)) dom.switchButton.releasePointerCapture(switchPointerId);
    } catch (error) { /* capture release is optional */ }
  }

  function clearInput() {
    releasePointerOwnership();
    input.hasTarget = false;
    pressedKeys.clear();
    if (run) {
      run.flashQueued = false;
      run.flashQueuedDirection = null;
      run.switchQueued = false;
    }
  }

  function canvasPoint(event) {
    const rect = dom.canvas.getBoundingClientRect();
    const point = arenaViewportToWorld(event.clientX - rect.left, event.clientY - rect.top);
    point.localX = event.clientX - rect.left;
    point.localY = event.clientY - rect.top;
    return point;
  }

  function pointInsideRect(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function clampJoystickCenter(clientX, clientY) {
    const zoneRect = dom.joystickZone.getBoundingClientRect();
    const arenaRect = dom.arena.getBoundingClientRect();
    const visualRadius = JOYSTICK_FULL_RADIUS;
    const minimumX = Math.max(zoneRect.left + visualRadius, arenaRect.left + visualRadius);
    const maximumX = Math.min(zoneRect.right - visualRadius, arenaRect.right - visualRadius);
    const minimumY = Math.max(zoneRect.top + visualRadius, arenaRect.top + visualRadius);
    const maximumY = Math.min(zoneRect.bottom - visualRadius, arenaRect.bottom - visualRadius);
    return {
      x: minimumX <= maximumX ? clamp(clientX, minimumX, maximumX) : (zoneRect.left + zoneRect.right) / 2,
      y: minimumY <= maximumY ? clamp(clientY, minimumY, maximumY) : (zoneRect.top + zoneRect.bottom) / 2
    };
  }

  function renderJoystick() {
    const zoneRect = dom.joystickZone.getBoundingClientRect();
    dom.joystickBase.style.left = Math.round(input.joystickCenterX - zoneRect.left - JOYSTICK_FULL_RADIUS) + "px";
    dom.joystickBase.style.top = Math.round(input.joystickCenterY - zoneRect.top - JOYSTICK_FULL_RADIUS) + "px";
    dom.joystickKnob.style.transform = "translate(-50%, -50%) translate(" +
      (input.joystickVectorX * JOYSTICK_KNOB_TRAVEL).toFixed(2) + "px, " +
      (input.joystickVectorY * JOYSTICK_KNOB_TRAVEL).toFixed(2) + "px)";
  }

  function updateJoystick(clientX, clientY) {
    let dx = clientX - input.joystickCenterX;
    let dy = clientY - input.joystickCenterY;
    let distance = Math.hypot(dx, dy);
    if (distance > JOYSTICK_FULL_RADIUS) {
      const followDistance = distance - JOYSTICK_FULL_RADIUS;
      const followedCenter = clampJoystickCenter(
        input.joystickCenterX + dx / distance * followDistance,
        input.joystickCenterY + dy / distance * followDistance
      );
      if (Math.hypot(followedCenter.x - input.joystickCenterX, followedCenter.y - input.joystickCenterY) > 0.01) {
        inputDebug.joystickRecenteringCount += 1;
      }
      input.joystickCenterX = followedCenter.x;
      input.joystickCenterY = followedCenter.y;
      dx = clientX - input.joystickCenterX;
      dy = clientY - input.joystickCenterY;
      distance = Math.hypot(dx, dy);
    }
    const strength = distance <= JOYSTICK_DEAD_ZONE
      ? 0
      : clamp((distance - JOYSTICK_DEAD_ZONE) / (JOYSTICK_FULL_RADIUS - JOYSTICK_DEAD_ZONE), 0, 1);
    if (distance > 0.001 && strength > 0) {
      input.joystickVectorX = dx / distance * strength;
      input.joystickVectorY = dy / distance * strength;
    } else {
      input.joystickVectorX = 0;
      input.joystickVectorY = 0;
    }
    renderJoystick();
  }

  function onMovePointerDown(event) {
    if (!run || run.paused || run.ended || event.button > 0) return;
    if (input.movePointerId !== null) {
      if (event.pointerId !== input.movePointerId) inputDebug.ignoredCanvasPointerDowns += 1;
      event.preventDefault();
      return;
    }
    const pointerType = event.pointerType || "unknown";
    const isTouchMovement = pointerType === "touch" || pointerType === "pen";
    if (isTouchMovement) {
      inputDebug.joystickPointerDownAttempts += 1;
      const zoneRect = dom.joystickZone.getBoundingClientRect();
      if (!pointInsideRect(event.clientX, event.clientY, zoneRect)) {
        inputDebug.ignoredTouchCanvasPointerDowns += 1;
        inputDebug.touchOutsideMoveZoneCount += 1;
        event.preventDefault();
        return;
      }
    }
    const point = canvasPoint(event);
    if (!isTouchMovement && !point.inside) {
      event.preventDefault();
      return;
    }
    input.movePointerId = event.pointerId;
    input.movePointerActive = true;
    input.movePointerType = pointerType;
    input.movePointerSource = isTouchMovement ? "joystick" : "canvas";
    if (isTouchMovement) {
      const center = clampJoystickCenter(event.clientX, event.clientY);
      input.joystickCenterX = center.x;
      input.joystickCenterY = center.y;
      input.joystickVectorX = 0;
      input.joystickVectorY = 0;
      input.hasTarget = false;
      inputDebug.joystickPointerDowns += 1;
      dom.joystickZone.classList.add("is-active");
      renderJoystick();
    } else {
      input.hasTarget = true;
      input.targetX = clamp(point.x, run.player.radius, ARENA_GEOMETRY.width - run.player.radius);
      input.targetY = clamp(point.y, run.player.radius, ARENA_GEOMETRY.height - run.player.radius);
    }
    dom.dragHint.classList.add("is-hidden");
    try { dom.canvas.setPointerCapture(event.pointerId); } catch (error) { /* capture is optional */ }
    event.preventDefault();
  }

  function onMovePointerMove(event) {
    if (!input.movePointerActive || event.pointerId !== input.movePointerId) return;
    if (input.movePointerSource === "joystick") {
      inputDebug.joystickPointerMoveCount += 1;
      updateJoystick(event.clientX, event.clientY);
    } else {
      const point = canvasPoint(event);
      input.hasTarget = true;
      input.targetX = clamp(point.x, run.player.radius, ARENA_GEOMETRY.width - run.player.radius);
      input.targetY = clamp(point.y, run.player.radius, ARENA_GEOMETRY.height - run.player.radius);
    }
    event.preventDefault();
  }

  function onMovePointerEnd(event) {
    if (!event || input.movePointerId === null || event.pointerId !== input.movePointerId) return;
    const source = input.movePointerSource;
    if (event.type === "pointercancel") {
      inputDebug.movementPointerCancelCount += 1;
      if (source === "joystick") inputDebug.joystickPointerCancels += 1;
    }
    if (event.type === "lostpointercapture" && source === "joystick") inputDebug.joystickLostCaptureCount += 1;
    inputDebug.lastMovementReleaseReason = event.type || "unknown";
    input.movePointerId = null;
    input.movePointerActive = false;
    input.movePointerType = null;
    input.movePointerSource = null;
    if (source === "joystick") {
      input.joystickCenterX = 0;
      input.joystickCenterY = 0;
      input.joystickVectorX = 0;
      input.joystickVectorY = 0;
      dom.joystickZone.classList.remove("is-active");
      dom.joystickKnob.style.transform = "";
    } else if (event.type === "pointercancel" || event.type === "lostpointercapture") {
      input.hasTarget = false;
    }
  }

  function recordFlashInput(event, source, accepted) {
    inputDebug.lastFlashInputSource = source;
    inputDebug.lastFlashPointerId = Number.isFinite(event.pointerId) ? event.pointerId : null;
    inputDebug.lastFlashPointerType = event.pointerType || (event.detail === 0 ? "keyboard" : "mouse");
    inputDebug.lastFlashPointerIsPrimary = typeof event.isPrimary === "boolean" ? event.isPrimary : null;
    if (accepted) {
      inputDebug.flashQueueAcceptedCount += 1;
      if (event.isPrimary === false) inputDebug.nonPrimaryFlashAcceptedCount += 1;
    }
  }

  function onFlashPointerDown(event) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    if (event.button > 0) return;
    inputDebug.flashPointerDownAttempts += 1;
    event.preventDefault();
    event.stopPropagation();
    if (input.abilityPointerId !== null) return;
    input.abilityPointerId = event.pointerId;
    input.abilityPointerActive = true;
    dom.flashButton.classList.add("is-pressed");
    lastDirectFlashPointerAt = performance.now();
    try { dom.flashButton.setPointerCapture(event.pointerId); } catch (error) { /* capture is optional */ }
    const accepted = queueFlash();
    recordFlashInput(event, "button-pointerdown", accepted);
  }

  function onFlashPointerEnd(event) {
    if (!event || input.abilityPointerId === null || event.pointerId !== input.abilityPointerId) return;
    if (event.type === "pointercancel") inputDebug.abilityPointerCancelCount += 1;
    input.abilityPointerId = null;
    input.abilityPointerActive = false;
    dom.flashButton.classList.remove("is-pressed");
    event.stopPropagation();
  }

  function onFlashClick(event) {
    event.stopPropagation();
    if (event.detail > 0 && performance.now() - lastDirectFlashPointerAt < 900) {
      inputDebug.suppressedCompatibilityClicks += 1;
      event.preventDefault();
      return;
    }
    const accepted = queueFlash();
    recordFlashInput(event, event.detail === 0 ? "button-keyboard-click" : "button-click", accepted);
  }

  function recordSwitchInput(event, source, accepted) {
    inputDebug.lastSwitchInputSource = source;
    inputDebug.lastSwitchPointerId = Number.isFinite(event.pointerId) ? event.pointerId : null;
    inputDebug.lastSwitchPointerType = event.pointerType || (event.detail === 0 ? "keyboard" : "mouse");
    inputDebug.lastSwitchPointerIsPrimary = typeof event.isPrimary === "boolean" ? event.isPrimary : null;
    if (accepted) {
      inputDebug.switchQueueAcceptedCount += 1;
      if (event.isPrimary === false) inputDebug.nonPrimarySwitchAcceptedCount += 1;
    }
  }

  function onSwitchPointerDown(event) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    if (event.button > 0) return;
    inputDebug.switchPointerDownAttempts += 1;
    event.preventDefault();
    event.stopPropagation();
    if (input.switchPointerId !== null) return;
    input.switchPointerId = event.pointerId;
    input.switchPointerActive = true;
    dom.switchButton.classList.add("is-pressed");
    lastDirectSwitchPointerAt = performance.now();
    try { dom.switchButton.setPointerCapture(event.pointerId); } catch (error) { /* capture is optional */ }
    const accepted = queueWeaponSwitch();
    recordSwitchInput(event, "switch-pointerdown", accepted);
  }

  function onSwitchPointerEnd(event) {
    if (!event || input.switchPointerId === null || event.pointerId !== input.switchPointerId) return;
    if (event.type === "pointercancel") inputDebug.switchPointerCancelCount += 1;
    input.switchPointerId = null;
    input.switchPointerActive = false;
    dom.switchButton.classList.remove("is-pressed");
    event.stopPropagation();
  }

  function onSwitchClick(event) {
    event.stopPropagation();
    if (event.detail > 0 && performance.now() - lastDirectSwitchPointerAt < 900) {
      inputDebug.suppressedCompatibilityClicks += 1;
      event.preventDefault();
      return;
    }
    const accepted = queueWeaponSwitch();
    recordSwitchInput(event, event.detail === 0 ? "switch-keyboard-click" : "switch-click", accepted);
  }

  function onGlobalPointerEnd(event) {
    onMovePointerEnd(event);
    onFlashPointerEnd(event);
    onSwitchPointerEnd(event);
  }

  const EMBER_HELP_CONTENT = {
    "intro": "四把武器、四种组合从第一局就能选。每局携带一把追击武器和一把清群武器；到整备页更换组合。武器等级在局内成长，角色和难度则随通关解锁。",
    "weapons": [
      {
        "id": "carbine",
        "name": "燧火铳",
        "role": "直线点杀，擅长处理精英与首领。",
        "availability": "初始可用；在含燧火铳的组合中装备。",
        "levels": [
          {
            "level": 1,
            "name": "点火",
            "text": "自动发射直线火弹。"
          },
          {
            "level": 2,
            "name": "淬膛",
            "text": "弹速提高，普通弹额外贯穿一名敌人。"
          },
          {
            "level": 3,
            "name": "贯星",
            "text": "每第三轮攻击轰出一枚宽轨贯穿弹。"
          },
          {
            "level": 4,
            "name": "快装",
            "text": "攻击间隔缩短，贯星宽度提高。"
          },
          {
            "level": 5,
            "name": "回响贯星",
            "text": "宽轨后约0.16秒沿原路线再回响一次，造成宽轨55%的伤害。"
          }
        ],
        "draw": "满热换入时，以贯穿拔焰攻击高威胁。"
      },
      {
        "id": "fireflyBranch",
        "name": "萤火枝",
        "role": "火点自动追踪，擅长清理散开的敌人。",
        "availability": "初始可用；在含萤火枝的组合中装备。",
        "levels": [
          {
            "level": 1,
            "name": "双萤",
            "text": "每轮放出两枚低伤追踪火点。"
          },
          {
            "level": 2,
            "name": "灵转",
            "text": "追踪转向与飞行速度提高。"
          },
          {
            "level": 3,
            "name": "跳火",
            "text": "首次命中后，跳向一个尚未命中的邻近目标；不会反复跳同一首领。"
          },
          {
            "level": 4,
            "name": "添枝",
            "text": "普通轮次增加到三枚追踪火点。"
          },
          {
            "level": 5,
            "name": "群萤",
            "text": "每第四轮放出五枚群萤；全场同时最多八枚。"
          }
        ],
        "draw": "满热换入时，释放群萤追击高威胁。"
      },
      {
        "id": "cinderRing",
        "name": "烬轮",
        "role": "轮刃往返回旋，擅长清群与守住近身空间。",
        "availability": "初始可用；在含烬轮的组合中装备。",
        "levels": [
          {
            "level": 1,
            "name": "回轮",
            "text": "六枚轮刃环向飞出后返回。"
          },
          {
            "level": 2,
            "name": "磨锋",
            "text": "返回速度提高，返程可以再次命中敌人。"
          },
          {
            "level": 3,
            "name": "守界",
            "text": "增加两枚轮刃，击退近身普通敌人。"
          },
          {
            "level": 4,
            "name": "扩界",
            "text": "守界作用范围与推力进一步提高。"
          },
          {
            "level": 5,
            "name": "回潮",
            "text": "轮刃回收时，释放一次扩张守界波。"
          }
        ],
        "draw": "满热换入时，以范围回潮推开近身敌群。"
      },
      {
        "id": "hearthSeed",
        "name": "星火种",
        "role": "投向密集敌群，擅长延迟范围爆破与铺场。",
        "availability": "初始可用；在含星火种的组合中装备。",
        "levels": [
          {
            "level": 1,
            "name": "落种",
            "text": "投向密集敌群，约0.5秒后圆形爆开。"
          },
          {
            "level": 2,
            "name": "饱种",
            "text": "爆炸半径提高15%。"
          },
          {
            "level": 3,
            "name": "分芽",
            "text": "主爆炸后生成三个小型花瓣爆点。"
          },
          {
            "level": 4,
            "name": "催熟",
            "text": "投掷周期缩短，花瓣爆点更快出现。"
          },
          {
            "level": 5,
            "name": "暖域",
            "text": "主爆炸留下1.6秒暖域并脉冲两次；场上最多一个暖域。"
          }
        ],
        "draw": "满热换入时，在敌群间立即三点开花。"
      }
    ],
    "pairs": [
      {
        "id": "sharp-ring",
        "name": "同炉双器",
        "weapons": [
          "燧火铳",
          "烬轮"
        ],
        "text": "直线点杀配往返守界，适合熟悉战斗。"
      },
      {
        "id": "sharp-carbine",
        "name": "贯星开花",
        "weapons": [
          "燧火铳",
          "星火种"
        ],
        "text": "直线点杀配远处爆区，近身容错较低。"
      },
      {
        "id": "tide-ring",
        "name": "群萤守界",
        "weapons": [
          "萤火枝",
          "烬轮"
        ],
        "text": "自动追踪配近身守界，操作负担较低。"
      },
      {
        "id": "tide-carbine",
        "name": "萤种暖场",
        "weapons": [
          "萤火枝",
          "星火种"
        ],
        "text": "追踪散怪配延迟铺场，首领爆发较低。"
      }
    ],
    "growth": "每局武器从Lv.1起步，最高Lv.5。普通波结束后亲手选一项成长，可以升级主手、副手或选择生存／换火效果。Lv.3和Lv.5会改变攻击行为，之前的阶段效果继续生效。推荐标记不会代替你选择。",
    "switch": "收起的武器会随时间积攒炉热。副手满热后换入，会触发该武器的拔焰技。从第3波起，开启自动换火时会在副手满热后自动切换；首页和暂停页可以开关，也可以手动换火。",
    "flash": "沿移动方向爆闪，冷却4.8秒，带短暂无敌并清除路径上的敌弹。符合返弹条件时，最多借回三枚敌弹；并非每次穿弹都能返弹。返弹命中后，及时换火可以追击合焰。",
    "bearers": [
      {
        "id": "fire-walker",
        "name": "持炬人·燧",
        "effect": "满热换火释放转火脉冲，推开并打断近身威胁；脉冲有独立冷却。",
        "unlock": "初始可选。"
      },
      {
        "id": "ridge-breaker",
        "name": "踏焰客·岚",
        "effect": "爆闪路径留下灼烧火线，适合截断追兵。",
        "unlock": "任意难度完成第15波后解锁。"
      },
      {
        "id": "tide-warden",
        "name": "引潮师·澜",
        "effect": "爆闪终点掀起护火潮，清除近身弹幕、推开围敌并恢复少量生命。",
        "unlock": "完成第15波，且结算生命不低于最大生命的80%。"
      }
    ],
    "difficulties": [
      {
        "id": 0,
        "name": "轻松",
        "unlock": "初始可选。",
        "effect": "完整十五波，预警更长；敌血、伤害和速度为基准值。"
      },
      {
        "id": 1,
        "name": "标准",
        "unlock": "轻松难度完成第15波后解锁。",
        "effect": "敌血+8%、伤害+10%、速度+4%、数量约+8%；纪录分×1.15。"
      },
      {
        "id": 2,
        "name": "挑战",
        "unlock": "标准难度完成第15波后解锁。",
        "effect": "敌血+14%、伤害+20%、速度+8%、数量约+16%；纪录分×1.30。"
      }
    ],
    "techniques": {
      "text": "成招在局内锻出，不需要永久解锁。拾取两枚相同火性的碎片会炼核；有炼核时，把满热副手换入即可成招。随后用锻招武器命中留下招眼，再让另一类武器命中，连接成招。每局开头已经备好一枚炼核和满热副手，可以较早成招。",
      "families": "燧火铳、萤火枝属于追击类；烬轮、星火种属于清群类。成招由炼核火性和换入的武器类别共同决定。",
      "types": [
        {
          "id": "sever-line",
          "name": "断脉火线",
          "condition": "锋火炼核＋满热换入追击武器",
          "effect": "连接后拉出破势火线，伤害并打断沿线威胁。"
        },
        {
          "id": "lock-loop",
          "name": "锁锋回环",
          "condition": "锋火炼核＋满热换入清群武器",
          "effect": "连接后打断目标并使其减速。"
        },
        {
          "id": "tide-cross",
          "name": "分焰引潮",
          "condition": "潮火炼核＋满热换入追击武器",
          "effect": "连接后在招眼展开交叉清场并清除范围内敌弹。"
        },
        {
          "id": "open-tide",
          "name": "开界回潮",
          "condition": "潮火炼核＋满热换入清群武器",
          "effect": "连接后展开短安全廊，清弹并推开普通敌人。"
        }
      ]
    },
    "cores": {
      "availability": "第5波首领后手选Lv.1炉心，第10波首领后再次选择并升到Lv.2，可以换炉心类型。炉心只在本局生效，三种炉心没有永久解锁门槛。",
      "types": [
        {
          "id": "return-core",
          "name": "回火炉心",
          "effect": "焚火回热时把同一份炉热分给双武器，总量不翻倍；爆闪穿弹还能帮助副手回热。"
        },
        {
          "id": "twin-core",
          "name": "并蒂炉心",
          "effect": "换火后短时间双器协射；招眼可由任一类武器生成，再用另一类连接。"
        },
        {
          "id": "headhunt-core",
          "name": "猎首炉心",
          "effect": "招眼目标死亡时可向下一个高威胁转移一次。燧火铳和烬轮的拔焰／合焰命中特定高威胁时可返热。"
        }
      ]
    },
    "achievements": {
      "text": "火印记录战斗成就。角色和难度按下列条件开放；其余火印和薪火章用于展示成绩，不会解锁武器或直接增加战斗属性。",
      "items": [
        {
          "id": "first-expedition",
          "name": "一炉到底",
          "condition": "完成第15波。",
          "reward": "解锁踏焰客·岚。"
        },
        {
          "id": "three-beacons-clean",
          "name": "一波无伤",
          "condition": "任意一波完整结束时，该波没有受到伤害。",
          "reward": "无伤火印。"
        },
        {
          "id": "escort-keeper",
          "name": "余焰未损",
          "condition": "完成第15波，且结算生命不低于80%。",
          "reward": "解锁引潮师·澜。"
        },
        {
          "id": "mission-no-hit",
          "name": "四式俱成",
          "condition": "同一局锻出四种不同成招。",
          "reward": "四式火印。"
        },
        {
          "id": "flash-weaver",
          "name": "借箭还焰",
          "condition": "同一局累计实际返还至少12枚敌弹。",
          "reward": "返焰火印。"
        },
        {
          "id": "dual-fire-art",
          "name": "双器同炉",
          "condition": "同一局换火至少8次，并连接成招至少3次。",
          "reward": "同炉火印。"
        },
        {
          "id": "boss-breaker",
          "name": "破宗门火",
          "condition": "完成第15波，并在终局留下成招、拔火、合焰、返焰或换火破甲等破法记录。",
          "reward": "破宗火印。"
        },
        {
          "id": "s-rank",
          "name": "薪尽而明",
          "condition": "完整通关并获得S级评定。",
          "reward": "金色薪火章。"
        }
      ],
      "recordNote": "薪种接火后的通关也能解锁角色、难度和火印；正式守火纪录只收录未接火的第15波胜利。新手试火不会写入正式通关解锁。"
    }
  };

  function createEmberHelpUi(options) {
    "use strict";
    const settings = options || {};
    const help = document.getElementById("help-overlay");
    const closeButton = document.getElementById("help-close-button");
    const body = document.getElementById("help-scroll-body");
    const logic = settings.logic;
    const content = settings.content;
    if (!help || !closeButton || !body || !logic) throw new Error("Help UI requires its markup and gameplay definitions.");
    if (!content || !Array.isArray(content.weapons) || !Array.isArray(content.pairs)) throw new Error("Help UI requires audited player content.");
    if (typeof settings.getProfile !== "function") throw new Error("Help UI requires a read-only profile getter.");
    if (typeof settings.beforeOpen !== "function") throw new Error("Help UI requires a synchronous pause/clear-input adapter.");
    const tabs = Array.from(help.querySelectorAll("[data-help-tab]"));
    const panels = tabs.map(function panelForTab(tab) { return document.getElementById(tab.getAttribute("aria-controls")); });
    const entries = [document.getElementById("help-button"), document.getElementById("pause-help-button")].filter(Boolean);
    const inertSnapshots = [];
    let returnFocus = null;
    let deferredFocus = null;
    let activeTab = "weapons";
    let rendered = false;

    function element(tag, className, content) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (content !== undefined) node.textContent = content;
      return node;
    }

    function renderWeaponGuide() {
      const list = document.getElementById("help-weapon-list");
      const pairList = document.getElementById("help-pair-list");
      if (!list || !pairList || !logic.C13_WEAPON_DEFS || !logic.C13_WEAPON_LEVELS || !logic.C13_WEAPON_PAIRS) {
        throw new Error("Help weapon guide cannot find the current arsenal definitions.");
      }
      list.replaceChildren();
      ["carbine", "fireflyBranch", "cinderRing", "hearthSeed"].forEach(function weaponCard(weaponId) {
        const weapon = logic.C13_WEAPON_DEFS[weaponId];
        const guide = content.weapons.find(function weaponGuide(item) { return item.id === weaponId; });
        const levels = guide && guide.levels;
        if (!weapon || !Array.isArray(logic.C13_WEAPON_LEVELS[weaponId]) || !Array.isArray(levels) || levels.length !== 5) throw new Error("Help weapon level contract changed: " + weaponId);
        const card = element("article", "help-weapon");
        card.dataset.helpWeapon = weaponId;
        card.style.setProperty("--help-weapon-color", weapon.color);
        const heading = element("div", "help-weapon-heading");
        const glyph = element("span", "help-weapon-glyph", weapon.shortName);
        glyph.setAttribute("aria-hidden", "true");
        const titleGroup = element("div");
        titleGroup.append(element("h3", "", guide.name), element("p", "", guide.role));
        heading.append(glyph, titleGroup);
        const evolution = element("dl", "help-evolution");
        [1, 3, 5].forEach(function visibleLevel(level) {
          const definition = levels[level - 1];
          const extraClass = level > 1 ? "is-evolution" : "";
          const label = element("dt", extraClass, "Lv." + level);
          const description = element("dd", extraClass);
          description.append(element("strong", "", definition.name), element("p", "", definition.text));
          evolution.append(label, description);
        });
        const minor = element("details", "help-minor-levels");
        minor.append(element("summary", "", "Lv.2 / Lv.4 的强化"));
        [2, 4].forEach(function minorLevel(level) {
          const definition = levels[level - 1];
          minor.append(element("p", "", "Lv." + level + " · " + definition.name + "：" + definition.text));
        });
        const draw = element("p", "help-draw");
        draw.append(element("b", "", "拔火技 · " + weapon.drawSkill.name + "："), document.createTextNode(guide.draw));
        card.append(heading, evolution, minor, draw);
        list.append(card);
      });
      pairList.replaceChildren();
      logic.C13_WEAPON_PAIRS.forEach(function pairCard(pair) {
        const guide = content.pairs.find(function pairGuide(item) { return item.id === pair.id; });
        if (!guide) throw new Error("Help pair contract changed: " + pair.id);
        const card = element("article", "help-pair");
        const names = pair.weaponIds.map(function weaponName(id) { return logic.C13_WEAPON_DEFS[id].name; }).join(" ＋ ");
        card.append(element("h4", "", guide.name), element("span", "", names), element("p", "", guide.text));
        pairList.append(card);
      });
      document.getElementById("help-intro").textContent = content.intro;
      document.getElementById("help-core-availability").textContent = content.cores.availability;
      document.getElementById("help-technique-intro").textContent = content.techniques.text;
      document.getElementById("help-technique-families").textContent = content.techniques.families;
      document.getElementById("help-record-note").textContent = content.achievements.recordNote;
      document.getElementById("help-achievement-intro").textContent = content.achievements.text;
      renderDefinitionList("help-core-list", content.cores.types, "effect");
      renderDefinitionList("help-technique-list", content.techniques.types, "effect", "condition");
      renderDefinitionList("help-achievement-list", content.achievements.items, "condition", "reward");
      rendered = true;
    }

    function renderDefinitionList(id, definitions, primaryKey, secondaryKey) {
      const list = document.getElementById(id);
      if (!list || !Array.isArray(definitions)) throw new Error("Help definition list missing: " + id);
      list.replaceChildren();
      definitions.forEach(function definitionRow(definition) {
        const row = element("article", "help-definition");
        row.append(element("h4", "", definition.name));
        if (secondaryKey) row.append(element("p", "help-small-note", definition[secondaryKey]));
        row.append(element("p", "", definition[primaryKey]));
        list.append(row);
      });
    }

    function refreshUnlocks() {
      const profile = settings.getProfile();
      const unlockedBearers = new Set(logic.getUnlockedBearerIds(profile));
      const maxDanger = profile && Number.isFinite(profile.maxUnlockedDanger) ? Math.max(0, Math.min(2, profile.maxUnlockedDanger)) : 0;
      const bearerList = document.getElementById("help-bearer-list");
      const difficultyList = document.getElementById("help-difficulty-list");
      bearerList.replaceChildren();
      content.bearers.forEach(function bearerRow(bearer) {
        const available = unlockedBearers.has(bearer.id);
        const row = element("article");
        row.dataset.helpBearer = bearer.id;
        const mark = element("span", "help-unlock-mark", bearer.name.slice(-1));
        mark.setAttribute("aria-hidden", "true");
        const copy = element("div");
        const status = element("span", "help-unlock-status" + (available ? " is-unlocked" : ""), available ? "已解锁" : "尚未解锁");
        status.dataset.helpStatus = available ? "unlocked" : "locked";
        copy.append(element("h4", "", bearer.name), status, element("b", "", bearer.unlock), element("p", "", bearer.effect));
        row.append(mark, copy);
        bearerList.append(row);
      });
      difficultyList.replaceChildren();
      content.difficulties.forEach(function difficultyRow(difficulty) {
        const available = difficulty.id <= maxDanger;
        const row = element("div");
        row.dataset.helpDanger = String(difficulty.id);
        const copy = element("div", "help-difficulty-copy");
        const status = element("span", "help-unlock-status" + (available ? " is-unlocked" : ""), available ? "已解锁" : "尚未解锁");
        status.dataset.helpStatus = available ? "unlocked" : "locked";
        copy.append(status, element("p", "", difficulty.unlock), element("p", "help-small-note", difficulty.effect));
        row.append(element("span", "help-difficulty-number", "0" + (difficulty.id + 1)), element("strong", "", difficulty.name), copy);
        difficultyList.append(row);
      });
    }

    function selectTab(name, focus) {
      const tab = tabs.find(function matchingTab(candidate) { return candidate.dataset.helpTab === name; });
      if (!tab) return false;
      activeTab = name;
      tabs.forEach(function updateTab(candidate, index) {
        const selected = candidate === tab;
        candidate.setAttribute("aria-selected", selected ? "true" : "false");
        candidate.tabIndex = selected ? 0 : -1;
        if (panels[index]) panels[index].hidden = !selected;
      });
      body.scrollTop = 0;
      if (focus && !document.hidden) tab.focus({ preventScroll: true });
      return true;
    }

    function shieldBackground(parent) {
      Array.from(parent.children).forEach(function shieldChild(child) {
        if (child === help || child.tagName === "SCRIPT" || child.tagName === "STYLE") return;
        if (child.contains(help)) {
          shieldBackground(child);
          return;
        }
        inertSnapshots.push({ element: child, inert: child.inert });
        child.inert = true;
      });
    }

    function restoreBackground() {
      inertSnapshots.splice(0).forEach(function restoreInert(snapshot) {
        if (snapshot.element.isConnected) snapshot.element.inert = snapshot.inert;
      });
    }

    function open(opener) {
      if (!help.hidden) return true;
      const requestedFocus = opener && typeof opener.focus === "function" ? opener : document.activeElement;
      if (settings.beforeOpen() === false) return false;
      if (!rendered) renderWeaponGuide();
      refreshUnlocks();
      returnFocus = requestedFocus;
      deferredFocus = null;
      help.hidden = false;
      help.setAttribute("aria-hidden", "false");
      selectTab(activeTab, false);
      shieldBackground(document.body);
      if (!document.hidden) closeButton.focus({ preventScroll: true });
      return true;
    }

    function close() {
      if (help.hidden) return false;
      help.hidden = true;
      help.setAttribute("aria-hidden", "true");
      restoreBackground();
      if (typeof settings.afterClose === "function") settings.afterClose();
      const target = returnFocus;
      returnFocus = null;
      if (target && target.isConnected && typeof target.focus === "function") {
        if (document.hidden) deferredFocus = target;
        else target.focus({ preventScroll: true });
      }
      return true;
    }

    function focusableNodes() {
      return Array.from(help.querySelectorAll("button:not([disabled]), summary, [tabindex]:not([tabindex='-1'])")).filter(function visible(node) {
        return node.getClientRects().length > 0 && !node.closest("[hidden]");
      });
    }

    function entryClick(event) { open(event.currentTarget); }
    function closeClick() { close(); }
    function tabClick(event) { selectTab(event.currentTarget.dataset.helpTab, true); }
    function backdropClick(event) { if (event.target === help) close(); }
    function keyDown(event) {
      if (help.hidden) return;
      // Capture must stop the game's Escape/Space/Q/1/2/3 handler underneath.
      event.stopImmediatePropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      const tab = event.target.closest && event.target.closest("[data-help-tab]");
      if (tab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        const index = tabs.indexOf(tab);
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        event.preventDefault();
        selectTab(tabs[next].dataset.helpTab, true);
        return;
      }
      if (event.key === "Tab") {
        const nodes = focusableNodes();
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (!first) { event.preventDefault(); closeButton.focus({ preventScroll: true }); }
        else if (event.shiftKey && (document.activeElement === first || !help.contains(document.activeElement))) { event.preventDefault(); last.focus({ preventScroll: true }); }
        else if (!event.shiftKey && (document.activeElement === last || !help.contains(document.activeElement))) { event.preventDefault(); first.focus({ preventScroll: true }); }
      }
    }
    function keyUp(event) { if (!help.hidden) event.stopImmediatePropagation(); }
    function focusIn(event) { if (!help.hidden && !help.contains(event.target) && !document.hidden) closeButton.focus({ preventScroll: true }); }
    function visibilityChanged() {
      if (document.hidden) return;
      if (!help.hidden) closeButton.focus({ preventScroll: true });
      else if (deferredFocus && deferredFocus.isConnected) {
        deferredFocus.focus({ preventScroll: true });
        deferredFocus = null;
      }
      // This dialog never invokes Continue or resumes a paused battle.
    }

    entries.forEach(function wireEntry(entry) { entry.addEventListener("click", entryClick); });
    tabs.forEach(function wireTab(tab) { tab.addEventListener("click", tabClick); });
    closeButton.addEventListener("click", closeClick);
    help.addEventListener("click", backdropClick);
    window.addEventListener("keydown", keyDown, true);
    window.addEventListener("keyup", keyUp, true);
    document.addEventListener("focusin", focusIn, true);
    document.addEventListener("visibilitychange", visibilityChanged);

    return Object.freeze({
      open: open,
      close: close,
      selectTab: selectTab,
      isOpen: function isOpen() { return !help.hidden; },
      destroy: function destroy() {
        close();
        entries.forEach(function unwireEntry(entry) { entry.removeEventListener("click", entryClick); });
        tabs.forEach(function unwireTab(tab) { tab.removeEventListener("click", tabClick); });
        closeButton.removeEventListener("click", closeClick);
        help.removeEventListener("click", backdropClick);
        window.removeEventListener("keydown", keyDown, true);
        window.removeEventListener("keyup", keyUp, true);
        document.removeEventListener("focusin", focusIn, true);
        document.removeEventListener("visibilitychange", visibilityChanged);
      }
    });
  }


  function pauseRun() {
    if (!run || run.ended || run.paused || run.choiceOpen || run.contractOpen || run.coreOpen || !dom.victoryOverlay.hidden) return;
    run.paused = true;
    simulationAccumulator = 0;
    clearInput();
    dom.pauseOverlay.hidden = false;
  }

  function resumeRun() {
    if (!run || run.ended || dom.pauseOverlay.hidden) return;
    if (document.hidden) return;
    // The explicit Continue gesture also restores audio after an OS interrupt.
    primeAudio();
    lifecycleSuspended = false;
    dom.pauseOverlay.hidden = true;
    simulationAccumulator = 0;
    lastFrameTime = performance.now();
    if (run.transition || run.pendingChoices > 0) {
      run.paused = true;
      processDecisionQueue();
    } else {
      run.paused = false;
    }
    syncAdaptiveMusic();
  }

  function toggleTimeScale() {
    if (!run || run.ended || run.mode === "tutorial") return;
    run.timeScale = run.timeScale === 2 ? 1 : 2;
    preferredTimeScale = run.timeScale;
    if (!safeStorageSet(SPEED_PREFERENCE_KEY, String(preferredTimeScale))) showStorageNotice();
    simulationAccumulator = 0;
    lastFrameTime = performance.now();
    updateRunUi();
    showToast(run.timeScale === 2 ? "已开启 2 倍速" : "已恢复 1 倍速");
  }

  function quitRun() {
    if (!run) return;
    if (run.mode === "tutorial") {
      if (!window.confirm("退出试火并回到整备吗？当前练习进度不会保存。")) return;
      returnHome();
      return;
    }
    const unfinishedRelay = run.build.activeRelayUpgradeId && !run.build.relayCompleted;
    const warning = unfinishedRelay
      ? "放弃本局不会记录最佳尝试，未完成的薪种接火也会熄灭，确定返回吗？"
      : "放弃本局不会记录最佳尝试，确定返回吗？";
    if (!window.confirm(warning)) return;
    returnHome();
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function circleCollision(first, second) {
    const dx = first.x - second.x;
    const dy = first.y - second.y;
    const radius = first.radius + second.radius;
    return dx * dx + dy * dy <= radius * radius;
  }

  function outsideCanvas(x, y, margin) {
    return x < -margin || y < -margin || x > ARENA_GEOMETRY.width + margin || y > ARENA_GEOMETRY.height + margin;
  }

  function chooseVisibleCardByIndex(index) {
    if (!run || !Number.isInteger(index) || index < 0 || index > 2) return false;
    const overlays = [dom.choiceOverlay, dom.coreOverlay, dom.contractOverlay];
    const visibleOverlay = overlays.find(function visible(overlay) { return overlay && !overlay.hidden; });
    if (!visibleOverlay) return false;
    const cards = visibleOverlay.querySelectorAll(".choice-card");
    const card = cards[index];
    if (!card || card.disabled) return false;
    if (run.choiceMode === "doctrine") run.doctrineChoiceHotkeys += 1;
    card.click();
    return true;
  }

  function armMajorThreatForDebug(enemyId, kind) {
    if (!run || run.ended || !Number.isSafeInteger(enemyId)) return false;
    const enemy = run.enemies.find(function findThreatCandidate(candidate) { return candidate.id === enemyId && !candidate.dead; });
    if (!enemy) return false;
    const dx = run.player.x - enemy.x;
    const dy = run.player.y - enemy.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const aimX = dx / distance;
    const aimY = dy / distance;
    clearMajorThreatPending(enemy);
    function markArmedThreat() {
      enemy.debugMajorThreatBypassCrossfire = true;
      enemy.majorThreatKind = kind;
      enemy.majorThreatReadyAt = run.elapsed;
      enemy.majorThreatWasBlocked = false;
      return true;
    }
    if (kind === "artillery" && enemy.kind === "artillery") {
      enemy.attackState = "windup";
      enemy.attackWindup = 0;
      enemy.lockedAimX = aimX;
      enemy.lockedAimY = aimY;
      return markArmedThreat();
    }
    if (kind === "runner" && enemy.kind === "runner") {
      enemy.dashState = "windup";
      enemy.dashWindup = 0;
      enemy.dashX = aimX;
      enemy.dashY = aimY;
      return markArmedThreat();
    }
    if (kind === "boss-pattern" && enemy.kind === "boss") {
      const spec = Logic.getBossAttackSpec(run.wave, enemy.bossPhase, enemy.patternSerial, run.curveProfile, run.dangerLevel);
      if (!spec) return false;
      enemy.chargeState = "idle";
      enemy.bossAttackState = "windup";
      enemy.bossAttackWindup = 0;
      enemy.bossPatternKind = spec.kind;
      enemy.patternAimX = aimX;
      enemy.patternAimY = aimY;
      if (spec.kind === "gap-ring") enemy.patternGapAngle = Math.atan2(aimY, aimX) + spec.gapOffset;
      return markArmedThreat();
    }
    if (kind === "boss-charge" && enemy.kind === "boss") {
      const chargeSpec = Logic.getBossChargeSpec(run.wave, enemy.bossPhase, run.curveProfile, run.dangerLevel);
      if (!chargeSpec) return false;
      enemy.bossAttackState = "idle";
      enemy.bossAttackWindup = 0;
      enemy.chargeState = "windup";
      enemy.chargeWindup = 0;
      enemy.chargeX = aimX;
      enemy.chargeY = aimY;
      return markArmedThreat();
    }
    if (kind === "boss-phase" && enemy.kind === "boss") {
      const transitionSpec = Logic.getBossTransitionSpec(run.wave, run.curveProfile, run.dangerLevel);
      if (!transitionSpec || transitionSpec.kind !== "boss-wave") return false;
      enemy.bossPhase = 2;
      enemy.bossAttackState = "idle";
      enemy.chargeState = "idle";
      enemy.phaseWavePending = true;
      enemy.bossPhasePause = FIXED_SIMULATION_STEP;
      return markArmedThreat();
    }
    return false;
  }

  helpUi = createEmberHelpUi({
    logic: Logic, content: EMBER_HELP_CONTENT, getProfile: function readHelpProfile() { return profile; },
    beforeOpen: function pauseBeforeHelp() {
      if (run && run.active && !run.ended) {
        if (!run.paused) pauseRun();
        if (!run.paused) return false;
      }
      clearInput();
      releasePointerOwnership();
      return true;
    },
    afterClose: function keepHelpClosedPaused() { clearInput(); releasePointerOwnership(); }
  });

  dom.startButton.addEventListener("click", startClassicFromHome);
  if (dom.loadoutToggleButton) dom.loadoutToggleButton.addEventListener("click", function toggleLoadout() {
    setLoadoutExpanded(dom.setupStack ? dom.setupStack.hidden : false);
  });
  if (dom.tutorialStartButton) dom.tutorialStartButton.addEventListener("click", startTutorial);
  if (dom.tutorialSkipButton) dom.tutorialSkipButton.addEventListener("click", skipTutorialToRun);
  if (dom.tutorialEnterRunButton) dom.tutorialEnterRunButton.addEventListener("click", skipTutorialToRun);
  if (dom.tutorialHomeButton) dom.tutorialHomeButton.addEventListener("click", returnHome);
  if (dom.archiveButton) dom.archiveButton.addEventListener("click", function openArchive() { openHomeDrawer("archive"); });
  if (dom.legacyButton) dom.legacyButton.addEventListener("click", function openLegacy() { openHomeDrawer("legacy"); });
  if (dom.homeDrawerClose) dom.homeDrawerClose.addEventListener("click", closeHomeDrawer);
  if (dom.homeDrawer) dom.homeDrawer.addEventListener("click", function closeDrawerBackdrop(event) {
    if (event.target === dom.homeDrawer) closeHomeDrawer();
  });
  if (dom.muteButton) dom.muteButton.addEventListener("click", function toggleMute() { setSoundMuted(!soundMuted); });
  if (dom.vibrationButton) dom.vibrationButton.addEventListener("click", function toggleVibration() { setVibrationEnabled(!vibrationEnabled); });
  if (dom.pauseMuteButton) dom.pauseMuteButton.addEventListener("click", function togglePauseMute() { setSoundMuted(!soundMuted); });
  ["music-toggle", "pause-music-toggle"].forEach(function connectMusicToggle(id) {
    const button = document.getElementById(id);
    if (button) button.addEventListener("click", function toggleMusic() { setMusicEnabled(!musicEnabled); });
  });
  ["music-volume", "pause-music-volume"].forEach(function connectMusicVolume(id) {
    const slider = document.getElementById(id);
    if (slider) slider.addEventListener("input", function changeMusicVolume(event) {
      setMusicVolume(Number(event.target.value) / 100);
    });
  });
  updateMusicToggleUi();
  if (dom.autoSwapToggle) dom.autoSwapToggle.addEventListener("click", function toggleHomeAutoSwap() {
    setAutoSwitchEnabled(!autoSwitchEnabled, { announce: true });
    updateAccountUi();
  });
  if (dom.pauseAutoSwapToggle) dom.pauseAutoSwapToggle.addEventListener("click", function togglePauseAutoSwap() {
    setAutoSwitchEnabled(!autoSwitchEnabled, { announce: true });
    updateRunUi();
  });
  dom.retryButton.addEventListener("click", retryRun);
  dom.returnHomeButton.addEventListener("click", returnHome);
  dom.timeScaleButton.addEventListener("click", toggleTimeScale);
  dom.flashButton.addEventListener("pointerdown", onFlashPointerDown);
  dom.flashButton.addEventListener("pointerup", onFlashPointerEnd);
  dom.flashButton.addEventListener("pointercancel", onFlashPointerEnd);
  dom.flashButton.addEventListener("lostpointercapture", onFlashPointerEnd);
  dom.flashButton.addEventListener("click", onFlashClick);
  dom.switchButton.addEventListener("pointerdown", onSwitchPointerDown);
  dom.switchButton.addEventListener("pointerup", onSwitchPointerEnd);
  dom.switchButton.addEventListener("pointercancel", onSwitchPointerEnd);
  dom.switchButton.addEventListener("lostpointercapture", onSwitchPointerEnd);
  dom.switchButton.addEventListener("click", onSwitchClick);
  dom.pauseButton.addEventListener("click", pauseRun);
  dom.resumeButton.addEventListener("click", resumeRun);
  dom.quitRunButton.addEventListener("click", quitRun);
  dom.victoryHomeButton.addEventListener("click", finishVictoryAtHome);
  dom.victoryContinueButton.addEventListener("click", continueAfterVictory);
  dom.exportSaveButton.addEventListener("click", exportSave);
  dom.importSaveButton.addEventListener("click", function chooseSaveFile() { dom.importSaveInput.click(); });
  dom.importSaveInput.addEventListener("change", function importSelectedSave() {
    importSaveFile(dom.importSaveInput.files && dom.importSaveInput.files[0]);
  });
  dom.resetSaveButton.addEventListener("click", function resetSave() {
    if (!window.confirm("确定清除全部余烬、传承、守火纪录、火印和承火者解锁吗？")) return;
    safeStorageRemove(SAVE_KEY);
    PREVIOUS_SAVE_KEYS.forEach(safeStorageRemove);
    safeStorageRemove(TUTORIAL_PREFERENCE_KEY);
    profile = loadProfile();
    tutorialPreference = loadTutorialPreference();
    updateAccountUi();
    showToast("传承已经重置");
  });

  dom.canvas.addEventListener("pointerdown", onMovePointerDown);
  dom.canvas.addEventListener("pointermove", onMovePointerMove);
  dom.canvas.addEventListener("pointerup", onMovePointerEnd);
  dom.canvas.addEventListener("pointercancel", onMovePointerEnd);
  dom.canvas.addEventListener("lostpointercapture", onMovePointerEnd);
  window.addEventListener("pointerup", onGlobalPointerEnd);
  window.addEventListener("pointercancel", onGlobalPointerEnd);
  window.addEventListener("keydown", function keyDown(event) {
    if (event.key === "Escape" && dom.homeDrawer && !dom.homeDrawer.hidden) {
      closeHomeDrawer();
      event.preventDefault();
      return;
    }
    if (event.key === "Tab" && dom.homeDrawer && !dom.homeDrawer.hidden) {
      const focusable = Array.from(dom.homeDrawer.querySelectorAll("button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
        else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
      }
    }
    const key = event.key.toLowerCase();
    const eventCode = event.code || "";
    const choiceIndex = eventCode.startsWith("Numpad")
      ? Number(eventCode.slice(6)) - 1
      : /^[123]$/.test(event.key) ? Number(event.key) - 1 : -1;
    if (!event.repeat && choiceIndex >= 0 && choiceIndex <= 2 && chooseVisibleCardByIndex(choiceIndex)) {
      event.preventDefault();
      return;
    }
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d"].includes(key)) {
      input.hasTarget = false;
      pressedKeys.add(key);
      event.preventDefault();
    }
    if (event.code === "Space" && run && run.active && !run.ended) {
      queueFlash();
      event.preventDefault();
    }
    if (key === "q" && run && run.active && !run.ended && !event.repeat) {
      queueWeaponSwitch();
      event.preventDefault();
    }
    if (event.key === "Escape" && run && !run.ended) {
      if (!dom.pauseOverlay.hidden) resumeRun();
      else pauseRun();
    }
  });
  window.addEventListener("keyup", function keyUp(event) {
    pressedKeys.delete(event.key.toLowerCase());
  });
  window.addEventListener("pointerdown", requestPlatformAudioResume, { capture: true, once: true });
  window.addEventListener("blur", function lostFocus() { suspendForLifecycle("blur"); });
  window.addEventListener("focus", function regainedFocus() { recoverFromLifecycle("focus"); });
  document.addEventListener("visibilitychange", function visibilityChanged() {
    if (document.hidden) suspendForLifecycle("hidden");
    else recoverFromLifecycle("visible");
  });
  window.addEventListener("pagehide", function pageHidden() { suspendForLifecycle("pagehide"); });
  window.addEventListener("pageshow", function pageShown() { recoverFromLifecycle("pageshow"); });
  document.addEventListener("freeze", function documentFrozen() { suspendForLifecycle("freeze"); });
  document.addEventListener("resume", function documentResumed() { recoverFromLifecycle("resume"); });
  document.addEventListener("ember:platform-audio-resume", requestPlatformAudioResume);
  document.addEventListener("ember:platform-haptics-preference", function platformHapticsPreference(event) {
    if (!event || !event.detail || typeof event.detail.enabled !== "boolean") return;
    setVibrationEnabled(event.detail.enabled);
  });
  document.addEventListener("ember:platform-snapshot-request", function platformSnapshotRequested() {
    emitPlatformEvent("ember:platform-snapshot", getPlatformGameSnapshot());
  });
  if (reducedMotionQuery) {
    if (typeof reducedMotionQuery.addEventListener === "function") reducedMotionQuery.addEventListener("change", updateReducedMotionPreference);
    else if (typeof reducedMotionQuery.addListener === "function") reducedMotionQuery.addListener(updateReducedMotionPreference);
  }
  window.addEventListener("resize", function resizedViewport() {
    // CSS coordinates and pointer capture become stale across rotation, but the
    // logical waypoint, held keyboard keys, and already accepted actions do not.
    releasePointerOwnership();
    resizeCanvas();
  });
  if (typeof ResizeObserver === "function") {
    canvasResizeObserver = new ResizeObserver(function resizedCanvasBox() {
      resizeCanvas();
    });
    canvasResizeObserver.observe(dom.canvas);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function resizedVisualViewport() {
      resizeCanvas();
    });
  }


  updateAccountUi();
  resizeCanvas();
  if (!storageAvailable) window.setTimeout(showStorageNotice, 80);
  window.requestAnimationFrame(frame);
})();
