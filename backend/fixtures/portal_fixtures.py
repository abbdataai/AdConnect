"""Single-tenant fixtures for the captive-portal vertical slice.

Shape matches future DB rows; values invented. When multi-tenancy lands
(NFR-017, BD-08), each fixture below becomes a SELECT query joined through
organization_id; the schema is unchanged.
"""
from uuid import UUID

from schemas.portal import (
    Branding, CampaignAd, FormConfig, FormField, Organization, Venue,
)

CONSENT_TEXT = (
    "Aceito os termos de uso e o tratamento dos meus dados conforme a LGPD."
)
CONSENT_TEXT_VERSION = "2026-05-03-v1"

FIRST_SESSION_AD_SECONDS = 30
RENEWAL_AD_SECONDS = 60
FIRST_SESSION_GRANT_SECONDS = 1800

VENUE_SALT_PRACA_CENTRAL = "placeholder-32-bytes-todo-mikrotik"

PRACA_CENTRAL_ORG = Organization(
    id=UUID("11111111-1111-1111-1111-111111111111"),
    slug="acme",
)

PRACA_CENTRAL_VENUE = Venue(
    id=UUID("22222222-2222-2222-2222-222222222222"),
    name="Praça Central",
    pill_label="PRAÇA CENTRAL · WI-FI GRATUITO",
    organization=PRACA_CENTRAL_ORG,
    branding=Branding(
        logo_url="/assets/praca-central-logo.svg",
        primary_color="#0A84FF",
        secondary_color="#5AC8FA",
    ),
    legal_terms_url="/legal/terms",
    legal_privacy_url="/legal/privacy",
)

CAFE_IMPERIAL_CAMPAIGN = CampaignAd(
    id=UUID("33333333-3333-3333-3333-333333333333"),
    advertiser_name="Café Imperial",
    advertiser_slogan="O sabor que conquista",
    video_url=None,
    source="Upload",
    ad_seconds=FIRST_SESSION_AD_SECONDS,
)

FORM_CONFIG_LOCKED = FormConfig(
    fields=[
        FormField(id="name", label="Nome", type="text", required=True),
        FormField(
            id="age_band", label="Idade", type="chip", required=True,
            options=["18-24", "25-34", "35-50", "50+"],
        ),
        FormField(
            id="gender", label="Gênero", type="chip", required=True,
            options=["Feminino", "Masculino", "Prefiro não informar"],
        ),
        FormField(
            id="neighborhood", label="Bairro", type="select", required=True,
            options=["Centro", "Zona Norte", "Zona Sul",
                     "Zona Leste", "Zona Oeste", "Praia"],
        ),
    ],
    consent_text=CONSENT_TEXT,
    consent_text_version=CONSENT_TEXT_VERSION,
)
