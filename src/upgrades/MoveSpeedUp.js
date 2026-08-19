// ============================================================
//  MoveSpeedUp.js
//
//  Increases the player's movement speed.
//
//  Stacking rules:
//    +15% of BASE speed per stack.
//    Max 3 stacks  ->  +45% (1.45x).
//
//  The base speed is cached the first time this upgrade is applied
//  so that re-applies and removes always recompute from the original
//  value, never from a previously-modified one.
// ============================================================
import { Upgrade, Rarity } from './Upgrade.js';
import { UPGRADE_BALANCE } from '../config/gameBalance.js';

export class MoveSpeedUp extends Upgrade {
  constructor() {
    super({
      id: 'move-speed-up',
      name: 'Move Speed Up',
      maxStacks: 3,
      rarity: Rarity.COMMON,
    });
  }

  onApply(player, stacks) {
    if (player._baseSpeed == null) {
      player._baseSpeed = player.speed;
    }
    player.speed = player._baseSpeed * (1 + UPGRADE_BALANCE.moveSpeedPctPerStack * stacks);
  }

  onRemove(player) {
    if (player._baseSpeed != null) {
      player.speed = player._baseSpeed;
      player._baseSpeed = null;
    }
  }
}

