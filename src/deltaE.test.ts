import { deltaEOk, nearestInPalette } from './deltaE';

describe('deltaEOk', () => {
  it('with a 3-4-5 offset, returns the Euclidean distance', () => {
    const a = { L: 0.5, a: 0, b: 0 };
    const b = { L: 0.5, a: 0.3, b: 0.4 };

    const distance = deltaEOk(a, b);

    expect(distance).toBeCloseTo(0.5, 10);
  });

  it('with identical colours, returns zero', () => {
    const a = { L: 0.7, a: 0.1, b: -0.1 };

    const distance = deltaEOk(a, a);

    expect(distance).toBe(0);
  });
});

describe('nearestInPalette', () => {
  it('with a target closest to the second entry, returns index 1', () => {
    const palette = [
      { L: 0, a: 0, b: 0 },
      { L: 0.5, a: 0, b: 0 },
      { L: 1, a: 0, b: 0 },
    ];
    const target = { L: 0.6, a: 0, b: 0 };

    const index = nearestInPalette(target, palette);

    expect(index).toBe(1);
  });

  it('with two equally near entries, returns the first', () => {
    const palette = [
      { L: 0.25, a: 0, b: 0 },
      { L: 0.75, a: 0, b: 0 },
    ];
    const target = { L: 0.5, a: 0, b: 0 };

    const index = nearestInPalette(target, palette);

    expect(index).toBe(0);
  });

  it('with an empty palette, returns -1', () => {
    const target = { L: 0.5, a: 0, b: 0 };

    const index = nearestInPalette(target, []);

    expect(index).toBe(-1);
  });
});
