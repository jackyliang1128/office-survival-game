import { Boss } from './Boss.js';
import { BOSS_BALANCE } from '../../config/gameBalance.js';

// Technomancer: basic chase boss with atlas-driven walk animation.
export class Technomancer extends Boss {
  static BOSS_NAME = 'Technomancer';
  static HP = BOSS_BALANCE.technomancer.hp;
  static SPEED = BOSS_BALANCE.technomancer.speed;
  static WALK_SCALE = BOSS_BALANCE.technomancer.walkScale ?? BOSS_BALANCE.technomancer.scale;
  static SNAP_SCALE = BOSS_BALANCE.technomancer.snapScale ?? BOSS_BALANCE.technomancer.scale;
  static GLOBAL_COOLDOWN_MS = BOSS_BALANCE.technomancer.globalCooldownMs;
  static INITIAL_DELAY_MS = BOSS_BALANCE.technomancer.initialDelayMs;
  static BOSS_PHASE_SPAWN_RATE_DAMP = BOSS_BALANCE.technomancer.bossPhaseSpawnRateDamp;

  static preload(scene) {
    if (!scene.textures.exists('broken_laptop')) {
      scene.load.image(
        'broken_laptop',
        'enemies/bosses/summoned_items/broken_laptop.png'
      );
    }

    scene.load.atlas(
      'Technomancer_sheet',
      'enemies/bosses/Technomancerspritesheet.png',
      'enemies/bosses/Technomancerspritesheet.json'
    );

    scene.load.atlas(
      'Technomancer_snap_sheet',
      'enemies/bosses/TechnomancerSnap.png',
      'enemies/bosses/TechnomancerSnap.json'
    );
  }

  static registerAnimations(scene) {
    if (!scene.anims.exists('Technomancer-walk')) {
      scene.anims.create({
        key: 'Technomancer-walk',
        frames: scene.anims.generateFrameNames('Technomancer_sheet', {
          prefix: 'frame_',
          start: 0,
          end: 6,
          zeroPad: 3
        }),
        frameRate: 7,
        repeat: -1
      });
    }

    if (!scene.anims.exists('Technomancer-snap')) {
      scene.anims.create({
        key: 'Technomancer-snap',
        frames: scene.anims.generateFrameNames('Technomancer_snap_sheet', {
          prefix: 'frame_',
          start: 0,
          end: BOSS_BALANCE.technomancer.snap.animFrameCount - 1,
          zeroPad: 3
        }),
        frameRate: BOSS_BALANCE.technomancer.snap.animFrameRate,
        repeat: 0
      });
    }
  }

  constructor(scene, x, y, options = {}) {
    super(scene, x, y, Technomancer.HP, {
      textureKey: 'Technomancer_sheet',
      animKey: 'Technomancer-walk',
      scale: Technomancer.WALK_SCALE,
      speed: Technomancer.SPEED,
      faceByVelocity: true,
      ...options
    });

    // Chaos-mode buff: edit BOSS_BALANCE.technomancer.chaos to tune.
    if (scene.chaosMode && BOSS_BALANCE.technomancer.chaos) {
      this.applyChaosOverrides(BOSS_BALANCE.technomancer.chaos);
    }

    this.nextLaptopCount = BOSS_BALANCE.technomancer.snap.startLaptopCount;
    this._orbitState = null;

    this.registerSkill({
      name: 'snap-laptops',
      weight: 1,
      condition: boss => !boss._orbitState,
      execute: (boss, _player, scene) => {
        const snapCfg = BOSS_BALANCE.technomancer.snap;
        const windupMs = snapCfg.windupMs;

        boss.beginSkill(windupMs);
        boss.setScale(Technomancer.SNAP_SCALE);
        boss.play('Technomancer-snap');

        scene.time.delayedCall(windupMs, () => {
          if (!boss.active || scene.runEnded) return;

          const laptopCount = boss.nextLaptopCount;
          boss._startOrbitLaptops(laptopCount);

          boss.nextLaptopCount = Math.min(
            snapCfg.maxLaptopCount,
            laptopCount + 1
          );

          boss.setScale(Technomancer.WALK_SCALE);
          boss.play('Technomancer-walk');
          boss.endSkill();
        });
      }
    });

    this.once('destroy', () => {
      this._clearOrbitState(true);
    });
  }

