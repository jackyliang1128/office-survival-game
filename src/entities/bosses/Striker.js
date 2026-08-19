import { Boss } from './Boss.js';
import { BOSS_BALANCE } from '../../config/gameBalance.js';

// Striker: kicks a fan of footballs at the player on a tight cadence,
// with a brief telegraphed wind-up (boss freezes and pulses red) so
// the player has a fair chance to dodge. Reuses scene.footballs (the
// physics group created by GameScene) for projectiles.
export class Striker extends Boss {
  static BOSS_NAME = 'Striker';

  // Per-boss stats. Edit these to tune Striker in isolation.
  static HP = BOSS_BALANCE.striker.hp;
  static SPEED = BOSS_BALANCE.striker.speed;
  static SCALE = BOSS_BALANCE.striker.scale; // sprite size multiplier

  // Striker kicks much more often than Firebrand's heavy skills, so override
  // the inter-skill gap. First kick fires INITIAL_DELAY_MS after spawn.
  static GLOBAL_COOLDOWN_MS = BOSS_BALANCE.striker.globalCooldownMs;
  static INITIAL_DELAY_MS = BOSS_BALANCE.striker.initialDelayMs;
  static BOSS_PHASE_SPAWN_RATE_DAMP = BOSS_BALANCE.striker.bossPhaseSpawnRateDamp;

  static preload(scene) {
    scene.load.atlas(
      'Striker_sheet',
      'enemies/bosses/Strikerspritesheet.png',
      'enemies/bosses/Strikerspritesheet.json'
    );
  }

