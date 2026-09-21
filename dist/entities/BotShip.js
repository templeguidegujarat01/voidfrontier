import { Ship } from './Ship.js';
import { Vector2 } from '../core/Vector2.js';
export class BotShip extends Ship {
    constructor(cfg) {
        super(cfg);
        this.state = 'patrol';
        this.patrolRadius = 500;
        this.homeAnchor = cfg.position.clone();
        this.patrolTarget = this.pickPatrolPoint();
    }
    pickPatrolPoint() {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.patrolRadius;
        return this.homeAnchor.add(Vector2.fromAngle(angle, dist));
    }
    think(player, dt) {
        if (!this.alive)
            return;
        const distToPlayer = player && player.alive ? Vector2.distance(this.position, player.position) : Infinity;
        if (player && player.alive && distToPlayer <= this.stats.radarRange) {
            this.state = distToPlayer <= this.stats.weaponRange * 0.9 ? 'attack' : 'chase';
        }
        else {
            this.state = 'patrol';
        }
        switch (this.state) {
            case 'patrol': {
                const toTarget = this.patrolTarget.sub(this.position);
                if (toTarget.length() < 40) {
                    this.patrolTarget = this.pickPatrolPoint();
                }
                this.targetAngle = toTarget.angle();
                this.thrustIntent = 0.5;
                this.firing = false;
                break;
            }
            case 'chase': {
                const toPlayer = player.position.sub(this.position);
                this.targetAngle = toPlayer.angle();
                this.thrustIntent = 1;
                this.firing = false;
                break;
            }
            case 'attack': {
                const toPlayer = player.position.sub(this.position);
                this.targetAngle = toPlayer.angle();
                // Keep some distance rather than ramming: back off if too close.
                this.thrustIntent = distToPlayer < this.stats.weaponRange * 0.5 ? -0.3 : 0.4;
                this.firing = this.canFire();
                break;
            }
        }
        this.mining = false;
    }
}
//# sourceMappingURL=BotShip.js.map