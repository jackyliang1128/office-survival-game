// ============================================================
//  FireRateUp.js
//
//  Increases the player's fire rate (fires more often).
//
//  Implementation detail:
//    player.fireRate is the DELAY between shots in milliseconds —
//    smaller value = faster fire. Each stack multiplies the delay
//    by 0.8, so 3 stacks = 0.8^3 = 0.512x of the base delay
//    (~2x shots per second).
//
//  We call player.setFireRate() because Phaser timers don't read
//  their `delay` field live — the timer must be rescheduled.
// ============================================================
import { Upgrade, Rarity } from './Upgrade.js';
import { UPGRADE_BALANCE } from '../config/gameBalance.js';

export class FireRateUp extends Upgrade {
  constructor() {
    super({
      id: 'fire-rate-up',
      name: 'Fire Rate Up',
      maxStacks: 3,
      rarity: Rarity.COMMON,
    });
  }

  onApply(player, stacks) {
    if (player._baseFireRate == null) {
      player._baseFireRate = player.fireRate;
    }
    const newDelay = player._baseFireRate * Math.pow(UPGRADE_BALANCE.fireRateDelayMultPerStack, stacks);
    player.setFireRate(newDelay);
  }

  onRemove(player) {
    if (player._baseFireRate != null) {
      player.setFireRate(player._baseFireRate);
      player._baseFireRate = null;
    }
  }
}

