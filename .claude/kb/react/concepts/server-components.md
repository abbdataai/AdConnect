# Server Components

> **Purpose**: RSC mental model, when to add 'use client', Server Actions, streaming with Suspense
> **Confidence**: 0.93
> **MCP Validated**: 2026-03-13

## Overview

React Server Components (RSC) render exclusively on the server and produce zero client JavaScript. They are the default in Next.js 15 App Router. Client Components are opt-in via `'use client'` and are needed only for interactivity, hooks, or browser APIs.

## Mental Model

```
Server Component (default)           Client Component ('use client')
─────────────────────────────        ────────────────────────────────
Runs ONLY on server/build            Runs on server (SSR) + client
Can be async                         Cannot be async
Can fetch DB / read secrets          Cannot access server resources
Adds ZERO bytes to JS bundle         Adds to client bundle
Cannot use hooks                     Can use all hooks
Cannot handle events                 Can handle events and browser APIs
Can import Client Components         CANNOT import Server Components
```

## When to Add 'use client'

Add `'use client'` at the **lowest possible** component in the tree:

```tsx
// Wrong — entire page becomes client
'use client';
export default function Page() { /* big page */ }

// Correct — push directive to the interactive leaf
// app/page.tsx (Server Component)
import { LikeButton } from './LikeButton'; // Client Component
export default async function Page() {
  const post = await db.getPost();         // server-only data fetch
  return <article>{post.body}<LikeButton postId={post.id} /></article>;
}

// LikeButton.tsx (Client Component)
'use client';
export function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = React.useState(false);
  return <button onClick={() => setLiked(true)}>{liked ? 'Liked' : 'Like'}</button>;
}
```

## Server Actions

```tsx
// actions/post.ts — Server Action file
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const commentSchema = z.object({ text: z.string().min(1) });

export async function addComment(formData: FormData) {
  // 1. Auth check always first
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  // 2. Validate input
  const { text } = commentSchema.parse({ text: formData.get('text') });

  // 3. Mutation
  await db.comments.create({ text, userId: session.userId });

  // 4. Revalidate affected pages
  revalidatePath('/posts');
}

// Form using Server Action directly (progressive enhancement)
// <form action={addComment}><input name="text" /><button>Comment</button></form>
```

## Async Data Fetching in Server Components

```tsx
// app/users/page.tsx — fetch directly with async/await
import { cache } from 'react';

// Wrap in react.cache() to deduplicate across the request
const getUser = cache(async (id: string) => db.users.findById(id));

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await getUser(params.id); // no useEffect, no loading state needed
  return <div>{user.name}</div>;
}
```

## Streaming with Suspense

```tsx
// app/dashboard/page.tsx — stream slow components independently
export default function Dashboard() {
  return (
    <main>
      <Header />                        {/* fast — renders immediately */}
      <Suspense fallback={<StatsShell />}>
        <StatsPanel />                  {/* slow DB query — streams in */}
      </Suspense>
      <Suspense fallback={<FeedShell />}>
        <ActivityFeed />                {/* another slow query — streams in */}
      </Suspense>
    </main>
  );
}
```

## Common Mistakes

### Wrong

```tsx
// Passing a function (non-serializable) from Server to Client
// Server Component
<ClientButton onClick={() => console.log('hi')} /> // ERROR at runtime

// Using hooks in a Server Component
export default async function Page() {
  const [open, setOpen] = useState(false); // ERROR — hooks not allowed here
}
```

### Correct

```tsx
// Only pass serializable props: strings, numbers, plain objects, arrays
<ClientButton postId="123" label="Like" />

// Interactivity stays in Client Components
'use client';
export function ClientButton({ postId }: { postId: string }) {
  const [liked, setLiked] = React.useState(false);
  return <button onClick={() => setLiked(true)}>Like</button>;
}
```

## Related

- [rendering.md](rendering.md)
- [patterns/data-fetching.md](../patterns/data-fetching.md)
- [patterns/routing.md](../patterns/routing.md)
