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
  readonly id: string;
  name: string;
  readonly faction = 'remote' as const;

  position: Vector2;
  angle = 0;
  hull = 0;
  maxHull = 1;
  alive = true;
  shield = 0; // not currently synced; kept for Renderer interface compatibility

  private targetPosition: Vector2;
  private targetAngle = 0;
  private lastSnapshotMs = 0;

  constructor(id: string, name: string, position: Vector2, angle: number) {
    this.id = id;
    this.name = name;
    this.position = position.clone();
    this.targetPosition = position.clone();
    this.angle = angle;
    this.targetAngle = angle;
  }

  applySnapshot(pos: Vector2, angle: number, hull: number, maxHull: number, alive: boolean, nowMs: number): void {
    this.targetPosition = pos;
    this.targetAngle = angle;
    this.hull = hull;
    this.maxHull = maxHull;
    this.alive = alive;
    this.lastSnapshotMs = nowMs;
  }

  /** Smooths toward the latest snapshot rather than snapping, so ~20Hz updates still look fluid. */
  update(dt: number): void {
    const t = Math.min(1, dt * 12);
    this.position = Vector2.lerp(this.position, this.targetPosition, t);
    this.angle += angleDiff(this.angle, this.targetAngle) * t;
  }

  recentlyHit(_nowMs: number): boolean {
    return false; // combat sync not implemented yet — see server/index.mjs notes
  }

  msSinceSnapshot(nowMs: number): number {
    return nowMs - this.lastSnapshotMs;
  }
}
