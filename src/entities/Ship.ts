import { Vector2, clamp, angleDiff } from '../core/Vector2.js';
import { ShipLoadout } from '../ship/ModuleTypes.js';
import { computeShipStats, ShipStats } from '../ship/ShipStats.js';

export type Faction = 'player' | 'bot' | 'remote';

export interface ShipConfig {
  faction: Faction;
  loadout: ShipLoadout;
  position: Vector2;
  name: string;
}

let nextShipId = 1;

/**
 * Shared physics + resource-pool logic for any ship (player or bot).
 * Movement/weapon *intent* is set by subclasses each tick via
 * `thrustIntent`, `targetAngle`, and `firing`; this class only resolves it.
 */
export abstract class Ship {
  readonly id = nextShipId++;
  readonly faction: Faction;
  name: string;

  position: Vector2;
  velocity = new Vector2(0, 0);
  angle = 0; // radians, 0 = facing +x

  loadout: ShipLoadout;
  stats: ShipStats;

  hull: number;
  shield: number;
  energy: number;
  cargo = 0;

  alive = true;
  respawnTimer = 0;
  kills = 0;

  /** -1..1, how hard to thrust forward this tick (set by controller). */
  thrustIntent = 0;
  /** Desired facing angle this tick (set by controller). */
  targetAngle = 0;
  firing = false;
  mining = false;

  private weaponCooldownRemainingMs = 0;
  private lastHitFlashMs = 0;

  constructor(cfg: ShipConfig) {
    this.faction = cfg.faction;
    this.name = cfg.name;
    this.position = cfg.position.clone();
    this.loadout = cfg.loadout;
    this.stats = computeShipStats(cfg.loadout);
    this.hull = this.stats.maxHull;
    this.shield = this.stats.maxShield;
    this.energy = this.stats.maxEnergy;
    this.angle = 0;
    this.targetAngle = 0;
  }

  /** Recompute derived stats after a loadout change (module swap). */
  refreshStats(): void {
    const prevMaxHull = this.stats.maxHull;
    const prevMaxShield = this.stats.maxShield;
    const prevMaxEnergy = this.stats.maxEnergy;
    this.stats = computeShipStats(this.loadout);
    // Preserve current fill ratio rather than clamping to a possibly-lower max abruptly.
    this.hull = prevMaxHull > 0 ? (this.hull / prevMaxHull) * this.stats.maxHull : this.stats.maxHull;
    this.shield = prevMaxShield > 0 ? (this.shield / prevMaxShield) * this.stats.maxShield : this.stats.maxShield;
    this.energy = prevMaxEnergy > 0 ? (this.energy / prevMaxEnergy) * this.stats.maxEnergy : this.stats.maxEnergy;
  }

  get cargoMassPenalty(): number {
    // Cargo fill adds effective mass drag, per the design blueprint's
    // "fuller hold = heavier, slower ship" trade-off.
    if (this.stats.cargoCapacity <= 0) return 1;
    const fillRatio = clamp(this.cargo / this.stats.cargoCapacity, 0, 1);
    return 1 - fillRatio * 0.35; // up to 35% speed penalty at full cargo
  }

  canFire(): boolean {
    return this.weaponCooldownRemainingMs <= 0 && this.energy >= this.stats.weaponEnergyCost;
  }

  consumeFireCost(): void {
    this.energy = Math.max(0, this.energy - this.stats.weaponEnergyCost);
    this.weaponCooldownRemainingMs = this.stats.weaponCooldownMs;
  }

  takeDamage(rawDamage: number, nowMs: number): void {
    let remaining = rawDamage;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
    }
    if (remaining > 0) {
      const reduced = remaining * (1 - this.stats.damageReduction);
      this.hull -= reduced;
    }
    this.lastHitFlashMs = nowMs;
    if (this.hull <= 0) {
      this.hull = 0;
      this.alive = false;
      this.respawnTimer = 3; // seconds
    }
  }

  recentlyHit(nowMs: number, windowMs = 250): boolean {
    return nowMs - this.lastHitFlashMs < windowMs;
  }

  update(dt: number): void {
    if (!this.alive) {
      this.respawnTimer -= dt;
      return;
    }

    // --- Rotation: turn toward targetAngle at turnRate, shortest path.
    const diff = angleDiff(this.angle, this.targetAngle);
    const maxTurn = this.stats.turnRate * dt;
    this.angle += clamp(diff, -maxTurn, maxTurn);

    // --- Thrust: accelerate forward along facing direction.
    const cargoFactor = this.cargoMassPenalty;
    if (this.thrustIntent !== 0) {
      const accel = Vector2.fromAngle(this.angle, this.stats.thrust * this.thrustIntent * cargoFactor);
      this.velocity = this.velocity.add(accel.scale(dt));
    }

    // --- Drag so the ship coasts to a stop rather than sliding forever.
    const drag = 0.9;
    this.velocity = this.velocity.scale(Math.pow(drag, dt * 60));

    // --- Clamp to effective top speed (reduced by cargo fill).
    const maxSpeed = this.stats.topSpeed * cargoFactor;
    const speed = this.velocity.length();
    if (speed > maxSpeed) {
      this.velocity = this.velocity.normalize().scale(maxSpeed);
    }

    this.position = this.position.add(this.velocity.scale(dt));

    // --- Weapon cooldown.
    if (this.weaponCooldownRemainingMs > 0) {
      this.weaponCooldownRemainingMs -= dt * 1000;
    }

    // --- Shield regen (only when not actively taking hits this tick is a
    // nice-to-have; kept simple: always regen while below max).
    if (this.shield < this.stats.maxShield) {
      const drainOk = this.energy > 0;
      if (drainOk) {
        this.shield = Math.min(this.stats.maxShield, this.shield + this.stats.shieldRegenPerSec * dt);
        this.energy = Math.max(0, this.energy - this.stats.shieldEnergyDrainPerSec * dt);
      }
    }

    // --- Passive utility repair.
    if (this.stats.repairPerSec > 0 && this.hull < this.stats.maxHull && this.energy > 0) {
      this.hull = Math.min(this.stats.maxHull, this.hull + this.stats.repairPerSec * dt);
      this.energy = Math.max(0, this.energy - this.stats.utilityEnergyCostPerSec * dt);
    }

    // --- Passive energy regen.
    this.energy = Math.min(this.stats.maxEnergy, this.energy + this.stats.energyRegenPerSec * dt);
  }

  respawn(at: Vector2): void {
    this.position = at.clone();
    this.velocity = new Vector2(0, 0);
    this.hull = this.stats.maxHull;
    this.shield = this.stats.maxShield;
    this.energy = this.stats.maxEnergy;
    this.alive = true;
  }
}
