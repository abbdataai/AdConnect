// Hand-written TypeScript mirrors of the Pydantic schemas in
// backend/schemas/portal.py. Drift detected by backend
// test_openapi_contract.py::test_model_field_sets_locked.

export type AgeBand = "18-24" | "25-34" | "35-50" | "50+";
export type Gender = "Feminino" | "Masculino" | "Prefiro não informar";
export type Neighborhood =
  | "Centro" | "Zona Norte" | "Zona Sul"
  | "Zona Leste" | "Zona Oeste" | "Praia";

export type Branding = {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
};

export type Organization = {
  id: string;
  slug: string;
};

export type Venue = {
  id: string;
  name: string;
  pill_label: string;
  organization: Organization;
  branding: Branding;
  legal_terms_url: string;
  legal_privacy_url: string;
};

export type FormFieldSpec = {
  id: "name" | "age_band" | "gender" | "neighborhood";
  label: string;
  type: "text" | "chip" | "select";
  required: boolean;
  options: string[] | null;
};

export type FormConfig = {
  fields: FormFieldSpec[];
  consent_text: string;
  consent_text_version: string;
};

export type CampaignAd = {
  id: string;
  advertiser_name: string;
  advertiser_slogan: string;
  video_url: string | null;
  source: "YouTube" | "Upload";
  ad_seconds: number;
};

export type BootstrapResponse = {
  venue: Venue;
  active_campaign: CampaignAd;
  form_config: FormConfig;
};

export type LeadIn = {
  first_name: string;
  age_band: AgeBand;
  gender: Gender;
  neighborhood: Neighborhood;
};

export type ConsentIn = {
  accepted: boolean;
  consent_text_version: string;
};

export type ConnectRequest = {
  venue_id: string;
  device_id: string;
  mac_hash: string;
  campaign_id: string;
  lead: LeadIn;
  consent: ConsentIn;
};

export type ConnectResponse = {
  session_id: string;
  redirect_to_ad: boolean;
  ad_seconds: number;
};

export type AdCompleteResponse = {
  expires_at: string;
  remaining_seconds: number;
};

export type RenewResponse = {
  campaign: CampaignAd;
  pending_session_id: string;
};

export type PortalQuery = {
  venue_id: string;
  device_id: string;
  mac_hash: string;
};
