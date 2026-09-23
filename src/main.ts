import { AppShell } from './app/AppShell.js';
import { MainMenuScreen } from './screens/MainMenuScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { ShipyardScreen } from './screens/ShipyardScreen.js';
import { GameScreen } from './screens/GameScreen.js';
import { ResultsScreen } from './screens/ResultsScreen.js';
import { GameModeId, MatchConfig, MatchResult } from './app/MatchConfig.js';

interface ServerSelection {
  name: string;
  httpUrl: string;
  wsUrl: string;
}

function boot(): void {
  const root = document.getElementById('app-root');
  if (!root) {
    console.error('Void Frontier: #app-root not found in DOM.');
    return;
  }
  const app = new AppShell(root);

  const showMenu = () => {
    app.show(
      new MainMenuScreen({
        onOpenShipyard: () => showShipyard(),
        onPlay: (modeId: GameModeId, server: ServerSelection | null) => showLobby(modeId, server)
      })
    );
  };

  const showShipyard = () => {
    app.show(new ShipyardScreen({ onBack: showMenu }));
  };

  const showLobby = (modeId: GameModeId, server: ServerSelection | null) => {
    app.show(
      new LobbyScreen({
        modeId,
        serverName: server?.name ?? null,
        serverWsUrl: server?.wsUrl,
        serverHttpUrl: server?.httpUrl,
        onBack: showMenu,
        onStart: (config: MatchConfig) => showGame(config)
      })
    );
  };

  const showGame = (config: MatchConfig) => {
    app.show(
      new GameScreen({
        config,
        onQuit: showMenu,
        onMatchEnd: (result: MatchResult) => showResults(config, result)
      })
    );
  };

  const showResults = (config: MatchConfig, result: MatchResult) => {
    app.show(
      new ResultsScreen({
        result,
        onMainMenu: showMenu,
        onPlayAgain: () => showGame(config)
      })
    );
  };

  showMenu();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
