export class XpOrb extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, variant = 'normal') {
    super(scene, x, y, 'xp_orb');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    if (variant === 'small') {
      // Splitter children drop a downsized, blue-tinted orb worth less XP.
      this.setScale(0.06);
      this.setTint(0x4ea0ff);
      this.xpValue = 2;
    } else {
      this.setScale(0.10);
      this.xpValue = 5;
    }
  }
}
