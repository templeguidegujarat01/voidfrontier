/**
 * Fixed-timestep loop with a render interpolation alpha, decoupled from
 * display refresh rate. Keeps simulation deterministic-ish while still
 * rendering smoothly on any monitor.
 */
export class GameLoop {
    constructor(update, render, ticksPerSecond = 60, maxFrameMs = 250 // avoid spiral-of-death after tab is backgrounded
    ) {
        this.update = update;
        this.render = render;
        this.maxFrameMs = maxFrameMs;
        this.accumulator = 0;
        this.lastTime = 0;
        this.running = false;
        this.rafHandle = 0;
        this.frame = (now) => {
            if (!this.running)
                return;
            let frameTime = now - this.lastTime;
            if (frameTime > this.maxFrameMs)
                frameTime = this.maxFrameMs;
            this.lastTime = now;
            this.accumulator += frameTime;
            try {
                while (this.accumulator >= this.stepMs) {
                    this.update(this.stepMs / 1000);
                    this.accumulator -= this.stepMs;
                }
                this.render(this.accumulator / this.stepMs);
            }
            catch (err) {
                // A single bad frame should never permanently freeze the game with no
                // feedback — log it and keep the loop alive rather than letting an
                // uncaught exception silently stop requestAnimationFrame forever.
                console.error('Void Frontier: error during game loop frame, continuing:', err);
            }
            this.rafHandle = requestAnimationFrame(this.frame);
        };
        this.stepMs = 1000 / ticksPerSecond;
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        this.lastTime = performance.now();
        this.rafHandle = requestAnimationFrame(this.frame);
    }
    stop() {
        this.running = false;
        cancelAnimationFrame(this.rafHandle);
    }
}
//# sourceMappingURL=GameLoop.js.map