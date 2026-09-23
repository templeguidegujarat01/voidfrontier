import { TIER1_TEMPLATES } from '../ship/StarterBlueprints.js';
import { computeAggregateStats, instantiateBlueprint } from '../ship/ShipBlueprint.js';
const NAME_KEY = 'voidfrontier.playerName';
const MODE_LABELS = {
    practice: 'Practice',
    'frontier-ffa': 'Frontier FFA (vs Bots)',
    'local-dev-multiplayer': 'Local Multiplayer (Dev Server)'
};
export class LobbyScreen {
    constructor(opts) {
        this.opts = opts;
        this.root = null;
        this.botCount = this.opts.modeId === 'frontier-ffa' ? 6 : 4;
        this.selectedTemplateId = TIER1_TEMPLATES[0].id;
        this.countdownTimer = null;
    }
    mount(root) {
        this.root = root;
        const name = localStorage.getItem(NAME_KEY) || 'Pilot';
        const showBots = this.opts.modeId !== 'local-dev-multiplayer';
        const showKillTarget = this.opts.modeId === 'frontier-ffa';
        root.innerHTML = `
      <div class="lobby-screen">
        <div class="menu-backdrop"></div>
        <div class="panel lobby-panel">
          <div class="panel-title standalone-title">MATCH LOBBY</div>

          <div class="lobby-row"><span>Mode</span><strong>${MODE_LABELS[this.opts.modeId]}</strong></div>
          <div class="lobby-row"><span>Server</span><strong>${this.opts.serverName ?? 'Local'}</strong></div>
          <div class="lobby-row"><span>Pilot</span><strong>${escapeHtml(name)}</strong></div>
          ${showKillTarget ? '<div class="lobby-row"><span>Win Condition</span><strong>First to 10 kills, or 5:00 clock</strong></div>' : ''}

          <div class="lobby-field">
            <label class="field-label">STARTER SHIP (TIER 1)</label>
            <div id="starter-choices" class="starter-choices"></div>
          </div>

          ${showBots
            ? `<div class="lobby-field">
              <label class="field-label">BOT COUNT: <span id="bot-count-label">${this.botCount}</span></label>
              <input id="bot-count" type="range" min="0" max="12" value="${this.botCount}" class="range-input" />
            </div>`
            : `<p class="fineprint">Bot count isn't configurable here — combat sync with the server isn't implemented yet, so this session shows local bots at a fixed count alongside any connected players (movement-only).</p>`}

          <div class="lobby-players">
            <div class="panel-title">CURRENT PLAYERS</div>
            <div class="lobby-player-row">${escapeHtml(name)} <span class="you-tag">YOU</span></div>
          </div>

          <div id="countdown-display" class="countdown-display" style="display:none;"></div>

          <div class="lobby-actions">
            <button id="lobby-back" class="menu-btn">Back</button>
            <button id="lobby-ready" class="menu-btn primary wide">READY</button>
          </div>
        </div>
      </div>
    `;
        this.renderStarterChoices();
        root.querySelector('#bot-count')?.addEventListener('input', (e) => {
            this.botCount = Number(e.target.value);
            const label = root.querySelector('#bot-count-label');
            if (label)
                label.textContent = String(this.botCount);
        });
        root.querySelector('#lobby-back')?.addEventListener('click', () => this.opts.onBack());
        root.querySelector('#lobby-ready')?.addEventListener('click', () => this.beginCountdown());
    }
    renderStarterChoices() {
        const container = this.root?.querySelector('#starter-choices');
        if (!container)
            return;
        container.innerHTML = TIER1_TEMPLATES.map((t) => {
            const stats = computeAggregateStats(instantiateBlueprint(t.blocks));
            const selected = t.id === this.selectedTemplateId;
            return `
        <button class="starter-card ${selected ? 'starter-card-selected' : ''}" data-template="${t.id}">
          <div class="starter-card-name">${t.name}</div>
          <div class="starter-card-desc">${t.description}</div>
          <div class="starter-card-stats">
            <span>${stats.blockCount} blocks</span>
            <span>${stats.weaponMounts.length} weapons</span>
            <span>${stats.miningRatePerSec.toFixed(0)} mine/s</span>
          </div>
        </button>`;
        }).join('');
        container.querySelectorAll('.starter-card').forEach((card) => {
            card.addEventListener('click', () => {
                this.selectedTemplateId = card.dataset.template;
                this.renderStarterChoices();
            });
        });
    }
    beginCountdown() {
        const readyBtn = this.root?.querySelector('#lobby-ready');
        const display = this.root?.querySelector('#countdown-display');
        if (readyBtn)
            readyBtn.disabled = true;
        if (display)
            display.style.display = 'block';
        let n = 3;
        const tick = () => {
            if (display)
                display.textContent = n > 0 ? String(n) : 'GO!';
            if (n <= 0) {
                if (this.countdownTimer !== null)
                    window.clearTimeout(this.countdownTimer);
                this.launch();
                return;
            }
            n -= 1;
            this.countdownTimer = window.setTimeout(tick, 800);
        };
        tick();
    }
    launch() {
        const name = localStorage.getItem(NAME_KEY) || 'Pilot';
        const config = {
            modeId: this.opts.modeId,
            playerName: name,
            starterBlueprintId: this.selectedTemplateId,
            botCount: this.opts.modeId === 'local-dev-multiplayer' ? 3 : this.botCount,
            killTarget: this.opts.modeId === 'frontier-ffa' ? 10 : null,
            timeLimitSec: this.opts.modeId === 'frontier-ffa' ? 300 : null,
            serverWsUrl: this.opts.serverWsUrl,
            serverHttpUrl: this.opts.serverHttpUrl
        };
        this.opts.onStart(config);
    }
    unmount() {
        if (this.countdownTimer !== null)
            window.clearTimeout(this.countdownTimer);
        this.root = null;
    }
}
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
//# sourceMappingURL=LobbyScreen.js.map