import { ShipBlueprint } from './BlockTypes.js';
import { instantiateBlueprint } from './ShipBlueprint.js';

export interface BlueprintTemplate {
  id: string;
  name: string;
  tier: number;
  description: string;
  blocks: { blockId: string; gx: number; gy: number }[];
}

// --- Tier 1: starter ships (chosen in the Lobby) ---------------------------

export const TIER1_TEMPLATES: BlueprintTemplate[] = [
  {
    id: 'starter.wisp',
    name: 'Wisp',
    tier: 1,
    description: 'Balanced starter — one drill, one laser, decent mobility.',
    blocks: [
      { blockId: 'block.core', gx: 0, gy: 0 },
      { blockId: 'block.structLight', gx: -1, gy: 0 },
      { blockId: 'block.structLight', gx: 1, gy: 0 },
      { blockId: 'block.thruster', gx: -1, gy: 1 },
      { blockId: 'block.laser', gx: 1, gy: 1 },
      { blockId: 'block.drill', gx: 0, gy: -1 },
      { blockId: 'block.cargo', gx: 0, gy: 1 },
      { blockId: 'block.generator', gx: 2, gy: 0 }
    ]
  },
  {
    id: 'starter.grub',
    name: 'Grub',
    tier: 1,
    description: 'Mining-leaning starter — twin drills, extra cargo, slower.',
    blocks: [
      { blockId: 'block.core', gx: 0, gy: 0 },
      { blockId: 'block.structLight', gx: -1, gy: 0 },
      { blockId: 'block.structLight', gx: 1, gy: 0 },
      { blockId: 'block.drill', gx: 0, gy: -1 },
      { blockId: 'block.drill', gx: 0, gy: -2 },
      { blockId: 'block.cargo', gx: -1, gy: -1 },
      { blockId: 'block.cargo', gx: 1, gy: -1 },
      { blockId: 'block.thruster', gx: 0, gy: 1 },
      { blockId: 'block.generator', gx: -2, gy: 0 }
    ]
  },
  {
    id: 'starter.fang',
    name: 'Fang',
    tier: 1,
    description: 'Combat-leaning starter — twin lasers, light frame, no drill.',
    blocks: [
      { blockId: 'block.core', gx: 0, gy: 0 },
      { blockId: 'block.structLight', gx: -1, gy: 0 },
      { blockId: 'block.structLight', gx: 1, gy: 0 },
      { blockId: 'block.laser', gx: -1, gy: -1 },
      { blockId: 'block.laser', gx: 1, gy: -1 },
      { blockId: 'block.thruster', gx: 0, gy: 1 },
      { blockId: 'block.stabilizer', gx: 0, gy: -1 },
      { blockId: 'block.generator', gx: -2, gy: 0 }
    ]
  }
];

// --- Tier 2: evolution branches (offered in-match at a score threshold) ---

export const TIER2_TEMPLATES: BlueprintTemplate[] = [
  {
    id: 'evo.striker',
    name: 'Striker',
    tier: 2,
    description: 'Aggressive triple-thruster, twin-laser-plus-launcher combat evolution.',
    blocks: [
      { blockId: 'block.core', gx: 0, gy: 0 },
      { blockId: 'block.structReinforced', gx: -1, gy: 0 },
      { blockId: 'block.structReinforced', gx: 1, gy: 0 },
      { blockId: 'block.structLight', gx: 0, gy: 1 },
      { blockId: 'block.thruster', gx: 0, gy: 2 },
      { blockId: 'block.thruster', gx: -1, gy: 1 },
      { blockId: 'block.thruster', gx: 1, gy: 1 },
      { blockId: 'block.laser', gx: -1, gy: -1 },
      { blockId: 'block.laser', gx: 1, gy: -1 },
      { blockId: 'block.launcher', gx: 0, gy: -1 },
      { blockId: 'block.stabilizer', gx: -2, gy: 0 },
      { blockId: 'block.generator', gx: 2, gy: 0 },
      { blockId: 'block.cooling', gx: 0, gy: -2 }
    ]
  },
  {
    id: 'evo.miner',
    name: 'Miner',
    tier: 2,
    description: 'Triple-drill, triple-cargo extraction evolution with a magnet collector.',
    blocks: [
      { blockId: 'block.core', gx: 0, gy: 0 },
      { blockId: 'block.structReinforced', gx: -1, gy: 0 },
      { blockId: 'block.structReinforced', gx: 1, gy: 0 },
      { blockId: 'block.drill', gx: 0, gy: -1 },
      { blockId: 'block.drill', gx: 0, gy: -2 },
      { blockId: 'block.drill', gx: 0, gy: -3 },
      { blockId: 'block.cargo', gx: -1, gy: -1 },
      { blockId: 'block.cargo', gx: -1, gy: -2 },
      { blockId: 'block.cargo', gx: 1, gy: -1 },
      { blockId: 'block.magnet', gx: 1, gy: -2 },
      { blockId: 'block.generator', gx: -2, gy: 0 },
      { blockId: 'block.thruster', gx: 0, gy: 1 },
      { blockId: 'block.thruster', gx: 2, gy: 0 }
    ]
  },
  {
    id: 'evo.guardian',
    name: 'Guardian',
    tier: 2,
    description: 'Heavily armored, shielded tank evolution. Slow, hard to kill.',
    blocks: [
      { blockId: 'block.core', gx: 0, gy: 0 },
      { blockId: 'block.structReinforced', gx: -1, gy: 0 },
      { blockId: 'block.structReinforced', gx: 1, gy: 0 },
      { blockId: 'block.armorHeavy', gx: -2, gy: 0 },
      { blockId: 'block.armorHeavy', gx: 2, gy: 0 },
      { blockId: 'block.armorHeavy', gx: 0, gy: -1 },
      { blockId: 'block.armorHeavy', gx: 0, gy: 1 },
      { blockId: 'block.shield', gx: -1, gy: -1 },
      { blockId: 'block.shield', gx: 1, gy: -1 },
      { blockId: 'block.laser', gx: 0, gy: -2 },
      { blockId: 'block.thruster', gx: 0, gy: 2 },
      { blockId: 'block.generator', gx: -1, gy: 1 }
    ]
  }
];

export function findTemplate(id: string): BlueprintTemplate | undefined {
  return [...TIER1_TEMPLATES, ...TIER2_TEMPLATES].find((t) => t.id === id);
}

export function buildBlueprint(templateId: string): ShipBlueprint {
  const template = findTemplate(templateId);
  if (!template) throw new Error(`Unknown blueprint template: ${templateId}`);
  return instantiateBlueprint(template.blocks);
}
