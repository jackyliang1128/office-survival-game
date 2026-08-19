export const GAME_BALANCE = {
  controls: {
    joystickBaseRadius: 60,
    joystickKnobRadius: 28,
    joystickFaceTickMs: 50,
  },
  world: {
    width: 5000,
    height: 5000,
  },
  enemies: {
    baseHp: 3,
    normalScale: 0.2,
    spawnIntervalMs: 1300,
    spawnIntervalFloorMs: 220,
    baseSpeed: 200,
    spawnMinRadius: 500,
    spawnMaxRadius: 1000,
    spawnTooCloseDistance: 40,
    spawnRollMax: 10,
    shooterRollMin: 7,
    splitterRollMin: 8,
    // Time-based unlock thresholds (seconds of survival)
    unlockShooterAtSec: 20,
    unlockSplitterAtSec: 80,
    frequencyBoostAtSec: 180,
    boostedShooterRollMin: 5,
    boostedSplitterRollMin: 7.5,
  },
  boss: {
    spawnDelayMs: 35000,
    spawnRetryDelayMs: 100,
    spawnMinRadius: 700,
    spawnMaxRadius: 1100,
    spawnTooCloseDistance: 120,
  },
  combat: {
    playerInvulnMs: 1000,
    footballDamageMultiplier: 3,
    splitContactGraceMs: 300,
  },
  difficulty: {
    enemyHpMultiplierStart: 1,
    enemyDamageMultiplierStart: 1,
    spawnIntervalDecay: 0.94,
    enemyHpGrowth: 1.10,
    enemyDamageGrowth: 1.06,
    stepIntervalMs: 15000,
    // One-time spawn-rate spike applied each time a boss is defeated, on
    // top of the recurring per-step decay. Expressed as a percent,
    // shrinks the current spawn interval to x% of its value (i.e. spawn
    // rate jumps up by x%). Still clamped by spawnIntervalFloorMs.
    spawnStepUpAfterBoss: 45,
  },  // Chaos mode begins `startDelayAfterFirebrandMs` after Firebrand is defeated:
  // bosses spawn on a fixed interval with no concurrency cap, regular
  // enemies keep their normal spawn rate during boss fights, and
  // difficulty growth per step becomes more aggressive.
  chaos: {
    startDelayAfterFirebrandMs: 20000,
    bossSpawnIntervalMs: 30000,
    enemyHpGrowth: 1.65,
    enemyDamageGrowth: 1.65,
    spawnIntervalDecay: 0.65,
  },  scoring: {
    // XP to reach next level = xpPerLevelBase + currentLevel * xpPerLevelGrowth
    xpPerLevelBase: 20,
    xpPerLevelGrowth: 9,
    timeScorePerSecond: 10,
    enemyDefeatedScore: 100,
  },
  chests: {
    xpReward: 20,
    proximityRadius: 2000,
    spawnDelayMs: 30000,
    margin: 100,
    scale: 0.45,
    arrowOffset: 34,
  },
};

export const PLAYER_BALANCE = {
  spriteScale: 0.05,
  maxHp: 20,
  speed: 300,
  magnetRadius: 100,
  magnetPullSpeed: 1000,
  fireRateMs: 400,
  bulletSpeed: 700,
  bulletRange: 465,
  bulletDamage: 1,
  damageMultiplier: 1,
  spreadDamageMult: 1,
  pierceDamageMult: 1,
  basePierce: 0,
  megaAmmoEvery: 0,
  megaAmmoDamageMult: 1,
  megaAmmoSizeMult: 1,
  knockbackForce: 0,
  bulletVisualBaselinePx: 30,
  megaBulletVisualBaselinePx: 20,
  bulletBaseHitRadius: 8,
};

