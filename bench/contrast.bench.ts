import { performance } from "node:perf_hooks";
import { buildContrastGuides } from "../src/lib/color-map";
import {
  contrastResult,
  hexToRgb,
  parseColor,
} from "../src/lib/contrast-engine";

const foreground = hexToRgb("#715BFF")!;
const background = hexToRgb("#FFFFFF")!;
const iterations = 500_000;

function measure(label: string, task: () => void, count = iterations): void {
  task();
  const start = performance.now();
  for (let index = 0; index < count; index += 1) task();
  const elapsed = performance.now() - start;
  const ops = Math.round(count / (elapsed / 1000));
  console.log(
    `${label.padEnd(25)} ${ops.toLocaleString()} ops/sec  (${elapsed.toFixed(1)} ms / ${count.toLocaleString()})`,
  );
}

console.log(
  `Contrast Lens benchmark · Node ${process.version} · ${iterations.toLocaleString()} iterations`,
);
measure("contrastResult (hot path)", () =>
  contrastResult(foreground, background),
);
measure("parse HEX", () => parseColor("#715BFF", "HEX"));
measure("parse OKLCH", () => parseColor("oklch(62% 0.25 29)", "OKLCH"));
measure(
  "contrast guides (3 lines)",
  () => buildContrastGuides("foreground", 248, background),
  1_000,
);
