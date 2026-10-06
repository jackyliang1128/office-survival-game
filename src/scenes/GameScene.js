// ============================================================
//  GameScene.js  —  MAIN GAME SCENE
//
//  This scene contains the active gameplay loop.
//  Phaser calls:
//    - create() once on scene start
//    - update() every frame (~60fps)
//
//  The setup is intentionally split into small methods so each
//  system is easy to find and edit.
// ============================================================
import { HealthBar } from '../UI/HealthBar.js'
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Firebrand } from '../entities/bosses/Firebrand.js';
import { Striker } from '../entities/bosses/Striker.js';
import { Technomancer } from '../entities/bosses/Technomancer.js';
import { SpreadShot } from '../upgrades/SpreadShot.js';
import { BackShot } from '../upgrades/BackShot.js';
import { MagnetBoost } from '../upgrades/MagnetBoost.js';
import { MoveSpeedUp } from '../upgrades/MoveSpeedUp.js';
import { FireRateUp } from '../upgrades/FireRateUp.js';
import { DamageUp } from '../upgrades/DamageUp.js';
import { KnockBack } from '../upgrades/KnockBack.js';
import { Pierce } from '../upgrades/Pierce.js';
import { MegaAmmo } from '../upgrades/MegaAmmo.js';
import { MaxHpUp } from '../upgrades/MaxHpUp.js';
import { Rarity } from '../upgrades/Upgrade.js';
import { XpOrb } from '../entities/XpOrb.js';
import { GAME_BALANCE, PLAYER_ANIMATIONS } from '../config/gameBalance.js';

// All boss classes the scene knows about. Adding a new boss means
// importing it above and appending it here
const BOSS_CLASSES = [Striker, Technomancer, Firebrand];
import {ShooterEnemy} from "../entities/enemies/ShooterEnemy.js";
import {SplitterEnemy} from "../entities/enemies/SplitterEnemy.js";

export class GameScene extends Phaser.Scene {
  // Scene key used by Phaser scene manager.
  constructor() {
    super({ key: 'GameScene' });
  }

  // ----------------------------------------------------------
  // Scene bootstrap
  // ----------------------------------------------------------
  // Order matters because later systems depend on earlier ones.
  // preload() runs before create() and is where image/sound files
  // are loaded so the rest of the scene can use them by key.
  preload() {
    // The title screen loader has already downloaded and decoded these assets.
    if (this.scene.get('AssetLoadingScene').status === 'ready') return;

    this.load.image('hero_main', 'hero/hero.png');

    // 8-way walking spritesheets. Each lives under
    //   hero/movement/<sheet>_spritesheet.png
    // and is sliced into a uniform 4-column grid. Cell dims come from the
    // PLAYER_ANIMATIONS table so loader, animation, and runtime scaling
    // all agree on the same source of truth.
    for (const [dir, def] of Object.entries(PLAYER_ANIMATIONS.directions)) {
      this.load.spritesheet(
        `hero_walk_${dir}`,
        `hero/movement/${def.sheet}_spritesheet.png`,
        { frameWidth: def.cell.w, frameHeight: def.cell.h }
      );
    }
    this.load.image('ground_grid', 'background/office_floor_grid_64.png');
    this.load.image('bullet_normal', 'icon_for_item_bullet/coffee_bean.png');
    this.load.image('bullet_damage_up', 'icon_for_item_bullet/golden_bean.png');
    this.load.image('bullet_mega', 'icon_for_item_bullet/coffee_cup.png');
    this.load.image('bullet_pierce', 'icon_for_item_bullet/pierce_pen.png');
    this.load.image('bullet_spread', 'icon_for_item_bullet/email.png');
    this.load.image('bullet_back', 'icon_for_item_bullet/boss_email.png');
    this.load.image('enemy_normal', 'enemies/normal_enemy/enemy_evil.png');
    this.load.image('enemy_split', 'enemies/normal_enemy/enemy_deadline_demon.png');
    this.load.image('enemy_shooter', 'enemies//normal_enemy/enemy_meeting_ghost.png');
    for (const BossClass of BOSS_CLASSES) {
      BossClass.preload(this);
    }
    this.load.image('xp_orb', 'xpOrbs/xpOrb.png');
    this.load.atlas(
      'chest_sheet',
      'chest/chest-spritesheet.png',
      'chest/chest-spritesheet.json'
    );
    this.load.audio('mosquito-music', 'audio/mosquito-music.mp3');
    this.load.audio('game-over', 'audio/game-over.mp3');
    this.load.audio('collect-orb', 'audio/collect-orb.mp3');
    this.load.audio('enemy-hit', 'audio/pop.mp3');
    this.load.audio('ui-button', 'audio/ui-button.mp3');
    this.load.audio('hurt', 'audio/hurt.mp3');
    this.load.audio('boss-music', 'audio/boss-music.mp3');
    this.load.audio('big-boom', 'audio/big-boom.mp3');
    this.load.atlas(
      'boss_chest_sheet',
      'chest/bossChest.png',
      'chest/bossChest.json'
    );
  }
  
  create() {
    if (this.input?.keyboard) {
        this.input.keyboard.enabled = true;
      }

    this.makeTextures();
    this.makeBossAnimations();
    this.makeHeroAnimations();
    this.makeChestAnimations();
    this.makeWorld();
    this.makePlayer();
    this.makeEnemy();
    this.makeFootballs();
    this.makeCamera();
    this.makeControls();
    this.makeJoystick();
    this.makePlayerHealthBar();
    this.makeColliders();
    this.makeXpOrbs();
    this.makeChests();
    this.makeBossArrow();
    this.makeScoring();
    this.makeDifficultyScaling();
    this.scene.launch('HUDScene');
    this.scene.bringToTop('HUDScene');
    this.makeDamageBorders();
    this.sounds = {
      gameOver: this.sound.add('game-over', { volume: 0.6 }),
      collectOrb: this.sound.add('collect-orb', { volume: 0.6}),
      hurt: this.sound.add('hurt', { volume: 0.6}),
      bigBoom: this.sound.add('big-boom', { volume: 0.3})
    };
    this.bgm = this.sound.add('mosquito-music', { volume: 0.2, loop: true });
    this.bgm.play();

    this.events.once('shutdown', this.onShutdown, this);
  }

