import { getModule } from './ModuleCatalog.js';
const BASE_TURN_RATE = 2.0; // rad/sec before Drive bonus
const BASE_TOP_SPEED = 60;
/**
 * Aggregates a full module loadout into final ship stats. This is the
 * single function that makes "installed modules change ship stats" true —
 * swapping any module id in the loadout and recomputing is the entire
 * ship-customization loop for this first playable build.
 */
export function computeShipStats(loadout) {
    const core = getModule(loadout.coreFrameId);
    const drive = getModule(loadout.driveId);
    const emitter = getModule(loadout.emitterId);
    const ward = getModule(loadout.wardplateId);
    const weave = getModule(loadout.hullweaveId);
    const reactor = getModule(loadout.reactorId);
    const hold = getModule(loadout.holdId);
    const drill = getModule(loadout.drillId);
    const array = getModule(loadout.arrayId);
    const utility = getModule(loadout.utilityRigId);
    const mass = core.mass + drive.mass + emitter.mass + ward.mass + weave.mass +
        reactor.mass + hold.mass + drill.mass + array.mass + utility.mass;
    // Heavier ships accelerate/turn slower: mass acts as a drag divisor.
    const massFactor = 100 / (100 + mass);
    return {
        mass,
        thrust: (drive.thrust ?? 0) * massFactor,
        topSpeed: (BASE_TOP_SPEED + (drive.topSpeedBonus ?? 0) + (core.topSpeedBonus ?? 0) + (utility.topSpeedBonus ?? 0)) * massFactor,
        turnRate: (BASE_TURN_RATE + (drive.turnRateBonus ?? 0) + (core.turnRateBonus ?? 0)) * massFactor,
        maxHull: (core.hullBonus ?? 0) + (weave.hullBonus ?? 0),
        maxShield: (ward.shieldCapacity ?? 0) + (utility.shieldCapacity ?? 0),
        shieldRegenPerSec: (ward.shieldRegenPerSec ?? 0) + (utility.shieldRegenPerSec ?? 0),
        shieldEnergyDrainPerSec: ward.shieldEnergyDrainPerSec ?? 0,
        damageReduction: weave.damageReduction ?? 0,
        maxEnergy: (reactor.energyCapacity ?? 0) + (core.energyCapacity ?? 0),
        energyRegenPerSec: reactor.energyGen ?? 0,
        weaponDamage: (emitter.weaponDamage ?? 0) + (utility.weaponDamage ?? 0),
        weaponCooldownMs: emitter.weaponCooldownMs ?? 500,
        weaponEnergyCost: emitter.weaponEnergyCost ?? 0,
        weaponRange: emitter.weaponRange ?? 400,
        weaponProjectileSpeed: emitter.weaponProjectileSpeed ?? 500,
        cargoCapacity: (hold.cargoCapacity ?? 0) + (core.cargoCapacity ?? 0) + (utility.cargoCapacity ?? 0),
        miningRatePerSec: (drill.miningRatePerSec ?? 0) + (core.miningRatePerSec ?? 0),
        miningEnergyCostPerSec: drill.miningEnergyCostPerSec ?? 0,
        radarRange: (array.radarRange ?? 700) + (core.radarRange ?? 0),
        repairPerSec: utility.repairPerSec ?? 0,
        utilityEnergyCostPerSec: utility.utilityEnergyCostPerSec ?? 0
    };
}
export const DEFAULT_PLAYER_LOADOUT = {
    coreFrameId: 'core.wren',
    driveId: 'drive.skiff',
    emitterId: 'emitter.pulse',
    wardplateId: 'ward.veil',
    hullweaveId: 'weave.plate',
    reactorId: 'reactor.ember',
    holdId: 'hold.satchel',
    drillId: 'drill.pick',
    arrayId: 'array.wide',
    utilityRigId: 'utility.mender'
};
export const DEFAULT_BOT_LOADOUT = {
    coreFrameId: 'core.wren',
    driveId: 'drive.skiff',
    emitterId: 'emitter.pulse',
    wardplateId: 'ward.veil',
    hullweaveId: 'weave.plate',
    reactorId: 'reactor.ember',
    holdId: 'hold.satchel',
    drillId: 'drill.pick',
    arrayId: 'array.wide',
    utilityRigId: 'utility.none'
};
//# sourceMappingURL=ShipStats.js.map