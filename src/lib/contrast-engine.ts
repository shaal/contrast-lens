export type ColorFormat = 'HEX' | 'RGB' | 'HSL' | 'LCH' | 'OKLCH';

export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface ContrastResult {
  readonly ratio: number;
  readonly apca: number;
  readonly blurPercent: number;
  readonly foreground: RgbColor;
  readonly background: RgbColor;
}

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
const round = (value: number, decimals = 2): number => Number(value.toFixed(decimals));

export function normalizeHex(value: string): string | null {
  const clean = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(clean)) {
    return `#${clean.split('').map((part) => part + part).join('').toUpperCase()}`;
  }
  if (/^[\da-f]{6}$/i.test(clean)) return `#${clean.toUpperCase()}`;
  if (/^[\da-f]{8}$/i.test(clean)) return `#${clean.slice(0, 6).toUpperCase()}`;
  return null;
}

export function hexToRgb(value: string): RgbColor | null {
  const normalized = normalizeHex(value);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  };
}

export function rgbToHex(color: RgbColor): string {
  return `#${[color.r, color.g, color.b]
    .map((channel) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function parseNumber(value: string, scale = 1): number {
  const clean = value.trim();
  return clean.endsWith('%') ? (Number.parseFloat(clean) / 100) * scale : Number.parseFloat(clean);
}

function parseRgb(value: string): RgbColor | null {
  const match = value.match(/^rgba?\(\s*([^,\s]+)[,\s]+([^,\s]+)[,\s]+([^,\s/]+)/i);
  if (!match) return null;
  const channels = match.slice(1, 4).map((channel) => parseNumber(channel, 255));
  if (channels.some((channel) => Number.isNaN(channel))) return null;
  return { r: clamp(channels[0], 0, 255), g: clamp(channels[1], 0, 255), b: clamp(channels[2], 0, 255) };
}

function parseHsl(value: string): RgbColor | null {
  const match = value.match(/^hsla?\(\s*([^,\s]+)[,\s]+([^,\s]+)[,\s]+([^,\s/]+)/i);
  if (!match) return null;
  const hue = ((Number.parseFloat(match[1]) % 360) + 360) % 360;
  const saturation = clamp(parseNumber(match[2]));
  const lightness = clamp(parseNumber(match[3]));
  if ([hue, saturation, lightness].some((part) => Number.isNaN(part))) return null;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePart = hue / 60;
  const x = chroma * (1 - Math.abs((huePart % 2) - 1));
  const [r1, g1, b1] = huePart < 1 ? [chroma, x, 0] : huePart < 2 ? [x, chroma, 0] : huePart < 3 ? [0, chroma, x] : huePart < 4 ? [0, x, chroma] : huePart < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const matchValue = lightness - chroma / 2;
  return { r: (r1 + matchValue) * 255, g: (g1 + matchValue) * 255, b: (b1 + matchValue) * 255 };
}

function parsePolar(value: string, kind: 'lch' | 'oklch'): [number, number, number] | null {
  const match = value.match(new RegExp(`^${kind}\\(\\s*([^\\s]+)[,\\s]+([^\\s]+)[,\\s]+([^\\s/]+)`, 'i'));
  if (!match) return null;
  const rawLightness = Number.parseFloat(match[1]);
  const lightness = kind === 'lch' ? rawLightness / 100 : match[1].endsWith('%') ? rawLightness / 100 : rawLightness;
  const chroma = kind === 'lch' ? Number.parseFloat(match[2]) : parseNumber(match[2], 0.4);
  const hue = Number.parseFloat(match[3]);
  if ([lightness, chroma, hue].some((part) => Number.isNaN(part))) return null;
  return [lightness, chroma, hue];
}

function labToRgb(lightness: number, chroma: number, hue: number): RgbColor {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const fy = (lightness + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;
  const convert = (part: number): number => (part ** 3 > epsilon ? part ** 3 : (116 * part - 16) / kappa);
  const x = convert(fx) * 0.95047;
  const y = convert(fy);
  const z = convert(fz) * 1.08883;
  return xyzToRgb(x, y, z);
}

function oklchToRgb(lightness: number, chroma: number, hue: number): RgbColor {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return xyzToRgb(1.2270138511 * l - 0.5577999807 * m - 0.281256149 * s, -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s, -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s);
}

function xyzToRgb(x: number, y: number, z: number): RgbColor {
  const linear = [
    3.2406 * x - 1.5372 * y - 0.4986 * z,
    -0.9689 * x + 1.8758 * y + 0.0415 * z,
    0.0557 * x - 0.204 * y + 1.057 * z
  ];
  const toSrgb = (channel: number): number => (channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055) * 255;
  return { r: clamp(toSrgb(linear[0]), 0, 255), g: clamp(toSrgb(linear[1]), 0, 255), b: clamp(toSrgb(linear[2]), 0, 255) };
}

export function parseColor(value: string, format: ColorFormat): RgbColor | null {
  if (format === 'HEX') return hexToRgb(value);
  if (format === 'RGB') return parseRgb(value);
  if (format === 'HSL') return parseHsl(value);
  const polar = parsePolar(value, format.toLowerCase() as 'lch' | 'oklch');
  return polar ? format === 'LCH' ? labToRgb(polar[0] * 100, polar[1] * 150, polar[2]) : oklchToRgb(polar[0], polar[1], polar[2]) : null;
}

function linearize(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: RgbColor): number {
  return clamp(0.2126729 * linearize(color.r) + 0.7151522 * linearize(color.g) + 0.072175 * linearize(color.b));
}

export function wcagContrastRatio(foreground: RgbColor, background: RgbColor): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return round((lighter + 0.05) / (darker + 0.05), 2);
}

// APCA 0.0.98G constants. APCA is directional: foreground/background order matters.
export function apcaContrast(foreground: RgbColor, background: RgbColor): number {
  const bgY = softClamp(apcaLuminance(background));
  const txtY = softClamp(apcaLuminance(foreground));
  const delta = bgY - txtY;
  if (Math.abs(delta) < 0.0005) return 0;

  let sapc: number;
  let output: number;
  if (delta > 0) {
    sapc = (bgY ** 0.56 - txtY ** 0.57) * 1.14;
    output = sapc < 0.027 ? 0 : (sapc - 0.027) * 100;
  } else {
    sapc = (bgY ** 0.65 - txtY ** 0.62) * 1.14;
    output = sapc > -0.027 ? 0 : (sapc + 0.027) * 100;
  }
  return round(output, 1);
}

// APCA's reference implementation intentionally uses a simple 2.4 exponent
// for its perceptual lightness model, rather than WCAG's piecewise sRGB curve.
function apcaLuminance(color: RgbColor): number {
  const exponent = (channel: number): number => (channel / 255) ** 2.4;
  return 0.2126729 * exponent(color.r) + 0.7151522 * exponent(color.g) + 0.072175 * exponent(color.b);
}

function softClamp(luminance: number): number {
  return luminance > 0.022 ? luminance : luminance + (0.022 - luminance) ** 1.414;
}

export function blurPercent(ratio: number): number {
  return round(clamp(1 - (ratio - 1) / 20) ** 2 * 100, 0);
}

export function blurPercentForTarget(ratio: number, threshold: number): number {
  return ratio >= threshold ? 0 : blurPercent(ratio);
}

export function contrastResult(foreground: RgbColor, background: RgbColor): ContrastResult {
  const ratio = wcagContrastRatio(foreground, background);
  return { ratio, apca: apcaContrast(foreground, background), blurPercent: blurPercent(ratio), foreground, background };
}

export function formatColor(color: RgbColor, format: ColorFormat): string {
  if (format === 'HEX') return rgbToHex(color);
  if (format === 'RGB') return `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)})`;
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const hue = delta === 0 ? 0 : max === r ? 60 * (((g - b) / delta + 6) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
  if (format === 'HSL') return `hsl(${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%)`;
  const polar = format === 'LCH' ? rgbToLch(color) : rgbToOklch(color);
  return format === 'LCH'
    ? `lch(${polar[0].toFixed(1)}% ${polar[1].toFixed(1)} ${polar[2].toFixed(1)})`
    : `oklch(${polar[0].toFixed(3)} ${polar[1].toFixed(3)} ${polar[2].toFixed(1)})`;
}

function rgbToLch(color: RgbColor): [number, number, number] {
  const r = linearize(color.r);
  const g = linearize(color.g);
  const b = linearize(color.b);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;
  const labF = (part: number): number => part > epsilon ? Math.cbrt(part) : (kappa * part + 16) / 116;
  const fx = labF(x);
  const fy = labF(y);
  const fz = labF(z);
  const labL = 116 * fy - 16;
  const labA = 500 * (fx - fy);
  const labB = 200 * (fy - fz);
  return [labL, Math.sqrt(labA ** 2 + labB ** 2), ((Math.atan2(labB, labA) * 180) / Math.PI + 360) % 360];
}

function rgbToOklch(color: RgbColor): [number, number, number] {
  const r = linearize(color.r);
  const g = linearize(color.g);
  const b = linearize(color.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const labL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const labA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const labB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [labL, Math.sqrt(labA ** 2 + labB ** 2), ((Math.atan2(labB, labA) * 180) / Math.PI + 360) % 360];
}
