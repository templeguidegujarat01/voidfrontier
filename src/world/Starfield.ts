export interface Star {
  x: number;
  y: number;
  size: number;
  layer: number; // 0 = farthest (slowest parallax), 2 = nearest
}

/** Generates a fixed, repeatable star layout for a given world size. */
export function generateStarfield(count: number, worldWidth: number, worldHeight: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: (Math.random() - 0.5) * worldWidth * 1.5,
      y: (Math.random() - 0.5) * worldHeight * 1.5,
      size: Math.random() * 1.8 + 0.3,
      layer: Math.floor(Math.random() * 3)
    });
  }
  return stars;
}
