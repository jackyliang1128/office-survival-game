// ============================================================
//  DamageUp.js
//
//  Multiplies player bullet damage.
//
//  Stacking rules:
//    +50% of BASE damage per stack.
//    Max 3 stacks  ->  +150% (2.5x).
//
//  Damage is rounded to the nearest integer so enemy HP comparisons
//  stay clean. If you later want fractional damage, drop the round.
// ============================================================
import { Upgrade, Rarity } from './Upgrade.js';
import { UPGRADE_BALANCE } from '../config/gameBalance.js';

export class DamageUp extends Upgrade {
  constructor() {
    super({
      id: 'damage-up',
      name: 'Damage Up',
      maxStacks: 3,
      rarity: Rarity.COMMON,
    });
  }

  onApply(player, stacks) {
    if (player._baseBulletDamage == null) {
      player._baseBulletDamage = player.bulletDamage;
    }
    const raw = player._baseBulletDamage * (1 + UPGRADE_BALANCE.damageUpPctPerStack * stacks);
    player.bulletDamage = Math.max(1, raw);
  }

  onRemove(player) {
    if (player._baseBulletDamage != null) {
      player.bulletDamage = player._baseBulletDamage;
      player._baseBulletDamage = null;
    }
  }
}

