import { Vector2 } from './Vector2.js';

/**
 * Tracks raw mouse/keyboard state for the local player.
 * Pure input capture — no game logic lives here.
 */
export class Input {
  readonly mouseScreen = new Vector2(0, 0);
  mouseDown = false;
  private keys = new Set<string>();
  private justPressed = new Set<string>();

  constructor(private readonly target: HTMLElement) {
    target.addEventListener('mousemove', (e) => {
      const rect = target.getBoundingClientRect();
      this.mouseScreen.x = e.clientX - rect.left;
      this.mouseScreen.y = e.clientY - rect.top;
    });
    target.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (!this.keys.has(key)) this.justPressed.add(key);
      this.keys.add(key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  /** True for exactly one update() call after the key was pressed. */
  wasPressed(key: string): boolean {
    return this.justPressed.has(key.toLowerCase());
  }

  /** Call once per simulation tick after game logic has read justPressed keys. */
  endFrame(): void {
    this.justPressed.clear();
  }
}
