# Return to the Office

A top-down office survival game where players battle workplace-themed enemies, collect upgrades, and survive escalating waves.

The game is built with **Phaser 3** and **Vite** and runs entirely in the browser.

The game is inspired by the auto-attacking survival gameplay of *Vampire Survivors*,
with its own office-themed setting, enemies, upgrades, and progression systems.

## Getting Started

Make sure you are in the `office-survival-game` folder:


Install dependencies:

```bash
npm install
```

Run the game in development mode:

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Production Build

Create an optimized static build:

```bash
npm run build
```

Preview the build locally:

```bash
npm run preview
```

## Project Notes

Gameplay and upgrade assets preload in the background while the title screen
is visible. Start Game begins immediately once they are cached. If clicked
earlier, the menu shows loading progress and starts automatically when ready.
Failed downloads can be retried using the same button. The existing asset
files and gameplay remain unchanged.

The source is organized by gameplay responsibility:

- `src/scenes/` contains the Phaser scenes and game flow.
- `src/entities/` contains player, enemy, boss, and pickup behavior.
- `src/upgrades/` contains the upgrade system and individual upgrade effects.
- `src/config/` contains centralized gameplay tuning values.
