# State Management

> **Purpose**: State classification decision tree, Zustand patterns, TanStack Query v5, React Hook Form + Zod
> **Confidence**: 0.95
> **MCP Validated**: 2026-03-13

## Overview

State has five distinct categories, each with the right tool. Mixing tools leads to stale caches and sync bugs. The rule: server state lives in TanStack Query, global UI state in Zustand, forms in RHF+Zod, URL state in `useSearchParams`, and local state in `useState`.

## State Classification

| State Type | Lives In | Tool |
|------------|---------|------|
| Local UI (toggle, input) | Component | `useState` / `useReducer` |
| Global UI (theme, sidebar) | App | Zustand |
| Server / API data | Cache | TanStack Query |
| Form values + errors | Form | React Hook Form + Zod |
| URL / filters / pagination | URL | `useSearchParams` |
| Async action result | Action | `useActionState` (React 19) |

## Zustand Store

```tsx
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: UIState['theme']) => void;
}

// create<T>()() — double-call pattern required in TypeScript
export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      sidebarOpen: false,
      theme: 'light',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'ui-store' }
  )
);

// Selector — prevent unnecessary re-renders (subscribe to slice)
export const useSidebarOpen = () => useUIStore((s) => s.sidebarOpen);
```

## TanStack Query v5

```tsx
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Setup — create once, provide at root
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
});

// useQuery — typed with queryOptions helper
import { queryOptions } from '@tanstack/react-query';

const userQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id), // return type inferred automatically
  });

function UserProfile({ id }: { id: string }) {
  const { data, isPending, isError } = useQuery(userQueryOptions(id));
  if (isPending) return <Skeleton />;
  if (isError) return <ErrorMessage />;
  return <div>{data.name}</div>;
}

// useMutation with invalidation
function DeleteUser() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
  return <button onClick={() => mutation.mutate('123')}>Delete</button>;
}
```

## React Hook Form + Zod

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

type LoginData = z.infer<typeof loginSchema>; // derives TypeScript type

function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    await loginUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <p>{errors.email.message}</p>}
      <button disabled={isSubmitting}>Login</button>
    </form>
  );
}
```

## Common Mistakes

### Wrong

```tsx
// Fetching in useEffect and storing in local state — stale, no caching
useEffect(() => { fetchUser(id).then(setUser); }, [id]);
```

### Correct

```tsx
// TanStack Query handles caching, deduplication, refetching
const { data: user } = useQuery({ queryKey: ['user', id], queryFn: () => fetchUser(id) });
```

## Related

- [hooks.md](hooks.md)
- [patterns/data-fetching.md](../patterns/data-fetching.md)
- [patterns/form-handling.md](../patterns/form-handling.md)
