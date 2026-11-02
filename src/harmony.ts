import {
  fitChromaToSrgb,
  hexToOklab,
  hexToRgb,
  linearToRgb,
  oklabToLinear,
  oklabToOklch,
  oklchToOklab,
  rgbToHex,
} from './convert';
import { visionDistance } from './cvd';
import type { Oklch, Rgb } from './types';

export type HarmonyCount = 2 | 3 | 4;

/** Every pair in a harmony is at least this far apart in every vision type. */
export const MIN_HARMONY_DISTANCE = 0.1;

const HUE_OFFSETS: Readonly<Record<HarmonyCount, readonly number[]>> = {
  2: [180],
  3: [120, 240],
  4: [90, 180, 270],
};

const LIGHTNESS_STEPS = 100;

interface Candidate {
  readonly rgb: Rgb;
  readonly clearance: number;
  readonly lightnessShift: number;
}

function buildCandidate(lch: Oklch, baseLightness: number, chosen: readonly Rgb[]): Candidate {
  const rgb = linearToRgb(oklabToLinear(oklchToOklab(fitChromaToSrgb(lch))));
  const distances = chosen.map((other) => visionDistance(rgb, other));
  return {
    rgb,
    clearance: Math.min(MIN_HARMONY_DISTANCE, ...distances),
    lightnessShift: Math.abs(lch.L - baseLightness),
  };
}

function pickBetter(best: Candidate, next: Candidate): Candidate {
  if (next.clearance !== best.clearance) {
    return next.clearance > best.clearance ? next : best;
  }
  return next.lightnessShift < best.lightnessShift ? next : best;
}

function pickAtHue(base: Oklch, hueOffset: number, chosen: readonly Rgb[]): Rgb {
  const candidates = Array.from({ length: LIGHTNESS_STEPS + 1 }, (_, step) =>
    buildCandidate(
      { L: step / LIGHTNESS_STEPS, C: base.C, h: base.h + hueOffset },
      base.L,
      chosen,
    ),
  );
  return candidates.reduce(pickBetter).rgb;
}

/**
 * Base colour first, then the others at fixed OKLCH hue offsets: 2 = 180, 3 = 120, 4 = 90.
 * Lightness moves as little as it can to clear MIN_HARMONY_DISTANCE; chroma only drops to fit sRGB.
 * @returns `count` lowercase `#rrggbb` values.
 */
export function harmony(baseHex: string, count: HarmonyCount): string[] {
  const base = oklabToOklch(hexToOklab(baseHex));
  const colours = HUE_OFFSETS[count].reduce<readonly Rgb[]>(
    (chosen, hueOffset) => [...chosen, pickAtHue(base, hueOffset, chosen)],
    [hexToRgb(baseHex)],
  );
  return colours.map(rgbToHex);
}
