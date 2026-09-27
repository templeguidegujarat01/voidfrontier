// Void Frontier — authoritative multiplayer dev server.
// Run with: npm run server   (after `npm run build` has produced dist/)
//
// SCOPE OF THIS PASS: the server is now authoritative for movement,
// aiming, projectiles/collision, exact block hit resolution, block
// destruction + connectivity detachment, ship destruction, debris
// spawn/collection, mining/resource collection, and respawn — for
// PLAYER-VS-PLAYER interactions between connected human clients.
//
// Bots are NOT networked entities (each client simulates its own bots
// locally, as documented in the client). Bot-vs-player combat therefore
// still resolves client-side, exactly as it always has in singleplayer
// — this server file only ever sees/simulates the human players
// connected to it, and reuses the SAME Ship/CombatSystem/World/
// MiningSystem/DebrisSystem classes the client uses (imported straight
// from dist/) rather than a second parallel implementation.
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
const { TIER1_TEMPLATES } = await import(path.join(distRoot, 'ship', 'StarterBlueprints.js'));
const { CombatSystem } = await import(path.join(distRoot, 'combat', 'CombatSystem.js'));
const { tryMineDetailed } = await import(path.join(distRoot, 'world', 'MiningSystem.js'));
const { Debris } = await import(path.join(distRoot, 'world', 'Debris.js'));
const { updateDebrisField } = await import(path.join(distRoot, 'world', 'DebrisSystem.js'));
const { getBlockDef, blockColor } = await import(path.join(distRoot, 'ship', 'BlockCatalog.js'));

const STARTER_RECIPE = TIER1_TEMPLATES[0].blocks;
const PORT = Number(process.env.PORT) || 8787;
const CAPACITY = Number(process.env.CAPACITY) || 80;
const TICK_HZ = 20;
const ASTEROID_BROADCAST_EVERY_N_TICKS = 4; // ~5Hz batched deltas, not every tick

const world = new World(6000, 6000, 90, 0);

class ServerPlayerShip extends Ship {}

const clients = new Map();
const debris = [];

let tickCounter = 0;
let asteroidChangeAccumulator = new Set();

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

function serializeAsteroid(a) {
  return { id: a.id, x: a.position.x, y: a.position.y, radius: a.radius, maxResource: a.maxResource, resource: a.resource, shapeSeed: a.shapeSeed };
}

function serializeDebris(d) {
  return { id: d.id, x: d.position.x, y: d.position.y, value: d.value, color: d.color };
}

function snapshotPlayers() {
  return [...clients.entries()].map(([id, c]) => ({
    id,
    x: c.ship.position.x,
    y: c.ship.position.y,
    angle: c.ship.angle,
    shield: Math.round(c.ship.shield),
    alive: c.ship.alive,
    score: Math.round(c.ship.score),
    kills: c.ship.kills,
    cargo: Math.round(c.ship.cargo)
  }));
}

