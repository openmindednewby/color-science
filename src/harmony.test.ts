import { hexToOklab, hexToRgb, oklabToOklch } from './convert';
import { visionDistance } from './cvd';
import { harmony, MIN_HARMONY_DISTANCE, type HarmonyCount } from './harmony';

const HUE_TOLERANCE_DEGREES = 5;
const GRID_CHANNELS = ['00', '33', '66', '99', 'cc', 'ff'];
const COUNTS: readonly HarmonyCount[] = [2, 3, 4];

function hueOf(hex: string): number {
  return oklabToOklch(hexToOklab(hex)).h;
}

function hueGap(from: number, to: number): number {
  return ((to - from) % 360 + 360) % 360;
}

function minPairDistance(colours: readonly string[]): number {
  const distances = colours.flatMap((a, i) =>
    colours.slice(i + 1).map((b) => visionDistance(hexToRgb(a), hexToRgb(b))),
  );
  return Math.min(...distances);
}

function gridOfBases(): string[] {
  return GRID_CHANNELS.flatMap((r) =>
    GRID_CHANNELS.flatMap((g) => GRID_CHANNELS.map((b) => `#${r}${g}${b}`)),
  );
}

describe('harmony', () => {
  it.each(COUNTS)('with a request for %i colours, returns that many distinct hexes', (count) => {
    const base = '#c0392b';

    const colours = harmony(base, count);

    expect(colours).toHaveLength(count);
    expect(new Set(colours).size).toBe(count);
  });

  it('with a short uppercase base, returns it normalised in first place', () => {
    const base = '#ABC';

    const colours = harmony(base, 2);

    expect(colours[0]).toBe('#aabbcc');
  });

  it.each([
    ['#c0392b', 2, [180]],
    ['#c0392b', 3, [120, 240]],
    ['#c0392b', 4, [90, 180, 270]],
    ['#2e86c1', 2, [180]],
    ['#2e86c1', 3, [120, 240]],
    ['#2e86c1', 4, [90, 180, 270]],
    ['#27ae60', 2, [180]],
    ['#27ae60', 3, [120, 240]],
    ['#27ae60', 4, [90, 180, 270]],
  ] as const)('with base %s and %i colours, holds the OKLCH hue rule', (base, count, offsets) => {
    const baseHue = hueOf(base);

    const others = harmony(base, count).slice(1);

    expect(others).toHaveLength(offsets.length);
    others.forEach((colour, i) => {
      const gap = hueGap(baseHue, hueOf(colour));
      expect(Math.abs(gap - offsets[i])).toBeLessThanOrEqual(HUE_TOLERANCE_DEGREES);
    });
  });

  it.each(COUNTS)(
    'with %i colours over a 216-colour base grid, every pair clears the CVD distance bound',
    (count) => {
      const bases = gridOfBases();

      const worst = Math.min(...bases.map((base) => minPairDistance(harmony(base, count))));

      expect(worst).toBeGreaterThanOrEqual(MIN_HARMONY_DISTANCE);
    },
  );

  it('with a malformed base, throws RangeError', () => {
    const base = 'not-a-colour';

    const act = (): unknown => harmony(base, 2);

    expect(act).toThrow(RangeError);
  });
});
