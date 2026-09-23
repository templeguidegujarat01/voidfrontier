export enum BlockCategory {
  Core = 'Core',
  StructureLight = 'StructureLight',
  StructureReinforced = 'StructureReinforced',
  ArmorLight = 'ArmorLight',
  ArmorHeavy = 'ArmorHeavy',
  Thruster = 'Thruster',
  Drill = 'Drill',
  Laser = 'Laser',
  Launcher = 'Launcher',
  Magnet = 'Magnet',
  Generator = 'Generator',
  Shield = 'Shield',
  Radar = 'Radar',
  Cargo = 'Cargo',
  Repair = 'Repair',
  Stabilizer = 'Stabilizer',
  Cooling = 'Cooling'
}

/**
 * A block's static definition — its type-level stats. An actual placed
 * block on a ship (PlacedBlock) references one of these by id and adds
 * position + current HP.
 */
export interface BlockDefinition {
  id: string;
  name: string;
  category: BlockCategory;
  description: string;

  mass: number;
  maxHp: number;
  /** Flat damage reduction applied to any hit landing on this specific block, 0..1. */
  armor: number;
  /** Economic value — feeds the score/value system and evolution thresholds. */
  cost: number;

  // Propulsion
  thrust?: number;
  turnRateBonus?: number;

  // Energy
  energyGen?: number;
  energyCapacity?: number;

  // Weapons (Laser = continuous-cooldown beam, Launcher = slower heavy projectile)
  weaponDamage?: number;
  weaponCooldownMs?: number;
  weaponEnergyCost?: number;
  weaponRange?: number;
  weaponProjectileSpeed?: number;

  // Mining
  miningRatePerSec?: number;
  miningEnergyCostPerSec?: number;

  // Collection
  magnetRange?: number;

  // Shield
  shieldCapacity?: number;
  shieldRegenPerSec?: number;
  shieldEnergyDrainPerSec?: number;

  // Sensors / cargo / support
  radarRange?: number;
  cargoCapacity?: number;
  repairPerSec?: number;
  repairEnergyCostPerSec?: number;
  coolingCooldownReduction?: number; // 0..1, fraction shaved off weapon cooldowns
}

/** A single block instance placed on a specific ship, at a grid cell relative to its Core (0,0). */
export interface PlacedBlock {
  instanceId: string;
  blockId: string; // BlockDefinition.id
  gx: number;
  gy: number;
  hp: number;
}

export type ShipBlueprint = PlacedBlock[];

export const GRID_CELL_SIZE = 18; // world units per grid cell, used for placement + hit-testing
