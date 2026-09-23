import { GameLoop } from '../core/GameLoop.js';
import { Input } from '../core/Input.js';
import { Camera } from '../core/Camera.js';
import { Vector2 } from '../core/Vector2.js';
import { World } from '../world/World.js';
import { Renderer } from '../render/Renderer.js';
import { HUD } from '../ui/HUD.js';
import { PlayerShip } from '../entities/PlayerShip.js';
import { BotShip } from '../entities/BotShip.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { tryMine } from '../world/MiningSystem.js';
import { Debris } from '../world/Debris.js';
import { updateDebrisField } from '../world/DebrisSystem.js';
import { blockColor, getBlockDef } from '../ship/BlockCatalog.js';
import { findTemplate, TIER1_TEMPLATES, TIER2_TEMPLATES } from '../ship/StarterBlueprints.js';
import { NetClient } from '../net/NetClient.js';
const BOT_NAMES = ['Rook-9', 'Ashen Veil', 'Marrow', 'Sable Fang', 'Cinderline', 'Glasswing', 'Ferro', 'Hollow Star'];
const EVOLUTION_SCORE_THRESHOLD = 120;
export class Game {
    constructor(canvas, hudRoot, config, callbacks = {}) {
        this.bots = [];
        this.debris = [];
        this.nowMs = 0;
        this.matchStartMs = 0;
        this.matchEnded = false;
        this.evolutionOffered = false;
        this.net = null;
        this.remotePlayers = new Map();
        this.handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.renderer.resize(w, h);
            this.camera.resize(w, h);
        };
        this.config = config;
        this.callbacks = callbacks;
        this.renderer = new Renderer(canvas);
        this.hud = new HUD(hudRoot);
        this.input = new Input(canvas);
        this.camera = new Camera(window.innerWidth, window.innerHeight);
        this.world = new World(6000, 6000, 90, 420);
        this.combat = new CombatSystem({
            onShipDestroyed: (destroyed, killer) => this.handleShipDestroyed(destroyed, killer),
            onBlocksDestroyed: (ship, blocks, atPos) => this.handleBlocksDestroyed(ship, blocks, atPos)
        });
        const starterTemplate = findTemplate(config.starterBlueprintId) ?? TIER1_TEMPLATES[0];
        this.player = new PlayerShip({
            faction: 'player',
            recipe: starterTemplate.blocks,
            position: new Vector2(0, 0),
            name: config.playerName || 'You'
        });
        const botCount = Math.max(0, Math.min(config.botCount, 24));
        const botTemplatePool = TIER1_TEMPLATES;
        for (let i = 0; i < botCount; i++) {
            const angle = (i / Math.max(1, botCount)) * Math.PI * 2;
            const dist = 900 + Math.random() * 1400;
            const pos = Vector2.fromAngle(angle, dist);
            this.bots.push(new BotShip({
                faction: 'bot',
                recipe: botTemplatePool[i % botTemplatePool.length].blocks,
                position: pos,
                name: BOT_NAMES[i % BOT_NAMES.length]
            }));
        }
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
        this.loop = new GameLoop((dt) => this.update(dt), (alpha) => this.render(alpha), 60);
        if (config.modeId === 'local-dev-multiplayer' && config.serverWsUrl) {
            this.setupNetworking(config.serverWsUrl);
        }
        else {
            this.hud.setNetStatus('Local (offline match)');
        }
    }
    setupNetworking(wsUrl) {
        const net = new NetClient();
        this.net = net;
        net.onStatusChange((status) => {
            const label = status === 'connecting' ? 'Connecting…' :
                status === 'online' ? `Online (${this.remotePlayers.size + 1} players)` :
                    status === 'offline' ? 'Offline — showing local bots only' :
                        'Connection error — showing local bots only';
            this.hud.setNetStatus(label);
        });
        net.onSnapshot((players) => {
            for (const p of players) {
                if (p.id === net.localId)
                    continue;
                let rp = this.remotePlayers.get(p.id);
                if (!rp) {
                    rp = new RemotePlayer(p.id, p.name, new Vector2(p.x, p.y), p.angle);
                    this.remotePlayers.set(p.id, rp);
                }
                rp.applySnapshot(new Vector2(p.x, p.y), p.angle, p.hull, p.maxHull, p.alive, this.nowMs);
            }
            if (net.status === 'online')
                this.hud.setNetStatus(`Online (${this.remotePlayers.size + 1} players)`);
        });
        net.onJoin((p) => {
            if (p.id === net.localId)
                return;
            this.remotePlayers.set(p.id, new RemotePlayer(p.id, p.name, new Vector2(p.x, p.y), p.angle));
        });
        net.onLeave((id) => {
            this.remotePlayers.delete(id);
            if (net.status === 'online')
                this.hud.setNetStatus(`Online (${this.remotePlayers.size + 1} players)`);
        });
        net.connect(wsUrl, this.config.playerName || 'Pilot').catch(() => {
            /* status already reflects offline/error; local bots remain fully playable */
        });
    }
    handleShipDestroyed(destroyed, killer) {
        if (killer) {
            killer.kills += 1;
            killer.score += Math.round(destroyed.stats.totalValue * 0.5);
        }
        if (destroyed === this.player)
            this.player.deaths += 1;
        if (this.config.killTarget !== null && killer && killer.kills >= this.config.killTarget) {
            this.endMatch(killer === this.player);
        }
    }
    handleBlocksDestroyed(ship, blocks, atPos) {
        for (const b of blocks) {
            const def = getBlockDef(b.blockId);
            const spawnPos = atPos.add(new Vector2((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12));
            this.debris.push(new Debris(spawnPos, Math.max(1, Math.round(def.cost * 0.4)), blockColor(def.category)));
        }
    }
    endMatch(playerWon) {
        if (this.matchEnded)
            return;
        this.matchEnded = true;
        this.loop.stop();
        const result = {
            kills: this.player.kills,
            deaths: this.player.deaths,
            resourcesMined: Math.floor(this.player.resourcesCollected),
            durationSec: Math.round((this.nowMs - this.matchStartMs) / 1000),
            won: playerWon
        };
        this.callbacks.onMatchEnd?.(result);
    }
    start() {
        this.matchStartMs = performance.now();
        this.nowMs = this.matchStartMs;
        this.loop.start();
        window.__voidfrontier = this;
    }
    quit() {
        this.loop.stop();
        this.net?.disconnect();
        window.removeEventListener('resize', this.handleResize);
    }
    applyEvolution(templateId) {
        const template = findTemplate(templateId);
        if (!template)
            return;
        this.player.evolveTo(template.blocks);
        this.hud.setEvolutionLabel(template.name);
    }
    update(dt) {
        if (this.matchEnded)
            return;
        this.nowMs += dt * 1000;
        this.player.handleInput(this.input, this.camera, dt);
        this.player.update(dt);
        this.player.position = this.world.clampToBounds(this.player.position);
        const collected = tryMine(this.player, this.world.asteroids, dt);
        if (collected > 0) {
            this.player.resourcesCollected += collected;
            this.player.score += collected;
        }
        for (const bot of this.bots) {
            if (bot.alive) {
                bot.think([this.player], this.bots, this.world.asteroids, dt);
                bot.update(dt);
                bot.position = this.world.clampToBounds(bot.position);
                const botMined = tryMine(bot, this.world.asteroids, dt);
                if (botMined > 0)
                    bot.score += botMined;
            }
            else if (bot.respawnTimer <= 0) {
                bot.respawn(bot.position);
            }
            else {
                bot.respawnTimer -= dt;
            }
        }
        for (const rp of this.remotePlayers.values())
            rp.update(dt);
        const allShips = [this.player, ...this.bots];
        this.combat.tryFire(this.player, this.nowMs);
        for (const bot of this.bots)
            this.combat.tryFire(bot, this.nowMs);
        this.combat.update(dt, this.nowMs, allShips);
        const collectedBy = updateDebrisField(this.debris, allShips, dt);
        for (const [ship, amount] of collectedBy) {
            ship.score += amount;
            if (ship === this.player)
                this.player.resourcesCollected += amount;
        }
        for (let i = this.debris.length - 1; i >= 0; i--) {
            if (this.debris[i].expired)
                this.debris.splice(i, 1);
        }
        if (!this.player.alive && this.player.respawnTimer <= 0) {
            this.player.respawn(new Vector2(0, 0));
        }
        if (!this.evolutionOffered && this.player.score >= EVOLUTION_SCORE_THRESHOLD) {
            this.evolutionOffered = true;
            this.callbacks.onEvolutionAvailable?.(TIER2_TEMPLATES);
        }
        if (this.net && this.net.status === 'online') {
            this.net.sendInput({
                thrustIntent: this.player.thrustIntent,
                targetAngle: this.player.targetAngle,
                firing: this.player.firing,
                mining: this.player.mining
            });
        }
        if (this.config.timeLimitSec !== null) {
            const remaining = this.config.timeLimitSec - (this.nowMs - this.matchStartMs) / 1000;
            this.hud.setMatchInfo(`${this.formatModeLabel()} · ${Math.max(0, Math.ceil(remaining))}s remaining`);
            if (remaining <= 0) {
                const maxBotKills = this.bots.reduce((m, b) => Math.max(m, b.kills), 0);
                this.endMatch(this.player.kills > maxBotKills);
            }
        }
        else if (this.config.killTarget !== null) {
            this.hud.setMatchInfo(`${this.formatModeLabel()} · First to ${this.config.killTarget} kills`);
        }
        else {
            this.hud.setMatchInfo('');
        }
        this.camera.follow(this.player.position, dt);
        this.input.endFrame();
    }
    formatModeLabel() {
        return this.config.modeId === 'frontier-ffa' ? 'Frontier FFA' : this.config.modeId;
    }
    render(_alpha) {
        const w = this.camera.viewWidth;
        const h = this.camera.viewHeight;
        this.renderer.clear(w, h);
        this.renderer.drawStarfield(this.camera, this.world.stars);
        this.renderer.drawWorldBounds(this.camera, this.world);
        this.renderer.drawAsteroids(this.camera, this.world.asteroids);
        this.renderer.drawDebris(this.camera, this.debris);
        this.renderer.drawProjectiles(this.camera, this.combat.projectiles);
        for (const bot of this.bots)
            this.renderer.drawShip(this.camera, bot, this.nowMs);
        for (const rp of this.remotePlayers.values())
            this.renderer.drawShip(this.camera, rp, this.nowMs);
        this.renderer.drawShip(this.camera, this.player, this.nowMs);
        this.hud.update(this.player, this.world, this.world.asteroids, this.bots, [...this.remotePlayers.values()]);
    }
}
//# sourceMappingURL=Game.js.map