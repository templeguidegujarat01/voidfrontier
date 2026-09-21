import { Camera } from '../core/Camera.js';
import { World } from '../world/World.js';
import { Ship } from '../entities/Ship.js';
import { Projectile } from '../entities/Projectile.js';
import { Vector2 } from '../core/Vector2.js';

const PALETTE = {
  bg: '#0b0e19',
  bgDeep: '#05060c',
  gridLine: 'rgba(94, 234, 212, 0.05)',
  boundary: 'rgba(255, 176, 89, 0.35)',
  star: 'rgba(226, 232, 240, 0.85)',
  asteroid: '#4b4f63',
  asteroidRim: '#7d8199',
  resourceGlow: 'rgba(94, 234, 212, 0.55)',
  playerHull: '#5eead4',
  playerAccent: '#e8fffb',
  botHull: '#ffb059',
  botAccent: '#fff3e6',
  shield: 'rgba(94, 234, 212, 0.28)',
  shieldRim: 'rgba(94, 234, 212, 0.65)',
  projectilePlayer: '#8af7e4',
  projectileBot: '#ffcf99',
  hitFlash: 'rgba(255, 255, 255, 0.85)'
};

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas2D not supported');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clear(width: number, height: number): void {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    grad.addColorStop(0, PALETTE.bg);
    grad.addColorStop(1, PALETTE.bgDeep);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  drawStarfield(camera: Camera, stars: { x: number; y: number; size: number; layer: number }[]): void {
    const ctx = this.ctx;
    ctx.fillStyle = PALETTE.star;
    for (const star of stars) {
      const parallax = 0.25 + star.layer * 0.25;
      const screen = new Vector2(
        star.x - camera.position.x * parallax + camera.viewWidth / 2,
        star.y - camera.position.y * parallax + camera.viewHeight / 2
      );
      // Wrap stars around the viewport so the field feels infinite.
      const wx = ((screen.x % camera.viewWidth) + camera.viewWidth) % camera.viewWidth;
      const wy = ((screen.y % camera.viewHeight) + camera.viewHeight) % camera.viewHeight;
      ctx.globalAlpha = 0.35 + star.layer * 0.25;
      ctx.beginPath();
      ctx.arc(wx, wy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawWorldBounds(camera: Camera, world: World): void {
    const ctx = this.ctx;
    const topLeft = camera.worldToScreen(new Vector2(-world.width / 2, -world.height / 2));
    ctx.save();
    ctx.strokeStyle = PALETTE.boundary;
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(topLeft.x, topLeft.y, world.width, world.height);
    ctx.restore();
  }

  drawAsteroids(camera: Camera, asteroids: { position: Vector2; radius: number; resource: number; maxResource: number; shapeSeed: number; depleted: boolean }[]): void {
    const ctx = this.ctx;
    for (const a of asteroids) {
      if (a.depleted) continue;
      const screen = camera.worldToScreen(a.position);
      if (screen.x < -60 || screen.y < -60 || screen.x > camera.viewWidth + 60 || screen.y > camera.viewHeight + 60) continue;

      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i <= spikes; i++) {
        const t = (i / spikes) * Math.PI * 2;
        const wobble = 1 + 0.12 * Math.sin(t * 3 + a.shapeSeed);
        const r = a.radius * wobble;
        const px = Math.cos(t) * r;
        const py = Math.sin(t) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = PALETTE.asteroid;
      ctx.fill();
      ctx.strokeStyle = PALETTE.asteroidRim;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Resource fill ring.
      const ratio = a.resource / a.maxResource;
      ctx.beginPath();
      ctx.arc(0, 0, a.radius + 6, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
      ctx.strokeStyle = PALETTE.resourceGlow;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawProjectiles(camera: Camera, projectiles: Projectile[]): void {
    const ctx = this.ctx;
    for (const p of projectiles) {
      const screen = camera.worldToScreen(p.position);
      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate(p.velocity.angle());
      ctx.fillStyle = p.owner === 'player' ? PALETTE.projectilePlayer : PALETTE.projectileBot;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawShip(camera: Camera, ship: Ship, nowMs: number): void {
    if (!ship.alive) return;
    const ctx = this.ctx;
    const screen = camera.worldToScreen(ship.position);
    const hullColor = ship.faction === 'player' ? PALETTE.playerHull : PALETTE.botHull;
    const accentColor = ship.faction === 'player' ? PALETTE.playerAccent : PALETTE.botAccent;

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(ship.angle);

    // Shield bubble.
    if (ship.shield > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.shield;
      ctx.fill();
      ctx.strokeStyle = PALETTE.shieldRim;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Original geometric kite-shaped hull (deliberately not a generic "sci-fi fighter" silhouette).
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.fillStyle = ship.recentlyHit(nowMs) ? PALETTE.hitFlash : hullColor;
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Engine glow.
    ctx.beginPath();
    ctx.arc(-8, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.restore();

    // Nameplate.
    ctx.save();
    ctx.font = '11px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(226,232,240,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText(ship.name, screen.x, screen.y - 28);
    ctx.restore();
  }
}
