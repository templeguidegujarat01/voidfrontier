import { GameLoop } from '../core/GameLoop.js';
import { Input } from '../core/Input.js';
import { Camera } from '../core/Camera.js';
import { Vector2 } from '../core/Vector2.js';
import { World } from '../world/World.js';
import { Renderer } from '../render/Renderer.js';
import { HUD } from '../ui/HUD.js';
import { PlayerShip } from '../entities/PlayerShip.js';
import { BotShip } from '../entities/BotShip.js';
import { Ship } from '../entities/Ship.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { tryMine } from '../world/MiningSystem.js';
import { DEFAULT_BOT_LOADOUT } from '../ship/ShipStats.js';
import { ShipLoadout } from '../ship/ModuleTypes.js';
import { NetClient, NetStatus } from '../net/NetClient.js';
import { MatchConfig, MatchResult } from '../app/MatchConfig.js';

const BOT_NAMES = ['Rook-9', 'Ashen Veil', 'Marrow', 'Sable Fang', 'Cinderline', 'Glasswing', 'Ferro', 'Hollow Star'];

// A handful of preset bot loadouts (different chassis) so bots feel varied,
// not identical copies of each other.
const BOT_LOADOUT_POOL: ShipLoadout[] = [
  { ...DEFAULT_BOT_LOADOUT },
  { ...DEFAULT_BOT_LOADOUT, coreFrameId: 'core.striker', driveId: 'drive.stormjet' },
  { ...DEFAULT_BOT_LOADOUT, coreFrameId: 'core.defender', hullweaveId: 'weave.bulwark', wardplateId: 'ward.bastion' },
  { ...DEFAULT_BOT_LOADOUT, coreFrameId: 'core.interceptor', driveId: 'drive.stormjet', emitterId: 'emitter.lance' }
];

export interface GameCallbacks {
  onMatchEnd?: (result: MatchResult) => void;
}

export class Game {
  private readonly renderer: Renderer;
  private readonly hud: HUD;
  private readonly input: Input;
  private readonly camera: Camera;
  private readonly world: World;
  private readonly combat: CombatSystem;
  private readonly loop: GameLoop;
  private readonly config: MatchConfig;
  private readonly callbacks: GameCallbacks;

  private readonly player: PlayerShip;
  private readonly bots: BotShip[] = [];
  private nowMs = 0;
  private matchStartMs = 0;
  private matchEnded = false;

  private net: NetClient | null = null;
  private readonly remotePlayers = new Map<string, RemotePlayer>();

  constructor(canvas: HTMLCanvasElement, hudRoot: HTMLElement, config: MatchConfig, callbacks: GameCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
    this.renderer = new Renderer(canvas);
    this.hud = new HUD(hudRoot);
    this.input = new Input(canvas);
    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.world = new World(6000, 6000, 90, 420);
    this.combat = new CombatSystem({
      onShipDestroyed: (destroyed, killer) => this.handleShipDestroyed(destroyed, killer)
    });

    this.player = new PlayerShip({
      faction: 'player',
      loadout: config.loadout,
      position: new Vector2(0, 0),
      name: config.playerName || 'You'
    });
    this.hud.setLoadout(config.loadout);

    const botCount = Math.max(0, Math.min(config.botCount, 24));
    for (let i = 0; i < botCount; i++) {
      const angle = (i / Math.max(1, botCount)) * Math.PI * 2;
      const dist = 900 + Math.random() * 1400;
      const pos = Vector2.fromAngle(angle, dist);
      this.bots.push(
        new BotShip({
          faction: 'bot',
          loadout: BOT_LOADOUT_POOL[i % BOT_LOADOUT_POOL.length],
          position: pos,
          name: BOT_NAMES[i % BOT_NAMES.length]
        })
      );
    }

    window.addEventListener('resize', this.handleResize);
    this.handleResize();

    this.loop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(alpha),
      60
    );

