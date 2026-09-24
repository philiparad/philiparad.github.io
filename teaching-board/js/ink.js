// Dependency-free ink processing for the canvas pen tools.
// Raw samples stay on the item while rendered points are smoothed, so undo,
// backup, and later re-rendering remain deterministic.

export function smoothInk(points, strength = 0.65) {
  const source = (points || []).map(([x, y]) => [Number(x), Number(y)]);
  if (strength <= 0 || source.length < 3) return source;

  const amount = Math.max(0, Math.min(1, Number(strength) || 0));
  const radius = Math.max(1, Math.round(amount * 3));
  const passes = amount >= 0.75 ? 2 : 1;
  let result = source;

  for (let pass = 0; pass < passes; pass += 1) {
    const next = [result[0]];
    for (let i = 1; i < result.length - 1; i += 1) {
      let sx = 0;
      let sy = 0;
      let sw = 0;
      const from = Math.max(0, i - radius);
      const to = Math.min(result.length - 1, i + radius);
      for (let j = from; j <= to; j += 1) {
        const weight = 1 / (1 + Math.abs(j - i));
        sx += result[j][0] * weight;
        sy += result[j][1] * weight;
        sw += weight;
      }
      const blend = Math.min(0.72, 0.22 + amount * 0.52);
      next.push([
        result[i][0] * (1 - blend) + (sx / sw) * blend,
        result[i][1] * (1 - blend) + (sy / sw) * blend,
      ]);
    }
    if (result.length > 1) next.push(result[result.length - 1]);
    result = next;
  }

  result[0] = source[0];
  result[result.length - 1] = source[source.length - 1];
  return result;
}

export function strokePathD(points) {
  const values = points || [];
  if (!values.length) return '';
  if (values.length === 1) return `M${values[0][0]} ${values[0][1]}`;
  if (values.length === 2) return `M${values[0][0]} ${values[0][1]} L${values[1][0]} ${values[1][1]}`;

  let d = `M${values[0][0]} ${values[0][1]}`;
  // Catmull–Rom to cubic Bézier conversion keeps the stroke flowing through
  // the samples without requiring a third-party drawing dependency.
  for (let i = 0; i < values.length - 1; i += 1) {
    const p0 = values[i - 1] || values[i];
    const p1 = values[i];
    const p2 = values[i + 1];
    const p3 = values[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
}
