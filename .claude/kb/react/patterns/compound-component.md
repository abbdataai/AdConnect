# Compound Component

> **Purpose**: Context-based compound components with dot notation, headless UI, TypeScript subcomponent typing
> **MCP Validated**: 2026-03-13

## When to Use

- Complex UI components with shared internal state (Tabs, Accordion, Select, Dialog)
- When consumers need flexibility in arranging sub-components
- Headless/logic-only components to separate behavior from styling
- Replacing deeply nested prop-drilling with co-located context

## Implementation

```tsx
// ─── Custom Tabs (full compound component example) ───────────────────────────
import React from 'react';

// 1. Define types for context and sub-component props
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

interface TabsProps {
  children: React.ReactNode;
  defaultValue: string;
  onChange?: (value: string) => void;
}

interface TabProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

interface TabPanelProps {
  value: string;
  children: React.ReactNode;
}

// 2. Create context
const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Tabs sub-components must be used inside <Tabs>');
  return ctx;
}

// 3. Root component — owns state, provides context
function Tabs({ children, defaultValue, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  const handleSetActiveTab = React.useCallback(
    (value: string) => {
      setActiveTab(value);
      onChange?.(value);
    },
    [onChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// 4. Sub-components as named functions attached via dot notation
Tabs.List = function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <div role="tablist" className="tabs__list">
      {children}
    </div>
  );
};
Tabs.List.displayName = 'Tabs.List';

Tabs.Tab = function Tab({ value, children, disabled = false }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      disabled={disabled}
      className={`tabs__tab ${isActive ? 'tabs__tab--active' : ''}`}
      onClick={() => !disabled && setActiveTab(value)}
    >
      {children}
    </button>
  );
};
Tabs.Tab.displayName = 'Tabs.Tab';

Tabs.Panel = function TabPanel({ value, children }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      className="tabs__panel"
    >
      {children}
    </div>
  );
};
Tabs.Panel.displayName = 'Tabs.Panel';

export { Tabs };
```

## Example Usage

```tsx
// Consumer — full flexibility in arranging sub-components
function SettingsPage() {
  return (
    <Tabs defaultValue="profile" onChange={(tab) => console.log('Active:', tab)}>
      <Tabs.List>
        <Tabs.Tab value="profile">Profile</Tabs.Tab>
        <Tabs.Tab value="security">Security</Tabs.Tab>
        <Tabs.Tab value="billing" disabled>Billing (soon)</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="profile">
        <ProfileForm />
      </Tabs.Panel>
      <Tabs.Panel value="security">
        <SecuritySettings />
      </Tabs.Panel>
    </Tabs>
  );
}
```

## Headless UI Pattern (Logic / Style Separation)

```tsx
// Headless hook — logic only, no rendering
function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = React.useState(initial);
  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((v) => !v), []);
  return { isOpen, open, close, toggle };
}

// Consumer applies any styling / markup
function DropdownMenu() {
  const { isOpen, toggle, close } = useDisclosure();
  return (
    <div>
      <button onClick={toggle}>Menu</button>
      {isOpen && (
        <ul role="menu">
          <li role="menuitem"><button onClick={close}>Profile</button></li>
          <li role="menuitem"><button onClick={close}>Logout</button></li>
        </ul>
      )}
    </div>
  );
}
```

## See Also

- [concepts/component-patterns.md](../concepts/component-patterns.md)
- [concepts/hooks.md](../concepts/hooks.md)
- [patterns/performance.md](performance.md)
