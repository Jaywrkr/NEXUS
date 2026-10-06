/** Foot-line of the illustrated rear buildings. Interpolate at the district exit. */
export function groundTop(x: number, height: number): number {
  const points = [[0, .64], [350, .64], [430, .54], [1100, .54], [1240, .42], [1840, .42], [1980, .28]];
  for (let i = 1; i < points.length; i++) {
    const [right, top] = points[i];
    const [left, previous] = points[i - 1];
    if (x <= right) return height * (previous + (top - previous) * Math.max(0, (x - left) / (right - left)));
  }
  return height * .28;
}
