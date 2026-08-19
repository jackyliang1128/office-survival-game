export class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' });
  }

  create() {
    this.score = 0;
    this.enemiesDefeated = 0;
    this.xp = 0;
    this.level = 1;
    this.xpPerLevel = 20;
    this.survivalTime = 0;
    this.hp = 1;
    this.maxHp = 1;

    this.TITLE_FONT = "Impact, Haettenschweiler, 'Arial Black', 'Arial Narrow Bold', Arial, sans-serif";
    this.BODY_FONT = "Arial, sans-serif";

    const { width } = this.scale;

    // Small transparent score panel, top-left.
    this.SCORE_PANEL_X = 14;
    this.SCORE_PANEL_Y = 14;
    this.SCORE_PANEL_W = 180;
    this.SCORE_PANEL_H = 78;

    // Top-center HP and XP bars.
    this.BAR_W = 390;
    this.BAR_H = 12;
    this.BAR_X = width / 2 - this.BAR_W / 2;
    this.HP_BAR_Y = 18;
    this.XP_BAR_Y = 42;

    this.container = this.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(1000);

    this.panelGraphics = this.add.graphics();
    this.panelGraphics.setScrollFactor(0);

    this.barGraphics = this.add.graphics();
    this.barGraphics.setScrollFactor(0);

    // Score panel text.
    this.scoreLabel = this.add.text(
      this.SCORE_PANEL_X + this.SCORE_PANEL_W / 2,
      this.SCORE_PANEL_Y + 8,
      'SCORE',
      {
        fontSize: '12px',
        color: '#aac4ff',
        fontFamily: this.BODY_FONT,
        fontStyle: 'bold',
        align: 'center'
      }
    ).setOrigin(0.5, 0);

    this.scoreText = this.add.text(
      this.SCORE_PANEL_X + this.SCORE_PANEL_W / 2,
      this.SCORE_PANEL_Y + 22,
      '0',
      {
        fontSize: '29px',
        color: '#ffeb3b',
        fontFamily: this.TITLE_FONT,
        align: 'center'
      }
    )
      .setOrigin(0.5, 0)
      .setStroke('#000000', 4);

    this.defeatsText = this.add.text(
      this.SCORE_PANEL_X + 46,
      this.SCORE_PANEL_Y + 58,
      'KOs 0',
      {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: this.BODY_FONT,
        fontStyle: 'bold',
        align: 'center'
      }
    ).setOrigin(0.5, 0);

    this.timeText = this.add.text(
      this.SCORE_PANEL_X + 132,
      this.SCORE_PANEL_Y + 58,
      '0:00',
      {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: this.BODY_FONT,
        fontStyle: 'bold',
        align: 'center'
      }
    ).setOrigin(0.5, 0);

    // Top center bar labels.
    this.hpLabel = this.add.text(
      this.BAR_X - 50,
      this.HP_BAR_Y - 3,
      'HP',
      {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: this.BODY_FONT,
        fontStyle: 'bold'
      }
    ).setOrigin(0, 0);

    this.xpLabel = this.add.text(
      this.BAR_X - 50,
      this.XP_BAR_Y - 3,
      'XP',
      {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: this.BODY_FONT,
        fontStyle: 'bold'
      }
    ).setOrigin(0, 0);

    this.hpValueText = this.add.text(
      this.BAR_X + this.BAR_W + 12,
      this.HP_BAR_Y - 4,
      '1 / 1',
      {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: this.BODY_FONT,
        fontStyle: 'bold'
      }
    ).setOrigin(0, 0);

    this.levelText = this.add.text(
      this.BAR_X + this.BAR_W + 12,
      this.XP_BAR_Y - 4,
      'LVL 1',
      {
        fontSize: '13px',
        color: '#aac4ff',
        fontFamily: this.BODY_FONT,
        fontStyle: 'bold'
      }
    ).setOrigin(0, 0);

    this.container.add([
      this.panelGraphics,
      this.barGraphics,
      this.scoreLabel,
      this.scoreText,
      this.defeatsText,
      this.timeText,
      this.hpLabel,
      this.xpLabel,
      this.hpValueText,
      this.levelText
    ]);

    this.drawHud();

    this._onHudUpdate = (data) => {
      this.score = data?.score ?? 0;
      this.enemiesDefeated = data?.enemiesDefeated ?? 0;
      this.xp = data?.xp ?? 0;
      this.level = data?.level ?? 1;
      this.xpPerLevel = data?.xpPerLevel ?? 20;
      this.survivalTime = data?.survivalTime ?? this.survivalTime;

      this.hp = data?.hp ?? this.hp;
      this.maxHp = data?.maxHp ?? this.maxHp;

      this.updateText();
      this.drawHud();
    };

    this.events.on('hud:update', this._onHudUpdate);

    this.events.once('shutdown', this.onShutdown, this);
  }

  updateText() {
    this.scoreText.setText(this.formatScore(this.score));
    this.defeatsText.setText(`KOs ${this.enemiesDefeated}`);
    this.timeText.setText(this.formatTime(this.survivalTime));
    this.levelText.setText(`LVL ${this.level}`);

    const safeMaxHp = this.maxHp > 0 ? this.maxHp : 1;
    const safeHp = Phaser.Math.Clamp(this.hp, 0, safeMaxHp);
    this.hpValueText.setText(`${Math.ceil(safeHp)} / ${safeMaxHp}`);
  }

  drawHud() {
    this.drawScorePanel();
    this.drawTopBars();
  }

  drawScorePanel() {
    if (!this.panelGraphics) return;

    this.panelGraphics.clear();

    // Soft shadow.
    this.panelGraphics.fillStyle(0x000000, 0.22);
    this.panelGraphics.fillRoundedRect(
      this.SCORE_PANEL_X + 4,
      this.SCORE_PANEL_Y + 5,
      this.SCORE_PANEL_W,
      this.SCORE_PANEL_H,
      10
    );

    // Main panel. More transparent than before.
    this.panelGraphics.fillStyle(0x111827, 0.48);
    this.panelGraphics.fillRoundedRect(
      this.SCORE_PANEL_X,
      this.SCORE_PANEL_Y,
      this.SCORE_PANEL_W,
      this.SCORE_PANEL_H,
      10
    );

    // Thin gold border.
    this.panelGraphics.lineStyle(1.5, 0xf2c230, 0.65);
    this.panelGraphics.strokeRoundedRect(
      this.SCORE_PANEL_X,
      this.SCORE_PANEL_Y,
      this.SCORE_PANEL_W,
      this.SCORE_PANEL_H,
      10
    );

    // Stat chip backgrounds.
    this.panelGraphics.fillStyle(0x222b3a, 0.42);
    this.panelGraphics.fillRoundedRect(
      this.SCORE_PANEL_X + 12,
      this.SCORE_PANEL_Y + 54,
      68,
      20,
      7
    );

    this.panelGraphics.fillRoundedRect(
      this.SCORE_PANEL_X + 96,
      this.SCORE_PANEL_Y + 54,
      68,
      20,
      7
    );
  }

  drawTopBars() {
    if (!this.barGraphics) return;

    this.barGraphics.clear();

    const hpMax = this.maxHp > 0 ? this.maxHp : 1;
    const hpRatio = Phaser.Math.Clamp(this.hp / hpMax, 0, 1);
    const hpColor = this.getHpColor(hpRatio);

    const xpMax = this.xpPerLevel > 0 ? this.xpPerLevel : 1;
    const xpRatio = Phaser.Math.Clamp(this.xp / xpMax, 0, 1);

    this.drawBar({
      x: this.BAR_X,
      y: this.HP_BAR_Y,
      w: this.BAR_W,
      h: this.BAR_H,
      ratio: hpRatio,
      fillColor: hpColor,
      borderColor: 0xf2c230,
      bgAlpha: 0.52
    });

    this.drawBar({
      x: this.BAR_X,
      y: this.XP_BAR_Y,
      w: this.BAR_W,
      h: this.BAR_H,
      ratio: xpRatio,
      fillColor: 0x33ccff,
      borderColor: 0xf2c230,
      bgAlpha: 0.52
    });
  }

  getHpColor(ratio) {
    if (ratio > 0.5) return 0x00ff00;
    if (ratio > 0.25) return 0xffff00;
    return 0xff0000;
  }

  drawBar({ x, y, w, h, ratio, fillColor, borderColor, bgAlpha }) {
    // Shadow.
    this.barGraphics.fillStyle(0x000000, 0.20);
    this.barGraphics.fillRoundedRect(x + 3, y + 3, w, h, 6);

    // Background.
    this.barGraphics.fillStyle(0x000000, bgAlpha);
    this.barGraphics.fillRoundedRect(x, y, w, h, 6);

    // Border.
    this.barGraphics.lineStyle(1.5, borderColor, 0.78);
    this.barGraphics.strokeRoundedRect(x, y, w, h, 6);

    // Fill.
    const fillW = Math.max(0, (w - 4) * ratio);

    if (fillW > 0) {
      this.barGraphics.fillStyle(fillColor, 1);
      this.barGraphics.fillRoundedRect(x + 2, y + 2, fillW, h - 4, 5);

      // Small shine.
      if (fillW > 8) {
        this.barGraphics.fillStyle(0xffffff, 0.16);
        this.barGraphics.fillRoundedRect(x + 4, y + 4, Math.max(0, fillW - 4), 2, 2);
      }
    }
  }

  formatScore(score) {
    return Number(score || 0).toLocaleString();
  }

  formatTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds || 0)));
    const mins = Math.floor(total / 60);
    const secs = total % 60;

    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  onShutdown() {
    if (this._onHudUpdate) {
      this.events.off('hud:update', this._onHudUpdate);
      this._onHudUpdate = null;
    }

    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }

    this.panelGraphics = null;
    this.barGraphics = null;
  }
}