import { Game } from './game/Game.js';
function boot() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Void Frontier: #game-canvas not found in DOM.');
        return;
    }
    const game = new Game(canvas);
    game.start();
    // Exposed for debugging/QA only (not part of the game's runtime logic).
    window.__voidfrontier = game;
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
}
else {
    boot();
}
//# sourceMappingURL=main.js.map