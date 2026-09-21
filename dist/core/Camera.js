import { Vector2, lerp } from './Vector2.js';
export class Camera {
    constructor(viewWidth, viewHeight) {
        this.viewWidth = viewWidth;
        this.viewHeight = viewHeight;
        this.position = new Vector2(0, 0);
        /** How quickly the camera catches up to its target, per second (higher = snappier). */
        this.smoothing = 4.5;
    }
    resize(width, height) {
        this.viewWidth = width;
        this.viewHeight = height;
    }
    follow(target, dt) {
        const t = 1 - Math.exp(-this.smoothing * dt);
        this.position.x = lerp(this.position.x, target.x, t);
        this.position.y = lerp(this.position.y, target.y, t);
    }
    worldToScreen(world) {
        return new Vector2(world.x - this.position.x + this.viewWidth / 2, world.y - this.position.y + this.viewHeight / 2);
    }
    screenToWorld(screen) {
        return new Vector2(screen.x + this.position.x - this.viewWidth / 2, screen.y + this.position.y - this.viewHeight / 2);
    }
}
//# sourceMappingURL=Camera.js.map