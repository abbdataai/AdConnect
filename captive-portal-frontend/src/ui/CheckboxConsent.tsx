import { STR } from "../strings";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  termsUrl: string;
};

export function CheckboxConsent({ checked, onChange, termsUrl }: Props) {
  return (
    <label className="consent">
      <input
        type="checkbox"
        className="consent__checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid="consent-checkbox"
      />
      <span className="consent__text">
        {STR.form.consentBefore}
        <a href={termsUrl} target="_blank" rel="noreferrer" className="consent__link">
          {STR.form.consentLink}
        </a>
        {STR.form.consentAfter}
      </span>
    </label>
  );
}
