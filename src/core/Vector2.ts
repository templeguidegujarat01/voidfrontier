export class Vector2 {
  constructor(public x: number = 0, public y: number = 0) {}

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  sub(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): Vector2 {
    const len = this.length();
    if (len < 1e-6) return new Vector2(0, 0);
    return new Vector2(this.x / len, this.y / len);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  static fromAngle(angle: number, magnitude: number = 1): Vector2 {
    return new Vector2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  static distance(a: Vector2, b: Vector2): number {
    return a.sub(b).length();
  }

  static lerp(a: Vector2, b: Vector2, t: number): Vector2 {
    return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }
}

/** Shortest signed angular difference from `a` to `b`, in radians, range (-PI, PI]. */
export function angleDiff(a: number, b: number): number {
  let diff = (b - a) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
