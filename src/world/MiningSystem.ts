import { Vector2 } from '../core/Vector2.js';
import { Ship } from '../entities/Ship.js';
import { Asteroid } from '../world/Asteroid.js';

const MINING_RANGE = 55; // Drill blocks are explicitly close-range/high-risk per their design

/** Full result of a mining attempt, including which asteroid (if any) was actually hit — needed server-side to broadcast exactly which asteroid changed. */
export interface MiningResult {
  extracted: number;
  asteroid: Asteroid | null;
}

/** Same rules as tryMine, but also reports which asteroid was hit (for server-side sync broadcasting). tryMine() below is a thin wrapper over this for existing callers. */
export function tryMineDetailed(ship: Ship, asteroids: Asteroid[], dt: number): MiningResult {
  if (!ship.mining || !ship.alive) return { extracted: 0, asteroid: null };
  if (ship.stats.miningRatePerSec <= 0) return { extracted: 0, asteroid: null };
  if (ship.energy < ship.stats.miningEnergyCostPerSec * dt) return { extracted: 0, asteroid: null };

  let nearest: Asteroid | null = null;
  let nearestDist = Infinity;
  for (const a of asteroids) {
    if (a.depleted) continue;
    const d = Vector2.distance(ship.position, a.position);
    if (d <= MINING_RANGE + a.radius && d < nearestDist) {
      nearest = a;
      nearestDist = d;
    }
  }
  if (!nearest) return { extracted: 0, asteroid: null };

  const spaceLeft = ship.stats.cargoCapacity - ship.cargo;
  if (spaceLeft <= 0) return { extracted: 0, asteroid: null };

  const wanted = ship.stats.miningRatePerSec * dt;
  const actuallyWanted = Math.min(wanted, spaceLeft);
  const extracted = nearest.extract(actuallyWanted);

  ship.cargo += extracted;
  ship.energy -= ship.stats.miningEnergyCostPerSec * dt;
  return { extracted, asteroid: extracted > 0 ? nearest : null };
}

/** Returns the amount actually extracted this tick (0 if out of range/full/depleted). */
export function tryMine(ship: Ship, asteroids: Asteroid[], dt: number): number {
  return tryMineDetailed(ship, asteroids, dt).extracted;
}