  _startOrbitLaptops(laptopCount) {
    const scene = this.scene;
    const snapCfg = BOSS_BALANCE.technomancer.snap;
    const laptopDamage = BOSS_BALANCE.firebrand.summon.laptopDamage;
    const orbitEntries = [];

    if (this._orbitState) {
      this._clearOrbitState(true);
    }

    const currentActive = scene.enemyProjectiles?.countActive(true) ?? 0;
    const budget = Math.max(0, (snapCfg.maxActiveLaptops ?? 12) - currentActive);
    const spawnCount = Math.min(laptopCount, budget);

    if (spawnCount <= 0) {
      return;
    }

    for (let i = 0; i < spawnCount; i++) {
      const angle = (Math.PI * 2 * i) / spawnCount;
      const dir = 1;

      const laptop = scene.enemyProjectiles.get(
        this.x + Math.cos(angle) * snapCfg.orbitStartRadius,
        this.y + Math.sin(angle) * snapCfg.orbitStartRadius,
        'broken_laptop'
      );

      if (!laptop) continue;

      laptop.setActive(true).setVisible(true);
      laptop.setScale(snapCfg.laptopScale);
      if (laptop.body) {
        laptop.body.enable = true;
        laptop.body.setAllowGravity(false);
        laptop.body.setVelocity(0, 0);
      }
      laptop.damage = laptopDamage;

      orbitEntries.push({ laptop, angle, dir });
    }

    const dtSec = snapCfg.orbitTickMs / 1000;
    this._orbitState = {
      radius: snapCfg.orbitStartRadius,
      startedAt: scene.time.now,
      entries: orbitEntries,
      tick: scene.time.addEvent({
        delay: snapCfg.orbitTickMs,
        loop: true,
        callback: () => {
          if (!this.active || scene.runEnded || !this._orbitState) {
            this._clearOrbitState(true);
            return;
          }

          this._orbitState.radius += snapCfg.orbitGrowPerSec * dtSec;
          const maxOrbitRadius = snapCfg.maxOrbitRadius ?? 900;

          if (this._orbitState.radius >= maxOrbitRadius) {
            this._clearOrbitState(true);
            this.lastSkillUsedAt = scene.time.now - this.constructor.GLOBAL_COOLDOWN_MS;
            return;
          }

          if (scene.time.now - this._orbitState.startedAt >= (snapCfg.maxOrbitDurationMs ?? 12000)) {
            this._clearOrbitState(true);
            this.lastSkillUsedAt = scene.time.now - this.constructor.GLOBAL_COOLDOWN_MS;
            return;
          }

          for (const entry of this._orbitState.entries) {
            const laptop = entry.laptop;
            if (!laptop.active) continue;

            entry.angle += snapCfg.orbitAngularSpeed * dtSec * entry.dir;
            const lx = this.x + Math.cos(entry.angle) * this._orbitState.radius;
            const ly = this.y + Math.sin(entry.angle) * this._orbitState.radius;

            laptop.setPosition(lx, ly);
            laptop.setRotation(entry.angle + Math.PI / 2);
            if (laptop.body) laptop.body.reset(lx, ly);
          }

          this._orbitState.entries = this._orbitState.entries.filter(
            entry => entry.laptop.active
          );

          if (this._orbitState.entries.length === 0) {
            this._clearOrbitState(false);
            // Re-arm instantly so Technomancer snaps again as soon as laptops are gone.
            this.lastSkillUsedAt = scene.time.now - this.constructor.GLOBAL_COOLDOWN_MS;
          }
        }
      })
    };
  }

  _clearOrbitState(destroyLaptops) {
    if (!this._orbitState) return;
    if (this._orbitState.tick) {
      this._orbitState.tick.remove();
    }

    if (destroyLaptops) {
      for (const entry of this._orbitState.entries) {
        if (entry.laptop && entry.laptop.active) {
          entry.laptop.destroy();
        }
      }
    }

    this._orbitState = null;
  }
}