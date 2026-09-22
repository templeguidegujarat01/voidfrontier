/**
 * Thin wrapper around the browser's native WebSocket. Talks to
 * server/index.mjs (run separately — see README). This is a real network
 * client, not a mock: if no server is reachable, status goes to
 * 'offline'/'error' and callers must handle that rather than pretending
 * a connection exists.
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
        this.localId = null;
    }
    get status() {
        return this._status;
    }
    onSnapshot(fn) {
        this.snapshotHandlers.push(fn);
    }
    onJoin(fn) {
        this.joinHandlers.push(fn);
    }
    onLeave(fn) {
        this.leaveHandlers.push(fn);
    }
    onStatusChange(fn) {
        this.statusHandlers.push(fn);
    }
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
                if (msg.type === 'welcome') {
                    this.localId = msg.id;
                    if (!settled) {
                        settled = true;
                        window.clearTimeout(timeout);
                        this.setStatus('online');
                        resolve();
                    }
                    this.startInputLoop();
                }
                else if (msg.type === 'snapshot') {
                    for (const h of this.snapshotHandlers)
                        h(msg.players);
                }
                else if (msg.type === 'join') {
                    for (const h of this.joinHandlers)
                        h(msg.player);
                }
                else if (msg.type === 'leave') {
                    for (const h of this.leaveHandlers)
                        h(msg.id);
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