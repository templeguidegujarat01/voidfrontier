import { Vector2 } from '../core/Vector2.js';
import { Faction } from './Ship.js';

let nextProjectileId = 1;

export class Projectile {
  readonly id = nextProjectileId++;
  position: Vector2;
  velocity: Vector2;
  ttl: number; // seconds remaining
  alive = true;

  constructor(
    origin: Vector2,
    angle: number,
    speed: number,
    public readonly damage: number,
    public readonly owner: Faction,
    range: number
  ) {
    this.position = origin.clone();
    this.velocity = Vector2.fromAngle(angle, speed);
    this.ttl = range / speed;
  }

  update(dt: number): void {
    this.position = this.position.add(this.velocity.scale(dt));
    this.ttl -= dt;
    if (this.ttl <= 0) this.alive = false;
  }
}
