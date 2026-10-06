import { GameScene } from './GameScene.js';
import { UpgradeScene } from './UpgradeScene.js';

// This scene owns loading independently of the menu and gameplay scenes.
// Stopping the menu or pausing for an upgrade never interrupts a download.
export class AssetLoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AssetLoadingScene' });
    this.status = 'idle';
    this.progress = 0;
  }

  preload() {
    this.status = 'loading';
    this.progress = 0;
    this.load.on('progress', (progress) => {
      this.progress = progress;
      this.events.emit('assets-progress', progress);
    });

    // Reuse the existing asset lists. Phaser skips keys already in its cache.
    GameScene.prototype.preload.call(this);
    UpgradeScene.prototype.preload.call(this);

    this.events.once('shutdown', () => this.load.removeAllListeners('progress'));
  }

  create() {
    if (this.load.totalFailed > 0) {
      this.status = 'failed';
      this.events.emit('assets-failed');
      return;
    }
    this.status = 'ready';
    this.progress = 1;
    this.events.emit('assets-ready');
  }
}
