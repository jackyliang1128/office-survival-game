export class HealthBar {
  constructor(scene, x, y, maxHealth, options = {}) {
    this.bar = scene.add.graphics();
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
    this.width = 40;
    this.height = 6;
    this.offsetY = options.offsetY ?? -20;
    this.fixedColor = options.fixedColor ?? null;

    this.draw();
    this.bar.setPosition(x, y);
  }

  clamp(x) {
    return Math.min(this.maxHealth, Math.max(x, 0));
  }

  setHealth(value) {
    this.currentHealth = this.clamp(value);
    this.draw();
  }

  changeHealth(value) {
    this.currentHealth = this.clamp(this.currentHealth + value);
    this.draw();
  }

  // Raises the maximum (and heals the same amount so the player actually
  // gains usable HP). Used by the MaxHpUp upgrade.
  increaseMaxHealth(amount = 1) {
    this.maxHealth += amount;
    this.currentHealth = this.clamp(this.currentHealth + amount);
    this.draw();
  }

  isDead() {
    return this.currentHealth === 0;
  }

  setPosition(x, y) {
    this.bar.setPosition(x - this.width / 2, y + this.offsetY);
  }

  setDepth(depth) {
    this.bar.setDepth(depth);
  }

  draw() {
    this.bar.clear();

    // Background
    this.bar.fillStyle(0x000000, 0.8);
    this.bar.fillRect(0, 0, this.width, this.height);

    const pct = this.maxHealth > 0
      ? this.currentHealth / this.maxHealth
      : 0;

    const color = this.fixedColor ?? (
      pct > 0.5 ? 0x00ff00 :
      pct > 0.25 ? 0xffff00 :
      0xff0000
    );

    this.bar.fillStyle(color, 1);
    this.bar.fillRect(1, 1, (this.width - 2) * pct, this.height - 2);
  }

  destroy() {
    this.bar.destroy();
  }
}