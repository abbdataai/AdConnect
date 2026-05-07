import type { ChangeEvent } from "react";

type TextProps = {
  kind: "text";
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  testId?: string;
};

type SelectProps = {
  kind: "select";
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string) => void;
  testId?: string;
};

export function Field(props: TextProps | SelectProps) {
  if (props.kind === "text") {
    const { label, value, placeholder, onChange, testId } = props;
    return (
      <label className="field" data-testid={testId}>
        <span className="field__label">{label}</span>
        <input
          className="field__input"
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
      </label>
    );
  }
  const { label, value, options, onChange, testId } = props;
  return (
    <label className="field" data-testid={testId}>
      <span className="field__label">{label}</span>
      <select
        className="field__input"
        value={value ?? ""}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Selecione…
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
