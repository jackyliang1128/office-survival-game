// ============================================================
//  MenuScene.js — Title screen / entry point
//
//  Office-survival themed title screen.
//  Starts GameScene on click/tap.
// ============================================================

const TITLE_FONT = "Impact, Haettenschweiler, 'Arial Black', 'Arial Narrow Bold', Arial, sans-serif";
const BODY_FONT = "Arial, sans-serif";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  preload() {
    this.load.image('office-floor', 'background/office_floor_grid_64.png');

    this.load.image('menu-hero', 'hero/hero.png');

    this.load.image('enemy-auditor', 'enemies/normal_enemy/enemy_angry_auditor.png');
    this.load.image('enemy-burnout', 'enemies/normal_enemy/enemy_burnout_employee.png');
    this.load.image('enemy-deadline', 'enemies/normal_enemy/enemy_deadline_demon.png');
    this.load.image('enemy-meeting', 'enemies/normal_enemy/enemy_meeting_ghost.png');
    this.load.image('enemy-printer', 'enemies/normal_enemy/enemy_printer_spirit.png');

    this.load.image('icon-email', 'icon_for_item_bullet/email.png');
    this.load.image('icon-coffee', 'icon_for_item_bullet/coffee_cup.png');
    this.load.image('icon-briefcase', 'icon_for_item_bullet/briefcase.png');
    this.load.image('icon-book', 'icon_for_item_bullet/book.png');
    this.load.image('icon-badge', 'icon_for_item_bullet/badge.png');

    this.load.image('item-laptop', 'enemies/bosses/summoned_items/broken_laptop.png');
    this.load.image('item-it-match', 'enemies/bosses/summoned_items/lit_match.png');
    this.load.image('item-wine-bottle', 'enemies/bosses/summoned_items/wine_bottle.png');

    this.load.audio('yoinky-sploinky', 'audio/yoinky-sploinky.mp3');
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0b0f16');

    this.makeBackground(width, height);
    this.makeOfficeClutter(width, height);
    this.makeCharacters(width, height);
    this.makeTitle(width, height);
    this.makeStartButton(width, height);
    this.bgm = this.sound.add('yoinky-sploinky', { volume: 0.32, loop: true});
    this.bgm.play()
  }

  makeBackground(width, height) {
    this.add.tileSprite(0, 0, width, height, 'office-floor')
      .setOrigin(0, 0)
      .setDepth(0);

    // Overall dark tint.
    this.add.rectangle(0, 0, width, height, 0x071016, 0.44)
      .setOrigin(0, 0)
      .setDepth(1);

    // Clean center readability panel. Not a hard poster box.
    this.add.rectangle(width / 2, height * 0.49, width * 0.58, height * 0.46, 0x111827, 0.68)
      .setOrigin(0.5)
      .setDepth(2);

    // Small top fade.
    this.add.rectangle(width / 2, 0, width, 112, 0x000000, 0.28)
      .setOrigin(0.5, 0)
      .setDepth(2);

    // Small bottom fade.
    this.add.rectangle(width / 2, height, width, 132, 0x000000, 0.22)
      .setOrigin(0.5, 1)
      .setDepth(2);
  }

  makeOfficeClutter(width, height) {
    const clutter = [
      { key: 'icon-email', x: 0.36, y: 0.74, scale: 0.055, rot: -0.25, alpha: 0.58 },
      { key: 'icon-email', x: 0.64, y: 0.74, scale: 0.05, rot: 0.3, alpha: 0.45 },
      { key: 'icon-coffee', x: 0.22, y: 0.77, scale: 0.06, rot: -0.15, alpha: 0.52 },
      { key: 'icon-briefcase', x: 0.78, y: 0.78, scale: 0.06, rot: 0.12, alpha: 0.42 },
      { key: 'icon-book', x: 0.43, y: 0.84, scale: 0.055, rot: -0.2, alpha: 0.46 },
      { key: 'icon-badge', x: 0.57, y: 0.84, scale: 0.055, rot: 0.2, alpha: 0.46 },
      { key: 'item-laptop', x: 0.12, y: 0.58, scale: 0.12, rot: -0.1, alpha: 0.38 },
      { key: 'item-lit-match', x: 0.88, y: 0.55, scale: 0.12, rot: 0.12, alpha: 0.38 },
      { key: 'item-wine-bottle', x: 0.50, y: 0.86, scale: 0.09, rot: 0.2, alpha: 0.34 }
    ];

    const sprites = clutter.map((item) => {
      return this.add.image(width * item.x, height * item.y, item.key)
        .setOrigin(0.5)
        .setScale(item.scale)
        .setRotation(item.rot)
        .setAlpha(item.alpha)
        .setDepth(3);
    });

    this.tweens.add({
      targets: sprites,
      y: '-=7',
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  makeCharacters(width, height) {
    // Keep character sprites smaller so they frame the title instead of dominating it.
    const enemies = [
      { key: 'enemy-auditor', x: 0.15, y: 0.36, scale: 0.105, alpha: 0.58, rot: -0.08 },
      { key: 'enemy-printer', x: 0.15, y: 0.66, scale: 0.105, alpha: 0.50, rot: 0.08 },
      { key: 'enemy-burnout', x: 0.30, y: 0.76, scale: 0.115, alpha: 0.48, rot: -0.05 },

      { key: 'enemy-deadline', x: 0.85, y: 0.36, scale: 0.105, alpha: 0.58, rot: 0.08 },
      { key: 'enemy-meeting', x: 0.85, y: 0.64, scale: 0.105, alpha: 0.52, rot: -0.08 },
      { key: 'enemy-printer', x: 0.72, y: 0.76, scale: 0.095, alpha: 0.44, rot: 0.08 }
    ];

    const enemySprites = enemies.map((enemy) => {
      return this.add.image(width * enemy.x, height * enemy.y, enemy.key)
        .setOrigin(0.5)
        .setScale(enemy.scale)
        .setAlpha(enemy.alpha)
        .setRotation(enemy.rot)
        .setDepth(4);
    });

    // Hero is visible, but not huge and not touching the button.
    const hero = this.add.image(width * 0.23, height * 0.68, 'menu-hero')
      .setOrigin(0.5)
      .setScale(0.145)
      .setAlpha(0.95)
      .setDepth(5);

    this.tweens.add({
      targets: enemySprites,
      y: '+=8',
      duration: 1550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: hero,
      y: '-=6',
      duration: 1350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  makeTitle(width, height) {
    this.add.text(width / 2, height * 0.36, 'RETURN TO THE', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: TITLE_FONT,
      align: 'center'
    })
      .setOrigin(0.5)
      .setStroke('#000000', 6)
      .setDepth(10);

    this.add.text(width / 2, height * 0.50, 'OFFICE', {
      fontSize: '96px',
      color: '#ffeb3b',
      fontFamily: TITLE_FONT,
      align: 'center'
    })
      .setOrigin(0.5)
      .setStroke('#000000', 8)
      .setDepth(10);

    this.add.text(width / 2, height * 0.61, 'Survive the workday', {
      fontSize: '24px',
      color: '#aac4ff',
      fontFamily: BODY_FONT,
      fontStyle: 'bold',
      align: 'center'
    })
      .setOrigin(0.5)
      .setDepth(10);
  }

  makeStartButton(width, height) {
    const btnW = 330;
    const btnH = 68;
    const btnY = height * 0.725;

    const btnShadow = this.add.rectangle(width / 2 + 5, btnY + 6, btnW, btnH, 0x000000, 0.42)
      .setOrigin(0.5)
      .setDepth(10);

    const btnBg = this.add.rectangle(width / 2, btnY, btnW, btnH, 0x3a4458, 1)
      .setOrigin(0.5)
      .setStrokeStyle(3, 0xf2c230, 1)
      .setInteractive({ useHandCursor: true })
      .setDepth(11);

    this.add.text(width / 2, btnY, 'START GAME', {
      fontSize: '30px',
      color: '#ffffff',
      fontFamily: TITLE_FONT,
      align: 'center'
    })
      .setOrigin(0.5)
      .setDepth(12);

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x4a5670, 1);
      btnBg.setStrokeStyle(3, 0xffeb3b, 1);
      btnShadow.setAlpha(0.6);
    });

    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x3a4458, 1);
      btnBg.setStrokeStyle(3, 0xf2c230, 1);
      btnShadow.setAlpha(0.42);
    });

    btnBg.on('pointerdown', () => {
      this.bgm.stop();
      this.scene.start('GameScene');
    });

    const hint = this.add.text(width / 2, btnY + 58, 'Tap or click to begin', {
      fontSize: '16px',
      color: '#8aa0c0',
      fontFamily: BODY_FONT
    })
      .setOrigin(0.5)
      .setDepth(12);

    this.tweens.add({
      targets: hint,
      alpha: { from: 1, to: 0.35 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}