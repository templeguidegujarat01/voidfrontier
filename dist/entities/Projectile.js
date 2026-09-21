import { Vector2 } from '../core/Vector2.js';
let nextProjectileId = 1;
export class Projectile {
    constructor(origin, angle, speed, damage, owner, range) {
        this.damage = damage;
        this.owner = owner;
        this.id = nextProjectileId++;
        this.alive = true;
        this.position = origin.clone();
        this.velocity = Vector2.fromAngle(angle, speed);
        this.ttl = range / speed;
    }
    update(dt) {
        this.position = this.position.add(this.velocity.scale(dt));
        this.ttl -= dt;
        if (this.ttl <= 0)
            this.alive = false;
    }
}
//# sourceMappingURL=Projectile.js.map