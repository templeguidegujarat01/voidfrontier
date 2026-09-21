# Void Frontier

An original browser-based multiplayer space game: exploration, mining, and
modular ship construction where your ship's stats are derived directly from
the modules you install (Drive, Emitter, Wardplate, Hullweave, Reactor,
Hold, Drill, Array, Utility Rig).

This is the first playable slice — local single-player vs. bots, no
multiplayer/server yet. See `src/net/README.md`, `src/modes/README.md`,
and `src/teams/README.md` for what's stubbed in for later phases.

## Run it

No external npm packages are required to build or run this — it compiles
straight TypeScript to native ES modules and serves them with a small
built-in static server (no bundler needed for this stage).

```bash
npm run build   # compiles src/**/*.ts -> dist/**/*.js via tsc
npm run serve   # serves the project at http://localhost:5173
```

Then open http://localhost:5173 in a browser.

During development, run `npm run watch` in a second terminal to
recompile TypeScript automatically on save.

**Requirements:** Node.js 18+ and TypeScript (`npm install -g typescript`,
or add it as a local devDependency and use `npx tsc` — the `package.json`
already lists it under devDependencies for when you have npm registry
access).

## Controls

- **Mouse** — steer and thrust toward the cursor
- **Left Click (hold)** — fire
- **E (hold)** — mine the nearest asteroid in range

## Project layout

```
src/
  core/       math, input, camera, game loop
  world/      world bounds, asteroids, starfield, mining
  ship/       module catalog + stat aggregation (the "build your ship" system)
  entities/   Ship base class, PlayerShip, BotShip, Projectile
  combat/     projectile spawning/collision/damage resolution
  render/     Canvas2D renderer
  ui/         DOM HUD
  game/       Game.ts — orchestrates everything per tick
  net/        (stub) future multiplayer client
  modes/      (stub) future per-mode rule sets
  teams/      (stub) future squad system
```

## What's implemented vs. deferred

Implemented: mouse-controlled flight, camera-follow, large bounded world,
asteroids + resource mining, 9-category module system with real stat
aggregation, shield/armor/hull damage resolution, weapons/projectiles,
5 patrol-chase-attack bot ships, death/respawn, DOM HUD with minimap and
session stats.

Deferred (by design, per the project's own phased roadmap): a drag-and-drop
ship Builder UI (loadout is currently fixed at spawn, but the underlying
module-swap math is fully wired up), real-time multiplayer/server
authority, game modes, teams/squads, persistent accounts/leaderboards.
