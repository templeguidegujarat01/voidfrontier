import { PlacedBlock } from '../ship/BlockTypes.js';

export type NetStatus = 'idle' | 'connecting' | 'online' | 'offline' | 'error';

export interface PlayerSnapshotEntry {
  id: string;
  x: number;
  y: number;
  angle: number;
  shield: number;
  alive: boolean;
  score: number;
  kills: number;
  cargo: number;
}

export interface PlayerJoinInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  blueprint: PlacedBlock[];
  alive: boolean;
}

export interface AsteroidInfo {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxResource: number;
  resource: number;
  shapeSeed: number;
}

export interface DebrisInfo {
  id: number;
  x: number;
  y: number;
  value: number;
  color: string;
}

export interface WelcomePayload {
  id: string;
  ownBlueprint: PlacedBlock[];
  players: PlayerJoinInfo[];
  asteroids: AsteroidInfo[];
  debris: DebrisInfo[];
}

export interface ProjectileSpawnInfo {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
  owner: string;
  range: number;
}

export interface NetInput {
  thrustIntent: number;
  targetAngle: number;
  firing: boolean;
  mining: boolean;
}

type Handler<T> = (payload: T) => void;

/**
 * Browser-side WebSocket client for the authoritative multiplayer
 * server (server/index.mjs). Every event here reflects something the
 * SERVER decided — this client never infers or guesses combat/mining
 * outcomes from partial data.
 */
export class NetClient {
  private socket: WebSocket | null = null;
  private _status: NetStatus = 'idle';
  private inputTimer: number | null = null;
  private lastInput: NetInput = { thrustIntent: 0, targetAngle: 0, firing: false, mining: false };

  private snapshotHandlers: Handler<PlayerSnapshotEntry[]>[] = [];
  private joinHandlers: Handler<PlayerJoinInfo>[] = [];
  private leaveHandlers: Handler<string>[] = [];
  private statusHandlers: Handler<NetStatus>[] = [];
  private blocksDestroyedHandlers: Handler<{ shipId: string; blockIds: string[]; x: number; y: number }>[] = [];
  private shipDestroyedHandlers: Handler<{ shipId: string; killerId: string | null }>[] = [];
  private shipRespawnedHandlers: Handler<{ shipId: string; x: number; y: number; angle: number; blueprint: PlacedBlock[] }>[] = [];
  private projectileSpawnHandlers: Handler<ProjectileSpawnInfo>[] = [];
  private projectileRemoveHandlers: Handler<number>[] = [];
  private debrisSpawnHandlers: Handler<DebrisInfo>[] = [];
  private debrisRemoveHandlers: Handler<number>[] = [];
  private asteroidUpdateHandlers: Handler<{ id: number; resource: number }[]>[] = [];

  localId: string | null = null;

  get status(): NetStatus {
    return this._status;
  }

  onSnapshot(fn: Handler<PlayerSnapshotEntry[]>): void { this.snapshotHandlers.push(fn); }
  onJoin(fn: Handler<PlayerJoinInfo>): void { this.joinHandlers.push(fn); }
  onLeave(fn: Handler<string>): void { this.leaveHandlers.push(fn); }
  onStatusChange(fn: Handler<NetStatus>): void { this.statusHandlers.push(fn); }
  onBlocksDestroyed(fn: Handler<{ shipId: string; blockIds: string[]; x: number; y: number }>): void { this.blocksDestroyedHandlers.push(fn); }
  onShipDestroyed(fn: Handler<{ shipId: string; killerId: string | null }>): void { this.shipDestroyedHandlers.push(fn); }
  onShipRespawned(fn: Handler<{ shipId: string; x: number; y: number; angle: number; blueprint: PlacedBlock[] }>): void { this.shipRespawnedHandlers.push(fn); }
  onProjectileSpawn(fn: Handler<ProjectileSpawnInfo>): void { this.projectileSpawnHandlers.push(fn); }
  onProjectileRemove(fn: Handler<number>): void { this.projectileRemoveHandlers.push(fn); }
  onDebrisSpawn(fn: Handler<DebrisInfo>): void { this.debrisSpawnHandlers.push(fn); }
  onDebrisRemove(fn: Handler<number>): void { this.debrisRemoveHandlers.push(fn); }
  onAsteroidUpdate(fn: Handler<{ id: number; resource: number }[]>): void { this.asteroidUpdateHandlers.push(fn); }

