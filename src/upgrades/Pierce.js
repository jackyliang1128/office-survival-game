// ============================================================
//  Pierce.js
//
//  Bullets pass through enemies instead of being consumed on first
//  hit. The FIRST enemy a bullet hits takes full damage; each
//  penetration hit after that deals pierceDamageMult (e.g. 50%) of
//  the normal damage.
//
//  Examples (base damage 1, DamageUp x2 -> bulletDamage = 2):
//    enemy #1 hit by bullet -> 2 damage   (full)
//    enemy #2 hit by bullet -> 1 damage   (2 * 0.5)
//    enemy #3 hit by bullet -> 1 damage   (2 * 0.5)
//
//  Implementation notes:
//    - Single stack only.
//    - Sets player.pierce to PIERCE_TARGETS (extra enemies a bullet
//      can hit after the first). 2 means up to 3 enemies per bullet.
//    - Sets player.pierceDamageMult to DAMAGE_FACTOR (0.5). The
//      penalty itself is applied in GameScene's bullet/enemy collider
//      only when hitEnemies.size > 1 (i.e. on penetration hits).
//    - Per-bullet "already hit" tracking lives in fireAtAngle so the
//      same enemy can't take repeated ticks of damage while a piercing
//      bullet stays overlapping it across frames.
// ============================================================
import { Upgrade, Rarity } from './Upgrade.js';
import { UPGRADE_BALANCE } from '../config/gameBalance.js';

export class Pierce extends Upgrade {
  constructor() {
    super({
      id: 'pierce',
      name: 'Pierce',
      maxStacks: 1,
      rarity: Rarity.RARE,
    });
  }

  onApply(player /*, stacks */) {
    if (player._basePierce == null) {
      player._basePierce = player.pierce;
    }
    if (player._basePierceDamageMult == null) {
      player._basePierceDamageMult = player.pierceDamageMult ?? 1;
    }
    player.pierce = UPGRADE_BALANCE.pierceTargets;
    player.pierceDamageMult = UPGRADE_BALANCE.pierceDamageFactor;
  }

  onRemove(player) {
    if (player._basePierce != null) {
      player.pierce = player._basePierce;
      player._basePierce = null;
    }
    if (player._basePierceDamageMult != null) {
      player.pierceDamageMult = player._basePierceDamageMult;
      player._basePierceDamageMult = null;
    }
  }
}

