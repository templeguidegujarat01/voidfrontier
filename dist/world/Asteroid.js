import { Vector2 } from '../core/Vector2.js';
let nextAsteroidId = 1;
export class Asteroid {
    constructor(position, radius) {
        this.position = position;
        this.radius = radius;
        this.id = nextAsteroidId++;
        this.maxResource = Math.round(radius * 4);
        this.resource = this.maxResource;
        this.shapeSeed = Math.random() * 1000;
    }
    get depleted() {
        return this.resource <= 0;
    }
    extract(amount) {
        const taken = Math.min(this.resource, amount);
        this.resource -= taken;
        return taken;
    }
}
export function generateAsteroidField(count, worldWidth, worldHeight) {
    const asteroids = [];
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * worldWidth * 0.9;
        const y = (Math.random() - 0.5) * worldHeight * 0.9;
        const radius = 22 + Math.random() * 38;
        asteroids.push(new Asteroid(new Vector2(x, y), radius));
    }
    return asteroids;
}
//# sourceMappingURL=Asteroid.js.map