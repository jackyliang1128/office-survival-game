// ============================================================
//  BackShot.js
//
//  Adds a single bullet fired in the OPPOSITE direction of the
//  auto-aim center bullet (180 degrees behind).
//
//  Single-stack upgrade — owning it once is enough; taking it again
//  is a no-op (UpgradeManager enforces maxStacks).
//
//  Composes cleanly with SpreadShot because each upgrade only
//  contributes its own slice of bullet angle offsets via
//  player.setAngleOffsetContribution(id, offsets).
// ============================================================
import { Upgrade, Rarity } from './Upgrade.js';
import { UPGRADE_BALANCE } from '../config/gameBalance.js';

export class BackShot extends Upgrade {
  constructor() {
    super({
      id: 'back-shot',
      name: 'Back Shot',
      maxStacks: 1,
      rarity: Rarity.COMMON,
    });
  }

  onApply(player /*, stacks */) {
    player.setAngleOffsetContribution(this.id, [UPGRADE_BALANCE.backShotAngleRad]); // 180 degrees
  }

  onRemove(player) {
    player.setAngleOffsetContribution(this.id, null);
  }
}

