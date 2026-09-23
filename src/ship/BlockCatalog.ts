import { BlockCategory, BlockDefinition } from './BlockTypes.js';

export const BLOCK_CATALOG: BlockDefinition[] = [
  {
    id: 'block.core',
    name: 'Structural Core',
    category: BlockCategory.Core,
    description: 'The heart of the ship. Destroying it destroys the ship — everything else is expendable.',
    mass: 20,
    maxHp: 60,
    armor: 0.1,
    cost: 50
  },
  {
    id: 'block.structLight',
    name: 'Light Frame',
    category: BlockCategory.StructureLight,
    description: 'Cheap, low-mass connective structure. Weak on its own.',
    mass: 3,
    maxHp: 15,
    armor: 0,
    cost: 5
  },
  {
    id: 'block.structReinforced',
    name: 'Reinforced Frame',
    category: BlockCategory.StructureReinforced,
    description: 'Heavier connective structure with real durability.',
    mass: 6,
    maxHp: 35,
    armor: 0.05,
    cost: 12
  },
  {
    id: 'block.armorLight',
    name: 'Light Armor Plate',
    category: BlockCategory.ArmorLight,
    description: 'Modest damage reduction for modest mass.',
    mass: 5,
    maxHp: 25,
    armor: 0.15,
    cost: 10
  },
  {
    id: 'block.armorHeavy',
    name: 'Heavy Armor Plate',
    category: BlockCategory.ArmorHeavy,
    description: 'Huge durability and damage reduction — heavy and slows the ship.',
    mass: 14,
    maxHp: 70,
    armor: 0.3,
    cost: 26
  },
  {
    id: 'block.thruster',
    name: 'Thruster',
    category: BlockCategory.Thruster,
    description: 'Adds acceleration. Draws energy while firing; more thrusters mean more mass to push, too.',
    mass: 7,
    maxHp: 18,
    armor: 0,
    cost: 14,
    thrust: 70,
    turnRateBonus: 0.08
  },
  {
    id: 'block.drill',
    name: 'Mining Drill',
    category: BlockCategory.Drill,
    description: 'Extremely strong close-range extraction — but only works at very short range.',
    mass: 8,
    maxHp: 16,
    armor: 0,
    cost: 16,
    miningRatePerSec: 7,
    miningEnergyCostPerSec: 3
  },
  {
    id: 'block.laser',
    name: 'Laser Emitter',
    category: BlockCategory.Laser,
    description: 'Fast-firing continuous-ish beam. Directional — has to face the target.',
    mass: 6,
    maxHp: 14,
    armor: 0,
    cost: 20,
    weaponDamage: 6,
    weaponCooldownMs: 220,
    weaponEnergyCost: 3,
    weaponRange: 480,
    weaponProjectileSpeed: 700
  },
  {
    id: 'block.launcher',
    name: 'Missile Launcher',
    category: BlockCategory.Launcher,
    description: 'Slow-firing heavy projectile. Big damage per hit.',
    mass: 10,
    maxHp: 16,
    armor: 0,
    cost: 30,
    weaponDamage: 22,
    weaponCooldownMs: 900,
    weaponEnergyCost: 10,
    weaponRange: 560,
    weaponProjectileSpeed: 420
  },
  {
    id: 'block.magnet',
    name: 'Magnetic Collector',
    category: BlockCategory.Magnet,
    description: 'Pulls in nearby debris and loose resources automatically. Limited combat utility.',
    mass: 4,
    maxHp: 12,
    armor: 0,
    cost: 12,
    magnetRange: 160
  },
  {
    id: 'block.generator',
    name: 'Energy Generator',
    category: BlockCategory.Generator,
    description: 'Passive energy regeneration and buffer capacity for the whole ship.',
    mass: 7,
    maxHp: 16,
    armor: 0,
    cost: 18,
    energyGen: 9,
    energyCapacity: 35
  },
  {
    id: 'block.shield',
    name: 'Shield Generator',
    category: BlockCategory.Shield,
    description: 'Regenerating energy buffer that absorbs damage before it reaches any block.',
    mass: 8,
    maxHp: 14,
    armor: 0,
    cost: 24,
    shieldCapacity: 25,
    shieldRegenPerSec: 2,
    shieldEnergyDrainPerSec: 1
  },
  {
    id: 'block.radar',
    name: 'Radar Array',
    category: BlockCategory.Radar,
    description: 'Extends detection range for other ships and hazards.',
    mass: 3,
    maxHp: 10,
    armor: 0,
    cost: 10,
    radarRange: 260
  },
  {
    id: 'block.cargo',
    name: 'Cargo Pod',
    category: BlockCategory.Cargo,
    description: 'Extra resource storage. A full pod is heavier than an empty one.',
    mass: 4,
    maxHp: 14,
    armor: 0,
    cost: 8,
    cargoCapacity: 20
  },
  {
    id: 'block.repair',
    name: 'Repair Node',
    category: BlockCategory.Repair,
    description: 'Slowly repairs the most-damaged nearby block over time, at an energy cost.',
    mass: 6,
    maxHp: 12,
    armor: 0,
    cost: 22,
    repairPerSec: 1.2,
    repairEnergyCostPerSec: 2
  },
  {
    id: 'block.stabilizer',
    name: 'Stabilizer',
    category: BlockCategory.Stabilizer,
    description: 'Improves turn rate without adding much mass.',
    mass: 3,
    maxHp: 12,
    armor: 0,
    cost: 12,
    turnRateBonus: 0.15
  },
  {
    id: 'block.cooling',
    name: 'Cooling Vent',
    category: BlockCategory.Cooling,
    description: 'Reduces weapon cooldowns across the ship.',
    mass: 4,
    maxHp: 12,
    armor: 0,
    cost: 16,
    coolingCooldownReduction: 0.08
  }
];

export function getBlockDef(id: string): BlockDefinition {
  const found = BLOCK_CATALOG.find((b) => b.id === id);
  if (!found) throw new Error(`Unknown block id: ${id}`);
  return found;
}

export function blockColor(category: BlockCategory): string {
  switch (category) {
    case BlockCategory.Core: return '#e8fffb';
    case BlockCategory.StructureLight: return '#6b7280';
    case BlockCategory.StructureReinforced: return '#8891a3';
    case BlockCategory.ArmorLight: return '#94a3b8';
    case BlockCategory.ArmorHeavy: return '#cbd5e1';
    case BlockCategory.Thruster: return '#ffb059';
    case BlockCategory.Drill: return '#ff8a5c';
    case BlockCategory.Laser: return '#5eead4';
    case BlockCategory.Launcher: return '#f87171';
    case BlockCategory.Magnet: return '#c4b5fd';
    case BlockCategory.Generator: return '#facc15';
    case BlockCategory.Shield: return '#67e8f9';
    case BlockCategory.Radar: return '#a78bfa';
    case BlockCategory.Cargo: return '#a3a3a3';
    case BlockCategory.Repair: return '#4ade80';
    case BlockCategory.Stabilizer: return '#fda4af';
    case BlockCategory.Cooling: return '#93c5fd';
    default: return '#ffffff';
  }
}
