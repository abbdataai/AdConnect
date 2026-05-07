# Rendering

> **Purpose**: React 19 compiler, reconciliation, automatic batching, concurrent features — Suspense, transitions, deferred values
> **Confidence**: 0.95
> **MCP Validated**: 2026-03-13

## Overview

React 19 introduces the React Compiler that automatically memoizes components at compile time, eliminating most manual `useMemo`/`useCallback`. React 18+ batches all state updates automatically, and concurrent features let you keep the UI responsive during expensive updates.

## React 19 Compiler

The React Compiler (formerly "React Forget") analyzes components at build time and adds memoization where it helps — skipping unnecessary re-renders, memoizing expensive computations, and stabilizing function references.

| Scenario | React 18 | React 19 + Compiler |
|----------|---------|---------------------|
| `useMemo` for expensive calc | Required | Auto-memoized |
| `useCallback` for stable ref | Required | Auto-stabilized |
| `React.memo` wrapper | Required | Often unnecessary |
| Profiler-driven optimization | Still useful | Use to verify |

**Rule**: Enable the compiler first. Only add manual memoization after profiling proves it's needed.

## What Triggers Re-Renders

```
State change (useState / useReducer / Zustand selector) → component re-renders
Parent re-renders → child re-renders (unless React.memo'd or compiler handles it)
Context value changes → all consumers re-render
```

## Automatic Batching (React 18+)

```tsx
// React 18+: all updates inside async callbacks, timeouts, and native events
// are batched into a single re-render
async function handleClick() {
  setLoading(true);
  await fetchData();
  setData(result);
  setLoading(false); // only ONE re-render after all three setters
}

// Opt out of batching when needed (rare)
import { flushSync } from 'react-dom';
flushSync(() => setA(1)); // forces sync re-render
flushSync(() => setB(2));
```

## Concurrent Features

```tsx
// useTransition — mark an update as interruptible / non-urgent
function SearchPage() {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Result[]>([]);
  const [isPending, startTransition] = React.useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value); // urgent — update input immediately
    startTransition(() => {
      setResults(expensiveSearch(e.target.value)); // non-urgent
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? <Spinner /> : <ResultsList items={results} />}
    </>
  );
}

// useDeferredValue — defer re-rendering of a slow subtree
function SlowList({ input }: { input: string }) {
  const deferred = React.useDeferredValue(input); // lags behind intentionally
  return <HeavyChart data={deferred} />;
}
```

## useTransition vs useDeferredValue

| Hook | When to Use | Control |
|------|-------------|---------|
| `useTransition` | You control the state update (own the setter) | Wrap setter in `startTransition` |
| `useDeferredValue` | You receive a value you don't own (prop/param) | Wrap the received value |

## Suspense Integration

```tsx
// Wrap async subtrees; React streams from server or defers client rendering
<Suspense fallback={<Skeleton />}>
  <UserProfile id={id} />
</Suspense>

// With useSuspenseQuery (TanStack Query v5) — data is never undefined
import { useSuspenseQuery } from '@tanstack/react-query';

function UserProfile({ id }: { id: string }) {
  const { data } = useSuspenseQuery({ queryKey: ['user', id], queryFn: () => fetchUser(id) });
  return <div>{data.name}</div>; // data guaranteed non-null
}
```

## Common Mistakes

### Wrong

```tsx
// Wrapping every function in useCallback without profiling
const onClick = useCallback(() => doThing(id), [id]); // usually unnecessary with compiler
```

### Correct

```tsx
// Use the compiler, profile with React DevTools Profiler, then memoize only proven bottlenecks
const onClick = () => doThing(id);
```

## Related

- [concepts/server-components.md](server-components.md)
- [patterns/performance.md](../patterns/performance.md)
- [hooks.md](hooks.md)
