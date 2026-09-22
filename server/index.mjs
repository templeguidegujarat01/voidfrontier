// Void Frontier — local multiplayer dev server.
// Run with: npm run server   (after `npm run build` has produced dist/)
//
// SCOPE OF THIS FIRST PASS (documented honestly, not hidden):
//   - Real WebSocket server, real per-connection authoritative Ship
//     simulation (imports the SAME compiled physics classes the browser
//     client uses from dist/, so this is not a parallel reimplementation).
//   - Synchronizes: player join/leave, position, facing angle, hull.
//   - Does NOT yet synchronize: combat (projectiles/damage), mining,
//     asteroids, teams, modes, or rooms. Each connected socket is placed
//     into one shared default world. Those are the explicit next steps.
//
// No third-party packages are used (none are installable in the sandbox
// this was built in) — server/ws.mjs hand-rolls the WebSocket protocol.

import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachWebSocketServer } from './ws.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, '..', 'dist');

const { Ship } = await import(path.join(distRoot, 'entities', 'Ship.js'));
const { Vector2, clamp } = await import(path.join(distRoot, 'core', 'Vector2.js'));
const { World } = await import(path.join(distRoot, 'world', 'World.js'));
const { DEFAULT_PLAYER_LOADOUT } = await import(path.join(distRoot, 'ship', 'ShipStats.js'));

const PORT = Number(process.env.PORT) || 8787;
const CAPACITY = Number(process.env.CAPACITY) || 80;
const TICK_HZ = 20;

const world = new World(6000, 6000, 0, 0); // asteroid/star generation not needed server-side yet

/** Concrete Ship subclass — the base class is only "abstract" at the TypeScript level. */
class ServerPlayerShip extends Ship {}

/** @type {Map<string, { conn: import('./ws.mjs').default, ship: ServerPlayerShip, name: string }>} */
const clients = new Map();

function randomSpawn() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 200 + Math.random() * 800;
  return Vector2.fromAngle(angle, dist);
}

function broadcast(obj, exceptId = null) {
  const msg = JSON.stringify(obj);
  for (const [id, c] of clients) {
    if (id === exceptId) continue;
    c.conn.send(msg);
  }
}

function snapshotPlayers() {
  return [...clients.entries()].map(([id, c]) => ({
    id,
    name: c.name,
    x: c.ship.position.x,
    y: c.ship.position.y,
    angle: c.ship.angle,
    hull: Math.round(c.ship.hull),
    maxHull: Math.round(c.ship.stats.maxHull),
    alive: c.ship.alive
  }));
}

const httpServer = http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      name: 'LOCAL-DEV',
      players: clients.size,
      capacity: CAPACITY,
      mode: 'sandbox (movement sync only)',
      uptimeSec: Math.round(process.uptime())
    }));
    return;
  }
  res.writeHead(404);
  res.end('Void Frontier dev server. Connect via WebSocket at /ws.');
});

attachWebSocketServer(httpServer, {
  path: '/ws',
  onConnection: (conn) => {
    let id = null;

    conn.onMessage = (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      if (msg.type === 'hello' && id === null) {
        if (clients.size >= CAPACITY) {
          conn.send(JSON.stringify({ type: 'full' }));
          conn.close();
          return;
        }
        id = crypto.randomUUID();
        const name = typeof msg.name === 'string' ? msg.name.slice(0, 24) : 'Pilot';
        const ship = new ServerPlayerShip({
          faction: 'player',
          loadout: DEFAULT_PLAYER_LOADOUT,
          position: randomSpawn(),
          name
        });
        clients.set(id, { conn, ship, name });

        conn.send(JSON.stringify({ type: 'welcome', id, players: snapshotPlayers() }));
        broadcast({ type: 'join', player: { id, name, x: ship.position.x, y: ship.position.y, angle: ship.angle, hull: ship.hull, maxHull: ship.stats.maxHull, alive: ship.alive } }, id);
        console.log(`[voidfrontier] ${name} joined (${clients.size}/${CAPACITY})`);
        return;
      }

      if (msg.type === 'input' && id !== null) {
        const c = clients.get(id);
        if (!c) return;
        // Server-side sanity clamping — never trust raw client numbers.
        c.ship.thrustIntent = clamp(Number(msg.thrustIntent) || 0, -1, 1);
        const angle = Number(msg.targetAngle);
        c.ship.targetAngle = Number.isFinite(angle) ? angle : c.ship.targetAngle;
        c.ship.firing = Boolean(msg.firing);
        c.ship.mining = Boolean(msg.mining);
      }
    };

    conn.onClose = () => {
      if (id === null) return;
      const c = clients.get(id);
      clients.delete(id);
      broadcast({ type: 'leave', id });
      console.log(`[voidfrontier] ${c?.name ?? id} left (${clients.size}/${CAPACITY})`);
    };
  }
});

const stepMs = 1000 / TICK_HZ;
setInterval(() => {
  const dt = stepMs / 1000;
  for (const c of clients.values()) {
    c.ship.update(dt);
    c.ship.position = world.clampToBounds(c.ship.position);
    if (!c.ship.alive && c.ship.respawnTimer <= 0) {
      c.ship.respawn(randomSpawn());
    }
  }
  if (clients.size > 0) {
    broadcast({ type: 'snapshot', players: snapshotPlayers() });
  }
}, stepMs);

httpServer.listen(PORT, () => {
  console.log(`Void Frontier dev multiplayer server listening on ws://localhost:${PORT}/ws`);
  console.log(`Status endpoint: http://localhost:${PORT}/status`);
  console.log('Movement/position sync only in this build — see comments at the top of this file.');
});