    if (config.modeId === 'local-dev-multiplayer' && config.serverWsUrl) {
      this.setupNetworking(config.serverWsUrl);
    } else {
      this.hud.setNetStatus('Local (offline match)');
    }
  }

  private setupNetworking(wsUrl: string): void {
    const net = new NetClient();
    this.net = net;
    net.onStatusChange((status: NetStatus) => {
      const label =
        status === 'connecting' ? 'Connecting…' :
        status === 'online' ? `Online (${this.remotePlayers.size + 1} players)` :
        status === 'offline' ? 'Offline — showing local bots only' :
        'Connection error — showing local bots only';
      this.hud.setNetStatus(label);
    });
    net.onSnapshot((players) => {
      for (const p of players) {
        if (p.id === net.localId) continue;
        let rp = this.remotePlayers.get(p.id);
        if (!rp) {
          rp = new RemotePlayer(p.id, p.name, new Vector2(p.x, p.y), p.angle);
          this.remotePlayers.set(p.id, rp);
        }
        rp.applySnapshot(new Vector2(p.x, p.y), p.angle, p.hull, p.maxHull, p.alive, this.nowMs);
      }
      if (net.status === 'online') {
        this.hud.setNetStatus(`Online (${this.remotePlayers.size + 1} players)`);
      }
    });
    net.onJoin((p) => {
      if (p.id === net.localId) return;
      this.remotePlayers.set(p.id, new RemotePlayer(p.id, p.name, new Vector2(p.x, p.y), p.angle));
    });
    net.onLeave((id) => {
      this.remotePlayers.delete(id);
      if (net.status === 'online') {
        this.hud.setNetStatus(`Online (${this.remotePlayers.size + 1} players)`);
      }
    });
    net.connect(wsUrl, this.config.playerName || 'Pilot').catch(() => {
      // Status already reflects offline/error; local bots remain fully playable.
    });
  }

  private handleResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);
    this.camera.resize(w, h);
  };

  private handleShipDestroyed(destroyed: Ship, killer: Ship | null): void {
    if (killer) killer.kills += 1;
    if (destroyed === this.player) this.player.deaths += 1;

    if (this.config.killTarget !== null && killer && killer.kills >= this.config.killTarget) {
      this.endMatch(killer === this.player);
    }
  }

  private endMatch(playerWon: boolean): void {
    if (this.matchEnded) return;
    this.matchEnded = true;
    this.loop.stop();
    const result: MatchResult = {
      kills: this.player.kills,
      deaths: this.player.deaths,
      resourcesMined: Math.floor(this.player.resourcesCollected),
      durationSec: Math.round((this.nowMs - this.matchStartMs) / 1000),
      won: playerWon
    };
    this.callbacks.onMatchEnd?.(result);
  }

  start(): void {
    this.matchStartMs = performance.now();
    this.nowMs = this.matchStartMs;
    this.loop.start();
    // Exposed for debugging/QA only — not part of runtime game logic.
    (window as unknown as { __voidfrontier: Game }).__voidfrontier = this;
  }

  /** Ends the session without recording a match result (e.g. player quit via pause menu). */
  quit(): void {
    this.loop.stop();
    this.net?.disconnect();
    window.removeEventListener('resize', this.handleResize);
  }

  private update(dt: number): void {
    if (this.matchEnded) return;
    this.nowMs += dt * 1000;

    this.player.handleInput(this.input, this.camera, dt);
    this.player.update(dt);
    this.player.position = this.world.clampToBounds(this.player.position);

    const collected = tryMine(this.player, this.world.asteroids, dt);
    if (collected > 0) this.player.resourcesCollected += collected;

    for (const bot of this.bots) {
      if (bot.alive) {
        bot.think([this.player], this.bots, this.world.asteroids, dt);
        bot.update(dt);
        bot.position = this.world.clampToBounds(bot.position);
      } else if (bot.respawnTimer <= 0) {
        bot.respawn(bot.position);
      } else {
        bot.respawnTimer -= dt;
      }
    }

    for (const rp of this.remotePlayers.values()) rp.update(dt);

    const allShips: Ship[] = [this.player, ...this.bots];
    this.combat.tryFire(this.player, this.nowMs);
    for (const bot of this.bots) this.combat.tryFire(bot, this.nowMs);
    this.combat.update(dt, this.nowMs, allShips);

    if (!this.player.alive && this.player.respawnTimer <= 0) {
      this.player.respawn(new Vector2(0, 0));
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
    } else if (this.config.killTarget !== null) {
      this.hud.setMatchInfo(`${this.formatModeLabel()} · First to ${this.config.killTarget} kills`);
    } else {
      this.hud.setMatchInfo('');
    }

    this.camera.follow(this.player.position, dt);
    this.input.endFrame();
  }

  private formatModeLabel(): string {
    return this.config.modeId === 'frontier-ffa' ? 'Frontier FFA' : this.config.modeId;
  }

  private render(_alpha: number): void {
    const w = this.camera.viewWidth;
    const h = this.camera.viewHeight;

    this.renderer.clear(w, h);
    this.renderer.drawStarfield(this.camera, this.world.stars);
    this.renderer.drawWorldBounds(this.camera, this.world);
    this.renderer.drawAsteroids(this.camera, this.world.asteroids);
    this.renderer.drawProjectiles(this.camera, this.combat.projectiles);

    for (const bot of this.bots) this.renderer.drawShip(this.camera, bot, this.nowMs);
    for (const rp of this.remotePlayers.values()) this.renderer.drawShip(this.camera, rp, this.nowMs);
    this.renderer.drawShip(this.camera, this.player, this.nowMs);

    this.hud.update(this.player, this.world, this.world.asteroids, this.bots, [...this.remotePlayers.values()]);
  }
}
