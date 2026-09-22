export type NetStatus = 'idle' | 'connecting' | 'online' | 'offline' | 'error';

export interface PlayerSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  hull: number;
  maxHull: number;
  alive: boolean;
}

export interface NetInput {
  thrustIntent: number;
  targetAngle: number;
  firing: boolean;
  mining: boolean;
}

type SnapshotHandler = (players: PlayerSnapshot[]) => void;
type JoinHandler = (player: PlayerSnapshot) => void;
type LeaveHandler = (id: string) => void;
type StatusHandler = (status: NetStatus) => void;

/**
 * Thin wrapper around the browser's native WebSocket. Talks to
 * server/index.mjs (run separately — see README). This is a real network
 * client, not a mock: if no server is reachable, status goes to
 * 'offline'/'error' and callers must handle that rather than pretending
 * a connection exists.
 */
export class NetClient {
  private socket: WebSocket | null = null;
  private _status: NetStatus = 'idle';
  private inputTimer: number | null = null;
  private lastInput: NetInput = { thrustIntent: 0, targetAngle: 0, firing: false, mining: false };

  private snapshotHandlers: SnapshotHandler[] = [];
  private joinHandlers: JoinHandler[] = [];
  private leaveHandlers: LeaveHandler[] = [];
  private statusHandlers: StatusHandler[] = [];

  localId: string | null = null;

  get status(): NetStatus {
    return this._status;
  }

  onSnapshot(fn: SnapshotHandler): void {
    this.snapshotHandlers.push(fn);
  }
  onJoin(fn: JoinHandler): void {
    this.joinHandlers.push(fn);
  }
  onLeave(fn: LeaveHandler): void {
    this.leaveHandlers.push(fn);
  }
  onStatusChange(fn: StatusHandler): void {
    this.statusHandlers.push(fn);
  }

  private setStatus(s: NetStatus): void {
    this._status = s;
    for (const fn of this.statusHandlers) fn(s);
  }

  connect(url: string, name: string, timeoutMs = 4000): Promise<void> {
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
        if (msg.type === 'welcome') {
          this.localId = msg.id;
          if (!settled) {
            settled = true;
            window.clearTimeout(timeout);
            this.setStatus('online');
            resolve();
          }
          this.startInputLoop();
        } else if (msg.type === 'snapshot') {
          for (const h of this.snapshotHandlers) h(msg.players as PlayerSnapshot[]);
        } else if (msg.type === 'join') {
          for (const h of this.joinHandlers) h(msg.player as PlayerSnapshot);
        } else if (msg.type === 'leave') {
          for (const h of this.leaveHandlers) h(msg.id as string);
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

  /** Queues the latest input; actually sent on a fixed-rate timer to keep bandwidth bounded. */
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
