# ADR 0001: Use a readable Vue application

- Status: accepted
- Date: 2026-08-27

## Context

Contrast Lens is a small, interactive tool with a deliberately narrow surface area. It needs a fast first load, an easily testable calculation core, and a UI that remains approachable for future contributors.

## Decision

Use Vue 3 with Vite and a single readable `App.vue` single-file component. Keep color math in a framework-free TypeScript module so it can be benchmarked and consumed by other entry points later.

## Consequences

- The app has a single bootstrapped component and a small dependency graph.
- Vue's `ref` and `computed` primitives make score updates explicit without a large framework abstraction layer.
- The math layer can be unit-tested without a DOM or framework test harness.
- A future multi-page toolset can add routes and feature components without changing the calculation core.
