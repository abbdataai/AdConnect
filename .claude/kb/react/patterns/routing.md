# Routing

> **Purpose**: Next.js App Router file conventions, React Router v7 loaders/actions, auth guard patterns
> **MCP Validated**: 2026-03-13

## When to Use

- Structuring Next.js 15 App Router layouts and nested routes
- React Router v7 with type-safe loaders and actions
- Auth guards (middleware for Next.js, loader redirect for React Router)
- Programmatic navigation decisions

## Implementation

### Next.js App Router File Conventions

```
app/
├── layout.tsx              # Root layout (persistent shell)
├── page.tsx                # Index route: /
├── loading.tsx             # Suspense boundary for the route segment
├── error.tsx               # Error boundary ('use client' required)
├── not-found.tsx           # 404 for this segment
├── (auth)/                 # Route group — no URL segment
│   ├── login/page.tsx      # /login
│   └── register/page.tsx   # /register
├── dashboard/
│   ├── layout.tsx          # Nested layout wrapping dashboard routes
│   ├── page.tsx            # /dashboard
│   └── @analytics/         # Parallel route slot
│       └── page.tsx
└── posts/
    ├── page.tsx            # /posts
    └── [id]/
        ├── page.tsx        # /posts/:id (dynamic segment)
        └── [...slug]/      # /posts/:id/a/b/c (catch-all)
            └── page.tsx
```

```tsx
// app/posts/[id]/page.tsx — typed dynamic segment
interface PageProps { params: { id: string }; searchParams: { tab?: string } }

export async function generateMetadata({ params }: PageProps) {
  const post = await getPost(params.id);
  return { title: post.title };
}

export default async function PostPage({ params, searchParams }: PageProps) {
  const post = await getPost(params.id);
  return <PostDetail post={post} tab={searchParams.tab ?? 'overview'} />;
}

// app/dashboard/error.tsx — Error boundary (must be 'use client')
'use client';
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return <div><p>{error.message}</p><button onClick={reset}>Retry</button></div>;
}
```

### React Router v7

```tsx
// router.tsx — createBrowserRouter with loaders and actions
import { createBrowserRouter, RouterProvider, Outlet, redirect } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'posts',
        loader: async () => {
          const posts = await fetchPosts();
          return { posts };
        },
        element: <PostsPage />,
      },
      {
        path: 'posts/:id',
        loader: async ({ params }) => {
          const post = await fetchPost(params.id!);
          if (!post) throw new Response('Not Found', { status: 404 });
          return { post };
        },
        element: <PostPage />,
      },
    ],
  },
]);

// PostsPage.tsx — consume loader data
import { useLoaderData } from 'react-router-dom';

interface LoaderData { posts: Post[] }

export function PostsPage() {
  const { posts } = useLoaderData() as LoaderData;
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}

function RootLayout() {
  return <div><Nav /><Outlet /></div>;
}
```

## Auth Guard Patterns

```tsx
// Next.js — middleware (runs on every request before rendering)
// middleware.ts (project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] };

// React Router v7 — loader redirect (co-located with route)
const protectedLoader = async () => {
  const user = await getCurrentUser();
  if (!user) throw redirect('/login');
  return { user };
};
```

## Link vs router.push

| Scenario | Use |
|----------|-----|
| Navigation in JSX / render | `<Link href="/path">` — preloads on hover |
| Programmatic after async action | `router.push('/path')` |
| Replace history (login → dashboard) | `router.replace('/dashboard')` |
| External URL | `<a href="https://...">` |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `prefetch` on Link | `true` (Next.js) | Preloads page on viewport/hover |
| `scroll` on Link | `true` | Scroll to top on navigation |
| `matcher` in middleware | all routes | Restrict middleware scope |

## See Also

- [concepts/server-components.md](../concepts/server-components.md)
- [patterns/data-fetching.md](data-fetching.md)
- [patterns/form-handling.md](form-handling.md)
