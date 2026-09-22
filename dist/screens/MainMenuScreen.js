import { AVAILABLE_MODES, PLANNED_MODES } from '../app/MatchConfig.js';
import { Progression } from '../progression/Progression.js';
import { LoadoutStore } from '../loadouts/LoadoutStore.js';
import { probeServer } from '../net/NetClient.js';
const NAME_KEY = 'voidfrontier.playerName';
// Original server names (see design blueprint). All currently point at the
// same local dev instance since that's the only backend that can exist in
// this environment — but each is wired as an independently-checked
// endpoint, so pointing them at real deployed instances later is a config
// change, not a rewrite.
const SERVERS = [
    { name: 'NOVA', httpUrl: 'http://localhost:8787', wsUrl: 'ws://localhost:8787/ws' },
    { name: 'HELIX', httpUrl: 'http://localhost:8787', wsUrl: 'ws://localhost:8787/ws' },
    { name: 'QUASAR', httpUrl: 'http://localhost:8787', wsUrl: 'ws://localhost:8787/ws' },
    { name: 'VANGUARD', httpUrl: 'http://localhost:8787', wsUrl: 'ws://localhost:8787/ws' },
    { name: 'ECLIPSE', httpUrl: 'http://localhost:8787', wsUrl: 'ws://localhost:8787/ws' }
];
export class MainMenuScreen {
    constructor(opts) {
        this.opts = opts;
        this.progression = new Progression();
        this.loadoutStore = new LoadoutStore();
        this.selectedServer = SERVERS[0];
        this.root = null;
    }
    mount(root) {
        this.root = root;
        const savedName = localStorage.getItem(NAME_KEY) ?? '';
        const p = this.progression.snapshot;
        root.innerHTML = `
      <div class="menu-screen">
        <div class="menu-backdrop"></div>
        <div class="menu-content">
          <header class="menu-header">
            <h1 class="game-title">VOID<span>FRONTIER</span></h1>
            <p class="game-tagline">Mine. Build. Fight. Survive the reach.</p>
          </header>

          <div class="menu-grid">
            <section class="menu-col">
              <div class="panel name-panel">
                <label for="player-name" class="field-label">PILOT NAME</label>
                <input id="player-name" class="text-input" maxlength="20" placeholder="Enter your name" value="${escapeHtml(savedName)}" />
              </div>

              <div class="panel profile-panel">
                <div class="panel-title">PROFILE</div>
                <div class="profile-row"><span>Level</span><strong>${p.level}</strong></div>
                <div class="bar-track"><div class="bar-fill xp-fill" style="width:${Math.min(100, (p.xp / this.progression.xpToNext()) * 100)}%"></div></div>
                <div class="profile-sub">${p.xp} / ${this.progression.xpToNext()} XP</div>
                <div class="profile-row"><span>Credits</span><strong>${p.credits}</strong></div>
                <div class="profile-row"><span>Lifetime Kills</span><strong>${p.lifetimeKills}</strong></div>
                <div class="profile-row"><span>Lifetime Deaths</span><strong>${p.lifetimeDeaths}</strong></div>
                <div class="profile-row"><span>Resources Mined</span><strong>${Math.floor(p.lifetimeResourcesMined)}</strong></div>
                <div class="profile-row"><span>Matches Played</span><strong>${p.matchesPlayed}</strong></div>
                <div class="profile-row"><span>Record</span><strong>${p.wins}W – ${p.losses}L</strong></div>
                <p class="fineprint">Saved to this browser only — no account backend yet.</p>
              </div>

              <button id="open-builder" class="menu-btn wide">SHIP BUILDER</button>
              <button id="how-to-play" class="menu-btn wide">HOW TO PLAY</button>
              <button id="open-settings" class="menu-btn wide">SETTINGS</button>
            </section>

            <section class="menu-col menu-col-wide">
              <div class="panel-title standalone-title">GAME MODES</div>
              <div id="mode-grid" class="mode-grid"></div>

              <div class="panel-title standalone-title">SERVERS</div>
              <div id="server-list" class="server-list"></div>
            </section>
          </div>
        </div>

        <div id="how-to-play-modal" class="modal-overlay" style="display:none;">
          <div class="modal-box">
            <h2>How To Play</h2>
            <ul class="howto-list">
              <li><strong>Mouse</strong> — steer and thrust toward the cursor</li>
              <li><strong>Left Click (hold)</strong> — fire your equipped weapon</li>
              <li><strong>E (hold)</strong> — mine the nearest asteroid in range</li>
              <li><strong>Esc</strong> — pause</li>
              <li>Your ship's stats come entirely from its equipped modules — visit the <strong>Ship Builder</strong> to change chassis, drive, weapon, shield, armor, reactor, cargo, drill, radar, and utility rig.</li>
              <li>Cargo adds mass — a full hold measurably slows you down. Extract, then decide whether to keep pushing or head back.</li>
              <li>Shields absorb damage before your hull does, and armor reduces what gets through after that.</li>
            </ul>
            <button id="close-howto" class="menu-btn primary">Close</button>
          </div>
        </div>

        <div id="settings-modal" class="modal-overlay" style="display:none;">
          <div class="modal-box">
            <h2>Settings</h2>
            <p class="fineprint">All progress is stored locally in this browser. These actions are permanent.</p>
            <button id="reset-progression" class="menu-btn danger wide">Reset Progression</button>
            <button id="reset-loadouts" class="menu-btn danger wide">Clear Saved Loadouts</button>
            <button id="close-settings" class="menu-btn wide">Close</button>
          </div>
        </div>
      </div>
    `;
        root.querySelector('#player-name')?.addEventListener('input', (e) => {
            localStorage.setItem(NAME_KEY, e.target.value);
        });
        this.renderModeGrid();
        this.renderServerList();
        root.querySelector('#open-builder')?.addEventListener('click', () => this.opts.onOpenBuilder());
        root.querySelector('#how-to-play')?.addEventListener('click', () => this.toggleModal('how-to-play-modal', true));
        root.querySelector('#close-howto')?.addEventListener('click', () => this.toggleModal('how-to-play-modal', false));
        root.querySelector('#open-settings')?.addEventListener('click', () => this.toggleModal('settings-modal', true));
        root.querySelector('#close-settings')?.addEventListener('click', () => this.toggleModal('settings-modal', false));
        root.querySelector('#reset-progression')?.addEventListener('click', () => {
            if (confirm('Reset all progression (level, XP, credits, lifetime stats)? This cannot be undone.')) {
                localStorage.removeItem('voidfrontier.progression.v1');
                this.mount(root); // re-render with fresh state
            }
        });
        root.querySelector('#reset-loadouts')?.addEventListener('click', () => {
            if (confirm('Delete all saved ship loadouts? This cannot be undone.')) {
                localStorage.removeItem('voidfrontier.loadouts.v1');
                this.mount(root);
            }
        });
    }
    toggleModal(id, show) {
        const el = this.root?.querySelector(`#${id}`);
        if (el)
            el.style.display = show ? 'flex' : 'none';
    }
    renderModeGrid() {
        const grid = this.root?.querySelector('#mode-grid');
        if (!grid)
            return;
        const all = [...AVAILABLE_MODES, ...PLANNED_MODES];
        grid.innerHTML = all
            .map((m) => `
        <div class="mode-card ${m.available ? '' : 'mode-card-disabled'}" data-mode="${m.id}">
          <div class="mode-card-name">${m.name}</div>
          <div class="mode-card-desc">${m.shortDesc}</div>
          <div class="mode-card-badge ${m.available ? 'badge-available' : 'badge-soon'}">${m.available ? 'AVAILABLE' : (m.unavailableReason ?? 'COMING SOON')}</div>
        </div>`)
            .join('');
        grid.querySelectorAll('.mode-card').forEach((card) => {
            card.addEventListener('click', () => {
                const modeId = card.dataset.mode;
                const info = all.find((m) => m.id === modeId);
                if (!info?.available)
                    return;
                this.opts.onPlay(modeId, modeId === 'local-dev-multiplayer' ? this.selectedServer : null);
            });
        });
    }
    renderServerList() {
        const list = this.root?.querySelector('#server-list');
        if (!list)
            return;
        list.innerHTML = SERVERS.map((s) => `
      <div class="server-row" data-server="${s.name}">
        <span class="server-radio ${s.name === this.selectedServer.name ? 'server-radio-selected' : ''}"></span>
        <span class="server-name">${s.name}</span>
        <span class="server-status" id="server-status-${s.name}">Checking…</span>
      </div>`).join('');
        list.querySelectorAll('.server-row').forEach((row) => {
            row.addEventListener('click', () => {
                const name = row.dataset.server;
                const server = SERVERS.find((s) => s.name === name);
                if (server) {
                    this.selectedServer = server;
                    this.renderServerList();
                }
            });
        });
        for (const s of SERVERS) {
            probeServer(s.httpUrl).then((result) => {
                const statusEl = this.root?.querySelector(`#server-status-${s.name}`);
                if (!statusEl)
                    return;
                statusEl.textContent = result.online ? `Online · ${result.players}/${result.capacity}` : 'Offline';
                statusEl.className = `server-status ${result.online ? 'server-status-online' : 'server-status-offline'}`;
            });
        }
    }
    unmount() {
        this.root = null;
    }
}
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
//# sourceMappingURL=MainMenuScreen.js.map