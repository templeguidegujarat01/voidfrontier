import { ShipLoadout } from '../ship/ModuleTypes.js';
import { DEFAULT_PLAYER_LOADOUT } from '../ship/ShipStats.js';

const STORAGE_KEY = 'voidfrontier.loadouts.v1';

export interface SavedLoadout {
  id: string;
  name: string;
  loadout: ShipLoadout;
}

function makeId(): string {
  return `loadout_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export class LoadoutStore {
  private loadouts: SavedLoadout[];

  constructor() {
    this.loadouts = this.load();
    if (this.loadouts.length === 0) {
      this.loadouts.push({ id: makeId(), name: 'Starter Build', loadout: { ...DEFAULT_PLAYER_LOADOUT } });
      this.save();
    }
  }

  private load(): SavedLoadout[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.loadouts));
    } catch {
      /* localStorage unavailable — edits just won't persist across reloads */
    }
  }

  list(): SavedLoadout[] {
    return this.loadouts;
  }

  get(id: string): SavedLoadout | undefined {
    return this.loadouts.find((l) => l.id === id);
  }

  save_(name: string, loadout: ShipLoadout): SavedLoadout {
    const entry: SavedLoadout = { id: makeId(), name, loadout: { ...loadout } };
    this.loadouts.push(entry);
    this.save();
    return entry;
  }

  update(id: string, name: string, loadout: ShipLoadout): void {
    const entry = this.loadouts.find((l) => l.id === id);
    if (!entry) return;
    entry.name = name;
    entry.loadout = { ...loadout };
    this.save();
  }

  rename(id: string, name: string): void {
    const entry = this.loadouts.find((l) => l.id === id);
    if (!entry) return;
    entry.name = name;
    this.save();
  }

  duplicate(id: string): SavedLoadout | undefined {
    const entry = this.loadouts.find((l) => l.id === id);
    if (!entry) return undefined;
    const copy: SavedLoadout = { id: makeId(), name: `${entry.name} (Copy)`, loadout: { ...entry.loadout } };
    this.loadouts.push(copy);
    this.save();
    return copy;
  }

  remove(id: string): void {
    this.loadouts = this.loadouts.filter((l) => l.id !== id);
    if (this.loadouts.length === 0) {
      this.loadouts.push({ id: makeId(), name: 'Starter Build', loadout: { ...DEFAULT_PLAYER_LOADOUT } });
    }
    this.save();
  }
}