  static registerAnimations(scene) {
    if (!scene.anims.exists('Striker-walk')) {
      scene.anims.create({
        key: 'Striker-walk',
        frames: scene.anims.generateFrameNames('Striker_sheet', {
          prefix: 'frame_',
          start: 0,
          end: 7,
          zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
      });
    }
  }

  static solveInterceptAngleClosedForm(P1, V1, P2, C) {
    const EPS = 1e-9;

    if (C <= 0) return null;

    // Relative position
    const rx = P1.x - P2.x;
    const ry = P1.y - P2.y;

    // Target velocity
    const vx = V1.x;
    const vy = V1.y;

    // Quadratic coefficients
    const a = vx * vx + vy * vy - C * C;
    const b = 2 * (rx * vx + ry * vy);
    const c = rx * rx + ry * ry;

    let t;

    // Handle near-linear case (a ≈ 0)
    if (Math.abs(a) < EPS) {
        if (Math.abs(b) < EPS) {
            // No motion or ambiguous case
            return null;
        }
        t = -c / b;
        if (t <= 0) return null;
    } else {
        const discriminant = b * b - 4 * a * c;

        // No real solution → cannot intercept
        if (discriminant < 0) return null;

        const sqrtD = Math.sqrt(discriminant);

        const t1 = (-b - sqrtD) / (2 * a);
        const t2 = (-b + sqrtD) / (2 * a);

        // Choose smallest positive time
        t = Math.min(t1 > 0 ? t1 : Infinity, t2 > 0 ? t2 : Infinity);

        if (!isFinite(t)) return null;
    }

    // Compute intercept direction
    const ix = rx + vx * t;
    const iy = ry + vy * t;

    // Normalize to angle
    const angle = Math.atan2(iy, ix);

    return (angle + 2 * Math.PI) % (2 * Math.PI);
}

  constructor(scene, x, y, options = {}) {
    super(scene, x, y, Striker.HP, {
      textureKey: 'Striker_sheet',
      animKey: 'Striker-walk',
      scale: Striker.SCALE,
      speed: Striker.SPEED,
      faceByVelocity: true,
      ...options
    });
    this.shoot_cur_pos = false

    // Chaos-mode buff: edit BOSS_BALANCE.striker.chaos to tune.
    if (scene.chaosMode && BOSS_BALANCE.striker.chaos) {
      this.applyChaosOverrides(BOSS_BALANCE.striker.chaos);
    }

    // Football kick (windup -> volley).
    // Flow:
    //   1. WINDUP (600ms): boss is stationary, tinted red, alpha
    //      pulses so the kick is clearly telegraphed.
    //   2. KICK: a fan of `perKick` footballs launches toward the
    //      player's snapshot position, evenly spread around the aim line.
    this.registerSkill({
      name: 'kick-fan',
      weight: 1,
      execute: (boss, player, scene) => {
        const windupMs = BOSS_BALANCE.striker.kick.windupMs;
        const perKick = BOSS_BALANCE.striker.kick.perKick;
        const spreadDeg = BOSS_BALANCE.striker.kick.spreadDeg;
        const footballSpeed = BOSS_BALANCE.striker.kick.footballSpeed;
        const footballLifetimeMs = BOSS_BALANCE.striker.kick.footballLifetimeMs;

        // Locks movement + knockback immunity for the whole windup.
        boss.beginSkill(windupMs);

        // Boss is stationary during the windup, so Enemy's faceByVelocity
        // flip won't run — drive it manually like Firebrand's skills do.
        const facingTick = scene.time.addEvent({
          delay: 50,
          loop: true,
          callback: () => {
            if (!boss.active || !player.active) return;
            boss.setFlipX(player.x < boss.x);
          }
        });

        // Red-flash tell while the boss is locked in place.
        boss.setTint(0xff5555);
        const flashTween = scene.tweens.add({
          targets: boss,
          alpha: { from: 1, to: 0.55 },
          duration: windupMs / 4,
          yoyo: true,
          repeat: 1
        });

        scene.time.delayedCall(windupMs, () => {
          if (facingTick) facingTick.remove();
          if (flashTween) flashTween.stop();
          if (!boss.active) return;
          boss.setAlpha(1);
          boss.clearTint();

          if (!player.active || scene.runEnded) {
            boss.endSkill();
            return;
          }

          const footballs = scene.footballs;
          if (footballs) {
            var base_angle = 0;
            if(!this.shoot_cur_pos) {
              // const dist_factor = Phaser.Math.Distance.Between(boss.x, boss.y, player.x, player.y) / footballSpeed;
              // base_angle = Phaser.Math.Angle.Between(boss.x, boss.y, player.x + player.body.velocity.x * dist_factor, player.y + player.body.velocity.y * dist_factor);
              base_angle = Striker.solveInterceptAngleClosedForm(player,player.body.velocity,boss,footballSpeed)
            } else {
              base_angle = Phaser.Math.Angle.Between(boss.x, boss.y, player.x , player.y);
            }
            // add in two degrees of variation
            const count = Math.max(1, perKick);
            const spreadRad = Phaser.Math.DegToRad(spreadDeg);

            // Evenly fan the volley around the aim line: count=3 -> -1,0,+1
            // slots; count=5 -> -2,-1,0,+1,+2. Single shot lands dead center.
            const step = count > 1 ? spreadRad / (count - 1) : 0;
            const startOffset = count > 1 ? -spreadRad / 2 : 0;

            for (let i = 0; i < count; i++) {
              const angle = base_angle + startOffset + step * i;
              const football = footballs.create(boss.x, boss.y, 'football');
              football.setDepth(boss.depth + 0.02);
              if(this.shoot_cur_pos) {
                football.setVelocity(
                  Math.cos(angle) * footballSpeed * 0.8,
                  Math.sin(angle) * footballSpeed * 0.8
                );
              } else {
                football.setVelocity(
                  Math.cos(angle) * footballSpeed * 1.0,
                  Math.sin(angle) * footballSpeed * 1.0
                );
              }
              football.body.setCircle(11, 1, 1);
              football.body.setAllowGravity(false);

              scene.tweens.add({
                targets: football,
                angle: 360,
                duration: 400,
                repeat: -1
              });
              if(this.shoot_cur_pos) {
                scene.time.delayedCall(footballLifetimeMs / 0.8, () => {
                  if (football && football.scene && football.active) football.destroy();
                });
              } else {
                scene.time.delayedCall(footballLifetimeMs, () => {
                  if (football && football.scene && football.active) football.destroy();
                });
              }
            }
            this.shoot_cur_pos = !this.shoot_cur_pos
          }

          boss.endSkill();
        });
      }
    });
  }
}
