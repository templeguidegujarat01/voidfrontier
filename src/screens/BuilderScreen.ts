import { Screen } from '../app/Screen.js';
import { ModuleCategory, ShipLoadout } from '../ship/ModuleTypes.js';
import { modulesInCategory, getModule } from '../ship/ModuleCatalog.js';
import { computeShipStats, DEFAULT_PLAYER_LOADOUT } from '../ship/ShipStats.js';
import { LoadoutStore } from '../loadouts/LoadoutStore.js';

export interface BuilderOptions {
  onBack: () => void;
}

const CATEGORY_FIELDS: { key: keyof ShipLoadout; category: ModuleCategory; label: string }[] = [
  { key: 'coreFrameId', category: ModuleCategory.CoreFrame, label: 'Chassis (Core Frame)' },
  { key: 'driveId', category: ModuleCategory.Drive, label: 'Drive (Engine)' },
  { key: 'emitterId', category: ModuleCategory.Emitter, label: 'Emitter (Weapon)' },
  { key: 'wardplateId', category: ModuleCategory.Wardplate, label: 'Wardplate (Shield)' },
  { key: 'hullweaveId', category: ModuleCategory.Hullweave, label: 'Hullweave (Armor)' },
  { key: 'reactorId', category: ModuleCategory.Reactor, label: 'Reactor (Energy)' },
  { key: 'holdId', category: ModuleCategory.Hold, label: 'Hold (Cargo)' },
  { key: 'drillId', category: ModuleCategory.Drill, label: 'Drill (Mining)' },
  { key: 'arrayId', category: ModuleCategory.Array, label: 'Array (Radar)' },
  { key: 'utilityRigId', category: ModuleCategory.UtilityRig, label: 'Utility Rig' }
];

export class BuilderScreen implements Screen {
  private store = new LoadoutStore();
  private root: HTMLElement | null = null;
  private draft: ShipLoadout;
  private currentId: string | null = null;

  constructor(private readonly opts: BuilderOptions) {
    const first = this.store.list()[0];
    this.draft = first ? { ...first.loadout } : { ...DEFAULT_PLAYER_LOADOUT };
    this.currentId = first?.id ?? null;
  }

  mount(root: HTMLElement): void {
    this.root = root;
    root.innerHTML = `
      <div class="builder-screen">
        <div class="menu-backdrop"></div>
        <div class="builder-layout">
          <div class="panel builder-left">
            <div class="panel-title standalone-title">SAVED LOADOUTS</div>
            <div id="loadout-list" class="loadout-list"></div>
            <div class="builder-loadout-actions">
              <input id="loadout-name" class="text-input" placeholder="Loadout name" />
              <button id="save-loadout" class="menu-btn small">Save As New</button>
              <button id="update-loadout" class="menu-btn small">Update Current</button>
              <button id="duplicate-loadout" class="menu-btn small">Duplicate</button>
              <button id="delete-loadout" class="menu-btn small danger">Delete</button>
              <button id="reset-loadout" class="menu-btn small">Reset to Default</button>
            </div>
          </div>

          <div class="panel builder-middle">
            <div class="panel-title standalone-title">MODULE GRID</div>
            <div id="module-grid" class="builder-module-grid"></div>
          </div>

          <div class="panel builder-right">
            <div class="panel-title standalone-title">LIVE STATS</div>
            <div id="stats-panel" class="stats-panel"></div>
            <button id="builder-back" class="menu-btn wide">Save &amp; Return to Menu</button>
          </div>
        </div>
      </div>
    `;

    this.renderLoadoutList();
    this.renderModuleGrid();
    this.renderStats();

    root.querySelector('#save-loadout')?.addEventListener('click', () => {
      const nameInput = root.querySelector<HTMLInputElement>('#loadout-name');
      const name = nameInput?.value.trim() || `Build ${this.store.list().length + 1}`;
      const entry = this.store.save_(name, this.draft);
      this.currentId = entry.id;
      this.renderLoadoutList();
    });
    root.querySelector('#update-loadout')?.addEventListener('click', () => {
      if (!this.currentId) return;
      const current = this.store.get(this.currentId);
      this.store.update(this.currentId, current?.name ?? 'Build', this.draft);
      this.renderLoadoutList();
    });
    root.querySelector('#duplicate-loadout')?.addEventListener('click', () => {
      if (!this.currentId) return;
      const copy = this.store.duplicate(this.currentId);
      if (copy) {
        this.currentId = copy.id;
        this.draft = { ...copy.loadout };
        this.renderLoadoutList();
        this.renderModuleGrid();
        this.renderStats();
      }
    });
    root.querySelector('#delete-loadout')?.addEventListener('click', () => {
      if (!this.currentId) return;
      if (!confirm('Delete this loadout?')) return;
      this.store.remove(this.currentId);
      const first = this.store.list()[0];
      this.currentId = first?.id ?? null;
      this.draft = first ? { ...first.loadout } : { ...DEFAULT_PLAYER_LOADOUT };
      this.renderLoadoutList();
      this.renderModuleGrid();
      this.renderStats();
    });
    root.querySelector('#reset-loadout')?.addEventListener('click', () => {
      this.draft = { ...DEFAULT_PLAYER_LOADOUT };
      this.renderModuleGrid();
      this.renderStats();
    });
    root.querySelector('#builder-back')?.addEventListener('click', () => {
      if (this.currentId) {
        const current = this.store.get(this.currentId);
        this.store.update(this.currentId, current?.name ?? 'Build', this.draft);
      }
      this.opts.onBack();
    });
  }

