import { Vector2, clamp } from '../core/Vector2.js';
import { Asteroid, generateAsteroidField } from './Asteroid.js';
import { generateStarfield, Star } from './Starfield.js';

export class World {
  readonly width: number;
  readonly height: number;
  readonly asteroids: Asteroid[];
  readonly stars: Star[];

  constructor(width = 6000, height = 6000, asteroidCount = 70, starCount = 400) {
    this.width = width;
    this.height = height;
    this.asteroids = generateAsteroidField(asteroidCount, width, height);
    this.stars = generateStarfield(starCount, width, height);
  }

  /** Keeps a position inside the world bounds (hard wall, with a bit of push-back). */
  clampToBounds(pos: Vector2): Vector2 {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return new Vector2(clamp(pos.x, -halfW, halfW), clamp(pos.y, -halfH, halfH));
  }

  isOutsideBounds(pos: Vector2): boolean {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return Math.abs(pos.x) > halfW || Math.abs(pos.y) > halfH;
  }
}
