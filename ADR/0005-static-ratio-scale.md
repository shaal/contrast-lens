# ADR 0005: Use a proportional static ratio scale

- Status: accepted
- Date: 2026-08-27

## Context

The relationship section showed a decorative gradient bar with a current
marker, but its threshold labels were evenly distributed while the marker used
a linear ratio calculation. That made a passing `4.52:1` pair look like it was
before the `4.5:1` AA threshold. The bar also looked like an input even though
it was not interactive.

## Decision

Replace the bar with a static ratio scale from `1:1` to `21:1`:

- Position the `3:1`, `4.5:1`, and `7:1` ticks using the same linear ratio
  formula as the current value.
- Show the current value as a labeled pin, not a draggable knob.
- Label the scale as static and expose it as an accessible image with a
  descriptive label.
- Keep AA/AAA pass and review states in the score and focus panels, where the
  user can act on them.

## Consequences

- A ratio just above a threshold is visually just above that threshold.
- The scale communicates position without suggesting another control.
- The scale is easier to interpret at a glance, while the interactive contrast
  map remains the place to explore nearby colors.
