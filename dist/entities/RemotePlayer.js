import { Vector2, angleDiff } from '../core/Vector2.js';
import { approxRadiusOf, removeBlocks, cloneBlueprint } from '../ship/ShipBlueprint.js';
/**
 * Another connected player, as seen by this client. Position/angle are
 * driven by periodic server snapshots (smoothed, not simulated locally).
 * The block structure is NOT guessed or locally simulated at all — it
 * starts from the full blueprint the server sent on join, and changes
 * only when the server broadcasts an actual block-destruction event
 * (see NetClient.onBlocksDestroyed / Game.ts), so every client converges
 * on the exact same ship shape the server has.
 */
export class RemotePlayer {
    constructor(id, name, position, angle, blueprint) {
        this.faction = 'remote';
        this.angle = 0;
        this.shield = 0;
        this.alive = true;
        this.targetAngle = 0;
        this.lastSnapshotMs = 0;
        this.lastHitMs = -Infinity;
        this.id = id;
        this.name = name;
        this.position = position.clone();
        this.targetPosition = position.clone();
        this.angle = angle;
        this.targetAngle = angle;
        this.blueprint = cloneBlueprint(blueprint);
    }
    applySnapshot(pos, angle, shield, alive, nowMs) {
        this.targetPosition = pos;
        this.targetAngle = angle;
        this.shield = shield;
        this.alive = alive;
        this.lastSnapshotMs = nowMs;
    }
    applyBlockRemoval(instanceIds, nowMs) {
        this.blueprint = removeBlocks(this.blueprint, instanceIds);
        this.lastHitMs = nowMs;
    }
    applyRespawn(pos, angle, blueprint) {
        this.position = pos.clone();
        this.targetPosition = pos.clone();
        this.angle = angle;
        this.targetAngle = angle;
        this.blueprint = cloneBlueprint(blueprint);
        this.alive = true;
    }
    approxRadius() {
        return approxRadiusOf(this.blueprint);
    }
    update(dt) {
        const t = Math.min(1, dt * 12);
        this.position = Vector2.lerp(this.position, this.targetPosition, t);
        this.angle += angleDiff(this.angle, this.targetAngle) * t;
    }
    recentlyHit(nowMs, windowMs = 250) {
        return nowMs - this.lastHitMs < windowMs;
    }
}
//# sourceMappingURL=RemotePlayer.js.map