import { Vector2 } from '../core/Vector2.js';
import { BlockCategory, GRID_CELL_SIZE } from './BlockTypes.js';
import { getBlockDef } from './BlockCatalog.js';
const BASE_TOP_SPEED = 55;
const BASE_TURN_RATE = 1.8;
/** Sums every currently-attached block's contribution into one derived stat set. Called fresh whenever the blueprint changes (a block is destroyed). */
export function computeAggregateStats(blueprint) {
    let mass = 0;
    let thrust = 0;
    let turnRateBonus = 0;
    let energyGen = 0;
    let energyCapacity = 0;
    let shieldCapacity = 0;
    let shieldRegenPerSec = 0;
    let shieldEnergyDrainPerSec = 0;
    let cargoCapacity = 0;
    let miningRatePerSec = 0;
    let miningEnergyCostPerSec = 0;
    let radarRange = 0;
    let magnetRange = 0;
    let repairPerSec = 0;
    let repairEnergyCostPerSec = 0;
    let totalValue = 0;
    let coolingReduction = 0;
    const weaponMounts = [];
    for (const pb of blueprint) {
        if (pb.hp <= 0)
            continue;
        const def = getBlockDef(pb.blockId);
        mass += def.mass;
        thrust += def.thrust ?? 0;
        turnRateBonus += def.turnRateBonus ?? 0;
        energyGen += def.energyGen ?? 0;
        energyCapacity += def.energyCapacity ?? 0;
        shieldCapacity += def.shieldCapacity ?? 0;
        shieldRegenPerSec += def.shieldRegenPerSec ?? 0;
        shieldEnergyDrainPerSec += def.shieldEnergyDrainPerSec ?? 0;
        cargoCapacity += def.cargoCapacity ?? 0;
        miningRatePerSec += def.miningRatePerSec ?? 0;
        miningEnergyCostPerSec += def.miningEnergyCostPerSec ?? 0;
        radarRange = Math.max(radarRange, def.radarRange ?? 0);
        magnetRange = Math.max(magnetRange, def.magnetRange ?? 0);
        repairPerSec += def.repairPerSec ?? 0;
        repairEnergyCostPerSec += def.repairEnergyCostPerSec ?? 0;
        totalValue += def.cost;
        coolingReduction += def.coolingCooldownReduction ?? 0;
        if (def.weaponDamage && def.weaponCooldownMs && def.weaponRange && def.weaponProjectileSpeed) {
            weaponMounts.push({
                instanceId: pb.instanceId,
                gx: pb.gx,
                gy: pb.gy,
                damage: def.weaponDamage,
                cooldownMs: def.weaponCooldownMs,
                energyCost: def.weaponEnergyCost ?? 0,
                range: def.weaponRange,
                projectileSpeed: def.weaponProjectileSpeed
            });
        }
    }
    const cappedCoolingReduction = Math.min(0.6, coolingReduction);
    for (const w of weaponMounts) {
        w.cooldownMs = w.cooldownMs * (1 - cappedCoolingReduction);
    }
    const massFactor = 100 / (100 + mass);
    return {
        mass,
        thrust: thrust * massFactor,
        topSpeed: (BASE_TOP_SPEED + thrust * 0.15) * massFactor,
        turnRate: (BASE_TURN_RATE + turnRateBonus) * massFactor,
        maxEnergy: energyCapacity,
        energyRegenPerSec: energyGen,
        maxShield: shieldCapacity,
        shieldRegenPerSec,
        shieldEnergyDrainPerSec,
        cargoCapacity,
        miningRatePerSec,
        miningEnergyCostPerSec,
        radarRange: Math.max(radarRange, 300),
        magnetRange,
        repairPerSec,
        repairEnergyCostPerSec,
        totalValue,
        blockCount: blueprint.filter((b) => b.hp > 0).length,
        weaponMounts
    };
}
const NEIGHBOR_OFFSETS = [
    [1, 0], [-1, 0], [0, 1], [0, -1]
];
/** BFS from the Core block over 4-connected grid adjacency. Blocks not reachable from the Core are physically detached. */
export function getConnectedBlockIds(blueprint) {
    const alive = blueprint.filter((b) => b.hp > 0);
    const core = alive.find((b) => getBlockDef(b.blockId).category === BlockCategory.Core);
    const connected = new Set();
    if (!core)
        return connected;
    const byCell = new Map();
    for (const b of alive)
        byCell.set(`${b.gx},${b.gy}`, b);
    const queue = [core];
    connected.add(core.instanceId);
    while (queue.length > 0) {
        const cur = queue.shift();
        for (const [dx, dy] of NEIGHBOR_OFFSETS) {
            const neighbor = byCell.get(`${cur.gx + dx},${cur.gy + dy}`);
            if (neighbor && !connected.has(neighbor.instanceId)) {
                connected.add(neighbor.instanceId);
                queue.push(neighbor);
            }
        }
    }
    return connected;
}
/** Removes blocks with hp<=0 AND blocks no longer connected to the Core. Returns what's still attached and what just detached (for spawning debris). */
export function pruneDisconnected(blueprint) {
    const connectedIds = getConnectedBlockIds(blueprint);
    const alive = [];
    const detached = [];
    for (const b of blueprint) {
        if (b.hp > 0 && connectedIds.has(b.instanceId)) {
            alive.push(b);
        }
        else if (b.hp > 0) {
            detached.push(b);
        }
    }
    return { alive, detached };
}
export function hasCore(blueprint) {
    return blueprint.some((b) => b.hp > 0 && getBlockDef(b.blockId).category === BlockCategory.Core);
}
export function totalHpRatio(blueprint) {
    let hp = 0;
    let maxHp = 0;
    for (const b of blueprint) {
        maxHp += getBlockDef(b.blockId).maxHp;
        hp += Math.max(0, b.hp);
    }
    return maxHp > 0 ? hp / maxHp : 0;
}
/** World-space position of a block's cell, given the ship's own position/angle. */
export function blockWorldPosition(shipPos, shipAngle, block) {
    const local = new Vector2(block.gx * GRID_CELL_SIZE, block.gy * GRID_CELL_SIZE);
    const rotated = Vector2.fromAngle(local.angle() + shipAngle, local.length());
    return shipPos.add(rotated);
}
let nextInstanceId = 1;
export function instantiateBlueprint(template) {
    return template.map((t) => ({
        instanceId: `blk_${nextInstanceId++}`,
        blockId: t.blockId,
        gx: t.gx,
        gy: t.gy,
        hp: getBlockDef(t.blockId).maxHp
    }));
}
export function cloneBlueprint(blueprint) {
    return blueprint.map((b) => ({ ...b }));
}
//# sourceMappingURL=ShipBlueprint.js.map