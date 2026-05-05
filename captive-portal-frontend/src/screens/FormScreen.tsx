import { useState } from "react";
import { STR } from "../strings";
import { Button } from "../ui/Button";
import { CheckboxConsent } from "../ui/CheckboxConsent";
import { ChipGroup } from "../ui/ChipGroup";
import { Field } from "../ui/Field";
import { Pill } from "../ui/Pill";
import type {
  AgeBand, BootstrapResponse, ConnectRequest, Gender, Neighborhood,
  PortalQuery,
} from "../state/types";
import { postConnect } from "../state/api";

type Props = {
  bootstrap: BootstrapResponse;
  query: PortalQuery;
  onSubmitted: (sessionId: string, firstName: string, adSeconds: number) => void;
};

const AGE_OPTIONS: AgeBand[] = ["18-24", "25-34", "35-50", "50+"];
const GENDER_OPTIONS: Gender[] = ["Feminino", "Masculino", "Prefiro não informar"];

export function FormScreen({ bootstrap, query, onSubmitted }: Props) {
  const [firstName, setFirstName] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const neighborhoodField = bootstrap.form_config.fields.find(
    (f) => f.id === "neighborhood",
  );
  const neighborhoodOptions = (neighborhoodField?.options ?? []) as Neighborhood[];

  const trimmedName = firstName.trim();
  const isValid =
    trimmedName.length >= 3 &&
    ageBand !== null &&
    gender !== null &&
    neighborhood !== null &&
    consent;

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const body: ConnectRequest = {
        venue_id: query.venue_id,
        device_id: query.device_id,
        mac_hash: query.mac_hash,
        campaign_id: bootstrap.active_campaign.id,
        lead: {
          first_name: trimmedName,
          age_band: ageBand!,
          gender: gender!,
          neighborhood: neighborhood!,
        },
        consent: {
          accepted: true,
          consent_text_version: bootstrap.form_config.consent_text_version,
        },
      };
      const res = await postConnect(body);
      onSubmitted(res.session_id, trimmedName, res.ad_seconds);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="screen screen--form" data-testid="screen-form">
      <header className="screen__header">
        <Pill>{bootstrap.venue.pill_label}</Pill>
        <h1 className="screen__headline">{STR.form.headline}</h1>
        <p className="screen__sub">{STR.form.sub}</p>
      </header>
      <Field
        kind="text"
        label={STR.form.fields.name.label}
        placeholder={STR.form.fields.name.placeholder}
        value={firstName}
        onChange={setFirstName}
        testId="field-name"
      />
      <ChipGroup
        label={STR.form.fields.age.label}
        options={AGE_OPTIONS}
        value={ageBand}
        onChange={(v) => setAgeBand(v as AgeBand)}
        testId="field-age"
      />
      <ChipGroup
        label={STR.form.fields.gender.label}
        options={GENDER_OPTIONS}
        value={gender}
        onChange={(v) => setGender(v as Gender)}
        testId="field-gender"
      />
      <Field
        kind="select"
        label={STR.form.fields.neighborhood.label}
        value={neighborhood}
        options={neighborhoodOptions}
        onChange={(v) => setNeighborhood(v as Neighborhood)}
        testId="field-neighborhood"
      />
      <CheckboxConsent
        checked={consent}
        onChange={setConsent}
        termsUrl={bootstrap.venue.legal_terms_url}
      />
      <Button
        type="button"
        disabled={!isValid || submitting}
        onClick={handleSubmit}
        data-testid="submit"
      >
        {STR.form.submit}
      </Button>
      <p className="form__privacy">{STR.form.privacyReassurance}</p>
    </main>
  );
}
