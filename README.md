# Return to the Office

A top-down office survival game where players battle workplace-themed enemies, collect upgrades, and survive escalating waves.

The game is built with **Phaser 3** and **Vite** and runs entirely in the browser.

## Getting Started

Make sure you are in the `office-survival-game` folder:

```bash
cd office-survival-game
```

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

The source is organized by gameplay responsibility:

- `src/scenes/` contains the Phaser scenes and game flow.
- `src/entities/` contains player, enemy, boss, and pickup behavior.
- `src/upgrades/` contains the upgrade system and individual upgrade effects.
- `src/config/` contains centralized gameplay tuning values.
