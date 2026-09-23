import { Vector2 } from '../core/Vector2.js';
let nextDebrisId = 1;
export class Debris {
    constructor(position, value, color) {
        this.position = position;
        this.value = value;
        this.id = nextDebrisId++;
        this.ttl = 25; // seconds before it despawns if never collected
        this.collected = false;
        const angle = Math.random() * Math.PI * 2;
        const speed = 20 + Math.random() * 40;
        this.velocity = Vector2.fromAngle(angle, speed);
        this.color = color;
    }
    /** Accelerates toward a puller (a ship's Magnet block) within range. */
    pullToward(target, strength, dt) {
        const toTarget = target.sub(this.position);
        const dist = toTarget.length();
        if (dist < 1)
            return;
        const pull = toTarget.normalize().scale(strength * dt);
        this.velocity = this.velocity.add(pull);
    }
    update(dt) {
        this.position = this.position.add(this.velocity.scale(dt));
        this.velocity = this.velocity.scale(Math.pow(0.92, dt * 60));
        this.ttl -= dt;
    }
    get expired() {
        return this.ttl <= 0 || this.collected;
    }
}
//# sourceMappingURL=Debris.js.map