import { Screen } from '../app/Screen.js';
import { Game } from '../game/Game.js';
import { MatchConfig, MatchResult } from '../app/MatchConfig.js';
import { BlueprintTemplate } from '../ship/StarterBlueprints.js';
import { computeAggregateStats, instantiateBlueprint } from '../ship/ShipBlueprint.js';

export interface GameScreenOptions {
  config: MatchConfig;
  onMatchEnd: (result: MatchResult) => void;
  onQuit: () => void;
}

export class GameScreen implements Screen {
  private game: Game | null = null;
  private root: HTMLElement | null = null;
  private keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.togglePause();
  };
  private paused = false;

  constructor(private readonly opts: GameScreenOptions) {}

  mount(root: HTMLElement): void {
    this.root = root;
    root.innerHTML = `
      <canvas id="game-canvas"></canvas>
      <div id="hud-root">
        <div class="panel status-panel">
          <div id="evolution-label" class="evolution-label" style="display:none;"></div>
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
          <div class="panel-title">SHIP STRUCTURE</div>
          <div id="block-summary"></div>
        </div>

        <div class="panel session-panel">
          <div class="panel-title">SESSION</div>
          <div class="stat-row"><span class="stat-label">Kills</span><span id="stat-kills" class="stat-value">0</span></div>
          <div class="stat-row"><span class="stat-label">Score</span><span id="stat-score" class="stat-value">0</span></div>
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
          <strong>Mouse</strong> steer toward cursor &middot;
          <strong>Left Click</strong> fire &middot;
          <strong>Right Click</strong> brake &middot;
          <strong>E</strong> mine (close range) &middot;
          <strong>Esc</strong> pause
        </div>
      </div>

      <div id="evolution-overlay" class="modal-overlay" style="display:none;">
        <div class="modal-box evolution-box">
          <h2>EVOLUTION AVAILABLE</h2>
          <p class="fineprint">Your ship has earned enough value to evolve. Choose a path — your existing cargo and energy carry over.</p>
          <div id="evolution-choices" class="evolution-choices"></div>
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

    const canvas = root.querySelector<HTMLCanvasElement>('#game-canvas')!;
    const hudRoot = root.querySelector<HTMLElement>('#hud-root')!;

    this.game = new Game(canvas, hudRoot, this.opts.config, {
      onMatchEnd: (result) => this.opts.onMatchEnd(result),
      onEvolutionAvailable: (choices) => this.showEvolutionPicker(choices)
    });
    this.game.start();

    window.addEventListener('keydown', this.keyHandler);

    root.querySelector('#pause-resume')?.addEventListener('click', () => this.togglePause());
    root.querySelector('#pause-quit')?.addEventListener('click', () => {
      this.game?.quit();
      this.opts.onQuit();
    });
  }

  private showEvolutionPicker(choices: BlueprintTemplate[]): void {
    if (!this.root) return;
    const overlay = this.root.querySelector<HTMLElement>('#evolution-overlay');
    const container = this.root.querySelector<HTMLElement>('#evolution-choices');
    if (!overlay || !container) return;

    container.innerHTML = choices
      .map((c) => {
        const stats = computeAggregateStats(instantiateBlueprint(c.blocks));
        return `
        <button class="evolution-card" data-template="${c.id}">
          <div class="evolution-card-name">${c.name.toUpperCase()}</div>
          <div class="evolution-card-desc">${c.description}</div>
          <div class="evolution-card-stats">
            <span>Blocks: ${stats.blockCount}</span>
            <span>Mass: ${stats.mass.toFixed(0)}</span>
            <span>Weapons: ${stats.weaponMounts.length}</span>
          </div>
        </button>`;
      })
      .join('');

    container.querySelectorAll<HTMLElement>('.evolution-card').forEach((card) => {
      card.addEventListener('click', () => {
        const templateId = card.dataset.template!;
        this.game?.applyEvolution(templateId);
        overlay.style.display = 'none';
      });
    });

    overlay.style.display = 'flex';
  }

  private togglePause(): void {
    if (!this.root) return;
    this.paused = !this.paused;
    const overlay = this.root.querySelector<HTMLElement>('#pause-overlay');
    if (overlay) overlay.style.display = this.paused ? 'flex' : 'none';
  }

  unmount(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.game?.quit();
    this.game = null;
  }
}
