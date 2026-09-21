/**
 * The nine equippable module categories (matches the design blueprint's
 * ship-system spec: engines, weapons, shields, armor, energy, cargo,
 * mining, radar, utilities) plus the Core Frame every ship is built on.
 */
export enum ModuleCategory {
  CoreFrame = 'CoreFrame',
  Drive = 'Drive', // engines
  Emitter = 'Emitter', // weapons
  Wardplate = 'Wardplate', // shields
  Hullweave = 'Hullweave', // armor
  Reactor = 'Reactor', // energy
  Hold = 'Hold', // cargo
  Drill = 'Drill', // mining
  Array = 'Array', // radar
  UtilityRig = 'UtilityRig' // utilities
}

/**
 * A module's raw contribution to ship stats. Every field is optional —
 * a module only fills in the fields relevant to its category. Aggregating
 * a full build's modules produces the ship's final ShipStats (see
 * ShipStats.ts). Trade-offs come from mass/energy cost scaling with power.
 */
export interface ModuleDefinition {
  id: string;
  name: string;
  category: ModuleCategory;
  tier: 1 | 2 | 3;
  description: string;

  /** Added to hull mass -> reduces acceleration/top speed/turn rate. */
  mass: number;
  /** Energy generated per second (Reactor only). */
  energyGen?: number;
  /** Extra max energy buffer (Cell-like effect, folded into Reactor tier here). */
  energyCapacity?: number;

  // Drive (engine)
  thrust?: number;
  topSpeedBonus?: number;
  turnRateBonus?: number;

  // Emitter (weapon)
  weaponDamage?: number;
  weaponCooldownMs?: number;
  weaponEnergyCost?: number;
  weaponRange?: number;
  weaponProjectileSpeed?: number;

  // Wardplate (shield)
  shieldCapacity?: number;
  shieldRegenPerSec?: number;
  shieldEnergyDrainPerSec?: number;

  // Hullweave (armor)
  hullBonus?: number;
  damageReduction?: number; // 0..1, fraction of post-shield damage absorbed

  // Hold (cargo)
  cargoCapacity?: number;

  // Drill (mining)
  miningRatePerSec?: number;
  miningEnergyCostPerSec?: number;

  // Array (radar)
  radarRange?: number;

  // UtilityRig
  repairPerSec?: number; // passive self-repair, drains energy
  utilityEnergyCostPerSec?: number;
}

export interface ShipLoadout {
  coreFrameId: string;
  driveId: string;
  emitterId: string;
  wardplateId: string;
  hullweaveId: string;
  reactorId: string;
  holdId: string;
  drillId: string;
  arrayId: string;
  utilityRigId: string;
}
