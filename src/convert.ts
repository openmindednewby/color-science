import type { LinearRgb, Oklab, Oklch, Rgb } from './types';

const BYTE_MAX = 255;
const HEX_RADIX = 16;
const HEX_BYTE_WIDTH = 2;
const SHORT_HEX_LENGTH = 3;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;
const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const SRGB_ENCODED_CUTOFF = 0.04045;
const SRGB_LINEAR_CUTOFF = 0.0031308;
const SRGB_LINEAR_SLOPE = 12.92;
const SRGB_OFFSET = 0.055;
const SRGB_SCALE = 1.055;
const SRGB_GAMMA = 2.4;

const DEGREES_PER_TURN = 360;
const DEGREES_PER_HALF_TURN = 180;
const GAMUT_EPSILON = 1e-4;
const CHROMA_SEARCH_STEPS = 20;
const HALF = 0.5;

function clampByte(value: number): number {
  return Math.min(BYTE_MAX, Math.max(0, Math.round(value)));
}

function toHexByte(value: number): string {
  return clampByte(value).toString(HEX_RADIX).padStart(HEX_BYTE_WIDTH, '0');
}

function byteToLinear(byte: number): number {
  const encoded = byte / BYTE_MAX;
  return encoded <= SRGB_ENCODED_CUTOFF
    ? encoded / SRGB_LINEAR_SLOPE
    : ((encoded + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_GAMMA;
}

function linearToByte(linear: number): number {
  const encoded =
    linear <= SRGB_LINEAR_CUTOFF
      ? linear * SRGB_LINEAR_SLOPE
      : SRGB_SCALE * linear ** (1 / SRGB_GAMMA) - SRGB_OFFSET;
  return clampByte(encoded * BYTE_MAX);
}

function isUnitChannel(channel: number): boolean {
  return channel >= -GAMUT_EPSILON && channel <= 1 + GAMUT_EPSILON;
}

/** Parses `#rgb` or `#rrggbb`, any case. Throws RangeError on anything else. */
export function hexToRgb(hex: string): Rgb {
  if (!HEX_PATTERN.test(hex)) {
    throw new RangeError(`Not a hex colour: ${hex}`);
  }
  const digits = hex.slice(1);
  const full = digits.length === SHORT_HEX_LENGTH ? digits.replace(/./g, '$&$&') : digits;
  const value = parseInt(full, HEX_RADIX);
  return {
    r: (value >> RED_SHIFT) & BYTE_MAX,
    g: (value >> GREEN_SHIFT) & BYTE_MAX,
    b: value & BYTE_MAX,
  };
}

/** Formats as lowercase `#rrggbb`, rounding and clamping each channel. */
export function rgbToHex(rgb: Rgb): string {
  return `#${toHexByte(rgb.r)}${toHexByte(rgb.g)}${toHexByte(rgb.b)}`;
}

/** Decodes sRGB bytes to linear light, 0 to 1. */
export function rgbToLinear(rgb: Rgb): LinearRgb {
  return { r: byteToLinear(rgb.r), g: byteToLinear(rgb.g), b: byteToLinear(rgb.b) };
}

/** Encodes linear light to sRGB bytes, clamping anything out of gamut. */
export function linearToRgb(linear: LinearRgb): Rgb {
  return { r: linearToByte(linear.r), g: linearToByte(linear.g), b: linearToByte(linear.b) };
}

/** Converts linear sRGB to OKLab (Ottosson 2020 matrices). */
export function linearToOklab({ r, g, b }: LinearRgb): Oklab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Converts OKLab to linear sRGB, unclamped, so out-of-gamut values stay visible. */
export function oklabToLinear({ L, a, b }: Oklab): LinearRgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

/** Parses a hex colour straight to OKLab. */
export function hexToOklab(hex: string): Oklab {
  return linearToOklab(rgbToLinear(hexToRgb(hex)));
}

/** Formats OKLab as `#rrggbb`, clamping anything out of gamut. */
export function oklabToHex(lab: Oklab): string {
  return rgbToHex(linearToRgb(oklabToLinear(lab)));
}

/** Converts OKLab to OKLCH, with hue in degrees from 0 up to 360. */
export function oklabToOklch({ L, a, b }: Oklab): Oklch {
  const degrees = (Math.atan2(b, a) * DEGREES_PER_HALF_TURN) / Math.PI;
  return { L, C: Math.hypot(a, b), h: (degrees + DEGREES_PER_TURN) % DEGREES_PER_TURN };
}

/** Converts OKLCH, hue in degrees, to OKLab. */
export function oklchToOklab({ L, C, h }: Oklch): Oklab {
  const radians = (h * Math.PI) / DEGREES_PER_HALF_TURN;
  return { L, a: C * Math.cos(radians), b: C * Math.sin(radians) };
}

/** True when the colour lands inside sRGB, within a tiny rounding allowance. */
export function isInSrgbGamut(lab: Oklab): boolean {
  const { r, g, b } = oklabToLinear(lab);
  return isUnitChannel(r) && isUnitChannel(g) && isUnitChannel(b);
}

/** Lowers chroma until the colour fits sRGB; lightness and hue are kept. */
export function fitChromaToSrgb(lch: Oklch): Oklch {
  if (isInSrgbGamut(oklchToOklab(lch))) {
    return lch;
  }
  let low = 0;
  let high = lch.C;
  for (let step = 0; step < CHROMA_SEARCH_STEPS; step += 1) {
    const middle = (low + high) * HALF;
    if (isInSrgbGamut(oklchToOklab({ ...lch, C: middle }))) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return { ...lch, C: low };
}
