import { contrastRatio, pickBackdrop, scoreBackdrop } from './backdrop';

describe('contrastRatio', () => {
  it('with black on white, returns 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('with the arguments swapped, returns the same ratio', () => {
    expect(contrastRatio('#343434', '#C8C8C8')).toBeCloseTo(contrastRatio('#C8C8C8', '#343434'), 10);
  });

  it('with mid grey on white, returns the WCAG published 4.54', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });
});

describe('scoreBackdrop', () => {
  it('counts the share of beads under 3:1, weighted by bead count', () => {
    const beads = [
      { hex: '#FFFFFF', count: 30 },
      { hex: '#000000', count: 10 },
    ];

    const score = scoreBackdrop(beads, '#FFFFFF');

    expect(score.underShare).toBeCloseTo(0.75, 10);
  });

  it('returns the median delta-E of the beads, weighted by bead count', () => {
    const beads = [
      { hex: '#FFFFFF', count: 1 },
      { hex: '#000000', count: 3 },
    ];

    const score = scoreBackdrop(beads, '#FFFFFF');

    expect(score.medianDeltaE).toBeCloseTo(1, 5);
  });

  it('with no beads, returns a zero score', () => {
    const score = scoreBackdrop([], '#FFFFFF');

    expect(score).toEqual({ hex: '#FFFFFF', underShare: 0, medianDeltaE: 0 });
  });

  it('with a zero-count bead only, returns a zero score', () => {
    const score = scoreBackdrop([{ hex: '#000000', count: 0 }], '#FFFFFF');

    expect(score.underShare).toBe(0);
  });
});

describe('pickBackdrop', () => {
  it('with pale beads, picks the dark backdrop', () => {
    const beads = [{ hex: '#F0F0F0', count: 100 }];

    const picked = pickBackdrop(beads, ['#FFFFFF', '#000000']);

    expect(picked?.hex).toBe('#000000');
  });

  it('with dark beads, picks the light backdrop', () => {
    const beads = [{ hex: '#101010', count: 100 }];

    const picked = pickBackdrop(beads, ['#000000', '#FFFFFF']);

    expect(picked?.hex).toBe('#FFFFFF');
  });

  it('with under-3:1 shares inside the margin, picks the higher delta-E', () => {
    const beads = [
      { hex: '#5C5C5C', count: 99 },
      { hex: '#FFFFFF', count: 1 },
    ];

    const picked = pickBackdrop(beads, ['#000000', '#FFFFFF'], 0.02);

    expect(picked?.hex).toBe('#FFFFFF');
  });

  it('with the same beads and no margin, picks the lower share', () => {
    const beads = [
      { hex: '#5C5C5C', count: 99 },
      { hex: '#FFFFFF', count: 1 },
    ];

    const picked = pickBackdrop(beads, ['#000000', '#FFFFFF'], 0);

    expect(picked?.hex).toBe('#000000');
  });

  it('with a share lower by more than the margin, ignores delta-E', () => {
    const beads = [
      { hex: '#FFFFFF', count: 90 },
      { hex: '#000000', count: 10 },
    ];

    const picked = pickBackdrop(beads, ['#000000', '#FFFFFF'], 0.01);

    expect(picked?.hex).toBe('#000000');
  });

  it('with an exact tie, keeps the first backdrop in the list', () => {
    const beads = [{ hex: '#000000', count: 5 }];

    const picked = pickBackdrop(beads, ['#FFFFFF', '#ffffff']);

    expect(picked?.hex).toBe('#FFFFFF');
  });

  it('with no backdrops, returns null', () => {
    expect(pickBackdrop([{ hex: '#000000', count: 1 }], [])).toBeNull();
  });
});
