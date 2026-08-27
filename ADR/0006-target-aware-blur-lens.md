# ADR 0006: Make blur follow the selected WCAG focus

- Status: accepted
- Date: 2026-08-27

## Context

The blur lens is most useful when it reinforces the review target the user selected. A pairing such as `#715BFF` on white has a 4.52:1 WCAG ratio: it passes AA but not AAA. A blur rule based only on the ratio would either blur a passing AA pairing or fail to communicate why the same pairing needs attention during an AAA review.

## Decision

Enable the blur lens by default, while keeping the checkbox available for users who prefer no simulation. The selected WCAG focus controls the clear boundary:

- AA keeps the preview clear at ratios of 4.5:1 and above.
- AAA keeps the preview clear at ratios of 7:1 and above.
- Below the selected target, a gradual CSS-pixel scale is used: 1:1 is 10px, the previous WCAG level is 3px, just below the selected target is 1px, and the passing target is 0px. For AA the previous level is 3:1; for AAA it is 4.5:1. Values between anchors interpolate, then the result is scaled by the intensity slider.

The numeric WCAG and APCA results remain the source of truth; blur is only a visual aid.

## Consequences

- The default 4.52:1 example is clear in AA mode and visibly needs attention in AAA mode.
- Changing AA/AAA immediately updates the preview, status, and blur explanation.
- The lens remains easy to disable and does not claim to replace testing real typography, layout, or context.
