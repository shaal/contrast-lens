# ADR 0007: Add an APCA mode to the contrast map

- Status: accepted
- Date: 2026-08-27

## Context

The interactive map currently explains WCAG 2 contrast ratios with 3:1, 4.5:1, and 7:1 guide curves. The score panel already shows APCA Lc, but users cannot explore how APCA changes across nearby colors without leaving the map.

## Decision

Add a WCAG ratio / APCA Lc mode switch to the map. WCAG mode keeps its existing ratio guides. APCA mode draws signed Lc guide curves for 45, 60, and 75 in both positive and negative directions, preserving APCA's foreground/background polarity. The map readout shows the current live measure for the active color pair.

APCA guide labels are presented as Lc values rather than AA/AAA pass states. The existing Lc 45 large-text and Lc 60 body-text references remain visually emphasized, while Lc 75 provides a stronger comparison point.

## Consequences

- Designers can see APCA change while dragging either color.
- Signed guide lines make light-on-dark and dark-on-light behavior visible.
- WCAG and APCA remain separate views, so their different models are not blended into one misleading scale.
- The contours are calculated locally from the same deterministic APCA implementation as the score card.
