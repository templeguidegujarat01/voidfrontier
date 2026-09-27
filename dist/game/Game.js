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
import { Projectile } from '../entities/Projectile.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { tryMine } from '../world/MiningSystem.js';
import { Debris } from '../world/Debris.js';
import { SyncedAsteroid } from '../world/SyncedAsteroid.js';
import { updateDebrisField } from '../world/DebrisSystem.js';
import { cloneBlueprint, computeAggregateStats } from '../ship/ShipBlueprint.js';
import { blockColor, getBlockDef } from '../ship/BlockCatalog.js';
import { findTemplate, TIER1_TEMPLATES, TIER2_TEMPLATES } from '../ship/StarterBlueprints.js';
import { NetClient } from '../net/NetClient.js';
const BOT_NAMES = ['Rook-9', 'Ashen Veil', 'Marrow', 'Sable Fang', 'Cinderline', 'Glasswing', 'Ferro', 'Hollow Star'];
const EVOLUTION_SCORE_THRESHOLD = 120;
const SERVER_RECONCILE_STRENGTH = 0.15;
export class Game {
    constructor(canvas, hudRoot, config, callbacks = {}) {
        this.bots = [];
        this.debris = [];
        this.remoteDebris = new Map();
        this.networkProjectiles = new Map();
        this.nowMs = 0;
        this.matchStartMs = 0;
        this.matchEnded = false;
        this.evolutionOffered = false;
        this.networked = false;
        this.serverPlayerTarget = null;
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
                status === 'online' ? `Online (${this.remotePlayers.size + 1} players — authoritative combat/mining)` :
                    status === 'offline' ? 'Offline — showing local bots only' :
                        'Connection error — showing local bots only';
            this.hud.setNetStatus(label);
        });
        net.onSnapshot((players) => {
            for (const p of players) {
                if (p.id === net.localId) {
                    this.player.score = p.score;
                    this.player.kills = p.kills;
                    this.player.cargo = p.cargo;
                    this.serverPlayerTarget = { pos: new Vector2(p.x, p.y), angle: p.angle };
                    continue;
                }
                const rp = this.remotePlayers.get(p.id);
                if (rp)
                    rp.applySnapshot(new Vector2(p.x, p.y), p.angle, p.shield, p.alive, this.nowMs);
            }
            if (net.status === 'online') {
                this.hud.setNetStatus(`Online (${this.remotePlayers.size + 1} players — authoritative combat/mining)`);
            }
        });
        net.onJoin((p) => {
            if (p.id === net.localId)
                return;
            this.remotePlayers.set(p.id, new RemotePlayer(p.id, p.name, new Vector2(p.x, p.y), p.angle, p.blueprint));
        });
        net.onLeave((id) => {
            this.remotePlayers.delete(id);
        });
        net.onBlocksDestroyed(({ shipId, blockIds }) => {
            if (shipId === net.localId) {
                this.player.applyExternalBlockRemoval(blockIds);
            }
            else {
                this.remotePlayers.get(shipId)?.applyBlockRemoval(blockIds, this.nowMs);
            }
        });
        net.onShipDestroyed(({ shipId }) => {
            if (shipId === net.localId) {
                this.player.deaths += 1;
            }
        });
        net.onShipRespawned(({ shipId, x, y, angle, blueprint }) => {
            if (shipId === net.localId) {
                this.player.respawn(new Vector2(x, y));
            }
            else {
                this.remotePlayers.get(shipId)?.applyRespawn(new Vector2(x, y), angle, blueprint);
            }
        });
        net.onProjectileSpawn((p) => {
            const proj = new Projectile(new Vector2(p.x, p.y), p.angle, p.speed, p.damage, p.owner, p.range);
            proj.id = p.id;
            this.networkProjectiles.set(p.id, proj);
        });
        net.onProjectileRemove((id) => this.networkProjectiles.delete(id));
        net.onDebrisSpawn((d) => {
            const deb = new Debris(new Vector2(d.x, d.y), d.value, d.color);
            deb.id = d.id;
            deb.velocity = new Vector2(0, 0);
            this.remoteDebris.set(d.id, deb);
        });
        net.onDebrisRemove((id) => this.remoteDebris.delete(id));
        net.onAsteroidUpdate((updates) => {
            for (const u of updates) {
                const a = this.world.asteroids.find((x) => x.id === u.id);
                if (a)
                    a.resource = u.resource;
            }
        });
        net.connect(wsUrl, this.config.playerName || 'Pilot').then((welcome) => this.onNetworkReady(welcome)).catch(() => {
            /* status already reflects offline/error; local bots remain fully playable */
        });
    }
    onNetworkReady(welcome) {
        this.networked = true;
        // Adopt the SERVER's own instance ids for our ship's blocks — the
        // client generated its own ids at construction time (before
        // connecting), which are meaningless to the server. Every future
        // 'blocks_destroyed' event for our own ship references the server's
        // ids, so without this our own damage would silently never apply.
        this.player.blueprint = cloneBlueprint(welcome.ownBlueprint);
        this.player.stats = computeAggregateStats(this.player.blueprint);
        const synced = welcome.asteroids.map((a) => new SyncedAsteroid(a.id, new Vector2(a.x, a.y), a.radius, a.maxResource, a.resource, a.shapeSeed));
        this.world.asteroids.length = 0;
        this.world.asteroids.push(...synced);
        for (const p of welcome.players) {
            this.remotePlayers.set(p.id, new RemotePlayer(p.id, p.name, new Vector2(p.x, p.y), p.angle, p.blueprint));
        }
        for (const d of welcome.debris) {
            const deb = new Debris(new Vector2(d.x, d.y), d.value, d.color);
            deb.id = d.id;
            deb.velocity = new Vector2(0, 0);
            this.remoteDebris.set(d.id, deb);
        }
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
        if (this.networked && this.serverPlayerTarget) {
            this.player.position = Vector2.lerp(this.player.position, this.serverPlayerTarget.pos, SERVER_RECONCILE_STRENGTH);
            this.player.angle += (this.serverPlayerTarget.angle - this.player.angle) * SERVER_RECONCILE_STRENGTH;
        }
        if (!this.networked) {
            const collected = tryMine(this.player, this.world.asteroids, dt);
            if (collected > 0) {
                this.player.resourcesCollected += collected;
                this.player.score += collected;
            }
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
        for (const [id, proj] of this.networkProjectiles) {
            proj.update(dt);
            if (!proj.alive)
                this.networkProjectiles.delete(id);
        }
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
        if (!this.networked && !this.player.alive && this.player.respawnTimer <= 0) {
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
        this.renderer.drawDebris(this.camera, [...this.debris, ...this.remoteDebris.values()]);
        this.renderer.drawProjectiles(this.camera, [...this.combat.projectiles, ...this.networkProjectiles.values()]);
        for (const bot of this.bots)
            this.renderer.drawShip(this.camera, bot, this.nowMs);
        for (const rp of this.remotePlayers.values())
            this.renderer.drawShip(this.camera, rp, this.nowMs);
        this.renderer.drawShip(this.camera, this.player, this.nowMs);
        this.hud.update(this.player, this.world, this.world.asteroids, this.bots, [...this.remotePlayers.values()]);
    }
}
//# sourceMappingURL=Game.js.map