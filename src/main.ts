import { Game } from './game/Game.js';

function boot(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Void Frontier: #game-canvas not found in DOM.');
    return;
  }
  const game = new Game(canvas);
  game.start();
  // Exposed for debugging/QA only (not part of the game's runtime logic).
  (window as unknown as { __voidfrontier: Game }).__voidfrontier = game;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
