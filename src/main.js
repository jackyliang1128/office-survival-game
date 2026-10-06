import Phaser from 'phaser';
import './style.css';

import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { UpgradeScene } from './scenes/UpgradeScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { BossAlertScene } from './scenes/BossAlertScene.js';
import { ChaosStageAlertScene } from './scenes/ChaosStageAlertScene.js';
import { AssetLoadingScene } from './scenes/AssetLoadingScene.js';

const DEBUG = false;

const config = {
  type: Phaser.AUTO,

  width: 1280,

  height: 680,

  backgroundColor: '#000000',
  parent: 'game-container',

  // Needed because GameOverScene uses this.add.dom(...)
  dom: {
    createContainer: true,
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: DEBUG,
    },
  },

   // First scene in the array is the startup scene.
  scene: [MenuScene, GameScene, HUDScene, UpgradeScene, GameOverScene, BossAlertScene, ChaosStageAlertScene, AssetLoadingScene],
};

new Phaser.Game(config);
