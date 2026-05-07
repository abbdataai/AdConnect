# Component Patterns

> **Purpose**: Functional component patterns with TypeScript, composition, controlled vs uncontrolled, and render strategies
> **Confidence**: 0.95
> **MCP Validated**: 2026-03-13

## Overview

Modern React uses functional components exclusively. Prefer explicit return types over `React.FC` for better error messages. Composition over inheritance is the core principle — build complex UI by combining small, single-purpose components.

## The Pattern

```tsx
// Explicit return type (preferred over React.FC)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

function Button({ variant = 'primary', isLoading, children, ...rest }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} disabled={isLoading} {...rest}>
      {isLoading ? <Spinner /> : children}
    </button>
  );
}

// Generic component for reusability
function List<T extends { id: string }>({
  items,
  renderItem,
}: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return <ul>{items.map((item) => <li key={item.id}>{renderItem(item)}</li>)}</ul>;
}
```

## Controlled vs Uncontrolled

| Approach | When to Use | Example |
|----------|------------|---------|
| Controlled | Form state lifted to parent, RHF | `value={value} onChange={setValue}` |
| Uncontrolled | One-off read at submit, ref-based | `ref={inputRef}` + `ref.current.value` |
| Uncontrolled (RHF) | React Hook Form registers inputs | `{...register('email')}` |

## Compound Component Pattern

```tsx
// Context for internal sharing
const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Must be used inside <Tabs>');
  return ctx;
}

// Root component
function Tabs({ children, defaultValue }: TabsProps) {
  const [active, setActive] = React.useState(defaultValue);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// Sub-components via dot notation
Tabs.List = function TabsList({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>;
};

Tabs.Trigger = function TabsTrigger({ value, children }: TriggerProps) {
  const { active, setActive } = useTabs();
  return (
    <button role="tab" aria-selected={active === value} onClick={() => setActive(value)}>
      {children}
    </button>
  );
};

Tabs.Content = function TabsContent({ value, children }: ContentProps) {
  const { active } = useTabs();
  return active === value ? <div role="tabpanel">{children}</div> : null;
};
```

## Common Mistakes

### Wrong

```tsx
// React.FC hides missing children type and adds implicit children
const Card: React.FC = ({ title }) => <div>{title}</div>;

// Render props anti-pattern — use hooks instead
<DataProvider render={(data) => <Display data={data} />} />
```

### Correct

```tsx
// Explicit interface + return type
interface CardProps { title: string }
function Card({ title }: CardProps): React.ReactElement {
  return <div>{title}</div>;
}

// Custom hook replaces render props
function useData() { /* logic */ }
function Display() {
  const data = useData();
  return <div>{data.value}</div>;
}
```

## Related

- [hooks.md](hooks.md)
- [patterns/compound-component.md](../patterns/compound-component.md)
- [patterns/form-handling.md](../patterns/form-handling.md)
