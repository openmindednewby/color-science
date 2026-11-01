import { hexToOklab, hexToRgb } from './convert';
import { CvdType } from './CvdType';
import { simulateCvd, visionDistance } from './cvd';
import { deltaEOk } from './deltaE';

describe('simulateCvd', () => {
  it.each([
    [CvdType.Protanopia, { r: 109, g: 95, b: 0 }],
    [CvdType.Deuteranopia, { r: 163, g: 144, b: 0 }],
    [CvdType.Tritanopia, { r: 255, g: 0, b: 15 }],
  ])('with pure red and %s, matches the Machado 2009 matrix', (type, expected) => {
    const red = { r: 255, g: 0, b: 0 };

    const simulated = simulateCvd(red, type);

    expect(simulated).toEqual(expected);
  });

  it.each([CvdType.Protanopia, CvdType.Deuteranopia, CvdType.Tritanopia])(
    'with white and %s, stays white',
    (type) => {
      const white = { r: 255, g: 255, b: 255 };

      const simulated = simulateCvd(white, type);

      expect(simulated).toEqual(white);
    },
  );
});

describe('visionDistance', () => {
  it('with a pair only deuteranopia confuses, returns far less than normal-vision deltaE', () => {
    const red = '#ff0000';
    const olive = '#a39000';
    const normalVision = deltaEOk(hexToOklab(red), hexToOklab(olive));

    const worstCase = visionDistance(hexToRgb(red), hexToRgb(olive));

    expect(normalVision).toBeGreaterThan(0.2);
    expect(worstCase).toBeLessThan(0.05);
  });

  it('with black and white, returns the full lightness range', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };

    const distance = visionDistance(black, white);

    expect(distance).toBeCloseTo(1, 3);
  });
});
