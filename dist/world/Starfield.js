/** Generates a fixed, repeatable star layout for a given world size. */
export function generateStarfield(count, worldWidth, worldHeight) {
    const stars = [];
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
//# sourceMappingURL=Starfield.js.map