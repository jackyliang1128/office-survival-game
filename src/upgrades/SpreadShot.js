// ============================================================
//  SpreadShot.js
//
//  Adds extra bullets on either side of the auto-aimed center bullet.
//
//  Stacking rules (each stack adds TWO bullets):
//    1 stack  -> +/- 45 deg   (3 bullets total)
//    2 stacks -> +/- 45, 90   (5 bullets total)
//    3 stacks -> +/- 45, 90, 135   (7 bullets total)
//
//  How it works:
//    The player keeps a list `this.bulletAngleOffsets` (in radians).
//    Each frame the player fires, fireAt() iterates that list and
//    spawns one bullet per offset relative to the aim angle.
//    Owning zero stacks of SpreadShot means the list is `[0]` -> just
//    the normal single auto-aim bullet.
// ============================================================
import { Upgrade, Rarity } from './Upgrade.js';
import { UPGRADE_BALANCE } from '../config/gameBalance.js';

export class SpreadShot extends Upgrade {
  constructor() {
    super({
      id: 'spread-shot',
      name: 'Spread Shot',
      maxStacks: 3,
      rarity: Rarity.COMMON,
    });
  }

  onApply(player, stacks) {
    // Build only this upgrade's contribution; the center bullet (0) is
    // added by the player automatically and other upgrades (e.g. BackShot)
    // contribute their own offsets independently.
    const offsets = [];
    for (let i = 1; i <= stacks; i++) {
      const offset = i * UPGRADE_BALANCE.spreadShotStepRad;
      offsets.push(-offset, offset);
    }
    player.setAngleOffsetContribution(this.id, offsets);

    // Damage reduction applies only once (first stack), then stays fixed.
    player.spreadDamageMult = UPGRADE_BALANCE.spreadShotDamageMult;
  }

  onRemove(player) {
    player.setAngleOffsetContribution(this.id, null);
    player.spreadDamageMult = 1;
  }
}

