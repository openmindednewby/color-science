import type { Oklab } from './types';

function squaredDistance(x: Oklab, y: Oklab): number {
  const dL = x.L - y.L;
  const da = x.a - y.a;
  const db = x.b - y.b;
  return dL * dL + da * da + db * db;
}

/** Euclidean distance in OKLab, the CSS Color 4 deltaEOK. About 0.02 is just noticeable. */
export function deltaEOk(x: Oklab, y: Oklab): number {
  return Math.sqrt(squaredDistance(x, y));
}

/** Index of the palette entry nearest the target; first wins a tie, -1 when empty. */
export function nearestInPalette(target: Oklab, palette: readonly Oklab[]): number {
  let bestIndex = -1;
  let bestDistance = Infinity;
  palette.forEach((entry, index) => {
    const distance = squaredDistance(target, entry);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}
