# Hooks

> **Purpose**: Rules of Hooks, core hooks reference, React 19 new hooks, and custom hook conventions
> **Confidence**: 0.95
> **MCP Validated**: 2026-03-13

## Overview

Hooks let functional components use state and side effects. React 19 adds `use()`, `useActionState`, `useFormStatus`, and `useOptimistic` to streamline async UI patterns. With the React Compiler (19+), manual `useMemo`/`useCallback` is often unnecessary — profile before adding.

## Rules of Hooks

1. Only call hooks at the **top level** — never inside conditions, loops, or nested functions
2. Only call hooks from **React function components** or **custom hooks**
3. Exception: `use()` (React 19) can be called conditionally

## Core Hooks Reference

```tsx
// useState — local state
const [count, setCount] = React.useState<number>(0);

// useEffect — side effects; return cleanup
React.useEffect(() => {
  const sub = subscribe(id);
  return () => sub.unsubscribe();
}, [id]);

// useRef — DOM access or stable mutable value (no re-render)
const inputRef = React.useRef<HTMLInputElement>(null);

// useMemo — cache expensive computation (profile first!)
const sorted = React.useMemo(() => [...items].sort(compareFn), [items]);

// useCallback — cache function identity (profile first!)
const handleClick = React.useCallback(() => doSomething(id), [id]);

// useReducer — complex state with dispatch
const [state, dispatch] = React.useReducer(reducer, initialState);

// useContext — read context value
const theme = React.useContext(ThemeContext);
```

## React 19 New Hooks

```tsx
// use() — read a Promise or Context; works conditionally
import { use } from 'react';

function UserCard({ promise }: { promise: Promise<User> }) {
  const user = use(promise); // suspends until resolved
  return <div>{user.name}</div>;
}

// useActionState — state + pending for form/async actions
import { useActionState } from 'react';

function ContactForm() {
  const [result, submitAction, isPending] = useActionState(
    async (prevState: string | null, formData: FormData) => {
      await sendMessage(formData.get('message') as string);
      return 'sent';
    },
    null
  );
  return (
    <form action={submitAction}>
      <input name="message" />
      <button disabled={isPending}>Send</button>
      {result === 'sent' && <p>Message sent!</p>}
    </form>
  );
}

// useFormStatus — read form pending state from child
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>;
}

// useOptimistic — optimistic UI update
import { useOptimistic } from 'react';

function MessageList({ messages }: { messages: Message[] }) {
  const [optimisticMsgs, addOptimistic] = useOptimistic(
    messages,
    (state, newMsg: Message) => [...state, { ...newMsg, sending: true }]
  );
  return <ul>{optimisticMsgs.map((m) => <li key={m.id}>{m.text}</li>)}</ul>;
}
```

## When NOT to useMemo / useCallback

- Without the React Compiler: profile with React DevTools first — only memoize proven bottlenecks
- Primitives as deps (`string`, `number`) — reference is already stable
- Cheap computations — memoization has overhead itself
- With the React Compiler enabled: both hooks are usually unnecessary

## Custom Hook Conventions

```tsx
// Name must start with 'use'
// Return a consistent shape: object (named keys) or tuple
function useCounter(initialValue = 0) {
  const [count, setCount] = React.useState(initialValue);
  const increment = React.useCallback(() => setCount((c) => c + 1), []);
  const reset = React.useCallback(() => setCount(initialValue), [initialValue]);
  return { count, increment, reset }; // object preferred for named access
}

// Tuple for [state, setter] mirrors useState convention
function useToggle(initial = false): [boolean, () => void] {
  const [on, setOn] = React.useState(initial);
  return [on, () => setOn((v) => !v)];
}
```

## Common Mistakes

### Wrong

```tsx
// Hooks inside a condition — violates Rules of Hooks
if (isLoggedIn) {
  const [name, setName] = useState(''); // ERROR
}
```

### Correct

```tsx
// Always call hook at top level; guard inside
const [name, setName] = useState('');
const displayName = isLoggedIn ? name : 'Guest';
```

## Related

- [component-patterns.md](component-patterns.md)
- [state-management.md](state-management.md)
- [patterns/form-handling.md](../patterns/form-handling.md)
