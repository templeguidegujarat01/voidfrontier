import { Vector2 } from '../core/Vector2.js';
import { Ship } from '../entities/Ship.js';
import { Projectile } from '../entities/Projectile.js';

const SHIP_HIT_RADIUS = 16;

export interface CombatEvents {
  onShipDestroyed?: (destroyed: Ship, killer: Ship | null) => void;
}

export class CombatSystem {
  readonly projectiles: Projectile[] = [];

  constructor(private readonly events: CombatEvents = {}) {}

  tryFire(ship: Ship, nowMs: number): void {
    if (!ship.firing || !ship.alive || !ship.canFire()) return;
    ship.consumeFireCost();
    const p = new Projectile(
      ship.position,
      ship.angle,
      ship.stats.weaponProjectileSpeed,
      ship.stats.weaponDamage,
      ship.faction,
      ship.stats.weaponRange
    );
    this.projectiles.push(p);
  }

  update(dt: number, nowMs: number, allShips: Ship[]): void {
    for (const p of this.projectiles) {
      p.update(dt);
      if (!p.alive) continue;

      for (const ship of allShips) {
        if (!ship.alive) continue;
        if (ship.faction === p.owner) continue; // no friendly fire within same faction
        const dist = Vector2.distance(p.position, ship.position);
        if (dist <= SHIP_HIT_RADIUS) {
          ship.takeDamage(p.damage, nowMs);
          p.alive = false;
          if (!ship.alive) {
            const killer = allShips.find((s) => s.faction === p.owner) ?? null;
            this.events.onShipDestroyed?.(ship, killer);
          }
          break;
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (!this.projectiles[i].alive) this.projectiles.splice(i, 1);
    }
  }
}
