import { Vector2, clamp } from '../core/Vector2.js';
import { generateAsteroidField } from './Asteroid.js';
import { generateStarfield } from './Starfield.js';
export class World {
    constructor(width = 6000, height = 6000, asteroidCount = 70, starCount = 400) {
        this.width = width;
        this.height = height;
        this.asteroids = generateAsteroidField(asteroidCount, width, height);
        this.stars = generateStarfield(starCount, width, height);
    }
    /** Keeps a position inside the world bounds (hard wall, with a bit of push-back). */
    clampToBounds(pos) {
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        return new Vector2(clamp(pos.x, -halfW, halfW), clamp(pos.y, -halfH, halfH));
    }
    isOutsideBounds(pos) {
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        return Math.abs(pos.x) > halfW || Math.abs(pos.y) > halfH;
    }
}
//# sourceMappingURL=World.js.map