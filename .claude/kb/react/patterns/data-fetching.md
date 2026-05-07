# Data Fetching

> **Purpose**: TanStack Query patterns, Server Component fetching, parallel vs sequential, error boundaries + Suspense
> **MCP Validated**: 2026-03-13

## When to Use

- Fetching server data in Client Components (TanStack Query)
- Fetching in Next.js Server Components (async/await directly)
- Mutations with cache invalidation
- Parallel and sequential data dependencies

## Implementation

```tsx
// ─── TanStack Query: typed useQuery ─────────────────────────────────────────
import { useQuery, queryOptions } from '@tanstack/react-query';

interface User { id: string; name: string; email: string }

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json() as Promise<User>;
}

export const userQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
    staleTime: 5 * 60_000, // 5 minutes
  });

function UserProfile({ id }: { id: string }) {
  const { data, isPending, isError, error } = useQuery(userQueryOptions(id));
  if (isPending) return <ProfileSkeleton />;
  if (isError) return <p>Error: {error.message}</p>;
  return <div>{data.name}</div>;
}

// ─── useMutation with optimistic update ─────────────────────────────────────
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UpdateUserArgs { id: string; name: string }

function EditUserForm({ user }: { user: User }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, name }: UpdateUserArgs) =>
      fetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }).then((r) => r.json()),

    // Optimistic update
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ['user', id] });
      const previous = queryClient.getQueryData<User>(['user', id]);
      queryClient.setQueryData<User>(['user', id], (old) => old ? { ...old, name } : old);
      return { previous, id };
    },
    onError: (_err, { id }, context) => {
      // Roll back on error
      queryClient.setQueryData(['user', id], context?.previous);
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
    },
  });

  return (
    <button onClick={() => mutation.mutate({ id: user.id, name: 'New Name' })}
            disabled={mutation.isPending}>
      Save
    </button>
  );
}
```

## Server Component Data Fetching (Next.js 15)

```tsx
// app/users/[id]/page.tsx — direct async/await, no hooks needed
import { cache } from 'react';
import { notFound } from 'next/navigation';

const getUser = cache(async (id: string): Promise<User | null> => {
  const res = await fetch(`https://api.example.com/users/${id}`, {
    next: { revalidate: 300 }, // ISR: revalidate every 5 min
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await getUser(params.id);
  if (!user) notFound();
  return <UserCard user={user} />;
}
```

## Parallel vs Sequential Fetching

```tsx
// ─── Parallel — both start simultaneously ────────────────────────────────────
const [user, posts] = await Promise.all([
  fetchUser(id),
  fetchUserPosts(id),
]);

// Or with TanStack Query — both queries fire at the same time
function UserDashboard({ id }: { id: string }) {
  const user = useQuery({ queryKey: ['user', id], queryFn: () => fetchUser(id) });
  const posts = useQuery({ queryKey: ['posts', id], queryFn: () => fetchUserPosts(id) });
  // renders in parallel
}

// ─── Sequential — post depends on user ───────────────────────────────────────
function UserPosts({ userId }: { userId: string }) {
  const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
  const { data: posts } = useQuery({
    queryKey: ['posts', user?.teamId],
    queryFn: () => fetchTeamPosts(user!.teamId),
    enabled: !!user?.teamId, // only fires when teamId is available
  });
}
```

## Error Boundaries + Suspense Integration

```tsx
'use client';
import { ErrorBoundary } from 'react-error-boundary';
import { useSuspenseQuery } from '@tanstack/react-query';

// useSuspenseQuery — data is never undefined, throws on error
function UserCard({ id }: { id: string }) {
  const { data } = useSuspenseQuery(userQueryOptions(id));
  return <div>{data.name}</div>;
}

// Wrap with ErrorBoundary + Suspense in the parent
export function UserSection({ id }: { id: string }) {
  return (
    <ErrorBoundary fallback={<p>Something went wrong.</p>}>
      <Suspense fallback={<Skeleton />}>
        <UserCard id={id} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `staleTime` | `0` | Time before data is considered stale |
| `gcTime` | `5 min` | Time unused data stays in cache |
| `retry` | `3` | Retry count on failure |
| `refetchOnWindowFocus` | `true` | Refetch when tab regains focus |

## See Also

- [concepts/state-management.md](../concepts/state-management.md)
- [concepts/server-components.md](../concepts/server-components.md)
- [patterns/performance.md](performance.md)
