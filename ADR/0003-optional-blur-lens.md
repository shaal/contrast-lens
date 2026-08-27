# ADR 0003: Add an optional blur lens for perceptual feedback

- Status: accepted
- Date: 2026-08-27

## Context

A number can tell a designer that a color pairing is weak without making the consequence memorable. Color.review's strong visual framing suggested a useful extension: let people see low contrast become harder to parse. The effect must remain optional because blur is a simulation, not an accessibility test.

## Decision

Expose a checkbox and intensity slider called the blur lens. The default state is off. When enabled, the text preview applies a capped CSS blur derived from the WCAG ratio and multiplied by the user's chosen intensity. The UI always keeps the underlying ratio, APCA score, and pass states visible.

## Consequences

- A low-contrast pairing has an immediate, tangible visual cost.
- The preview reinforces rather than replaces the numeric result.
- CSS does the effect locally, so it has no canvas, worker, or rendering dependency.
- Reduced-motion preferences are honored for transitions; users can always turn the lens off.
