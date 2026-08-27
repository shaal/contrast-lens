# ADR 0002: Show WCAG 2 and APCA as complementary signals

- Status: accepted
- Date: 2026-08-27

## Context

WCAG 2's ratio is the familiar compliance language designers and engineers use today. APCA is directional and type-aware, which makes it more useful for discussing perceptual readability. Showing only one leaves an important part of the decision out.

## Decision

Calculate WCAG 2 relative-luminance ratio and APCA 0.0.98G in the same local contrast result. Present the WCAG ratio with AA/AAA pass states, and present APCA as signed Lc with body and large-text guide states. Treat both as decision support, not as a replacement for testing the actual interface.

## Consequences

- The score panel can answer both “does this meet the familiar baseline?” and “how does the polarity feel to text?”
- APCA's directional sign is preserved instead of being flattened into an absolute number.
- The algorithm remains offline and deterministic, with no runtime API or analytics dependency.
- The APCA implementation must be revisited if the W3C guidance or reference constants materially change.
