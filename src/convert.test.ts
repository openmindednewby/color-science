import {
  fitChromaToSrgb,
  hexToOklab,
  hexToRgb,
  isInSrgbGamut,
  oklabToHex,
  oklabToOklch,
  oklchToOklab,
  rgbToHex,
} from './convert';

describe('hexToRgb', () => {
  it('with a six-digit hex, returns its bytes', () => {
    const hex = '#102030';

    const rgb = hexToRgb(hex);

    expect(rgb).toEqual({ r: 16, g: 32, b: 48 });
  });

  it('with a three-digit uppercase hex, expands each digit', () => {
    const hex = '#ABC';

    const rgb = hexToRgb(hex);

    expect(rgb).toEqual({ r: 170, g: 187, b: 204 });
  });

  it.each(['red', '#12', '#12345', '#12345678', '102030', '#gggggg'])(
    'with the malformed value %s, throws RangeError',
    (hex) => {
      const act = (): unknown => hexToRgb(hex);

      expect(act).toThrow(RangeError);
    },
  );
});

describe('rgbToHex', () => {
  it('with fractional and out-of-range channels, rounds and clamps', () => {
    const rgb = { r: 300, g: -4, b: 15.6 };

    const hex = rgbToHex(rgb);

    expect(hex).toBe('#ff0010');
  });
});

describe('hexToOklab', () => {
  it('with white, returns lightness 1 and no chroma', () => {
    const white = '#ffffff';

    const lab = hexToOklab(white);

    expect(lab.L).toBeCloseTo(1, 4);
    expect(lab.a).toBeCloseTo(0, 4);
    expect(lab.b).toBeCloseTo(0, 4);
  });

  it('with black, returns all zeros', () => {
    const black = '#000000';

    const lab = hexToOklab(black);

    expect(lab).toEqual({ L: 0, a: 0, b: 0 });
  });

  it.each([
    ['#ff0000', 0.62796, 0.25768, 29.234],
    ['#00ff00', 0.86644, 0.29483, 142.495],
    ['#0000ff', 0.45201, 0.31321, 264.052],
  ])('with %s, matches the CSS Color 4 published OKLCH', (hex, L, C, h) => {
    const lab = hexToOklab(hex);

    const lch = oklabToOklch(lab);

    expect(lch.L).toBeCloseTo(L, 3);
    expect(lch.C).toBeCloseTo(C, 3);
    expect(lch.h).toBeCloseTo(h, 2);
  });

  it('with the low sRGB linear segment, stays ordered and positive', () => {
    const darker = '#010101';
    const lighter = '#020202';

    const lightnessGap = hexToOklab(lighter).L - hexToOklab(darker).L;

    expect(lightnessGap).toBeGreaterThan(0);
  });
});

describe('oklabToHex', () => {
  it.each(['#000000', '#010203', '#7f7f7f', '#c0392b', '#2e86c1', '#ffffff'])(
    'with the lab of %s, round-trips to the same hex',
    (hex) => {
      const lab = hexToOklab(hex);

      const roundTripped = oklabToHex(lab);

      expect(roundTripped).toBe(hex);
    },
  );
});

describe('oklabToOklch', () => {
  it('with a negative b, normalises hue into 0 to 360', () => {
    const lab = { L: 0.5, a: 0, b: -0.1 };

    const lch = oklabToOklch(lab);

    expect(lch.h).toBeCloseTo(270, 6);
    expect(lch.C).toBeCloseTo(0.1, 6);
  });
});

describe('oklchToOklab', () => {
  it('with hue 90, puts all chroma on b', () => {
    const lch = { L: 0.5, C: 0.2, h: 90 };

    const lab = oklchToOklab(lch);

    expect(lab.a).toBeCloseTo(0, 6);
    expect(lab.b).toBeCloseTo(0.2, 6);
  });
});

describe('isInSrgbGamut', () => {
  it('with a colour from sRGB, returns true', () => {
    const lab = hexToOklab('#ffffff');

    const inGamut = isInSrgbGamut(lab);

    expect(inGamut).toBe(true);
  });

  it('with chroma far beyond sRGB, returns false', () => {
    const lab = oklchToOklab({ L: 0.5, C: 0.6, h: 150 });

    const inGamut = isInSrgbGamut(lab);

    expect(inGamut).toBe(false);
  });
});

describe('fitChromaToSrgb', () => {
  it('with an in-gamut colour, returns it unchanged', () => {
    const lch = { L: 0.5, C: 0.05, h: 40 };

    const fitted = fitChromaToSrgb(lch);

    expect(fitted).toEqual(lch);
  });

  it('with an out-of-gamut colour, keeps L and h and lands chroma inside', () => {
    const lch = { L: 0.5, C: 0.6, h: 150 };

    const fitted = fitChromaToSrgb(lch);

    expect(fitted.L).toBe(0.5);
    expect(fitted.h).toBe(150);
    expect(fitted.C).toBeLessThan(0.6);
    expect(fitted.C).toBeGreaterThan(0.05);
    expect(isInSrgbGamut(oklchToOklab(fitted))).toBe(true);
  });
});
