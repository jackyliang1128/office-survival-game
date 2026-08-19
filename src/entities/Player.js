import { UpgradeManager } from '../upgrades/UpgradeManager.js';
import { PLAYER_BALANCE, PLAYER_ANIMATIONS } from "../config/gameBalance.js";

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    // Start on the first frame of the "down" walk so the player faces the
    // camera before any input arrives.
    super(scene, x, y, 'hero_walk_down', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);

    // 8-way direction state. Updated from velocity in move().
    this.facing = 'down';
    this._applyDirectionScale(this.facing);
    // Show a static idle frame until the player actually moves.
    this.anims.stop();
    this.setFrame(0);

    // Define logged accessors for speed/damage stats BEFORE first assignment
    // so the initial values and every subsequent update get logged in one place.
    this._installStatLoggers();

    this.speed = PLAYER_BALANCE.speed;
    this.speed = 300;
    this.speedMultiplier = 1;
    this._slowResetTimer = null;

    // --- Health ---
    // Player owns its own HP (mirrors Enemy). The HealthBar is a pure view
    // that follows the 'player:hp' scene event emitted by these methods.
    this.maxHp = PLAYER_BALANCE.maxHp;
    this.hp = PLAYER_BALANCE.maxHp;

    // --- XP magnet config ---
    // Orbs inside this radius are pulled toward the player. Pickup
    // itself is handled by GameScene's physics.add.overlap(player, xpOrbs).
    this.magnetRadius = PLAYER_BALANCE.magnetRadius;     // px
    this.magnetPullSpeed = PLAYER_BALANCE.magnetPullSpeed;  // px/sec

    // --- Auto-shoot config ---
    this.fireRate = PLAYER_BALANCE.fireRateMs;        // ms between shots
    this.bulletSpeed = PLAYER_BALANCE.bulletSpeed;     // px/sec
    this.bulletRange = PLAYER_BALANCE.bulletRange;     // px; only fire when target within range
    this.bulletDamage = PLAYER_BALANCE.bulletDamage;      // hp removed per bullet hit (before multiplier)
    this.damageMultiplier = PLAYER_BALANCE.damageMultiplier;  // reserved global damage scalar
    this.spreadDamageMult = PLAYER_BALANCE.spreadDamageMult;  // SpreadShot penalty per bullet (1 = no spread)
    this.pierceDamageMult = PLAYER_BALANCE.pierceDamageMult;  // Pierce penalty per bullet (1 = no penalty)
    this.pierce = PLAYER_BALANCE.basePierce;            // extra enemies a bullet can pass through (0 = none)

    // --- MegaAmmo state (only affects the CENTER auto-aim bullet) ---
    // When `megaAmmoEvery > 0`, every Nth center bullet is supersized
    // and does extra damage. `megaShotCounter` increments each time the
    // player fires; when (counter % every === 0) the center bullet of
    // that shot becomes a mega bullet.
    this.megaAmmoEvery = PLAYER_BALANCE.megaAmmoEvery;          // 0 = disabled. MegaAmmo upgrade sets it to 6.
    this.megaAmmoDamageMult = PLAYER_BALANCE.megaAmmoDamageMult;     // damage multiplier for the mega bullet only
    this.megaAmmoSizeMult = PLAYER_BALANCE.megaAmmoSizeMult;       // visual + hitbox multiplier for mega bullet
    this.megaShotCounter = 0;
    this.knockbackForce = PLAYER_BALANCE.knockbackForce;    // px/sec shove on hit; 0 = none, KnockBack upgrade sets it
    this.targetEnemies = null;  // set by setTargetGroup(); used by shoot timer

    // Angle offsets (radians) added to the aim angle every time we fire.
    // Each upgrade contributes a slice of offsets under its own key in
    // `_offsetContributions`. The combined list (always including 0 for
    // the center auto-aim bullet) is cached in `bulletAngleOffsets` and
    // rebuilt by `_rebuildBulletAngles()` whenever an upgrade changes it.
    this._offsetContributions = new Map(); // upgradeId -> number[]
    this.bulletAngleOffsets = [0];

    // Owns / tracks upgrades. See upgrades/UpgradeManager.js.
    this.upgrades = new UpgradeManager(this);

    // Fallback bullet texture used only if asset preloads are missing.
    if (!scene.textures.exists('bullet_normal')) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffff66, 1);
      g.fillCircle(4, 4, 4);
      g.lineStyle(1, 0xffaa00, 1);
      g.strokeCircle(4, 4, 4);
      g.generateTexture('bullet_normal', 8, 8);
      g.destroy();
    }

    this.normalBulletTextureKey = 'bullet_normal';
    this.damageUpBulletTextureKey = 'bullet_damage_up';
    this.spreadBulletTextureKey = 'bullet_spread';
    this.backShotBulletTextureKey = 'bullet_back';
    this.pierceBulletTextureKey = 'bullet_pierce';
    this.megaBulletTextureKey = 'bullet_mega';

    // Keep icon bullets visually equivalent to the old baseline size.
    const bulletSource = scene.textures.get(this.normalBulletTextureKey)?.getSourceImage?.();
    const bulletPixels = Math.max(bulletSource?.width ?? 8, bulletSource?.height ?? 8) || 8;
    this.baseBulletScale = PLAYER_BALANCE.bulletVisualBaselinePx / bulletPixels;

    // Mega coin bullet is intentionally larger than the normal icon bullet.
    const megaSource = scene.textures.get(this.megaBulletTextureKey)?.getSourceImage?.();
    const megaPixels = Math.max(megaSource?.width ?? bulletPixels, megaSource?.height ?? bulletPixels) || bulletPixels;
    this.megaBulletBaseScale = PLAYER_BALANCE.megaBulletVisualBaselinePx / megaPixels;

    // Pooled physics group for bullets. -1 = uncapped so many can coexist.
    this.bullets = scene.physics.add.group({
      defaultKey: 'bullet',
      maxSize: -1,
      runChildUpdate: false,
    });

    // Despawn bullets when they leave the world bounds (set by GameScene).
    scene.physics.world.on('worldbounds', (body) => {
      const obj = body.gameObject;
      if (obj && this.bullets.contains(obj)) {
        this.killBullet(obj);
      }
    });

    // Auto-fire timer: repeatedly calls shoot() — no button needed.
    this.shootTimer = scene.time.addEvent({
      delay: this.fireRate,
      loop: true,
      callback: () => this.shoot(),
    });
  }

  // GameScene calls this once after creating the enemy group.
  setTargetGroup(enemies) {
    this.targetEnemies = enemies;
  }

  // ----------------------------------------------------------
  // Health
  // ----------------------------------------------------------
  // Installs logged getter/setter pairs for stats we want to trace
  // (speed, bulletDamage, damageMultiplier). The first assignment in
  // the constructor logs as the initial value; every later write from
  // any upgrade logs as an update with old -> new.
  _installStatLoggers() {
    const defineLogged = (key, label) => {
      const backing = `__${key}`;
      this[backing] = undefined;
      Object.defineProperty(this, key, {
        configurable: true,
        enumerable: true,
        get() { return this[backing]; },
        set(v) {
          const prev = this[backing];
          this[backing] = v;
          if (prev === undefined) {
            console.log(`[player] ${label} initial = ${v}`);
          } else if (prev !== v) {
            console.log(`[player] ${label} updated ${prev} -> ${v}`);
          }
        },
      });
    };
    defineLogged('speed', 'speed');
    defineLogged('bulletDamage', 'bulletDamage');
    defineLogged('damageMultiplier', 'damageMultiplier');
  }

  // Emit current HP so the HealthBar view (and any HUD) can follow it.
  _emitHp() {
    this.scene.events.emit('player:hp', { hp: this.hp, maxHp: this.maxHp });
  }

  // Returns true if this damage killed the player.
  takeDamage(amount = 1) {
    this.scene.sounds.hurt.play();
    const before = this.hp;
    this.hp = Math.max(0, this.hp - amount);

    // Red tint to player when hit by ability
    this.setTintFill(0xff0000)
    const player = this;

    this.scene.time.delayedCall(100, () => {
      if (player?.active && player?.scene) {
        player.clearTint();
      }
    });
    this.scene.showDamageNumber(this.x, this.y, amount);
    console.log(`[player] took ${amount} damage (${before} -> ${this.hp}/${this.maxHp})`);
    this._emitHp();

    this.scene.flashDamageBorders();
    return this.hp <= 0;
  }

  heal(amount = 1) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this._emitHp();
  }

  // Raises max HP and grants the same amount as usable HP. Used by MaxHpUp.
  increaseMaxHp(amount = 1) {
    this.maxHp += amount;
    this.hp += amount;
    this._emitHp();
  }

  // HP-boost upgrade behavior:
  //  - if not at full HP, recover 1 HP.
  //  - if already at full HP, raise max HP by 1 (and current HP by 1).
  boostHp() {
    if (this.hp < this.maxHp) {
      this.heal(3);
    } else {
      this.increaseMaxHp(3);
    }
  }

  isDead() {
    return this.hp <= 0;
  }

  // Changes the fire rate (ms between shots) and reschedules the auto-fire
  // timer so the new value takes effect immediately. Used by FireRateUp.
  setFireRate(ms) {
    this.fireRate = Math.max(10, ms); // safety floor so we never spin too fast
    if (this.shootTimer) {
      this.shootTimer.remove(false);
    }
    this.shootTimer = this.scene.time.addEvent({
      delay: this.fireRate,
      loop: true,
      callback: () => this.shoot(),
    });
  }

  move(input) {
    if (!input || !input.joystick) {
      this.setVelocity(0, 0);
      this._updateWalkAnimation(0, 0);
      return;
    }

    const effectiveSpeed = this.speed * this.speedMultiplier;

    let vx = 0;
    let vy = 0;

    if (input.joystick.active) {
      vx = input.joystick.direction.x * effectiveSpeed;
      vy = input.joystick.direction.y * effectiveSpeed;
    } else {
      if (input.left) vx = -effectiveSpeed;
      if (input.right) vx = effectiveSpeed;
      if (input.up) vy = -effectiveSpeed;
      if (input.down) vy = effectiveSpeed;

      if (vx !== 0 && vy !== 0) {
        vx *= 0.707;
        vy *= 0.707;
      }
    }

    this.setVelocity(vx, vy);
    this._updateWalkAnimation(vx, vy);
  }

  // Picks the 8-way walk animation from current velocity. Cardinal
  // directions win unless the smaller axis is a significant fraction of
  // the larger one, which keeps the player from constantly flipping into
  // a diagonal sheet when they walk mostly horizontally or vertically.
  _updateWalkAnimation(vx, vy) {
    const speed = Math.hypot(vx, vy);
    if (speed < PLAYER_ANIMATIONS.idleSpeedThreshold) {
      if (this.anims.isPlaying) {
        this.anims.stop();
        this.setFrame(0);
      }
      return;
    }

    const ax = Math.abs(vx);
    const ay = Math.abs(vy);
    const diagThresh = PLAYER_ANIMATIONS.diagonalThreshold;
    const isDiagonal = ax > 0 && ay > 0 && Math.min(ax, ay) / Math.max(ax, ay) >= diagThresh;

    let dir;
    if (isDiagonal) {
      if (vy < 0 && vx < 0) dir = 'up_left';
      else if (vy < 0 && vx > 0) dir = 'up_right';
      else if (vy > 0 && vx < 0) dir = 'down_left';
      else dir = 'down_right';
    } else if (ax > ay) {
      dir = vx < 0 ? 'left' : 'right';
    } else {
      dir = vy < 0 ? 'up' : 'down';
    }

    if (dir !== this.facing) {
      this.facing = dir;
      this._applyDirectionScale(dir);
    }
    const animKey = `hero-walk-${dir}`;
    if (this.anims.currentAnim?.key !== animKey || !this.anims.isPlaying) {
      this.play(animKey, true);
    }
  }

  // Each direction sheet has its own cell size, so apply a per-direction
  // scale that pins the displayed height to PLAYER_ANIMATIONS.targetHeightPx.
  _applyDirectionScale(dir) {
    const def = PLAYER_ANIMATIONS.directions[dir];
    if (!def) return;
    const scale = PLAYER_ANIMATIONS.targetHeightPx / def.cell.h;
    this.setScale(scale);
  }

  // Temporary multiplicative slow.
  // Repeated calls take the stronger multiplier and refresh the timer
  // to the new duration.
  applySlow(multiplier, durationMs) {
    if (multiplier >= 1 || durationMs <= 0) return;

    const current = this.speedMultiplier;
    this.speedMultiplier = current < 1 ? Math.min(current, multiplier) : multiplier;

    if (this._slowResetTimer) {
      this._slowResetTimer.remove(false);
    }
    this._slowResetTimer = this.scene.time.delayedCall(durationMs, () => {
      this.speedMultiplier = 1;
      this._slowResetTimer = null;
    });
  }

  // ----------------------------------------------------------
  // XP magnet
  // ----------------------------------------------------------
  // Call every frame from GameScene.update:
  //   this.player.updateXpMagnet(this.xpOrbs);
  //
  // Orbs within `magnetRadius` accelerate toward the player at
  // `magnetPullSpeed`. Actual pickup happens via the
  // physics.add.overlap(player, xpOrbs) registered in GameScene.
  updateXpMagnet(xpOrbs) {
    if (!xpOrbs || !this.active) return;

    const magnetSq = this.magnetRadius * this.magnetRadius;

    xpOrbs.getChildren().forEach((orb) => {
      if (!orb.active || !orb.body) return;

      const dx = this.x - orb.x;
      const dy = this.y - orb.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= magnetSq) {
        const dist = Math.sqrt(distSq) || 1;
        // Stronger pull the closer the orb gets (feels snappier).
        const proximity = 1 - dist / this.magnetRadius; // 0..1
        const speed = this.magnetPullSpeed * (0.4 + 0.6 * proximity);
        orb.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      } else if (orb.body.velocity.x !== 0 || orb.body.velocity.y !== 0) {
        // Orb left magnet range; let it stop.
        orb.setVelocity(0, 0);
      }
    });
  }


  // Called automatically by this.shootTimer every `fireRate` ms.
  // Fires one bullet at the nearest enemy if any are in range.
  shoot() {
    const enemies = this.targetEnemies;

    if (!enemies || !this.active || this.isDead()) return;

    const target = this.findClosestEnemy(enemies);
    if (!target) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (dist > this.bulletRange) return;

    this.fireAt(target);
  }

  // Returns the nearest active enemy in the group, or null.
  findClosestEnemy(enemies) {
    let closest = null;
    let closestDistSq = Infinity;

    enemies.getChildren().forEach((e) => {
      if (!e.active) return;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < closestDistSq) {
        closestDistSq = d2;
        closest = e;
      }
    });

    return closest;
  }

  // Convenience wrapper so scenes/pickups can call player.addUpgrade(new SpreadShot()).
  addUpgrade(upgrade) {
    return this.upgrades.add(upgrade);
  }

  _isCenterShotOffset(offset) {
    return Math.abs(offset ?? 0) < 0.0001;
  }

  _isBackShotOffset(offset) {
    if (!Number.isFinite(offset)) return false;
    return Math.abs(Math.abs(offset) - Math.PI) < 0.0001;
  }

  resolveAutoAimBulletTextureKey() {
    if (this.pierce > 0 && this.scene.textures.exists(this.pierceBulletTextureKey)) {
      return this.pierceBulletTextureKey;
    }

    if (this.upgrades.getStacks('damage-up') > 0 && this.scene.textures.exists(this.damageUpBulletTextureKey)) {
      return this.damageUpBulletTextureKey;
    }

    return this.normalBulletTextureKey;
  }

  resolveBulletTextureKey(isMega, offset) {
    if (isMega && this.scene.textures.exists(this.megaBulletTextureKey)) {
      return this.megaBulletTextureKey;
    }

    if (this._isBackShotOffset(offset) && this.scene.textures.exists(this.backShotBulletTextureKey)) {
      return this.backShotBulletTextureKey;
    }

    if (!this._isCenterShotOffset(offset) && this.scene.textures.exists(this.spreadBulletTextureKey)) {
      return this.spreadBulletTextureKey;
    }

    return this.resolveAutoAimBulletTextureKey();
  }

  getBulletRotationOffset(textureKey) {
    // coffee cup art is authored facing the opposite direction
    // relative to other bullet icons.
    if (textureKey === this.megaBulletTextureKey) {
      return Math.PI;
    }
    return 0;
  }

  // Upgrades call this in their onApply/onRemove to register their bullet
  // angle offsets. Pass null/[] to clear. The center bullet (0) is always
  // included automatically — upgrades only add extras.
  setAngleOffsetContribution(upgradeId, offsets) {
    if (!offsets || offsets.length === 0) {
      this._offsetContributions.delete(upgradeId);
    } else {
      this._offsetContributions.set(upgradeId, offsets.slice());
    }
    this._rebuildBulletAngles();
  }

  _rebuildBulletAngles() {
    const combined = [0]; // center auto-aim bullet always present
    for (const arr of this._offsetContributions.values()) {
      for (const a of arr) combined.push(a);
    }
    combined.sort((a, b) => a - b);
    this.bulletAngleOffsets = combined;
  }

  // Spawns one bullet per configured angle offset, all aimed relative
  // to the target. With no upgrades that's just a single bullet at the
  // target. SpreadShot adds entries to this.bulletAngleOffsets.
  fireAt(target) {
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    // MegaAmmo: every Nth shot, the center (offset === 0) bullet is mega.
    this.megaShotCounter += 1;
    const isMegaShot =
      this.megaAmmoEvery > 0 &&
      (this.megaShotCounter % this.megaAmmoEvery === 0);

    for (const offset of this.bulletAngleOffsets) {
      // Mega flag applies ONLY to the center auto-aim bullet (offset 0).
      this.fireAtAngle(baseAngle + offset, { isMega: isMegaShot && offset === 0, offset });
    }
  }

  // Spawns a single bullet traveling along `angle` (radians).
  // `opts.isMega` makes the center bullet bigger + harder hitting.
  fireAtAngle(angle, opts = {}) {
    const isMega = !!opts.isMega;
    const bulletTextureKey = this.resolveBulletTextureKey(isMega, opts.offset ?? 0);

    const bullet = this.bullets.get(this.x, this.y, bulletTextureKey);
    if (!bullet) return; // pool exhausted (shouldn't happen with maxSize: -1)

    const sizeMult = isMega ? this.megaAmmoSizeMult : 1;
    const baseScale = isMega ? this.megaBulletBaseScale : this.baseBulletScale;
    const visualScale = sizeMult * baseScale;

    const baseHitRadius = PLAYER_BALANCE.bulletBaseHitRadius;
    // Keep normal bullets at baseline and scale mega collision with visuals.
    const hitRadius = baseHitRadius * sizeMult * (baseScale / this.baseBulletScale);

    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setTexture(bulletTextureKey);
    bullet.body.reset(this.x, this.y);
    bullet.body.setAllowGravity(false);
    // setCircle(radius, offsetX, offsetY) — offsetX/Y are in SOURCE-TEXTURE
    // pixels measured from the top-left of the frame. The previous code
    // used a hard-coded `+4`, which only centered the body on the 8×8
    // fallback texture; the real bullet PNGs are 200-370 px, so the body
    // ended up pinned to the top-left corner of the sprite and most
    // bullets visually flew through enemies without registering a hit.
    // Read the bullet's actual frame and center the circle on it.
    const bulletFrame = bullet.frame || this.scene.textures.getFrame(bulletTextureKey);
    const frameW = bulletFrame?.width ?? hitRadius * 2;
    const frameH = bulletFrame?.height ?? hitRadius * 2;
    bullet.body.setCircle(hitRadius, frameW / 2 - hitRadius, frameH / 2 - hitRadius);
    bullet.setScale(visualScale);
    bullet.setDepth(this.depth);

    // Per-shot pierce state used by GameScene's bullet/enemy collider.
    bullet.piercesLeft = this.pierce;
    if (bullet.hitEnemies) {
      bullet.hitEnemies.clear();
    } else {
      bullet.hitEnemies = new Set();
    }

    // Compose per-shot modifiers without mutating base bulletDamage.
    // Spread is a per-shot penalty; MegaAmmo is a per-shot bonus.
    // Pierce is NOT composed here — it applies per HIT (only to the 2nd
    // and later enemies a bullet penetrates), handled in GameScene's
    // bullet/enemy collider.
    const megaScale = isMega ? this.megaAmmoDamageMult : 1;
    bullet.damageScale =
      megaScale *
      (this.spreadDamageMult ?? 1);

    bullet.clearTint();

    bullet.setRotation(angle + this.getBulletRotationOffset(bulletTextureKey));
    bullet.setVelocity(
      Math.cos(angle) * this.bulletSpeed,
      Math.sin(angle) * this.bulletSpeed
    );

    // Despawn the bullet when it leaves the world bounds (or hits an enemy).
    bullet.body.setCollideWorldBounds(true);
    bullet.body.onWorldBounds = true;
  }

  // Returns a bullet to the pool. Public so scene colliders can call it.
  killBullet(bullet) {
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.body.stop();
  }
}