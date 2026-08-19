// ============================================================
//  KnockBack.js
//
//  Each hit slightly pushes the enemy in the bullet's travel
//  direction. Single stack only.
//
//  How it works:
//    - Sets player.knockbackForce to KNOCKBACK_FORCE on apply.
//    - GameScene's bullet/enemy overlap reads that value and calls
//      enemy.applyKnockback(dirX, dirY, force) which gives the enemy
//      a brief velocity shove (suppressing its AI steering for a few
//      frames so the push is visible).
//
//  Tuning:
//    KNOCKBACK_FORCE is intentionally small (120 px/sec) so the
//    enemy only gets nudged, not flung across the screen.
// ============================================================
import { Upgrade, Rarity } from './Upgrade.js';
import { UPGRADE_BALANCE } from '../config/gameBalance.js';

export class KnockBack extends Upgrade {
  constructor() {
    super({
      id: 'knock-back',
      name: 'Knock Back',
      maxStacks: 1,
      rarity: Rarity.RARE,
    });
  }

  onApply(player /*, stacks */) {
    if (player._baseKnockbackForce == null) {
      player._baseKnockbackForce = player.knockbackForce;
    }
    player.knockbackForce = UPGRADE_BALANCE.knockbackForce;
  }

  onRemove(player) {
    if (player._baseKnockbackForce != null) {
      player.knockbackForce = player._baseKnockbackForce;
      player._baseKnockbackForce = null;
    }
  }
}

