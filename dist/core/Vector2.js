export class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    clone() {
        return new Vector2(this.x, this.y);
    }
    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    sub(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    scale(s) {
        return new Vector2(this.x * s, this.y * s);
    }
    length() {
        return Math.hypot(this.x, this.y);
    }
    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }
    normalize() {
        const len = this.length();
        if (len < 1e-6)
            return new Vector2(0, 0);
        return new Vector2(this.x / len, this.y / len);
    }
    angle() {
        return Math.atan2(this.y, this.x);
    }
    static fromAngle(angle, magnitude = 1) {
        return new Vector2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
    }
    static distance(a, b) {
        return a.sub(b).length();
    }
    /** Closest point on segment [a, b] to `point` — the actual impact location for a swept collision, not just wherever the projectile ended up this tick. */
    static closestPointOnSegment(point, a, b) {
        const ab = b.sub(a);
        const lengthSq = ab.lengthSq();
        if (lengthSq < 1e-9)
            return a;
        const t = clamp(point.sub(a).x * ab.x + point.sub(a).y * ab.y, 0, lengthSq) / lengthSq;
        return a.add(ab.scale(t));
    }
    /** Shortest distance from `point` to the line segment [a, b] — used for swept collision checks so fast-moving objects can't skip over a small target between two discrete ticks. */
    static distanceToSegment(point, a, b) {
        return Vector2.distance(point, Vector2.closestPointOnSegment(point, a, b));
    }
    static lerp(a, b, t) {
        return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    }
}
/** Shortest signed angular difference from `a` to `b`, in radians, range (-PI, PI]. */
export function angleDiff(a, b) {
    let diff = (b - a) % (Math.PI * 2);
    if (diff < -Math.PI)
        diff += Math.PI * 2;
    if (diff > Math.PI)
        diff -= Math.PI * 2;
    return diff;
}
export function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
//# sourceMappingURL=Vector2.js.map