  makeChestAnimations() {
    if (!this.anims.exists('chest-spin')) {
      this.anims.create({
        key: 'chest-spin',
        frames: this.anims.generateFrameNames('chest_sheet', {
          prefix: 'frame_',
          start: 0,
          end: 7,
          zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
      });
    }

    if (!this.anims.exists('boss-chest-spin')) {
      this.anims.create({
        key: 'boss-chest-spin',
        frames: this.anims.generateFrameNames('boss_chest_sheet', {
          prefix: 'frame_',
          start: 0,
          end: 7,
          zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
      });
    }
  }

  makeBossAnimations() {
    for (const BossClass of BOSS_CLASSES) {
      BossClass.registerAnimations(this);
    }
  }

  // One walk animation per direction, all built from PLAYER_ANIMATIONS.
  // Keys: hero-walk-<direction> (e.g. hero-walk-down, hero-walk-up_left).
  makeHeroAnimations() {
    for (const [dir, def] of Object.entries(PLAYER_ANIMATIONS.directions)) {
      const key = `hero-walk-${dir}`;
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(`hero_walk_${dir}`, {
          start: 0,
          end: def.frames - 1,
        }),
        frameRate: def.frameRate,
        repeat: -1,
      });
    }
  }


  // Frame loop.
  update(time, delta) {
    if (this.runEnded) return;

    this.movePlayer();
    this.moveEnemy();

    if (this.player && this.xpOrbs) {
      this.player.updateXpMagnet(this.xpOrbs);
    }
    this.updateChestProximityArrow();
    this.updateBossProximityArrow();
    this.updateScoring(delta);
  }

  // ----------------------------------------------------------
  // Step 1: World textures
  // ----------------------------------------------------------
  // We keep a generated ground tile for now so the world can
  // repeat cleanly without needing a full background image.
  makeTextures() {
    if (!this.textures.exists('football')) {
      const fg = this.make.graphics({ x: 0, y: 0, add: false });
      // White ball body.
      fg.fillStyle(0xffffff, 1);
      fg.fillCircle(12, 12, 11);
      // Dark outline.
      fg.lineStyle(2, 0x111111, 1);
      fg.strokeCircle(12, 12, 11);
      // Pentagon-like dark spots so it reads as a soccer ball when spinning.
      fg.fillStyle(0x111111, 1);
      fg.fillCircle(12, 12, 3);
      fg.fillCircle(6, 8, 2);
      fg.fillCircle(18, 8, 2);
      fg.fillCircle(7, 17, 2);
      fg.fillCircle(17, 17, 2);
      fg.generateTexture('football', 24, 24);
      fg.destroy();
    }

    if (this.textures.exists('ground')) {
      return;
    }

    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Ground tile.
    g.clear();
    g.fillStyle(0x1a3320, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(1, 0x22442c, 1);
    g.strokeRect(0, 0, 64, 64);
    g.generateTexture('ground', 64, 64);

    g.destroy();
  }

  // ----------------------------------------------------------
  // Step 2: World
  // ----------------------------------------------------------
  // Defines world size, physics bounds, and tiled background.
  makeWorld() {
    this.WORLD_W = GAME_BALANCE.world.width;
    this.WORLD_H = GAME_BALANCE.world.height;

    // Keep physics objects inside world bounds.
    this.physics.world.setBounds(0, 0, this.WORLD_W, this.WORLD_H);

    // TileSprite repeats the ground texture across the world.
    // Pin the ground to a low depth so wine spills/flames can sit
    // above it but still render beneath entities (which default to 0).
    const groundKey = this.textures.exists('ground_grid') ? 'ground_grid' : 'ground';
    this.add.tileSprite(0, 0, this.WORLD_W, this.WORLD_H, groundKey)
      .setOrigin(0, 0)
      .setDepth(-100);
  }

  // ----------------------------------------------------------
  // Step 3: Player
  // ----------------------------------------------------------
  makePlayer() {
    const cx = this.WORLD_W / 2;
    const cy = this.WORLD_H / 2;

    this.player = new Player(this, cx, cy);
  }

  // ----------------------------------------------------------
  // Step 4: Enemy (placeholder)
  // ----------------------------------------------------------
  // Current enemy is static and visual-only.
  makeEnemy() {
    this.enemies = this.physics.add.group();

    this.baseEnemyHp = GAME_BALANCE.enemies.baseHp;
    this.normalEnemyScale = GAME_BALANCE.enemies.normalScale;
    this.spawnIntervalMs = GAME_BALANCE.enemies.spawnIntervalMs;
    this.spawnIntervalFloorMs = GAME_BALANCE.enemies.spawnIntervalFloorMs;
    this.baseEnemySpeed = GAME_BALANCE.enemies.baseSpeed;
    this.bossSpawnDelayMs = GAME_BALANCE.boss.spawnDelayMs;
    this.isBossPhase = false;
    this.nextBossIndex = 0;
    this.chaosMode = false;

    this.physics.add.collider(this.enemies, this.enemies);

    // Projectiles fired BY enemies/bosses. Damage the player on overlap.
    // Created here so boss skills can do `scene.enemyProjectiles.add(p)`.
    this.enemyProjectiles = this.physics.add.group();

    // Player auto-fires at this group.
    this.player.setTargetGroup(this.enemies);

    this.startEnemySpawnTimer();
    this.scheduleBossSpawn();
  }

  spawnEnemy() {
    if (!this.player || !this.enemies) return;

    const minRadius = GAME_BALANCE.enemies.spawnMinRadius;
    const maxRadius = GAME_BALANCE.enemies.spawnMaxRadius;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(minRadius, maxRadius);

    let ex = this.player.x + Math.cos(angle) * radius;
    let ey = this.player.y + Math.sin(angle) * radius;

    ex = Phaser.Math.Clamp(ex, 0, this.WORLD_W);
    ey = Phaser.Math.Clamp(ey, 0, this.WORLD_H);

    const tooClose = this.enemies.getChildren().some(enemy => {
      const dist = Phaser.Math.Distance.Between(ex, ey, enemy.x, enemy.y);
      return dist < GAME_BALANCE.enemies.spawnTooCloseDistance;
    });

    if (tooClose) return;

    const enemyHp = Math.max(1, Math.round(this.baseEnemyHp * this.enemyHpMultiplier));

    // Time-gated unlock + frequency boost. Survival time grows continuously
    // across boss fights, so unlocks naturally persist.
    const t = this.survivalTime;
    const eb = GAME_BALANCE.enemies;
    const shooterUnlocked = t >= eb.unlockShooterAtSec;
    const splitterUnlocked = t >= eb.unlockSplitterAtSec;
    const boosted = t >= eb.frequencyBoostAtSec;
    const shooterMin = boosted ? eb.boostedShooterRollMin : eb.shooterRollMin;
    const splitterMin = boosted ? eb.boostedSplitterRollMin : eb.splitterRollMin;

    const rand = Math.random() * eb.spawnRollMax;
    let enemy;
    if (splitterUnlocked && rand >= splitterMin) {
      enemy = new SplitterEnemy(this, ex, ey, { hp: enemyHp, scale: this.normalEnemyScale });
    } else if (shooterUnlocked && rand >= shooterMin) {
      enemy = new ShooterEnemy(this, ex, ey, { hp: enemyHp, scale: this.normalEnemyScale });
    } else {
      enemy = new Enemy(this, ex, ey, enemyHp, { scale: this.normalEnemyScale });
    }

    enemy.setTarget(this.player)
    this.enemies.add(enemy);
  }

  spawnBoss() {
    if (!this.player || !this.enemies) return;

    // Do not spawn a new boss while a boss phase is still active.
    // Chaos mode lifts this gate so bosses can stack.
    if (this.isBossPhase && !this.chaosMode) return;
    this.startBossMusic();

    const minRadius = GAME_BALANCE.boss.spawnMinRadius;
    const maxRadius = GAME_BALANCE.boss.spawnMaxRadius;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(minRadius, maxRadius);

    let ex = this.player.x + Math.cos(angle) * radius;
    let ey = this.player.y + Math.sin(angle) * radius;

    ex = Phaser.Math.Clamp(ex, 0, this.WORLD_W);
    ey = Phaser.Math.Clamp(ey, 0, this.WORLD_H);

    const tooClose = this.enemies.getChildren().some(enemy => {
      const dist = Phaser.Math.Distance.Between(ex, ey, enemy.x, enemy.y);
      return dist < GAME_BALANCE.boss.spawnTooCloseDistance;
    });

    if (tooClose) {
      this.scheduleBossSpawn(GAME_BALANCE.boss.spawnRetryDelayMs);
      return;
    }

    const BossClass = BOSS_CLASSES[this.nextBossIndex % BOSS_CLASSES.length];

    // In chaos mode bosses spawn on a tight loop, so skip the warning
    // overlay and instantiate directly.
    if (this.chaosMode) {
      this._doSpawnBoss(BossClass, ex, ey);
      return;
    }

    // Show the boss alert overlay, then spawn once it finishes.
    this.scene.launch('BossAlertScene', {
      bossName: BossClass.BOSS_NAME,
      onComplete: () => {
        this._doSpawnBoss(BossClass, ex, ey);
      }
    });
  }

  // Actually instantiates the boss after the alert overlay finishes.
  _doSpawnBoss(BossClass, ex, ey) {
    if (!this.player || !this.enemies) return;

    const boss = new BossClass(this, ex, ey);
    this.enemies.add(boss);
    console.log(`[boss] spawned ${BossClass.BOSS_NAME} at (${Math.round(ex)}, ${Math.round(ey)}) hp=${boss.hp}`);
    this.nextBossIndex += 1;

    // In chaos mode regular enemies keep spawning at full rate, so leave
    // isBossPhase false and don't restart the spawn timer.
    if (!this.chaosMode) {
      this.isBossPhase = true;
      this.currentBossPhaseSpawnRateDamp =
        BossClass.BOSS_PHASE_SPAWN_RATE_DAMP ?? 1;
      this.startEnemySpawnTimer();
    }
  }

  scheduleBossSpawn(delayMs = this.bossSpawnDelayMs) {
    if (this.bossSpawnTimer) {
      this.bossSpawnTimer.remove(false);
    }

    this.bossSpawnTimer = this.time.delayedCall(delayMs, () => {
      this.spawnBoss();
    });
  }

  startEnemySpawnTimer() {
    if (this.enemySpawnTimer) {
      this.enemySpawnTimer.remove(false);
    }

    let delay = this.spawnIntervalMs;
    if (this.isBossPhase && !this.chaosMode) {
      const damp = this.currentBossPhaseSpawnRateDamp ?? 1;
      // Spawn rate scales by `damp`; interval is the inverse. Clamped to
      // the floor so very high damp values can't drop below it.
      delay = Math.max(
        this.spawnIntervalFloorMs,
        Math.floor(this.spawnIntervalMs / damp)
      );
    }

    this.enemySpawnTimer = this.time.addEvent({
      delay,
      loop: true,
      callback: () => {
        this.spawnEnemy();
      }
    });
  }

  // ----------------------------------------------------------
  // Boss 2 football attack (projectile pool + damage rules)
  // ----------------------------------------------------------
  // The attack itself lives on Striker (entities/bosses/Striker.js). This
  // scene just owns the shared projectile group and the
  // player-vs-football overlap, since damage to the player is a
  // scene-level rule.
  makeFootballs() {
    this.footballs = this.physics.add.group();
    // Football hits deal this many times the normal enemy contact damage,
    // so a single kick stings more than a regular enemy bump.
    this.footballDamageMultiplier = GAME_BALANCE.combat.footballDamageMultiplier;

    // NOTE: keep `this.player` first to match the other overlaps in this
    // file. Reversing it causes Phaser to swap callback args on some
    // versions, which had us mistakenly destroying the player.
    this.physics.add.overlap(this.player, this.footballs, (_player, football) => {
      if (this.runEnded || !this.player || !football.active) return;

      // Disable the body immediately so this overlap can't re-fire in the
      // same step, and defer destroy to next tick to stay clear of the
      // physics iteration that's currently running.
      if (football.body) football.body.enable = false;
      football.setActive(false).setVisible(false);
      this.time.delayedCall(0, () => {
        if (football && football.scene) football.destroy();
      });

      const now = Date.now();
      if (now - this.lastHurt > GAME_BALANCE.combat.playerInvulnMs) {
        const dmg = this.footballDamageMultiplier;
        const dead = this.player.takeDamage(dmg);
        this.lastHurt = now;
        if (dead) {
          this.onPlayerDeath();
        }
      }
    });
  }


  // ----------------------------------------------------------
  // Step 5: Camera
  // ----------------------------------------------------------
  makeCamera() {
    this.cameras.main.setBounds(0, 0, this.WORLD_W, this.WORLD_H);

    // Smooth follow keeps motion readable.
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  // ----------------------------------------------------------
  // Step 6: Keyboard controls
  // ----------------------------------------------------------
  makeControls() {
    this.cursors = this.input.keyboard.createCursorKeys();

    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  // ----------------------------------------------------------
  // Step 7: Virtual joystick (touch)
  // ----------------------------------------------------------
  // DO NOT EDIT THIS unless control behavior is intentionally changing (which it shouldn't).
  makeJoystick() {
    // Floating joystick state read by movePlayer().
    this.joystick = {
      active: false,
      pointer: null,
      baseX: 0,
      baseY: 0,
      knobX: 0,
      knobY: 0,
      direction: { x: 0, y: 0 },
    };

    const BASE_RADIUS = GAME_BALANCE.controls.joystickBaseRadius;
    const KNOB_RADIUS = GAME_BALANCE.controls.joystickKnobRadius;

    this.BASE_RADIUS = BASE_RADIUS;
    this.KNOB_RADIUS = KNOB_RADIUS;

    // HUD graphics layer for joystick rings.
    this.joyGraphics = this.add.graphics();
    this.joyGraphics.setScrollFactor(0);
    this.joyGraphics.setDepth(100);

    // Start joystick anywhere the player touches.
    this.input.on('pointerdown', (pointer) => {
      if (this.runEnded) return;
      if (this.joystick.active) return;

      this.joystick.active = true;
      this.joystick.pointer = pointer;

      this.joystick.baseX = pointer.x;
      this.joystick.baseY = pointer.y;
      this.joystick.knobX = pointer.x;
      this.joystick.knobY = pointer.y;

      this.joystick.direction.x = 0;
      this.joystick.direction.y = 0;

      this._drawJoystick();
    });

    // Drag updates knob position and normalized movement direction.
    this.input.on('pointermove', (pointer) => {
      if (!this.joystick.active) return;
      if (!this.joystick.pointer) return;
      if (pointer.id !== this.joystick.pointer.id) return;

      const dx = pointer.x - this.joystick.baseX;
      const dy = pointer.y - this.joystick.baseY;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, BASE_RADIUS);
      const angle = Math.atan2(dy, dx);

      this.joystick.knobX = this.joystick.baseX + Math.cos(angle) * clamped;
      this.joystick.knobY = this.joystick.baseY + Math.sin(angle) * clamped;

      if (dist === 0) {
        this.joystick.direction.x = 0;
        this.joystick.direction.y = 0;
        return;
      }

      this.joystick.direction.x = dx / BASE_RADIUS;
      this.joystick.direction.y = dy / BASE_RADIUS;

      // Normalize to avoid movement speed above 1.
      const len = Math.sqrt(
        this.joystick.direction.x ** 2 + this.joystick.direction.y ** 2
      );

      if (len > 1) {
        this.joystick.direction.x /= len;
        this.joystick.direction.y /= len;
      }

      this._drawJoystick();
    });

    // Release resets joystick and hides it.
    this.input.on('pointerup', (pointer) => {
      if (!this.joystick.active) return;
      if (!this.joystick.pointer) return;
      if (pointer.id !== this.joystick.pointer.id) return;

      this.joystick.active = false;
      this.joystick.pointer = null;

      this.joystick.direction.x = 0;
      this.joystick.direction.y = 0;

      this.joystick.knobX = this.joystick.baseX;
      this.joystick.knobY = this.joystick.baseY;

      this._drawJoystick();
    });

    // Also reset if touch is cancelled.
    this.input.on('pointerupoutside', (pointer) => {
      if (!this.joystick.active) return;
      if (!this.joystick.pointer) return;
      if (pointer.id !== this.joystick.pointer.id) return;

      this.joystick.active = false;
      this.joystick.pointer = null;

      this.joystick.direction.x = 0;
      this.joystick.direction.y = 0;

      this._drawJoystick();
    });

    this._drawJoystick();
  }

  // ----------------------------------------------------------
  // Movement
  // ----------------------------------------------------------
  // Priority: active joystick input, otherwise keyboard.

  movePlayer() {
    if (!this.player || !this.joystick || !this.cursors || !this.wasd) return;

    // Always redraw so idle joystick ring remains visible.
    this._drawJoystick();

    this.player.move({
      joystick: this.joystick,
      left: this.cursors.left.isDown || this.wasd.left.isDown,
      right: this.cursors.right.isDown || this.wasd.right.isDown,
      up: this.cursors.up.isDown || this.wasd.up.isDown,
      down: this.cursors.down.isDown || this.wasd.down.isDown
    });
  }


  makeColliders() {
    if (!this.player || !this.enemies) return;

    
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      if (this.runEnded) return;
      if (!this.player) return;
      if (enemy?.contactDamageAfter && this.time.now < enemy.contactDamageAfter) return;

      const curtime = Date.now();

      if (curtime - this.lastHurt > GAME_BALANCE.combat.playerInvulnMs) {
        // Enemies (currently Firebrand's dash) can pin their own contact damage
        // via `contactDamageOverride`; otherwise scale with global difficulty.
        const dmg = enemy?.contactDamageOverride ?? this.enemyDamageMultiplier;
        const dead = this.player.takeDamage(dmg);
        this.lastHurt = curtime;

        if (dead) {
          this.onPlayerDeath();
        }
      }
    });

    // Enemy projectiles damage the player. Same 1s invuln gate as melee.
    // Projectile is consumed on hit.
    this.physics.add.overlap(this.player, this.enemyProjectiles, (player, projectile) => {
      if (!projectile.active) return;
      const curtime = Date.now();
      if (curtime - this.lastHurt > GAME_BALANCE.combat.playerInvulnMs) {
        const dmg = projectile.damage ?? this.enemyDamageMultiplier;
        const dead = this.player.takeDamage(dmg);
        this.lastHurt = curtime;
        if (dead) this.onPlayerDeath();
      }
      projectile.destroy();
    });

    // Bullets damage enemies. Enemy destroyed only when hp hits 0.
    this.physics.add.overlap(this.player.bullets, this.enemies, (bullet, enemy) => {
      if (!bullet.active || !enemy.active) return;

      // Don't damage the same enemy twice with the same bullet (would
      // happen on a piercing bullet whose body overlaps the enemy
      // across multiple frames).
      if (bullet.hitEnemies && bullet.hitEnemies.has(enemy)) return;
      if (bullet.hitEnemies) bullet.hitEnemies.add(enemy);

      // Slight shove along the bullet's travel direction. Reads
      // player.knockbackForce (0 when KnockBack upgrade not owned).
      const force = this.player.knockbackForce;
      if (force > 0 && bullet.body && typeof enemy.applyKnockback === 'function') {
        const bvx = bullet.body.velocity.x;
        const bvy = bullet.body.velocity.y;
        const mag = Math.sqrt(bvx * bvx + bvy * bvy) || 1;
        enemy.applyKnockback(bvx / mag, bvy / mag, force);
      }

      // Effective damage = base * per-bullet scale
      // (Spread penalty and MegaAmmo bonus are composed at fire time).
      // Pierce penalty is applied here only on penetration hits — the
      // FIRST enemy a bullet hits takes full damage; every enemy after
      // that takes pierceDamageMult (e.g. 0.5) of it. hitEnemies.size
      // was just incremented above, so size > 1 = penetration hit.
      const piercePenalty = bullet.hitEnemies && bullet.hitEnemies.size > 1
        ? (this.player.pierceDamageMult ?? 1)
        : 1;
      const dmg =
        this.player.bulletDamage *
        piercePenalty *
        (bullet.damageScale ?? 1);
      const killed = enemy.takeDamage(dmg);
      if (killed) {
        if (enemy.isBoss) {
          this.onBossDefeated(enemy.x, enemy.y, enemy);
        } else {
          this.dropXP(enemy.x, enemy.y, enemy);
        }
        this.updateEnemyDefeated();
      }

      // Bullet is consumed unless it has pierces remaining.
      if (bullet.piercesLeft && bullet.piercesLeft > 0) {
        bullet.piercesLeft -= 1;
      } else {
        this.player.killBullet(bullet);
      }
    });
  }


  makePlayerHealthBar(){
    // The bar is now a pure VIEW. The Player owns hp/maxHp and emits
    // 'player:hp' whenever it changes; we just reflect that here.
    this.playerHealthBar = new HealthBar(this, this.player.x, this.player.y, this.player.maxHp);
    this.playerHealthBar.setHealth(this.player.hp);

    this._onPlayerHp = ({ hp, maxHp }) => {
      if (!this.playerHealthBar) return;
      this.playerHealthBar.maxHealth = maxHp;
      this.playerHealthBar.setHealth(hp);
    };
    this.events.on('player:hp', this._onPlayerHp, this);

    // Need to update healthbar after player moves, register to do it after update
    this.events.on('postupdate', this.postUpdate, this);
    this.lastHurt = 0;
  }

  // Hook for game-over handling. Kept minimal for Phase 1.
  onPlayerDeath() {
    if (this.bgm?.isPlaying) this.bgm.stop();
    if (this.bossMusic?.isPlaying) this.bossMusic.stop();
    this.sounds.gameOver.play();
    this.endRun();
  }

  endRun() {
    if (this.runEnded) return;

    this.runEnded = true;

    if (this.enemySpawnTimer) {
      this.enemySpawnTimer.paused = true;
    }

    if (this.player?.shootTimer) {
      this.player.shootTimer.paused = true;
    }

    if (this.input?.keyboard) {
      this.input.keyboard.enabled = false;
    }

    this.physics.pause();

    this.scene.launch('GameOverScene', {
      score: this.score,
      enemiesDefeated: this.enemiesDefeated,
      survivalTime: Math.floor(this.survivalTime)
    });

    this.scene.bringToTop('GameOverScene');
  }

  postUpdate() {
    if (!this.player || !this.playerHealthBar) return;

    this.playerHealthBar.setPosition(this.player.x, this.player.y - 15);
    this.playerHealthBar.setDepth(this.player.depth + 0.01);
  }



  moveEnemy() {
    if (!this.player || !this.enemies) return;

    this.enemies.getChildren().forEach(
        /** @param {import('../entities/Enemy.js').Enemy} enemy */
        enemy => {
      enemy.updateMovement(this.player, this.enemies);
      enemy.updateHealthBar();
    });
  }


  
  // ----------------------------------------------------------
  // Joystick drawing
  // ----------------------------------------------------------
_drawJoystick() {
  if (!this.joyGraphics || !this.joystick) return;

  this.joyGraphics.clear();

  // Hide joystick when not touching.
  if (!this.joystick.active) return;

  const ringAlpha = 0.45;
  const knobAlpha = 0.75;

  this.joyGraphics.lineStyle(3, 0xffffff, ringAlpha);
  this.joyGraphics.strokeCircle(
    this.joystick.baseX,
    this.joystick.baseY,
    this.BASE_RADIUS
  );

  this.joyGraphics.fillStyle(0xffffff, knobAlpha);
  this.joyGraphics.fillCircle(
    this.joystick.knobX,
    this.joystick.knobY,
    this.KNOB_RADIUS
  );
}

    //HUD AND SCORING METHODS

  
  makeScoring() {
    this.survivalTime = 0;
    this.enemiesDefeated = 0;
    this.score = 0;
    this.level = 1;
    this.xp = 0;
    this.XP_PER_LEVEL_BASE = GAME_BALANCE.scoring.xpPerLevelBase;
    this.XP_PER_LEVEL_GROWTH = GAME_BALANCE.scoring.xpPerLevelGrowth;
    this.runEnded = false;
    this.TIME_SCORE_PER_SECOND = GAME_BALANCE.scoring.timeScorePerSecond;
    this.ENEMY_DEFEATED_SCORE = GAME_BALANCE.scoring.enemyDefeatedScore;
  }

  // XP required to advance FROM `level` to `level + 1`.
  xpRequiredFor(level) {
    return this.XP_PER_LEVEL_BASE + level * this.XP_PER_LEVEL_GROWTH;
  }

  // ----------------------------------------------------------
  // Difficulty scaling
  // ----------------------------------------------------------
  // Every 30 seconds (time-based, independent of boss kills):
  // - spawnIntervalMs *= 0.92 (floor 220ms)
  // - enemyHpMultiplier *= 1.05
  // - enemyDamageMultiplier *= 1.06
  makeDifficultyScaling() {
    this.enemyHpMultiplier = GAME_BALANCE.difficulty.enemyHpMultiplierStart;
    this.enemyDamageMultiplier = GAME_BALANCE.difficulty.enemyDamageMultiplierStart;

    if (this.difficultyTimer) {
      this.difficultyTimer.remove(false);
    }
    this.difficultyTimer = this.time.addEvent({
      delay: GAME_BALANCE.difficulty.stepIntervalMs,
      loop: true,
      callback: () => this.applyDifficultyStep(),
    });
  }

  applyDifficultyStep() {
    const decay = this.chaosMode
      ? GAME_BALANCE.chaos.spawnIntervalDecay
      : GAME_BALANCE.difficulty.spawnIntervalDecay;
    const hpGrowth = this.chaosMode
      ? GAME_BALANCE.chaos.enemyHpGrowth
      : GAME_BALANCE.difficulty.enemyHpGrowth;
    const dmgGrowth = this.chaosMode
      ? GAME_BALANCE.chaos.enemyDamageGrowth
      : GAME_BALANCE.difficulty.enemyDamageGrowth;

    this.spawnIntervalMs = Math.max(
      this.spawnIntervalFloorMs,
      Math.floor(this.spawnIntervalMs * decay)
    );
    this.enemyHpMultiplier *= hpGrowth;
    this.enemyDamageMultiplier *= dmgGrowth;

    // Reschedule the non-boss spawn timer so the new interval takes effect
    // immediately rather than after the current tick. In chaos mode the
    // spawn timer always runs at the normal rate, so always reschedule.
    if (this.chaosMode || !this.isBossPhase) {
      this.startEnemySpawnTimer();
    }
  }

  onBossDefeated(x, y, boss) {
    if (typeof x === 'number' && typeof y === 'number') {
      this.spawnBossChest(x, y);
    }

    // Firebrand defeat schedules chaos mode after a fixed delay.
    if (!this.chaosMode && !this.chaosScheduled && boss instanceof Firebrand) {
      this.chaosScheduled = true;
      this.time.delayedCall(GAME_BALANCE.chaos.startDelayAfterFirebrandMs, () => {
        if (!this.runEnded) this.enterChaosMode();
      });
    }

    // One-time spawn-rate spike on top of the recurring per-step decay.
    // Shrinks the current spawn interval by `spawnStepUpAfterBoss` percent,
    // clamped to the floor. Reschedule below so it takes effect immediately.
    const stepUpPct = GAME_BALANCE.difficulty.spawnStepUpAfterBoss ?? 0;
    if (stepUpPct > 0) {
      this.spawnIntervalMs = Math.max(
        this.spawnIntervalFloorMs,
        Math.floor(this.spawnIntervalMs * (1 - stepUpPct / 100))
      );
    }

    // In chaos mode bosses are stackable and a recurring timer drives
    // future spawns, so don't touch the boss-phase state or rescheduler.
    if (this.chaosMode) {
      if (stepUpPct > 0) this.startEnemySpawnTimer();
      return;
    }
    this.isBossPhase = false;
    this.startEnemySpawnTimer();
    this.scheduleBossSpawn();
  }

  // Triggered GAME_BALANCE.chaos.startDelayAfterFirebrandMs after Firebrand is
  // defeated: switch to a recurring boss spawn loop and let regular
  // enemies keep their full spawn rate during boss fights. Difficulty
  // growth values flip via applyDifficultyStep.
  enterChaosMode() {
    if (this.chaosMode) return;
    this.chaosMode = true;
    console.log('[chaos] entering chaos mode at t=', Math.floor(this.survivalTime), 's');

    // Cancel the pending one-shot boss spawn (if any) and replace with a
    // recurring loop. Show the chaos-stage alert first, then spawn the
    // first chaos boss so the player feels the shift right away.
    if (this.bossSpawnTimer) {
      this.bossSpawnTimer.remove(false);
      this.bossSpawnTimer = null;
    }

    this.scene.launch('ChaosStageAlertScene', {
      onComplete: () => {
        if (this.runEnded) return;
        this.spawnBoss();
      }
    });

    this.chaosBossTimer = this.time.addEvent({
      delay: GAME_BALANCE.chaos.bossSpawnIntervalMs,
      loop: true,
      callback: () => this.spawnBoss(),
    });

    // If a boss fight was in progress, the enemy spawn timer is throttled.
    // Restore it to the normal rate now that chaos rules are in effect.
    if (this.isBossPhase) {
      this.isBossPhase = false;
      this.startEnemySpawnTimer();
    }
  }

  updateScoring(delta) {
    if (!Number.isFinite(delta)) {
      return;
    }

    this.survivalTime += delta / 1000;

    this.score =
      Math.floor(this.survivalTime * this.TIME_SCORE_PER_SECOND) +
      this.enemiesDefeated * this.ENEMY_DEFEATED_SCORE;

    this.updateHUD();
  }

  updateHUD() {
    const hud = this.scene.get('HUDScene');

    if (hud) {
      hud.events.emit('hud:update', {  
        score: this.score,
        enemiesDefeated: this.enemiesDefeated,
        xp: this.xp,
        level: this.level,
        xpPerLevel: this.xpRequiredFor(this.level),
        survivalTime: this.survivalTime,
        hp: this.player?.hp ?? 0,
        maxHp: this.player?.maxHp ?? 1
      });
    }
  }

  // ----------------------------------------------------------
  // Chests
  // ----------------------------------------------------------
  // Spawns a treasure chest at a random world position every 20 seconds.
  // Walking over it awards XP to the player.
  makeChests() {
    this.chests = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    this.CHEST_XP_REWARD = GAME_BALANCE.chests.xpReward;

    // Arrow appears when chest is within this distance, pointing toward it. 
    this.CHEST_PROXIMITY_RADIUS = GAME_BALANCE.chests.proximityRadius;

    this.chestSpawnTimer = this.time.addEvent({
      delay: GAME_BALANCE.chests.spawnDelayMs,
      loop: true,
      callback: () => this.spawnChest()
    });

    // Spawn one immediately so there is always something to go for.
    this.spawnChest();

    this.physics.add.overlap(this.player, this.chests, (player, chest) => {
      const wasBossChest = chest.isBossChest === true;
      chest.destroy();
      if (wasBossChest) {
        this.openUpgradeScreen(4);
      } else {
        this.openUpgradeScreen(3);
      }
    });

    // Small directional indicator that points toward the nearest nearby chest.
    this.chestArrow = this.add.triangle(0, 0, 0, -12, 10, 10, -10, 10, 0xffd966, 0.95);
    this.chestArrow.setDepth(1000);
    this.chestArrow.setVisible(false);
  }

  makeBossArrow(){
    // Small directional indicator that points toward the nearest boss.
    this.BossArrow = this.add.triangle(0, 0, 0, -12, 10, 10, -10, 10, 0xff0000, 0.95);
    this.BossArrow.setDepth(1100);
    this.BossArrow.setVisible(false);
  }

  spawnChest() {
    if (!this.chests) return;
    // No regular chests during boss fights.
    if (this.isBossPhase) return;

    const margin = GAME_BALANCE.chests.margin;
    const x = Phaser.Math.Between(margin, this.WORLD_W - margin);
    const y = Phaser.Math.Between(margin, this.WORLD_H - margin);

    const chest = this.chests.create(x, y, 'chest_sheet', 'frame_000');
    if (!chest) return;

    console.log(`[Chest] spawned regular chest at (${Math.round(x)}, ${Math.round(y)})`);

    chest.setScale(GAME_BALANCE.chests.scale);
    chest.setDepth(1);
    chest.body.setAllowGravity(false);
    chest.body.setImmovable(true);
    chest.play('chest-spin');

    const baseY = y;
    const hoverAmplitude = Phaser.Math.Between(4, 12);
    const hoverDuration = Phaser.Math.Between(1200, 1800);
    chest.hoverTween = this.tweens.add({
      targets: chest,
      y: baseY - hoverAmplitude,
      duration: hoverDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (chest.body) {
          chest.body.updateFromGameObject();
        }
      }
    });

    chest.once('destroy', () => {
      if (chest.hoverTween) {
        chest.hoverTween.stop();
        chest.hoverTween = null;
      }
    });
  }

  // Spawns a special boss chest at the given world position. On pickup
  // it opens the upgrade screen with 4 choices instead of giving XP.
  spawnBossChest(x, y) {
    if (!this.chests) return;

    const chest = this.chests.create(x, y, 'boss_chest_sheet', 'frame_000');
    if (!chest) return;

    console.log(`[Chest] spawned BOSS chest at (${Math.round(x)}, ${Math.round(y)})`);

    chest.isBossChest = true;
    chest.setScale(0.4);
    chest.setDepth(1);
    chest.body.setAllowGravity(false);
    chest.body.setImmovable(true);
    chest.play('boss-chest-spin');

    const baseY = y;
    const hoverAmplitude = Phaser.Math.Between(4, 12);
    const hoverDuration = Phaser.Math.Between(1200, 1800);
    chest.hoverTween = this.tweens.add({
      targets: chest,
      y: baseY - hoverAmplitude,
      duration: hoverDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (chest.body) {
          chest.body.updateFromGameObject();
        }
      }
    });

    chest.once('destroy', () => {
      if (chest.hoverTween) {
        chest.hoverTween.stop();
        chest.hoverTween = null;
      }
    });
  }

