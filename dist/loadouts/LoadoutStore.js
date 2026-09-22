import { DEFAULT_PLAYER_LOADOUT } from '../ship/ShipStats.js';
const STORAGE_KEY = 'voidfrontier.loadouts.v1';
function makeId() {
    return `loadout_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}
export class LoadoutStore {
    constructor() {
        this.loadouts = this.load();
        if (this.loadouts.length === 0) {
            this.loadouts.push({ id: makeId(), name: 'Starter Build', loadout: { ...DEFAULT_PLAYER_LOADOUT } });
            this.save();
        }
    }
    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw)
                return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    }
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.loadouts));
        }
        catch {
            /* localStorage unavailable — edits just won't persist across reloads */
        }
    }
    list() {
        return this.loadouts;
    }
    get(id) {
        return this.loadouts.find((l) => l.id === id);
    }
    save_(name, loadout) {
        const entry = { id: makeId(), name, loadout: { ...loadout } };
        this.loadouts.push(entry);
        this.save();
        return entry;
    }
    update(id, name, loadout) {
        const entry = this.loadouts.find((l) => l.id === id);
        if (!entry)
            return;
        entry.name = name;
        entry.loadout = { ...loadout };
        this.save();
    }
    rename(id, name) {
        const entry = this.loadouts.find((l) => l.id === id);
        if (!entry)
            return;
        entry.name = name;
        this.save();
    }
    duplicate(id) {
        const entry = this.loadouts.find((l) => l.id === id);
        if (!entry)
            return undefined;
        const copy = { id: makeId(), name: `${entry.name} (Copy)`, loadout: { ...entry.loadout } };
        this.loadouts.push(copy);
        this.save();
        return copy;
    }
    remove(id) {
        this.loadouts = this.loadouts.filter((l) => l.id !== id);
        if (this.loadouts.length === 0) {
            this.loadouts.push({ id: makeId(), name: 'Starter Build', loadout: { ...DEFAULT_PLAYER_LOADOUT } });
        }
        this.save();
    }
}
//# sourceMappingURL=LoadoutStore.js.map