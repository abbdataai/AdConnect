# Performance

> **Purpose**: Profiling workflow, memoization guidelines, code splitting, list virtualization, bundle analysis
> **MCP Validated**: 2026-03-13

## When to Use

- After detecting slow renders in React DevTools Profiler
- Before shipping lists with > 100 items
- When lazy-loading heavy routes or components
- Before/after refactoring for measurable baseline comparison

## Implementation

### Profiling Workflow

```
1. Open React DevTools → Profiler tab
2. Record interactions in your app
3. Identify components with high self-time (flame chart)
4. Understand WHY they re-render (props diff in "why did this render?")
5. Apply fix (React.memo, split component, move state down)
6. Record again — verify improvement
```

### React.memo — Prevent Child Re-Renders

```tsx
// Wrap when: parent re-renders frequently but this component's props rarely change
interface ListItemProps { id: string; name: string; onSelect: (id: string) => void }

const ListItem = React.memo(function ListItem({ id, name, onSelect }: ListItemProps) {
  return <div onClick={() => onSelect(id)}>{name}</div>;
});

// useCallback stabilizes the handler so ListItem props don't change every render
function ItemList({ items }: { items: Item[] }) {
  const handleSelect = React.useCallback((id: string) => {
    setSelected(id);
  }, []); // empty deps — function never changes
  return <>{items.map((i) => <ListItem key={i.id} {...i} onSelect={handleSelect} />)}</>;
}
```

### useMemo / useCallback Guidelines

```tsx
// useMemo — cache computation result (only if profiler shows cost)
const filtered = React.useMemo(
  () => items.filter((i) => i.active && i.score > threshold),
  [items, threshold] // recomputes only when deps change
);

// DO NOT use useMemo for:
// • Primitive operations (simple string/number math)
// • Array methods on small arrays (< 1000 items)
// • Values that change almost every render (same or more cost)

// useCallback — stable function reference for memoized children
// Needed when passing callback to React.memo'd child or into useEffect deps
const handleChange = React.useCallback((value: string) => {
  dispatch({ type: 'SET_FILTER', value });
}, [dispatch]);
```

### Code Splitting with React.lazy

```tsx
// Route-level splitting — load only when user navigates to the route
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Analytics = React.lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <Router>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

// Component-level: heavy chart only when visible
const HeavyChart = React.lazy(() => import('./HeavyChart'));

function Dashboard() {
  const [showChart, setShowChart] = React.useState(false);
  return (
    <>
      <button onClick={() => setShowChart(true)}>Load Chart</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <HeavyChart />
        </Suspense>
      )}
    </>
  );
}

// Next.js dynamic import with options
import dynamic from 'next/dynamic';
const NoSSRMap = dynamic(() => import('@/components/Map'), { ssr: false, loading: () => <MapSkeleton /> });
```

### List Virtualization (TanStack Virtual)

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // estimated row height in px
    overscan: 5,            // rows rendered beyond visible area
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => (
          <div
            key={vItem.key}
            style={{ position: 'absolute', top: 0, transform: `translateY(${vItem.start}px)`, width: '100%' }}
          >
            <ItemRow item={items[vItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Configuration

| Optimization | When to Apply | Threshold |
|-------------|---------------|-----------|
| `React.memo` | Parent re-renders often, child props stable | Profiler shows repeated renders |
| `useMemo` | Computation is measurably expensive | > 1ms per render |
| `useCallback` | Passed to memoized child or useEffect dep | Profiler proves need |
| `React.lazy` | Route or large component | > 30kB chunk |
| Virtualization | Long scrollable list | > 100 items |

## Example Usage

```tsx
// Bundle analysis — Next.js
// next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
export default withBundleAnalyzer({ /* ...next config */ });
// Run: ANALYZE=true next build
```

## See Also

- [concepts/rendering.md](../concepts/rendering.md)
- [patterns/data-fetching.md](data-fetching.md)
- [concepts/hooks.md](../concepts/hooks.md)
