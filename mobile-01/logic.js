(function attachEmberLoopLogic(globalScope) {
  "use strict";

  const SAVE_VERSION = 6;
  const MAX_STORED_INTEGER = Number.MAX_SAFE_INTEGER;
  const VICTORY_WAVE = 15;
  const MAX_RELAY_TARGET_WAVE = VICTORY_WAVE - 1;

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function freezeChild(key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  function clone(value) {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(clone);
    const copy = {};
    Object.keys(value).forEach(function copyKey(key) {
      copy[key] = clone(value[key]);
    });
    return copy;
  }

  const LEGACY_DEFS = deepFreeze({
    attack: {
      id: "attack",
      name: "余烬锋芒",
      description: "初始攻击 +4%",
      effectPerRank: 0.04,
      maxRank: 10
    },
    health: {
      id: "health",
      name: "余烬躯壳",
      description: "初始生命 +4%",
      effectPerRank: 0.04,
      maxRank: 10
    },
    initialLevel: {
      id: "initialLevel",
      name: "先行火种",
      description: "初始等级 +1（最高 5 级）",
      effectPerRank: 1,
      maxRank: 5
    }
  });

  const WEAPON_DEFS = deepFreeze({
    carbine: {
      id: "carbine",
      name: "燧火铳",
      shortName: "铳",
      role: "点杀 Boss、精英与纵列敌人",
      color: "#ffd08a",
      baseInterval: 0.36,
      damageMultiplier: 0.72,
      projectileSpeed: 520,
      attackRange: 340,
      drawDamageMultiplier: 2.6,
      drawPierce: 5
    },
    cinderRing: {
      id: "cinderRing",
      name: "烬轮",
      shortName: "轮",
      role: "回旋守界、清理包围与密集小怪",
      color: "#72e6f1",
      baseInterval: 0.64,
      damageMultiplier: 0.52,
      projectileSpeed: 310,
      attackRange: 210,
      baseProjectileCount: 6,
      drawDamageMultiplier: 1.45,
      drawRadius: 112,
      drawKnockback: 64
    }
  });

  /*
   * C13 keeps the legacy two-weapon table intact until the renderer and combat
   * runtime are migrated.  The new arsenal is exposed through an additive,
   * data-driven contract so existing saves and C08-C12 callers keep their exact
   * semantics while the C13 integration can opt in deliberately.
   */
  const C13_WEAPON_LEVEL_CAP = 5;
  const C13_DEFAULT_PAIR_ID = "sharp-ring";
  const C13_WEAPON_LEVEL_WEIGHTS = deepFreeze({ 1: 0, 2: 0.20, 3: 0.50, 4: 0.70, 5: 1 });
  const C13_WEAPON_OUTPUT_LIMITS = deepFreeze({
    levelOneParityTolerance: 0.05,
    maxSingleTargetAtLevelFive: 1.50,
    maxClusterAtLevelFive: 1.65,
    maxClearingBossAtLevelFive: 1.25,
    maxAutoSwitchDpsDelta: 0.05
  });
  const C13_COMBAT_CONCURRENCY = deepFreeze({
    equippedWeapons: 2,
    activeNormalAttackWeapons: 1,
    offhandNormalAttackWeapons: 0
  });

  const C13_WEAPON_DEFS = deepFreeze({
    carbine: {
      id: "carbine",
      name: "燧火铳",
      shortName: "铳",
      slot: "pursuit",
      role: "直线点杀、精英与首领",
      prototype: "line-pierce",
      color: "#ffd08a",
      maxLevel: C13_WEAPON_LEVEL_CAP,
      outputBudget: { singleTargetAtLevelFive: 1.50, clusterAtLevelFive: 1.20 },
      concurrency: { maxLiveProjectiles: 8, maxSpawnPerCycle: 8, maxEchoesPerCycle: 1, maxFields: 0 },
      drawSkill: { id: "carbine-draw", name: "贯穿拔焰", role: "满热入场时贯穿高威胁" }
    },
    fireflyBranch: {
      id: "fireflyBranch",
      name: "萤火枝",
      shortName: "萤",
      slot: "pursuit",
      role: "自动追踪、跳火清理散怪",
      prototype: "homing-chain",
      color: "#f6c86b",
      maxLevel: C13_WEAPON_LEVEL_CAP,
      outputBudget: { singleTargetAtLevelFive: 1.35, clusterAtLevelFive: 1.50 },
      concurrency: { maxLiveProjectiles: 8, maxSpawnPerCycle: 5, maxChainsPerProjectile: 1, maxFields: 0 },
      drawSkill: { id: "firefly-draw", name: "群萤追猎", role: "满热入场时放出受限群萤追击高威胁" }
    },
    cinderRing: {
      id: "cinderRing",
      name: "烬轮",
      shortName: "轮",
      slot: "clearing",
      role: "往返回旋、守住近身空间",
      prototype: "returning-orbit",
      color: "#72e6f1",
      maxLevel: C13_WEAPON_LEVEL_CAP,
      outputBudget: { singleTargetAtLevelFive: 1.25, clusterAtLevelFive: 1.65 },
      concurrency: { maxLiveProjectiles: 11, maxSpawnPerCycle: 11, maxGuardWavesPerCycle: 1, maxFields: 0 },
      drawSkill: { id: "ring-draw", name: "范围回潮", role: "满热入场时推开近身敌群" }
    },
    hearthSeed: {
      id: "hearthSeed",
      name: "星火种",
      shortName: "种",
      slot: "clearing",
      role: "投向密集敌群、延迟范围爆破",
      prototype: "delayed-area",
      color: "#ef9f78",
      maxLevel: C13_WEAPON_LEVEL_CAP,
      outputBudget: { singleTargetAtLevelFive: 1.25, clusterAtLevelFive: 1.65 },
      concurrency: { maxLiveProjectiles: 4, maxSpawnPerCycle: 4, maxFields: 1, maxFieldPulses: 2 },
      drawSkill: { id: "hearth-seed-draw", name: "三点开花", role: "满热入场时在敌群间立即开花" }
    }
  });

  const C13_WEAPON_LEVELS = deepFreeze({
    carbine: [
      { level: 1, name: "点火", description: "单发直线弹自动锁定最近威胁。", visibleEvolution: true, behavior: { projectileCount: 1 } },
      { level: 2, name: "淬膛", description: "弹速提高，普通弹额外贯穿 1 名敌人。", visibleEvolution: false, behavior: { projectileSpeedMultiplier: 1.08, pierceBonus: 1 } },
      { level: 3, name: "贯星", description: "每第 3 轮轰出一枚宽轨贯穿弹。", visibleEvolution: true, behavior: { railEvery: 3, railPierceBonus: 5 } },
      { level: 4, name: "快装", description: "攻击间隔缩短，贯星宽度提高。", visibleEvolution: false, behavior: { intervalMultiplier: 0.92, railWidthMultiplier: 1.12 } },
      { level: 5, name: "回响贯星", description: "宽轨经过后 0.16 秒沿原路线回响一次，造成 55% 伤害。", visibleEvolution: true, behavior: { echoCount: 1, echoDelay: 0.16, echoDamageMultiplier: 0.55 } }
    ],
    fireflyBranch: [
      { level: 1, name: "双萤", description: "每轮放出 2 枚低伤追踪火点。", visibleEvolution: true, behavior: { projectileCount: 2 } },
      { level: 2, name: "灵转", description: "追踪转向与飞行速度提高，减少追空。", visibleEvolution: false, behavior: { projectileSpeedMultiplier: 1.10, turnRateMultiplier: 1.15 } },
      { level: 3, name: "跳火", description: "首次命中后跳向 1 个尚未命中的邻近目标。", visibleEvolution: true, behavior: { chainCount: 1, bossRepeatChains: 0 } },
      { level: 4, name: "添枝", description: "普通轮次增加到 3 枚追踪火点。", visibleEvolution: false, behavior: { projectileCount: 3 } },
      { level: 5, name: "群萤", description: "每第 4 轮放出 5 枚群萤；全场同时最多 8 枚。", visibleEvolution: true, behavior: { burstEvery: 4, burstCount: 5, maxLiveProjectiles: 8 } }
    ],
    cinderRing: [
      { level: 1, name: "回轮", description: "6 枚轮刃环向飞出后返回。", visibleEvolution: true, behavior: { projectileCount: 6 } },
      { level: 2, name: "磨锋", description: "返回速度提高，返程可以再次命中。", visibleEvolution: false, behavior: { returnSpeedMultiplier: 1.10, returnCanRehit: true } },
      { level: 3, name: "守界", description: "增加 2 枚轮刃，命中近身普通敌会向外推。", visibleEvolution: true, behavior: { projectileBonus: 2, repelStrength: 20 } },
      { level: 4, name: "扩界", description: "安全半径与推力进一步提高。", visibleEvolution: false, behavior: { safetyRadiusMultiplier: 1.15, repelStrength: 28 } },
      { level: 5, name: "回潮", description: "一轮轮刃回收完成时释放 1 次扩张守界波。", visibleEvolution: true, behavior: { guardWavesPerCycle: 1 } }
    ],
    hearthSeed: [
      { level: 1, name: "落种", description: "投向最密集敌群，0.5 秒后圆形爆开。", visibleEvolution: true, behavior: { seedCount: 1, fuse: 0.50 } },
      { level: 2, name: "饱种", description: "爆炸半径提高 15%，落点预测更稳定。", visibleEvolution: false, behavior: { radiusMultiplier: 1.15 } },
      { level: 3, name: "分芽", description: "主爆炸后生成 3 个小型花瓣爆点。", visibleEvolution: true, behavior: { petalCount: 3 } },
      { level: 4, name: "催熟", description: "投掷周期缩短，花瓣爆点更快出现。", visibleEvolution: false, behavior: { intervalMultiplier: 0.90, petalDelay: 0.14 } },
      { level: 5, name: "暖域", description: "主爆炸留下 1.6 秒暖域并脉冲 2 次；场上最多 1 个。", visibleEvolution: true, behavior: { fieldDuration: 1.60, fieldPulses: 2, maxFields: 1 } }
    ]
  });

  const C13_WEAPON_PAIRS = deepFreeze([
    { id: "sharp-ring", name: "同炉双器", pursuitWeaponId: "carbine", clearingWeaponId: "cinderRing", weaponIds: ["carbine", "cinderRing"], recommended: true, description: "直线点杀配往返守界，最稳的默认组合。" },
    { id: "sharp-carbine", name: "贯星开花", pursuitWeaponId: "carbine", clearingWeaponId: "hearthSeed", weaponIds: ["carbine", "hearthSeed"], recommended: false, description: "直线点杀配远处爆区，近身容错较低。" },
    { id: "tide-ring", name: "群萤守界", pursuitWeaponId: "fireflyBranch", clearingWeaponId: "cinderRing", weaponIds: ["fireflyBranch", "cinderRing"], recommended: false, description: "自动追踪配近身守界，操作负担最低。" },
    { id: "tide-carbine", name: "萤种暖场", pursuitWeaponId: "fireflyBranch", clearingWeaponId: "hearthSeed", weaponIds: ["fireflyBranch", "hearthSeed"], recommended: false, description: "追踪散怪配延迟铺场，首领爆发较低。" }
  ]);

  const C13_WEAPON_PAIR_BY_ID = C13_WEAPON_PAIRS.reduce(function indexC13Pair(index, pair) {
    index[pair.id] = pair;
    return index;
  }, Object.create(null));

  const WEAPON_EVOLUTIONS = deepFreeze({
    railstar: {
      id: "railstar",
      weaponId: "carbine",
      name: "贯星膛",
      shortName: "贯星",
      description: "每第 3 轮轰出一枚宽轨贯星弹，重创纵列、精英与首领；常规射速略慢。",
      intervalMultiplier: 1.12
    },
    salvo: {
      id: "salvo",
      weaponId: "carbine",
      name: "连燧机",
      shortName: "连燧",
      description: "射击节奏加快，每第 3 轮形成三发窄扇齐射；单发火力略低。",
      intervalMultiplier: 0.86
    },
    ward: {
      id: "ward",
      weaponId: "cinderRing",
      name: "守界轮",
      shortName: "守界",
      description: "增加环向轮刃并建立安全界，近身敌人被推出、远处敌人被减速。",
      intervalMultiplier: 0.96
    },
    hunt: {
      id: "hunt",
      weaponId: "cinderRing",
      name: "猎杀号",
      shortName: "猎杀",
      description: "轮刃收束成三枚追猎回旋刃，往返都可撕裂同一强敌；清场覆盖降低。",
      intervalMultiplier: 1.08
    }
  });

  const DUAL_WEAPON_DOCTRINES = deepFreeze([
    {
      id: "rail-ward",
      name: "镇阵贯星",
      icon: "镇",
      carbineEvolutionId: "railstar",
      ringEvolutionId: "ward",
      description: "贯星膛点穿纵列，守界轮稳住近身压力。容错最高，爆发节奏偏稳。"
    },
    {
      id: "rail-hunt",
      name: "双猎回锋",
      icon: "猎",
      carbineEvolutionId: "railstar",
      ringEvolutionId: "hunt",
      description: "贯星弹与追猎轮共同压制精英和首领。单体最强，但面对四面包围更依赖走位。"
    },
    {
      id: "salvo-ward",
      name: "轮转火网",
      icon: "网",
      carbineEvolutionId: "salvo",
      ringEvolutionId: "ward",
      description: "连燧齐射接守界回旋，持续织出近中距离火网。清群稳定，瞬时单体较弱。"
    },
    {
      id: "salvo-hunt",
      name: "追焰疾轮",
      icon: "疾",
      carbineEvolutionId: "salvo",
      ringEvolutionId: "hunt",
      description: "高速连燧与追猎回锋共同追击威胁。换火频繁、上限高，失误时缺少守界保护。"
    }
  ]);

  const DUAL_WEAPON_DOCTRINE_BY_ID = DUAL_WEAPON_DOCTRINES.reduce(function indexDoctrine(index, doctrine) {
    index[doctrine.id] = doctrine;
    return index;
  }, Object.create(null));

  const CORE_EQUIPMENT = deepFreeze([
    {
      id: "return-core",
      name: "回火炉心",
      icon: "返",
      description: "焚火或借弹返热时，把同一份炉热预算分给双武器；总量不翻倍。"
    },
    {
      id: "twin-core",
      name: "并蒂炉心",
      icon: "双",
      description: "新成招的第一枚招眼可由任一武器生成；连接结果仍由熔铸武器决定。"
    },
    {
      id: "headhunt-core",
      name: "猎首炉心",
      icon: "猎",
      description: "成招打断高威胁后返还受限炉热；招眼目标死亡时可转移一次。"
    }
  ]);

  const CORE_EQUIPMENT_BY_ID = CORE_EQUIPMENT.reduce(function indexCore(index, core) {
    index[core.id] = core;
    return index;
  }, Object.create(null));

  const RUN_UPGRADES = deepFreeze([
    {
      id: "iron-heart",
      name: "铁铸心脏",
      description: "最大生命提高 20%",
      category: "survival",
      stat: "maxHealthMultiplier",
      operation: "multiply",
      value: 1.20
    },
    {
      id: "windstep",
      name: "踏风",
      description: "移动速度提高 10%",
      category: "survival",
      stat: "moveSpeedMultiplier",
      operation: "multiply",
      value: 1.10
    },
    {
      id: "ember-magnet",
      name: "余烬磁场",
      description: "吸取半径 +25%（上限 150px）；战中拾取经验会为副手加炉热，波末自动拾取只给经验",
      category: "survival",
      stat: "pickupRadiusMultiplier",
      operation: "multiply",
      value: 1.25
    },
    {
      id: "carbine-temper",
      name: "铳膛淬火",
      description: "新成招后的第一次铳击追加一个破势点",
      category: "weapon",
      weaponId: "carbine",
      stat: "carbineTechniqueBreakBonus",
      operation: "add",
      value: 1
    },
    {
      id: "carbine-rail",
      name: "贯星膛线",
      description: "燧火铳每发贯穿 +1，纵列敌人会变成一条火线",
      category: "weapon",
      weaponId: "carbine",
      stat: "carbinePierce",
      operation: "add",
      value: 1
    },
    {
      id: "carbine-salvo",
      name: "四拍齐射",
      description: "燧火铳每第 4 次攻击额外发射 1 枚偏转弹",
      category: "weapon",
      weaponId: "carbine",
      stat: "carbineBurstBonus",
      operation: "add",
      value: 1
    },
    {
      id: "carbine-brand",
      name: "熔印准星",
      description: "燧火铳命中熔印目标时伤害 +40%",
      category: "weapon",
      weaponId: "carbine",
      stat: "carbineMarkedDamageMultiplier",
      operation: "multiply",
      value: 1.40
    },
    {
      id: "ring-temper",
      name: "烬轮磨锋",
      description: "新成招后的第一次轮刃返程追加一段短回扫",
      category: "weapon",
      weaponId: "cinderRing",
      stat: "ringTechniqueSweepBonus",
      operation: "add",
      value: 1
    },
    {
      id: "ring-blades",
      name: "增生轮齿",
      description: "烬轮每轮多发射 1 枚轮刃",
      category: "weapon",
      weaponId: "cinderRing",
      stat: "ringProjectileBonus",
      operation: "add",
      value: 1
    },
    {
      id: "ring-gravity",
      name: "守轮界",
      description: "轮刃把安全界内的普通敌人向外推；界外敌人只减速，绝不会被拉近",
      category: "weapon",
      weaponId: "cinderRing",
      stat: "ringRepelStrength",
      operation: "add",
      value: 18
    },
    {
      id: "ring-afterburn",
      name: "余烬灼痕",
      description: "轮刃命中后追加该次伤害 18% 的短灼烧",
      category: "weapon",
      weaponId: "cinderRing",
      stat: "ringBurnRatio",
      operation: "add",
      value: 0.18
    },
    {
      id: "quick-temper",
      name: "急火养炉",
      description: "副手炉热自然积累速度 +25%",
      category: "switch",
      stat: "drawChargeRateMultiplier",
      operation: "multiply",
      value: 1.25
    },
    {
      id: "draw-force",
      name: "拔焰增压",
      description: "满炉热拔枪技伤害 +25%",
      category: "switch",
      stat: "drawDamageMultiplier",
      operation: "multiply",
      value: 1.25
    },
    {
      id: "fusion-feed",
      name: "合焰回流",
      description: "换火完成合焰后，为刚收起的武器返还 22% 炉热",
      category: "switch",
      stat: "fusionHeatRefund",
      operation: "add",
      value: 0.22
    },
    {
      id: "swap-haste",
      name: "换火疾奏",
      description: "换火后的 1.8 秒内攻击速度 +20%",
      category: "switch",
      stat: "swapAttackSpeedMultiplier",
      operation: "multiply",
      value: 1.20
    }
  ]);

  const RUN_UPGRADE_BY_ID = RUN_UPGRADES.reduce(function indexUpgrade(index, upgrade) {
    index[upgrade.id] = upgrade;
    return index;
  }, Object.create(null));

  const RELAY_FALLBACK_UPGRADE_IDS = deepFreeze({
    carbine: ["carbine-temper", "carbine-rail"],
    cinderRing: ["ring-temper", "ring-blades"]
  });

  const STAGE_CONTRACTS = deepFreeze([
    {
      id: "still-hunt",
      name: "疾猎令",
      shortDescription: "锋火增多，高威胁更快",
      description: "锋火携带者更多且移动更快；打断高威胁会预告下一名携火者。",
      primaryTraitId: "sharp",
      carrierSupplyMultiplier: 1.35,
      inverseModuleTraitId: "tide",
      enemySpeedMultiplier: 1.15,
      enemyHealthMultiplier: 1,
      rangedEnemyHealthMultiplier: 1,
      bossEnemyHealthMultiplier: 1,
      enemyDamageMultiplier: 1,
      enemyCountMultiplier: 1,
      rangedQuotaMultiplier: 1.15,
      xpMultiplier: 1,
      damageMultiplier: 1,
      maxHealthMultiplier: 1,
      projectileBonus: 0,
      pierceBonus: 0,
      stationaryChargeSeconds: 0.4,
      stationaryOverheatSeconds: 1.8,
      stationaryAttackSpeedMultiplier: 1.70,
      stationaryOverheatMultiplier: 0.90,
      killHealEvery: 0,
      killHealRatio: 0
    },
    {
      id: "surging-tide",
      name: "聚潮令",
      shortDescription: "潮火增多，完整清群精炼",
      description: "蜂群与引潮者增多；完整清掉敌群可精炼潮火，但经验略减。",
      primaryTraitId: "tide",
      carrierSupplyMultiplier: 1.35,
      inverseModuleTraitId: "sharp",
      enemySpeedMultiplier: 1,
      enemyHealthMultiplier: 0.82,
      rangedEnemyHealthMultiplier: 1,
      bossEnemyHealthMultiplier: 1,
      enemyDamageMultiplier: 1,
      enemyCountMultiplier: 1.25,
      rangedQuotaMultiplier: 1,
      xpMultiplier: 0.85,
      damageMultiplier: 1,
      maxHealthMultiplier: 1,
      projectileBonus: 0,
      pierceBonus: 0,
      stationaryChargeSeconds: 0,
      stationaryOverheatSeconds: 0,
      stationaryAttackSpeedMultiplier: 1,
      stationaryOverheatMultiplier: 1,
      killHealEvery: 0,
      killHealRatio: 0
    },
    {
      id: "lone-edge",
      name: "孤锋令",
      shortDescription: "火性稀少，合格击杀按双枚",
      description: "火性更少但携带者清楚可预判；最大生命 -15%，拔枪、返焰或合焰击杀按双枚。",
      primaryTraitId: null,
      carrierSupplyMultiplier: 0.72,
      inverseModuleTraitId: null,
      enemySpeedMultiplier: 1,
      enemyHealthMultiplier: 1,
      rangedEnemyHealthMultiplier: 1,
      bossEnemyHealthMultiplier: 1,
      enemyDamageMultiplier: 1.04,
      enemyCountMultiplier: 1,
      rangedQuotaMultiplier: 1,
      xpMultiplier: 1,
      damageMultiplier: 1,
      maxHealthMultiplier: 0.85,
      projectileBonus: 0,
      pierceBonus: 0,
      stationaryChargeSeconds: 0,
      stationaryOverheatSeconds: 0,
      stationaryAttackSpeedMultiplier: 1,
      stationaryOverheatMultiplier: 1,
      killHealEvery: 0,
      killHealRatio: 0
    }
  ]);

  const STAGE_CONTRACT_BY_ID = STAGE_CONTRACTS.reduce(function indexContract(index, contract) {
    index[contract.id] = contract;
    return index;
  }, Object.create(null));

  const ACTIVE_ABILITY = deepFreeze({
    id: "ember-flash",
    name: "薪火爆闪",
    cooldown: 4.8,
    distance: 100,
    invulnerability: 0.16,
    threadRadius: 26,
    normalRadius: 52,
    normalDamageMultiplier: 0.75,
    backfireRadius: 52,
    backfireDamageMultiplier: 0.75,
    bossDamageMultiplier: 0.5,
    returnMaxCount: 3,
    returnSpeed: 520,
    returnLifetime: 1.4,
    returnRadius: 4.5,
    returnDamageMultiplier: 0.25,
    returnBossDamageMultiplier: 0.25,
    markDuration: 8,
    fusionDamageMultiplier: 0.9,
    fusionBossDamageMultiplier: 0.25,
    huntWindow: 1.4,
    tideRadius: 96,
    tideKnockback: 80,
    edgeEmpoweredShots: 3,
    edgeDamageMultiplier: 1.5
  });

  const FIRE_TRAITS = deepFreeze({
    sharp: {
      id: "sharp",
      name: "锋火",
      icon: "◆",
      color: "#ffb45f",
      role: "点杀、打断与追猎"
    },
    tide: {
      id: "tide",
      name: "潮火",
      icon: "≋",
      color: "#63e1e8",
      role: "清群、控场与开路"
    }
  });

  const LOADOUT_DEFS = deepFreeze({
    "sharp-carbine": {
      id: "sharp-carbine",
      name: "锋火 · 断脉",
      shortName: "锋铳",
      traitId: "sharp",
      forgeWeaponId: "carbine",
      startWeaponId: "cinderRing",
      techniqueId: "sever-line",
      description: "烬轮起手，首次满热换铳即可锻出断脉火线。"
    },
    "sharp-ring": {
      id: "sharp-ring",
      name: "锋火 · 锁环",
      shortName: "锋轮",
      traitId: "sharp",
      forgeWeaponId: "cinderRing",
      startWeaponId: "carbine",
      techniqueId: "lock-loop",
      description: "燧火铳起手，首次满热换轮即可锻出锁锋回环。"
    },
    "tide-carbine": {
      id: "tide-carbine",
      name: "潮火 · 分焰",
      shortName: "潮铳",
      traitId: "tide",
      forgeWeaponId: "carbine",
      startWeaponId: "cinderRing",
      techniqueId: "tide-cross",
      description: "烬轮起手，首次满热换铳即可锻出分焰引潮。"
    },
    "tide-ring": {
      id: "tide-ring",
      name: "潮火 · 开界",
      shortName: "潮轮",
      traitId: "tide",
      forgeWeaponId: "cinderRing",
      startWeaponId: "carbine",
      techniqueId: "open-tide",
      description: "燧火铳起手，首次满热换轮即可锻出开界回潮。"
    }
  });

  const DANGER_DEFS = deepFreeze({
    0: {
      id: 0,
      name: "轻松",
      shortName: "轻松",
      description: "适合第一次守火；完整 15 波与正式纪录。",
      scoreMultiplier: 1,
      enemyHealthMultiplier: 1,
      enemyDamageMultiplier: 1,
      enemySpeedMultiplier: 1
    },
    1: {
      id: 1,
      name: "标准",
      shortName: "标准",
      description: "敌阵更硬更快，纪录分 ×1.15。",
      scoreMultiplier: 1.15,
      enemyHealthMultiplier: 1.14,
      enemyDamageMultiplier: 1.08,
      enemySpeedMultiplier: 1.04
    },
    2: {
      id: 2,
      name: "挑战",
      shortName: "挑战",
      description: "给熟悉构筑的玩家，纪录分 ×1.30。",
      scoreMultiplier: 1.3,
      enemyHealthMultiplier: 1.28,
      enemyDamageMultiplier: 1.16,
      enemySpeedMultiplier: 1.08
    }
  });

  const BEARER_DEFS = deepFreeze({
    "fire-walker": {
      id: "fire-walker",
      name: "持炬人·燧",
      icon: "巡",
      color: "#ffd08a",
      unlockedBy: null,
      role: "换火救场，爆闪可穿弹回火",
      description: "满热换火会从自身释放转火脉冲，击退并打断近身高威胁。",
      damageMultiplier: 1,
      healthMultiplier: 1,
      moveSpeedMultiplier: 1,
      flashStyle: "return"
    },
    "ridge-breaker": {
      id: "ridge-breaker",
      name: "踏焰客·岚",
      icon: "踏",
      color: "#ff9d57",
      unlockedBy: "first-expedition",
      role: "前出破阵，爆闪留下灼烧火线",
      description: "爆闪路径留下灼烧火线，适合截断追兵并持续压低敌群生命。",
      damageMultiplier: 1,
      healthMultiplier: 1,
      moveSpeedMultiplier: 1,
      flashStyle: "searing-line"
    },
    "tide-warden": {
      id: "tide-warden",
      name: "引潮师·澜",
      icon: "护",
      color: "#72e6f1",
      unlockedBy: "escort-keeper",
      role: "护身控场，爆闪终点掀起护火潮",
      description: "爆闪终点生成护火潮，清除近身弹幕、推开围敌并恢复少量生命。",
      damageMultiplier: 1,
      healthMultiplier: 1,
      moveSpeedMultiplier: 1,
      flashStyle: "guardian-tide"
    }
  });

  const ACHIEVEMENT_DEFS = deepFreeze([
    { id: "first-expedition", name: "一炉到底", description: "完成第 15 波。", unlock: "承火者：踏焰客·岚" },
    { id: "three-beacons-clean", name: "一波无伤", description: "任意完整波次未受到伤害。", unlock: "无伤火印" },
    { id: "escort-keeper", name: "余焰未损", description: "通关时生命不低于 80%。", unlock: "承火者：引潮师·澜" },
    { id: "mission-no-hit", name: "四式俱成", description: "一局中锻出四种不同成招。", unlock: "四式火印" },
    { id: "flash-weaver", name: "借箭还焰", description: "一局累计返还至少 12 枚敌弹。", unlock: "返焰火印" },
    { id: "dual-fire-art", name: "双器同炉", description: "一局换火至少 8 次并连接成招至少 3 次。", unlock: "同炉火印" },
    { id: "boss-breaker", name: "破宗门火", description: "以成招、拔火或合焰完成第 15 波破法。", unlock: "破宗火印" },
    { id: "s-rank", name: "薪尽而明", description: "完整守火获得 S 级评定。", unlock: "金色薪火章" }
  ]);

  const ACHIEVEMENT_BY_ID = ACHIEVEMENT_DEFS.reduce(function indexAchievement(index, achievement) {
    index[achievement.id] = achievement;
    return index;
  }, Object.create(null));

  function normalizeGrade(value) {
    return ["S", "A", "B", "C"].includes(value) ? value : null;
  }

  function classicRecordKey(bearerId, dangerLevel) {
    const resolvedBearerId = BEARER_DEFS[bearerId] ? bearerId : "fire-walker";
    const resolvedDanger = DANGER_DEFS[dangerLevel] ? Number(dangerLevel) : 0;
    return resolvedBearerId + ":" + resolvedDanger;
  }

  function attemptRecordKey(bearerId, dangerLevel, relayIntervened) {
    return classicRecordKey(bearerId, dangerLevel) + ":" + (relayIntervened === true ? "relay" : "clean");
  }

  /**
   * Attempt records deliberately compare only completed waves and then score.
   * A zero return is a stable tie: the first recorded attempt keeps its metadata.
   */
  function compareAttemptRecords(candidate, incumbent) {
    const candidateValid = candidate && typeof candidate === "object";
    const incumbentValid = incumbent && typeof incumbent === "object";
    if (!candidateValid) return incumbentValid ? -1 : 0;
    if (!incumbentValid) return 1;
    const candidateWaves = storedInteger(candidate.completedWaves, 0, VICTORY_WAVE);
    const incumbentWaves = storedInteger(incumbent.completedWaves, 0, VICTORY_WAVE);
    if (candidateWaves !== incumbentWaves) return candidateWaves > incumbentWaves ? 1 : -1;
    const candidateScore = storedInteger(candidate.score, 0);
    const incumbentScore = storedInteger(incumbent.score, 0);
    if (candidateScore !== incumbentScore) return candidateScore > incumbentScore ? 1 : -1;
    return 0;
  }

  function calculateClassicScore(input) {
    const source = input && typeof input === "object" ? input : {};
    const completedWaves = Math.min(VICTORY_WAVE, storedInteger(
      source.completedWaves === undefined ? source.completedWave : source.completedWaves,
      0,
      VICTORY_WAVE
    ));
    // W15 completion is the only authoritative victory signal. Callers may
    // provide a convenience flag, but it cannot promote an incomplete run.
    const victory = completedWaves >= VICTORY_WAVE;
    const finalHealthRatio = Math.max(0, Math.min(1, Number(source.finalHealthRatio) || 0));
    const damageTakenRatio = Math.max(0, Math.min(1, Number(source.damageTakenRatio) || 0));
    const completionRatio = completedWaves / VICTORY_WAVE;
    const techniqueIds = Array.isArray(source.techniqueIds)
      ? source.techniqueIds.filter(function knownTechnique(id, index, list) {
        return Boolean(TECHNIQUE_BY_ID[id]) && list.indexOf(id) === index;
      })
      : [];
    const uniqueTechniques = Math.min(4, storedInteger(source.uniqueTechniques, techniqueIds.length, 4));
    const dangerLevel = DANGER_DEFS[source.dangerLevel] ? Number(source.dangerLevel) : 0;
    const dangerMultiplier = DANGER_DEFS[dangerLevel].scoreMultiplier;
    const components = {
      progress: Math.round(completionRatio * 6000),
      survival: Math.round(completionRatio * 2000 * (finalHealthRatio * 0.55 + (1 - damageTakenRatio) * 0.45)),
      technique: Math.min(2000,
        Math.min(800, storedInteger(source.threatResolutions, 0, 1000) * 100) +
        Math.min(400, storedInteger(source.returnedBullets, 0, 1000) * 32) +
        Math.min(300, storedInteger(source.switchUses, 0, 1000) * 30) +
        Math.min(500, storedInteger(source.techniqueConnections, 0, 1000) * 125) +
        uniqueTechniques * 75 +
        Math.min(200, storedInteger(source.bossBreaks, 0, 10) * 200)
      )
    };
    const baseTotal = Object.keys(components).reduce(function total(sum, key) { return sum + components[key]; }, 0);
    const total = Math.round(baseTotal * dangerMultiplier);
    const grade = victory ? (baseTotal >= 8500 ? "S" : baseTotal >= 7000 ? "A" : baseTotal >= 5500 ? "B" : "C") : "未通关";
    return {
      total: total,
      grade: grade,
      baseTotal: baseTotal,
      components: components,
      dangerLevel: dangerLevel,
      dangerMultiplier: dangerMultiplier,
      completedWaves: completedWaves,
      victory: victory
    };
  }

  function evaluateClassicAchievements(input) {
    const source = input && typeof input === "object" ? input : {};
    const scoreCard = calculateClassicScore(source);
    const unlocked = [];
    const techniqueIds = Array.isArray(source.techniqueIds)
      ? source.techniqueIds.filter(function uniqueTechnique(id, index, list) { return Boolean(TECHNIQUE_BY_ID[id]) && list.indexOf(id) === index; })
      : [];
    const uniqueTechniques = Math.max(techniqueIds.length, storedInteger(source.uniqueTechniques, 0, 4));
    if (scoreCard.victory) unlocked.push("first-expedition");
    if (storedInteger(source.noHitWaves, 0) >= 1) unlocked.push("three-beacons-clean");
    if (scoreCard.victory && Number(source.finalHealthRatio) >= 0.8) unlocked.push("escort-keeper");
    if (uniqueTechniques >= 4) unlocked.push("mission-no-hit");
    if (storedInteger(source.returnedBullets, 0) >= 12) unlocked.push("flash-weaver");
    if (storedInteger(source.switchUses, 0) >= 8 && storedInteger(source.techniqueConnections, 0) >= 3) unlocked.push("dual-fire-art");
    if (scoreCard.victory && (storedInteger(source.bossBreaks, 0) >= 1 || (source.bossBreakMethod && source.bossBreakMethod !== "常规输出"))) unlocked.push("boss-breaker");
    if (scoreCard.grade === "S") unlocked.push("s-rank");
    return unlocked;
  }

  const TECHNIQUE_DEFS = deepFreeze({
    "sharp:carbine": {
      id: "sever-line",
      name: "断脉火线",
      traitId: "sharp",
      forgeWeaponId: "carbine",
      resultKind: "break-line",
      color: "#ffc56f",
      description: "铳眼由烬轮连接，拉出破势火线并打断高威胁。"
    },
    "sharp:cinderRing": {
      id: "lock-loop",
      name: "锁锋回环",
      traitId: "sharp",
      forgeWeaponId: "cinderRing",
      resultKind: "lock-loop",
      color: "#ff8f75",
      description: "轮眼由燧火铳连接，驱动轮刃再次穿体并推进破势。"
    },
    "tide:carbine": {
      id: "tide-cross",
      name: "分焰引潮",
      traitId: "tide",
      forgeWeaponId: "carbine",
      resultKind: "cross-burst",
      color: "#78edf0",
      description: "铳眼由烬轮连接，从招眼横向展开一次清场。"
    },
    "tide:cinderRing": {
      id: "open-tide",
      name: "开界回潮",
      traitId: "tide",
      forgeWeaponId: "cinderRing",
      resultKind: "safe-lane",
      color: "#81c9ff",
      description: "轮眼由燧火铳连接，展开向前推进的短安全廊。"
    }
  });

  const TECHNIQUE_BY_ID = Object.keys(TECHNIQUE_DEFS).reduce(function indexTechnique(index, key) {
    index[TECHNIQUE_DEFS[key].id] = TECHNIQUE_DEFS[key];
    return index;
  }, Object.create(null));

  const COUNTERFACTUAL_TEMPLATES = deepFreeze([
    {
      id: "heat-direction",
      name: "热向反证",
      description: "焚火改为给当前武器炉热；换火卫破甲后掉落相反火性。",
      productionEdge: "burn-heat-recipient",
      feedbackEdge: "switch-guard-drop"
    },
    {
      id: "tide-order",
      name: "领潮反证",
      description: "先杀引潮者产锋火，先清完整敌群产潮火；残群会按顺序散开或反扑。",
      productionEdge: "tide-kill-order",
      feedbackEdge: "tide-group-response"
    },
    {
      id: "refined-inversion",
      name: "精炼反证",
      description: "返焰或合焰击杀改掉相反火性；被熔印的携火敌转为可读近冲。",
      productionEdge: "refined-trait",
      feedbackEdge: "marked-carrier-response"
    },
    {
      id: "override-debt",
      name: "覆核反证",
      description: "覆核留下旧火性而不返热；下一名携旧火敌升级为换火卫。",
      productionEdge: "override-compensation",
      feedbackEdge: "old-trait-carrier"
    },
    {
      id: "eye-drift",
      name: "招眼反证",
      description: "成招后的下一枚碎片向招眼牵引；携火高威胁会避开招眼。",
      productionEdge: "fragment-pull-target",
      feedbackEdge: "carrier-eye-avoidance"
    },
    {
      id: "inverse-contract",
      name: "逆契反证",
      description: "契约主副火性供给互换；已预览的遭遇题保持不变。",
      productionEdge: "contract-supply",
      feedbackEdge: "encounter-question"
    }
  ]);

  const COUNTERFACTUAL_TEMPLATE_BY_ID = COUNTERFACTUAL_TEMPLATES.reduce(function indexTemplate(index, template) {
    index[template.id] = template;
    return index;
  }, Object.create(null));

  const ENCOUNTER_MODULES = deepFreeze({
    "sharp-hunt-line": { id: "sharp-hunt-line", name: "携锋狩列", primaryTraitId: "sharp", enemyFocus: "priority", carrierQuota: 4, switchGuardQuota: 0, tideCallerQuota: 0 },
    "tide-ring": { id: "tide-ring", name: "蜂潮回环", primaryTraitId: "tide", enemyFocus: "swarm", carrierQuota: 3, switchGuardQuota: 0, tideCallerQuota: 2 },
    "switch-formation": { id: "switch-formation", name: "换火封阵", primaryTraitId: "tide", enemyFocus: "switch", carrierQuota: 3, switchGuardQuota: 2, tideCallerQuota: 0 },
    "dual-path": { id: "dual-path", name: "双薪争路", primaryTraitId: "sharp", enemyFocus: "split", carrierQuota: 4, switchGuardQuota: 1, tideCallerQuota: 1 },
    "burn-store": { id: "burn-store", name: "焚存两难", primaryTraitId: "sharp", enemyFocus: "hazard", carrierQuota: 4, switchGuardQuota: 1, tideCallerQuota: 1 },
    "final-converge": { id: "final-converge", name: "终炉合围", primaryTraitId: "tide", enemyFocus: "alternating", carrierQuota: 5, switchGuardQuota: 1, tideCallerQuota: 1 }
  });

  const BOSS_PROFILES = deepFreeze({
    "ash-ram": {
      id: "ash-ram",
      name: "破阵者",
      shortDescription: "锁向冲锋、半血狂奔与六向余震",
      color: "#ff756b",
      movement: "charge",
      healthMultiplier: 1.75,
      bulletCapBonus: 6,
      patternReserve: 6,
      phaseThreshold: 0.50
    },
    "cinder-weaver": {
      id: "cinder-weaver",
      name: "织焰者",
      shortDescription: "中距离环绕、半血逆织与锁定扇射",
      color: "#b995ff",
      movement: "orbit",
      healthMultiplier: 2.25,
      bulletCapBonus: 6,
      patternReserve: 10,
      phaseThreshold: 0.52
    },
    "ember-core": {
      id: "ember-core",
      name: "薪火核心",
      shortDescription: "扇射冲锋、终焰相变与扩张光波",
      color: "#ffd06f",
      movement: "hybrid",
      healthMultiplier: 2.90,
      bulletCapBonus: 4,
      patternReserve: 12,
      phaseThreshold: 0.6
    },
    "fire-keeper": {
      id: "fire-keeper",
      name: "守火者",
      shortDescription: "锋潮换势、守火召援与终炉反证",
      color: "#ffcb70",
      movement: "hybrid",
      healthMultiplier: 3.05,
      bulletCapBonus: 4,
      patternReserve: 12,
      phaseThreshold: 0.58
    }
  });

  const BOSS_WAVE_SPEC = deepFreeze({
    kind: "boss-wave",
    count: 0,
    windup: 0.65,
    interval: 2.4,
    waveSpeed: 230,
    waveThickness: 18,
    damageMultiplier: 0.65
  });

  function assertNonNegativeInteger(value, label) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError((label || "value") + " must be a non-negative safe integer.");
    }
    return value;
  }

  function assertPositiveInteger(value, label) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new RangeError((label || "value") + " must be a positive safe integer.");
    }
    return value;
  }

  function storedInteger(value, fallback, maximum) {
    let numeric;
    try {
      numeric = Number(value);
    } catch (error) {
      return fallback;
    }
    if (!Number.isFinite(numeric) || numeric < 0) return fallback;
    return Math.min(Math.trunc(numeric), maximum === undefined ? MAX_STORED_INTEGER : maximum);
  }

  function validTraitId(value) {
    return typeof value === "string" && FIRE_TRAITS[value] ? value : null;
  }

  function oppositeTraitId(traitId) {
    return traitId === "sharp" ? "tide" : "sharp";
  }

  function validWeaponId(value) {
    return typeof value === "string" && WEAPON_DEFS[value] ? value : null;
  }

  function getTechniqueDefinition(traitId, weaponId) {
    const key = validTraitId(traitId) + ":" + validWeaponId(weaponId);
    return TECHNIQUE_DEFS[key] ? clone(TECHNIQUE_DEFS[key]) : null;
  }

  function getTechniqueById(techniqueId) {
    return TECHNIQUE_BY_ID[techniqueId] ? clone(TECHNIQUE_BY_ID[techniqueId]) : null;
  }

  function createDefaultForgeState() {
    return {
      slots: [],
      pendingCoreTraitId: null,
      currentTechniqueId: null,
      eye: null,
      techniqueHistory: [],
      nextStoredDouble: false,
      storedCount: 0,
      burnedCount: 0,
      overrideCount: 0,
      techniqueCount: 0
    };
  }

  function normalizeForgeEye(input) {
    const source = input && typeof input === "object" ? input : {};
    const technique = getTechniqueById(source.techniqueId);
    const generatorWeaponId = validWeaponId(source.generatorWeaponId);
    if (!technique || !generatorWeaponId) return null;
    return {
      techniqueId: technique.id,
      generatorWeaponId: generatorWeaponId,
      targetId: Number.isSafeInteger(source.targetId) ? source.targetId : null,
      x: Number.isFinite(source.x) ? source.x : 0,
      y: Number.isFinite(source.y) ? source.y : 0,
      wave: Number.isSafeInteger(source.wave) && source.wave > 0 ? source.wave : 1,
      transferUsed: source.transferUsed === true
    };
  }

  function normalizeForgeState(input) {
    const source = input && typeof input === "object" ? input : {};
    const state = createDefaultForgeState();
    state.slots = Array.isArray(source.slots)
      ? source.slots.map(validTraitId).filter(Boolean).slice(0, 3)
      : [];
    state.pendingCoreTraitId = validTraitId(source.pendingCoreTraitId);
    const currentTechnique = getTechniqueById(source.currentTechniqueId);
    state.currentTechniqueId = currentTechnique ? currentTechnique.id : null;
    state.eye = normalizeForgeEye(source.eye);
    if (!state.currentTechniqueId || (state.eye && state.eye.techniqueId !== state.currentTechniqueId)) state.eye = null;
    state.techniqueHistory = Array.isArray(source.techniqueHistory)
      ? source.techniqueHistory.filter(function validTechniqueHistory(item) {
        return item && getTechniqueById(item.techniqueId) && Number.isSafeInteger(item.wave) && item.wave > 0;
      }).slice(-24).map(function copyTechniqueHistory(item) {
        return { techniqueId: item.techniqueId, wave: item.wave };
      })
      : [];
    state.nextStoredDouble = source.nextStoredDouble === true;
    state.storedCount = storedInteger(source.storedCount, 0);
    state.burnedCount = storedInteger(source.burnedCount, 0);
    state.overrideCount = storedInteger(source.overrideCount, 0);
    state.techniqueCount = storedInteger(source.techniqueCount, state.techniqueHistory.length);
    return state;
  }

  function findForgePair(slots) {
    for (let first = 0; first < slots.length; first += 1) {
      for (let second = first + 1; second < slots.length; second += 1) {
        if (slots[first] === slots[second]) return { first: first, second: second, traitId: slots[first] };
      }
    }
    return null;
  }

  function collectFireFragment(inputState, traitId, options) {
    const original = normalizeForgeState(inputState);
    const trait = validTraitId(traitId);
    if (!trait) return { accepted: false, reason: "invalid-trait", state: original };
    const settings = options && typeof options === "object" ? options : {};
    const requestedCount = settings.count === 2 || original.nextStoredDouble ? 2 : 1;
    const state = normalizeForgeState(original);
    let formedCoreTraitId = null;
    let replacedCoreTraitId = null;
    let storedCount = 0;

    for (let index = 0; index < requestedCount; index += 1) {
      if (state.slots.length >= 3) return { accepted: false, reason: "slots-full", state: original };
      state.slots.push(trait);
      storedCount += 1;
      const pair = findForgePair(state.slots);
      if (!pair) continue;
      const pendingBefore = state.pendingCoreTraitId;
      if (pendingBefore && settings.canOverride !== true) {
        return { accepted: false, reason: "override-needs-direct-pickup", state: original };
      }
      state.slots.splice(pair.second, 1);
      state.slots.splice(pair.first, 1);
      if (pendingBefore) {
        replacedCoreTraitId = pendingBefore;
        state.overrideCount += 1;
      }
      state.pendingCoreTraitId = pair.traitId;
      formedCoreTraitId = pair.traitId;
    }

    state.nextStoredDouble = false;
    state.storedCount += storedCount;
    return {
      accepted: true,
      reason: null,
      state: state,
      formedCoreTraitId: formedCoreTraitId,
      replacedCoreTraitId: replacedCoreTraitId,
      storedCount: storedCount,
      consumedStoredDouble: original.nextStoredDouble
    };
  }

  function burnFireFragment(inputState, traitId) {
    const state = normalizeForgeState(inputState);
    const trait = validTraitId(traitId);
    if (!trait) return { accepted: false, reason: "invalid-trait", state: state };
    state.burnedCount += 1;
    return { accepted: true, reason: null, traitId: trait, state: state };
  }

  function forgeTechnique(inputState, weaponId, fullyCharged, waveNumber) {
    const state = normalizeForgeState(inputState);
    const weapon = validWeaponId(weaponId);
    if (!weapon) return { forged: false, reason: "invalid-weapon", state: state, technique: null };
    if (fullyCharged !== true) return { forged: false, reason: "not-full-heat", state: state, technique: null };
    if (!state.pendingCoreTraitId) return { forged: false, reason: "no-core", state: state, technique: null };
    const technique = getTechniqueDefinition(state.pendingCoreTraitId, weapon);
    if (!technique) return { forged: false, reason: "invalid-combination", state: state, technique: null };
    state.pendingCoreTraitId = null;
    state.currentTechniqueId = technique.id;
    state.eye = null;
    state.techniqueCount += 1;
    state.techniqueHistory.push({
      techniqueId: technique.id,
      wave: Number.isSafeInteger(waveNumber) && waveNumber > 0 ? waveNumber : 1
    });
    state.techniqueHistory = state.techniqueHistory.slice(-24);
    return { forged: true, reason: null, state: state, technique: technique };
  }

  function createTechniqueEye(inputState, input) {
    const state = normalizeForgeState(inputState);
    const settings = input && typeof input === "object" ? input : {};
    const technique = getTechniqueById(state.currentTechniqueId);
    const weaponId = validWeaponId(settings.weaponId);
    if (!technique || !weaponId) return { created: false, reason: "no-technique", state: state, eye: null };
    const twinFlexible = settings.twinFlexible === true && state.techniqueHistory.length > 0 &&
      state.techniqueHistory[state.techniqueHistory.length - 1].techniqueId === technique.id;
    if (weaponId !== technique.forgeWeaponId && !twinFlexible) {
      return { created: false, reason: "wrong-generator", state: state, eye: state.eye };
    }
    state.eye = {
      techniqueId: technique.id,
      generatorWeaponId: weaponId,
      targetId: Number.isSafeInteger(settings.targetId) ? settings.targetId : null,
      x: Number.isFinite(settings.x) ? settings.x : 0,
      y: Number.isFinite(settings.y) ? settings.y : 0,
      wave: Number.isSafeInteger(settings.wave) && settings.wave > 0 ? settings.wave : 1,
      transferUsed: false
    };
    return { created: true, reason: null, state: state, eye: clone(state.eye) };
  }

  function resolveTechniqueEye(inputState, weaponId) {
    const state = normalizeForgeState(inputState);
    const weapon = validWeaponId(weaponId);
    if (!state.eye || !weapon) return { connected: false, reason: "no-eye", state: state, technique: null, eye: null };
    if (state.eye.generatorWeaponId === weapon) {
      return { connected: false, reason: "same-weapon", state: state, technique: null, eye: clone(state.eye) };
    }
    const eye = clone(state.eye);
    const technique = getTechniqueById(eye.techniqueId);
    state.eye = null;
    return { connected: true, reason: null, state: state, technique: technique, eye: eye };
  }

  function settleTechniqueEyeOwnerDeath(inputState, input) {
    const state = normalizeForgeState(inputState);
    const settings = input && typeof input === "object" ? input : {};
    if (!state.eye || state.eye.targetId !== settings.targetId) return { changed: false, transferred: false, state: state };
    const nextTarget = settings.nextHighThreat && typeof settings.nextHighThreat === "object" ? settings.nextHighThreat : null;
    if (settings.headhunt === true && !state.eye.transferUsed && nextTarget && Number.isSafeInteger(nextTarget.id)) {
      state.eye.targetId = nextTarget.id;
      state.eye.x = Number.isFinite(nextTarget.x) ? nextTarget.x : state.eye.x;
      state.eye.y = Number.isFinite(nextTarget.y) ? nextTarget.y : state.eye.y;
      state.eye.transferUsed = true;
      return { changed: true, transferred: true, state: state };
    }
    state.eye.targetId = null;
    state.eye.x = Number.isFinite(settings.x) ? settings.x : state.eye.x;
    state.eye.y = Number.isFinite(settings.y) ? settings.y : state.eye.y;
    return { changed: true, transferred: false, state: state };
  }

  function clearForgeWaveState(inputState) {
    const state = normalizeForgeState(inputState);
    state.eye = null;
    return state;
  }

  function clearForgeStageState(inputState) {
    const state = clearForgeWaveState(inputState);
    state.slots = [];
    state.pendingCoreTraitId = null;
    return state;
  }

  function clearForgeRunState() {
    return createDefaultForgeState();
  }

  function getStageEncounterPreview(nextWave, seed, contractId) {
    const wave = assertPositiveInteger(nextWave, "nextWave");
    const stage = Math.min(3, getStageNumber(wave));
    const contract = STAGE_CONTRACT_BY_ID[contractId] || null;
    const focusLabels = {
      priority: "高威胁",
      swarm: "成组敌群",
      cross: "交叉来敌",
      switch: "换火护甲",
      split: "双路争夺",
      hazard: "焚存抉择",
      alternating: "锋潮交替"
    };
    if (contract) {
      const previewWave = wave <= 2 ? 3 : wave;
      const module = getEncounterModuleSpec(previewWave, seed, contract.id);
      if (module) {
        return {
          stage: stage,
          nextWave: wave,
          previewWave: previewWave,
          contractId: contract.id,
          moduleId: module.id,
          moduleName: module.name,
          enemyFocus: module.enemyFocus,
          enemyFocusLabel: focusLabels[module.enemyFocus] || module.name,
          primaryTraitId: module.primaryTraitId,
          primaryTraitName: FIRE_TRAITS[module.primaryTraitId].name
        };
      }
    }
    const focusOptions = ["priority", "swarm", "cross"];
    const focusIndex = hashSeed("preview:" + seed + ":" + stage) % focusOptions.length;
    const traitId = hashSeed("preview-trait:" + seed + ":" + stage) % 2 === 0 ? "sharp" : "tide";
    const focus = focusOptions[focusIndex];
    return {
      stage: stage,
      nextWave: wave,
      enemyFocus: focus,
      enemyFocusLabel: focusLabels[focus],
      primaryTraitId: traitId,
      primaryTraitName: FIRE_TRAITS[traitId].name
    };
  }

  function getEncounterModuleSpec(waveNumber, seed, contractId) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    if (wave <= 2 || wave % 5 === 0) return null;
    const contract = STAGE_CONTRACT_BY_ID[contractId] || null;
    const pools = {
      "still-hunt": ["sharp-hunt-line", "switch-formation"],
      "surging-tide": ["tide-ring", "burn-store"],
      "lone-edge": ["dual-path", "final-converge"]
    };
    if (!contract) return null;
    const pool = pools[contract.id];
    const index = hashSeed("module:" + seed + ":" + wave + ":" + (contract ? contract.id : "none")) % pool.length;
    const module = clone(ENCOUNTER_MODULES[pool[index]]);
    module.wave = wave;
    module.isInverse = Boolean(contract && contract.primaryTraitId && module.primaryTraitId !== contract.primaryTraitId);
    return module;
  }

  function normalizeRunReport(input) {
    const source = input && typeof input === "object" ? input : {};
    const doctrineId = typeof source.doctrineId === "string" && DUAL_WEAPON_DOCTRINE_BY_ID[source.doctrineId]
      ? source.doctrineId
      : null;
    const coreId = typeof source.coreId === "string" && CORE_EQUIPMENT_BY_ID[source.coreId] ? source.coreId : null;
    const contractSequence = Array.isArray(source.contractSequence)
      ? source.contractSequence.filter(function validContractId(id) { return Boolean(STAGE_CONTRACT_BY_ID[id]); }).slice(0, 3)
      : [];
    const techniqueHistory = Array.isArray(source.techniqueHistory)
      ? source.techniqueHistory.filter(function validTechniqueId(id) { return Boolean(TECHNIQUE_BY_ID[id]); }).slice(-24)
      : [];
    return {
      seed: storedInteger(source.seed, 0),
      completedWave: storedInteger(source.completedWave, 0, VICTORY_WAVE),
      outcome: source.outcome === "victory" ? "victory" : source.outcome === "death" ? "death" : "abandoned",
      doctrineId: doctrineId,
      coreId: coreId,
      contractSequence: contractSequence,
      techniqueHistory: techniqueHistory,
      storedCount: storedInteger(source.storedCount, 0),
      burnedCount: storedInteger(source.burnedCount, 0),
      bossBreakMethod: typeof source.bossBreakMethod === "string" ? source.bossBreakMethod.slice(0, 48) : "常规输出",
      relayIntervened: source.relayIntervened === true
    };
  }

  function resolveFireEvent(input) {
    const source = input && typeof input === "object" ? input : {};
    const contract = STAGE_CONTRACT_BY_ID[source.contractId] || null;
    const template = COUNTERFACTUAL_TEMPLATE_BY_ID[source.templateId] || null;
    const core = CORE_EQUIPMENT_BY_ID[source.coreId] || null;
    const activeWeaponId = validWeaponId(source.activeWeaponId) || "carbine";
    const holsteredWeaponId = activeWeaponId === "carbine" ? "cinderRing" : "carbine";
    const event = source.event && typeof source.event === "object" ? source.event : {};
    let traitId = validTraitId(source.baseTraitId) || (contract && contract.primaryTraitId) || "sharp";
    let count = 1;
    let heatTotal = 0;
    let primaryHeatRecipient = holsteredWeaponId;
    let compensationFragmentTraitId = null;
    const feedback = {};
    const trace = [];

    trace.push({ step: 1, edgeNames: ["base-encounter"], traitId: traitId });
    if (contract) {
      feedback.contractId = contract.id;
      feedback.carrierSupplyMultiplier = contract.carrierSupplyMultiplier;
    }
    trace.push({ step: 2, edgeNames: ["contract-supply", "contract-enemy-structure"], traitId: traitId });

    const refined = event.refined === true || ["return-fire", "fusion"].includes(event.killSource);
    const qualifiedDouble = Boolean(contract && contract.id === "lone-edge" &&
      ["draw", "return-fire", "fusion"].includes(event.killSource));
    feedback.refined = refined;
    trace.push({ step: 3, edgeNames: ["combat-qualifier"], refined: refined, qualifiedDouble: qualifiedDouble });

    if (template) {
      if (template.id === "heat-direction") {
        if (event.type === "burn") primaryHeatRecipient = activeWeaponId;
        if (event.armorBroken === true) traitId = oppositeTraitId(traitId);
      } else if (template.id === "tide-order" && event.enemyKind === "tidecaller") {
        if (event.leaderKilledFirst === true) traitId = "sharp";
        if (event.groupClearedFirst === true) traitId = "tide";
        feedback.tideGroupResponse = event.leaderKilledFirst === true ? "scatter" : "leader-windup";
      } else if (template.id === "refined-inversion" && refined) {
        traitId = oppositeTraitId(traitId);
        feedback.markedCarrierResponse = "readable-charge";
      } else if (template.id === "override-debt" && event.type === "override") {
        compensationFragmentTraitId = validTraitId(event.oldCoreTraitId);
        feedback.nextOldTraitCarrier = "switch-guard";
      } else if (template.id === "eye-drift") {
        feedback.fragmentPullTarget = event.afterTechniqueConnection === true ? "eye" : "player";
        feedback.carrierAvoidsEye = true;
      } else if (template.id === "inverse-contract" && contract && contract.primaryTraitId) {
        traitId = oppositeTraitId(traitId);
        feedback.encounterQuestionPreserved = true;
      }
    }
    trace.push({
      step: 4,
      edgeNames: template ? [template.productionEdge, template.feedbackEdge] : [],
      traitId: traitId,
      primaryHeatRecipient: primaryHeatRecipient
    });

    if (source.relayDouble === true || qualifiedDouble) count = 2;
    trace.push({ step: 5, edgeNames: ["stored-count"], count: count, relayConsumed: source.relayDouble === true });

    if (event.type === "burn") heatTotal = 0.30;
    if (event.type === "override" && !compensationFragmentTraitId) heatTotal = 0.18;
    if (source.heatBudgetAvailable === false) heatTotal = 0;
    const heatAllocations = { carbine: 0, cinderRing: 0 };
    if (heatTotal > 0) {
      if (core && core.id === "return-core") {
        heatAllocations[primaryHeatRecipient] = heatTotal * 0.5;
        heatAllocations[primaryHeatRecipient === "carbine" ? "cinderRing" : "carbine"] = heatTotal * 0.5;
      } else {
        heatAllocations[primaryHeatRecipient] = heatTotal;
      }
    }
    trace.push({ step: 6, edgeNames: ["heat-recipient", "heat-budget"], heatTotal: heatTotal, heatAllocations: clone(heatAllocations) });
    trace.push({ step: 7, edgeNames: ["forge-state-machine"], traitId: traitId, count: count });

    return {
      traitId: traitId,
      count: Math.min(2, count),
      heatTotal: heatTotal,
      heatAllocations: heatAllocations,
      compensationFragmentTraitId: compensationFragmentTraitId,
      feedback: feedback,
      relayConsumed: source.relayDouble === true,
      trace: trace
    };
  }

  function normalizeReachedWave(completedWaves, inputReachedWave, victory) {
    if (victory) return VICTORY_WAVE;
    const lowerBound = Math.max(1, completedWaves);
    const upperBound = Math.min(VICTORY_WAVE, completedWaves + 1);
    const reachedWave = storedInteger(inputReachedWave, upperBound, VICTORY_WAVE);
    return Math.max(lowerBound, Math.min(upperBound, reachedWave));
  }

  function normalizeAttemptRecord(input, expectedBearerId, expectedDangerLevel, expectedRelayIntervened) {
    if (!input || typeof input !== "object") return null;
    if (input.bearerId !== expectedBearerId) return null;
    if (!DANGER_DEFS[input.dangerLevel] || Number(input.dangerLevel) !== expectedDangerLevel) return null;
    if (input.relayIntervened !== expectedRelayIntervened) return null;
    const completedWaves = storedInteger(input.completedWaves, 0, VICTORY_WAVE);
    const victory = completedWaves >= VICTORY_WAVE;
    return {
      score: storedInteger(input.score, 0),
      baseScore: storedInteger(input.baseScore, 0),
      completedWaves: completedWaves,
      reachedWave: normalizeReachedWave(completedWaves, input.reachedWave, victory),
      outcome: victory ? "victory" : "death",
      bearerId: expectedBearerId,
      dangerLevel: expectedDangerLevel,
      loadoutId: LOADOUT_DEFS[input.loadoutId] ? input.loadoutId : "sharp-ring",
      relayIntervened: expectedRelayIntervened,
      recordedAt: typeof input.recordedAt === "string" ? input.recordedAt.slice(0, 40) : ""
    };
  }

  function createAttemptRecord(scoreCard, input, bearerId, dangerLevel, loadoutId, relayIntervened) {
    return {
      score: scoreCard.total,
      baseScore: scoreCard.baseTotal,
      completedWaves: scoreCard.completedWaves,
      reachedWave: normalizeReachedWave(scoreCard.completedWaves, input.reachedWave, scoreCard.victory),
      outcome: scoreCard.victory ? "victory" : "death",
      bearerId: bearerId,
      dangerLevel: dangerLevel,
      loadoutId: loadoutId,
      relayIntervened: relayIntervened,
      recordedAt: typeof input.recordedAt === "string" ? input.recordedAt.slice(0, 40) : ""
    };
  }

  function createDefaultSave() {
    return {
      version: SAVE_VERSION,
      embers: 0,
      upgrades: {
        attack: 0,
        health: 0,
        initialLevel: 0
      },
      relayUpgradeId: null,
      relayTargetWave: 0,
      relayCount: 0,
      achievements: {},
      classicAchievements: {},
      bearerEntitlements: {},
      selectedBearerId: "fire-walker",
      selectedLoadoutId: "sharp-ring",
      selectedDanger: 0,
      maxUnlockedDanger: 0,
      bestClassicScore: 0,
      bestClassicGrade: null,
      classicRuns: 0,
      classicVictories: 0,
      classicRecords: {},
      classicHistory: [],
      attemptRecords: {}
    };
  }

  /**
   * Converts untrusted/localStorage data into the only supported save shape.
   * Unknown fields are intentionally discarded so old or corrupt data cannot
   * leak into economy calculations.
   */
  function sanitizeSave(input) {
    const source = input && typeof input === "object" ? input : {};
    const upgrades = source.upgrades && typeof source.upgrades === "object"
      ? source.upgrades
      : {};
    const initialLevelValue = upgrades.initialLevel !== undefined
      ? upgrades.initialLevel
      : upgrades.startingLevel;

    const relayUpgradeId = typeof source.relayUpgradeId === "string" && RUN_UPGRADE_BY_ID[source.relayUpgradeId]
      ? source.relayUpgradeId
      : null;
    const relayTargetWave = Number.isSafeInteger(source.relayTargetWave) && source.relayTargetWave > 0 && source.relayTargetWave <= MAX_RELAY_TARGET_WAVE
      ? source.relayTargetWave
      : 0;
    const hasValidRelay = relayUpgradeId !== null && relayTargetWave > 0;
    const sourceAchievements = source.classicAchievements && typeof source.classicAchievements === "object"
      ? source.classicAchievements
      : {};
    const classicAchievements = {};
    ACHIEVEMENT_DEFS.forEach(function keepEarnedAchievement(achievement) {
      if (sourceAchievements[achievement.id] === true) classicAchievements[achievement.id] = true;
    });
    const bearerEntitlements = {};
    const sourceEntitlements = source.bearerEntitlements && typeof source.bearerEntitlements === "object" ? source.bearerEntitlements : {};
    const isLegacySave = Number.isSafeInteger(source.version) && source.version >= 1 && source.version < SAVE_VERSION;
    const legacyAchievements = isLegacySave && source.achievements && typeof source.achievements === "object" ? source.achievements : {};
    Object.keys(BEARER_DEFS).forEach(function keepBearerEntitlement(id) {
      const unlockId = BEARER_DEFS[id].unlockedBy;
      if (sourceEntitlements[id] === true || (unlockId && legacyAchievements[unlockId] === true)) bearerEntitlements[id] = true;
    });
    const requestedBearerId = typeof source.selectedBearerId === "string" ? source.selectedBearerId : "fire-walker";
    const requestedBearer = BEARER_DEFS[requestedBearerId];
    const selectedBearerId = requestedBearer && (!requestedBearer.unlockedBy || classicAchievements[requestedBearer.unlockedBy] || bearerEntitlements[requestedBearerId])
      ? requestedBearerId
      : "fire-walker";
    const selectedLoadoutId = typeof source.selectedLoadoutId === "string" && LOADOUT_DEFS[source.selectedLoadoutId]
      ? source.selectedLoadoutId
      : "sharp-ring";
    const migratedDangerUnlock = storedInteger(source.classicVictories, 0) > 0 ? 1 : 0;
    const maxUnlockedDanger = storedInteger(source.maxUnlockedDanger, migratedDangerUnlock, 2);
    const requestedDanger = DANGER_DEFS[source.selectedDanger] ? Number(source.selectedDanger) : 0;
    const selectedDanger = Math.min(requestedDanger, maxUnlockedDanger);
    const sourceVersion = Number.isSafeInteger(source.version) ? source.version : 0;
    const currentVersionSource = sourceVersion === SAVE_VERSION;
    const classicRecords = {};
    const sourceClassicRecords = source.classicRecords && typeof source.classicRecords === "object" ? source.classicRecords : {};
    Object.keys(sourceClassicRecords).slice(0, 12).forEach(function normalizeClassicRecord(key) {
      const entry = sourceClassicRecords[key] && typeof sourceClassicRecords[key] === "object" ? sourceClassicRecords[key] : {};
      if (currentVersionSource && entry.relayIntervened === true) return;
      const bearerId = BEARER_DEFS[entry.bearerId] ? entry.bearerId : "fire-walker";
      const dangerLevel = DANGER_DEFS[entry.dangerLevel] ? Number(entry.dangerLevel) : 0;
      const grade = normalizeGrade(entry.grade);
      if (!grade) return;
      classicRecords[classicRecordKey(bearerId, dangerLevel)] = {
        score: storedInteger(entry.score, 0),
        baseScore: storedInteger(entry.baseScore, 0),
        grade: grade,
        completedWaves: VICTORY_WAVE,
        bearerId: bearerId,
        dangerLevel: dangerLevel,
        loadoutId: LOADOUT_DEFS[entry.loadoutId] ? entry.loadoutId : "sharp-ring",
        recordedAt: typeof entry.recordedAt === "string" ? entry.recordedAt.slice(0, 40) : "",
        relayIntervened: false
      };
    });
    const classicHistory = Array.isArray(source.classicHistory)
      ? source.classicHistory.filter(function officialHistoryOnly(entry) {
        return !(currentVersionSource && entry && typeof entry === "object" && entry.relayIntervened === true);
      }).map(function normalizeClassicHistory(entry) {
        const historyEntry = entry && typeof entry === "object" ? entry : {};
        const bearerId = BEARER_DEFS[historyEntry.bearerId] ? historyEntry.bearerId : "fire-walker";
        const dangerLevel = DANGER_DEFS[historyEntry.dangerLevel] ? Number(historyEntry.dangerLevel) : 0;
        return {
          score: storedInteger(historyEntry.score, 0),
          grade: normalizeGrade(historyEntry.grade) || "C",
          bearerId: bearerId,
          dangerLevel: dangerLevel,
          loadoutId: LOADOUT_DEFS[historyEntry.loadoutId] ? historyEntry.loadoutId : "sharp-ring",
          recordedAt: typeof historyEntry.recordedAt === "string" ? historyEntry.recordedAt.slice(0, 40) : "",
          relayIntervened: false
        };
      }).slice(0, 5)
      : [];
    const attemptRecords = {};
    const sourceAttemptRecords = currentVersionSource && source.attemptRecords && typeof source.attemptRecords === "object"
      ? source.attemptRecords
      : {};
    Object.keys(BEARER_DEFS).forEach(function normalizeBearerAttempts(bearerId) {
      Object.keys(DANGER_DEFS).forEach(function normalizeDangerAttempts(dangerKey) {
        const dangerLevel = Number(dangerKey);
        [false, true].forEach(function normalizeRelayAttempt(relayIntervened) {
          const key = attemptRecordKey(bearerId, dangerLevel, relayIntervened);
          const normalized = normalizeAttemptRecord(sourceAttemptRecords[key], bearerId, dangerLevel, relayIntervened);
          if (normalized) attemptRecords[key] = normalized;
        });
      });
    });
    return {
      version: SAVE_VERSION,
      embers: storedInteger(source.embers, 0),
      upgrades: {
        attack: storedInteger(upgrades.attack, 0),
        health: storedInteger(upgrades.health, 0),
        initialLevel: storedInteger(initialLevelValue, 0, LEGACY_DEFS.initialLevel.maxRank)
      },
      relayUpgradeId: hasValidRelay ? relayUpgradeId : null,
      relayTargetWave: hasValidRelay ? relayTargetWave : 0,
      relayCount: storedInteger(source.relayCount, 0),
      achievements: clone(classicAchievements),
      classicAchievements: classicAchievements,
      bearerEntitlements: bearerEntitlements,
      selectedBearerId: selectedBearerId,
      selectedLoadoutId: selectedLoadoutId,
      selectedDanger: selectedDanger,
      maxUnlockedDanger: maxUnlockedDanger,
      bestClassicScore: storedInteger(source.bestClassicScore, 0),
      bestClassicGrade: normalizeGrade(source.bestClassicGrade),
      classicRuns: storedInteger(source.classicRuns, 0),
      classicVictories: storedInteger(source.classicVictories, 0),
      classicRecords: classicRecords,
      classicHistory: classicHistory,
      attemptRecords: attemptRecords
    };
  }

  function getUnlockedBearerIds(inputSave) {
    const save = sanitizeSave(inputSave);
    return Object.keys(BEARER_DEFS).filter(function bearerUnlocked(id) {
      const bearer = BEARER_DEFS[id];
      return !bearer.unlockedBy || save.classicAchievements[bearer.unlockedBy] === true || save.bearerEntitlements[id] === true;
    });
  }

  function selectBearer(inputSave, bearerId) {
    const save = sanitizeSave(inputSave);
    if (!BEARER_DEFS[bearerId] || !getUnlockedBearerIds(save).includes(bearerId)) {
      return { selected: false, save: save };
    }
    save.selectedBearerId = bearerId;
    return { selected: true, save: save };
  }

  function selectLoadout(inputSave, loadoutId) {
    const save = sanitizeSave(inputSave);
    if (!LOADOUT_DEFS[loadoutId]) return { selected: false, save: save };
    save.selectedLoadoutId = loadoutId;
    return { selected: true, save: save };
  }

  function selectDanger(inputSave, dangerLevel) {
    const save = sanitizeSave(inputSave);
    const resolvedDanger = Number(dangerLevel);
    if (!DANGER_DEFS[resolvedDanger] || resolvedDanger > save.maxUnlockedDanger) return { selected: false, save: save };
    save.selectedDanger = resolvedDanger;
    return { selected: true, save: save };
  }

  function recordClassicResult(inputSave, inputResult) {
    const save = sanitizeSave(inputSave);
    const source = inputResult && typeof inputResult === "object" ? inputResult : {};
    const scoreCard = calculateClassicScore(source);
    const earnedIds = evaluateClassicAchievements(source);
    const newlyEarned = [];
    const unlockedBefore = new Set(getUnlockedBearerIds(save));
    earnedIds.forEach(function earnClassicAchievement(id) {
      if (!ACHIEVEMENT_BY_ID[id]) return;
      if (!save.classicAchievements[id]) newlyEarned.push(id);
      save.classicAchievements[id] = true;
      save.achievements[id] = true;
    });
    save.classicRuns = Math.min(MAX_STORED_INTEGER, save.classicRuns + 1);
    const bearerId = BEARER_DEFS[source.bearerId] ? source.bearerId : "fire-walker";
    const dangerLevel = DANGER_DEFS[source.dangerLevel] ? Number(source.dangerLevel) : 0;
    const loadoutId = LOADOUT_DEFS[source.loadoutId] ? source.loadoutId : save.selectedLoadoutId;
    const relayIntervened = source.relayIntervened === true;
    const attemptKey = attemptRecordKey(bearerId, dangerLevel, relayIntervened);
    const attemptRecord = createAttemptRecord(scoreCard, source, bearerId, dangerLevel, loadoutId, relayIntervened);
    const previousAttemptRecord = save.attemptRecords[attemptKey] ? clone(save.attemptRecords[attemptKey]) : null;
    const attemptRecordUpdated = compareAttemptRecords(attemptRecord, previousAttemptRecord) > 0;
    if (attemptRecordUpdated) save.attemptRecords[attemptKey] = clone(attemptRecord);
    const officialRecordEligible = scoreCard.victory && !relayIntervened;
    const officialRecordKey = officialRecordEligible ? classicRecordKey(bearerId, dangerLevel) : null;
    let officialRecordUpdated = false;
    if (scoreCard.victory) {
      save.classicVictories = Math.min(MAX_STORED_INTEGER, save.classicVictories + 1);
      save.maxUnlockedDanger = Math.max(save.maxUnlockedDanger, Math.min(2, dangerLevel + 1));
    }
    if (officialRecordEligible) {
      const previous = save.classicRecords[officialRecordKey];
      if (!previous || scoreCard.total > previous.score) {
        save.classicRecords[officialRecordKey] = {
          score: scoreCard.total,
          baseScore: scoreCard.baseTotal,
          grade: scoreCard.grade,
          completedWaves: VICTORY_WAVE,
          bearerId: bearerId,
          dangerLevel: dangerLevel,
          loadoutId: loadoutId,
          recordedAt: typeof source.recordedAt === "string" ? source.recordedAt.slice(0, 40) : "",
          relayIntervened: false
        };
        officialRecordUpdated = true;
      }
      save.classicHistory.unshift({
        score: scoreCard.total,
        grade: scoreCard.grade,
        bearerId: bearerId,
        dangerLevel: dangerLevel,
        loadoutId: loadoutId,
        recordedAt: typeof source.recordedAt === "string" ? source.recordedAt.slice(0, 40) : "",
        relayIntervened: false
      });
      save.classicHistory = save.classicHistory.slice(0, 5);
    }
    if (officialRecordEligible && scoreCard.total > save.bestClassicScore) {
      save.bestClassicScore = scoreCard.total;
      save.bestClassicGrade = scoreCard.grade;
    }
    const unlockedAfter = getUnlockedBearerIds(save);
    return {
      save: save,
      scoreCard: scoreCard,
      attemptRecordKey: attemptKey,
      attemptRecord: clone(attemptRecord),
      previousAttemptRecord: previousAttemptRecord,
      bestAttemptRecord: clone(save.attemptRecords[attemptKey]),
      attemptRecordUpdated: attemptRecordUpdated,
      officialRecordEligible: officialRecordEligible,
      officialRecordKey: officialRecordKey,
      officialRecordUpdated: officialRecordUpdated,
      newlyEarnedAchievementIds: newlyEarned,
      newlyUnlockedBearerIds: unlockedAfter.filter(function newlyUnlocked(id) { return !unlockedBefore.has(id); })
    };
  }

  /** Replaces the single pending relay slot. Invalid pairs safely clear it. */
  function setPendingRelay(inputSave, upgradeId, targetWave) {
    const save = sanitizeSave(inputSave);
    if (!RUN_UPGRADE_BY_ID[upgradeId] || !Number.isSafeInteger(targetWave) || targetWave < 1 || targetWave > MAX_RELAY_TARGET_WAVE) {
      save.relayUpgradeId = null;
      save.relayTargetWave = 0;
      return save;
    }
    save.relayUpgradeId = upgradeId;
    save.relayTargetWave = targetWave;
    return save;
  }

  function clearPendingRelay(inputSave) {
    const save = sanitizeSave(inputSave);
    save.relayUpgradeId = null;
    save.relayTargetWave = 0;
    return save;
  }

  /** Death payout: floor(5 * highestWave^1.25). */
  function getEmberReward(highestWave) {
    const wave = assertNonNegativeInteger(highestWave, "highestWave");
    return Math.floor(5 * Math.pow(wave, 1.25));
  }

  /** Permanent-upgrade cost: floor(10 * 1.45^rank). */
  function getLegacyCost(rank) {
    const normalizedRank = assertNonNegativeInteger(rank, "rank");
    return Math.floor(10 * Math.pow(1.45, normalizedRank));
  }

  function normalizeLegacyId(id) {
    return id === "startingLevel" ? "initialLevel" : id;
  }

  /**
   * Attempts one permanent purchase without mutating the caller's save.
   * Returns { ok, reason, cost, legacyId, save }.
   */
  function purchaseLegacy(inputSave, requestedId) {
    const save = sanitizeSave(inputSave);
    const legacyId = normalizeLegacyId(requestedId);
    const definition = LEGACY_DEFS[legacyId];
    if (!definition) {
      return {
        ok: false,
        reason: "unknown-legacy",
        cost: 0,
        legacyId: legacyId,
        save: save
      };
    }

    const rank = save.upgrades[legacyId];
    if (definition.maxRank !== null && rank >= definition.maxRank) {
      return {
        ok: false,
        reason: "max-rank",
        cost: 0,
        legacyId: legacyId,
        save: save
      };
    }

    const cost = getLegacyCost(rank);
    if (!Number.isSafeInteger(cost) || save.embers < cost) {
      return {
        ok: false,
        reason: "insufficient-embers",
        cost: cost,
        legacyId: legacyId,
        save: save
      };
    }

    const next = sanitizeSave(save);
    next.embers -= cost;
    next.upgrades[legacyId] += 1;
    return {
      ok: true,
      reason: null,
      cost: cost,
      legacyId: legacyId,
      save: next
    };
  }

  function getLegacyBonuses(inputSave) {
    const save = sanitizeSave(inputSave);
    const attackRank = Math.min(save.upgrades.attack, LEGACY_DEFS.attack.maxRank);
    const healthRank = Math.min(save.upgrades.health, LEGACY_DEFS.health.maxRank);
    return {
      attackMultiplier: 1 + attackRank * LEGACY_DEFS.attack.effectPerRank,
      healthMultiplier: 1 + healthRank * LEGACY_DEFS.health.effectPerRank,
      initialLevel: save.upgrades.initialLevel
    };
  }

  function cappedFinite(value) {
    return Number.isFinite(value) ? value : Number.MAX_VALUE;
  }

  /*
   * RC2 uses a fixed fifteen-wave pacing spine.  The old exponential formula
   * remains the long-range fallback for defensive callers, but the playable
   * run now has explicit peaks (5/10/15) and payoff valleys (6/11).
   * Values are local balancing factors, not copied from a reference game.
   */
  const WAVE_PACING = deepFreeze({
    1:  { phase: "learn",  health: 0.85, damage: 0.78, count: 0.78, speed: 0.96, batch: 1, maxBatch: 1, interval: 0.96, ranged: 0, bullets: 6,  artillery: 0, bossAdds: 0.50, bossRanged: 0, projectile: 0.52, recovery: 0.15, pattern: "standard",    encounterCount: 0.95, encounterHealth: 1.00, runners: 0.00, swarms: 0.00, carriers: 0, guards: 0, callers: 0, banner: "拖动移动 · 武器会自动攻击", name: "先动起来" },
    2:  { phase: "learn",  health: 0.88, damage: 0.80, count: 0.82, speed: 0.97, batch: 1, maxBatch: 1, interval: 0.94, ranged: 0, bullets: 6,  artillery: 0, bossAdds: 0.50, bossRanged: 0, projectile: 0.54, recovery: 0.12, pattern: "standard",    encounterCount: 0.95, encounterHealth: 1.00, runners: 0.06, swarms: 0.12, carriers: 0, guards: 0, callers: 0, banner: "保持移动 · 经验会自动收取", name: "绕开人群" },
    3:  { phase: "learn",  health: 0.90, damage: 0.82, count: 0.82, speed: 0.98, batch: 1, maxBatch: 2, interval: 0.92, ranged: 0, bullets: 7,  artillery: 0, bossAdds: 0.50, bossRanged: 0, projectile: 0.55, recovery: 0.10, pattern: "standard",    encounterCount: 1.00, encounterHealth: 0.92, runners: 0.28, swarms: 0.08, carriers: 1, guards: 0, callers: 0, banner: "别停下来 · 武器会自动换火", name: "快敌入场" },
    4:  { phase: "build",  health: 0.95, damage: 0.88, count: 0.80, speed: 1.00, batch: 1, maxBatch: 2, interval: 1.00, ranged: 1, bullets: 8,  artillery: 1, bossAdds: 0.50, bossRanged: 0, projectile: 0.56, recovery: 0.12, pattern: "crossfire",   encounterCount: 0.90, encounterHealth: 1.00, runners: 0.05, swarms: 0.05, carriers: 1, guards: 0, callers: 0, banner: "看见亮线就绕开 · 闪是救命键", name: "第一道火线" },
    5:  { phase: "peak",   health: 0.68, damage: 0.72, count: 0.50, speed: 0.96, batch: 1, maxBatch: 1, interval: 1.08, ranged: 0, bullets: 8,  artillery: 0, bossAdds: 0.50, bossRanged: 0, projectile: 0.42, recovery: 0.35, pattern: "boss",        encounterCount: 1.00, encounterHealth: 1.00, runners: 0.00, swarms: 0.00, carriers: 1, guards: 0, callers: 0, banner: "离开实线 · 招式后就是反击", name: "破阵者" },
    6:  { phase: "relax",  health: 0.72, damage: 0.72, count: 0.68, speed: 0.95, batch: 1, maxBatch: 2, interval: 0.92, ranged: 0, bullets: 8,  artillery: 0, bossAdds: 0.50, bossRanged: 0, projectile: 0.56, recovery: 0.14, pattern: "dense-swarm", encounterCount: 1.05, encounterHealth: 0.82, runners: 0.04, swarms: 0.48, carriers: 2, guards: 0, callers: 0, banner: "压力回落 · 享受变强", name: "收割波" },
    7:  { phase: "build",  health: 0.82, damage: 0.80, count: 0.80, speed: 0.98, batch: 2, maxBatch: 2, interval: 1.00, ranged: 1, bullets: 10, artillery: 0, bossAdds: 0.55, bossRanged: 0, projectile: 0.60, recovery: 0.10, pattern: "standard",    encounterCount: 1.00, encounterHealth: 1.00, runners: 0.22, swarms: 0.08, carriers: 2, guards: 0, callers: 0, banner: "快敌和远程会轮流出现", name: "快慢轮换" },
    8:  { phase: "build",  health: 0.88, damage: 0.86, count: 0.84, speed: 0.99, batch: 2, maxBatch: 2, interval: 1.05, ranged: 1, bullets: 12, artillery: 1, bossAdds: 0.55, bossRanged: 0, projectile: 0.62, recovery: 0.08, pattern: "crossfire",   encounterCount: 0.95, encounterHealth: 1.00, runners: 0.06, swarms: 0.06, carriers: 2, guards: 0, callers: 0, banner: "先躲亮线 · 再清近身", name: "长线预警" },
    9:  { phase: "build",  health: 0.94, damage: 0.92, count: 0.88, speed: 1.00, batch: 2, maxBatch: 2, interval: 1.08, ranged: 2, bullets: 14, artillery: 1, bossAdds: 0.60, bossRanged: 1, projectile: 0.64, recovery: 0.12, pattern: "crossfire",   encounterCount: 0.90, encounterHealth: 1.00, runners: 0.08, swarms: 0.06, carriers: 2, guards: 1, callers: 0, banner: "走进安全缺口", name: "首领预演" },
    10: { phase: "peak",   health: 0.72, damage: 0.74, count: 0.62, speed: 1.00, batch: 1, maxBatch: 2, interval: 1.12, ranged: 1, bullets: 14, artillery: 0, bossAdds: 0.62, bossRanged: 1, projectile: 0.45, recovery: 0.40, pattern: "boss",        encounterCount: 1.00, encounterHealth: 1.00, runners: 0.00, swarms: 0.00, carriers: 2, guards: 0, callers: 0, banner: "进入缺口 · 不要追弹", name: "织焰者" },
    11: { phase: "relax",  health: 0.60, damage: 0.68, count: 0.62, speed: 0.94, batch: 1, maxBatch: 2, interval: 0.96, ranged: 0, bullets: 10, artillery: 0, bossAdds: 0.62, bossRanged: 0, projectile: 0.58, recovery: 0.16, pattern: "dense-swarm", encounterCount: 1.10, encounterHealth: 0.80, runners: 0.02, swarms: 0.54, carriers: 2, guards: 0, callers: 0, banner: "压力回落 · 把成长打出来", name: "收割波" },
    12: { phase: "build",  health: 0.72, damage: 0.78, count: 0.76, speed: 0.97, batch: 2, maxBatch: 3, interval: 1.05, ranged: 2, bullets: 14, artillery: 1, bossAdds: 0.64, bossRanged: 1, projectile: 0.64, recovery: 0.10, pattern: "standard",    encounterCount: 1.00, encounterHealth: 1.00, runners: 0.10, swarms: 0.08, carriers: 2, guards: 0, callers: 0, banner: "一次只解一道威胁", name: "旧题复现" },
    13: { phase: "build",  health: 0.82, damage: 0.86, count: 0.84, speed: 1.00, batch: 2, maxBatch: 3, interval: 1.06, ranged: 2, bullets: 16, artillery: 1, bossAdds: 0.66, bossRanged: 1, projectile: 0.68, recovery: 0.08, pattern: "standard",    encounterCount: 1.05, encounterHealth: 0.95, runners: 0.14, swarms: 0.12, carriers: 3, guards: 1, callers: 1, banner: "先处理带标记的高威胁", name: "精英挑战" },
    14: { phase: "build",  health: 0.90, damage: 0.94, count: 0.90, speed: 1.02, batch: 2, maxBatch: 3, interval: 1.10, ranged: 3, bullets: 18, artillery: 2, bossAdds: 0.68, bossRanged: 2, projectile: 0.72, recovery: 0.12, pattern: "crossfire",   encounterCount: 0.90, encounterHealth: 1.00, runners: 0.10, swarms: 0.08, carriers: 3, guards: 1, callers: 0, banner: "离开亮线 · 再进入缺口", name: "终局预演" },
    15: { phase: "peak",   health: 0.72, damage: 0.78, count: 0.68, speed: 1.02, batch: 1, maxBatch: 2, interval: 1.14, ranged: 2, bullets: 18, artillery: 0, bossAdds: 0.68, bossRanged: 2, projectile: 0.48, recovery: 0.00, pattern: "boss",        encounterCount: 1.00, encounterHealth: 1.00, runners: 0.00, swarms: 0.00, carriers: 3, guards: 0, callers: 0, banner: "只用你已经学会的动作", name: "守火者" }
  });

  // The remake is explicit and deterministic. Legacy API calls stay byte-for-byte
  // equivalent unless the app opts this run into this exact profile identifier.
  const REMAKE_CURVE_ID = "remake-20261003";
  const REMAKE_DIFFICULTY_DEFS = deepFreeze({
    0: { id: 0, name: "轻松", shortName: "轻松", description: "预警更长；敌血/伤/速 ×1，完整十五波。", scoreMultiplier: 1, enemyHealthMultiplier: 1, enemyDamageMultiplier: 1, enemySpeedMultiplier: 1, enemyCountMultiplier: 1, warningMultiplier: 1.12, spawnIntervalMultiplier: 1.06 },
    1: { id: 1, name: "标准", shortName: "标准", description: "敌血 +8%、伤 +10%、速 +4%、数量约 +8%；分 ×1.15。", scoreMultiplier: 1.15, enemyHealthMultiplier: 1.08, enemyDamageMultiplier: 1.10, enemySpeedMultiplier: 1.04, enemyCountMultiplier: 1.08, warningMultiplier: 1, spawnIntervalMultiplier: 1 },
    2: { id: 2, name: "挑战", shortName: "挑战", description: "敌血 +14%、伤 +20%、速 +8%、数量约 +16%；分 ×1.30。", scoreMultiplier: 1.3, enemyHealthMultiplier: 1.14, enemyDamageMultiplier: 1.20, enemySpeedMultiplier: 1.08, enemyCountMultiplier: 1.16, warningMultiplier: 0.94, spawnIntervalMultiplier: 0.96 }
  });

  // health/damage are absolute base multipliers, not factors on an exponential.
  // count is the authored plan size before difficulty/contract composition.
  const REMAKE_WAVE_PACING = deepFreeze({
    1:  { phase: "learn", health: .68, damage: .66, count: 9,  speed: .94, batch: 1, maxBatch: 1, interval: .72, ranged: 0, bullets: 6,  artillery: 0, bossAdds: 2, bossRanged: 0, projectile: .42, recovery: .16, pattern: "standard", encounterHealth: 1,   runners: 0,    swarms: 0,   carriers: 0, guards: 0, callers: 0, breathEvery: 0, breathSeconds: 0,   targetSeconds: [10, 16], name: "初火",     banner: "拖动移动 · 武器自动攻击" },
    2:  { phase: "learn", health: .76, damage: .70, count: 12, speed: .96, batch: 1, maxBatch: 1, interval: .74, ranged: 0, bullets: 6,  artillery: 0, bossAdds: 2, bossRanged: 0, projectile: .44, recovery: .14, pattern: "standard", encounterHealth: 1,   runners: .06,  swarms: .16, carriers: 0, guards: 0, callers: 0, breathEvery: 6, breathSeconds: 1.0, targetSeconds: [14, 22], name: "添薪",     banner: "绕开人群 · 波末选择一次成长" },
    3:  { phase: "build", health: .82, damage: .76, count: 15, speed: .98, batch: 1, maxBatch: 2, interval: .80, ranged: 0, bullets: 7,  artillery: 0, bossAdds: 2, bossRanged: 0, projectile: .46, recovery: .12, pattern: "standard", encounterHealth: .96, runners: .20,  swarms: .14, carriers: 2, guards: 0, callers: 0, breathEvery: 7, breathSeconds: 1.4, targetSeconds: [18, 28], name: "火势初成", banner: "长尖轮廓是快敌 · 换火打出满热招" },
    4:  { phase: "build", health: .88, damage: .80, count: 16, speed: 1,   batch: 2, maxBatch: 2, interval: .94, ranged: 1, bullets: 8,  artillery: 1, bossAdds: 2, bossRanged: 0, projectile: .48, recovery: .12, pattern: "crossfire", encounterHealth: 1,   runners: .06,  swarms: .10, carriers: 2, guards: 0, callers: 0, breathEvery: 6, breathSeconds: 1.6, targetSeconds: [22, 34], name: "第一道火线", banner: "亮线先预警 · 绕开后继续收割" },
    5:  { phase: "peak",  health: .84, damage: .76, count: 0,  speed: .96, batch: 1, maxBatch: 1, interval: 1.18, ranged: 0, bullets: 8,  artillery: 0, bossAdds: 2, bossRanged: 0, projectile: .40, recovery: .36, pattern: "boss", encounterHealth: 1,         runners: 0,    swarms: 0,   carriers: 1, guards: 0, callers: 0, breathEvery: 0, breathSeconds: 0,   targetSeconds: [35, 55], name: "破阵者",   banner: "离开冲锋线 · 停手时就是反击" },
    6:  { phase: "relax", health: .72, damage: .68, count: 22, speed: .92, batch: 2, maxBatch: 2, interval: .66, ranged: 0, bullets: 8,  artillery: 0, bossAdds: 2, bossRanged: 0, projectile: .44, recovery: .18, pattern: "dense-swarm", encounterHealth: .72, runners: 0, swarms: .64, carriers: 2, guards: 0, callers: 0, breathEvery: 6, breathSeconds: 1.6, targetSeconds: [18, 28], name: "余烬收割", banner: "没有远程 · 让新炉心尽情收割" },
    7:  { phase: "build", health: .98, damage: .86, count: 20, speed: 1,   batch: 2, maxBatch: 2, interval: .96, ranged: 1, bullets: 10, artillery: 0, bossAdds: 3, bossRanged: 0, projectile: .50, recovery: .12, pattern: "standard", encounterHealth: 1,   runners: .22,  swarms: .12, carriers: 2, guards: 0, callers: 0, breathEvery: 6, breathSeconds: 1.7, targetSeconds: [26, 38], name: "快慢轮换", banner: "快敌先到 · 远程随后入场" },
    8:  { phase: "build", health: 1.04,damage: .92, count: 22, speed: 1,   batch: 2, maxBatch: 2, interval: 1.02, ranged: 1, bullets: 11, artillery: 1, bossAdds: 3, bossRanged: 0, projectile: .52, recovery: .10, pattern: "crossfire", encounterHealth: 1,   runners: .10,  swarms: .12, carriers: 2, guards: 0, callers: 0, breathEvery: 6, breathSeconds: 1.8, targetSeconds: [28, 42], name: "两面火线", banner: "火线轮流发射 · 不必同时躲两面" },
    9:  { phase: "build", health: 1.10,damage: .98, count: 23, speed: 1.02,batch: 2, maxBatch: 2, interval: 1.06, ranged: 2, bullets: 12, artillery: 1, bossAdds: 3, bossRanged: 1, projectile: .54, recovery: .12, pattern: "crossfire", encounterHealth: 1,   runners: .12,  swarms: .10, carriers: 2, guards: 1, callers: 0, breathEvery: 6, breathSeconds: 1.9, targetSeconds: [30, 44], name: "破势预演", banner: "先拆重甲 · 再躲下一道火线" },
    10: { phase: "peak",  health: 1.08,damage: .90, count: 0,  speed: 1.02,batch: 1, maxBatch: 1, interval: 1.22, ranged: 1, bullets: 12, artillery: 0, bossAdds: 3, bossRanged: 1, projectile: .42, recovery: .40, pattern: "boss", encounterHealth: 1,         runners: 0,    swarms: 0,   carriers: 2, guards: 0, callers: 0, breathEvery: 0, breathSeconds: 0,   targetSeconds: [45, 65], name: "织焰者",   banner: "进缺口 · 不追弹 · 用成型武器反击" },
    11: { phase: "relax", health: .90, damage: .74, count: 25, speed: .94, batch: 2, maxBatch: 2, interval: .70, ranged: 0, bullets: 9,  artillery: 0, bossAdds: 3, bossRanged: 0, projectile: .44, recovery: .20, pattern: "dense-swarm", encounterHealth: .65, runners: 0, swarms: .70, carriers: 2, guards: 0, callers: 0, breathEvery: 6, breathSeconds: 1.8, targetSeconds: [20, 30], name: "盛焰收割", banner: "压力回落 · 让五级武器横扫余烬" },
    12: { phase: "build", health: 1.16,damage: 1.04,count: 24, speed: 1.02,batch: 2, maxBatch: 2, interval: 1.04, ranged: 2, bullets: 12, artillery: 1, bossAdds: 4, bossRanged: 1, projectile: .56, recovery: .12, pattern: "standard", encounterHealth: 1,   runners: .16,  swarms: .16, carriers: 2, guards: 0, callers: 0, breathEvery: 6, breathSeconds: 2.0, targetSeconds: [30, 44], name: "旧题新解", banner: "快敌与远程组合 · 一次解一道威胁" },
    13: { phase: "build", health: 1.20,damage: 1.08,count: 26, speed: 1.04,batch: 2, maxBatch: 3, interval: 1.08, ranged: 2, bullets: 14, artillery: 1, bossAdds: 4, bossRanged: 1, projectile: .58, recovery: .10, pattern: "standard", encounterHealth: 1,   runners: .16,  swarms: .18, carriers: 3, guards: 1, callers: 1, breathEvery: 6, breathSeconds: 2.0, targetSeconds: [34, 48], name: "拆阵之火", banner: "先清带标记的敌人 · 群阵就会散开" },
    14: { phase: "build", health: 1.24,damage: 1.14,count: 28, speed: 1.04,batch: 2, maxBatch: 3, interval: 1.12, ranged: 3, bullets: 16, artillery: 2, bossAdds: 4, bossRanged: 2, projectile: .60, recovery: .14, pattern: "crossfire", encounterHealth: 1,   runners: .12,  swarms: .12, carriers: 3, guards: 1, callers: 0, breathEvery: 6, breathSeconds: 2.2, targetSeconds: [36, 52], name: "终炉预演", banner: "错峰火线 · 拆甲后进下一道缺口" },
    15: { phase: "peak",  health: 1.18,damage: 1.02,count: 0,  speed: 1.04,batch: 1, maxBatch: 1, interval: 1.26, ranged: 2, bullets: 16, artillery: 0, bossAdds: 4, bossRanged: 2, projectile: .44, recovery: 0,   pattern: "boss", encounterHealth: 1,         runners: 0,    swarms: 0,   carriers: 3, guards: 0, callers: 0, breathEvery: 0, breathSeconds: 0,   targetSeconds: [55, 75], name: "守火者",   banner: "最后一炉 · 只用你已经学会的动作" }
  });

  function getDifficultyDefinition(dangerLevel, curveProfile) {
    const key = DANGER_DEFS[dangerLevel] ? Number(dangerLevel) : 0;
    return clone(curveProfile === REMAKE_CURVE_ID ? REMAKE_DIFFICULTY_DEFS[key] : DANGER_DEFS[key]);
  }

  function getWavePacing(waveNumber, curveProfile) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    if (curveProfile !== REMAKE_CURVE_ID) return getLegacyWavePacing(wave);
    return REMAKE_WAVE_PACING[wave] ? clone(REMAKE_WAVE_PACING[wave]) : null;
  }

  function getWaveTuning(waveNumber, curveProfile) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const pacing = getWavePacing(wave, curveProfile);
    if (curveProfile !== REMAKE_CURVE_ID || !pacing) return getLegacyWaveTuning(wave);
    const isBoss = wave % 5 === 0;
    const health = pacing.health * (isBoss ? 3 : 1);
    const damage = pacing.damage * (isBoss ? 1.25 : 1);
    return { wave: wave, depth: wave - 1, isBoss: isBoss, baseHealthMultiplier: pacing.health, baseDamageMultiplier: pacing.damage, healthMultiplier: health, hpMultiplier: health, damageMultiplier: damage, attackMultiplier: damage, countMultiplier: 1, bossAddMultiplier: 1, speedMultiplier: pacing.speed, pacingPhase: pacing.phase, curveProfile: REMAKE_CURVE_ID };
  }

  function getCombatPressure(waveNumber, curveProfile, dangerLevel) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const pacing = getWavePacing(wave, curveProfile);
    if (curveProfile !== REMAKE_CURVE_ID || !pacing) return getLegacyCombatPressure(wave);
    const stage = getStageNumber(wave);
    const difficulty = getDifficultyDefinition(dangerLevel, curveProfile);
    return {
      wave: wave, stage: stage, spawnBatchSize: pacing.batch, maxSpawnBatchSize: pacing.maxBatch,
      spawnInterval: pacing.interval * difficulty.spawnIntervalMultiplier,
      rangedQuota: pacing.ranged, bossRangedAdds: pacing.bossRanged,
      spitterFirstShotMin: .95, spitterFirstShotMax: 1.4,
      spitterFireInterval: stage === 1 ? 2.4 : stage === 2 ? 2.2 : 2.0,
      spitterVolleySize: stage === 1 ? 1 : stage === 2 ? 2 : 3,
      spitterWindup: Math.max(.50, (stage === 1 ? .54 : .50) * difficulty.warningMultiplier),
      artilleryWindup: Math.max(.78, .84 * difficulty.warningMultiplier),
      runnerWindup: Math.max(.54, .62 * difficulty.warningMultiplier),
      spitterBulletDamageMultiplier: pacing.projectile,
      bossFireInterval: 2.6, bossVolleySize: Math.min(7, 3 + (stage - 1) * 2),
      bossBulletDamageMultiplier: Math.min(.48, pacing.projectile),
      enemyBulletSpeed: (162 + Math.min(12, wave - 1) * 2.5) * Math.min(1.04, pacing.speed),
      enemyBulletSoftCap: pacing.bullets, curveProfile: REMAKE_CURVE_ID
    };
  }

  function getEncounterSpec(waveNumber, seed, contractId, curveProfile) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const encounter = getLegacyEncounterSpec(wave, seed, contractId);
    const pacing = getWavePacing(wave, curveProfile);
    if (curveProfile !== REMAKE_CURVE_ID || !pacing) return encounter;
    encounter.id = "remake-" + wave;
    encounter.name = pacing.name;
    encounter.banner = pacing.banner;
    encounter.basePattern = pacing.pattern;
    encounter.runnerChanceBonus = pacing.runners;
    encounter.batchSizeBonus = 0;
    encounter.enemyCountMultiplier = 1;
    encounter.enemyHealthMultiplier = pacing.encounterHealth;
    encounter.rangedRatioFloor = 0;
    encounter.swarmRatio = pacing.swarms;
    encounter.artilleryQuota = pacing.artillery;
    encounter.spawnAxis = pacing.pattern === "crossfire" ? hashSeed(String(seed) + ":remake-axis:" + wave) % 2 : null;
    encounter.carrierQuota = pacing.carriers;
    encounter.switchGuardQuota = pacing.guards;
    encounter.tideCallerQuota = pacing.callers;
    encounter.primaryTraitId = pacing.carriers > 0 ? (getStageNumber(wave) % 2 === 0 ? "tide" : "sharp") : null;
    encounter.curveProfile = REMAKE_CURVE_ID;
    return encounter;
  }

  function getCrossfireReadabilitySpec(waveNumber, seed, contractId, curveProfile, dangerLevel) {
    if (curveProfile !== REMAKE_CURVE_ID) return getLegacyCrossfireReadabilitySpec(waveNumber, seed, contractId);
    const encounter = getEncounterSpec(waveNumber, seed, contractId, curveProfile);
    if (encounter.basePattern !== "crossfire") return null;
    const difficulty = getDifficultyDefinition(dangerLevel, curveProfile);
    return { warningDuration: Math.max(.78, .86 * difficulty.warningMultiplier), recoveryDuration: 1.25, solidWarningDuration: .14, maxShootersPerBeat: 2, initialAxis: encounter.spawnAxis, axisOrder: [encounter.spawnAxis, 1 - encounter.spawnAxis] };
  }

  function getWaveRecoveryRatio(waveNumber, contractId, curveProfile) {
    const pacing = getWavePacing(waveNumber, curveProfile);
    if (curveProfile !== REMAKE_CURVE_ID || !pacing) return getLegacyWaveRecoveryRatio(waveNumber, contractId);
    return contractId === "lone-edge" ? pacing.recovery * .75 : pacing.recovery;
  }

  function getBossBulletSoftCap(waveNumber, curveProfile, dangerLevel) {
    if (curveProfile !== REMAKE_CURVE_ID) return getLegacyBossBulletSoftCap(waveNumber);
    const pressure = getCombatPressure(waveNumber, curveProfile, dangerLevel);
    const boss = getBossProfile(waveNumber);
    return pressure.enemyBulletSoftCap + (boss ? boss.bulletCapBonus : 0);
  }

  function getBossChargeSpec(waveNumber, phaseNumber, curveProfile, dangerLevel) {
    const spec = getLegacyBossChargeSpec(waveNumber, phaseNumber);
    if (!spec || curveProfile !== REMAKE_CURVE_ID) return spec;
    const difficulty = getDifficultyDefinition(dangerLevel, curveProfile);
    spec.windup = Math.max(.66, spec.windup) * difficulty.warningMultiplier;
    spec.recovery = Math.max(.78, spec.recovery);
    spec.cooldown *= dangerLevel === 0 ? 1.18 : 1.08;
    spec.initialDelay = Math.max(1.8, spec.initialDelay);
    return spec;
  }

  function getBossAttackSpec(waveNumber, phaseNumber, patternSerial, curveProfile, dangerLevel) {
    const spec = getLegacyBossAttackSpec(waveNumber, phaseNumber, patternSerial);
    if (!spec || curveProfile !== REMAKE_CURVE_ID) return spec;
    const difficulty = getDifficultyDefinition(dangerLevel, curveProfile);
    spec.windup = Math.max(.50, spec.windup) * difficulty.warningMultiplier;
    spec.interval *= dangerLevel === 0 ? 1.14 : 1.06;
    return spec;
  }

  function getBossTransitionSpec(waveNumber, curveProfile, dangerLevel) {
    const spec = getLegacyBossTransitionSpec(waveNumber);
    if (!spec || curveProfile !== REMAKE_CURVE_ID) return spec;
    const difficulty = getDifficultyDefinition(dangerLevel, curveProfile);
    spec.windup = Math.max(.70, spec.windup) * difficulty.warningMultiplier;
    spec.waveSpeed *= .94;
    return spec;
  }

  /** Authored pauses depend only on the plan position, never on health or skill. */
  function getRemakeSpawnDelay(waveNumber, spawnedCount, totalCount, dangerLevel) {
    const pressure = getCombatPressure(waveNumber, REMAKE_CURVE_ID, dangerLevel);
    const pacing = getWavePacing(waveNumber, REMAKE_CURVE_ID);
    if (!pacing) return pressure.spawnInterval;
    const spawned = assertNonNegativeInteger(spawnedCount, "spawnedCount");
    const total = assertNonNegativeInteger(totalCount, "totalCount");
    const breath = pacing.breathEvery > 0 && spawned < total && spawned > 0 && spawned % pacing.breathEvery === 0;
    return pressure.spawnInterval + (breath ? pacing.breathSeconds : 0);
  }

  /** Complete deterministic enemy composition with guaranteed, separate slots. */
  function createRemakeSpawnKinds(waveNumber, seed, dangerLevel, contractId) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const pacing = getWavePacing(wave, REMAKE_CURVE_ID);
    if (!pacing) throw new RangeError("The remake plan ends at W15.");
    const difficulty = getDifficultyDefinition(dangerLevel, REMAKE_CURVE_ID);
    const contract = STAGE_CONTRACT_BY_ID[contractId];
    const contractCount = contract ? contract.enemyCountMultiplier : 1;
    if (wave % 5 === 0) {
      const adds = Math.min(8, Math.ceil(pacing.bossAdds * difficulty.enemyCountMultiplier * contractCount));
      const plan = ["boss"];
      for (let i = 0; i < adds; i += 1) plan.push(i < pacing.bossRanged ? "spitter" : i % 2 === 0 ? "swarm" : "chaser");
      return plan;
    }
    // The first two waves teach identical material in all three difficulties.
    const countMultiplier = wave <= 2 ? 1 : difficulty.enemyCountMultiplier;
    const count = Math.max(1, Math.min(36, Math.ceil(pacing.count * countMultiplier * contractCount)));
    const plan = Array(count).fill("chaser");
    const occupied = new Set();
    function place(kind, requested, startFraction, endFraction) {
      const quota = Math.max(0, Math.min(count, Math.trunc(requested)));
      for (let ordinal = 0; ordinal < quota; ordinal += 1) {
        const fraction = quota === 1 ? (startFraction + endFraction) / 2 : startFraction + (endFraction - startFraction) * ordinal / (quota - 1);
        const preferred = Math.min(count - 1, Math.max(0, Math.floor(fraction * count)));
        let chosen = -1;
        for (let offset = 0; offset < count && chosen < 0; offset += 1) {
          const slot = (preferred + offset) % count;
          if (!occupied.has(slot)) chosen = slot;
        }
        if (chosen >= 0) { occupied.add(chosen); plan[chosen] = kind; }
      }
    }
    place("spitter", pacing.ranged, .34, .78);
    place("artillery", pacing.artillery, .54, .88);
    place("switchGuard", pacing.guards, .46, .76);
    place("tidecaller", pacing.callers, .68, .82);
    place("runner", Math.floor(count * pacing.runners), .18, .86);
    const available = plan.map(function slot(_, index) { return index; }).filter(function free(index) { return !occupied.has(index); });
    available.sort(function deterministicShuffle(a, b) {
      return hashSeed(String(seed) + ":swarm:" + wave + ":" + a) - hashSeed(String(seed) + ":swarm:" + wave + ":" + b) || a - b;
    });
    available.slice(0, Math.min(available.length, Math.round(count * pacing.swarms))).forEach(function swarm(slot) { plan[slot] = "swarm"; });
    return plan;
  }


  function getLegacyWavePacing(waveNumber) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    return WAVE_PACING[wave] ? clone(WAVE_PACING[wave]) : null;
  }

  /**
   * Infinite-wave tuning. Boss waves are every fifth wave. Enemy count and
   * speed are capped to preserve readability while health/damage keep scaling.
   */
  function getLegacyWaveTuning(waveNumber) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const depth = wave - 1;
    const isBoss = wave % 5 === 0;
    const pacing = getWavePacing(wave);
    const baseHealth = cappedFinite(Math.pow(1.085, depth) * (pacing ? pacing.health : 1));
    const baseDamage = cappedFinite(Math.pow(1.055, depth) * (pacing ? pacing.damage : 1));
    const bossHealth = isBoss ? 3 : 1;
    const bossDamage = isBoss ? 1.25 : 1;
    const healthMultiplier = cappedFinite(baseHealth * bossHealth);
    const damageMultiplier = cappedFinite(baseDamage * bossDamage);

    return {
      wave: wave,
      depth: depth,
      isBoss: isBoss,
      baseHealthMultiplier: baseHealth,
      baseDamageMultiplier: baseDamage,
      healthMultiplier: healthMultiplier,
      hpMultiplier: healthMultiplier,
      damageMultiplier: damageMultiplier,
      attackMultiplier: damageMultiplier,
      countMultiplier: pacing ? pacing.count : Math.min(2.5, 1 + depth * 0.04),
      bossAddMultiplier: pacing ? pacing.bossAdds : 1,
      speedMultiplier: cappedFinite(Math.min(1.35, 1 + depth * 0.01) * (pacing ? pacing.speed : 1)),
      pacingPhase: pacing ? pacing.phase : "fallback"
    };
  }

  /**
   * Concurrency and projectile pressure. Total enemies stay bounded; later
   * stages become dangerous by entering in groups and guaranteeing shooters.
   */
  function getLegacyCombatPressure(waveNumber) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const depth = wave - 1;
    const stage = getStageNumber(wave);
    const pacing = getWavePacing(wave);
    const stageIndex = Math.min(3, stage) - 1;
    const stageBatchSize = pacing ? pacing.batch : [1, 2, 3][stageIndex];
    const transitionBatchSize = pacing ? pacing.batch : wave === 11 ? 2 : stageBatchSize;
    const maxSpawnBatchSize = pacing ? pacing.maxBatch : wave === 11 ? 2 : wave === 12 ? 3 : 4;
    const spitterBulletDamageMultiplier = pacing ? pacing.projectile : wave === 11 ? 0.76 : wave === 12 ? 0.80 : [0.60, 0.72, 0.85][stageIndex];
    const enemyBulletSoftCap = pacing ? pacing.bullets : wave === 11 ? 18 : wave === 12 ? 21 : Math.min(48, 8 + stageIndex * 8 + Math.max(0, stage - 3) * 4);
    return {
      wave: wave,
      stage: stage,
      spawnBatchSize: transitionBatchSize,
      maxSpawnBatchSize: maxSpawnBatchSize,
      spawnInterval: pacing ? pacing.interval : [0.85, 0.95, 1.05][stageIndex],
      rangedQuota: pacing ? pacing.ranged : wave < 3 ? 0 : Math.min(6, 1 + Math.floor((wave - 3) / 3)),
      bossRangedAdds: pacing ? pacing.bossRanged : Math.min(6, stage + 1),
      spitterFirstShotMin: 0.7,
      spitterFirstShotMax: 1.2,
      spitterFireInterval: Math.max(1.65, 2.25 - depth * 0.04),
      spitterVolleySize: stage === 1 ? 1 : 3,
      spitterBulletDamageMultiplier: spitterBulletDamageMultiplier,
      bossFireInterval: Math.max(1.9, 2.6 - depth * 0.025),
      bossVolleySize: Math.min(9, 3 + (stage - 1) * 2),
      bossBulletDamageMultiplier: pacing ? Math.min(0.55, pacing.projectile) : [0.45, 0.50, 0.55][stageIndex],
      enemyBulletSpeed: (170 + Math.min(15, depth) * 3) * (pacing ? Math.min(1.02, pacing.speed) : 1),
      enemyBulletSoftCap: enemyBulletSoftCap
    };
  }

  function getBossProfile(waveNumber) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    if (wave % 5 !== 0) return null;
    if (wave === VICTORY_WAVE) return clone(BOSS_PROFILES["fire-keeper"]);
    const cycle = wave % 15;
    const id = cycle === 5 ? "ash-ram" : cycle === 10 ? "cinder-weaver" : "ember-core";
    return clone(BOSS_PROFILES[id]);
  }

  function getLegacyBossBulletSoftCap(waveNumber) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const pressure = getCombatPressure(wave);
    const profile = getBossProfile(wave);
    return pressure.enemyBulletSoftCap + (profile ? profile.bulletCapBonus : 0);
  }

  function getLegacyBossChargeSpec(waveNumber, phaseNumber) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const phase = assertPositiveInteger(phaseNumber, "phaseNumber");
    if (phase > 2) throw new RangeError("phaseNumber must be 1 or 2.");
    const profile = getBossProfile(wave);
    if (!profile || profile.id === "cinder-weaver") return null;
    if (profile.id === "ash-ram") {
      return phase === 2
        ? { initialDelay: 1.1, windup: 0.56, duration: 0.52, recovery: 0.62, cooldown: 1.72, speedMultiplier: 5.5 }
        : { initialDelay: 1.8, windup: 0.8, duration: 0.46, recovery: 0.9, cooldown: 2.35, speedMultiplier: 5 };
    }
    return phase === 2
      ? { initialDelay: 1.5, windup: 0.7, duration: 0.45, recovery: 0.65, cooldown: 2.2, speedMultiplier: 5.2 }
      : { initialDelay: 2.3, windup: 0.85, duration: 0.52, recovery: 0.65, cooldown: 3.1, speedMultiplier: 4.8 };
  }

  function getLegacyBossTransitionSpec(waveNumber) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const profile = getBossProfile(wave);
    return profile && ["ember-core", "fire-keeper"].includes(profile.id) ? clone(BOSS_WAVE_SPEC) : null;
  }

  function getLegacyBossAttackSpec(waveNumber, phaseNumber, patternSerial) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const phase = assertPositiveInteger(phaseNumber, "phaseNumber");
    const serial = assertNonNegativeInteger(patternSerial, "patternSerial");
    if (phase > 2) throw new RangeError("phaseNumber must be 1 or 2.");
    const profile = getBossProfile(wave);
    if (!profile) return null;

    if (profile.id === "ash-ram") {
      return phase === 2
        ? { kind: "fan", count: 5, windup: 0.34, interval: 1.72, speedMultiplier: 1.04, damageMultiplier: 0.40, angleStep: 0.14 }
        : { kind: "fan", count: 3, windup: 0.42, interval: 2.4, speedMultiplier: 0.94, damageMultiplier: 0.42, angleStep: 0.16 };
    }

    if (profile.id === "cinder-weaver") {
      const patternModulo = phase === 2 ? 2 : 3;
      if (serial % patternModulo === patternModulo - 1) {
        return {
          kind: "fan",
          count: phase === 2 ? 7 : 5,
          windup: phase === 2 ? 0.38 : 0.48,
          interval: phase === 2 ? 1.72 : 2.5,
          speedMultiplier: phase === 2 ? 1.08 : 1.02,
          damageMultiplier: phase === 2 ? 0.46 : 0.5,
          angleStep: phase === 2 ? 0.11 : 0.12
        };
      }
      return {
        kind: "gap-ring",
        slots: phase === 2 ? 14 : 12,
        gapCount: 2,
        count: phase === 2 ? 12 : 10,
        gapOffset: serial % 2 === 0 ? Math.PI / 4 : -Math.PI / 4,
        windup: phase === 2 ? 0.48 : 0.65,
        interval: phase === 2 ? 1.58 : 1.9,
        speedMultiplier: phase === 2 ? 0.94 : 0.86,
        damageMultiplier: phase === 2 ? 0.40 : 0.42
      };
    }

    if (phase === 1) {
      return {
        kind: "fan",
        count: 7,
        windup: 0.45,
        interval: 2.1,
        speedMultiplier: 0.92,
        damageMultiplier: 0.48,
        angleStep: 0.16
      };
    }

    const phasePattern = serial % 4;
    if (phasePattern === 1) {
      return {
        kind: "fan",
        count: 9,
        windup: 0.46,
        interval: 1.75,
        speedMultiplier: 0.96,
        damageMultiplier: 0.5,
        angleStep: 0.13
      };
    }
    if (phasePattern === 3) {
      return clone(BOSS_WAVE_SPEC);
    }
    return {
      kind: "gap-ring",
      slots: 14,
      gapCount: 2,
      count: 12,
      gapOffset: phasePattern === 0 ? Math.PI / 7 : -Math.PI / 7,
      windup: 0.55,
      interval: 1.75,
      speedMultiplier: 0.86,
      damageMultiplier: 0.45
    };
  }

  function applyCasualPacingToEncounter(inputEncounter, wave, seed, contractId) {
    const encounter = clone(inputEncounter);
    const pacing = getWavePacing(wave);
    if (!pacing || STAGE_CONTRACT_BY_ID[contractId]) return encounter;
    encounter.name = pacing.name || encounter.name;
    encounter.banner = pacing.banner || encounter.banner;
    encounter.basePattern = pacing.pattern || encounter.basePattern;
    encounter.runnerChanceBonus = pacing.runners;
    encounter.batchSizeBonus = pacing.pattern === "dense-swarm" ? 1 : 0;
    encounter.enemyCountMultiplier = pacing.encounterCount;
    encounter.enemyHealthMultiplier = pacing.encounterHealth;
    encounter.rangedRatioFloor = 0;
    encounter.swarmRatio = pacing.swarms;
    encounter.artilleryQuota = pacing.artillery;
    encounter.spawnAxis = pacing.pattern === "crossfire"
      ? hashSeed(String(seed) + ":casual-axis:" + wave) % 2
      : null;
    encounter.carrierQuota = pacing.carriers;
    encounter.switchGuardQuota = pacing.guards;
    encounter.tideCallerQuota = pacing.callers;
    if (pacing.carriers === 0) encounter.primaryTraitId = null;
    return encounter;
  }

  function getLegacyEncounterSpec(waveNumber, seed, contractId) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const stage = getStageNumber(wave);
    const localWave = (wave - 1) % 5 + 1;
    const boss = getBossProfile(wave);
    if (boss) {
      return applyCasualPacingToEncounter({
        id: "boss-" + boss.id,
        name: boss.name,
        banner: boss.name + " · 首领来袭",
        wave: wave,
        stage: stage,
        localWave: localWave,
        isBoss: true,
        bossProfileId: boss.id,
        basePattern: "boss",
        runnerChanceBonus: 0,
        batchSizeBonus: 0,
        enemyCountMultiplier: 1,
        enemyHealthMultiplier: 1,
        rangedRatioFloor: 0,
        swarmRatio: 0,
        artilleryQuota: stage >= 2 ? 1 : 0,
        spawnAxis: null,
        carrierQuota: boss.id === "fire-keeper" ? 4 : 2,
        switchGuardQuota: 0,
        tideCallerQuota: 0,
        primaryTraitId: stage % 2 === 0 ? "tide" : "sharp"
      }, wave, seed, contractId);
    }

    if (wave <= 2) {
      const tutorialTraitId = wave === 1 ? "sharp" : "tide";
      return applyCasualPacingToEncounter({
        id: "fire-tutorial-" + tutorialTraitId,
        name: tutorialTraitId === "sharp" ? "锋火初燃" : "潮火初燃",
        banner: tutorialTraitId === "sharp" ? "碰触收火 · 两枚炼核" : "爆闪焚火 · 满热成招",
        wave: wave,
        stage: stage,
        localWave: localWave,
        isBoss: false,
        bossProfileId: null,
        basePattern: "standard",
        runnerChanceBonus: 0,
        batchSizeBonus: 0,
        enemyCountMultiplier: 0.82,
        enemyHealthMultiplier: 0.82,
        rangedRatioFloor: 0,
        swarmRatio: wave === 2 ? 0.22 : 0,
        artilleryQuota: 0,
        spawnAxis: null,
        carrierQuota: 3,
        switchGuardQuota: 0,
        tideCallerQuota: 0,
        primaryTraitId: tutorialTraitId
      }, wave, seed, contractId);
    }

    const fallbackModuleId = localWave === 4 ? "dual-path" : localWave === 3 ? "tide-ring" : "sharp-hunt-line";
    const module = getEncounterModuleSpec(wave, seed, contractId) || clone(ENCOUNTER_MODULES[fallbackModuleId]);
    const basePattern = ["cross", "split", "hazard"].includes(module.enemyFocus)
      ? "crossfire"
      : ["swarm", "alternating"].includes(module.enemyFocus) ? "dense-swarm" : "standard";
    const isDense = basePattern === "dense-swarm";
    const isCrossfire = basePattern === "crossfire";
    return applyCasualPacingToEncounter({
      id: module.id,
      name: module.name,
      banner: module.name + " · " + FIRE_TRAITS[module.primaryTraitId].name,
      wave: wave,
      stage: stage,
      localWave: localWave,
      isBoss: false,
      bossProfileId: null,
      basePattern: basePattern,
      runnerChanceBonus: isDense ? 0.14 : module.enemyFocus === "priority" ? 0.18 : 0,
      batchSizeBonus: isDense ? 2 : 0,
      enemyCountMultiplier: isDense ? 1.22 : isCrossfire ? 0.82 : 1,
      enemyHealthMultiplier: isDense ? 0.84 : isCrossfire ? 1.22 : 1,
      rangedRatioFloor: isCrossfire ? 0.36 : 0,
      swarmRatio: isDense ? 0.48 : 0.10,
      artilleryQuota: isCrossfire ? Math.min(3, stage + 1) : module.enemyFocus === "priority" ? Math.min(2, stage) : 0,
      spawnAxis: isCrossfire ? hashSeed(String(seed) + ":module-axis:" + wave) % 2 : null,
      carrierQuota: module.carrierQuota,
      switchGuardQuota: module.switchGuardQuota,
      tideCallerQuota: module.tideCallerQuota,
      primaryTraitId: module.primaryTraitId,
      isInverse: module.isInverse === true
    }, wave, seed, contractId);
  }

  const CROSSFIRE_READABILITY = deepFreeze({
    warningDuration: 0.78,
    recoveryDuration: 1.1,
    solidWarningDuration: 0.12,
    maxShootersPerBeat: 2
  });

  function getLegacyCrossfireReadabilitySpec(waveNumber, seed, contractId) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    const encounter = getEncounterSpec(wave, seed, contractId);
    if (encounter.basePattern !== "crossfire") return null;
    const initialAxis = encounter.spawnAxis;
    return {
      warningDuration: CROSSFIRE_READABILITY.warningDuration,
      recoveryDuration: CROSSFIRE_READABILITY.recoveryDuration,
      solidWarningDuration: CROSSFIRE_READABILITY.solidWarningDuration,
      maxShootersPerBeat: CROSSFIRE_READABILITY.maxShootersPerBeat,
      initialAxis: initialAxis,
      axisOrder: [initialAxis, 1 - initialAxis]
    };
  }

  function createCrossfireSpawnEntries(kinds, initialAxis, batchSize) {
    if (!Array.isArray(kinds)) throw new TypeError("kinds must be an array.");
    if (initialAxis !== 0 && initialAxis !== 1) throw new RangeError("initialAxis must be 0 or 1.");
    const size = assertPositiveInteger(batchSize, "batchSize");
    const entries = [];
    let artilleryOrdinal = 0;

    for (let planIndex = 0; planIndex < kinds.length; planIndex += 1) {
      const kind = kinds[planIndex];
      if (typeof kind !== "string" || kind.length === 0) {
        throw new TypeError("kinds must contain non-empty strings.");
      }
      const batchIndex = Math.floor(planIndex / size);
      const axisOffset = kind === "artillery" ? artilleryOrdinal : batchIndex;
      entries.push({
        kind: kind,
        axis: (initialAxis + axisOffset) % 2,
        batchIndex: batchIndex,
        planIndex: planIndex
      });
      if (kind === "artillery") artilleryOrdinal += 1;
    }
    return entries;
  }

  function isCrossfireThreatAllowed(state, kind, enemyAxis, action) {
    if (!state || state.phase === "finished" || (kind !== "artillery" && kind !== "runner")) return true;

    if (kind === "artillery") {
      if (enemyAxis !== state.activeAxis) return false;
      if (action === "start") return state.phase === "telegraph";
      if (action === "release") return state.phase === "volley";
      return false;
    }

    if (action === "start") return state.phase === "waiting" && !state.beatQueued;
    if (action === "release") return state.phase === "waiting";
    return false;
  }

  function getContractAttackSpeedMultiplier(contractId, stationarySeconds) {
    const seconds = Number.isFinite(stationarySeconds) ? Math.max(0, stationarySeconds) : 0;
    const contract = STAGE_CONTRACT_BY_ID[contractId];
    if (!contract || contract.id !== "still-hunt") return 1;
    if (seconds < contract.stationaryChargeSeconds) return 1;
    if (seconds <= contract.stationaryOverheatSeconds) return contract.stationaryAttackSpeedMultiplier;
    return contract.stationaryOverheatMultiplier;
  }

  function getLegacyWaveRecoveryRatio(waveNumber, contractId) {
    const pacing = getWavePacing(waveNumber);
    const stage = getStageNumber(waveNumber);
    const base = pacing ? pacing.recovery : waveNumber === 10 ? 0.15 : stage === 1 ? 0.08 : stage === 2 ? 0.05 : 0.03;
    return contractId === "lone-edge" ? base * 0.75 : base;
  }

  function getStageNumber(waveNumber) {
    const wave = assertPositiveInteger(waveNumber, "waveNumber");
    return Math.floor((wave - 1) / 5) + 1;
  }

  function getUnlockedAnchorWaves(bestCompletedWave) {
    const best = assertNonNegativeInteger(bestCompletedWave, "bestCompletedWave");
    const anchors = [1];
    if (best >= 5) anchors.push(6);
    if (best >= 10) anchors.push(11);
    return anchors;
  }

  /** Active relays may start at their target wave, but never beyond it. */
  function getRelayAnchorWaves(bestCompletedWave, relayTargetWave) {
    const anchors = getUnlockedAnchorWaves(bestCompletedWave);
    if (!Number.isSafeInteger(relayTargetWave) || relayTargetWave < 1) return [1];
    return anchors.filter(function beforeRelayTarget(wave) { return wave <= relayTargetWave; });
  }

  function resolveAnchorWave(bestCompletedWave, requestedWave, relayTargetWave) {
    const anchors = arguments.length >= 3
      ? getRelayAnchorWaves(bestCompletedWave, relayTargetWave)
      : getUnlockedAnchorWaves(bestCompletedWave);
    return Number.isSafeInteger(requestedWave) && anchors.includes(requestedWave) ? requestedWave : 1;
  }

  function getAnchorCompensation(startWave) {
    const wave = [1, 6, 11].includes(startWave) ? startWave : 1;
    const skippedStages = Math.floor((wave - 1) / 5);
    return {
      startWave: wave,
      skippedStages: skippedStages,
      levelBonus: skippedStages * 4,
      initialChoiceBonus: skippedStages,
      damageMultiplier: Math.pow(1.20, skippedStages),
      maxHealthMultiplier: Math.pow(1.15, skippedStages),
      attackSpeedMultiplier: Math.pow(1.10, skippedStages),
      projectileBonus: Math.floor(skippedStages / 2),
      pierceBonus: Math.floor(skippedStages / 2)
    };
  }

  function getVictoryBonus() {
    return Math.floor(getEmberReward(VICTORY_WAVE) * 0.5);
  }

  function getIncrementalEmberReward(completedWave, rewardFloorWave) {
    const completed = assertNonNegativeInteger(completedWave, "completedWave");
    const floorWave = assertNonNegativeInteger(rewardFloorWave, "rewardFloorWave");
    if (completed <= floorWave) return 0;
    return Math.max(0, getEmberReward(completed) - getEmberReward(floorWave));
  }

  function hashSeed(seed) {
    const text = String(seed === undefined ? 0 : seed);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0 || 0x9e3779b9;
  }

  function nextRandom(state) {
    let next = state >>> 0;
    next ^= next << 13;
    next ^= next >>> 17;
    next ^= next << 5;
    return next >>> 0;
  }

  function shuffledCards(cards, stateSeed) {
    const pool = cards.slice();
    let state = stateSeed;
    for (let index = pool.length - 1; index > 0; index -= 1) {
      state = nextRandom(state);
      const swapIndex = state % (index + 1);
      const current = pool[index];
      pool[index] = pool[swapIndex];
      pool[swapIndex] = current;
    }
    return { cards: pool, state: state };
  }

  /**
   * Returns three distinct deterministic cards. One card favors the active
   * weapon, one favors switching, and one keeps survival/other-weapon tension.
   */
  function createUpgradeChoices(seed, context) {
    const requestedWeapon = context && context.activeWeaponId;
    const activeWeaponId = WEAPON_DEFS[requestedWeapon] ? requestedWeapon : "carbine";
    let state = hashSeed(seed);
    const selected = [];
    const selectedIds = new Set();
    const groups = [
      RUN_UPGRADES.filter(function activeWeapon(card) { return card.weaponId === activeWeaponId; }),
      RUN_UPGRADES.filter(function switchCard(card) { return card.category === "switch"; }),
      RUN_UPGRADES.filter(function contrast(card) { return card.category === "survival" || (card.weaponId && card.weaponId !== activeWeaponId); })
    ];
    groups.forEach(function selectFromGroup(group) {
      const shuffled = shuffledCards(group, state);
      state = shuffled.state;
      const card = shuffled.cards.find(function unused(candidate) { return !selectedIds.has(candidate.id); });
      if (!card) return;
      selected.push(card);
      selectedIds.add(card.id);
    });
    if (selected.length < 3) {
      const fallback = shuffledCards(RUN_UPGRADES, state).cards;
      fallback.forEach(function fill(candidate) {
        if (selected.length >= 3 || selectedIds.has(candidate.id)) return;
        selected.push(candidate);
        selectedIds.add(candidate.id);
      });
    }
    return selected.map(clone);
  }

  function normalizeChosenUpgradeCounts(input) {
    const source = input && typeof input === "object" ? input : {};
    const counts = {};
    RUN_UPGRADES.forEach(function copyChosenCount(upgrade) {
      const value = source[upgrade.id];
      if (Number.isSafeInteger(value) && value > 0) counts[upgrade.id] = value;
    });
    return counts;
  }

  function getPrimaryWeaponId(weaponUsage) {
    const source = weaponUsage && typeof weaponUsage === "object" ? weaponUsage : {};
    const carbineTime = typeof source.carbine === "number" && Number.isFinite(source.carbine) && source.carbine >= 0
      ? source.carbine
      : 0;
    const ringTime = typeof source.cinderRing === "number" && Number.isFinite(source.cinderRing) && source.cinderRing >= 0
      ? source.cinderRing
      : 0;
    return ringTime > carbineTime ? "cinderRing" : "carbine";
  }

  /**
   * Builds at most three relay candidates from actively chosen cards only.
   * Higher chosen counts rank first; ties are reproducibly shuffled by run seed.
   * A run with no chosen card falls back to its primary weapon's two basic cards.
   * The inherited card is removed, even if that leaves a single forced choice.
   */
  function createRelayChoices(seed, chosenUpgradeCounts, weaponUsage, inheritedUpgradeId) {
    const counts = normalizeChosenUpgradeCounts(chosenUpgradeCounts);
    const countLevels = Array.from(new Set(Object.keys(counts).map(function chosenCount(id) {
      return counts[id];
    }))).sort(function descending(first, second) { return second - first; });
    const ranked = [];

    countLevels.forEach(function appendCountLevel(count) {
      const levelCards = RUN_UPGRADES.filter(function selectedAtLevel(card) {
        return counts[card.id] === count;
      });
      const shuffled = shuffledCards(levelCards, hashSeed("relay:" + seed + ":" + count)).cards;
      shuffled.forEach(function append(card) {
        const candidate = clone(card);
        candidate.chosenCount = count;
        ranked.push(candidate);
      });
    });

    if (ranked.length > 0) return ranked.slice(0, 3);

    const excludedInheritedId = typeof inheritedUpgradeId === "string" && RUN_UPGRADE_BY_ID[inheritedUpgradeId]
      ? inheritedUpgradeId
      : null;
    const primaryWeaponId = getPrimaryWeaponId(weaponUsage);
    return RELAY_FALLBACK_UPGRADE_IDS[primaryWeaponId].filter(function excludeInheritedFallback(upgradeId) {
      return upgradeId !== excludedInheritedId;
    }).map(function fallbackCard(upgradeId) {
      const candidate = clone(RUN_UPGRADE_BY_ID[upgradeId]);
      candidate.chosenCount = 0;
      return candidate;
    });
  }

  function createCoreChoices(seed) {
    return shuffledCards(CORE_EQUIPMENT, hashSeed("core:" + seed)).cards.map(clone);
  }

  function createDoctrineChoices(seed) {
    return shuffledCards(DUAL_WEAPON_DOCTRINES, hashSeed("doctrine:" + seed)).cards.slice(0, 3).map(clone);
  }

  function getWeaponEvolution(evolutionId) {
    return WEAPON_EVOLUTIONS[evolutionId] ? clone(WEAPON_EVOLUTIONS[evolutionId]) : null;
  }

  function getDoctrine(doctrineId) {
    return DUAL_WEAPON_DOCTRINE_BY_ID[doctrineId] ? clone(DUAL_WEAPON_DOCTRINE_BY_ID[doctrineId]) : null;
  }

  function validC13WeaponId(value) {
    return typeof value === "string" && C13_WEAPON_DEFS[value] ? value : null;
  }

  function normalizeC13WeaponLevel(value) {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(C13_WEAPON_LEVEL_CAP, Math.trunc(value)));
  }

  function getC13WeaponDefinition(weaponId) {
    const resolved = validC13WeaponId(weaponId);
    return resolved ? clone(C13_WEAPON_DEFS[resolved]) : null;
  }

  function getC13WeaponLevelDefinition(weaponId, level) {
    const resolved = validC13WeaponId(weaponId);
    if (!resolved) return null;
    return clone(C13_WEAPON_LEVELS[resolved][normalizeC13WeaponLevel(level) - 1]);
  }

  function getC13WeaponPair(pairId) {
    return typeof pairId === "string" && C13_WEAPON_PAIR_BY_ID[pairId]
      ? clone(C13_WEAPON_PAIR_BY_ID[pairId])
      : null;
  }

  function getC13WeaponPairForLoadout(loadoutId) {
    const pair = getC13WeaponPair(loadoutId);
    return pair || clone(C13_WEAPON_PAIR_BY_ID[C13_DEFAULT_PAIR_ID]);
  }

  function interpolateC13Budget(maximum, level) {
    const weight = C13_WEAPON_LEVEL_WEIGHTS[normalizeC13WeaponLevel(level)];
    return 1 + (maximum - 1) * weight;
  }

  function getC13WeaponOutputBudget(weaponId, level) {
    const resolved = validC13WeaponId(weaponId);
    if (!resolved) return null;
    const definition = C13_WEAPON_DEFS[resolved];
    const normalizedLevel = normalizeC13WeaponLevel(level);
    return {
      weaponId: resolved,
      level: normalizedLevel,
      levelOneParityTolerance: C13_WEAPON_OUTPUT_LIMITS.levelOneParityTolerance,
      singleTargetMultiplier: interpolateC13Budget(definition.outputBudget.singleTargetAtLevelFive, normalizedLevel),
      clusterMultiplier: interpolateC13Budget(definition.outputBudget.clusterAtLevelFive, normalizedLevel),
      singleTargetAtLevelFive: definition.outputBudget.singleTargetAtLevelFive,
      clusterAtLevelFive: definition.outputBudget.clusterAtLevelFive
    };
  }

  function getC13WeaponConcurrencyBudget(weaponId) {
    const resolved = validC13WeaponId(weaponId);
    return resolved ? clone(C13_WEAPON_DEFS[resolved].concurrency) : null;
  }

  function createC13WeaponProgress(pairId) {
    const pair = getC13WeaponPairForLoadout(pairId);
    const levels = {};
    pair.weaponIds.forEach(function startAtLevelOne(weaponId) { levels[weaponId] = 1; });
    return {
      pairId: pair.id,
      weaponIds: pair.weaponIds.slice(),
      activeWeaponId: pair.pursuitWeaponId,
      levels: levels
    };
  }

  function normalizeC13WeaponProgress(input) {
    const source = input && typeof input === "object" ? input : {};
    const pair = getC13WeaponPairForLoadout(source.pairId);
    const sourceLevels = source.levels && typeof source.levels === "object" ? source.levels : {};
    const levels = {};
    pair.weaponIds.forEach(function normalizeEquippedLevel(weaponId) {
      levels[weaponId] = normalizeC13WeaponLevel(sourceLevels[weaponId]);
    });
    const activeWeaponId = pair.weaponIds.includes(source.activeWeaponId)
      ? source.activeWeaponId
      : pair.pursuitWeaponId;
    return {
      pairId: pair.id,
      weaponIds: pair.weaponIds.slice(),
      activeWeaponId: activeWeaponId,
      levels: levels
    };
  }

  function upgradeC13Weapon(inputProgress, weaponId) {
    const progress = normalizeC13WeaponProgress(inputProgress);
    const resolved = validC13WeaponId(weaponId);
    if (!resolved || !progress.weaponIds.includes(resolved)) {
      return { upgraded: false, reason: "not-equipped", state: progress, beforeLevel: null, afterLevel: null, levelDefinition: null };
    }
    const beforeLevel = progress.levels[resolved];
    if (beforeLevel >= C13_WEAPON_LEVEL_CAP) {
      return {
        upgraded: false,
        reason: "max-level",
        state: progress,
        beforeLevel: beforeLevel,
        afterLevel: beforeLevel,
        levelDefinition: getC13WeaponLevelDefinition(resolved, beforeLevel)
      };
    }
    const afterLevel = beforeLevel + 1;
    progress.levels[resolved] = afterLevel;
    return {
      upgraded: true,
      reason: null,
      state: progress,
      beforeLevel: beforeLevel,
      afterLevel: afterLevel,
      levelDefinition: getC13WeaponLevelDefinition(resolved, afterLevel)
    };
  }

  function c13WeaponGrowthCard(progress, weaponId, lane) {
    const definition = C13_WEAPON_DEFS[weaponId];
    const currentLevel = progress.levels[weaponId];
    if (currentLevel >= C13_WEAPON_LEVEL_CAP) {
      return {
        id: "c13-utility-slot:" + lane,
        kind: "utility-slot",
        lane: lane,
        weaponId: weaponId,
        name: definition.name + "已满级",
        description: "此位置改由生存或换火成长补位。",
        currentLevel: currentLevel,
        nextLevel: null,
        visibleEvolution: false
      };
    }
    const nextLevel = currentLevel + 1;
    const nextDefinition = C13_WEAPON_LEVELS[weaponId][nextLevel - 1];
    return {
      id: "c13-weapon-level:" + weaponId,
      kind: "weapon-level",
      lane: lane,
      weaponId: weaponId,
      name: definition.name + " Lv." + currentLevel + " → Lv." + nextLevel,
      description: nextDefinition.description,
      currentLevel: currentLevel,
      nextLevel: nextLevel,
      visibleEvolution: nextDefinition.visibleEvolution
    };
  }

  function createC13WeaponGrowthCards(inputProgress) {
    const progress = normalizeC13WeaponProgress(inputProgress);
    const activeWeaponId = progress.activeWeaponId;
    const holsteredWeaponId = progress.weaponIds.find(function findHolstered(weaponId) {
      return weaponId !== activeWeaponId;
    });
    return [
      c13WeaponGrowthCard(progress, activeWeaponId, "active"),
      c13WeaponGrowthCard(progress, holsteredWeaponId, "holstered"),
      {
        id: "c13-utility-slot:general",
        kind: "utility-slot",
        lane: "utility",
        weaponId: null,
        name: "生存／换火",
        description: "由现有生存与换火成长池提供一个主动选择。",
        currentLevel: null,
        nextLevel: null,
        visibleEvolution: false
      }
    ].map(clone);
  }

  function planC13WaveGrowth(input) {
    const source = input && typeof input === "object" ? input : {};
    const carriedChoices = Number.isSafeInteger(source.carriedChoices) && source.carriedChoices > 0
      ? source.carriedChoices
      : 0;
    const earnedChoices = Number.isSafeInteger(source.earnedChoices) && source.earnedChoices > 0
      ? source.earnedChoices
      : 0;
    const totalChoices = carriedChoices > MAX_STORED_INTEGER - earnedChoices
      ? MAX_STORED_INTEGER
      : carriedChoices + earnedChoices;
    const coreWave = source.coreWave === true;
    const manualChoicesThisWave = !coreWave && totalChoices > 0 ? 1 : 0;
    return {
      totalChoices: totalChoices,
      manualChoicesThisWave: manualChoicesThisWave,
      carriedChoices: totalChoices - manualChoicesThisWave,
      requiresManualSelection: manualChoicesThisWave === 1,
      autoSelections: 0,
      coreWave: coreWave
    };
  }

  function getCoreEquipment(coreId) {
    return CORE_EQUIPMENT_BY_ID[coreId] ? clone(CORE_EQUIPMENT_BY_ID[coreId]) : null;
  }

  function createContractChoices(seed, excludedIds) {
    const excluded = new Set(Array.isArray(excludedIds) ? excludedIds : []);
    const pool = STAGE_CONTRACTS.filter(function available(contract) {
      return !excluded.has(contract.id);
    }).map(clone);
    let state = hashSeed("contract:" + seed);
    for (let index = pool.length - 1; index > 0; index -= 1) {
      state = nextRandom(state);
      const swapIndex = state % (index + 1);
      const current = pool[index];
      pool[index] = pool[swapIndex];
      pool[swapIndex] = current;
    }
    return pool;
  }

  function getStageContract(contractId) {
    const contract = STAGE_CONTRACT_BY_ID[contractId];
    return contract ? clone(contract) : null;
  }

  function createDefaultRunState() {
    return {
      damageMultiplier: 1,
      maxHealthMultiplier: 1,
      attackSpeedMultiplier: 1,
      moveSpeedMultiplier: 1,
      projectileSpeedMultiplier: 1,
      pickupRadiusMultiplier: 1,
      projectileCount: 1,
      pierce: 0,
      carbineDamageMultiplier: 1,
      carbineTechniqueBreakBonus: 0,
      carbinePierce: 0,
      carbineBurstBonus: 0,
      carbineMarkedDamageMultiplier: 1,
      ringDamageMultiplier: 1,
      ringTechniqueSweepBonus: 0,
      ringProjectileBonus: 0,
      ringRepelStrength: 0,
      ringBurnRatio: 0,
      drawChargeRateMultiplier: 1,
      drawDamageMultiplier: 1,
      fusionHeatRefund: 0,
      swapAttackSpeedMultiplier: 1,
      upgradeCounts: {},
      chosenUpgradeCounts: {},
      activeRelayUpgradeId: null,
      activeRelayTargetWave: 0,
      relayCompleted: false
    };
  }

  function positiveFiniteOr(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function nonNegativeIntegerOr(value, fallback) {
    return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
  }

  function nonNegativeFiniteOr(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  function normalizeRunState(input) {
    const source = input && typeof input === "object" ? input : {};
    const state = Object.assign({}, clone(source), createDefaultRunState());
    state.damageMultiplier = positiveFiniteOr(source.damageMultiplier, 1);
    state.maxHealthMultiplier = positiveFiniteOr(source.maxHealthMultiplier, 1);
    state.attackSpeedMultiplier = positiveFiniteOr(source.attackSpeedMultiplier, 1);
    state.moveSpeedMultiplier = positiveFiniteOr(source.moveSpeedMultiplier, 1);
    state.projectileSpeedMultiplier = positiveFiniteOr(source.projectileSpeedMultiplier, 1);
    state.pickupRadiusMultiplier = positiveFiniteOr(source.pickupRadiusMultiplier, 1);
    state.projectileCount = Math.max(1, nonNegativeIntegerOr(source.projectileCount, 1));
    state.pierce = nonNegativeIntegerOr(source.pierce, 0);
    state.carbineDamageMultiplier = positiveFiniteOr(source.carbineDamageMultiplier, 1);
    state.carbineTechniqueBreakBonus = nonNegativeIntegerOr(source.carbineTechniqueBreakBonus, 0);
    state.carbinePierce = nonNegativeIntegerOr(source.carbinePierce, 0);
    state.carbineBurstBonus = nonNegativeIntegerOr(source.carbineBurstBonus, 0);
    state.carbineMarkedDamageMultiplier = positiveFiniteOr(source.carbineMarkedDamageMultiplier, 1);
    state.ringDamageMultiplier = positiveFiniteOr(source.ringDamageMultiplier, 1);
    state.ringTechniqueSweepBonus = nonNegativeIntegerOr(source.ringTechniqueSweepBonus, 0);
    state.ringProjectileBonus = nonNegativeIntegerOr(source.ringProjectileBonus, 0);
    state.ringRepelStrength = nonNegativeFiniteOr(source.ringRepelStrength, 0);
    state.ringBurnRatio = nonNegativeFiniteOr(source.ringBurnRatio, 0);
    state.drawChargeRateMultiplier = positiveFiniteOr(source.drawChargeRateMultiplier, 1);
    state.drawDamageMultiplier = positiveFiniteOr(source.drawDamageMultiplier, 1);
    state.fusionHeatRefund = nonNegativeFiniteOr(source.fusionHeatRefund, 0);
    state.swapAttackSpeedMultiplier = positiveFiniteOr(source.swapAttackSpeedMultiplier, 1);
    state.upgradeCounts = {};
    const counts = source.upgradeCounts && typeof source.upgradeCounts === "object"
      ? source.upgradeCounts
      : {};
    RUN_UPGRADES.forEach(function copyCount(upgrade) {
      const count = nonNegativeIntegerOr(counts[upgrade.id], 0);
      if (count > 0) state.upgradeCounts[upgrade.id] = count;
    });
    state.chosenUpgradeCounts = normalizeChosenUpgradeCounts(source.chosenUpgradeCounts);
    const activeRelayUpgradeId = typeof source.activeRelayUpgradeId === "string" && RUN_UPGRADE_BY_ID[source.activeRelayUpgradeId]
      ? source.activeRelayUpgradeId
      : null;
    const activeRelayTargetWave = Number.isSafeInteger(source.activeRelayTargetWave) && source.activeRelayTargetWave > 0
      ? source.activeRelayTargetWave
      : 0;
    if (activeRelayUpgradeId !== null && activeRelayTargetWave > 0) {
      state.activeRelayUpgradeId = activeRelayUpgradeId;
      state.activeRelayTargetWave = activeRelayTargetWave;
      state.relayCompleted = source.relayCompleted === true;
    } else {
      state.activeRelayUpgradeId = null;
      state.activeRelayTargetWave = 0;
      state.relayCompleted = false;
    }
    return state;
  }

  /** Applies one card to a run-state snapshot and returns a new snapshot. */
  function applyRunUpgrade(inputState, upgradeId) {
    const upgrade = RUN_UPGRADE_BY_ID[upgradeId];
    if (!upgrade) throw new RangeError("Unknown run upgrade: " + upgradeId);
    const state = normalizeRunState(inputState);
    if (upgrade.operation === "multiply") {
      state[upgrade.stat] *= upgrade.value;
    } else {
      state[upgrade.stat] += upgrade.value;
    }
    state.upgradeCounts[upgrade.id] = (state.upgradeCounts[upgrade.id] || 0) + 1;
    return state;
  }

  /** Applies a player-selected card and records it as an eligible relay source. */
  function applyChosenRunUpgrade(inputState, upgradeId) {
    const state = applyRunUpgrade(inputState, upgradeId);
    state.chosenUpgradeCounts[upgradeId] = Math.min(
      MAX_STORED_INTEGER,
      (state.chosenUpgradeCounts[upgradeId] || 0) + 1
    );
    return state;
  }

  /**
   * Atomically moves a valid pending save slot into a run, clears the slot, and
   * applies its opening layer. Repeating against the cleared save cannot reapply.
   */
  function consumePendingRelay(inputSave, inputRunState) {
    const save = sanitizeSave(inputSave);
    let runState = normalizeRunState(inputRunState);
    if (save.relayUpgradeId === null || save.relayTargetWave < 1) {
      return { save: save, runState: runState, relay: null };
    }

    const relay = {
      upgradeId: save.relayUpgradeId,
      targetWave: save.relayTargetWave
    };
    save.relayUpgradeId = null;
    save.relayTargetWave = 0;
    runState = applyRunUpgrade(runState, relay.upgradeId);
    runState.activeRelayUpgradeId = relay.upgradeId;
    runState.activeRelayTargetWave = relay.targetWave;
    runState.relayCompleted = false;
    return { save: save, runState: runState, relay: relay };
  }

  /** Completes an active relay once, adding its second layer and history count. */
  function completeRelayWave(inputSave, inputRunState, completedWave) {
    const wave = assertPositiveInteger(completedWave, "completedWave");
    const save = sanitizeSave(inputSave);
    let runState = normalizeRunState(inputRunState);
    const upgradeId = runState.activeRelayUpgradeId;
    const targetWave = runState.activeRelayTargetWave;
    if (!upgradeId || runState.relayCompleted || wave < targetWave) {
      return { completed: false, save: save, runState: runState, relay: null };
    }

    runState = applyRunUpgrade(runState, upgradeId);
    runState.relayCompleted = true;
    save.relayCount = Math.min(MAX_STORED_INTEGER, save.relayCount + 1);
    return {
      completed: true,
      save: save,
      runState: runState,
      relay: { upgradeId: upgradeId, targetWave: targetWave }
    };
  }

  /** Adds a death payout to a save and safely returns both values. */
  function settleRun(inputSave, highestWave) {
    const reward = getEmberReward(highestWave);
    const save = sanitizeSave(inputSave);
    save.embers = Math.min(MAX_STORED_INTEGER, save.embers + reward);
    return { reward: reward, save: save };
  }

  /**
   * Ranks live bullets intersected by a flash segment. The result contains only
   * primitive IDs so callers cannot mutate the source bullets through it.
   */
  function getReturnFireSelection(bullets, startX, startY, endX, endY, threadRadius, captureLimit) {
    if (!Array.isArray(bullets)) throw new TypeError("bullets must be an array");
    if (![startX, startY, endX, endY, threadRadius].every(Number.isFinite) || threadRadius < 0) {
      throw new RangeError("flash segment and thread radius must be finite");
    }
    if (!Number.isSafeInteger(captureLimit) || captureLimit < 0) {
      throw new RangeError("capture limit must be a non-negative integer");
    }
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY;
    const ranked = [];
    bullets.forEach(function rankBullet(bullet, index) {
      if (!bullet || bullet.dead) return;
      if (![bullet.x, bullet.y].every(Number.isFinite)) return;
      const radius = Number.isFinite(bullet.radius) && bullet.radius > 0 ? bullet.radius : 0;
      const rawProgress = lengthSquared <= 0.0001
        ? 0
        : ((bullet.x - startX) * segmentX + (bullet.y - startY) * segmentY) / lengthSquared;
      const progress = Math.max(0, Math.min(1, rawProgress));
      const closestX = startX + segmentX * progress;
      const closestY = startY + segmentY * progress;
      const distance = Math.hypot(bullet.x - closestX, bullet.y - closestY);
      if (distance > threadRadius + radius) return;
      ranked.push({
        id: bullet.id,
        index: index,
        progress: progress,
        distance: distance
      });
    });
    ranked.sort(function compareRank(first, second) {
      if (Math.abs(first.progress - second.progress) > 1e-9) return first.progress - second.progress;
      if (Math.abs(first.distance - second.distance) > 1e-9) return first.distance - second.distance;
      const firstNumeric = typeof first.id === "number" && Number.isFinite(first.id);
      const secondNumeric = typeof second.id === "number" && Number.isFinite(second.id);
      if (firstNumeric && secondNumeric && first.id !== second.id) return first.id - second.id;
      const idOrder = String(first.id).localeCompare(String(second.id));
      return idOrder || first.index - second.index;
    });
    const threadedIds = ranked.map(function selectId(item) { return item.id; });
    return {
      threadedIds: threadedIds,
      capturedIds: threadedIds.slice(0, captureLimit)
    };
  }

  const api = Object.freeze({
    SAVE_VERSION: SAVE_VERSION,
    VICTORY_WAVE: VICTORY_WAVE,
    MAX_RELAY_TARGET_WAVE: MAX_RELAY_TARGET_WAVE,
    LEGACY_DEFS: LEGACY_DEFS,
    WEAPON_DEFS: WEAPON_DEFS,
    C13_WEAPON_LEVEL_CAP: C13_WEAPON_LEVEL_CAP,
    C13_DEFAULT_PAIR_ID: C13_DEFAULT_PAIR_ID,
    C13_WEAPON_OUTPUT_LIMITS: C13_WEAPON_OUTPUT_LIMITS,
    C13_COMBAT_CONCURRENCY: C13_COMBAT_CONCURRENCY,
    C13_WEAPON_DEFS: C13_WEAPON_DEFS,
    C13_WEAPON_LEVELS: C13_WEAPON_LEVELS,
    C13_WEAPON_PAIRS: C13_WEAPON_PAIRS,
    WEAPON_EVOLUTIONS: WEAPON_EVOLUTIONS,
    DUAL_WEAPON_DOCTRINES: DUAL_WEAPON_DOCTRINES,
    CORE_EQUIPMENT: CORE_EQUIPMENT,
    RUN_UPGRADES: RUN_UPGRADES,
    STAGE_CONTRACTS: STAGE_CONTRACTS,
    ACTIVE_ABILITY: ACTIVE_ABILITY,
    FIRE_TRAITS: FIRE_TRAITS,
    LOADOUT_DEFS: LOADOUT_DEFS,
    DANGER_DEFS: DANGER_DEFS,
    BEARER_DEFS: BEARER_DEFS,
    REMAKE_CURVE_ID: REMAKE_CURVE_ID,
    REMAKE_WAVE_PACING: REMAKE_WAVE_PACING,
    REMAKE_DIFFICULTY_DEFS: REMAKE_DIFFICULTY_DEFS,
    getDifficultyDefinition: getDifficultyDefinition,
    getRemakeSpawnDelay: getRemakeSpawnDelay,
    createRemakeSpawnKinds: createRemakeSpawnKinds,
    WAVE_PACING: WAVE_PACING,
    ACHIEVEMENT_DEFS: ACHIEVEMENT_DEFS,
    TECHNIQUE_DEFS: TECHNIQUE_DEFS,
    ENCOUNTER_MODULES: ENCOUNTER_MODULES,
    BOSS_PROFILES: BOSS_PROFILES,
    createDefaultSave: createDefaultSave,
    sanitizeSave: sanitizeSave,
    getUnlockedBearerIds: getUnlockedBearerIds,
    selectBearer: selectBearer,
    selectLoadout: selectLoadout,
    selectDanger: selectDanger,
    classicRecordKey: classicRecordKey,
    attemptRecordKey: attemptRecordKey,
    compareAttemptRecords: compareAttemptRecords,
    calculateClassicScore: calculateClassicScore,
    evaluateClassicAchievements: evaluateClassicAchievements,
    recordClassicResult: recordClassicResult,
    setPendingRelay: setPendingRelay,
    clearPendingRelay: clearPendingRelay,
    getEmberReward: getEmberReward,
    getLegacyCost: getLegacyCost,
    purchaseLegacy: purchaseLegacy,
    getLegacyBonuses: getLegacyBonuses,
    getWaveTuning: getWaveTuning,
    getWavePacing: getWavePacing,
    getCombatPressure: getCombatPressure,
    getCrossfireReadabilitySpec: getCrossfireReadabilitySpec,
    createCrossfireSpawnEntries: createCrossfireSpawnEntries,
    isCrossfireThreatAllowed: isCrossfireThreatAllowed,
    getBossProfile: getBossProfile,
    getBossBulletSoftCap: getBossBulletSoftCap,
    getBossChargeSpec: getBossChargeSpec,
    getBossTransitionSpec: getBossTransitionSpec,
    getBossAttackSpec: getBossAttackSpec,
    getEncounterSpec: getEncounterSpec,
    getStageEncounterPreview: getStageEncounterPreview,
    getEncounterModuleSpec: getEncounterModuleSpec,
    getContractAttackSpeedMultiplier: getContractAttackSpeedMultiplier,
    getWaveRecoveryRatio: getWaveRecoveryRatio,
    getStageNumber: getStageNumber,
    getUnlockedAnchorWaves: getUnlockedAnchorWaves,
    getRelayAnchorWaves: getRelayAnchorWaves,
    resolveAnchorWave: resolveAnchorWave,
    getAnchorCompensation: getAnchorCompensation,
    getVictoryBonus: getVictoryBonus,
    getIncrementalEmberReward: getIncrementalEmberReward,
    createUpgradeChoices: createUpgradeChoices,
    normalizeChosenUpgradeCounts: normalizeChosenUpgradeCounts,
    createRelayChoices: createRelayChoices,
    createDoctrineChoices: createDoctrineChoices,
    getWeaponEvolution: getWeaponEvolution,
    getDoctrine: getDoctrine,
    getC13WeaponDefinition: getC13WeaponDefinition,
    getC13WeaponLevelDefinition: getC13WeaponLevelDefinition,
    getC13WeaponPair: getC13WeaponPair,
    getC13WeaponPairForLoadout: getC13WeaponPairForLoadout,
    getC13WeaponOutputBudget: getC13WeaponOutputBudget,
    getC13WeaponConcurrencyBudget: getC13WeaponConcurrencyBudget,
    createC13WeaponProgress: createC13WeaponProgress,
    normalizeC13WeaponProgress: normalizeC13WeaponProgress,
    upgradeC13Weapon: upgradeC13Weapon,
    createC13WeaponGrowthCards: createC13WeaponGrowthCards,
    planC13WaveGrowth: planC13WaveGrowth,
    createCoreChoices: createCoreChoices,
    getCoreEquipment: getCoreEquipment,
    createContractChoices: createContractChoices,
    getStageContract: getStageContract,
    getTechniqueDefinition: getTechniqueDefinition,
    getTechniqueById: getTechniqueById,
    createDefaultForgeState: createDefaultForgeState,
    normalizeForgeState: normalizeForgeState,
    collectFireFragment: collectFireFragment,
    burnFireFragment: burnFireFragment,
    forgeTechnique: forgeTechnique,
    createTechniqueEye: createTechniqueEye,
    resolveTechniqueEye: resolveTechniqueEye,
    settleTechniqueEyeOwnerDeath: settleTechniqueEyeOwnerDeath,
    clearForgeWaveState: clearForgeWaveState,
    clearForgeStageState: clearForgeStageState,
    clearForgeRunState: clearForgeRunState,
    resolveFireEvent: resolveFireEvent,
    normalizeRunReport: normalizeRunReport,
    createDefaultRunState: createDefaultRunState,
    applyRunUpgrade: applyRunUpgrade,
    applyChosenRunUpgrade: applyChosenRunUpgrade,
    consumePendingRelay: consumePendingRelay,
    completeRelayWave: completeRelayWave,
    settleRun: settleRun,
    getReturnFireSelection: getReturnFireSelection,
    clone: clone
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.EmberLoopLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
