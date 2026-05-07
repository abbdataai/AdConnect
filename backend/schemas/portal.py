"""Pydantic v2 schemas for the captive-portal contract.

NFR-005 (LGPD anonymization mandate, Legal sign-off 2026-05-03) is enforced at
the type-system level: only `first_name + age_band + gender + neighborhood` are
collectable. `extra="forbid"` rejects any unknown field at runtime; the AT-015
grep script blocks forbidden identifiers from appearing in source.
"""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

AgeBand = Literal["18-24", "25-34", "35-50", "50+"]
Gender = Literal["Feminino", "Masculino", "Prefiro não informar"]
Neighborhood = Literal[
    "Centro", "Zona Norte", "Zona Sul",
    "Zona Leste", "Zona Oeste", "Praia",
]


class _ForbidExtra(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Branding(_ForbidExtra):
    logo_url: str
    primary_color: str
    secondary_color: str


class Organization(_ForbidExtra):
    id: UUID
    slug: str


class Venue(_ForbidExtra):
    id: UUID
    name: str
    pill_label: str
    organization: Organization
    branding: Branding
    legal_terms_url: str
    legal_privacy_url: str


class FormField(_ForbidExtra):
    id: Literal["name", "age_band", "gender", "neighborhood"]
    label: str
    type: Literal["text", "chip", "select"]
    required: bool
    options: list[str] | None = None


class FormConfig(_ForbidExtra):
    fields: list[FormField]
    consent_text: str
    consent_text_version: str


class CampaignAd(_ForbidExtra):
    id: UUID
    advertiser_name: str
    advertiser_slogan: str
    video_url: str | None
    source: Literal["YouTube", "Upload"]
    ad_seconds: int


class BootstrapResponse(_ForbidExtra):
    venue: Venue
    active_campaign: CampaignAd
    form_config: FormConfig


class LeadIn(_ForbidExtra):
    first_name: str = Field(min_length=3, max_length=80)
    age_band: AgeBand
    gender: Gender
    neighborhood: Neighborhood


class ConsentIn(_ForbidExtra):
    accepted: bool
    consent_text_version: str


class ConnectRequest(_ForbidExtra):
    venue_id: UUID
    device_id: UUID
    mac_hash: str = Field(min_length=64, max_length=64)
    campaign_id: UUID
    lead: LeadIn
    consent: ConsentIn


class ConnectResponse(_ForbidExtra):
    session_id: UUID
    redirect_to_ad: bool = True
    ad_seconds: int = 30


class AdCompleteResponse(_ForbidExtra):
    expires_at: datetime
    remaining_seconds: int = 1800


class RenewResponse(_ForbidExtra):
    campaign: CampaignAd
    pending_session_id: UUID
