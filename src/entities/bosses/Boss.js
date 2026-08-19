import { Enemy } from '../Enemy.js';
import { BOSS_BALANCE } from '../../config/gameBalance.js';

// Base class for all bosses. Adds a simple cooldown-based skill system
// on top of the normal Enemy AI. Subclasses register skills in their
// constructor; skills tick every frame via updateMovement().
export class Boss extends Enemy {
  // Minimum gap (ms) between ANY two skill activations. Subclasses can
  // override by setting their own `static GLOBAL_COOLDOWN_MS = ...`.
  static GLOBAL_COOLDOWN_MS = BOSS_BALANCE.base.globalCooldownMs;

  // Delay (ms) after spawn before the boss can use its first skill.
  // Subclasses can override.
  static INITIAL_DELAY_MS = BOSS_BALANCE.base.initialDelayMs;

  // Subclasses override to load their own spritesheets/atlases.
  // Called from GameScene.preload().
  static preload(scene) {}

  // Subclasses override to create their own animations.
  // Called once from GameScene.create() (via makeBossAnimations()).
  static registerAnimations(scene) {}

  constructor(scene, x, y, hp, options = {}) {
    super(scene, x, y, hp, { ...options, isBoss: true });

    // Each entry: { name, cooldownMs, condition?, execute, lastUsedAt }
    this.skills = [];

    // While `busy` is true, no new skills will be picked from updateSkills().
    // Multi-phase skills (e.g. charge -> attack -> recover) set this true at
    // the start and clear it when fully done. Set via beginSkill()/endSkill().
    this.busy = false;

    // While scene.time.now < suspendMovementUntil, updateMovement() forces
    // velocity to 0 instead of running the normal chase/separation AI.
    // Used by stationary skills (e.g. floating while casting).
    this.suspendMovementUntil = 0;

    // Per-instance skill timings. Default to the subclass's static values
    // so existing bosses behave unchanged; subclasses can override these
    // (e.g. chaos-mode spawns) via applyChaosOverrides().
    this.globalCooldownMs = this.constructor.GLOBAL_COOLDOWN_MS;
    this.initialDelayMs = this.constructor.INITIAL_DELAY_MS;

    // Timestamp of the last skill activation. Used to enforce the global
    // cooldown so different skills can't fire back-to-back. Initialised
    // so the first skill fires after INITIAL_DELAY_MS instead of instantly.
    this.lastSkillUsedAt =
      this.scene.time.now - this.globalCooldownMs + this.initialDelayMs;
  }

  // Apply per-instance overrides (typically driven by scene.chaosMode).
  // `overrides` may contain { hp, globalCooldownMs, initialDelayMs }.
  // Call BEFORE registering skills if possible; safe to call after, since
  // only timing/HP are touched.
  applyChaosOverrides(overrides = {}) {
    if (typeof overrides.hp === 'number') {
      this.maxHp = overrides.hp;
      this.hp = overrides.hp;
      if (this.healthBar) {
        this.healthBar.maxHealth = overrides.hp;
        this.healthBar.setHealth(overrides.hp);
      }
    }
    if (typeof overrides.globalCooldownMs === 'number') {
      this.globalCooldownMs = overrides.globalCooldownMs;
    }
    if (typeof overrides.initialDelayMs === 'number') {
      this.initialDelayMs = overrides.initialDelayMs;
    }
    // Recompute first-skill delay so changes to either field take effect.
    this.lastSkillUsedAt =
      this.scene.time.now - this.globalCooldownMs + this.initialDelayMs;
  }

  // Helper for multi-phase skills. Marks the boss busy and (optionally)
  // suspends movement for `movementSuspendMs`. Call endSkill() when done.
  beginSkill(movementSuspendMs = 0) {
    this.busy = true;
    if (movementSuspendMs > 0) {
      this.suspendMovementUntil = this.scene.time.now + movementSuspendMs;
      if (this.body) {
        // Kill any in-flight chase velocity so we don't drift one frame
        // before the suspended-path zeroing kicks in next tick, and lock
        // the body so the enemy-vs-enemy collider can't shove the boss
        // around while it's supposed to be holding still (e.g. Firebrand's
        // multi-second summon cast).
        this.setVelocity(0, 0);
        this.body.pushable = false;
      }
    }
  }

  endSkill() {
    this.busy = false;
    this.suspendMovementUntil = 0;
    if (this.body) this.body.pushable = true;
  }

  // While a boss is busy with a skill it is immune to external knockback
  // (e.g. from the player's KnockBack upgrade). The boss's own skills
  // still set velocity directly via Enemy.applyKnockback's super impl,
  // but those are called BEFORE busy is set, so they bypass this gate.
  applyKnockback(dirX, dirY, force, durationMs = BOSS_BALANCE.base.knockbackDurationMs) {
    if (this.busy) return;
    super.applyKnockback(dirX, dirY, force, durationMs);
  }

  // Register a skill. Required: `execute(boss, player, scene)`.
  // Optional:
  //   - `name` for debugging.
  //   - `weight` (default 1) for weighted random selection. A skill with
  //     weight 3 is picked 3x as often as one with weight 1.
  //   - `condition(boss, player)` returning false excludes the skill
  //     from this tick's pick (e.g. range-gated skills).
  registerSkill(skill) {
    this.skills.push({
      weight: 1,
      ...skill
    });
  }

  // Hooks into the existing per-frame loop GameScene already runs.
  updateMovement(player, enemies) {
    if (this.scene.time.now < this.suspendMovementUntil) {
      if (this.body) this.setVelocity(0, 0);
      this.updateSkills(player);
      return;
    }
    super.updateMovement(player, enemies);
    this.updateSkills(player);
  }

  // Track the sprite anchor (this.x, this.y) instead of body.center
  // so swapping to skill atlases with different frame sizes doesn't
  // make the health bar visibly jump sideways.
  updateHealthBar() {
    if (this.healthBar) {
      this.healthBar.setPosition(this.x, this.y);
    }
  }

  takeDamage(amount = 1) {
    const scene = this.scene;
    const died = super.takeDamage(amount);
    if (died && scene?.stopBossMusic) {
      // Multiple bosses can be alive at once in chaos mode; only fade the
      // music when no other boss remains.
      const otherBossAlive = scene.enemies?.getChildren().some(
        e => e !== this && e.isBoss && e.active
      );
      if (!otherBossAlive) {
        scene.stopBossMusic();
      }
    }
    return died;
  }

  updateSkills(player) {
    if (!this.active || !player || !player.active) return;
    if (this.busy) return;
    const now = this.scene.time.now;
    const globalCd = this.globalCooldownMs;
    if (now - this.lastSkillUsedAt < globalCd) return;

    // Collect every skill whose condition (if any) passes.
    const ready = [];
    let totalWeight = 0;
    for (const skill of this.skills) {
      if (skill.condition && !skill.condition(this, player)) continue;
      ready.push(skill);
      totalWeight += skill.weight;
    }
    if (ready.length === 0 || totalWeight <= 0) return;

    // Weighted random pick: higher-weight skills win more often.
    let roll = Math.random() * totalWeight;
    let picked = ready[ready.length - 1];
    for (const skill of ready) {
      roll -= skill.weight;
      if (roll <= 0) { picked = skill; break; }
    }

    picked.execute(this, player, this.scene);
    this.lastSkillUsedAt = now;
  }
}
