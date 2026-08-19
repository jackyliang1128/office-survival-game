import Phaser from 'phaser';
import './style.css';

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.add.text(40, 40, 'Return to the Office', {
      color: '#ffffff',
      fontSize: '24px',
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 1280,
  height: 680,
  backgroundColor: '#000000',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
});