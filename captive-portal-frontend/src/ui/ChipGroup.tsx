type Props = {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  testId?: string;
};

export function ChipGroup({ label, options, value, onChange, testId }: Props) {
  return (
    <div className="field" data-testid={testId}>
      <span className="field__label">{label}</span>
      <div className="chip-group" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-pressed={selected}
              className={`chip${selected ? " chip--selected" : ""}`}
              onClick={() => onChange(opt)}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
