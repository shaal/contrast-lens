import {
  apcaContrast,
  type RgbColor,
  wcagContrastRatio,
} from "./contrast-engine";

export interface HsvColor {
  readonly h: number;
  readonly s: number;
  readonly v: number;
}

export interface GuidePoint {
  readonly x: number;
  readonly y: number;
}

export interface ContrastGuide {
  readonly threshold: number;
  readonly points: readonly GuidePoint[];
  readonly path: string;
}

export type MapSide = "foreground" | "background";

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export function rgbToHsv(color: RgbColor): HsvColor {
  const red = clamp(color.r / 255);
  const green = clamp(color.g / 255);
  const blue = clamp(color.b / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta > 0) {
    if (max === red) hue = 60 * (((green - blue) / delta + 6) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  return {
    h: hue,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

export function hsvToRgb(color: HsvColor): RgbColor {
  const hue = ((color.h % 360) + 360) % 360;
  const saturation = clamp(color.s);
  const value = clamp(color.v);
  const chroma = value * saturation;
  const huePart = hue / 60;
  const x = chroma * (1 - Math.abs((huePart % 2) - 1));
  const [red, green, blue] =
    huePart < 1
      ? [chroma, x, 0]
      : huePart < 2
        ? [x, chroma, 0]
        : huePart < 3
          ? [0, chroma, x]
          : huePart < 4
            ? [0, x, chroma]
            : huePart < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const match = value - chroma;

  return {
    r: (red + match) * 255,
    g: (green + match) * 255,
    b: (blue + match) * 255,
  };
}

function ratioAtPosition(
  side: MapSide,
  hue: number,
  saturation: number,
  value: number,
  reference: RgbColor,
): number {
  const movingColor = hsvToRgb({ h: hue, s: saturation, v: value });
  return side === "foreground"
    ? wcagContrastRatio(movingColor, reference)
    : wcagContrastRatio(reference, movingColor);
}

function apcaAtPosition(
  side: MapSide,
  hue: number,
  saturation: number,
  value: number,
  reference: RgbColor,
): number {
  const movingColor = hsvToRgb({ h: hue, s: saturation, v: value });
  return side === "foreground"
    ? apcaContrast(movingColor, reference)
    : apcaContrast(reference, movingColor);
}

function solveMetricThreshold(
  side: MapSide,
  hue: number,
  saturation: number,
  threshold: number,
  reference: RgbColor,
  metricAtPosition: typeof ratioAtPosition,
  tolerance: number,
): number | null {
  let low = 0;
  let high = 1;
  const lowMetric = metricAtPosition(side, hue, saturation, low, reference);
  const highMetric = metricAtPosition(side, hue, saturation, high, reference);
  const minimum = Math.min(lowMetric, highMetric);
  const maximum = Math.max(lowMetric, highMetric);

  if (threshold < minimum || threshold > maximum) return null;
  if (Math.abs(lowMetric - threshold) < tolerance) return 0;
  if (Math.abs(highMetric - threshold) < tolerance) return 1;

  const increasing = highMetric > lowMetric;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const middle = (low + high) / 2;
    const middleMetric = metricAtPosition(
      side,
      hue,
      saturation,
      middle,
      reference,
    );
    if (Math.abs(middleMetric - threshold) < tolerance) return middle;

    if (increasing) {
      if (middleMetric < threshold) low = middle;
      else high = middle;
    } else if (middleMetric > threshold) low = middle;
    else high = middle;
  }

  return (low + high) / 2;
}

function solveThreshold(
  side: MapSide,
  hue: number,
  saturation: number,
  threshold: number,
  reference: RgbColor,
): number | null {
  return solveMetricThreshold(
    side,
    hue,
    saturation,
    threshold,
    reference,
    ratioAtPosition,
    0.005,
  );
}

export function buildContrastGuide(
  side: MapSide,
  hue: number,
  threshold: number,
  reference: RgbColor,
  samples = 48,
): ContrastGuide {
  const points: GuidePoint[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const x = (index / samples) * 100;
    const saturation = index / samples;
    const value = solveThreshold(side, hue, saturation, threshold, reference);
    if (value !== null) points.push({ x, y: (1 - value) * 100 });
  }

  const path = points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x},${y}`)
    .join(" ");
  return { threshold, points, path };
}

export function buildContrastGuides(
  side: MapSide,
  hue: number,
  reference: RgbColor,
  thresholds: readonly number[] = [3, 4.5, 7],
): ContrastGuide[] {
  return thresholds.map((threshold) =>
    buildContrastGuide(side, hue, threshold, reference),
  );
}

export function buildApcaGuide(
  side: MapSide,
  hue: number,
  threshold: number,
  reference: RgbColor,
  samples = 48,
): ContrastGuide {
  const points: GuidePoint[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const x = (index / samples) * 100;
    const saturation = index / samples;
    const value = solveMetricThreshold(
      side,
      hue,
      saturation,
      threshold,
      reference,
      apcaAtPosition,
      0.5,
    );
    if (value !== null) points.push({ x, y: (1 - value) * 100 });
  }

  const path = points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x},${y}`)
    .join(" ");
  return { threshold, points, path };
}

export function buildApcaGuides(
  side: MapSide,
  hue: number,
  reference: RgbColor,
  thresholds: readonly number[] = [45, 60, 75, -45, -60, -75],
): ContrastGuide[] {
  return thresholds.map((threshold) =>
    buildApcaGuide(side, hue, threshold, reference),
  );
}
