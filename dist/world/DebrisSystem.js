import { Vector2 } from '../core/Vector2.js';
const PICKUP_RANGE = 26;
const MAGNET_PULL_STRENGTH = 220;
/** Advances every debris piece (magnet pull + drift) and resolves proximity pickup into cargo. Returns how much each ship collected this tick, for score bookkeeping. */
export function updateDebrisField(debris, ships, dt) {
    const collectedBy = new Map();
    for (const d of debris) {
        if (d.expired)
            continue;
        for (const ship of ships) {
            if (!ship.alive || ship.stats.magnetRange <= 0)
                continue;
            if (Vector2.distance(ship.position, d.position) <= ship.stats.magnetRange) {
                d.pullToward(ship.position, MAGNET_PULL_STRENGTH, dt);
            }
        }
        d.update(dt);
    }
    for (const ship of ships) {
        if (!ship.alive)
            continue;
        for (const d of debris) {
            if (d.expired)
                continue;
            const spaceLeft = ship.stats.cargoCapacity - ship.cargo;
            if (spaceLeft <= 0)
                continue;
            if (Vector2.distance(ship.position, d.position) > PICKUP_RANGE)
                continue;
            const taken = Math.min(d.value, spaceLeft);
            if (taken <= 0)
                continue;
            ship.cargo += taken;
            d.value -= taken;
            collectedBy.set(ship, (collectedBy.get(ship) ?? 0) + taken);
            if (d.value <= 0)
                d.collected = true;
        }
    }
    return collectedBy;
}
//# sourceMappingURL=DebrisSystem.js.map