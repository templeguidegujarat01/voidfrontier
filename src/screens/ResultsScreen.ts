import { Screen } from '../app/Screen.js';
import { MatchResult } from '../app/MatchConfig.js';
import { Progression } from '../progression/Progression.js';

export interface ResultsOptions {
  result: MatchResult;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export class ResultsScreen implements Screen {
  mount(root: HTMLElement): void {
    const progression = new Progression();
    const award = progression.applyMatchResult({
      kills: this.opts.result.kills,
      deaths: this.opts.result.deaths,
      resourcesMined: this.opts.result.resourcesMined,
      won: this.opts.result.won
    });

    const r = this.opts.result;
    const outcomeLabel = r.won === true ? 'VICTORY' : r.won === false ? 'DEFEAT' : 'MATCH COMPLETE';
    const outcomeClass = r.won === true ? 'outcome-win' : r.won === false ? 'outcome-loss' : '';

    root.innerHTML = `
      <div class="results-screen">
        <div class="menu-backdrop"></div>
        <div class="panel results-panel">
          <div class="results-outcome ${outcomeClass}">${outcomeLabel}</div>

          <div class="results-stats">
            <div class="results-stat"><span>Kills</span><strong>${r.kills}</strong></div>
            <div class="results-stat"><span>Deaths</span><strong>${r.deaths}</strong></div>
            <div class="results-stat"><span>Resources Mined</span><strong>${r.resourcesMined}</strong></div>
            <div class="results-stat"><span>Duration</span><strong>${Math.floor(r.durationSec / 60)}:${String(r.durationSec % 60).padStart(2, '0')}</strong></div>
          </div>

          <div class="results-reward">
            <div class="results-stat"><span>XP Gained</span><strong>+${award.xpGained}</strong></div>
            <div class="results-stat"><span>Credits Gained</span><strong>+${award.creditsGained}</strong></div>
            ${award.leveledUpTo !== null ? `<div class="level-up-banner">LEVEL UP! Now level ${award.leveledUpTo}</div>` : ''}
          </div>

          <div class="results-actions">
            <button id="play-again" class="menu-btn primary wide">Play Again</button>
            <button id="main-menu" class="menu-btn wide">Main Menu</button>
          </div>
        </div>
      </div>
    `;

    root.querySelector('#play-again')?.addEventListener('click', () => this.opts.onPlayAgain());
    root.querySelector('#main-menu')?.addEventListener('click', () => this.opts.onMainMenu());
  }

  constructor(private readonly opts: ResultsOptions) {}

  unmount(): void {}
}
