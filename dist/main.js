import { AppShell } from './app/AppShell.js';
import { MainMenuScreen } from './screens/MainMenuScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { ShipyardScreen } from './screens/ShipyardScreen.js';
import { GameScreen } from './screens/GameScreen.js';
import { ResultsScreen } from './screens/ResultsScreen.js';
function boot() {
    const root = document.getElementById('app-root');
    if (!root) {
        console.error('Void Frontier: #app-root not found in DOM.');
        return;
    }
    const app = new AppShell(root);
    const showMenu = () => {
        app.show(new MainMenuScreen({
            onOpenShipyard: () => showShipyard(),
            onPlay: (modeId, server) => showLobby(modeId, server)
        }));
    };
    const showShipyard = () => {
        app.show(new ShipyardScreen({ onBack: showMenu }));
    };
    const showLobby = (modeId, server) => {
        app.show(new LobbyScreen({
            modeId,
            serverName: server?.name ?? null,
            serverWsUrl: server?.wsUrl,
            serverHttpUrl: server?.httpUrl,
            onBack: showMenu,
            onStart: (config) => showGame(config)
        }));
    };
    const showGame = (config) => {
        app.show(new GameScreen({
            config,
            onQuit: showMenu,
            onMatchEnd: (result) => showResults(config, result)
        }));
    };
    const showResults = (config, result) => {
        app.show(new ResultsScreen({
            result,
            onMainMenu: showMenu,
            onPlayAgain: () => showGame(config)
        }));
    };
    showMenu();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
}
else {
    boot();
}
//# sourceMappingURL=main.js.map