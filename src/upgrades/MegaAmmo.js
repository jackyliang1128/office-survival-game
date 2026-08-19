// ============================================================
//  MegaAmmo.js
//
//  Every 6th main auto-aim bullet becomes a "mega" bullet:
//    - 3x the visual + hitbox size
//    - 2x the damage (multiplies on top of bulletDamage,
//      damageMultiplier, etc.)
//
//  Only affects the CENTER auto-aim bullet (offset === 0).
//  SpreadShot's side bullets and BackShot's rear bullet are
//  intentionally untouched, per spec.
//
//  Mechanic: Player.fireAt increments megaShotCounter once per shot
//  call. When `counter % megaAmmoEvery === 0`, the center bullet of
//  that shot is flagged mega via fireAtAngle({ isMega: true }).
//
//  Single-stack upgrade.
// ============================================================
import { Upgrade, Rarity } from './Upgrade.js';
import { UPGRADE_BALANCE } from '../config/gameBalance.js';

export class MegaAmmo extends Upgrade {
  constructor() {
    super({
      id: 'mega-ammo',
      name: 'Mega Ammo',
      maxStacks: 1,
      rarity: Rarity.RARE,
    });
  }

  onApply(player /*, stacks */) {
    if (player._baseMegaAmmoEvery == null) {
      player._baseMegaAmmoEvery = player.megaAmmoEvery;
      player._baseMegaAmmoDamageMult = player.megaAmmoDamageMult;
      player._baseMegaAmmoSizeMult = player.megaAmmoSizeMult;
    }
    player.megaAmmoEvery = UPGRADE_BALANCE.megaAmmoShotsBetweenMega;
    player.megaAmmoDamageMult = UPGRADE_BALANCE.megaAmmoDamageMult;
    player.megaAmmoSizeMult = UPGRADE_BALANCE.megaAmmoSizeMult;
  }

  onRemove(player) {
    if (player._baseMegaAmmoEvery != null) {
      player.megaAmmoEvery = player._baseMegaAmmoEvery;
      player.megaAmmoDamageMult = player._baseMegaAmmoDamageMult;
      player.megaAmmoSizeMult = player._baseMegaAmmoSizeMult;
      player._baseMegaAmmoEvery = null;
      player._baseMegaAmmoDamageMult = null;
      player._baseMegaAmmoSizeMult = null;
    }
  }
}

