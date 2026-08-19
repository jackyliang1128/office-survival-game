// ============================================================
//  UpgradeScene.js
//
//  Overlay scene shown when the player levels up. Pauses the
//  GameScene physics, shows up to 3 upgrade choice cards, and
//  on selection applies the chosen upgrade to the player and
//  resumes the game.
//
//  Launched by GameScene with:
//    this.scene.launch('UpgradeScene', { gameScene: this, choices: [...] });
//    this.scene.pause('GameScene');
// ============================================================
import { Rarity } from '../upgrades/Upgrade.js';

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' });
  }

  init(data) {
    this.gameScene = data?.gameScene ?? null;
    this.choices = data?.choices ?? [];
  }

  preload() {
    this.load.image('upgrade-back-shot', 'upgrades/backshot.png');
    this.load.image('upgrade-damage-up', 'upgrades/damage.png');
    this.load.image('upgrade-fire-rate-up', 'upgrades/firerate.png');
    this.load.image('upgrade-knock-back', 'upgrades/knockback.png');
    this.load.image('upgrade-magnet-boost', 'upgrades/magnet.png');
    this.load.image('upgrade-mega-ammo', 'upgrades/magaammo.png');
    this.load.image('upgrade-move-speed-up', 'upgrades/speed.png');
    this.load.image('upgrade-pierce', 'upgrades/pierce.png');
    this.load.image('upgrade-spread-shot', 'upgrades/spreadshot.png');
    this.load.image('upgrade-max-hp-up', 'upgrades/healthup.png');
  }

  create() {
    const { width, height } = this.scale;

    // Dim background overlay.
    this.add.rectangle(0, 0, width, height, 0x000000, 0.65)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(0);

    // Title.
    this.add.text(width / 2, height * 0.18, 'LEVEL UP!', {
      fontSize: '48px',
      color: '#ffeb3b',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1);

    this.add.text(width / 2, height * 0.18 + 50, 'Choose an upgrade', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1);

    this._buildCards(width, height);
  }

  _buildCards(width, height) {
    const cardW = 220;
    const cardH = 300;
    const gap = 40;
    const count = this.choices.length;

    if (count === 0) {
      // Nothing left to offer — just resume.
      this._finish(null);
      return;
    }

    const totalW = count * cardW + (count - 1) * gap;
    const startX = (width - totalW) / 2 + cardW / 2;
    const cardY = height / 2 + 30;

    this.choices.forEach((upgrade, i) => {
      const x = startX + i * (cardW + gap);
      this._buildCard(x, cardY, cardW, cardH, upgrade);
    });
  }

  _buildCard(x, y, w, h, upgrade) {
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(1);
    const isRare = upgrade.rarity === Rarity.RARE;

    const bg = this.add.rectangle(0, 0, w, h, 0x222b3a, 0.95)
      .setStrokeStyle(3, isRare ? 0xffd700 : 0xffffff, 0.8);

    // Glowing border effect for rare upgrades.
    if (isRare) {
      const glow = this.add.rectangle(0, 0, w + 8, h + 8)
        .setStrokeStyle(6, 0xffd700, 0.6)
        .setFillStyle(0x000000, 0);
      container.add(glow);

      this.tweens.add({
        targets: glow,
        alpha: { from: 1, to: 0.3 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const iconBox = this.add.rectangle(0, -h / 2 + 90, w - 40, 130, 0x3a4458, 1)
      .setStrokeStyle(2, 0xffffff, 0.4);

    const iconKey = `upgrade-${upgrade.id}`;
    let iconLabel;
    if (this.textures.exists(iconKey)) {
      iconLabel = this.add.image(0, -h / 2 + 90, iconKey)
        .setOrigin(0.5)
        .setDisplaySize(80, 80);
    } else {
      iconLabel = this.add.text(0, -h / 2 + 90, '[icon]', {
        fontSize: '20px',
        color: '#8aa0c0',
        fontFamily: 'Arial',
        fontStyle: 'italic',
      }).setOrigin(0.5);
    }

    const nameText = this.add.text(0, 30, upgrade.name, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: w - 30 },
    }).setOrigin(0.5);

    // Stacks line: e.g. "Stack 2 / 3" (the stack the player would have AFTER taking this).
    const currentStacks = this.gameScene?.player?.upgrades?.getStacks(upgrade.id) ?? 0;
    const nextStacks = currentStacks + 1;
    let stackLabel;
    if (upgrade.maxStacks === Infinity) {
      stackLabel = `Stack ${nextStacks}`;
    } else if (upgrade.maxStacks > 1) {
      stackLabel = `Stack ${nextStacks} / ${upgrade.maxStacks}`;
    } else {
      stackLabel = 'New';
    }
    const stacksText = this.add.text(
      0, h / 2 - 30,
      stackLabel,
      {
        fontSize: '16px',
        color: '#aac4ff',
        fontFamily: 'Arial',
      }
    ).setOrigin(0.5);

    container.add([bg, iconBox, iconLabel, nameText, stacksText]);

    // Make the card interactive.
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      bg.setStrokeStyle(4, 0xffeb3b, 1);
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(3, isRare ? 0xffd700 : 0xffffff, 0.8);
    });
    bg.on('pointerdown', () => {
      this.sound.play('ui-button', { volume: 0.9});
      this._finish(upgrade);
    });
  }

  _finish(upgrade) {
    if (upgrade && this.gameScene?.player) {
      this.gameScene.player.addUpgrade(upgrade);
    }

    if (this.gameScene) {
      this.scene.resume('GameScene');
    }
    this.scene.stop();
  }
}
