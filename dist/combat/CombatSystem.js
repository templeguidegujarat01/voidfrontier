import { Vector2 } from '../core/Vector2.js';
import { GRID_CELL_SIZE } from '../ship/BlockTypes.js';
import { Projectile } from '../entities/Projectile.js';
export class CombatSystem {
    constructor(events = {}) {
        this.events = events;
        this.projectiles = [];
    }
    /** Fires every currently-ready weapon block on the ship (each is its own mount, its own cooldown). */
    tryFire(ship, nowMs) {
        if (!ship.firing || !ship.alive)
            return;
        for (const mount of ship.stats.weaponMounts) {
            if (!ship.canFireMount(mount))
                continue;
            ship.consumeFireCost(mount);
            const local = new Vector2(mount.gx * GRID_CELL_SIZE, mount.gy * GRID_CELL_SIZE);
            const worldOffset = Vector2.fromAngle(local.angle() + ship.angle, local.length());
            const spawnPos = ship.position.add(worldOffset);
            this.projectiles.push(new Projectile(spawnPos, ship.angle, mount.projectileSpeed, mount.damage, ship.faction, mount.range, ship.id));
        }
    }
    update(dt, nowMs, allShips) {
        for (const p of this.projectiles) {
            p.update(dt);
            if (!p.alive)
                continue;
            for (const ship of allShips) {
                if (!ship.alive)
                    continue;
                if (ship.id === p.ownerShipId)
                    continue; // never hit yourself
                // Same-faction exclusion ("no friendly fire") is only meaningful
                // for bots, which share a faction because they're all "the AI
                // side". Every human player is also faction 'player', so applying
                // this to players would make humans unable to ever hit each
                // other — self-exclusion above (by ship id) is what actually
                // prevents self-damage; this additional rule only stops bot vs
                // bot fire.
                if (ship.faction === p.owner && ship.faction === 'bot')
                    continue;
                const closestPoint = Vector2.closestPointOnSegment(ship.position, p.previousPosition, p.position);
                const dist = Vector2.distance(ship.position, closestPoint);
                if (dist <= ship.approxRadius()) {
                    const destroyed = ship.applyBlockDamage(closestPoint, p.damage, nowMs);
                    p.alive = false;
                    if (destroyed.length > 0) {
                        this.events.onBlocksDestroyed?.(ship, destroyed, closestPoint);
                    }
                    if (!ship.alive) {
                        const killer = allShips.find((s) => s.id === p.ownerShipId) ?? null;
                        this.events.onShipDestroyed?.(ship, killer);
                    }
                    break;
                }
            }
        }
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (!this.projectiles[i].alive)
                this.projectiles.splice(i, 1);
        }
    }
}
//# sourceMappingURL=CombatSystem.js.map