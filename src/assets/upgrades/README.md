# Assets

All images and audio files used by the game live here. Vite is configured to serve this folder at the root URL, so load paths in code **do not** include an `assets/` prefix.

## Folder layout

```
src/assets/
  hero/
    hero_main.png            ← player sprite (in use)
  enemies/
    enemy_normal.png         ← base enemy sprite (in use)
    enemy_fast.png           ← add when building Phase 3
    enemy_tanky.png          ← add when building Phase 3
  projectiles/
    bullet.png               ← add when building Phase 2
  ui/
    joystick_base.png        ← optional — joystick is currently drawn in code
    joystick_thumb.png
  audio/
    shoot.mp3                ← add when building Phase 3
    hit.mp3
    death.mp3
    levelup.mp3
    music.mp3
```

## How to add a new image

1. Drop the file into the correct subfolder (e.g. `src/assets/projectiles/bullet.png`).

2. Load it in `preload()` inside your scene. The path is relative to this `assets/` folder — do **not** write `assets/` at the start:
   ```js
   // Correct
   this.load.image('bullet', 'projectiles/bullet.png');

   // Wrong — 'assets/' prefix will 404
   this.load.image('bullet', 'assets/projectiles/bullet.png');
   ```

3. Use it anywhere by the key name you gave it:
   ```js
   const b = this.physics.add.sprite(x, y, 'bullet');
   ```

4. After adding, tune `setScale()` until the image looks right. The correct value depends on how large your image file is (a 32×32 pixel image needs a bigger scale than a 1024×1024 one):

   | Image size | Good starting scale |
   |---|---|
   | 32×32 | `2` or `3` |
   | 64×64 | `1` or `2` |
   | 128×128 | `0.5` |
   | 512×512+ | `0.1` or smaller |

## How to add audio

1. Drop the `.mp3` (or `.ogg`) into `src/assets/audio/`.

2. Load it in `preload()`:
   ```js
   this.load.audio('shoot', 'audio/shoot.mp3');
   ```

3. Play it in your scene:
   ```js
   this.sound.play('shoot');                        // play once
   this.bgMusic = this.sound.add('music', { loop: true, volume: 0.4 });
   this.bgMusic.play();                             // looping background music
   ```

## Why is the load path missing `assets/`?

`vite.config.js` sets `publicDir: 'src/assets'`. This tells Vite to serve everything inside `src/assets/` directly at the root of the dev server. So `src/assets/hero/hero_main.png` becomes available at `http://localhost:5173/hero/hero_main.png`, which is why the load path is just `'hero/hero_main.png'`.

If you ever move the assets folder, update `publicDir` in `vite.config.js` and all load paths accordingly.

## Naming rules

- Use lowercase, no spaces. Use underscores or hyphens: `enemy_fast.png`, `level-up.mp3`.
- Group by type in subfolders — don't put everything in the root of assets.
- Keep key names short and descriptive: `'bullet'`, `'enemy_fast'`, `'music'`.
- Never couple a key name to a file path. If you swap the image file, only `preload()` changes. Nothing else in the codebase should know or care what the filename is.