const combat = new CombatSystem({
  onShipDestroyed: (destroyed, killer) => {
    const shipId = destroyed.clientId;
    const killerId = killer ? killer.clientId ?? null : null;
    if (killer) {
      killer.kills += 1;
      killer.score += Math.round(destroyed.stats.totalValue * 0.5);
    }
    broadcast({ type: 'ship_destroyed', shipId, killerId });
  },
  onBlocksDestroyed: (ship, blocks, atPos) => {
    const shipId = ship.clientId;
    broadcast({ type: 'blocks_destroyed', shipId, blockIds: blocks.map((b) => b.instanceId), x: atPos.x, y: atPos.y });
    for (const b of blocks) {
      const def = getBlockDef(b.blockId);
      const spawnPos = atPos.add(new Vector2((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12));
      const d = new Debris(spawnPos, Math.max(1, Math.round(def.cost * 0.4)), blockColor(def.category));
      debris.push(d);
      broadcast({ type: 'debris_spawn', debris: serializeDebris(d) });
    }
  }
});

const httpServer = http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      name: 'LOCAL-DEV',
      players: clients.size,
      capacity: CAPACITY,
      mode: 'sandbox (authoritative combat + mining)',
      uptimeSec: Math.round(process.uptime())
    }));
    return;
  }
  if (req.url === '/debug') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      players: [...clients.entries()].map(([id, c]) => ({
        id, name: c.name,
        x: Math.round(c.ship.position.x), y: Math.round(c.ship.position.y),
        angle: c.ship.angle.toFixed(2),
        firing: c.ship.firing,
        alive: c.ship.alive,
        blocks: c.ship.blueprint.filter(b => b.hp > 0).length,
        weaponMounts: c.ship.stats.weaponMounts.length,
        energy: Math.round(c.ship.energy)
      })),
      projectiles: combat.projectiles.map(p => ({ id: p.id, x: Math.round(p.position.x), y: Math.round(p.position.y), owner: p.owner, ttl: p.ttl.toFixed(2) }))
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
          recipe: STARTER_RECIPE,
          position: randomSpawn(),
          name
        });
        ship.clientId = id;
        clients.set(id, { conn, ship, name });

        conn.send(JSON.stringify({
          type: 'welcome',
          id,
          ownBlueprint: ship.blueprint,
          players: [...clients.entries()]
            .filter(([otherId]) => otherId !== id)
            .map(([otherId, c]) => ({
              id: otherId,
              name: c.name,
              x: c.ship.position.x,
              y: c.ship.position.y,
              angle: c.ship.angle,
              blueprint: c.ship.blueprint,
              alive: c.ship.alive
            })),
          asteroids: world.asteroids.map(serializeAsteroid),
          debris: debris.map(serializeDebris)
        }));

        broadcast({
          type: 'join',
          player: { id, name, x: ship.position.x, y: ship.position.y, angle: ship.angle, blueprint: ship.blueprint, alive: ship.alive }
        }, id);

        console.log(`[voidfrontier] ${name} joined (${clients.size}/${CAPACITY})`);
        return;
      }

      if (msg.type === 'input' && id !== null) {
        const c = clients.get(id);
        if (!c) return;
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
  const nowMs = Date.now();
  const allShips = [...clients.values()].map((c) => c.ship);

  for (const c of clients.values()) {
    c.ship.update(dt);
    c.ship.position = world.clampToBounds(c.ship.position);
    if (!c.ship.alive && c.ship.respawnTimer <= 0) {
      c.ship.respawn(randomSpawn());
      broadcast({
        type: 'ship_respawned',
        shipId: c.ship.clientId,
        x: c.ship.position.x,
        y: c.ship.position.y,
        angle: c.ship.angle,
        blueprint: c.ship.blueprint
      });
    }
  }

  const projectileCountBeforeFire = combat.projectiles.length;
  for (const c of clients.values()) combat.tryFire(c.ship, nowMs);
  const newlySpawned = combat.projectiles.slice(projectileCountBeforeFire);
  for (const p of newlySpawned) {
    broadcast({
      type: 'projectile_spawn',
      projectile: {
        id: p.id,
        x: p.position.x,
        y: p.position.y,
        angle: p.velocity.angle(),
        speed: p.velocity.length(),
        damage: p.damage,
        owner: p.owner,
        range: p.ttl * p.velocity.length()
      }
    });
  }
  const idsBeforeUpdate = new Set(combat.projectiles.map((p) => p.id));
  combat.update(dt, nowMs, allShips);
  for (const pid of idsBeforeUpdate) {
    if (!combat.projectiles.some((p) => p.id === pid)) {
      broadcast({ type: 'projectile_remove', id: pid });
    }
  }

  for (const c of clients.values()) {
    const result = tryMineDetailed(c.ship, world.asteroids, dt);
    if (result.extracted > 0) {
      c.ship.score += result.extracted;
      if (result.asteroid) asteroidChangeAccumulator.add(result.asteroid.id);
    }
  }

  const expiredBefore = new Set(debris.filter((d) => d.expired).map((d) => d.id));
  const collectedBy = updateDebrisField(debris, allShips, dt);
  for (const [ship, amount] of collectedBy) ship.score += amount;
  for (const d of debris) {
    if (d.expired && !expiredBefore.has(d.id)) {
      broadcast({ type: 'debris_remove', id: d.id });
    }
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    if (debris[i].expired) debris.splice(i, 1);
  }

  tickCounter += 1;
  if (tickCounter % ASTEROID_BROADCAST_EVERY_N_TICKS === 0 && asteroidChangeAccumulator.size > 0) {
    const updates = [...asteroidChangeAccumulator]
      .map((aid) => world.asteroids.find((a) => a.id === aid))
      .filter(Boolean)
      .map((a) => ({ id: a.id, resource: a.resource }));
    if (updates.length > 0) broadcast({ type: 'asteroid_update', asteroids: updates });
    asteroidChangeAccumulator.clear();
  }

  if (clients.size > 0) {
    broadcast({ type: 'snapshot', players: snapshotPlayers() });
  }
}, stepMs);

httpServer.listen(PORT, () => {
  console.log(`Void Frontier authoritative multiplayer server listening on ws://localhost:${PORT}/ws`);
  console.log(`Status endpoint: http://localhost:${PORT}/status`);
  console.log('Authoritative for: movement, combat (block-level), mining, debris, respawn (PvP only - bots stay client-local).');
});
