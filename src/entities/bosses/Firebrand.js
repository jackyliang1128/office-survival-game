import { Boss } from './Boss.js';
import { BOSS_BALANCE } from '../../config/gameBalance.js';

// Firebrand: charges at the player on a cooldown. Reuses the existing
// applyKnockback() shove so AI steering is suspended during the dash.
export class Firebrand extends Boss {
  static BOSS_NAME = 'Firebrand';

  // Per-boss stats. Edit these to tune Firebrand in isolation.
  static HP = BOSS_BALANCE.firebrand.hp;
  static SPEED = BOSS_BALANCE.firebrand.speed;
  static SCALE = BOSS_BALANCE.firebrand.scale; // sprite size multiplier

  // Summon-skill scale multiplier: the summon spritesheet has more
  // transparent padding than the walking sheet, so the boss looks
  // smaller during the summon at the same scale. Bump this until the
  // summon sprite visually matches the walking sprite.
  static SUMMON_SCALE_MULT = BOSS_BALANCE.firebrand.summonScaleMult;

  // Same idea for the wine-toss sheet — frames are 389x405 (vs walk
  // 191x356), so the boss may look off at base scale. Tune to match.
  static TOSS_SCALE_MULT = BOSS_BALANCE.firebrand.tossScaleMult;

  static BOSS_PHASE_SPAWN_RATE_DAMP = BOSS_BALANCE.firebrand.bossPhaseSpawnRateDamp;

  static preload(scene) {
    scene.load.atlas(
      'Firebrand_sheet',
      'enemies/bosses/Firebrandspritesheet.png',
      'enemies/bosses/Firebrandspritesheet.json'
    );
    scene.load.atlas(
      'Firebrand_dash_sheet',
      'enemies/bosses/Firebrand-dash.png',
      'enemies/bosses/Firebrand-dash.json'
    );
    scene.load.image(
      'Firebrand_dash_impact',
      'enemies/bosses/Firebrand-dash_impact.png'
    );
    scene.load.atlas(
      'Firebrand_summon_sheet',
      'enemies/bosses/Firebrand-summon.png',
      'enemies/bosses/Firebrand-summon.json'
    );
    scene.load.image(
      'broken_laptop',
      'enemies/bosses/summoned_items/broken_laptop.png'
    );
    scene.load.image(
      'wine_bottle',
      'enemies/bosses/summoned_items/wine_bottle.png'
    );
    scene.load.image(
      'lit_match',
      'enemies/bosses/summoned_items/lit_match.png'
    );
    scene.load.image(
      'wine_spill',
      'enemies/bosses/effects/wine_spill.png'
    );
    scene.load.image(
      'wine_spill_flames',
      'enemies/bosses/effects/wine_spill_flames.png'
    );
    scene.load.atlas(
      'Firebrand_wineToss_sheet',
      'enemies/bosses/Firebrand-wineToss.png',
      'enemies/bosses/Firebrand-wineToss.json'
    );
  }

