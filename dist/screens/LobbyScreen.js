import { LoadoutStore } from '../loadouts/LoadoutStore.js';
const NAME_KEY = 'voidfrontier.playerName';
const MODE_LABELS = {
    practice: 'Practice',
    'frontier-ffa': 'Frontier FFA (vs Bots)',
    'local-dev-multiplayer': 'Local Multiplayer (Dev Server)'
};
export class LobbyScreen {
    constructor(opts) {
        this.opts = opts;
        this.loadoutStore = new LoadoutStore();
        this.root = null;
        this.botCount = this.opts.modeId === 'frontier-ffa' ? 6 : 4;
        this.countdownTimer = null;
        const loadouts = this.loadoutStore.list();
        this.selectedLoadoutId = loadouts[0]?.id ?? '';
    }
    mount(root) {
        this.root = root;
        const name = localStorage.getItem(NAME_KEY) || 'Pilot';
        const loadouts = this.loadoutStore.list();
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
            <label class="field-label">SHIP LOADOUT</label>
            <select id="loadout-select" class="text-input">
              ${loadouts.map((l) => `<option value="${l.id}" ${l.id === this.selectedLoadoutId ? 'selected' : ''}>${escapeHtml(l.name)}</option>`).join('')}
            </select>
            <button id="edit-loadout" class="menu-btn small">Edit in Builder</button>
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
        root.querySelector('#loadout-select')?.addEventListener('change', (e) => {
            this.selectedLoadoutId = e.target.value;
        });
        root.querySelector('#edit-loadout')?.addEventListener('click', () => this.opts.onOpenBuilder());
        root.querySelector('#bot-count')?.addEventListener('input', (e) => {
            this.botCount = Number(e.target.value);
            const label = root.querySelector('#bot-count-label');
            if (label)
                label.textContent = String(this.botCount);
        });
        root.querySelector('#lobby-back')?.addEventListener('click', () => this.opts.onBack());
        root.querySelector('#lobby-ready')?.addEventListener('click', () => this.beginCountdown());
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
        const saved = this.loadoutStore.get(this.selectedLoadoutId);
        const loadout = saved?.loadout ?? this.loadoutStore.list()[0].loadout;
        const config = {
            modeId: this.opts.modeId,
            playerName: name,
            loadout,
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