  private setStatus(s: NetStatus): void {
    this._status = s;
    for (const fn of this.statusHandlers) fn(s);
  }

  connect(url: string, name: string, timeoutMs = 4000): Promise<WelcomePayload> {
    this.disconnect();
    this.setStatus('connecting');

    return new Promise((resolve, reject) => {
      let settled = false;
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch (err) {
        this.setStatus('error');
        reject(err instanceof Error ? err : new Error('Failed to open WebSocket'));
        return;
      }
      this.socket = socket;

      const timeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        this.setStatus('offline');
        socket.close();
        reject(new Error('Connection timed out'));
      }, timeoutMs);

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'hello', name }));
      });

      socket.addEventListener('message', (ev) => {
        let msg: any;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        switch (msg.type) {
          case 'welcome': {
            this.localId = msg.id;
            if (!settled) {
              settled = true;
              window.clearTimeout(timeout);
              this.setStatus('online');
              this.startInputLoop();
              resolve({ id: msg.id, ownBlueprint: msg.ownBlueprint, players: msg.players, asteroids: msg.asteroids, debris: msg.debris });
            }
            break;
          }
          case 'snapshot':
            for (const h of this.snapshotHandlers) h(msg.players as PlayerSnapshotEntry[]);
            break;
          case 'join':
            for (const h of this.joinHandlers) h(msg.player as PlayerJoinInfo);
            break;
          case 'leave':
            for (const h of this.leaveHandlers) h(msg.id as string);
            break;
          case 'blocks_destroyed':
            for (const h of this.blocksDestroyedHandlers) h({ shipId: msg.shipId, blockIds: msg.blockIds, x: msg.x, y: msg.y });
            break;
          case 'ship_destroyed':
            for (const h of this.shipDestroyedHandlers) h({ shipId: msg.shipId, killerId: msg.killerId ?? null });
            break;
          case 'ship_respawned':
            for (const h of this.shipRespawnedHandlers) h({ shipId: msg.shipId, x: msg.x, y: msg.y, angle: msg.angle, blueprint: msg.blueprint });
            break;
          case 'projectile_spawn':
            for (const h of this.projectileSpawnHandlers) h(msg.projectile as ProjectileSpawnInfo);
            break;
          case 'projectile_remove':
            for (const h of this.projectileRemoveHandlers) h(msg.id as number);
            break;
          case 'debris_spawn':
            for (const h of this.debrisSpawnHandlers) h(msg.debris as DebrisInfo);
            break;
          case 'debris_remove':
            for (const h of this.debrisRemoveHandlers) h(msg.id as number);
            break;
          case 'asteroid_update':
            for (const h of this.asteroidUpdateHandlers) h(msg.asteroids);
            break;
          default:
            break;
        }
      });

      socket.addEventListener('close', () => {
        window.clearTimeout(timeout);
        this.stopInputLoop();
        if (!settled) {
          settled = true;
          this.setStatus('offline');
          reject(new Error('Connection closed before handshake completed'));
          return;
        }
        this.setStatus('offline');
      });

      socket.addEventListener('error', () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeout);
          this.setStatus('error');
          reject(new Error('WebSocket error'));
        }
      });
    });
  }

  sendInput(input: NetInput): void {
    this.lastInput = input;
  }

  private startInputLoop(): void {
    this.stopInputLoop();
    this.inputTimer = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'input', ...this.lastInput }));
      }
    }, 50); // 20Hz
  }

  private stopInputLoop(): void {
    if (this.inputTimer !== null) {
      window.clearInterval(this.inputTimer);
      this.inputTimer = null;
    }
  }

  disconnect(): void {
    this.stopInputLoop();
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        /* already closed */
      }
      this.socket = null;
    }
    this.localId = null;
  }
}

/** Quick reachability probe for the menu's server list — real HTTP check, not a fake status. */
export async function probeServer(httpBaseUrl: string, timeoutMs = 2500): Promise<{ online: boolean; players?: number; capacity?: number }> {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${httpBaseUrl}/status`, { signal: controller.signal });
    window.clearTimeout(timer);
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: true, players: data.players, capacity: data.capacity };
  } catch {
    return { online: false };
  }
}