  private renderLoadoutList(): void {
    const list = this.root?.querySelector('#loadout-list');
    if (!list) return;
    const loadouts = this.store.list();
    list.innerHTML = loadouts
      .map(
        (l) => `<div class="loadout-row ${l.id === this.currentId ? 'loadout-row-selected' : ''}" data-id="${l.id}">${escapeHtml(l.name)}</div>`
      )
      .join('');
    list.querySelectorAll<HTMLElement>('.loadout-row').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.dataset.id!;
        const entry = this.store.get(id);
        if (!entry) return;
        this.currentId = id;
        this.draft = { ...entry.loadout };
        this.renderLoadoutList();
        this.renderModuleGrid();
        this.renderStats();
      });
    });
  }

  private renderModuleGrid(): void {
    const grid = this.root?.querySelector('#module-grid');
    if (!grid) return;
    grid.innerHTML = CATEGORY_FIELDS.map((field) => {
      const options = modulesInCategory(field.category);
      const selectedId = this.draft[field.key];
      return `
        <div class="module-field">
          <label class="field-label">${field.label}</label>
          <select class="text-input module-select" data-key="${field.key}">
            ${options.map((m) => `<option value="${m.id}" ${m.id === selectedId ? 'selected' : ''}>${m.name} (T${m.tier})</option>`).join('')}
          </select>
          <p class="module-desc" id="desc-${field.key}">${getModule(selectedId).description}</p>
        </div>`;
    }).join('');

    grid.querySelectorAll<HTMLSelectElement>('.module-select').forEach((select) => {
      select.addEventListener('change', () => {
        const key = select.dataset.key as keyof ShipLoadout;
        this.draft[key] = select.value;
        const desc = this.root?.querySelector(`#desc-${key}`);
        if (desc) desc.textContent = getModule(select.value).description;
        this.renderStats();
      });
    });
  }

  private renderStats(): void {
    const panel = this.root?.querySelector('#stats-panel');
    if (!panel) return;
    const s = computeShipStats(this.draft);
    const rows: [string, string][] = [
      ['Mass', s.mass.toFixed(0)],
      ['Top Speed', s.topSpeed.toFixed(0) + ' u/s'],
      ['Acceleration (Thrust)', s.thrust.toFixed(0)],
      ['Turn Rate', s.turnRate.toFixed(2) + ' rad/s'],
      ['Hull', s.maxHull.toFixed(0)],
      ['Shield', s.maxShield.toFixed(0) + ' (' + s.shieldRegenPerSec.toFixed(1) + '/s regen)'],
      ['Armor Reduction', (s.damageReduction * 100).toFixed(0) + '%'],
      ['Energy', s.maxEnergy.toFixed(0) + ' (' + s.energyRegenPerSec.toFixed(1) + '/s regen)'],
      ['Weapon Damage', s.weaponDamage.toFixed(0) + ' / hit'],
      ['Weapon Fire Rate', (1000 / s.weaponCooldownMs).toFixed(2) + '/s'],
      ['Weapon Range', s.weaponRange.toFixed(0)],
      ['Cargo Capacity', s.cargoCapacity.toFixed(0)],
      ['Mining Rate', s.miningRatePerSec.toFixed(1) + '/s'],
      ['Radar Range', s.radarRange.toFixed(0)]
    ];
    panel.innerHTML = rows.map(([label, value]) => `<div class="stat-line"><span>${label}</span><strong>${value}</strong></div>`).join('');
  }

  unmount(): void {
    this.root = null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
