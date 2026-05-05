type Props<T extends string> = {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
};

export function Tabs<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="tabs" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          className={`tab${value === opt.id ? " tab--selected" : ""}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