// 8-way walking animation set under src/assets/hero/direction_animation/.
// Each entry describes one direction's spritesheet (uniform 4-column grid).
// `cell` is the per-frame slice size in pixels (sheetWidth / cols by
// sheetHeight / ceil(frames / cols)). Display scale per direction is
// computed as `targetHeightPx / cell.h` so the hero looks the same size
// regardless of which sheet is playing.
export const PLAYER_ANIMATIONS = {
  targetHeightPx: 80,
  // Velocity threshold (px/s) below which the player is treated as idle.
  idleSpeedThreshold: 5,
  // Cardinal directions are biased so the player keeps facing forward
  // when moving mostly up/down/left/right. Diagonals only activate when
  // the smaller axis is at least this fraction of the larger one.
  diagonalThreshold: 0.45,
  directions: {
    down:       { sheet: 'walk_down',  frames: 9,  cell: { w: 249, h: 333 }, frameRate: 12 },
    up:         { sheet: 'walk_up',    frames: 10, cell: { w: 225, h: 330 }, frameRate: 12 },
    left:       { sheet: 'walk_left',  frames: 10, cell: { w: 234, h: 333 }, frameRate: 12 },
    right:      { sheet: 'walk_right', frames: 10, cell: { w: 216, h: 302 }, frameRate: 12 },
    up_left:    { sheet: 'up_left',    frames: 10, cell: { w: 229, h: 322 }, frameRate: 12 },
    up_right:   { sheet: 'up_right',   frames: 10, cell: { w: 226, h: 335 }, frameRate: 12 },
    down_left:  { sheet: 'down_left',  frames: 10, cell: { w: 218, h: 346 }, frameRate: 12 },
    down_right: { sheet: 'down_right', frames: 8,  cell: { w: 272, h: 364 }, frameRate: 12 },
  },
};

export const ENEMY_BALANCE = {
  defaultScale: 0.05,
  defaultSpeed: 200,
  stopDistance: 60,
  separationDistance: 80,
  nearSlowDistance: 120,
  nearSlowMultiplier: 0.4,
  separationPush: 300,
  knockbackDurationMs: 80,
};

export const SHOOTER_ENEMY_BALANCE = {
  bulletRange: 400,
  stopDistance: 300,
  bulletSpeed: 200,
  fireRateMs: 1000,
  bulletLifetimeBufferMs: 100,
  bulletBaseHitRadius: 8,
};

export const SPLITTER_ENEMY_BALANCE = {
  splitCount: 3,
  splitOffset: 50,
  childHpMultiplier: 1,
};

export const UPGRADE_BALANCE = {
  damageUpPctPerStack: 0.9,
  fireRateDelayMultPerStack: 0.85,
  magnetRadiusPerStack: 80,
  moveSpeedPctPerStack: 0.15,
  knockbackForce: 120,
  pierceTargets: 2,
  pierceDamageFactor: 0.70,
  megaAmmoShotsBetweenMega: 6,
  megaAmmoDamageMult: 2,
  megaAmmoSizeMult: 3,
  backShotAngleRad: Math.PI,
  spreadShotStepRad: Math.PI / 4,
  // Applied once when owning at least one SpreadShot stack.
  spreadShotDamageMult: 0.85,
};

