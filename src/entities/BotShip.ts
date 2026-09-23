import { Ship, ShipConfig } from './Ship.js';
import { Vector2, clamp } from '../core/Vector2.js';
import { Asteroid } from '../world/Asteroid.js';
import { getBlockDef } from '../ship/BlockCatalog.js';

export type BotState =
  | 'idle'
  | 'mining'
  | 'exploring'
  | 'scouting'
  | 'pursuing'
  | 'attacking'
  | 'fleeing'
  | 'retreating'
  | 'regrouping'
  | 'assisting';

const LOW_HEALTH_RATIO = 0.3; // below this fraction of (hull+shield), consider fleeing
const RETREAT_SAFE_RATIO = 0.65; // regen to this fraction before re-engaging
const ASSIST_RANGE = 700;

/**
 * A bot with a real (if compact) decision loop: it weighs its own
 * condition, the target's condition, and nearby allies before choosing
 * what to do next, rather than unconditionally beelining the nearest
 * player. State transitions are re-evaluated every think() call, so
 * behavior adapts mid-fight (e.g. commits to fleeing once it starts
 * losing badly, rather than flip-flopping every tick).
 */
export class BotShip extends Ship {
  state: BotState = 'idle';
  private patrolTarget: Vector2;
  private readonly homeAnchor: Vector2;
  private readonly patrolRadius = 600;
  private fleeUntilRatio = RETREAT_SAFE_RATIO;
  private stateHoldTimer = 0;

  constructor(cfg: ShipConfig) {
    super(cfg);
    this.homeAnchor = cfg.position.clone();
    this.patrolTarget = this.pickPatrolPoint();
  }

  private pickPatrolPoint(): Vector2 {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * this.patrolRadius;
    return this.homeAnchor.add(Vector2.fromAngle(angle, dist));
  }

  /** Combined hull+shield survivability ratio, computed from live block HP (not a fixed stat sheet). */
  healthRatio(): number {
    let hp = 0;
    let maxHp = 0;
    for (const b of this.blueprint) {
      maxHp += getBlockDef(b.blockId).maxHp;
      hp += Math.max(0, b.hp);
    }
    const poolMax = maxHp + this.stats.maxShield;
    const poolCur = hp + this.shield;
    return poolMax > 0 ? poolCur / poolMax : 0;
  }

  /** Best (longest) weapon range among currently-attached weapon blocks, or a short default if unarmed. */
  private effectiveWeaponRange(): number {
    if (this.stats.weaponMounts.length === 0) return 260;
    return Math.max(...this.stats.weaponMounts.map((w) => w.range));
  }

