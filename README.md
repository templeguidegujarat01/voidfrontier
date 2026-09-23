# Void Frontier

An original browser-based block-built space game: mine, fight, and evolve
your ship in the world itself — no menu-driven building. A ship is a set
of individually-placed, individually-destructible blocks; losing a block
in combat visibly and immediately changes how the ship flies and fights.

## Run it

```bash
npm run build   # compiles src/**/*.ts -> dist/**/*.js via tsc
npm run serve   # serves the game at http://localhost:5173
```

Open http://localhost:5173 — main menu, pick a mode, pick a starter ship
in the Lobby, play.

### Real local multiplayer (optional)

```bash
npm run server   # starts the authoritative dev server on ws://localhost:8787/ws
```

Pick **Local Multiplayer (Dev Server)** from the menu in two browser tabs
to see real position sync. Movement/hull-percentage sync only in this
pass — see the comment block at the top of `server/index.mjs`.

## Controls

- **Mouse** — steer toward the cursor
- **Left Click (hold)** — fire every equipped weapon block
- **Right Click (hold)** — brake
- **E (hold)** — mine the nearest asteroid (close range)
- **Esc** — pause / quit to menu

## The block ship model

A ship is a grid of individually-placed blocks (`src/ship/BlockCatalog.ts`
— 17 original block types: Core, Light/Reinforced Frame, Light/Heavy
Armor, Thruster, Drill, Laser, Launcher, Magnet, Generator, Shield,
Radar, Cargo, Repair, Stabilizer, Cooling). Every ship stat — mass,
speed, turn rate, weapon mounts, mining rate, cargo, shield, energy — is
summed live from whichever blocks are currently attached
(`src/ship/ShipBlueprint.ts`). There is no separate fixed "HP bar":
each block has its own HP, takes damage individually based on where a
projectile actually lands (`Ship.applyBlockDamage`), and losing a block
that leaves other blocks disconnected from the Core physically detaches
them too (`pruneDisconnected` — a real 4-connected grid BFS from the
Core). Destroyed blocks spawn collectible debris (`src/world/Debris.ts`),
matching their block's economic value and color. The ship is destroyed
only when its Core is destroyed.

Six original blueprints ship with the game: three Tier 1 starters
(Wisp, Grub, Fang — chosen in the Lobby) and three Tier 2 evolutions
(Striker, Miner, Guardian — offered in-match once the player's score
crosses a threshold, via a real picker overlay that swaps the live
ship's blocks with continuity of cargo/energy). Browse all six, with
real block-grid previews and live-computed stats, from Shipyard on the
main menu.

## What's implemented vs. what's next

Real and working: the full block-ship model described above; a real
score system (mining + debris + a share of any destroyed enemy's block
value, not just kill count); an in-match evolution picker; an expanded
bot AI state machine (idle/mining/exploring/scouting/pursuing/attacking/
fleeing/retreating/regrouping/assisting, driven by relative health and
threat); mouse-steer + right-click brake controls; a real authoritative
WebSocket multiplayer server (hand-rolled protocol, no npm packages
available in this sandbox) verified with concurrent real clients; local
XP/level/credits/lifetime-stat progression; a Frontier FFA mode with a
real kill-target-and-clock match structure.

Explicitly not implemented yet (no fake buttons for these — they're
simply absent from the UI, or clearly marked "coming soon"): a visual
drag-and-place block editor (the Shipyard is a real but read-only
gallery of the six built-in blueprints, not a builder); schematic
save/export/import/sharing; Team War / Team vs Solo / Solo Duel / Co-op
/ Private Rooms / friends & parties (all require the multiplayer
server's room/team layer, not built yet); cross-client combat/mining
sync (the dev server syncs movement and hull percentage only);
server/world tier gating; chat; audio; touch controls; 30-tier
progression (2 real tiers are implemented as a working vertical slice,
not 30).
