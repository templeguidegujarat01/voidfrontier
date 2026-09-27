/**
 * Browser-side WebSocket client for the authoritative multiplayer
 * server (server/index.mjs). Every event here reflects something the
 * SERVER decided — this client never infers or guesses combat/mining
 * outcomes from partial data.
 */
export class NetClient {
    constructor() {
        this.socket = null;
        this._status = 'idle';
        this.inputTimer = null;
        this.lastInput = { thrustIntent: 0, targetAngle: 0, firing: false, mining: false };
        this.snapshotHandlers = [];
        this.joinHandlers = [];
        this.leaveHandlers = [];
        this.statusHandlers = [];
        this.blocksDestroyedHandlers = [];
        this.shipDestroyedHandlers = [];
        this.shipRespawnedHandlers = [];
        this.projectileSpawnHandlers = [];
        this.projectileRemoveHandlers = [];
        this.debrisSpawnHandlers = [];
        this.debrisRemoveHandlers = [];
        this.asteroidUpdateHandlers = [];
        this.localId = null;
    }
    get status() {
        return this._status;
    }
    onSnapshot(fn) { this.snapshotHandlers.push(fn); }
    onJoin(fn) { this.joinHandlers.push(fn); }
    onLeave(fn) { this.leaveHandlers.push(fn); }
    onStatusChange(fn) { this.statusHandlers.push(fn); }
    onBlocksDestroyed(fn) { this.blocksDestroyedHandlers.push(fn); }
    onShipDestroyed(fn) { this.shipDestroyedHandlers.push(fn); }
    onShipRespawned(fn) { this.shipRespawnedHandlers.push(fn); }
    onProjectileSpawn(fn) { this.projectileSpawnHandlers.push(fn); }
    onProjectileRemove(fn) { this.projectileRemoveHandlers.push(fn); }
    onDebrisSpawn(fn) { this.debrisSpawnHandlers.push(fn); }
    onDebrisRemove(fn) { this.debrisRemoveHandlers.push(fn); }
    onAsteroidUpdate(fn) { this.asteroidUpdateHandlers.push(fn); }
    setStatus(s) {
        this._status = s;
        for (const fn of this.statusHandlers)
            fn(s);
    }
    connect(url, name, timeoutMs = 4000) {
        this.disconnect();
        this.setStatus('connecting');
        return new Promise((resolve, reject) => {
            let settled = false;
            let socket;
            try {
                socket = new WebSocket(url);
            }
            catch (err) {
                this.setStatus('error');
                reject(err instanceof Error ? err : new Error('Failed to open WebSocket'));
                return;
            }
            this.socket = socket;
            const timeout = window.setTimeout(() => {
                if (settled)
                    return;
                settled = true;
                this.setStatus('offline');
                socket.close();
                reject(new Error('Connection timed out'));
            }, timeoutMs);
            socket.addEventListener('open', () => {
                socket.send(JSON.stringify({ type: 'hello', name }));
            });
            socket.addEventListener('message', (ev) => {
                let msg;
                try {
                    msg = JSON.parse(ev.data);
                }
                catch {
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
                        for (const h of this.snapshotHandlers)
                            h(msg.players);
                        break;
                    case 'join':
                        for (const h of this.joinHandlers)
                            h(msg.player);
                        break;
                    case 'leave':
                        for (const h of this.leaveHandlers)
                            h(msg.id);
                        break;
                    case 'blocks_destroyed':
                        for (const h of this.blocksDestroyedHandlers)
                            h({ shipId: msg.shipId, blockIds: msg.blockIds, x: msg.x, y: msg.y });
                        break;
                    case 'ship_destroyed':
                        for (const h of this.shipDestroyedHandlers)
                            h({ shipId: msg.shipId, killerId: msg.killerId ?? null });
                        break;
                    case 'ship_respawned':
                        for (const h of this.shipRespawnedHandlers)
                            h({ shipId: msg.shipId, x: msg.x, y: msg.y, angle: msg.angle, blueprint: msg.blueprint });
                        break;
                    case 'projectile_spawn':
                        for (const h of this.projectileSpawnHandlers)
                            h(msg.projectile);
                        break;
                    case 'projectile_remove':
                        for (const h of this.projectileRemoveHandlers)
                            h(msg.id);
                        break;
                    case 'debris_spawn':
                        for (const h of this.debrisSpawnHandlers)
                            h(msg.debris);
                        break;
                    case 'debris_remove':
                        for (const h of this.debrisRemoveHandlers)
                            h(msg.id);
                        break;
                    case 'asteroid_update':
                        for (const h of this.asteroidUpdateHandlers)
                            h(msg.asteroids);
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
    sendInput(input) {
        this.lastInput = input;
    }
    startInputLoop() {
        this.stopInputLoop();
        this.inputTimer = window.setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: 'input', ...this.lastInput }));
            }
        }, 50); // 20Hz
    }
    stopInputLoop() {
        if (this.inputTimer !== null) {
            window.clearInterval(this.inputTimer);
            this.inputTimer = null;
        }
    }
    disconnect() {
        this.stopInputLoop();
        if (this.socket) {
            try {
                this.socket.close();
            }
            catch {
                /* already closed */
            }
            this.socket = null;
        }
        this.localId = null;
    }
}
/** Quick reachability probe for the menu's server list — real HTTP check, not a fake status. */
export async function probeServer(httpBaseUrl, timeoutMs = 2500) {
    try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(`${httpBaseUrl}/status`, { signal: controller.signal });
        window.clearTimeout(timer);
        if (!res.ok)
            return { online: false };
        const data = await res.json();
        return { online: true, players: data.players, capacity: data.capacity };
    }
    catch {
        return { online: false };
    }
}
//# sourceMappingURL=NetClient.js.map