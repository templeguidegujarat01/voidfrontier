import { Vector2, clamp } from '../core/Vector2.js';
import { GRID_CELL_SIZE } from '../ship/BlockTypes.js';
import { getBlockDef, blockColor } from '../ship/BlockCatalog.js';
const PALETTE = {
    bg: '#0b0e19',
    bgDeep: '#05060c',
    boundary: 'rgba(255, 176, 89, 0.35)',
    star: 'rgba(226, 232, 240, 0.85)',
    asteroid: '#4b4f63',
    asteroidRim: '#7d8199',
    resourceGlow: 'rgba(94, 234, 212, 0.55)',
    playerAccent: '#5eead4',
    botAccent: '#ffb059',
    remoteAccent: '#a78bfa',
    shield: 'rgba(94, 234, 212, 0.22)',
    shieldRim: 'rgba(94, 234, 212, 0.6)',
    projectilePlayer: '#8af7e4',
    projectileBot: '#ffcf99',
    hitFlash: '#ffffff'
};
function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16)
    };
}
/** Damaged blocks visibly darken/scorch toward a burnt tone as their HP drops. */
function damageTint(hex, healthRatio) {
    const burnt = { r: 35, g: 20, b: 18 };
    const c = hexToRgb(hex);
    const t = clamp(healthRatio, 0, 1);
    const r = Math.round(burnt.r + (c.r - burnt.r) * t);
    const g = Math.round(burnt.g + (c.g - burnt.g) * t);
    const b = Math.round(burnt.b + (c.b - burnt.b) * t);
    return `rgb(${r},${g},${b})`;
}
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('Canvas2D not supported');
        this.ctx = ctx;
    }
    resize(width, height) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    clear(width, height) {
        const ctx = this.ctx;
        const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75);
        grad.addColorStop(0, PALETTE.bg);
        grad.addColorStop(1, PALETTE.bgDeep);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }
    drawStarfield(camera, stars) {
        const ctx = this.ctx;
        ctx.fillStyle = PALETTE.star;
        for (const star of stars) {
            const parallax = 0.25 + star.layer * 0.25;
            const screen = new Vector2(star.x - camera.position.x * parallax + camera.viewWidth / 2, star.y - camera.position.y * parallax + camera.viewHeight / 2);
            const wx = ((screen.x % camera.viewWidth) + camera.viewWidth) % camera.viewWidth;
            const wy = ((screen.y % camera.viewHeight) + camera.viewHeight) % camera.viewHeight;
            ctx.globalAlpha = 0.35 + star.layer * 0.25;
            ctx.beginPath();
            ctx.arc(wx, wy, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    drawWorldBounds(camera, world) {
        const ctx = this.ctx;
        const topLeft = camera.worldToScreen(new Vector2(-world.width / 2, -world.height / 2));
        ctx.save();
        ctx.strokeStyle = PALETTE.boundary;
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 10]);
        ctx.strokeRect(topLeft.x, topLeft.y, world.width, world.height);
        ctx.restore();
    }
    drawAsteroids(camera, asteroids) {
        const ctx = this.ctx;
        for (const a of asteroids) {
            if (a.depleted)
                continue;
            const screen = camera.worldToScreen(a.position);
            if (screen.x < -60 || screen.y < -60 || screen.x > camera.viewWidth + 60 || screen.y > camera.viewHeight + 60)
                continue;
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
                if (i === 0)
                    ctx.moveTo(px, py);
                else
                    ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = PALETTE.asteroid;
            ctx.fill();
            ctx.strokeStyle = PALETTE.asteroidRim;
            ctx.lineWidth = 2;
            ctx.stroke();
            const ratio = a.resource / a.maxResource;
            ctx.beginPath();
            ctx.arc(0, 0, a.radius + 6, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
            ctx.strokeStyle = PALETTE.resourceGlow;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }
    }
    drawDebris(camera, debris) {
        const ctx = this.ctx;
        for (const d of debris) {
            if (d.expired)
                continue;
            const screen = camera.worldToScreen(d.position);
            ctx.save();
            ctx.translate(screen.x, screen.y);
            ctx.fillStyle = d.color;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(-3, -3, 6, 6);
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }
    drawProjectiles(camera, projectiles) {
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
    drawShip(camera, ship, nowMs) {
        if (!ship.alive)
            return;
        const ctx = this.ctx;
        const screen = camera.worldToScreen(ship.position);
        const accent = ship.faction === 'player' ? PALETTE.playerAccent : ship.faction === 'remote' ? PALETTE.remoteAccent : PALETTE.botAccent;
        const radius = ship.approxRadius ? ship.approxRadius() : 20;
        ctx.save();
        ctx.translate(screen.x, screen.y);
        ctx.rotate(ship.angle);
        if (ship.shield > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
            ctx.fillStyle = PALETTE.shield;
            ctx.fill();
            ctx.strokeStyle = PALETTE.shieldRim;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        const hitFlash = ship.recentlyHit(nowMs);
        const blocks = ship.blueprint;
        if (blocks && blocks.length > 0) {
            const cell = GRID_CELL_SIZE;
            const size = cell * 0.86;
            for (const b of blocks) {
                if (b.hp <= 0)
                    continue;
                const def = getBlockDef(b.blockId);
                const px = b.gx * cell;
                const py = b.gy * cell;
                const healthRatio = clamp(b.hp / def.maxHp, 0, 1);
                ctx.fillStyle = hitFlash ? PALETTE.hitFlash : damageTint(blockColor(def.category), healthRatio);
                ctx.fillRect(px - size / 2, py - size / 2, size, size);
                ctx.strokeStyle = accent;
                ctx.lineWidth = 1;
                ctx.strokeRect(px - size / 2, py - size / 2, size, size);
            }
        }
        else {
            ctx.beginPath();
            ctx.moveTo(18, 0);
            ctx.lineTo(-10, 10);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-10, -10);
            ctx.closePath();
            ctx.fillStyle = hitFlash ? PALETTE.hitFlash : accent;
            ctx.fill();
        }
        ctx.restore();
        ctx.save();
        ctx.font = '11px "Space Grotesk", sans-serif';
        ctx.fillStyle = 'rgba(226,232,240,0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(ship.name, screen.x, screen.y - radius - 12);
        ctx.restore();
    }
}
//# sourceMappingURL=Renderer.js.map