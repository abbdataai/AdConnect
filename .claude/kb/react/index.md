# React Knowledge Base

> **Purpose**: Modern React development covering components, hooks, state management, Server Components, and full-stack patterns with Next.js and React Router.
> **MCP Validated**: 2026-03-13

## Version Compatibility

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| React | 18.2 | 19.x |
| Next.js | 14.0 | 15.x (App Router) |
| React Router | v6 | v7 |
| TypeScript | 5.0 | 5.4+ |
| Node.js | 18 | 20 LTS |

## Quick Navigation

### Concepts (< 150 lines each)

| File | Purpose |
|------|---------|
| [concepts/component-patterns.md](concepts/component-patterns.md) | FC vs explicit types, composition, compound components, controlled vs uncontrolled |
| [concepts/hooks.md](concepts/hooks.md) | Rules of Hooks, core hooks, React 19 hooks, custom hook conventions |
| [concepts/state-management.md](concepts/state-management.md) | State classification, Zustand, TanStack Query, React Hook Form + Zod |
| [concepts/rendering.md](concepts/rendering.md) | React 19 compiler, reconciliation, batching, concurrent features |
| [concepts/server-components.md](concepts/server-components.md) | RSC mental model, use client, Server Actions, streaming |

### Patterns (< 200 lines each)

| File | Purpose |
|------|---------|
| [patterns/data-fetching.md](patterns/data-fetching.md) | TanStack Query, Server Component fetching, parallel vs sequential |
| [patterns/form-handling.md](patterns/form-handling.md) | RHF + Zod, Server Actions with useActionState, dynamic fields |
| [patterns/routing.md](patterns/routing.md) | Next.js App Router conventions, React Router v7 loaders, auth guards |
| [patterns/compound-component.md](patterns/compound-component.md) | Context-based compound components with dot notation |
| [patterns/performance.md](patterns/performance.md) | Profiling workflow, memoization, code splitting, virtualization |

### Specs (Machine-Readable)

| File | Purpose |
|------|---------|
| [specs/react19-api.yaml](specs/react19-api.yaml) | React 19 API reference, all built-in hooks, TypeScript generics |

---

## Quick Reference

- [quick-reference.md](quick-reference.md) — Hooks cheat sheet, decision matrix, Server vs Client

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **React Compiler** | React 19 auto-memoizes components at compile time; manual useMemo/useCallback often unnecessary |
| **Server Components** | Default in Next.js App Router; run only on server, zero client JS, can be async |
| **Server Actions** | `'use server'` functions; replace internal API routes for mutations + revalidation |
| **use() hook** | Reads a Promise or Context in render; can be called conditionally unlike regular hooks |
| **useActionState** | Manages form/action state; replaces manual `useState` for async action results |
| **Concurrent features** | Suspense, transitions, deferred values for non-blocking UI updates |

---

## Learning Path

| Level | Files |
|-------|-------|
| **Beginner** | concepts/component-patterns.md, concepts/hooks.md |
| **Intermediate** | concepts/state-management.md, patterns/data-fetching.md, patterns/form-handling.md |
| **Advanced** | concepts/server-components.md, concepts/rendering.md, patterns/performance.md |

---

## Agent Usage

| Agent | Primary Files | Use Case |
|-------|---------------|----------|
| react-specialist | concepts/component-patterns.md, concepts/hooks.md | Scaffold components and hooks |
| react-specialist | concepts/state-management.md, patterns/data-fetching.md | Data layer + state wiring |
| react-specialist | concepts/server-components.md, patterns/routing.md | App Router architecture |
| react-specialist | patterns/performance.md, concepts/rendering.md | Performance optimization |
