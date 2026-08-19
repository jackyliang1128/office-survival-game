// ============================================================
//  Upgrade.js — base class for all upgrades
//
//  Each upgrade has:
//    - id         unique string used to look it up
//    - name       human-readable name (for HUD/UI)
//    - maxStacks  how many times the player can take it (>= 1)
//    - rarity     one of Rarity.COMMON | Rarity.RARE (extend as needed)
//
//  Subclasses override:
//    - onApply(player, stacks)  called every time a new stack is added.
//                               `stacks` is the new total (1..maxStacks).
//    - onRemove(player)         optional cleanup if the upgrade is removed.
// ============================================================

// Centralized rarity tiers. Use these constants instead of raw strings
// so an upgrade picker can compare safely (e.g. weight by rarity).
export const Rarity = Object.freeze({
  COMMON: 'common',
  RARE: 'rare',
});

export class Upgrade {
  constructor({ id, name, maxStacks = 1, rarity = Rarity.COMMON }) {
    this.id = id;
    this.name = name;
    this.maxStacks = maxStacks;
    this.rarity = rarity;
  }

  // Subclasses should override.
  // eslint-disable-next-line no-unused-vars
  onApply(player, stacks) {}

  // eslint-disable-next-line no-unused-vars
  onRemove(player) {}
}

