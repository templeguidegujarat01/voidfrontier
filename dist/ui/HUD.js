import { getModule } from '../ship/ModuleCatalog.js';
const CATEGORY_LABELS = [
    ['coreFrameId', 'Core Frame'],
    ['driveId', 'Drive'],
    ['emitterId', 'Emitter'],
    ['wardplateId', 'Wardplate'],
    ['hullweaveId', 'Hullweave'],
    ['reactorId', 'Reactor'],
    ['holdId', 'Hold'],
    ['drillId', 'Drill'],
    ['arrayId', 'Array'],
    ['utilityRigId', 'Utility Rig']
];
export class HUD {
    constructor(root) {
        const req = (id) => {
            const found = root.querySelector(`#${id}`);
            if (!found)
                throw new Error(`Missing HUD element #${id}`);
            return found;
        };
        this.el = {
            hullBar: req('hull-bar'),
            hullText: req('hull-text'),
            shieldBar: req('shield-bar'),
            shieldText: req('shield-text'),
            energyBar: req('energy-bar'),
            energyText: req('energy-text'),
            cargoBar: req('cargo-bar'),
            cargoText: req('cargo-text'),
            moduleList: req('module-list'),
            statKills: req('stat-kills'),
            statResources: req('stat-resources'),
            statSpeed: req('stat-speed'),
            respawnOverlay: req('respawn-overlay'),
            respawnTimer: req('respawn-timer'),
            miningHint: req('mining-hint'),
            minimapCanvas: req('minimap'),
            matchInfo: req('match-info'),
            netStatus: req('net-status')
        };
        const ctx = this.el.minimapCanvas.getContext('2d');
        if (!ctx)
            throw new Error('Minimap canvas unsupported');
        this.minimapCtx = ctx;
    }
    /** Renders the module list from the ship's *actual* equipped loadout (not a fixed placeholder). */
    setLoadout(loadout) {
        const rows = CATEGORY_LABELS.map(([key, label]) => {
            const mod = getModule(loadout[key]);
            return `<div class="module-row"><span class="module-cat">${label}</span><span class="module-name">${mod.name}</span></div>`;
        });
        this.el.moduleList.innerHTML = rows.join('');
    }
    setMatchInfo(text) {
        this.el.matchInfo.textContent = text;
        this.el.matchInfo.style.display = text ? 'block' : 'none';
    }
    setNetStatus(text) {
        this.el.netStatus.textContent = text;
    }
    update(player, world, asteroids, bots, remotePlayers = []) {
        const s = player.stats;
        this.setBar(this.el.hullBar, player.hull, s.maxHull);
        this.el.hullText.textContent = `${Math.ceil(player.hull)} / ${Math.round(s.maxHull)}`;
        this.setBar(this.el.shieldBar, player.shield, s.maxShield);
        this.el.shieldText.textContent = `${Math.ceil(player.shield)} / ${Math.round(s.maxShield)}`;
        this.setBar(this.el.energyBar, player.energy, s.maxEnergy);
        this.el.energyText.textContent = `${Math.ceil(player.energy)} / ${Math.round(s.maxEnergy)}`;
        this.setBar(this.el.cargoBar, player.cargo, s.cargoCapacity);
        this.el.cargoText.textContent = `${Math.floor(player.cargo)} / ${Math.round(s.cargoCapacity)}`;
        this.el.statKills.textContent = String(player.kills);
        this.el.statResources.textContent = String(Math.floor(player.resourcesCollected));
        this.el.statSpeed.textContent = `${Math.round(player.velocity.length())} u/s`;
        this.el.respawnOverlay.style.display = player.alive ? 'none' : 'flex';
        if (!player.alive) {
            this.el.respawnTimer.textContent = Math.max(0, player.respawnTimer).toFixed(1);
        }
        this.el.miningHint.style.display = player.mining && player.alive ? 'block' : 'none';
        this.drawMinimap(player, world, asteroids, bots, remotePlayers);
    }
    setBar(el, value, max) {
        const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
        el.style.width = `${pct}%`;
    }
    drawMinimap(player, world, asteroids, bots, remotePlayers) {
        const ctx = this.minimapCtx;
        const size = this.el.minimapCanvas.width;
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(11,14,25,0.9)';
        ctx.fillRect(0, 0, size, size);
        const toMini = (x, y) => ({
            x: ((x + world.width / 2) / world.width) * size,
            y: ((y + world.height / 2) / world.height) * size
        });
        ctx.fillStyle = 'rgba(123,127,153,0.7)';
        for (const a of asteroids) {
            if (a.depleted)
                continue;
            const p = toMini(a.position.x, a.position.y);
            ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        }
        ctx.fillStyle = '#ffb059';
        for (const b of bots) {
            if (!b.alive)
                continue;
            const p = toMini(b.position.x, b.position.y);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#a78bfa';
        for (const r of remotePlayers) {
            if (!r.alive)
                continue;
            const p = toMini(r.position.x, r.position.y);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#5eead4';
        const pp = toMini(player.position.x, player.position.y);
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
//# sourceMappingURL=HUD.js.map