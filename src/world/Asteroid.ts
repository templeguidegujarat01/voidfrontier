import { Vector2 } from '../core/Vector2.js';

let nextAsteroidId = 1;

export class Asteroid {
  readonly id = nextAsteroidId++;
  readonly maxResource: number;
  resource: number;
  /** Stable per-asteroid jitter seed so rendering looks organic, not a perfect circle. */
  readonly shapeSeed: number;

  constructor(public position: Vector2, public radius: number) {
    this.maxResource = Math.round(radius * 4);
    this.resource = this.maxResource;
    this.shapeSeed = Math.random() * 1000;
  }

  get depleted(): boolean {
    return this.resource <= 0;
  }

  extract(amount: number): number {
    const taken = Math.min(this.resource, amount);
    this.resource -= taken;
    return taken;
  }
}

export function generateAsteroidField(count: number, worldWidth: number, worldHeight: number): Asteroid[] {
  const asteroids: Asteroid[] = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * worldWidth * 0.9;
    const y = (Math.random() - 0.5) * worldHeight * 0.9;
    const radius = 22 + Math.random() * 38;
    asteroids.push(new Asteroid(new Vector2(x, y), radius));
  }
  return asteroids;
}