  /**
   * @param enemies Ships this bot may fight (typically just the local player, but plural for future team modes).
   * @param allies  Other bots on the same side, for regroup/assist behavior.
   * @param asteroids Nearby resource nodes, for the mining behavior.
   */
  think(enemies: Ship[], allies: BotShip[], asteroids: Asteroid[], dt: number): void {
    if (!this.alive) return;
    this.stateHoldTimer = Math.max(0, this.stateHoldTimer - dt);

    const myHealth = this.healthRatio();
    const livingEnemies = enemies.filter((e) => e.alive);
    const nearestEnemy = this.nearest(livingEnemies);
    const distToEnemy = nearestEnemy ? Vector2.distance(this.position, nearestEnemy.position) : Infinity;
    const enemyVisible = nearestEnemy !== null && distToEnemy <= this.stats.radarRange;
    const weaponRange = this.effectiveWeaponRange();

    // --- Decide state ---------------------------------------------------
    if (this.state === 'fleeing' || this.state === 'retreating') {
      // Committed to disengaging until either healed up or the threat is gone/far.
      if (myHealth >= this.fleeUntilRatio || !enemyVisible) {
        this.state = 'regrouping';
        this.stateHoldTimer = 1.5;
      }
    } else if (enemyVisible && nearestEnemy) {
      const enemyHealth = this.estimateEnemyThreat(nearestEnemy);
      const outmatched = myHealth < LOW_HEALTH_RATIO || (myHealth < 0.5 && enemyHealth > myHealth + 0.25);

      if (outmatched) {
        this.state = 'fleeing';
        this.fleeUntilRatio = RETREAT_SAFE_RATIO;
      } else if (distToEnemy <= weaponRange * 0.9) {
        this.state = 'attacking';
      } else {
        this.state = 'pursuing';
      }
    } else if (this.state === 'attacking' || this.state === 'pursuing') {
      // The enemy we were engaging just died/left radar range — drop out of
      // a combat state immediately rather than waiting on stateHoldTimer,
      // since attacking/pursuing both dereference nearestEnemy below.
      this.state = 'regrouping';
      this.stateHoldTimer = 1;
    } else if (this.stateHoldTimer <= 0) {
      // No visible threat: pick a purposeful idle behavior.
      const nearAsteroid = this.nearestAsteroid(asteroids);
      const damagedAlly = allies.find(
        (a) => a.alive && a !== this && a.healthRatio() < LOW_HEALTH_RATIO && Vector2.distance(this.position, a.position) < ASSIST_RANGE
      );
      if (damagedAlly) {
        this.state = 'assisting';
      } else if (nearAsteroid && this.stats.miningRatePerSec > 0 && Math.random() < 0.5) {
        this.state = 'mining';
      } else {
        this.state = Math.random() < 0.5 ? 'exploring' : 'scouting';
      }
      this.stateHoldTimer = 2 + Math.random() * 3;
    }

    // --- Act on state -----------------------------------------------------
    switch (this.state) {
      case 'attacking': {
        if (!nearestEnemy) { this.state = 'exploring'; break; }
        const toEnemy = nearestEnemy.position.sub(this.position);
        this.targetAngle = toEnemy.angle();
        this.thrustIntent = distToEnemy < weaponRange * 0.45 ? -0.3 : 0.35;
        this.firing = this.stats.weaponMounts.length > 0;
        this.mining = false;
        break;
      }
      case 'pursuing': {
        if (!nearestEnemy) { this.state = 'exploring'; break; }
        const toEnemy = nearestEnemy.position.sub(this.position);
        this.targetAngle = toEnemy.angle();
        this.thrustIntent = 1;
        this.firing = false;
        this.mining = false;
        break;
      }
      case 'fleeing':
      case 'retreating': {
        const away = nearestEnemy ? this.position.sub(nearestEnemy.position).normalize() : Vector2.fromAngle(this.angle);
        this.targetAngle = away.angle();
        this.thrustIntent = 1;
        this.firing = false;
        this.mining = false;
        break;
      }
      case 'assisting': {
        const ally = allies.find((a) => a.alive && a !== this && a.healthRatio() < LOW_HEALTH_RATIO);
        if (ally) {
          const toAlly = ally.position.sub(this.position);
          this.targetAngle = toAlly.angle();
          this.thrustIntent = toAlly.length() > 150 ? 0.8 : 0.2;
        }
        this.firing = false;
        this.mining = false;
        break;
      }
      case 'mining': {
        const asteroid = this.nearestAsteroid(asteroids);
        if (asteroid) {
          const toAsteroid = asteroid.position.sub(this.position);
          const dist = toAsteroid.length();
          if (dist > 70) {
            this.targetAngle = toAsteroid.angle();
            this.thrustIntent = 0.5;
            this.mining = false;
          } else {
            this.thrustIntent = 0;
            this.mining = true;
          }
        } else {
          this.state = 'exploring';
        }
        this.firing = false;
        break;
      }
      case 'scouting': {
        const toTarget = this.patrolTarget.sub(this.position);
        if (toTarget.length() < 60) this.patrolTarget = this.pickPatrolPoint();
        this.targetAngle = toTarget.angle();
        this.thrustIntent = 0.75;
        this.firing = false;
        this.mining = false;
        break;
      }
      case 'regrouping': {
        const toHome = this.homeAnchor.sub(this.position);
        this.targetAngle = toHome.length() > 30 ? toHome.angle() : this.angle;
        this.thrustIntent = toHome.length() > 30 ? 0.6 : 0;
        this.firing = false;
        this.mining = false;
        break;
      }
      case 'exploring':
      case 'idle':
      default: {
        const toTarget = this.patrolTarget.sub(this.position);
        if (toTarget.length() < 40) this.patrolTarget = this.pickPatrolPoint();
        this.targetAngle = toTarget.angle();
        this.thrustIntent = 0.45;
        this.firing = false;
        this.mining = false;
        break;
      }
    }
  }

  /** Rough 0..1 "how dangerous does this enemy look" estimate from visible info only. */
  private estimateEnemyThreat(enemy: Ship): number {
    return clamp(enemy.hullRatio(), 0, 1);
  }

  private nearest(ships: Ship[]): Ship | null {
    let best: Ship | null = null;
    let bestDist = Infinity;
    for (const s of ships) {
      const d = Vector2.distance(this.position, s.position);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  private nearestAsteroid(asteroids: Asteroid[]): Asteroid | null {
    let best: Asteroid | null = null;
    let bestDist = Infinity;
    for (const a of asteroids) {
      if (a.depleted) continue;
      const d = Vector2.distance(this.position, a.position);
      if (d < bestDist && d < this.stats.radarRange) {
        bestDist = d;
        best = a;
      }
    }
    return best;
  }
}
