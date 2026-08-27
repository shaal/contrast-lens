# Contrast Lens

Contrast Lens is a local-first visual checker for the relationship between two colors. It combines the familiar WCAG 2 ratio with directional APCA Lc, then adds an optional blur lens so low contrast is something you can see — not just a number you have to interpret. The UI is a readable Vue 3 single-file component backed by a framework-free TypeScript contrast engine.

## What it does

- Checks WCAG 2 contrast ratio with AA and AAA states.
- Checks directional APCA 0.0.98G with body and large-type guides.
- Accepts HEX, RGB, HSL, LCH, and OKLCH input values.
- Shows a contrast ramp and three realistic samples: body, large type, and UI/graphics.
- Includes a draggable HSV contrast map with live WCAG 3, 4.5, and 7 guide lines; switch between foreground and background editing.
- Offers an optional, adjustable blur lens driven by the contrast result.
- Includes click-to-explain ELI5 help bubbles and an AA/AAA focus selector with target-specific success feedback.
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

The framework-free engine lives in [`src/lib/contrast-engine.ts`](src/lib/contrast-engine.ts). It owns parsing, sRGB conversion, luminance, WCAG, APCA, and the blur signal. The map calculations live in [`src/lib/color-map.ts`](src/lib/color-map.ts), while the Vue single-file component owns interaction state and presentation. The decisions behind the stack are recorded in [`ADR/`](ADR/).

## Cloudflare Pages

The production build is already configured for Cloudflare Pages: use `npm run build` as the build command and `dist` as the output directory. The included `wrangler.toml` also lets you deploy with Wrangler later:

```bash
npm run build
npx wrangler pages deploy dist --project-name contrast-lens
```

## Notes on the blur lens

The blur lens is intentionally a communication tool rather than a pass/fail criterion. It uses the WCAG ratio to derive a capped pressure value, and the slider lets a reviewer exaggerate or soften that signal. Always validate typography, layout, font rendering, and context in the real interface too.

## License

MIT. See [`LICENSE`](LICENSE).
