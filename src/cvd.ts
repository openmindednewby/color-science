import { linearToOklab, linearToRgb, rgbToLinear } from './convert';
import { CvdType } from './CvdType';
import { deltaEOk } from './deltaE';
import type { LinearRgb, Oklab, Rgb } from './types';

type MatrixRow = readonly [number, number, number];
type Matrix = readonly [MatrixRow, MatrixRow, MatrixRow];

const MACHADO_2009_FULL_SEVERITY: Readonly<Record<CvdType, Matrix>> = {
  [CvdType.Protanopia]: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  [CvdType.Deuteranopia]: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  [CvdType.Tritanopia]: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

const ALL_CVD_TYPES = [CvdType.Protanopia, CvdType.Deuteranopia, CvdType.Tritanopia];

function applyRow([x, y, z]: MatrixRow, { r, g, b }: LinearRgb): number {
  return x * r + y * g + z * b;
}

function toLab(rgb: Rgb): Oklab {
  return linearToOklab(rgbToLinear(rgb));
}

/** What a viewer with full dichromacy of this type sees (Machado 2009, severity 1). */
export function simulateCvd(rgb: Rgb, type: CvdType): Rgb {
  const linear = rgbToLinear(rgb);
  const [red, green, blue] = MACHADO_2009_FULL_SEVERITY[type];
  return linearToRgb({
    r: applyRow(red, linear),
    g: applyRow(green, linear),
    b: applyRow(blue, linear),
  });
}

/** Smallest deltaEOk between two colours across normal vision and all three CVD types. */
export function visionDistance(x: Rgb, y: Rgb): number {
  const normalVision = deltaEOk(toLab(x), toLab(y));
  return ALL_CVD_TYPES.reduce(
    (smallest, type) =>
      Math.min(smallest, deltaEOk(toLab(simulateCvd(x, type)), toLab(simulateCvd(y, type)))),
    normalVision,
  );
}
