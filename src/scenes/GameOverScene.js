export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.score = data?.score ?? 0;
    this.enemiesDefeated = data?.enemiesDefeated ?? 0;
    this.survivalTime = data?.survivalTime ?? 0;
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#10141c');

    // Fully stop the gameplay scenes so nothing from them can render
    // behind this overlay. GameScene.onShutdown also stops HUDScene.
    this.scene.stop('UpgradeScene');
    this.scene.stop('HUDScene');
    this.scene.stop('GameScene');

    // Solid full-screen backdrop behind everything else.
    this.add.rectangle(0, 0, width, height, 0x10141c, 1)
      .setOrigin(0, 0)
      .setDepth(-1000);

    this.drawRedDeathEdges(width, height);

    // Single HTML panel containing the full game-over UI.
    this.nameInput = this.add.dom(width / 2, height / 2).createFromHTML(`
      <style>
        .go-btn {
          width: 260px;
          height: 54px;
          font-size: 20px;
          font-weight: bold;
          color: #ffffff;
          background: #3a4458;
          border: 2px solid #f2c230;
          font-family: Arial, sans-serif;
          cursor: pointer;
          outline: none;
        }

        .go-btn:hover {
          background: #4a5670;
        }

      </style>

      <div
        style="
          width: 640px;
          background: #10141c;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 28px 0 30px;
          gap: 14px;
          font-family: Arial, sans-serif;
        "
      >
        <div style="
          color: #d40000;
          font-size: 58px;
          font-weight: 900;
          font-family: 'Arial Black', Arial, sans-serif;
          line-height: 1;
        ">GAME OVER</div>

        <div style="
          color: #ffffff;
          font-size: 38px;
          font-weight: bold;
        ">Score: ${this.score}</div>

        <div style="
          color: #aac4ff;
          font-size: 22px;
          font-weight: bold;
        ">Enemies Defeated: ${this.enemiesDefeated} &nbsp;&nbsp;&nbsp; Time: ${this.survivalTime}s</div>

        <button id="play-again-btn" class="go-btn" type="button">PLAY AGAIN</button>
      </div>
    `);

    this.nameInput.setDepth(10);

    this.playAgainBtnElement = this.nameInput.getChildByID('play-again-btn');

    if (this.playAgainBtnElement) {
      this.playAgainBtnElement.addEventListener('click', () => this.playAgain());
    }
  }

  drawRedDeathEdges(width, height) {
    const edgeColor = 0x8b0000;

    this.add.rectangle(0, 0, width, 46, edgeColor, 0.55)
      .setOrigin(0, 0);

    this.add.rectangle(0, height - 46, width, 46, edgeColor, 0.55)
      .setOrigin(0, 0);

    this.add.rectangle(0, 0, 46, height, edgeColor, 0.55)
      .setOrigin(0, 0);

    this.add.rectangle(width - 46, 0, 46, height, edgeColor, 0.55)
      .setOrigin(0, 0);

    this.add.rectangle(0, 46, width, 34, edgeColor, 0.25)
      .setOrigin(0, 0);

    this.add.rectangle(0, height - 80, width, 34, edgeColor, 0.25)
      .setOrigin(0, 0);

    this.add.rectangle(46, 0, 34, height, edgeColor, 0.25)
      .setOrigin(0, 0);

    this.add.rectangle(width - 80, 0, 34, height, edgeColor, 0.25)
      .setOrigin(0, 0);
  }

  playAgain() {
    if (this.nameInput) {
      this.nameInput.destroy();
      this.nameInput = null;
    }

    this.scene.stop('UpgradeScene');
    this.scene.stop('GameScene');

    this.scene.start('MenuScene');
  }
}