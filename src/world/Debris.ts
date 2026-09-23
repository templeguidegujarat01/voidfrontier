import { Vector2 } from '../core/Vector2.js';

let nextDebrisId = 1;

export class Debris {
  readonly id = nextDebrisId++;
  velocity: Vector2;
  ttl = 25; // seconds before it despawns if never collected
  collected = false;
  readonly color: string;

  constructor(public position: Vector2, public value: number, color: string) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 40;
    this.velocity = Vector2.fromAngle(angle, speed);
    this.color = color;
  }

  /** Accelerates toward a puller (a ship's Magnet block) within range. */
  pullToward(target: Vector2, strength: number, dt: number): void {
    const toTarget = target.sub(this.position);
    const dist = toTarget.length();
    if (dist < 1) return;
    const pull = toTarget.normalize().scale(strength * dt);
    this.velocity = this.velocity.add(pull);
  }

  update(dt: number): void {
    this.position = this.position.add(this.velocity.scale(dt));
    this.velocity = this.velocity.scale(Math.pow(0.92, dt * 60));
    this.ttl -= dt;
  }

  get expired(): boolean {
    return this.ttl <= 0 || this.collected;
  }
}
