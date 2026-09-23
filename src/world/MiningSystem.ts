import { Vector2 } from '../core/Vector2.js';
import { Ship } from '../entities/Ship.js';
import { Asteroid } from '../world/Asteroid.js';

const MINING_RANGE = 55; // Drill blocks are explicitly close-range/high-risk per their design

/** Returns the amount actually extracted this tick (0 if out of range/full/depleted). */
export function tryMine(ship: Ship, asteroids: Asteroid[], dt: number): number {
  if (!ship.mining || !ship.alive) return 0;
  if (ship.stats.miningRatePerSec <= 0) return 0;
  if (ship.energy < ship.stats.miningEnergyCostPerSec * dt) return 0;

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
  if (!nearest) return 0;

  const spaceLeft = ship.stats.cargoCapacity - ship.cargo;
  if (spaceLeft <= 0) return 0;

  const wanted = ship.stats.miningRatePerSec * dt;
  const actuallyWanted = Math.min(wanted, spaceLeft);
  const extracted = nearest.extract(actuallyWanted);

  ship.cargo += extracted;
  ship.energy -= ship.stats.miningEnergyCostPerSec * dt;
  return extracted;
}
