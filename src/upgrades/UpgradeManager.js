// ============================================================
//  UpgradeManager.js
//
//  Tracks which upgrades the player owns and how many stacks
//  of each. Owned by Player.
//
//  Usage:
//    this.upgrades = new UpgradeManager(this);
//    this.upgrades.add(new SpreadShot());   // returns true if applied
//    this.upgrades.getStacks('spread-shot') // -> number
// ============================================================
export class UpgradeManager {
  constructor(player) {
    this.player = player;

    // id -> { upgrade, stacks }
    this._owned = new Map();
  }

  // Adds one stack of the given upgrade.
  // Returns true if applied, false if already at maxStacks.
  add(upgrade) {
    const existing = this._owned.get(upgrade.id);

    if (existing) {
      if (existing.stacks >= existing.upgrade.maxStacks) return false;
      existing.stacks += 1;
      existing.upgrade.onApply(this.player, existing.stacks);
      return true;
    }

    this._owned.set(upgrade.id, { upgrade, stacks: 1 });
    upgrade.onApply(this.player, 1);
    return true;
  }

  has(id) {
    return this._owned.has(id);
  }

  getStacks(id) {
    const entry = this._owned.get(id);
    return entry ? entry.stacks : 0;
  }

  remove(id) {
    const entry = this._owned.get(id);
    if (!entry) return;
    entry.upgrade.onRemove(this.player);
    this._owned.delete(id);
  }

  list() {
    return Array.from(this._owned.values());
  }
}

