import { GameLoop } from '../core/GameLoop.js';
import { Input } from '../core/Input.js';
import { Camera } from '../core/Camera.js';
import { Vector2 } from '../core/Vector2.js';
import { World } from '../world/World.js';
import { Renderer } from '../render/Renderer.js';
import { HUD } from '../ui/HUD.js';
import { PlayerShip } from '../entities/PlayerShip.js';
import { BotShip } from '../entities/BotShip.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { tryMine } from '../world/MiningSystem.js';
import { DEFAULT_PLAYER_LOADOUT, DEFAULT_BOT_LOADOUT } from '../ship/ShipStats.js';
const BOT_NAMES = ['Rook-9', 'Ashen Veil', 'Marrow', 'Sable Fang', 'Cinderline'];
export class Game {
    constructor(canvas) {
        this.bots = [];
        this.nowMs = 0;
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.hud = new HUD();
        this.input = new Input(canvas);
        this.camera = new Camera(window.innerWidth, window.innerHeight);
        this.world = new World(6000, 6000, 90, 420);
        this.combat = new CombatSystem({
            onShipDestroyed: (destroyed, killer) => this.handleShipDestroyed(destroyed, killer)
        });
        this.player = new PlayerShip({
            faction: 'player',
            loadout: DEFAULT_PLAYER_LOADOUT,
            position: new Vector2(0, 0),
            name: 'You'
        });
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const dist = 900 + Math.random() * 1400;
            const pos = Vector2.fromAngle(angle, dist);
            this.bots.push(new BotShip({
                faction: 'bot',
                loadout: DEFAULT_BOT_LOADOUT,
                position: pos,
                name: BOT_NAMES[i % BOT_NAMES.length]
            }));
        }
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
        this.loop = new GameLoop((dt) => this.update(dt), (alpha) => this.render(alpha), 60);
    }
    handleResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.renderer.resize(w, h);
        this.camera.resize(w, h);
    }
    handleShipDestroyed(destroyed, killer) {
        if (killer === this.player) {
            this.player.kills += 1;
        }
        if (destroyed instanceof BotShip) {
            // Respawn the bot near its original spawn ring after its timer elapses
            // (handled lazily in update() by checking respawnTimer <= 0).
        }
    }
    start() {
        this.loop.start();
    }
    update(dt) {
        this.nowMs += dt * 1000;
        this.player.handleInput(this.input, this.camera, dt);
        this.player.update(dt);
        this.player.position = this.world.clampToBounds(this.player.position);
        if (this.world.isOutsideBounds(this.player.position)) {
            this.player.velocity = this.player.velocity.scale(0);
        }
        const collected = tryMine(this.player, this.world.asteroids, dt);
        if (collected > 0)
            this.player.resourcesCollected += collected;
        for (const bot of this.bots) {
            if (bot.alive) {
                bot.think(this.player.alive ? this.player : null, dt);
                bot.update(dt);
                bot.position = this.world.clampToBounds(bot.position);
            }
            else if (bot.respawnTimer <= 0) {
                bot.respawn(bot.position);
            }
            else {
                bot.respawnTimer -= dt;
            }
        }
        const allShips = [this.player, ...this.bots];
        this.combat.tryFire(this.player, this.nowMs);
        for (const bot of this.bots)
            this.combat.tryFire(bot, this.nowMs);
        this.combat.update(dt, this.nowMs, allShips);
        if (!this.player.alive && this.player.respawnTimer <= 0) {
            this.player.respawn(new Vector2(0, 0));
        }
        this.camera.follow(this.player.position, dt);
        this.input.endFrame();
    }
    render(_alpha) {
        const w = this.camera.viewWidth;
        const h = this.camera.viewHeight;
        this.renderer.clear(w, h);
        this.renderer.drawStarfield(this.camera, this.world.stars);
        this.renderer.drawWorldBounds(this.camera, this.world);
        this.renderer.drawAsteroids(this.camera, this.world.asteroids);
        this.renderer.drawProjectiles(this.camera, this.combat.projectiles);
        for (const bot of this.bots)
            this.renderer.drawShip(this.camera, bot, this.nowMs);
        this.renderer.drawShip(this.camera, this.player, this.nowMs);
        this.hud.update(this.player, this.world, this.world.asteroids, this.bots);
    }
}
//# sourceMappingURL=Game.js.map