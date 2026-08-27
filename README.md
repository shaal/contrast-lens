# Contrast Lens

Contrast Lens is a local-first visual checker for the relationship between two colors. It combines the familiar WCAG 2 ratio with directional APCA Lc, then adds an optional blur lens so low contrast is something you can see — not just a number you have to interpret.

## What it does

- Checks WCAG 2 contrast ratio with AA and AAA states.
- Checks directional APCA 0.0.98G with body and large-type guides.
- Accepts HEX, RGB, HSL, LCH, and OKLCH input values.
- Shows a contrast ramp and three realistic samples: body, large type, and UI/graphics.
- Offers an optional, adjustable blur lens driven by the contrast result.
- Keeps all calculations in the browser with no tracking or API calls.
- Includes responsive layout, keyboard focus states, reduced-motion support, unit tests, e2e tests, and a repeatable benchmark.

The visual language takes cues from the editorial, contrast-first presentation of [Color.review](https://color.review/) and the dual WCAG/APCA readout of [Atmos's contrast checker](https://atmos.style/contrast-checker). Contrast Lens is an independent implementation with its own layout, copy, and code.

## Develop

```bash
npm install
npm run start
```

Then open `http://localhost:4200`.

```bash
npm run build       # production build
npm test            # unit tests
npm run e2e         # Playwright browser tests
npm run bench       # hot-path and parser benchmark
npm run check       # build + unit + e2e gate
```

Playwright may need its browser installed once in a new environment:

```bash
npx playwright install chromium
```

## Architecture

The framework-free engine lives in [`src/app/contrast-engine.ts`](src/app/contrast-engine.ts). It owns parsing, sRGB conversion, luminance, WCAG, APCA, and the blur signal. The Angular component only owns interaction state and presentation. The decisions behind the stack are recorded in [`ADR/`](ADR/).

## Notes on the blur lens

The blur lens is intentionally a communication tool rather than a pass/fail criterion. It uses the WCAG ratio to derive a capped pressure value, and the slider lets a reviewer exaggerate or soften that signal. Always validate typography, layout, font rendering, and context in the real interface too.

## License

MIT. See [`LICENSE`](LICENSE).
