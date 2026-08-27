import { describe, expect, it } from "vitest";
import {
  buildContrastGuide,
  buildContrastGuides,
  hsvToRgb,
  rgbToHsv,
} from "./color-map";
import {
  apcaContrast,
  blurPercentForTarget,
  contrastResult,
  formatColor,
  hexToRgb,
  normalizeHex,
  parseColor,
  relativeLuminance,
  wcagContrastRatio,
} from "./contrast-engine";

describe("contrast engine", () => {
  const black = hexToRgb("#000")!;
  const white = hexToRgb("#fff")!;

  it("normalizes and parses short, long, and alpha hex values", () => {
    expect(normalizeHex("  #abc ")).toBe("#AABBCC");
    expect(normalizeHex("#11223380")).toBe("#112233");
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(normalizeHex("nope")).toBeNull();
  });

  it("matches the WCAG reference ratio for black and white", () => {
    expect(relativeLuminance(black)).toBe(0);
    expect(relativeLuminance(white)).toBe(1);
    expect(wcagContrastRatio(black, white)).toBe(21);
  });

  it("keeps APCA directional while producing a strong score for black on white", () => {
    const darkOnLight = apcaContrast(black, white);
    const lightOnDark = apcaContrast(white, black);
    expect(darkOnLight).toBeGreaterThan(100);
    expect(lightOnDark).toBeLessThan(-100);
    expect(darkOnLight).not.toBe(lightOnDark);
    expect(apcaContrast(hexToRgb("#715BFF")!, white)).toBe(70.8);
  });

  it("accepts the supported CSS color formats", () => {
    expect(parseColor("rgb(0 0 0)", "RGB")).toEqual(black);
    expect(parseColor("hsl(0 100% 50%)", "HSL")?.r).toBe(255);
    expect(parseColor("oklch(62% 0.25 29)", "OKLCH")?.r).toBeGreaterThan(200);
    expect(parseColor("lch(50% 40 30)", "LCH")).not.toBeNull();
    expect(formatColor(hexToRgb("#715BFF")!, "OKLCH")).toBe(
      "oklch(0.589 0.232 282.7)",
    );
  });

  it("derives a readable blur signal from the WCAG ratio", () => {
    expect(contrastResult(black, white).blurPercent).toBe(0);
    expect(contrastResult(white, white).blurPercent).toBe(100);
  });

  it("uses the selected WCAG target to decide when the lens is clear", () => {
    expect(blurPercentForTarget(1, 4.5)).toBe(100);
    expect(blurPercentForTarget(3, 4.5)).toBe(29);
    expect(blurPercentForTarget(4.5, 4.5)).toBe(0);
    expect(blurPercentForTarget(4.52, 7)).toBe(27);
    expect(blurPercentForTarget(3, 7)).toBe(55);
    expect(blurPercentForTarget(4.5, 7)).toBe(28);
    expect(blurPercentForTarget(7, 7)).toBe(0);
  });

  it("round trips the HSV coordinates used by the contrast map", () => {
    const purple = hexToRgb("#715BFF")!;
    const hsv = rgbToHsv(purple);
    const roundTrip = hsvToRgb(hsv);

    expect(hsv.h).toBeCloseTo(248, 0);
    expect(roundTrip.r).toBeCloseTo(purple.r, 5);
    expect(roundTrip.g).toBeCloseTo(purple.g, 5);
    expect(roundTrip.b).toBeCloseTo(purple.b, 5);
  });

  it("creates readable WCAG 3, 4.5, and 7 guide curves", () => {
    const guides = buildContrastGuides("foreground", 247, white);

    expect(guides.map((guide) => guide.threshold)).toEqual([3, 4.5, 7]);
    expect(guides.every((guide) => guide.path.startsWith("M"))).toBe(true);
    expect(guides.every((guide) => guide.points.length > 20)).toBe(true);
    expect(buildContrastGuide("foreground", 247, 99, white).points.length).toBe(
      0,
    );
  });
});
