# @dloizides/color-science

Colour maths for palettes and image work. No DOM, no React, no dependencies, so it runs in a browser, a worker, Node or React Native.

```ts
import { harmony, hexToOklab, nearestInPalette } from '@dloizides/color-science';

harmony('#c0392b', 3); // 3 lowercase hexes, base first
nearestInPalette(hexToOklab('#c0392b'), beads.map((bead) => hexToOklab(bead.hex))); // index, or -1
```

## API

| Function | Does |
|---|---|
| `hexToRgb`, `rgbToHex` | `#rgb` or `#rrggbb` to bytes (RangeError on anything else); bytes to lowercase `#rrggbb` |
| `rgbToLinear`, `linearToRgb` | sRGB bytes to and from linear light |
| `linearToOklab`, `oklabToLinear`, `hexToOklab`, `oklabToHex` | OKLab conversion, Ottosson 2020 |
| `oklabToOklch`, `oklchToOklab` | Hue in degrees, 0 up to 360 |
| `isInSrgbGamut`, `fitChromaToSrgb` | Gamut test; lowers chroma to fit, keeps lightness and hue |
| `deltaEOk` | Euclidean OKLab distance. About 0.02 is just noticeable |
| `nearestInPalette` | Index of the nearest entry; takes OKLab so a per-pixel caller converts its palette once |
| `simulateCvd` | Protanopia, deuteranopia, tritanopia (`CvdType`), Machado 2009 at full severity, in linear light |
| `visionDistance` | Smallest `deltaEOk` across normal vision and all three CVD types |
| `harmony` | 2, 3 or 4 colours from a base |

## How `harmony` picks colours

| Count | Hue offsets from the base |
|---|---|
| 2 | 180 |
| 3 | 120, 240 |
| 4 | 90, 180, 270 |

The base comes back unchanged in first place. Each other colour keeps the base chroma, lowered only when it does not fit sRGB, and takes the lightness nearest the base at which it is at least `MIN_HARMONY_DISTANCE` (0.1) from every colour already chosen, in normal vision and in all three CVD types. Same-lightness complements collapse under CVD, so the lightness is what moves.

Hue is meaningless on a grey or near-black base: those harmonies come back as a lightness ramp.

## Sources

- Bjorn Ottosson, "A perceptual color space for image processing", 2020.
- Machado, Oliveira, Fernandes, "A Physiologically-based Model for Simulation of Color Vision Deficiency", IEEE TVCG 2009.
- CSS Color Module Level 4, for `deltaEOK` and the reference OKLCH values in the tests.