  updateChestProximityArrow() {
    if (!this.player || !this.chests || !this.chestArrow) return;

    let closestChest = null;
    let closestDist = Infinity;

    this.chests.getChildren().forEach(chest => {
      if (!chest.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
      if (d < closestDist) {
        closestDist = d;
        closestChest = chest;
      }
    });

    if (!closestChest || closestDist > this.CHEST_PROXIMITY_RADIUS) {
      this.chestArrow.setVisible(false);
      return;
    }

    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      closestChest.x,
      closestChest.y
    );

    const offset = GAME_BALANCE.chests.arrowOffset;
    this.chestArrow.setPosition(
      this.player.x + Math.cos(angle) * offset,
      this.player.y + Math.sin(angle) * offset
    );
    this.chestArrow.setRotation(angle + Math.PI / 2);
    this.chestArrow.setVisible(true);
  }

  updateBossProximityArrow() {
    if (!this.player || !this.BossArrow) return;

    let closestBoss = null;
    let closestDist = Infinity;

    this.enemies.getChildren().forEach(enemy => {
      if (!enemy.active || !enemy.isBoss) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d < closestDist) {
        closestDist = d;
        closestBoss = enemy;
      }
    });

    if (!closestBoss) {
      this.BossArrow.setVisible(false);
      return;
    }

    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      closestBoss.x,
      closestBoss.y
    );

    const offset = GAME_BALANCE.chests.arrowOffset;
    this.BossArrow.setPosition(
      this.player.x + Math.cos(angle) * offset,
      this.player.y + Math.sin(angle) * offset
    );
    this.BossArrow.setRotation(angle + Math.PI / 2);
    this.BossArrow.setVisible(true);
  }


  makeXpOrbs() {
    this.xpOrbs = this.physics.add.group();

    this.physics.add.overlap(this.player, this.xpOrbs, (player, orb) => {
      orb.destroy();
      this.gainXP(orb.xpValue ?? 1);
    });
  }

  dropXP(x, y, source = null) {
    if (!this.xpOrbs) return;
    const variant = source && source.isSplitChild === true ? 'small' : 'normal';
    const orb = new XpOrb(this, x, y, variant);
    this.xpOrbs.add(orb);
  }

  gainXP(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    this.sounds.collectOrb.play();

    this.xp += amount;

    let leveledUp = false;
    let needed = this.xpRequiredFor(this.level);
    while (this.xp >= needed) {
      this.xp -= needed;
      this.level += 1;
      leveledUp = true;
      needed = this.xpRequiredFor(this.level);
    }

    this.updateHUD();

    if (leveledUp) {
      this.openUpgradeScreen();
    }
  }

  showDamageNumber(x, y, damage) {
    if (!this || !this.scene.isActive()) return;
    const label = Number.isInteger(damage) ? damage.toString() : damage.toFixed(2);
    const text = this.add.text(x + Phaser.Math.Between(-10, 10), y, label, {
      fontSize: '18px', color: '#ff4444', stroke: '#000000', strokeThickness: 3
    });

    text.setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 500,
      onComplete: () => text.destroy()
    });
  }

  // ----------------------------------------------------------
  // Upgrade screen
  // ----------------------------------------------------------
  // Pulls a random selection of up-to-3 upgrades the player hasn't
  // maxed out yet, pauses GameScene, and launches UpgradeScene as
  // an overlay. UpgradeScene resumes us when the player picks one.
  openUpgradeScreen(count = 3) {
    const choices = this.pickUpgradeChoices(count);

    // Nothing left to offer (every upgrade maxed) -> skip the overlay.
    if (choices.length === 0) return;

    // If the only remaining upgrade is MaxHpUp (infinite stacks),
    // auto-apply it and skip the upgrade scene for a smoother experience.
    if (choices.length === 1 && choices[0].id === 'max-hp-up') {
      this.player.addUpgrade(choices[0]);
      return;
    }

    this.scene.launch('UpgradeScene', { gameScene: this, choices });
    this.scene.bringToTop('UpgradeScene');
    this.scene.pause();
  }

  // Returns up to `count` fresh Upgrade instances the player can still take.
  // Common upgrades have 2x the chance of appearing compared to rare ones.
  pickUpgradeChoices(count) {
    const factories = [
      () => new SpreadShot(),
      () => new BackShot(),
      () => new MagnetBoost(),
      () => new MoveSpeedUp(),
      () => new FireRateUp(),
      () => new DamageUp(),
      () => new KnockBack(),
      () => new Pierce(),
      () => new MegaAmmo(),
      () => new MaxHpUp(),
    ];

    // Filter out upgrades the player has already maxed.
    const available = factories
      .map(make => make())
      .filter(u => this.player.upgrades.getStacks(u.id) < u.maxStacks);

    // Weighted random pick: common = weight 2, rare = weight 1.
    const picked = [];
    const pool = [...available];

    while (picked.length < count && pool.length > 0) {
      const totalWeight = pool.reduce(
        (sum, u) => sum + (u.rarity === Rarity.RARE ? 1 : 2), 0
      );
      let roll = Math.random() * totalWeight;
      let idx = 0;
      for (let i = 0; i < pool.length; i++) {
        roll -= pool[i].rarity === Rarity.RARE ? 1 : 2;
        if (roll <= 0) { idx = i; break; }
      }
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }

    return picked;
  }

  // call whenever an enemy gets defeated call this.updateEnemyDefeated();
  updateEnemyDefeated() {
  
    this.enemiesDefeated += 1;

    this.score =
      Math.floor(this.survivalTime * this.TIME_SCORE_PER_SECOND) +
      this.enemiesDefeated * this.ENEMY_DEFEATED_SCORE;

    this.updateHUD();
  }

  spawnMultiEnemy(x, y, enemyHp, count = 3, offset = 50) {
      if (!this.player || !this.enemies) return;

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const spawnX = Phaser.Math.Clamp(x + Math.cos(angle) * offset, 0, this.WORLD_W);
        const spawnY = Phaser.Math.Clamp(y + Math.sin(angle) * offset, 0, this.WORLD_H);
        const enemy = new Enemy(this, spawnX, spawnY, enemyHp, { scale: this.normalEnemyScale });
        // Marker so dropXP gives a smaller blue orb instead of a full-size one.
        enemy.isSplitChild = true;
        // Brief spawn grace to avoid unavoidable touch damage at split time.
        enemy.contactDamageAfter = this.time.now + GAME_BALANCE.combat.splitContactGraceMs;
        enemy.setTarget(this.player);
        this.enemies.add(enemy);
      }
  }

  makeDamageBorders() {
  const w = this.scale.width;   // use scale.width, not cam.width
  const h = this.scale.height;  // use scale.height, not cam.height
  const t = 60;

  const make = (x, y, rw, rh) => {
    const r = this.add.rectangle(x, y, rw, rh, 0xff0000, 1.0); // Change the number to test visibility, before was 0.5
    r.setOrigin(0, 0);
    r.setScrollFactor(0);
    r.setDepth(99999);
    r.setAlpha(0)
    return r;
  };

  this.damageBorderParts = [
    make(0, 0, w, t),
    make(0, h - t, w, t),
    make(0, 0, t, h),
    make(w - t, 0, t, h),
  ];
}

