import { Vector2 } from '../core/Vector2.js';
import { Faction } from './Ship.js';

let nextProjectileId = 1;

export class Projectile {
  readonly id = nextProjectileId++;
  position: Vector2;
  /** Position before the most recent update() — used for swept (segment) collision checks so a fast projectile can't tunnel through a target between two ticks. */
  previousPosition: Vector2;
  velocity: Vector2;
  ttl: number; // seconds remaining
  alive = true;

  constructor(
    origin: Vector2,
    angle: number,
    speed: number,
    public readonly damage: number,
    public readonly owner: Faction,
    range: number,
    /** The specific ship instance that fired this — used for self-exclusion. Faction alone isn't enough once multiple distinct ships can share a faction (e.g. every human player is 'player'). */
    public readonly ownerShipId: number = -1
  ) {
    this.position = origin.clone();
    this.previousPosition = origin.clone();
    this.velocity = Vector2.fromAngle(angle, speed);
    this.ttl = range / speed;
  }

  update(dt: number): void {
    this.previousPosition = this.position;
    this.position = this.position.add(this.velocity.scale(dt));
    this.ttl -= dt;
    if (this.ttl <= 0) this.alive = false;
  }
}
