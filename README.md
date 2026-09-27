# Void Frontier

An original browser-based block-built space game: mine, fight, and evolve
your ship in the world itself. A ship is a set of individually-placed,
individually-destructible blocks; losing a block in combat visibly and
immediately changes how the ship flies and fights. Multiplayer combat and
mining are server-authoritative — the server decides what happened, and
every connected client converges on that same result.

## Run it

```bash
npm run build   # compiles src/**/*.ts -> dist/**/*.js via tsc
npm run serve   # serves the game at http://localhost:5173
```

Open http://localhost:5173 — main menu, pick a mode, pick a starter ship
in the Lobby, play.

### Real local multiplayer

```bash
npm run server   # starts the authoritative dev server on ws://localhost:8787/ws
```

Pick **Local Multiplayer (Dev Server)** from the menu in two browser tabs.
The server is authoritative for movement, aiming, projectiles/collision,
exact block hit detection, block destruction and connectivity detachment,
ship destruction, debris spawn/collection, mining/resource collection,
and respawn — for player-vs-player interactions between connected human
clients. Verified with real concurrent clients (see "What's been tested"
below): both sides converge on the exact same block-level ship state
after combat, not just a rough hull percentage.

Bots are **not** networked — each client simulates its own bots locally,
exactly as in singleplayer, so bot-vs-player combat stays client-resolved.
The server reuses the *exact same* Ship/CombatSystem/MiningSystem/
DebrisSystem/World classes the client uses (imported straight from
`dist/`) — there is one set of gameplay rules, not a parallel server
reimplementation.

## Controls

- **Mouse** — steer toward the cursor
- **Left Click (hold)** — fire every equipped weapon block
- **Right Click (hold)** — brake
- **E (hold)** — mine the nearest asteroid (close range)
- **Esc** — pause / quit to menu

## The block ship model

A ship is a grid of individually-placed blocks (`src/ship/BlockCatalog.ts`
— 17 original block types). Every ship stat is summed live from whichever
blocks are currently attached (`src/ship/ShipBlueprint.ts`). Each block
has its own HP and takes damage individually based on where a projectile
actually lands; losing a block that leaves other blocks disconnected from
the Core detaches them too (`pruneDisconnected` — a 4-connected grid BFS).
Destroyed blocks spawn collectible debris. The ship is destroyed only
when its Core is destroyed.

Six original blueprints ship with the game: three Tier 1 starters (Wisp,
Grub, Fang — chosen in the Lobby) and three Tier 2 evolutions (Striker,
Miner, Guardian — offered in-match via a real picker once score crosses a
threshold). Browse all six from Shipyard on the main menu.

## Multiplayer architecture

`server/index.mjs` runs one authoritative simulation shared by every
connected client:
- Each client's ship is a real server-side `Ship` instance, receiving
  the client's raw input (thrust/aim/fire/mine intent) each tick and
  simulating movement, weapon cooldowns, and mining exactly like the
  client does locally.
- Combat resolution — including which specific block was hit — happens
  once, on the server, using a **swept (segment-based) collision check**
  rather than a single end-of-tick point check. (A point check missed
  fast projectiles between low-tick-rate server frames; this was found
  and fixed during real 2-client testing — see the comment in
  `CombatSystem.ts`.)
- Self-hit exclusion is by **ship identity**, not faction. (An earlier
  version excluded same-faction hits, which is right for bots sharing
  the `'bot'` faction — but it also silently made every human player
  unable to hit any other human, since every connected client's ship is
  faction `'player'`. Found and fixed during multiplayer testing — see
  the comment in `CombatSystem.ts`.)
- The server broadcasts a lightweight position/shield/score snapshot
  every tick (~20Hz), and separate discrete **events** for anything
  block-level or one-off — block destruction, ship destruction/respawn,
  projectile spawn/remove, debris spawn/remove, batched asteroid
  deltas — so bandwidth doesn't scale with full ship geometry every
  tick.
- On join, a new client receives its own ship's blueprint (with the
  server's own block instance ids — adopting these matters: the client
  built its ship locally before connecting, with its own ids, which
  would never match the server's ids in later events without this
  handoff), every other connected player's full blueprint, the full
  asteroid field, and current debris.

No npm packages are used server-side — `server/ws.mjs` hand-rolls the
RFC6455 WebSocket protocol (handshake, framing, fragmentation, ping/pong),
since this project was built in a sandbox with no npm registry access.

## What's been tested

- Full singleplayer regression: mining, real per-block combat damage
  (through the actual weapon-fire path, not a direct API call), core
  destruction, evolution picker, a 15s natural soak run with bot AI —
  all pass with zero console errors.
- Real 2-client PvP: two independent clients (both Playwright browser
  contexts and, for faster iteration, two raw WebSocket protocol
  clients) converge on **byte-identical block instance ids** for each
  other's ships after combat — verified for partial damage, full ship
  destruction + respawn, and continued combat immediately after respawn.
- Mining: a connected client's cargo increases via server-side
  extraction credited through the snapshot, confirmed live.
- A second client joining mid-session sees the already-depleted
  resource value on a shared asteroid (not a fresh one).
- Disconnect/reconnect: a client disconnecting and a new one connecting
  afterward doesn't corrupt server state (player counts and asteroid
  data stay correct).
- GitHub Pages subpath hosting re-verified clean after all of the above.

## What's implemented vs. what's next

Real and working: everything in "Multiplayer architecture" and "What's
been tested" above, plus the full singleplayer game (block ships,
mining, combat, bot AI, evolution, progression, local dev multiplayer).

Explicitly not implemented yet: a visual drag-and-place block editor;
schematic save/export/import; Team War/Team vs Solo/Solo Duel/Co-op/
Private Rooms/friends (no room or team layer on the server yet); spatial
partitioning for collision checks (the current O(ships × projectiles)
check was fine at the 2-client scale tested, but partitioning would
matter at the 50-80 player target); server-side bots (bots stay
client-local by design this pass); chat; audio; touch controls.
