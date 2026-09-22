# Void Frontier

An original browser-based space game: mine, build, fight, and progress —
where your ship's stats come entirely from the modules you install
(Drive, Emitter, Wardplate, Hullweave, Reactor, Hold, Drill, Array,
Utility Rig) on one of eight original chassis.

## Run it

No external npm packages are required — this compiles straight
TypeScript to native ES modules and serves them with a small built-in
static server (no bundler needed for this stage).

```bash
npm run build   # compiles src/**/*.ts -> dist/**/*.js via tsc
npm run serve   # serves the game at http://localhost:5173
```

Open http://localhost:5173. You'll land on the main menu — enter a
pilot name, pick a mode, and play.

For live GitHub Pages deployment, see `.github/workflows/deploy.yml`
(builds and publishes automatically on push to `main` — enable it under
repo Settings → Pages → Source → GitHub Actions).

### Real local multiplayer (optional)

```bash
npm run server   # starts the authoritative dev server on ws://localhost:8787/ws
```

With the server running, pick **Local Multiplayer (Dev Server)** from
the main menu in two browser tabs (or two devices on the same network,
pointing the client at your machine's IP) to see real position sync
between connected players. **Scope of this pass:** movement/position/hull
sync only — combat, mining, and asteroids are not yet synchronized across
clients. See the comment block at the top of `server/index.mjs` for the
exact boundary. No npm packages are used server-side either — the
WebSocket protocol itself is hand-rolled in `server/ws.mjs` (RFC6455),
since this project was built in a sandbox with no npm registry access.

## Controls

- **Mouse** — steer and thrust toward the cursor
- **Left Click (hold)** — fire
- **E (hold)** — mine the nearest asteroid in range
- **Esc** — pause / quit to menu

## Project layout

```
src/
  app/         AppShell (screen router) + shared MatchConfig types
  screens/     MainMenu, Lobby, Builder, Game, Results
  core/        math, input, camera, game loop
  world/       world bounds, asteroids, starfield, mining
  ship/        module catalog + stat aggregation (the ship-building system)
  entities/    Ship base class, PlayerShip, BotShip (full AI state machine), Projectile, RemotePlayer
  combat/      projectile spawning/collision/damage resolution
  render/      Canvas2D renderer
  ui/          DOM HUD
  game/        Game.ts — orchestrates one match (local + optional networked)
  net/         browser WebSocket client + server-reachability probe
  progression/ local XP/level/credits/lifetime-stats (localStorage)
  loadouts/    saved ship builds (localStorage)
server/
  ws.mjs       hand-rolled RFC6455 WebSocket server (no npm deps)
  index.mjs    authoritative dev multiplayer server (reuses the SAME
               compiled Ship/World physics from dist/ that the client uses)
```

## What's implemented vs. what's next

**Real and working:** main menu with persisted pilot name, a real mode
grid (Practice / Frontier FFA-vs-bots with a kill-target+clock / Local
Dev Multiplayer), a match lobby with countdown, a full Ship Builder
(8 chassis x 9 module categories, live-recomputed stats, save/rename/
duplicate/delete loadouts), an expanded bot AI (idle/mining/exploring/
scouting/pursuing/attacking/fleeing/retreating/regrouping/assisting,
driven by relative health and threat, not just "chase nearest"), local
XP/level/credits/lifetime-stat progression with a Results screen, and a
genuine authoritative WebSocket multiplayer server (hand-rolled protocol,
real position/hull sync, verified with real concurrent WebSocket
clients, not mocked).

**Explicitly not implemented yet** (shown in the UI as "Coming soon —
requires multiplayer server," never faked): Team War, Team vs Solo,
Solo Duel, Co-op/Training, Private Rooms, friends/parties, cross-client
combat/mining sync, matchmaking, server-side authoritative damage
validation, audio, and a deployed (non-local) server. The server-side
foundation (`server/index.mjs`) is structured so combat sync, rooms, and
teams extend it rather than requiring a rewrite — see the comment block
at the top of that file for the precise current boundary.
