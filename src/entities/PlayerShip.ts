import { Ship, ShipConfig } from './Ship.js';
import { Vector2 } from '../core/Vector2.js';
import { Input } from '../core/Input.js';
import { Camera } from '../core/Camera.js';

/** World-space distance from the ship inside which it coasts to a stop rather than jittering. */
const STEER_DEADZONE = 18;

export class PlayerShip extends Ship {
  deaths = 0;
  resourcesCollected = 0;

  constructor(cfg: ShipConfig) {
    super(cfg);
  }

  /** Reads raw input each tick and converts it into thrust/steer/fire intent. */
  handleInput(input: Input, camera: Camera, dt: number): void {
    if (!this.alive) return;

    const mouseWorld = camera.screenToWorld(input.mouseScreen);
    const toMouse = mouseWorld.sub(this.position);
    const dist = toMouse.length();

    if (dist > STEER_DEADZONE) {
      this.targetAngle = toMouse.angle();
      this.thrustIntent = 1;
    } else {
      this.thrustIntent = 0;
    }

    this.firing = input.mouseDown;
    this.mining = input.isDown('e');
  }
}
