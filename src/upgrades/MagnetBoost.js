// ============================================================
//  MagnetBoost.js
//
//  Increases the player's XP orb magnet radius.
//
//  Stacking rules:
//    Each stack adds +100 to player.magnetRadius.
//    Max 3 stacks  ->  +300 total over baseline.
//
//  Implementation notes:
//    The player stores the BASE magnet radius the first time this
//    upgrade is applied (so re-applies stay idempotent and stacks
//    can be recomputed cleanly). On remove, the base value is
//    restored.
// ============================================================
import { Upgrade, Rarity } from './Upgrade.js';
import { UPGRADE_BALANCE } from '../config/gameBalance.js';

export class MagnetBoost extends Upgrade {
  constructor() {
    super({
      id: 'magnet-boost',
      name: 'Magnet Boost',
      maxStacks: 3,
      rarity: Rarity.COMMON,
    });
  }

  onApply(player, stacks) {
    // Cache the original (pre-upgrade) radius the first time we apply.
    if (player._baseMagnetRadius == null) {
      player._baseMagnetRadius = player.magnetRadius;
    }

    player.magnetRadius = player._baseMagnetRadius + stacks * UPGRADE_BALANCE.magnetRadiusPerStack;
  }

  onRemove(player) {
    if (player._baseMagnetRadius != null) {
      player.magnetRadius = player._baseMagnetRadius;
      player._baseMagnetRadius = null;
    }
  }
}

