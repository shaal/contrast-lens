# ADR 0001: Use a standalone Angular application

- Status: accepted
- Date: 2026-08-27

## Context

Contrast Lens is a small, interactive tool with a deliberately narrow surface area. It needs a fast first load, an easily testable calculation core, and a UI that can evolve without a component-module ceremony.

## Decision

Use Angular standalone components with zoneless change detection and `OnPush` rendering. Keep color math in a framework-free TypeScript module so it can be benchmarked and consumed by other entry points later.

## Consequences

- The app has a single bootstrapped component and a small dependency graph.
- Signals make score updates explicit and avoid unnecessary template work.
- The math layer can be unit-tested without a DOM or Angular test harness.
- A future multi-page toolset can add routes and standalone feature components without a migration.
