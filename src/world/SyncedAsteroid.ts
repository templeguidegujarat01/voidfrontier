import { Vector2 } from '../core/Vector2.js';

/**
 * Satisfies the same shape MiningSystem/Renderer expect from an Asteroid
 * (position, radius, resource, maxResource, shapeSeed, depleted, extract),
 * but never decides anything locally — resource is only ever set from a
 * server asteroid_update event. Kept separate from the Asteroid class
 * (rather than hacking around its readonly fields) so the class used for
 * singleplayer/bot asteroids is untouched.
 */
export class SyncedAsteroid {
  readonly id: number;
  position: Vector2;
  readonly radius: number;
  readonly maxResource: number;
  resource: number;
  readonly shapeSeed: number;

  constructor(id: number, position: Vector2, radius: number, maxResource: number, resource: number, shapeSeed: number) {
    this.id = id;
    this.position = position;
    this.radius = radius;
    this.maxResource = maxResource;
    this.resource = resource;
    this.shapeSeed = shapeSeed;
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
