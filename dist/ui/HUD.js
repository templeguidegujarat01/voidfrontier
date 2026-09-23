import { getBlockDef } from '../ship/BlockCatalog.js';
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
            blockSummary: req('block-summary'),
            statKills: req('stat-kills'),
            statScore: req('stat-score'),
            statSpeed: req('stat-speed'),
            respawnOverlay: req('respawn-overlay'),
            respawnTimer: req('respawn-timer'),
            miningHint: req('mining-hint'),
            minimapCanvas: req('minimap'),
            matchInfo: req('match-info'),
            netStatus: req('net-status'),
            evolutionLabel: req('evolution-label')
        };
        const ctx = this.el.minimapCanvas.getContext('2d');
        if (!ctx)
            throw new Error('Minimap canvas unsupported');
        this.minimapCtx = ctx;
    }
    setMatchInfo(text) {
        this.el.matchInfo.textContent = text;
        this.el.matchInfo.style.display = text ? 'block' : 'none';
    }
    setNetStatus(text) {
        this.el.netStatus.textContent = text;
    }
    setEvolutionLabel(tierName) {
        this.el.evolutionLabel.textContent = `EVOLVED: ${tierName}`;
        this.el.evolutionLabel.style.display = 'block';
    }
    update(player, world, asteroids, bots, remotePlayers = []) {
        const s = player.stats;
        const hullPct = player.hullRatio() * 100;
        this.el.hullBar.style.width = `${hullPct}%`;
        const aliveBlocks = player.blueprint.filter((b) => b.hp > 0).length;
        this.el.hullText.textContent = `${Math.round(hullPct)}% (${aliveBlocks} blocks)`;
        this.setBar(this.el.shieldBar, player.shield, s.maxShield);
        this.el.shieldText.textContent = `${Math.ceil(player.shield)} / ${Math.round(s.maxShield)}`;
        this.setBar(this.el.energyBar, player.energy, s.maxEnergy);
        this.el.energyText.textContent = `${Math.ceil(player.energy)} / ${Math.round(s.maxEnergy)}`;
        this.setBar(this.el.cargoBar, player.cargo, s.cargoCapacity);
        this.el.cargoText.textContent = `${Math.floor(player.cargo)} / ${Math.round(s.cargoCapacity)}`;
        this.el.statKills.textContent = String(player.kills);
        this.el.statScore.textContent = String(Math.floor(player.score));
        this.el.statSpeed.textContent = `${Math.round(player.velocity.length())} u/s`;
        this.el.respawnOverlay.style.display = player.alive ? 'none' : 'flex';
        if (!player.alive) {
            this.el.respawnTimer.textContent = Math.max(0, player.respawnTimer).toFixed(1);
        }
        this.el.miningHint.style.display = player.mining && player.alive ? 'block' : 'none';
        this.renderBlockSummary(player);
        this.drawMinimap(player, world, asteroids, bots, remotePlayers);
    }
    renderBlockSummary(player) {
        const counts = new Map();
        for (const b of player.blueprint) {
            if (b.hp <= 0)
                continue;
            const def = getBlockDef(b.blockId);
            counts.set(def.name, (counts.get(def.name) ?? 0) + 1);
        }
        const rows = [...counts.entries()]
            .map(([name, count]) => `<div class="module-row"><span class="module-cat">${name}</span><span class="module-name">x${count}</span></div>`)
            .join('');
        this.el.blockSummary.innerHTML = rows;
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