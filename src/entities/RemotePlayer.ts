import { Vector2, angleDiff } from '../core/Vector2.js';
import { ShipBlueprint } from '../ship/BlockTypes.js';
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
  readonly id: string;
  name: string;
  readonly faction = 'remote' as const;

  position: Vector2;
  angle = 0;
  blueprint: ShipBlueprint;
  shield = 0;
  alive = true;

  private targetPosition: Vector2;
  private targetAngle = 0;
  private lastSnapshotMs = 0;
  private lastHitMs = -Infinity;

  constructor(id: string, name: string, position: Vector2, angle: number, blueprint: ShipBlueprint) {
    this.id = id;
    this.name = name;
    this.position = position.clone();
    this.targetPosition = position.clone();
    this.angle = angle;
    this.targetAngle = angle;
    this.blueprint = cloneBlueprint(blueprint);
  }

  applySnapshot(pos: Vector2, angle: number, shield: number, alive: boolean, nowMs: number): void {
    this.targetPosition = pos;
    this.targetAngle = angle;
    this.shield = shield;
    this.alive = alive;
    this.lastSnapshotMs = nowMs;
  }

  applyBlockRemoval(instanceIds: string[], nowMs: number): void {
    this.blueprint = removeBlocks(this.blueprint, instanceIds);
    this.lastHitMs = nowMs;
  }

  applyRespawn(pos: Vector2, angle: number, blueprint: ShipBlueprint): void {
    this.position = pos.clone();
    this.targetPosition = pos.clone();
    this.angle = angle;
    this.targetAngle = angle;
    this.blueprint = cloneBlueprint(blueprint);
    this.alive = true;
  }

  approxRadius(): number {
    return approxRadiusOf(this.blueprint);
  }

  update(dt: number): void {
    const t = Math.min(1, dt * 12);
    this.position = Vector2.lerp(this.position, this.targetPosition, t);
    this.angle += angleDiff(this.angle, this.targetAngle) * t;
  }

  recentlyHit(nowMs: number, windowMs = 250): boolean {
    return nowMs - this.lastHitMs < windowMs;
  }
}
