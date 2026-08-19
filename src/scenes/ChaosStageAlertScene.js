// ============================================================
//  ChaosStageAlertScene.js — Chaos stage warning overlay
//
//  Launched by GameScene when the run crosses into chaos mode.
//  Flashes a dramatic "WARNING — ENTERING CHAOS STAGE" message
//  3 times, then signals the GameScene to proceed.
//
//  Usage from GameScene:
//    this.scene.launch('ChaosStageAlertScene', {
//      onComplete: () => { /* start chaos spawns */ }
//    });
// ============================================================

export class ChaosStageAlertScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ChaosStageAlertScene' });
  }

  init(data) {
    this.onComplete = data?.onComplete ?? null;
  }

  create() {
    const { width, height } = this.scale;

    // --- Full-screen dim overlay ---
    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setDepth(0);

    // --- Red border flash bars (all four sides) ---
    this.barTop = this.add.rectangle(0, 0, width, 6, 0xff2222, 1)
      .setOrigin(0, 0)
      .setDepth(1);
    this.barBottom = this.add.rectangle(0, height - 6, width, 6, 0xff2222, 1)
      .setOrigin(0, 0)
      .setDepth(1);
    this.barLeft = this.add.rectangle(0, 0, 6, height, 0xff2222, 1)
      .setOrigin(0, 0)
      .setDepth(1);
    this.barRight = this.add.rectangle(width - 6, 0, 6, height, 0xff2222, 1)
      .setOrigin(0, 0)
      .setDepth(1);

    // --- WARNING text ---
    this.warningText = this.add.text(width / 2, height * 0.40, '⚠  WARNING  ⚠', {
      fontSize: '56px',
      fontFamily: "Impact, Haettenschweiler, 'Arial Black', Arial, sans-serif",
      color: '#ff3333',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2).setAlpha(0);

    // --- ENTERING CHAOS STAGE text ---
    this.incomingText = this.add.text(width / 2, height * 0.55, 'ENTERING CHAOS STAGE', {
      fontSize: '40px',
      fontFamily: "Arial, sans-serif",
      fontStyle: 'bold',
      color: '#f2c230',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2).setAlpha(0);

    // Start the flash sequence
    this.flashCount = 0;
    this.doFlash();
  }

  doFlash() {
    const flashDuration = 300;
    const holdDuration = 250;
    const gapDuration = 200;

    // Flash in
    this.tweens.add({
      targets: [this.warningText, this.incomingText],
      alpha: 1,
      duration: flashDuration,
      ease: 'Cubic.easeIn',
      onStart: () => {
        // Pulse the red bars (top/bottom grow vertically, left/right grow horizontally)
        this.tweens.add({
          targets: [this.barTop, this.barBottom],
          scaleY: 3,
          alpha: 0.9,
          yoyo: true,
          duration: flashDuration + holdDuration,
          ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: [this.barLeft, this.barRight],
          scaleX: 3,
          alpha: 0.9,
          yoyo: true,
          duration: flashDuration + holdDuration,
          ease: 'Sine.easeInOut',
        });

        // Pulse the overlay red tint
        this.tweens.add({
          targets: this.overlay,
          fillAlpha: 0.35,
          yoyo: true,
          duration: flashDuration + holdDuration,
          ease: 'Sine.easeInOut',
        });
      },
      onComplete: () => {
        // Hold visible, then flash out
        this.time.delayedCall(holdDuration, () => {
          this.tweens.add({
            targets: [this.warningText, this.incomingText],
            alpha: 0,
            duration: flashDuration,
            ease: 'Cubic.easeOut',
            onComplete: () => {
              this.flashCount++;
              if (this.flashCount < 3) {
                // Gap before next flash
                this.time.delayedCall(gapDuration, () => this.doFlash());
              } else {
                // All flashes done — finish up
                this.finishAlert();
              }
            }
          });
        });
      }
    });
  }

  finishAlert() {
    // Brief final flash: everything visible with a quick fade-out
    this.tweens.add({
      targets: [this.overlay, this.barTop, this.barBottom, this.barLeft, this.barRight],
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (this.onComplete) this.onComplete();
        this.scene.stop();
      }
    });
  }
}
