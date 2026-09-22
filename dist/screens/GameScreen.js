import { Game } from '../game/Game.js';
export class GameScreen {
    constructor(opts) {
        this.opts = opts;
        this.game = null;
        this.root = null;
        this.keyHandler = (e) => {
            if (e.key === 'Escape')
                this.togglePause();
        };
        this.paused = false;
    }
    mount(root) {
        this.root = root;
        root.innerHTML = `
      <canvas id="game-canvas"></canvas>
      <div id="hud-root">
        <div class="panel status-panel">
          <div class="stat-row">
            <span class="stat-label">HULL</span>
            <div class="bar-track"><div id="hull-bar" class="bar-fill hull-fill"></div></div>
            <span id="hull-text" class="stat-value">-- / --</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">SHIELD</span>
            <div class="bar-track"><div id="shield-bar" class="bar-fill shield-fill"></div></div>
            <span id="shield-text" class="stat-value">-- / --</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">ENERGY</span>
            <div class="bar-track"><div id="energy-bar" class="bar-fill energy-fill"></div></div>
            <span id="energy-text" class="stat-value">-- / --</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">CARGO</span>
            <div class="bar-track"><div id="cargo-bar" class="bar-fill cargo-fill"></div></div>
            <span id="cargo-text" class="stat-value">-- / --</span>
          </div>
        </div>

        <div class="panel minimap-panel">
          <canvas id="minimap" width="160" height="160"></canvas>
          <div id="net-status" class="net-status">Local</div>
        </div>

        <div class="panel module-panel">
          <div class="panel-title">SHIP CONFIGURATION</div>
          <div id="module-list"></div>
        </div>

        <div class="panel session-panel">
          <div class="panel-title">SESSION</div>
          <div class="stat-row"><span class="stat-label">Kills</span><span id="stat-kills" class="stat-value">0</span></div>
          <div class="stat-row"><span class="stat-label">Resources</span><span id="stat-resources" class="stat-value">0</span></div>
          <div class="stat-row"><span class="stat-label">Speed</span><span id="stat-speed" class="stat-value">0 u/s</span></div>
        </div>

        <div id="match-info" class="match-info"></div>
        <div id="mining-hint" class="mining-hint">EXTRACTING…</div>

        <div id="respawn-overlay" class="respawn-overlay">
          <div class="respawn-box">
            <div class="respawn-title">HULL INTEGRITY LOST</div>
            <div class="respawn-sub">Rebuilding in <span id="respawn-timer">3.0</span>s</div>
          </div>
        </div>

        <div class="controls-hint">
          <strong>Mouse</strong> steer &amp; thrust toward cursor &middot;
          <strong>Left Click</strong> fire &middot;
          <strong>E</strong> mine nearest asteroid &middot;
          <strong>Esc</strong> pause
        </div>
      </div>

      <div id="pause-overlay" class="pause-overlay" style="display:none;">
        <div class="pause-box">
          <div class="pause-title">PAUSED</div>
          <button id="pause-resume" class="menu-btn primary">Resume</button>
          <button id="pause-quit" class="menu-btn">Quit to Menu</button>
        </div>
      </div>
    `;
        const canvas = root.querySelector('#game-canvas');
        const hudRoot = root.querySelector('#hud-root');
        this.game = new Game(canvas, hudRoot, this.opts.config, {
            onMatchEnd: (result) => this.opts.onMatchEnd(result)
        });
        this.game.start();
        window.addEventListener('keydown', this.keyHandler);
        root.querySelector('#pause-resume')?.addEventListener('click', () => this.togglePause());
        root.querySelector('#pause-quit')?.addEventListener('click', () => {
            this.game?.quit();
            this.opts.onQuit();
        });
    }
    togglePause() {
        if (!this.root)
            return;
        this.paused = !this.paused;
        const overlay = this.root.querySelector('#pause-overlay');
        if (overlay)
            overlay.style.display = this.paused ? 'flex' : 'none';
        // Note: this is a UI pause (input/visual) — the underlying loop keeps
        // ticking so bots/physics don't desync from a networked server clock.
    }
    unmount() {
        window.removeEventListener('keydown', this.keyHandler);
        this.game?.quit();
        this.game = null;
    }
}
//# sourceMappingURL=GameScreen.js.map