startBossMusic() {
  if (!this.bossMusic) {
    this.bossMusic = this.sound.add('boss-music', { volume: 0, loop: true });
  }
  if (this.bossMusic?.isPlaying) return;

  // Fade out BGM immediately
  if (this.bgm?.isPlaying) {
    this.tweens.add({
      targets: this.bgm,
      volume: 0,
      duration: 1500,
      onComplete: () => this.bgm.pause()
    });
  }

  this.sounds.bigBoom.play({seek: 0.75});

  this.time.delayedCall(this.sounds.bigBoom.duration * 750, () => {
    this.bossMusic.setVolume(0);
    this.bossMusic.play();

    // Fade in only after play() is called
    this.tweens.add({
      targets: this.bossMusic,
      volume: 0.4,
      duration: 1500,
    });
  });
}

stopBossMusic() {
  // Fade out boss music
  if (this.bossMusic?.isPlaying) {
    this.tweens.add({
      targets: this.bossMusic,
      volume: 0,
      duration: 1500,
      onComplete: () => this.bossMusic.stop()
    });
  }

  // Fade in BGM
  if (this.bgm) {
    this.bgm.setVolume(0);
    this.bgm.resume();
    this.tweens.add({
      targets: this.bgm,
      volume: 0.4,
      duration: 1500,
    });
  }
}