  static registerAnimations(scene) {
    if (!scene.anims.exists('Firebrand-walk')) {
      scene.anims.create({
        key: 'Firebrand-walk',
        frames: scene.anims.generateFrameNames('Firebrand_sheet', {
          prefix: 'frame_',
          start: 0,
          end: 7,
          zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
      });
    }

    // Dash is split in two so we can hold on frame 2 with a red flash.
    if (!scene.anims.exists('Firebrand-dash-intro')) {
      scene.anims.create({
        key: 'Firebrand-dash-intro',
        frames: scene.anims.generateFrameNames('Firebrand_dash_sheet', {
          prefix: 'frame_',
          start: 0,
          end: 1,
          zeroPad: 3
        }),
        frameRate: 15,
        repeat: 0
      });
    }

    if (!scene.anims.exists('Firebrand-dash-charge')) {
      scene.anims.create({
        key: 'Firebrand-dash-charge',
        frames: scene.anims.generateFrameNames('Firebrand_dash_sheet', {
          prefix: 'frame_',
          start: 2,
          end: 7,
          zeroPad: 3
        }),
        frameRate: 15,
        repeat: 0
      });
    }

    // Summon: 9 frames stretched across the 2250ms charging window,
    // then holds the final frame through launch/recover.
    if (!scene.anims.exists('Firebrand-summon')) {
      scene.anims.create({
        key: 'Firebrand-summon',
        frames: scene.anims.generateFrameNames('Firebrand_summon_sheet', {
          prefix: 'frame_',
          start: 0,
          end: 8,
          zeroPad: 3
        }),
        frameRate: 4,
        repeat: 0
      });
    }

    // Wine toss: 6 frames @ 10 fps = 600ms total. Bottle is generated
    // and launched on frame 4 (index 3), which starts at ~300ms in.
    if (!scene.anims.exists('Firebrand-wineToss')) {
      scene.anims.create({
        key: 'Firebrand-wineToss',
        frames: scene.anims.generateFrameNames('Firebrand_wineToss_sheet', {
          prefix: 'frame_',
          start: 0,
          end: 5,
          zeroPad: 3
        }),
        frameRate: 10,
        repeat: 0
      });
    }
  }

  constructor(scene, x, y, options = {}) {
    super(scene, x, y, Firebrand.HP, {
      textureKey: 'Firebrand_sheet',
      animKey: 'Firebrand-walk',
      scale: Firebrand.SCALE,
      speed: Firebrand.SPEED,
      faceByVelocity: true,
      ...options
    });

    // Chaos-mode buff: edit BOSS_BALANCE.firebrand.chaos to tune.
    if (scene.chaosMode && BOSS_BALANCE.firebrand.chaos) {
      this.applyChaosOverrides(BOSS_BALANCE.firebrand.chaos);
    }
    
    // higher weight = more commonly picked by updateSkills()

    this.registerSkill({
      name: 'charge',
      weight: BOSS_BALANCE.firebrand.charge.weight,
      execute: (boss, player) => {
        const dashForce = BOSS_BALANCE.firebrand.charge.dashForce;
        const dashDurationMs = BOSS_BALANCE.firebrand.charge.dashDurationMs;

        // Phase timing (all at 15 fps):
        //   intro:    frames 1-2 -> 2 frames = ~133ms
        //   hold:     stay on frame 2 with red-flash tint for 500ms
        //   charge:   frames 3-8 -> 6 frames = ~400ms
        //   dash:     hold frame 8, move forward for dashDurationMs
        const fps = BOSS_BALANCE.firebrand.charge.animFps;
        const introMs = Math.round((2 / fps) * 1000);
        const holdMs = BOSS_BALANCE.firebrand.charge.holdMs;
        const chargeAnimMs = Math.round((6 / fps) * 1000);
        const windupMs = introMs + holdMs + chargeAnimMs;
        const totalMs = windupMs + dashDurationMs;

        // Stationary + knockback-immune for the whole windup.
        boss.beginSkill(windupMs);
        boss.play('Firebrand-dash-intro');

        // Continuously face the player during the windup. Enemy's
        // faceByVelocity flip only runs while moving, but the boss is
        // stationary here — so we drive the flip manually.
        const facingTick = boss.scene.time.addEvent({
          delay: BOSS_BALANCE.firebrand.charge.faceTickMs,
          loop: true,
          callback: () => {
            if (!boss.active || !player.active) return;
            boss.setFlipX(player.x < boss.x);
          }
        });

        // After intro animation completes: start red-flash on frame 2.
        let flashTimer = null;
        boss.scene.time.delayedCall(introMs, () => {
          if (!boss.active) return;
          // Toggle tint every 150ms for a clear flashing effect.
          flashTimer = boss.scene.time.addEvent({
            delay: BOSS_BALANCE.firebrand.charge.flashTickMs,
            loop: true,
            callback: () => {
              if (!boss.active) return;
              if (boss.isTinted) boss.clearTint();
              else boss.setTint(0xff3333);
            }
          });
        });

        // Hold ends: stop flashing, play charge animation (frames 3-8).
        boss.scene.time.delayedCall(introMs + holdMs, () => {
          if (flashTimer) flashTimer.remove();
          if (!boss.active) return;
          boss.clearTint();
          boss.play('Firebrand-dash-charge');
        });

        // State for early-exit on player collision (see collisionTick).
        let dashEnded = false;
        let collisionTick = null;

        // If Firebrand dies at any point in the charge sequence, several
        // delayedCalls early-return without cleaning up their timers.
        // Tear them down here so nothing keeps ticking after death.
        boss.once('destroy', () => {
          if (facingTick) facingTick.remove();
          if (flashTimer) flashTimer.remove();
          if (collisionTick) collisionTick.remove();
        });

        const endDashEarly = (hitPlayer) => {
          if (dashEnded || !boss.active) return;
          dashEnded = true;
          if (collisionTick) collisionTick.remove();
          if (facingTick) facingTick.remove();
          boss.setVelocity(0, 0);
          boss.knockbackUntil = 0;
          // Drop the dash-specific damage cap so normal contact rules resume.
          boss.contactDamageOverride = null;
          if (hitPlayer) {
            boss.anims.stop();
            boss.setTexture('Firebrand_dash_impact');
          }
          // Brief pause so the impact reads, then return to walk.
          boss.scene.time.delayedCall(BOSS_BALANCE.firebrand.charge.impactPauseMs, () => {
            if (!boss.active) return;
            boss.setTexture('Firebrand_sheet', 'frame_000');
            boss.play('Firebrand-walk');
            boss.endSkill();
          });
        };

        // When frame 8 starts (windup complete), aim at the player's
        // current position and apply dash velocity. Bypass
        // boss.applyKnockback() because busy is true; inline what it
        // does so the immunity gate doesn't block our own dash.
        boss.scene.time.delayedCall(windupMs, () => {
          if (!boss.active || !player.active || !boss.body) return;
          if (facingTick) facingTick.remove();
          const dx = player.x - boss.x;
          const dy = player.y - boss.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          // Lock facing to dash direction.
          boss.setFlipX(dx < 0);
          boss.setVelocity((dx / len) * dashForce, (dy / len) * dashForce);
          boss.knockbackUntil = boss.scene.time.now + dashDurationMs;

          // Dash contact damage is capped at 2, never higher than the
          // current scaled enemy contact damage.
          const scaled = boss.scene.enemyDamageMultiplier ?? 1;
          boss.contactDamageOverride = Math.min(2, scaled);

          // Watch for collision with the player throughout the dash.
          collisionTick = boss.scene.time.addEvent({
            delay: BOSS_BALANCE.firebrand.charge.collisionTickMs,
            loop: true,
            callback: () => {
              if (!boss.active || !player.active) return;
              if (boss.scene.physics.overlap(boss, player)) {
                endDashEarly(true);
              }
            }
          });
        });

        // Recover: resume walk anim, end the skill — unless the dash
        // already ended early via collision.
        boss.scene.time.delayedCall(totalMs, () => {
          if (dashEnded || !boss.active) return;
          if (collisionTick) collisionTick.remove();
          if (facingTick) facingTick.remove();
          boss.contactDamageOverride = null;
          boss.play('Firebrand-walk');
          boss.endSkill();
        });
      }
    });

    // Summon-and-throw laptops.
    // Flow:
    //   1. CHARGING (1500ms): boss floats up, stays still, 3 laptops
    //      appear around it one by one.
    //   2. ATTACK   (after charge): each laptop is thrown at the player's
    //      position at the moment of launch. Boss still floating.
    //   3. RECOVER  (~500ms after launch): boss floats back down, skill ends.
    this.registerSkill({
      name: 'summon-laptops',
      weight: BOSS_BALANCE.firebrand.summon.weight,
      execute: (boss, player, scene) => {
        const chargingMs = BOSS_BALANCE.firebrand.summon.chargingMs;
        const recoverMs = BOSS_BALANCE.firebrand.summon.recoverMs;
        const landingMs = BOSS_BALANCE.firebrand.summon.landingMs;      // float-back-down tween duration
        const totalMs = chargingMs + recoverMs;
        const floatLift = BOSS_BALANCE.firebrand.summon.floatLift;       // px the boss "floats" upward
        // 30% chance per cast to summon 6 laptops instead of 3.
        const laptopCount =
          Math.random() < BOSS_BALANCE.firebrand.summon.bigCastChance
            ? BOSS_BALANCE.firebrand.summon.bigCastCount
            : BOSS_BALANCE.firebrand.summon.normalCastCount;
        const orbitRadius = BOSS_BALANCE.firebrand.summon.orbitRadius;
        const laptopSpeed = BOSS_BALANCE.firebrand.summon.laptopSpeed;
        const laptopDamage = BOSS_BALANCE.firebrand.summon.laptopDamage;

        // Suspend movement for the full skill duration AND the landing
        // tween — otherwise the AI re-engages while the boss is still
        // visually descending and the boss drifts during landing.
        boss.beginSkill(totalMs + landingMs);

        // Remember the original scale + ground line so we can restore
        // them on recover and so the shadow stays at the boss's feet
        // (the summon sheet uses different scaling than the walk sheet).
        const originalScaleX = boss.scaleX;
        const originalScaleY = boss.scaleY;
        const walkDisplayHeight = boss.displayHeight;

        boss.play('Firebrand-summon');
        boss.setScale(originalScaleX * Firebrand.SUMMON_SCALE_MULT, originalScaleY * Firebrand.SUMMON_SCALE_MULT);

        // Continuously face the player for the whole skill. The boss is
        // stationary so Enemy's faceByVelocity flip won't run — drive it
        // manually like the charge skill does.
        const facingTick = scene.time.addEvent({
          delay: BOSS_BALANCE.firebrand.charge.faceTickMs,
          loop: true,
          callback: () => {
            if (!boss.active || !player.active) return;
            boss.setFlipX(player.x < boss.x);
          }
        });

        // --- Charging visuals: float up + slight tint pulse ---
        const startY = boss.y;

        // Ground shadow: sits just below the boss's feet, shrinks as it
        // floats up, grows back as it lands, fades out on recover.
        const groundY = startY + (walkDisplayHeight * 0.5) + 6;
        const shadow = scene.add.ellipse(
          boss.x,
          groundY,
          walkDisplayHeight * 0.45,
          walkDisplayHeight * 0.14,
          0x000000,
          0.5
        );
        shadow.setDepth(boss.depth + 0.001);
        scene.tweens.add({
          targets: shadow,
          scaleX: 0.7,
          scaleY: 0.7,
          duration: BOSS_BALANCE.firebrand.summon.shadowShrinkDurationMs,
          ease: 'Sine.easeOut'
        });

        scene.tweens.add({
          targets: boss,
          y: startY - floatLift,
          duration: BOSS_BALANCE.firebrand.summon.floatUpDurationMs,
          ease: 'Sine.easeOut'
        });
        boss.setTint(0x99ddff);

        // If Firebrand dies before the recover phase fires, the recover
        // callback early-returns and the shadow/facingTick are never
        // cleaned up. Tear them down here so nothing lingers on screen.
        boss.once('destroy', () => {
          if (facingTick) facingTick.remove();
          if (shadow && shadow.scene) {
            scene.tweens.killTweensOf(shadow);
            shadow.destroy();
          }
        });

        // Spawn 3 laptops in a ring, starting once the summon anim reaches
        // frame 4 and spreading the rest across the remaining wind-up.
        const laptops = [];
        const summonFrameCount = BOSS_BALANCE.firebrand.summon.summonFrameCount;
        const spawnStartFrame = BOSS_BALANCE.firebrand.summon.spawnStartFrame;
        const spawnStartMs = Math.round((spawnStartFrame / summonFrameCount) * chargingMs);
        const spawnInterval = (chargingMs - spawnStartMs) / laptopCount;
        for (let i = 0; i < laptopCount; i++) {
          scene.time.delayedCall(spawnStartMs + i * spawnInterval, () => {
            if (!boss.active) return;
            const angle = (Math.PI * 2 * i) / laptopCount;
            const lx = boss.x + Math.cos(angle) * orbitRadius;
            const ly = boss.y + Math.sin(angle) * orbitRadius;
            // Placeholder texture; swap to a laptop sprite later.
            const laptop = scene.physics.add.sprite(lx, ly, 'broken_laptop');
            laptop.setScale(BOSS_BALANCE.firebrand.summon.laptopScale);
            laptop.damage = laptopDamage;
            scene.enemyProjectiles.add(laptop);
            laptops.push(laptop);
          });
        }

        // --- Attack: launch each laptop toward the player ---
        // 6-laptop variant tracks the player for `trackingMs` before
        // committing to a straight line. 3-laptop variant is fire-and-forget.
        const isTrackingCast = laptopCount === 6;
        const trackingMs = BOSS_BALANCE.firebrand.summon.trackingMs;
        const trackingTickMs = BOSS_BALANCE.firebrand.summon.trackingTickMs;
        const despawnMs = isTrackingCast
          ? BOSS_BALANCE.firebrand.summon.trackingDespawnMs
          : BOSS_BALANCE.firebrand.summon.normalDespawnMs;
        scene.time.delayedCall(chargingMs, () => {
          if (!boss.active) {
            laptops.forEach(l => l.active && l.destroy());
            return;
          }
          for (const laptop of laptops) {
            if (!laptop.active || !player.active) continue;
            // Tracking laptops move at 90% of the player's current speed so
            // the player can outrun them; non-tracking laptops use the
            // standard projectile speed.
            const trackingLaptopSpeedMult = BOSS_BALANCE.firebrand.summon.trackingLaptopSpeedMult;
            const moveSpeed = isTrackingCast ? (player.speed * trackingLaptopSpeedMult) : laptopSpeed;
            const dx = player.x - laptop.x;
            const dy = player.y - laptop.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            laptop.setVelocity((dx / len) * moveSpeed, (dy / len) * moveSpeed);

            if (isTrackingCast) {
              // Re-aim toward the player every tick; after trackingMs the
              // timer stops and the laptop keeps its last velocity (flies off straight).
              const tracker = scene.time.addEvent({
                delay: trackingTickMs,
                loop: true,
                callback: () => {
                  if (!laptop.active || !player.active) {
                    tracker.remove();
                    return;
                  }
                  const liveSpeed = player.speed * trackingLaptopSpeedMult;
                  const tdx = player.x - laptop.x;
                  const tdy = player.y - laptop.y;
                  const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
                  laptop.setVelocity((tdx / tlen) * liveSpeed, (tdy / tlen) * liveSpeed);
                }
              });
              scene.time.delayedCall(trackingMs, () => tracker.remove());
            }

            scene.time.delayedCall(despawnMs, () => {
              if (laptop.active) laptop.destroy();
            });
          }
        });

        // --- Recover: float back down, clear tint, free the boss ---
        scene.time.delayedCall(totalMs, () => {
          if (!boss.active) return;
          if (facingTick) facingTick.remove();
          boss.clearTint();
          boss.setTexture('Firebrand_sheet', 'frame_000');
          boss.setScale(originalScaleX, originalScaleY);
          boss.play('Firebrand-walk');
          scene.tweens.add({
            targets: boss,
            y: startY,
            duration: landingMs,
            ease: 'Sine.easeIn',
            onComplete: () => {
              // Only now release the boss for AI control — otherwise the
              // chase velocity fights the landing tween.
              if (boss.active) boss.endSkill();
            }
          });
          scene.tweens.add({
            targets: shadow,
            scaleX: 1,
            scaleY: 1,
            alpha: 0,
            duration: landingMs,
            ease: 'Sine.easeIn',
            onComplete: () => shadow.destroy()
          });
        });
      }
    });

    // Wine-bomb (AOE, multi-bottle, two-hit).
    // Flow:
    //   1. THROW PHASE: boss tosses 5 wine bottles in sequence. Each
    //      toss plays the wine-toss animation; the bottle spawns and
    //      launches on frame 4. Bottles land at the player's snapshot
    //      position at the moment of launch (so they spread out if the
    //      player moves between tosses).
    //   2. SPLASH (HIT 1 per bottle): each bottle that lands deals
    //      impact damage in its oval and leaves a red puddle.
    //   3. IGNITE PHASE: once all 5 puddles exist, the boss randomly
    //      picks one and throws a match at it. Each ignite is separated
    //      by a random 3-5s gap. Igniting (HIT 2) sets the puddle on
    //      fire for fireDurationMs and removes it from the pool.
    this.registerSkill({
      name: 'wine-bomb',
      weight: BOSS_BALANCE.firebrand.wineBomb.weight,
      execute: (boss, player, scene) => {
        // Wine-toss anim is 6 frames @ 10 fps. Bottle spawns + launches
        // on frame 4 (index 3), which begins 300ms into the animation.
        const tossAnimFps = BOSS_BALANCE.firebrand.wineBomb.tossAnimFps;
        const tossFrameCount = BOSS_BALANCE.firebrand.wineBomb.tossFrameCount;
        const tossThrowFrameIndex = BOSS_BALANCE.firebrand.wineBomb.tossThrowFrameIndex;
        const tossAnimMs = Math.round((tossFrameCount / tossAnimFps) * 1000);
        const tossThrowDelayMs = Math.round((tossThrowFrameIndex / tossAnimFps) * 1000);
        const throwMs = BOSS_BALANCE.firebrand.wineBomb.throwMs;

        const bottleCount = BOSS_BALANCE.firebrand.wineBomb.bottleCount;
        // Time between consecutive toss-animation starts. One full anim
        // is tossAnimMs (600ms); back-to-back keeps the boss in motion.
        const tossCadenceMs = tossAnimMs;

        const igniteGapMinMs = BOSS_BALANCE.firebrand.wineBomb.igniteGapMinMs;
        const igniteGapMaxMs = BOSS_BALANCE.firebrand.wineBomb.igniteGapMaxMs;
        const matchThrowMs = BOSS_BALANCE.firebrand.wineBomb.matchThrowMs;
        const fireDurationMs = BOSS_BALANCE.firebrand.wineBomb.fireDurationMs;
        // If the boss dies before all puddles have been ignited, the
        // remaining un-ignited wine spills fade out after this delay
        // instead of being ignited.
        const postBossDeathCleanupMs = BOSS_BALANCE.firebrand.wineBomb.postBossDeathCleanupMs;

        // Wine spill displays at exactly 130x70 px (matches the sprite's
        // intended size). The damage oval uses these as its radii so the
        // hitbox lines up with what's drawn. The aim indicator is 15%
        // smaller as a tell.
        const splashWidth = BOSS_BALANCE.firebrand.wineBomb.splashWidth * BOSS_BALANCE.firebrand.wineBomb.splashScale;
        const splashHeight = BOSS_BALANCE.firebrand.wineBomb.splashHeight * BOSS_BALANCE.firebrand.wineBomb.splashScale;
        const splashRadiusX = splashWidth / 2;
        const splashRadiusY = splashHeight / 2;
        const splashScale = BOSS_BALANCE.firebrand.wineBomb.aimScale;
        const aimRadiusX = splashRadiusX / splashScale;
        const aimRadiusY = splashRadiusY / splashScale;

        const fireTickMs = BOSS_BALANCE.firebrand.wineBomb.fireTickMs;
        const fireDmgPerTick = BOSS_BALANCE.firebrand.wineBomb.fireDmgPerTick;
        const igniteDmg = BOSS_BALANCE.firebrand.wineBomb.igniteDmg;        // one-shot hit the moment flames erupt
        const splashDmg = BOSS_BALANCE.firebrand.wineBomb.splashDmg;
        // Slow applied to the player while standing in an un-ignited
        // wine puddle. Multiplier < 1; duration refreshes on each tick.
        const wineSlowMult = BOSS_BALANCE.firebrand.wineBomb.wineSlowMult;
        const wineSlowDurationMs = BOSS_BALANCE.firebrand.wineBomb.wineSlowDurationMs;
        const wineSlowTickMs = BOSS_BALANCE.firebrand.wineBomb.wineSlowTickMs;
        const arcHeight = BOSS_BALANCE.firebrand.wineBomb.arcHeight;
        const matchArcHeight = BOSS_BALANCE.firebrand.wineBomb.matchArcHeight;
        const handOffsetY = BOSS_BALANCE.firebrand.wineBomb.handOffsetY;    // wine spawns roughly at hand height

        // Lock the boss for the whole throw phase, plus one bottle's
        // air time so the last bottle lands while the boss is still
        // committed. Released after that; ignite throws happen freely.
        const throwPhaseMs = tossCadenceMs * bottleCount + throwMs;
        boss.beginSkill(throwPhaseMs);

        // Remember the walking scale so we can restore after the toss
        // animation (toss sheet has different padding than walk sheet).
        const originalScaleX = boss.scaleX;
        const originalScaleY = boss.scaleY;

        // Keep facing the player through the whole throw phase.
        const facingTick = scene.time.addEvent({
          delay: 50,
          loop: true,
          callback: () => {
            if (!boss.active || !player.active) return;
            boss.setFlipX(player.x < boss.x);
          }
        });

        // Live puddles waiting to be ignited. Each entry: { cx, cy, splashOverlay }
        const puddles = [];

        // Centers of every aim point chosen this skill (in-flight bottles
        // + live puddles). Used to keep splashes from overlapping each
        // other by more than ~20% of their area.
        const reservedSpots = [];

        // For two equal-radius circles, ~20% area overlap occurs when
        // centers are 1.37 * r apart. We treat the oval as a circle of
        // radius splashRadiusX by scaling the y-axis by splashRadiusX /
        // splashRadiusY before doing distance checks.
        const minOverlapDist = splashRadiusX * BOSS_BALANCE.firebrand.wineBomb.overlapDistMultiplier;
        const ovalYScale = splashRadiusX / splashRadiusY;

        // Push (rawX, rawY) away from any reservedSpots that would
        // overlap more than the threshold. Returns the nudged point.
        const nudgeAim = (rawX, rawY) => {
          let sx = rawX;
          let sy = rawY * ovalYScale;
          for (let iter = 0; iter < BOSS_BALANCE.firebrand.wineBomb.overlapIterations; iter++) {
            let moved = false;
            for (const spot of reservedSpots) {
              const rsx = spot.x;
              const rsy = spot.y * ovalYScale;
              let dx = sx - rsx;
              let dy = sy - rsy;
              let dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < minOverlapDist) {
                if (dist < 0.01) {
                  // Exact overlap — pick a random push direction.
                  const angle = Math.random() * Math.PI * 2;
                  dx = Math.cos(angle);
                  dy = Math.sin(angle);
                  dist = 1;
                }
                const push = minOverlapDist - dist + BOSS_BALANCE.firebrand.wineBomb.overlapPushFudge;
                sx += (dx / dist) * push;
                sy += (dy / dist) * push;
                moved = true;
              }
            }
            if (!moved) break;
          }
          return { x: sx, y: sy / ovalYScale };
        };

        // ---------- THROW PHASE ----------
        for (let i = 0; i < bottleCount; i++) {
          const tossStart = i * tossCadenceMs;
          let aimIndicator = null;
          let aimX = 0;
          let aimY = 0;

          // Start the toss animation + show the gray aim oval at the
          // player's current snapshot position.
          scene.time.delayedCall(tossStart, () => {
            if (!boss.active || !player.active) return;
            boss.setScale(originalScaleX * Firebrand.TOSS_SCALE_MULT, originalScaleY * Firebrand.TOSS_SCALE_MULT);
            boss.play('Firebrand-wineToss');

            const nudged = nudgeAim(player.x, player.y);
            aimX = nudged.x;
            aimY = nudged.y;
            reservedSpots.push({ x: aimX, y: aimY });
            aimIndicator = scene.add.ellipse(
              aimX,
              aimY,
              aimRadiusX * 2,
              aimRadiusY * 2,
              0x666666,
              0.45
            );
            aimIndicator.setStrokeStyle(3, 0xcccccc, 0.85);
            aimIndicator.setDepth(0);
          });

          // On frame 4: spawn the bottle in hand and launch the arc.
          scene.time.delayedCall(tossStart + tossThrowDelayMs, () => {
            if (!boss.active) {
              if (aimIndicator) aimIndicator.destroy();
              return;
            }

            const handOffsetX = boss.flipX ? -30 : 30;
            const wine = scene.add.sprite(
              boss.x + handOffsetX,
              boss.y + handOffsetY,
              'wine_bottle'
            );
            wine.setScale(BOSS_BALANCE.firebrand.wineBomb.wineScale);
            wine.setDepth(boss.depth + 1);

            const startY = wine.y;

            scene.tweens.add({
              targets: wine,
              x: aimX,
              duration: throwMs,
              ease: 'Linear',
              onUpdate: (tween) => {
                const t = tween.progress;
                wine.y = Phaser.Math.Linear(startY, aimY, t)
                       - Math.sin(t * Math.PI) * arcHeight;
                wine.rotation += 0.25;
              },
              onComplete: () => {
                wine.destroy();
                if (aimIndicator) aimIndicator.destroy();
                spawnSplash(aimX, aimY);
              }
            });
          });
        }

        // After the final toss animation finishes: restore walking pose.
        // (The last bottle is still in mid-air; that's intended.)
        const lastTossEnd = (bottleCount - 1) * tossCadenceMs + tossAnimMs;
        scene.time.delayedCall(lastTossEnd, () => {
          if (!boss.active) return;
          boss.setScale(originalScaleX, originalScaleY);
          boss.setTexture('Firebrand_sheet', 'frame_000');
          boss.play('Firebrand-walk');
        });

        // End boss-locked phase + start the ignite phase once the final
        // bottle has landed.
        scene.time.delayedCall(throwPhaseMs, () => {
          if (facingTick) facingTick.remove();
          if (boss.active) boss.endSkill();
          scheduleNextIgnite();
        });

        // ---------- IGNITE PHASE ----------
        // Fade + destroy a single un-ignited puddle's wine spill.
        const fadeOutPuddle = ({ splashOverlay, slowTick }) => {
          if (slowTick) slowTick.remove(false);
          if (!splashOverlay || !splashOverlay.active) return;
          scene.tweens.add({
            targets: splashOverlay,
            alpha: 0,
            duration: BOSS_BALANCE.firebrand.wineBomb.puddleFadeDurationMs,
            onComplete: () => splashOverlay.destroy()
          });
        };

        // Called when the boss dies mid-ignite-phase. Drains every
        // remaining puddle and fades it out after a short grace period.
        let bossDeathCleanupScheduled = false;
        const scheduleBossDeathCleanup = () => {
          if (bossDeathCleanupScheduled) return;
          bossDeathCleanupScheduled = true;
          scene.time.delayedCall(postBossDeathCleanupMs, () => {
            while (puddles.length > 0) {
              fadeOutPuddle(puddles.pop());
            }
          });
        };

        const scheduleNextIgnite = () => {
          if (puddles.length === 0) return;
          if (!boss.active) {
            scheduleBossDeathCleanup();
            return;
          }
          const gap = Phaser.Math.Between(igniteGapMinMs, igniteGapMaxMs);
          scene.time.delayedCall(gap, () => {
            if (puddles.length === 0) return;
            if (!boss.active) {
              scheduleBossDeathCleanup();
              return;
            }
            // Pick a random puddle and ignite it.
            const idx = Phaser.Math.Between(0, puddles.length - 1);
            const puddle = puddles.splice(idx, 1)[0];
            startMatchThrow(puddle);
            scheduleNextIgnite();
          });
        };

        const startMatchThrow = ({ cx, cy, splashOverlay, slowTick }) => {
          if (slowTick) slowTick.remove(false);
          // Boss died between the gap firing and the match landing —
          // fade this puddle out instead of igniting it. Any other
          // remaining puddles are handled by scheduleBossDeathCleanup.
          if (!boss.active) {
            fadeOutPuddle({ splashOverlay });
            scheduleBossDeathCleanup();
            return;
          }

          const matchStartX = boss.x + (boss.flipX ? -30 : 30);
          const matchStartY = boss.y + handOffsetY;
          const match = scene.add.sprite(matchStartX, matchStartY, 'lit_match');
          match.setScale(BOSS_BALANCE.firebrand.wineBomb.matchScale);
          match.setDepth(boss.depth + 1);

          scene.tweens.add({
            targets: match,
            x: cx,
            duration: matchThrowMs,
            ease: 'Linear',
            onUpdate: (tween) => {
              const t = tween.progress;
              match.y = Phaser.Math.Linear(matchStartY, cy, t)
                      - Math.sin(t * Math.PI) * matchArcHeight;
              match.rotation += 0.4;
            },
            onComplete: () => {
              match.destroy();
              ignite(cx, cy, splashOverlay);
            }
          });
        };

        // ---------- AOE helpers ----------
        // Plays out independently of the boss; survives boss death.

        // Damage anything inside an oval ONCE (no tick gating).
        const damageOnce = (cx, cy, rx, ry, dmg) => {
          const inOval = (x, y) => {
            const nx = (x - cx) / rx;
            const ny = (y - cy) / ry;
            return nx * nx + ny * ny < 1;
          };

          if (scene.player && scene.player.active && inOval(scene.player.x, scene.player.y)) {
            const now = Date.now();
            if (now - scene.lastHurt > 1000) {
              const dead = scene.player.takeDamage(dmg);
              scene.lastHurt = now;
              if (dead && typeof scene.onPlayerDeath === 'function') {
                scene.onPlayerDeath();
              }
            }
          }

          if (scene.enemies) {
            scene.enemies.getChildren().forEach((enemy) => {
              if (!enemy.active || enemy === boss) return;
              if (!inOval(enemy.x, enemy.y)) return;
              const killed = enemy.takeDamage(dmg);
              if (killed && !enemy.isBoss) {
                scene.dropXP(enemy.x, enemy.y, enemy);
                scene.updateEnemyDefeated();
              }
            });
          }
        };

        // HIT 1: bottle landing creates a wine spill and deals splash dmg.
        // Spill stays on the ground until ignited.
        const spawnSplash = (cx, cy) => {
          // Splash sprite. Hit detection uses the splashRadiusX/Y
          // constants directly, not this sprite — it's purely visual.
          const splashOverlay = scene.add.sprite(cx, cy, 'wine_spill');
          const overlayScaleX = (splashRadiusX * 2) / splashOverlay.width;
          const overlayScaleY = (splashRadiusY * 2) / splashOverlay.height;
          splashOverlay.setAlpha(0.9);
          // Sit above the ground (-100) but below entities (default 0)
          // so the player/enemies visually walk over the spill.
          splashOverlay.setDepth(-1);

          // Quick "splash in" pop.
          splashOverlay.setScale(
            overlayScaleX * BOSS_BALANCE.firebrand.wineBomb.splashPopStartScale,
            overlayScaleY * BOSS_BALANCE.firebrand.wineBomb.splashPopStartScale
          );
          scene.tweens.add({
            targets: splashOverlay,
            scaleX: overlayScaleX,
            scaleY: overlayScaleY,
            duration: BOSS_BALANCE.firebrand.wineBomb.splashPopDurationMs,
            ease: 'Back.easeOut'
          });

          damageOnce(cx, cy, splashRadiusX, splashRadiusY, splashDmg);

          // While this puddle exists, periodically check if the player
          // is standing in it. If so, apply (or refresh) the slow.
          const slowTick = scene.time.addEvent({
            delay: wineSlowTickMs,
            loop: true,
            callback: () => {
              if (!splashOverlay.active) {
                slowTick.remove(false);
                return;
              }
              const p = scene.player;
              if (!p || !p.active) return;
              const nx = (p.x - cx) / splashRadiusX;
              const ny = (p.y - cy) / splashRadiusY;
              if (nx * nx + ny * ny < 1) {
                p.applySlow(wineSlowMult, wineSlowDurationMs);
              }
            }
          });

          puddles.push({ cx, cy, splashOverlay, slowTick });
        };

        // HIT 2: initial ignite hit + flame oval that ticks damage
        // for fireDurationMs.
        const ignite = (cx, cy, splashOverlay) => {

          if (splashOverlay) splashOverlay.destroy();

          // Burst damage at the moment of ignition (higher than ticks).
          damageOnce(cx, cy, splashRadiusX, splashRadiusY, igniteDmg);

          const flame = scene.add.sprite(cx, cy, 'wine_spill_flames');
          // Uniform scale so the flames keep their native aspect ratio
          // (taller than the spill). Bottom-align with the spill by
          // anchoring at (0.5, 1) and placing at the spill's bottom edge.
          flame.setScale(splashWidth / flame.width);
          flame.setOrigin(0.5, 1);
          flame.setPosition(cx, cy + splashRadiusY);
          flame.setAlpha(0.9);
          // Same layering rule as the spill: above ground, below entities.
          flame.setDepth(-1);
          scene.tweens.add({
            targets: flame,
            alpha: 0.95,
            duration: BOSS_BALANCE.firebrand.wineBomb.flamePulseDurationMs,
            yoyo: true,
            repeat: -1
          });

          const tickEvent = scene.time.addEvent({
            delay: fireTickMs,
            loop: true,
            callback: () => {
              damageOnce(cx, cy, splashRadiusX, splashRadiusY, fireDmgPerTick);
            }
          });

          scene.time.delayedCall(fireDurationMs, () => {
            tickEvent.remove();
            scene.tweens.add({
              targets: flame,
              alpha: 0,
              duration: BOSS_BALANCE.firebrand.wineBomb.flameFadeDurationMs,
              onComplete: () => flame.destroy()
            });
          });
        };
      }
    });
  }
}
