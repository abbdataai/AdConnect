# Form Handling

> **Purpose**: React Hook Form + Zod, Server Action forms with useActionState, dynamic fields, submission states
> **MCP Validated**: 2026-03-13

## When to Use

- Any form with validation logic
- Server-side mutations from forms (Server Actions)
- Dynamic field arrays
- Multi-step or conditional forms

## Implementation

```tsx
// ─── React Hook Form + Zod (Client Component) ────────────────────────────────
'use client';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  tags: z.array(z.object({ value: z.string().min(1) })).optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { tags: [] },
  });

  // Dynamic field array
  const { fields, append, remove } = useFieldArray({ control, name: 'tags' });

  const onSubmit = async (data: RegisterData) => {
    await registerUser(data);
  };

  if (isSubmitSuccessful) return <p>Registration complete!</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <input {...register('name')} placeholder="Full name" aria-invalid={!!errors.name} />
        {errors.name && <span role="alert">{errors.name.message}</span>}
      </div>

      <div>
        <input {...register('email')} type="email" placeholder="Email" />
        {errors.email && <span role="alert">{errors.email.message}</span>}
      </div>

      <div>
        <input {...register('password')} type="password" placeholder="Password" />
        {errors.password && <span role="alert">{errors.password.message}</span>}
      </div>

      <div>
        <input {...register('confirmPassword')} type="password" placeholder="Confirm" />
        {errors.confirmPassword && <span role="alert">{errors.confirmPassword.message}</span>}
      </div>

      {/* Dynamic fields */}
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`tags.${index}.value`)} placeholder="Tag" />
          <button type="button" onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ value: '' })}>Add tag</button>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registering…' : 'Register'}
      </button>
    </form>
  );
}
```

## Server Action Form with useActionState (React 19)

```tsx
// actions/contact.ts
'use server';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1),
  message: z.string().min(10),
});

export type ActionState = { success: boolean; error?: string } | null;

export async function contactAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = contactSchema.safeParse({
    name: formData.get('name'),
    message: formData.get('message'),
  });
  if (!result.success) return { success: false, error: result.error.issues[0].message };

  await sendContactEmail(result.data);
  return { success: true };
}

// ContactForm.tsx — Client Component
'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { contactAction, type ActionState } from '@/actions/contact';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send'}</button>;
}

export function ContactForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(contactAction, null);

  return (
    <form action={formAction}>
      {state?.success && <p>Message sent!</p>}
      {state?.error && <p role="alert">{state.error}</p>}
      <input name="name" placeholder="Your name" required />
      <textarea name="message" placeholder="Message" required />
      <SubmitButton />
    </form>
  );
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `mode` in useForm | `'onSubmit'` | When to validate: `'onChange'`, `'onBlur'`, `'onSubmit'` |
| `reValidateMode` | `'onChange'` | Re-validate trigger after first submit |
| `criteriaMode` | `'firstError'` | Show first or all errors per field |
| `defaultValues` | `undefined` | Set initial values (required for `useFieldArray`) |

## Example Usage

```tsx
// Controlled component with watch — use sparingly (triggers re-renders)
const watchEmail = watch('email');
```

## See Also

- [concepts/state-management.md](../concepts/state-management.md)
- [concepts/hooks.md](../concepts/hooks.md)
- [patterns/data-fetching.md](data-fetching.md)
