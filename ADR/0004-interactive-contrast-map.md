# ADR 0004: Build a focused interactive contrast map

- Status: accepted
- Date: 2026-08-27

## Context

Color.review makes contrast easier to understand by putting a draggable color
point inside a 2D color field and drawing WCAG threshold curves at 3, 4.5, and 7. Contrast Lens needs the same visual relationship while remaining a small,
readable Vue application.

We evaluated existing open-source options. `vue-accessible-color-picker` is a
useful MIT-licensed Vue picker, but it does not provide contrast curves. The
closest implementation with threshold curves,
`@markoradak/color-picker`, is React-based and would add a larger UI dependency
for one focused interaction.

## Decision

Implement the contrast map as a small Vue-native component surface backed by
framework-free functions in `src/lib/color-map.ts`:

- Use an HSV field: horizontal movement changes saturation and vertical
  movement changes value.
- Use a hue range input below the field.
- Let users switch between editing the foreground and background color.
- Draw live WCAG 3, 4.5, and 7 guide curves by solving the contrast ratio at
  sampled saturation positions.
- Support pointer dragging and keyboard arrows on the color knob.

## Consequences

- The interaction matches the useful mental model from Color.review without
  copying its implementation or visual identity.
- The curve math is deterministic, unit-testable, and has no rendering
  dependency.
- The map adds a small amount of custom interaction code, but avoids a React
  compatibility layer and keeps the Vue source easy to read.
- The guide curves represent WCAG ratio thresholds only; APCA remains visible
  in the score panel and is not implied by these lines.
