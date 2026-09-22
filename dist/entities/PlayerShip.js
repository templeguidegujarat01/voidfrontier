import { Ship } from './Ship.js';
/** World-space distance from the ship inside which it coasts to a stop rather than jittering. */
const STEER_DEADZONE = 18;
export class PlayerShip extends Ship {
    constructor(cfg) {
        super(cfg);
        this.deaths = 0;
        this.resourcesCollected = 0;
    }
    /** Reads raw input each tick and converts it into thrust/steer/fire intent. */
    handleInput(input, camera, dt) {
        if (!this.alive)
            return;
        const mouseWorld = camera.screenToWorld(input.mouseScreen);
        const toMouse = mouseWorld.sub(this.position);
        const dist = toMouse.length();
        if (dist > STEER_DEADZONE) {
            this.targetAngle = toMouse.angle();
            this.thrustIntent = 1;
        }
        else {
            this.thrustIntent = 0;
        }
        this.firing = input.mouseDown;
        this.mining = input.isDown('e');
    }
}
//# sourceMappingURL=PlayerShip.js.map