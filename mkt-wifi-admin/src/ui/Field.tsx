import type { ChangeEvent } from "react";

type TextProps = {
  kind: "text" | "email" | "password" | "number";
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  required?: boolean;
  testId?: string;
};

type SelectProps = {
  kind: "select";
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  testId?: string;
};

export function Field(props: TextProps | SelectProps) {
  if (props.kind === "select") {
    const { label, value, options, onChange, testId } = props;
    return (
      <label className="field" data-testid={testId}>
        <span className="field__label">{label}</span>
        <select
          className="field__input"
          value={value}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        >
          <option value="" disabled>Selecione…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>
    );
  }
  const { kind, label, value, placeholder, onChange, required, testId } = props;
  return (
    <label className="field" data-testid={testId}>
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type={kind}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </label>
  );
}
