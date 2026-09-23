import { Screen } from '../app/Screen.js';
import { TIER1_TEMPLATES, TIER2_TEMPLATES, BlueprintTemplate } from '../ship/StarterBlueprints.js';
import { computeAggregateStats, instantiateBlueprint } from '../ship/ShipBlueprint.js';
import { getBlockDef, blockColor } from '../ship/BlockCatalog.js';

export interface ShipyardOptions {
  onBack: () => void;
}

export class ShipyardScreen implements Screen {
  private root: HTMLElement | null = null;

  constructor(private readonly opts: ShipyardOptions) {}

  mount(root: HTMLElement): void {
    this.root = root;
    root.innerHTML = `
      <div class="builder-screen">
        <div class="menu-backdrop"></div>
        <div class="shipyard-layout">
          <div class="panel-title standalone-title">SHIPYARD — TIER 1 STARTERS</div>
          <div class="shipyard-grid" id="tier1-grid"></div>

          <div class="panel-title standalone-title">SHIPYARD — TIER 2 EVOLUTIONS</div>
          <p class="fineprint">Unlocked in-match by earning score — shown here for reference.</p>
          <div class="shipyard-grid" id="tier2-grid"></div>

          <p class="fineprint" style="margin-top:18px;">
            This is a reference gallery, not a block editor yet — a full drag-and-place
            grid builder (placing/rotating individual blocks yourself) is a planned next
            step, not implemented in this build.
          </p>

          <button id="shipyard-back" class="menu-btn wide">Back to Menu</button>
        </div>
      </div>
    `;

    this.renderGrid('#tier1-grid', TIER1_TEMPLATES);
    this.renderGrid('#tier2-grid', TIER2_TEMPLATES);

    root.querySelector('#shipyard-back')?.addEventListener('click', () => this.opts.onBack());
  }

  private renderGrid(selector: string, templates: BlueprintTemplate[]): void {
    const container = this.root?.querySelector(selector);
    if (!container) return;
    container.innerHTML = templates.map((t) => this.renderCard(t)).join('');
  }

  private renderCard(t: BlueprintTemplate): string {
    const blueprint = instantiateBlueprint(t.blocks);
    const stats = computeAggregateStats(blueprint);

    const xs = t.blocks.map((b) => b.gx);
    const ys = t.blocks.map((b) => b.gy);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const cell = 16;
    const width = (maxX - minX + 1) * cell;
    const height = (maxY - minY + 1) * cell;

    const blockDivs = t.blocks
      .map((b) => {
        const def = getBlockDef(b.blockId);
        const left = (b.gx - minX) * cell;
        const top = (b.gy - minY) * cell;
        return `<div class="ship-preview-block" style="left:${left}px; top:${top}px; width:${cell - 2}px; height:${cell - 2}px; background:${blockColor(def.category)};" title="${def.name}"></div>`;
      })
      .join('');

    return `
      <div class="shipyard-card">
        <div class="ship-preview" style="width:${Math.max(width, 60)}px; height:${Math.max(height, 60)}px;">
          ${blockDivs}
        </div>
        <div class="shipyard-card-name">${t.name}</div>
        <div class="shipyard-card-desc">${t.description}</div>
        <div class="shipyard-card-stats">
          <span>Blocks: ${stats.blockCount}</span>
          <span>Mass: ${stats.mass.toFixed(0)}</span>
          <span>Weapons: ${stats.weaponMounts.length}</span>
          <span>Cargo: ${stats.cargoCapacity.toFixed(0)}</span>
          <span>Mining: ${stats.miningRatePerSec.toFixed(1)}/s</span>
          <span>Value: ${stats.totalValue}</span>
        </div>
      </div>`;
  }

  unmount(): void {
    this.root = null;
  }
}
