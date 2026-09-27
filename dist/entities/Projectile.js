import { Vector2 } from '../core/Vector2.js';
let nextProjectileId = 1;
export class Projectile {
    constructor(origin, angle, speed, damage, owner, range, 
    /** The specific ship instance that fired this — used for self-exclusion. Faction alone isn't enough once multiple distinct ships can share a faction (e.g. every human player is 'player'). */
    ownerShipId = -1) {
        this.damage = damage;
        this.owner = owner;
        this.ownerShipId = ownerShipId;
        this.id = nextProjectileId++;
        this.alive = true;
        this.position = origin.clone();
        this.previousPosition = origin.clone();
        this.velocity = Vector2.fromAngle(angle, speed);
        this.ttl = range / speed;
    }
    update(dt) {
        this.previousPosition = this.position;
        this.position = this.position.add(this.velocity.scale(dt));
        this.ttl -= dt;
        if (this.ttl <= 0)
            this.alive = false;
    }
}
//# sourceMappingURL=Projectile.js.map