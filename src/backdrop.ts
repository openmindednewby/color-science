import { hexToOklab, hexToRgb, rgbToLinear } from './convert';
import { deltaEOk } from './deltaE';

const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const FLARE = 0.05;
const HALF = 0.5;

/** WCAG 2 non-text contrast floor a bead colour must reach against what sits behind it. */
export const MIN_BEAD_CONTRAST = 3;

/** Under-3:1 shares this close count as equal, and delta-E decides. */
export const BACKDROP_TIE_MARGIN = 0.01;

export interface BeadCount {
  readonly hex: string;
  readonly count: number;
}

export interface BackdropScore {
  readonly hex: string;
  readonly underShare: number;
  readonly medianDeltaE: number;
}

function luminance(hex: string): number {
  const { r, g, b } = rgbToLinear(hexToRgb(hex));
  return RED_WEIGHT * r + GREEN_WEIGHT * g + BLUE_WEIGHT * b;
}

function weightedMedian(entries: readonly { value: number; count: number }[], total: number): number {
  const sorted = [...entries].sort((x, y) => x.value - y.value);
  let seen = 0;
  for (const entry of sorted) {
    seen += entry.count;
    if (seen >= total * HALF) {return entry.value;}
  }
  return 0;
}

/** WCAG 2 contrast ratio of two hex colours, 1 to 21. */
export function contrastRatio(x: string, y: string): number {
  const lumX = luminance(x);
  const lumY = luminance(y);
  return (Math.max(lumX, lumY) + FLARE) / (Math.min(lumX, lumY) + FLARE);
}

/** Measures one backdrop against a pattern's beads, weighted by how many of each bead it uses. */
export function scoreBackdrop(beads: readonly BeadCount[], backdropHex: string): BackdropScore {
  const counted = beads.filter((bead) => bead.count > 0);
  const total = counted.reduce((sum, bead) => sum + bead.count, 0);
  if (total === 0) {return { hex: backdropHex, underShare: 0, medianDeltaE: 0 };}
  const backdrop = hexToOklab(backdropHex);
  const under = counted
    .filter((bead) => contrastRatio(bead.hex, backdropHex) < MIN_BEAD_CONTRAST)
    .reduce((sum, bead) => sum + bead.count, 0);
  const distances = counted.map((bead) => ({ value: deltaEOk(hexToOklab(bead.hex), backdrop), count: bead.count }));
  return { hex: backdropHex, underShare: under / total, medianDeltaE: weightedMedian(distances, total) };
}

/** Lowest under-3:1 share wins; inside the margin the higher median delta-E wins; first wins a tie; null when empty. */
export function pickBackdrop(
  beads: readonly BeadCount[],
  backdrops: readonly string[],
  margin: number = BACKDROP_TIE_MARGIN,
): BackdropScore | null {
  const scores = backdrops.map((hex) => scoreBackdrop(beads, hex));
  if (scores.length === 0) {return null;}
  const lowest = Math.min(...scores.map((score) => score.underShare));
  return scores
    .filter((score) => score.underShare <= lowest + margin)
    .reduce((best, score) => (score.medianDeltaE > best.medianDeltaE ? score : best));
}
