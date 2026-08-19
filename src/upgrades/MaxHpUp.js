// ============================================================
//  MaxHpUp.js
//
//  HP-boost upgrade. Behavior per pickup:
//    - if the player is below full HP, recover 1 HP.
//    - if already at full HP, raise max HP by 1 (and current HP by 1).
//  Stacks infinitely (no cap).
//
//  HP lives on the Player entity, so this just calls player.boostHp().
//  The HealthBar view updates itself via the 'player:hp' scene event.
// ============================================================
import { Upgrade, Rarity } from './Upgrade.js';

export class MaxHpUp extends Upgrade {
  constructor() {
    super({
      id: 'max-hp-up',
      name: 'HP Up',
      maxStacks: Infinity, // unlimited stacks
      rarity: Rarity.COMMON,
    });
  }

  onApply(player /*, stacks */) {
    if (typeof player.boostHp === 'function') {
      player.boostHp();
    }
  }
}

