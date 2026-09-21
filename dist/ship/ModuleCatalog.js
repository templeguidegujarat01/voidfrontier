import { ModuleCategory } from './ModuleTypes.js';
/**
 * All modules currently craftable/equippable. This is intentionally the
 * single source of truth for module balance — extend this file (not
 * scattered constants) when adding new tiers or categories later.
 */
export const MODULE_CATALOG = [
    // --- Core Frames --------------------------------------------------
    {
        id: 'core.wren',
        name: 'Wren-Class Frame',
        category: ModuleCategory.CoreFrame,
        tier: 1,
        description: 'Light, nimble hull. Small mass budget, tight turn radius.',
        mass: 40,
        hullBonus: 60
    },
    {
        id: 'core.harrow',
        name: 'Harrow-Class Frame',
        category: ModuleCategory.CoreFrame,
        tier: 2,
        description: 'Balanced mid-size hull with room for heavier modules.',
        mass: 70,
        hullBonus: 110
    },
    // --- Drives (engines) ----------------------------------------------
    {
        id: 'drive.skiff',
        name: 'Skiff Drive',
        category: ModuleCategory.Drive,
        tier: 1,
        description: 'Efficient low-power thruster. Low top speed, cheap on energy.',
        mass: 8,
        thrust: 220,
        topSpeedBonus: 140,
        turnRateBonus: 0.2
    },
    {
        id: 'drive.stormjet',
        name: 'Stormjet Drive',
        category: ModuleCategory.Drive,
        tier: 2,
        description: 'High-thrust drive. Fast, but heavier and energy-hungry.',
        mass: 16,
        thrust: 380,
        topSpeedBonus: 230,
        turnRateBonus: 0.15
    },
    // --- Emitters (weapons) ---------------------------------------------
    {
        id: 'emitter.pulse',
        name: 'Pulse Emitter',
        category: ModuleCategory.Emitter,
        tier: 1,
        description: 'Fast-firing light energy weapon. Low damage per hit.',
        mass: 10,
        weaponDamage: 8,
        weaponCooldownMs: 260,
        weaponEnergyCost: 4,
        weaponRange: 520,
        weaponProjectileSpeed: 620
    },
    {
        id: 'emitter.lance',
        name: 'Lance Emitter',
        category: ModuleCategory.Emitter,
        tier: 2,
        description: 'Slower, harder-hitting beam weapon. Heavier energy draw.',
        mass: 18,
        weaponDamage: 20,
        weaponCooldownMs: 620,
        weaponEnergyCost: 11,
        weaponRange: 640,
        weaponProjectileSpeed: 760
    },
    // --- Wardplates (shields) -------------------------------------------
    {
        id: 'ward.veil',
        name: 'Veil Wardplate',
        category: ModuleCategory.Wardplate,
        tier: 1,
        description: 'Light regenerating shield buffer.',
        mass: 9,
        shieldCapacity: 40,
        shieldRegenPerSec: 3,
        shieldEnergyDrainPerSec: 1.2
    },
    {
        id: 'ward.bastion',
        name: 'Bastion Wardplate',
        category: ModuleCategory.Wardplate,
        tier: 2,
        description: 'Heavy shield buffer with strong regen, costly to sustain.',
        mass: 20,
        shieldCapacity: 90,
        shieldRegenPerSec: 5,
        shieldEnergyDrainPerSec: 2.6
    },
    // --- Hullweave (armor) ------------------------------------------------
    {
        id: 'weave.plate',
        name: 'Plate Hullweave',
        category: ModuleCategory.Hullweave,
        tier: 1,
        description: 'Basic plating. Flat damage reduction, pure mass cost.',
        mass: 14,
        hullBonus: 30,
        damageReduction: 0.08
    },
    {
        id: 'weave.bulwark',
        name: 'Bulwark Hullweave',
        category: ModuleCategory.Hullweave,
        tier: 2,
        description: 'Reinforced plating. Strong reduction, heavier.',
        mass: 28,
        hullBonus: 65,
        damageReduction: 0.16
    },
    // --- Reactors (energy) -------------------------------------------------
    {
        id: 'reactor.ember',
        name: 'Ember Reactor',
        category: ModuleCategory.Reactor,
        tier: 1,
        description: 'Small reactor. Modest regen and buffer.',
        mass: 10,
        energyGen: 14,
        energyCapacity: 90
    },
    {
        id: 'reactor.forge',
        name: 'Forge Reactor',
        category: ModuleCategory.Reactor,
        tier: 2,
        description: 'Larger reactor for energy-hungry builds.',
        mass: 20,
        energyGen: 24,
        energyCapacity: 150
    },
    // --- Holds (cargo) -------------------------------------------------------
    {
        id: 'hold.satchel',
        name: 'Satchel Hold',
        category: ModuleCategory.Hold,
        tier: 1,
        description: 'Compact cargo bay.',
        mass: 6,
        cargoCapacity: 60
    },
    {
        id: 'hold.vault',
        name: 'Vault Hold',
        category: ModuleCategory.Hold,
        tier: 2,
        description: 'Large cargo bay. Heavier when full (handled at runtime).',
        mass: 12,
        cargoCapacity: 140
    },
    // --- Drills (mining) -------------------------------------------------------
    {
        id: 'drill.pick',
        name: 'Pick Drill',
        category: ModuleCategory.Drill,
        tier: 1,
        description: 'Basic extraction laser.',
        mass: 8,
        miningRatePerSec: 6,
        miningEnergyCostPerSec: 3
    },
    {
        id: 'drill.auger',
        name: 'Auger Drill',
        category: ModuleCategory.Drill,
        tier: 2,
        description: 'Faster extraction, higher energy draw.',
        mass: 15,
        miningRatePerSec: 13,
        miningEnergyCostPerSec: 6
    },
    // --- Array (radar) -------------------------------------------------------
    {
        id: 'array.wide',
        name: 'Wide Array',
        category: ModuleCategory.Array,
        tier: 1,
        description: 'Standard detection range.',
        mass: 5,
        radarRange: 900
    },
    {
        id: 'array.deep',
        name: 'Deep Array',
        category: ModuleCategory.Array,
        tier: 2,
        description: 'Extended detection range.',
        mass: 10,
        radarRange: 1400
    },
    // --- Utility Rigs -------------------------------------------------------
    {
        id: 'utility.mender',
        name: 'Mender Rig',
        category: ModuleCategory.UtilityRig,
        tier: 1,
        description: 'Slow passive hull self-repair.',
        mass: 9,
        repairPerSec: 1.5,
        utilityEnergyCostPerSec: 2
    },
    {
        id: 'utility.none',
        name: 'No Utility Rig',
        category: ModuleCategory.UtilityRig,
        tier: 1,
        description: 'Slot left empty — no mass, no effect.',
        mass: 0
    }
];
export function getModule(id) {
    const found = MODULE_CATALOG.find((m) => m.id === id);
    if (!found)
        throw new Error(`Unknown module id: ${id}`);
    return found;
}
export function modulesInCategory(category) {
    return MODULE_CATALOG.filter((m) => m.category === category);
}
//# sourceMappingURL=ModuleCatalog.js.map