import { Enemy } from '../Enemy.js';
import { SHOOTER_ENEMY_BALANCE } from '../../config/gameBalance.js';

export class ShooterEnemy extends Enemy {
    constructor(scene, x, y, options = {}) {
        const normalized = typeof options === 'number' ? { hp: options } : options;
        super(scene, x, y, normalized.hp ?? 5, {
            textureKey: normalized.textureKey ?? 'enemy_shooter',
            ...normalized,
        });
        this.bulletRange = SHOOTER_ENEMY_BALANCE.bulletRange;
        this.stopDistance = SHOOTER_ENEMY_BALANCE.stopDistance; // override default Enemy stopDistance
        this.bulletSpeed = SHOOTER_ENEMY_BALANCE.bulletSpeed;
        this.fireRate = SHOOTER_ENEMY_BALANCE.fireRateMs;
        this.bulletLifetimeMs = Math.ceil((this.bulletRange / this.bulletSpeed) * 1000) + SHOOTER_ENEMY_BALANCE.bulletLifetimeBufferMs;
        this.bulletTextureKey = 'enemy_bullet';

        if (!scene.textures.exists(this.bulletTextureKey)) {
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xff5555, 1);
            g.fillCircle(4, 4, 4);
            g.lineStyle(1, 0x990000, 1);
            g.strokeCircle(4, 4, 4);
            g.generateTexture(this.bulletTextureKey, 8, 8);
            g.destroy();
        }

        // Reuse scene-level enemy projectile pool so collision handling
        // stays centralized and we avoid per-enemy overlap listeners.
        this.bullets = scene.enemyProjectiles;

        this.shootTimer = scene.time.addEvent({
            delay: this.fireRate,
            loop: true,
            callback: () => this.shoot(),
        });
    }

    shoot() {
        const target = this.target;
        if (!target || !this.active) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        if (dist > this.bulletRange) return;

        this.fire(target);
    }
    fire(target) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

        const bullet = this.bullets.get(this.x, this.y, this.bulletTextureKey);
        if (!bullet) return;

        const sizeMult = 1;
        const baseHitRadius = SHOOTER_ENEMY_BALANCE.bulletBaseHitRadius;
        const hitRadius = baseHitRadius * sizeMult;

        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.body.reset(this.x, this.y);
        bullet.body.setAllowGravity(false);
        // Center the hit circle on the bullet's actual texture frame
        // (works whether the projectile is the 8×8 fallback or a real PNG).
        const f = bullet.frame || this.scene.textures.getFrame(this.bulletTextureKey);
        const fw = f?.width ?? hitRadius * 2;
        const fh = f?.height ?? hitRadius * 2;
        bullet.body.setCircle(hitRadius, fw / 2 - hitRadius, fh / 2 - hitRadius);
        bullet.setScale(sizeMult); // visual upscale: 1 normal, 3 for mega
        bullet.setDepth(this.depth);
        bullet.setTint(0xff0000);
        bullet.setRotation(angle);
        bullet.damage = this.scene.enemyDamageMultiplier ?? 1;
        bullet.setVelocity(
            Math.cos(angle) * this.bulletSpeed,
            Math.sin(angle) * this.bulletSpeed
        );

        // Failsafe despawn: keeps projectile count bounded without global listeners.
        const expiresAt = this.scene.time.now + this.bulletLifetimeMs;
        bullet.expiresAt = expiresAt;
        this.scene.time.delayedCall(this.bulletLifetimeMs, () => {
            if (bullet.active && bullet.expiresAt === expiresAt) {
                bullet.destroy();
            }
        });
    }

    killBullet(bullet) {
        if (!bullet || !bullet.active) return;
        bullet.destroy();
    }

    preDestroy() {
        if (this.shootTimer) {
            this.shootTimer.remove(false);
            this.shootTimer = null;
        }
        super.preDestroy?.();
    }
}