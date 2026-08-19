import { HealthBar } from '../UI/HealthBar.js';
import { ENEMY_BALANCE } from '../config/gameBalance.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, hp = 5, options = {}) {
    const textureKey = options.textureKey ?? 'enemy_normal';
    super(scene, x, y, textureKey);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.target = null;

    this.setScale(options.scale ?? ENEMY_BALANCE.defaultScale);

    this.maxHp = hp;
    this.hp = hp;
    this.isBoss = options.isBoss ?? false;
    this.faceByVelocity = options.faceByVelocity ?? false;
    this.setCollideWorldBounds(true);

    this.speed = options.speed ?? ENEMY_BALANCE.defaultSpeed;
    this.stopDistance = ENEMY_BALANCE.stopDistance;
    this.separationDistance = ENEMY_BALANCE.separationDistance;

    // Knockback state. While `scene.time.now < knockbackUntil`,
    // updateMovement skips its normal AI steering so the shove is visible.
    this.knockbackUntil = 0;

    this.healthBar = new HealthBar(scene, this.x, this.y, this.maxHp, {
      fixedColor: 0xff3333,
      offsetY: 22
    });
    this.healthBar.setDepth(this.depth + 0.01);

    if (options.animKey) {
      this.play(options.animKey);
    }
  }

  // Applies a brief shove. `dirX`/`dirY` is the unit direction (caller
  // normalizes), `force` is px/sec, `durationMs` is how long AI steering
  // is suppressed for. Called from GameScene's bullet/enemy collider.
  applyKnockback(dirX, dirY, force, durationMs = ENEMY_BALANCE.knockbackDurationMs) {
    if (!this.active || !this.body) return;
    this.setVelocity(dirX * force, dirY * force);
    this.knockbackUntil = this.scene.time.now + durationMs;
  }

  // Returns true if this hit killed the enemy.
  takeDamage(amount = 1) {
    if (!this.active) return false;
    if (this.scene.sound.getAll('enemy-hit').length < 4) {
      this.scene.sound.play('enemy-hit', { volume: 0.3 });  // changed so that the sound can be used repeatedly
    }
  
    this.hp -= amount;
  
    // Red tint to represent damage taken to enemy
    this.setTintFill(0xff0000);
  
    // Trying to debug why occasionally around 1/10 enemies don't display damage numbers or tint. 
    // Issue isn't related to individual shots or frames, most likely the enemy definition
    const token = (this.hitToken = (this.hitToken || 0) + 1);
  
    this.scene.time.delayedCall(100, () => {
      if (this.active && this.hitToken === token) {
        this.clearTint();
      }
    });
  
    this.scene.showDamageNumber(this.x, this.y, amount);
  
    if (this.hp <= 0) {
      this.healthBar.destroy();
      this.destroy();
      return true;
    }
  
    this.healthBar.setHealth(this.hp);
    return false;
  }

  updateMovement(player, enemies) {
    if (!player || !enemies) return;

    // Honor active knockback; let the shove play out before resuming AI.
    if (this.scene.time.now < this.knockbackUntil) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    let force = this.speed;

    if (dist < ENEMY_BALANCE.nearSlowDistance) {
      force *= ENEMY_BALANCE.nearSlowMultiplier;
    }

    let vx = 0;
    let vy = 0;

    if (dist > this.stopDistance) {
      vx = (dx / dist) * force;
      vy = (dy / dist) * force;
    }

    enemies.getChildren().forEach(other => {
      if (other === this) return;

      const odx = this.x - other.x;
      const ody = this.y - other.y;
      const otherDist = Math.sqrt(odx * odx + ody * ody);

      if (otherDist < this.separationDistance && otherDist > 0) {
        const push = (this.separationDistance - otherDist) / this.separationDistance;

        vx += (odx / otherDist) * push * ENEMY_BALANCE.separationPush;
        vy += (ody / otherDist) * push * ENEMY_BALANCE.separationPush;
      }
    });

    if (this.faceByVelocity && Math.abs(vx) > 1) {
      // Sprite sheet faces right by default; flip to face left.
      this.setFlipX(vx < 0);
    }

    this.setVelocity(vx, vy);
  }

  // Keep health bar centred below the enemy each frame.
  updateHealthBar() {
    if (this.healthBar && this.body) {
      this.healthBar.setPosition(this.body.center.x, this.body.center.y);
    }
  }



  setTarget(player){
    this.target = player;
  }

  getMaxHP() {
      return this.maxHp;
  }

}