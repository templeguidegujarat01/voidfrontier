import { Vector2, angleDiff } from '../core/Vector2.js';
/**
 * Visual-only representation of another connected player, driven by
 * periodic server snapshots. Implements just enough of the Ship surface
 * for Renderer.drawShip to render it (name, faction, position, angle,
 * alive, shield, recentlyHit) without pulling in local physics/combat —
 * this entity is never simulated client-side and never collides locally;
 * the server is the only authority on its true state.
 */
export class RemotePlayer {
    constructor(id, name, position, angle) {
        this.faction = 'remote';
        this.angle = 0;
        this.hull = 0;
        this.maxHull = 1;
        this.alive = true;
        this.shield = 0; // not currently synced; kept for Renderer interface compatibility
        this.targetAngle = 0;
        this.lastSnapshotMs = 0;
        this.id = id;
        this.name = name;
        this.position = position.clone();
        this.targetPosition = position.clone();
        this.angle = angle;
        this.targetAngle = angle;
    }
    applySnapshot(pos, angle, hull, maxHull, alive, nowMs) {
        this.targetPosition = pos;
        this.targetAngle = angle;
        this.hull = hull;
        this.maxHull = maxHull;
        this.alive = alive;
        this.lastSnapshotMs = nowMs;
    }
    /** Smooths toward the latest snapshot rather than snapping, so ~20Hz updates still look fluid. */
    update(dt) {
        const t = Math.min(1, dt * 12);
        this.position = Vector2.lerp(this.position, this.targetPosition, t);
        this.angle += angleDiff(this.angle, this.targetAngle) * t;
    }
    recentlyHit(_nowMs) {
        return false; // combat sync not implemented yet — see server/index.mjs notes
    }
    msSinceSnapshot(nowMs) {
        return nowMs - this.lastSnapshotMs;
    }
}
//# sourceMappingURL=RemotePlayer.js.map