import { Vector2 } from '../core/Vector2.js';
import { GRID_CELL_SIZE, PlacedBlock } from '../ship/BlockTypes.js';
import { Ship } from '../entities/Ship.js';
import { Projectile } from '../entities/Projectile.js';

export interface CombatEvents {
  onShipDestroyed?: (destroyed: Ship, killer: Ship | null) => void;
  /** Fired whenever one or more blocks are destroyed (including cascaded disconnections), for debris spawning. */
  onBlocksDestroyed?: (ship: Ship, blocks: PlacedBlock[], atWorldPos: Vector2) => void;
}

export class CombatSystem {
  readonly projectiles: Projectile[] = [];

  constructor(private readonly events: CombatEvents = {}) {}

  /** Fires every currently-ready weapon block on the ship (each is its own mount, its own cooldown). */
  tryFire(ship: Ship, nowMs: number): void {
    if (!ship.firing || !ship.alive) return;
    for (const mount of ship.stats.weaponMounts) {
      if (!ship.canFireMount(mount)) continue;
      ship.consumeFireCost(mount);

      const local = new Vector2(mount.gx * GRID_CELL_SIZE, mount.gy * GRID_CELL_SIZE);
      const worldOffset = Vector2.fromAngle(local.angle() + ship.angle, local.length());
      const spawnPos = ship.position.add(worldOffset);

      this.projectiles.push(
        new Projectile(spawnPos, ship.angle, mount.projectileSpeed, mount.damage, ship.faction, mount.range)
      );
    }
  }

  update(dt: number, nowMs: number, allShips: Ship[]): void {
    for (const p of this.projectiles) {
      p.update(dt);
      if (!p.alive) continue;

      for (const ship of allShips) {
        if (!ship.alive) continue;
        if (ship.faction === p.owner) continue;
        const dist = Vector2.distance(p.position, ship.position);
        if (dist <= ship.approxRadius()) {
          const destroyed = ship.applyBlockDamage(p.position, p.damage, nowMs);
          p.alive = false;
          if (destroyed.length > 0) {
            this.events.onBlocksDestroyed?.(ship, destroyed, p.position);
          }
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