// Function to flash the outline borders upon taking damage, as well as in the game over scene
flashDamageBorders(intensity = 1) {
  // console.log('[flash] called, intensity:', intensity);
  if (this.runEnded) { console.log('[flash] runEnded exit'); return; }
  if (!this.damageBorderParts) { console.log('[flash] no parts exit'); return; }
  if (!this.scene.isActive()) { console.log('[flash] scene inactive exit'); return; }

  // console.log('[flash] parts:', this.damageBorderParts.length);
  const alpha = Math.min(1, 0.15 + intensity * 0.25);

  for (const border of this.damageBorderParts) {
    if (!border || !border.active) { console.log('[flash] skipping inactive border'); continue; }
    this.tweens.killTweensOf(border);
    border.setAlpha(alpha);
    this.tweens.add({
      targets: border,
      alpha: 0,
      duration: 180 + intensity * 80,
      ease: 'Quad.easeOut'
    });
  }

  // console.log('[flash] done');
}

  onShutdown() {
    if (this.enemySpawnTimer) {
      this.enemySpawnTimer.remove(false);
      this.enemySpawnTimer = null;
    }

    if (this.bossSpawnTimer) {
      this.bossSpawnTimer.remove(false);
      this.bossSpawnTimer = null;
    }

    if (this.footballs) {
      this.footballs = null;
    }

    this.events.off('postupdate', this.postUpdate, this);

    if (this._onPlayerHp) {
      this.events.off('player:hp', this._onPlayerHp, this);
      this._onPlayerHp = null;
    }

    if (this.playerHealthBar) {
      this.playerHealthBar.destroy();
      this.playerHealthBar = null;
    }

    if (this.xpOrbs) {
      this.xpOrbs = null;
    }

    if (this.chestSpawnTimer) {
      this.chestSpawnTimer.remove(false);
      this.chestSpawnTimer = null;
    }

    if (this.difficultyTimer) {
      this.difficultyTimer.remove(false);
      this.difficultyTimer = null;
    }

    if (this.chests) {
      this.chests = null;
    }

    if (this.chestArrow) {
      this.chestArrow.destroy();
      this.chestArrow = null;
    }

    if (this.scene.isActive('HUDScene')) {
      this.scene.stop('HUDScene');
    }
  }
}

