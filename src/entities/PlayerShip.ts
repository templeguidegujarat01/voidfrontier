import { Ship, ShipConfig } from './Ship.js';
import { Input } from '../core/Input.js';
import { Camera } from '../core/Camera.js';

const STEER_DEADZONE = 18;

export class PlayerShip extends Ship {
  deaths = 0;
  resourcesCollected = 0;
  braking = false;

  constructor(cfg: ShipConfig) {
    super(cfg);
  }

  handleInput(input: Input, camera: Camera, dt: number): void {
    if (!this.alive) return;

    this.braking = input.rightMouseDown;

    if (this.braking) {
      this.thrustIntent = 0;
      this.firing = false;
    } else {
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
    }

    this.mining = input.isDown('e');
  }
}
