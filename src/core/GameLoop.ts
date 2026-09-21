export type UpdateFn = (dt: number) => void;
export type RenderFn = (alpha: number) => void;

/**
 * Fixed-timestep loop with a render interpolation alpha, decoupled from
 * display refresh rate. Keeps simulation deterministic-ish while still
 * rendering smoothly on any monitor.
 */
export class GameLoop {
  private readonly stepMs: number;
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private rafHandle = 0;

  constructor(
    private readonly update: UpdateFn,
    private readonly render: RenderFn,
    ticksPerSecond = 60,
    private readonly maxFrameMs = 250 // avoid spiral-of-death after tab is backgrounded
  ) {
    this.stepMs = 1000 / ticksPerSecond;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafHandle = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafHandle);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    let frameTime = now - this.lastTime;
    if (frameTime > this.maxFrameMs) frameTime = this.maxFrameMs;
    this.lastTime = now;
    this.accumulator += frameTime;

    while (this.accumulator >= this.stepMs) {
      this.update(this.stepMs / 1000);
      this.accumulator -= this.stepMs;
    }

    this.render(this.accumulator / this.stepMs);
    this.rafHandle = requestAnimationFrame(this.frame);
  };
}
