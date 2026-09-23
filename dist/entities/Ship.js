import { Vector2, clamp, angleDiff } from '../core/Vector2.js';
import { GRID_CELL_SIZE } from '../ship/BlockTypes.js';
import { getBlockDef } from '../ship/BlockCatalog.js';
import { computeAggregateStats, pruneDisconnected, hasCore, instantiateBlueprint } from '../ship/ShipBlueprint.js';
let nextShipId = 1;
const STEER_DEADZONE = 18;
/**
 * Shared physics + block-damage logic for any ship (player or bot). A
 * ship's stats are not a fixed stat sheet — they're recomputed from
 * whichever blocks are still alive and still connected to the Core, so
 * losing blocks in combat visibly and immediately changes how the ship
 * flies and fights.
 */
export class Ship {
    constructor(cfg) {
        this.id = nextShipId++;
        this.velocity = new Vector2(0, 0);
        this.angle = 0;
        this.cargo = 0;
        this.alive = true;
        this.respawnTimer = 0;
        this.kills = 0;
        this.score = 0;
        this.thrustIntent = 0;
        this.targetAngle = 0;
        this.firing = false;
        this.mining = false;
        this.weaponCooldowns = new Map();
        this.lastHitFlashMs = 0;
        this.faction = cfg.faction;
        this.name = cfg.name;
        this.position = cfg.position.clone();
        this.recipe = cfg.recipe;
        this.blueprint = instantiateBlueprint(cfg.recipe);
        this.stats = computeAggregateStats(this.blueprint);
        this.shield = this.stats.maxShield;
        this.energy = this.stats.maxEnergy;
    }
    /** Swaps the ship to a different blueprint template (used by the evolution system). Keeps current cargo/energy ratio. */
    evolveTo(recipe) {
        this.recipe = recipe;
        const prevMaxEnergy = this.stats.maxEnergy;
        const energyRatio = prevMaxEnergy > 0 ? this.energy / prevMaxEnergy : 1;
        this.blueprint = instantiateBlueprint(recipe);
        this.stats = computeAggregateStats(this.blueprint);
        this.shield = this.stats.maxShield;
        this.energy = this.stats.maxEnergy * energyRatio;
        this.weaponCooldowns.clear();
    }
    get cargoMassPenalty() {
        if (this.stats.cargoCapacity <= 0)
            return 1;
        const fillRatio = clamp(this.cargo / this.stats.cargoCapacity, 0, 1);
        return 1 - fillRatio * 0.35;
    }
    /** 0..1 fraction of total block HP remaining — used for AI decisions and HUD "integrity" display. */
    hullRatio() {
        let hp = 0;
        let maxHp = 0;
        for (const b of this.blueprint) {
            maxHp += getBlockDef(b.blockId).maxHp;
            hp += Math.max(0, b.hp);
        }
        return maxHp > 0 ? hp / maxHp : 0;
    }
    /** Approximate world-space collision radius, derived from how far the farthest block sits from the Core. Recomputed on demand since it changes as blocks are lost. */
    approxRadius() {
        let maxDist = 1;
        for (const b of this.blueprint) {
            if (b.hp <= 0)
                continue;
            const d = Math.hypot(b.gx, b.gy);
            if (d > maxDist)
                maxDist = d;
        }
        return maxDist * GRID_CELL_SIZE + GRID_CELL_SIZE * 0.6;
    }
    canFireMount(mount) {
        const cd = this.weaponCooldowns.get(mount.instanceId) ?? 0;
        return cd <= 0 && this.energy >= mount.energyCost;
    }
    consumeFireCost(mount) {
        this.energy = Math.max(0, this.energy - mount.energyCost);
        this.weaponCooldowns.set(mount.instanceId, mount.cooldownMs);
    }
    /**
     * Resolves damage landing at a world-space point: shield absorbs first,
     * then the specific block nearest that point takes the rest (reduced by
     * its own armor). If that kills the block, connectivity is re-checked —
     * anything left dangling off the Core is destroyed too, physically
     * breaking the ship apart rather than the whole ship losing one shared
     * HP bar. Returns the blocks that were destroyed this hit (including
     * cascaded disconnections), so the caller can spawn debris for them.
     */
    applyBlockDamage(worldPoint, rawDamage, nowMs) {
        let remaining = rawDamage;
        if (this.shield > 0) {
            const absorbed = Math.min(this.shield, remaining);
            this.shield -= absorbed;
            remaining -= absorbed;
        }
        this.lastHitFlashMs = nowMs;
        if (remaining <= 0)
            return [];
        const target = this.findNearestBlock(worldPoint);
        if (!target)
            return [];
        const def = getBlockDef(target.blockId);
        const applied = remaining * (1 - def.armor);
        target.hp -= applied;
        const destroyedNow = [];
        if (target.hp <= 0) {
            target.hp = 0;
            destroyedNow.push({ ...target });
        }
        const { alive, detached } = pruneDisconnected(this.blueprint);
        for (const d of detached)
            destroyedNow.push({ ...d, hp: 0 });
        this.blueprint = alive;
        this.stats = computeAggregateStats(this.blueprint);
        if (!hasCore(this.blueprint)) {
            this.alive = false;
            this.respawnTimer = 3;
        }
        return destroyedNow;
    }
    findNearestBlock(worldPoint) {
        // Transform the world hit point into ship-local grid space.
        const rel = worldPoint.sub(this.position);
        const localAngle = rel.angle() - this.angle;
        const localLen = rel.length();
        const local = Vector2.fromAngle(localAngle, localLen);
        const cellX = local.x / GRID_CELL_SIZE;
        const cellY = local.y / GRID_CELL_SIZE;
        let best = null;
        let bestDist = Infinity;
        for (const b of this.blueprint) {
            if (b.hp <= 0)
                continue;
            const d = Math.hypot(b.gx - cellX, b.gy - cellY);
            if (d < bestDist) {
                bestDist = d;
                best = b;
            }
        }
        return best;
    }
    recentlyHit(nowMs, windowMs = 250) {
        return nowMs - this.lastHitFlashMs < windowMs;
    }
    update(dt) {
        if (!this.alive) {
            this.respawnTimer -= dt;
            return;
        }
        const diff = angleDiff(this.angle, this.targetAngle);
        const maxTurn = this.stats.turnRate * dt;
        this.angle += clamp(diff, -maxTurn, maxTurn);
        const cargoFactor = this.cargoMassPenalty;
        if (this.thrustIntent !== 0) {
            const accel = Vector2.fromAngle(this.angle, this.stats.thrust * this.thrustIntent * cargoFactor);
            this.velocity = this.velocity.add(accel.scale(dt));
        }
        const drag = 0.9;
        this.velocity = this.velocity.scale(Math.pow(drag, dt * 60));
        const maxSpeed = this.stats.topSpeed * cargoFactor;
        const speed = this.velocity.length();
        if (speed > maxSpeed) {
            this.velocity = this.velocity.normalize().scale(maxSpeed);
        }
        this.position = this.position.add(this.velocity.scale(dt));
        for (const [id, ms] of this.weaponCooldowns) {
            if (ms > 0)
                this.weaponCooldowns.set(id, ms - dt * 1000);
        }
        if (this.shield < this.stats.maxShield && this.energy > 0) {
            this.shield = Math.min(this.stats.maxShield, this.shield + this.stats.shieldRegenPerSec * dt);
            this.energy = Math.max(0, this.energy - this.stats.shieldEnergyDrainPerSec * dt);
        }
        if (this.stats.repairPerSec > 0 && this.energy > 0) {
            this.repairMostDamagedBlock(this.stats.repairPerSec * dt);
            this.energy = Math.max(0, this.energy - this.stats.repairEnergyCostPerSec * dt);
        }
        this.energy = Math.min(this.stats.maxEnergy, this.energy + this.stats.energyRegenPerSec * dt);
    }
    repairMostDamagedBlock(amount) {
        let worst = null;
        let worstRatio = 1;
        for (const b of this.blueprint) {
            const def = getBlockDef(b.blockId);
            const ratio = b.hp / def.maxHp;
            if (ratio < worstRatio) {
                worstRatio = ratio;
                worst = b;
            }
        }
        if (worst) {
            const def = getBlockDef(worst.blockId);
            worst.hp = Math.min(def.maxHp, worst.hp + amount);
        }
    }
    respawn(at) {
        this.position = at.clone();
        this.velocity = new Vector2(0, 0);
        this.blueprint = instantiateBlueprint(this.recipe);
        this.stats = computeAggregateStats(this.blueprint);
        this.shield = this.stats.maxShield;
        this.energy = this.stats.maxEnergy;
        this.weaponCooldowns.clear();
        this.alive = true;
    }
}
//# sourceMappingURL=Ship.js.map