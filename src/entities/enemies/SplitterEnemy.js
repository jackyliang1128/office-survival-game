import { Enemy } from '../Enemy.js';
import { SPLITTER_ENEMY_BALANCE } from '../../config/gameBalance.js';

export class SplitterEnemy extends Enemy {
    constructor(scene, x, y, options = {}) {
        const normalized = typeof options === 'number' ? { hp: options } : options;
        super(scene, x, y, normalized.hp ?? 5, {
            textureKey: normalized.textureKey ?? 'enemy_split',
            ...normalized,
        });

        this.splitCount = normalized.splitCount ?? SPLITTER_ENEMY_BALANCE.splitCount;
        this.splitOffset = normalized.splitOffset ?? SPLITTER_ENEMY_BALANCE.splitOffset;
        this.childHpMultiplier = normalized.childHpMultiplier ?? SPLITTER_ENEMY_BALANCE.childHpMultiplier;
    }

    takeDamage(amount = 1) {
        if (!this.active) return false;
    
        const x = this.x;
        const y = this.y;
        const scene = this.scene;
        const childHp = Math.max(1, Math.round(this.getMaxHP() * this.childHpMultiplier));
    
        const died = super.takeDamage(amount);
    
        if (died && scene?.spawnMultiEnemy) {
            scene.spawnMultiEnemy(x, y, childHp, this.splitCount, this.splitOffset);
        }
    
        return died;
    }
}