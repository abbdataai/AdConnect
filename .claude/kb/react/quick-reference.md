# React Quick Reference

> Fast lookup tables. For code examples, see linked files.
> **MCP Validated**: 2026-03-13

## Most-Used Hooks

| Hook | Source | Purpose |
|------|--------|---------|
| `useState` | react | Local component state |
| `useEffect` | react | Side effects and subscriptions |
| `useRef` | react | DOM refs and mutable values without re-render |
| `useMemo` | react | Cache expensive computation result |
| `useCallback` | react | Cache function reference |
| `useContext` | react | Read nearest Context value |
| `useReducer` | react | Complex state with dispatch actions |
| `useId` | react | Stable unique ID for accessibility |
| `useTransition` | react | Mark state updates as non-urgent |
| `useDeferredValue` | react | Defer re-rendering of a slow subtree |
| `use()` | react 19 | Read Promise or Context (works conditionally) |
| `useActionState` | react 19 | State + pending for form actions |
| `useFormStatus` | react-dom 19 | Form pending state from child component |
| `useOptimistic` | react 19 | Optimistic UI before async action resolves |

## State Management Decision Matrix

| State Type | What to Use |
|------------|-------------|
| Local UI (toggle, input) | `useState` |
| Local complex logic | `useReducer` |
| Server / API data | TanStack Query `useQuery` |
| Mutations + cache invalidation | TanStack Query `useMutation` |
| Global UI state (theme, modals) | Zustand |
| Form state + validation | React Hook Form + Zod |
| URL / filter state | `useSearchParams` (Next.js) |
| Async action result + pending | `useActionState` (React 19) |

## Server Component vs Client Component

| Feature | Server Component | Client Component |
|---------|-----------------|-----------------|
| Directive | (none — default) | `'use client'` at top |
| Can use hooks | No | Yes |
| Can use browser APIs | No | Yes |
| Can be async | Yes (`async function`) | No |
| Access DB / secrets | Yes | No |
| Adds to JS bundle | No | Yes |
| Can handle events | No | Yes |
| When to add `'use client'` | Never | Events, hooks, browser APIs |

## Common TypeScript Patterns

| Pattern | Code |
|---------|------|
| Typed props (explicit) | `function Btn({ label }: { label: string }) {}` |
| FC with children | `const C: React.FC<Props> = ({ children }) => {}` |
| Polymorphic as prop | `type Props<T extends ElementType> = { as?: T }` |
| Forward ref | `React.forwardRef<HTMLInputElement, Props>((props, ref) => ...)` |
| Generic component | `function List<T>({ items }: { items: T[] }) {}` |
| Extract component props | `type Props = React.ComponentProps<typeof MyComponent>` |
| HTML element props | `type Props = React.ButtonHTMLAttributes<HTMLButtonElement>` |

## Common Pitfalls

| Don't | Do |
|-------|-----|
| Call hooks inside conditions or loops | Always call hooks at top level |
| Mutate state directly | Use setter: `setState([...arr, item])` |
| Use `useEffect` for derived state | Compute during render instead |
| Forget cleanup in `useEffect` | Return cleanup function |
| Pass non-serializable props Server→Client | Serialize: strings, numbers, plain objects |
| Add `'use client'` at page level | Push it down to the leaf component |
| Use `any` in TypeScript | Use generics or `unknown` with type guards |

## Related Documentation

| Topic | Path |
|-------|------|
| Hook deep-dive | `concepts/hooks.md` |
| Server Components | `concepts/server-components.md` |
| State decision tree | `concepts/state-management.md` |
| Full Index | `index.md` |