export const BOSS_BALANCE = {
  base: {
    globalCooldownMs: 10000,
    initialDelayMs: 3000,
    knockbackDurationMs: 80,
  },
  striker: {
    hp: 100,
    speed: 200,
    scale: 0.5,
    globalCooldownMs: 1000,
    globalCooldownMs: 800,
    initialDelayMs: 1800,
    // Multiplier on the current normal-enemy spawn rate while this boss
    // is active. <1 slows spawns, >1 speeds them up. The current spawn
    // interval is divided by this value (and clamped to the floor).
    bossPhaseSpawnRateDamp: 0.5,
    // Overrides applied when the boss spawns while scene.chaosMode is true.
    // Any field omitted here falls back to the values above.
    chaos: {
      hp: 150,
      speed: 300,
      globalCooldownMs: 600,
      initialDelayMs: 1200,
    },
    kick: {
      windupMs: 400,
      perKick: 4,
      spreadDeg: 10,
      footballSpeed: 350,
      footballLifetimeMs: 2200,
    },
  },
  technomancer: {
    hp: 180,
    speed: 225,
    scale: 0.7,
    walkScale: 0.7,
    snapScale: 0.55,
    globalCooldownMs: 10000,
    initialDelayMs: 2000,
    bossPhaseSpawnRateDamp: 0.4,
    // Overrides applied when the boss spawns while scene.chaosMode is true.
    // Any field omitted here falls back to the values above.
    chaos: {
      hp: 180,
      globalCooldownMs: 250,
      initialDelayMs: 1500,
    },
    snap: {
      animFrameRate: 12,
      animFrameCount: 9,
      windupMs: 900,
      startLaptopCount: 4,
      maxLaptopCount: 12,
      orbitStartRadius: 120,
      maxOrbitRadius: 900,
      orbitGrowPerSec: 80,
      orbitAngularSpeed: 0.9,
      orbitTickMs: 33,
      laptopScale: 0.078,
      maxActiveLaptops: 12,
      maxOrbitDurationMs: 6000,
    },
  },
  firebrand: {
    hp: 280,
    speed: 120,
    scale: 0.5,
    summonScaleMult: 1.15,
    tossScaleMult: 1.0,
    bossPhaseSpawnRateDamp: 0.4,
    // Overrides applied when the boss spawns while scene.chaosMode is true.
    // Any field omitted here falls back to the values above. Firebrand uses the
    // base-class globalCooldownMs (BOSS_BALANCE.base.globalCooldownMs) when
    // not in chaos mode, so set both globalCooldownMs and initialDelayMs
    // here to override that for chaos spawns.
    chaos: {
      hp: 210,
      globalCooldownMs: 6000,
      initialDelayMs: 2000,
    },
    charge: {
      weight: 2.8,
      dashForce: 600,
      dashDurationMs: 1200,
      animFps: 15,
      holdMs: 500,
      faceTickMs: 50,
      flashTickMs: 150,
      collisionTickMs: 30,
      impactPauseMs: 400,
    },
    summon: {
      weight: 2,
      chargingMs: 2250,
      recoverMs: 750,
      landingMs: 250,
      floatLift: 30,
      bigCastChance: 0.3,
      bigCastCount: 6,
      normalCastCount: 3,
      orbitRadius: 60,
      laptopSpeed: 450,
      laptopDamage: 1.5,
      summonFrameCount: 9,
      spawnStartFrame: 4,
      trackingMs: 7000,
      trackingTickMs: 50,
      trackingLaptopSpeedMult: 0.9,
      trackingDespawnMs: 7000,
      normalDespawnMs: 3000,
      shadowShrinkDurationMs: 300,
      floatUpDurationMs: 300,
      laptopScale: 0.078,
    },
    wineBomb: {
      weight: 1.5,
      tossAnimFps: 10,
      tossFrameCount: 6,
      tossThrowFrameIndex: 3,
      throwMs: 600,
      bottleCount: 7,
      igniteGapMinMs: 3000,
      igniteGapMaxMs: 5000,
      matchThrowMs: 1100,
      fireDurationMs: 40000,
      postBossDeathCleanupMs: 5000,
      splashWidth: 130,
      splashHeight: 70,
      splashScale: 2,
      aimScale: 1.15,
      fireTickMs: 800,
      fireDmgPerTick: 0.5,
      igniteDmg: 2.5,
      splashDmg: 2,
      wineSlowMult: 0.3,
      wineSlowDurationMs: 3000,
      wineSlowTickMs: 200,
      arcHeight: 140,
      matchArcHeight: 180,
      handOffsetY: -40,
      overlapPushFudge: 0.5,
      overlapIterations: 6,
      overlapDistMultiplier: 1.37,
      wineScale: 0.12,
      matchScale: 0.063,
      splashPopStartScale: 0.6,
      splashPopDurationMs: 200,
      puddleFadeDurationMs: 400,
      flamePulseDurationMs: 200,
      flameFadeDurationMs: 300,
    },
  },
};

