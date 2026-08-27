import { describe, expect, it } from 'vitest';
import { apcaContrast, contrastResult, formatColor, hexToRgb, normalizeHex, parseColor, relativeLuminance, wcagContrastRatio } from './contrast-engine';

describe('contrast engine', () => {
  const black = hexToRgb('#000')!;
  const white = hexToRgb('#fff')!;

  it('normalizes and parses short, long, and alpha hex values', () => {
    expect(normalizeHex('  #abc ')).toBe('#AABBCC');
    expect(normalizeHex('#11223380')).toBe('#112233');
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(normalizeHex('nope')).toBeNull();
  });

  it('matches the WCAG reference ratio for black and white', () => {
    expect(relativeLuminance(black)).toBe(0);
    expect(relativeLuminance(white)).toBe(1);
    expect(wcagContrastRatio(black, white)).toBe(21);
  });

  it('keeps APCA directional while producing a strong score for black on white', () => {
    const darkOnLight = apcaContrast(black, white);
    const lightOnDark = apcaContrast(white, black);
    expect(darkOnLight).toBeGreaterThan(100);
    expect(lightOnDark).toBeLessThan(-100);
    expect(darkOnLight).not.toBe(lightOnDark);
    expect(apcaContrast(hexToRgb('#715BFF')!, white)).toBe(70.8);
  });

  it('accepts the supported CSS color formats', () => {
    expect(parseColor('rgb(0 0 0)', 'RGB')).toEqual(black);
    expect(parseColor('hsl(0 100% 50%)', 'HSL')?.r).toBe(255);
    expect(parseColor('oklch(62% 0.25 29)', 'OKLCH')?.r).toBeGreaterThan(200);
    expect(parseColor('lch(50% 40 30)', 'LCH')).not.toBeNull();
    expect(formatColor(hexToRgb('#715BFF')!, 'OKLCH')).toBe('oklch(0.589 0.232 282.7)');
  });

  it('derives a readable blur signal from the WCAG ratio', () => {
    expect(contrastResult(black, white).blurPercent).toBe(0);
    expect(contrastResult(white, white).blurPercent).toBe(100);
  });
});
