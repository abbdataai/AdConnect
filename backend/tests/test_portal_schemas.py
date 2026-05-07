"""Schema-level tests — Pydantic validation enforces NFR-005 (LGPD anonymization).

Maps to AT-003 + AT-006 (mac_hash boundary).
"""
import pytest
from pydantic import ValidationError

from schemas.portal import (
    AdCompleteResponse, ConnectRequest, ConsentIn, LeadIn,
)

VALID_LEAD = {
    "first_name": "Maria",
    "age_band": "25-34",
    "gender": "Feminino",
    "neighborhood": "Centro",
}


def test_lead_in_accepts_valid_payload():
    lead = LeadIn(**VALID_LEAD)
    assert lead.first_name == "Maria"


@pytest.mark.parametrize(
    "forbidden_field,value",
    [
        ("phone", "+5511999990000"),
        ("email", "user@example.com"),
        ("cpf", "000.000.000-00"),
        ("last_name", "Silva"),
        ("mac_address", "AA:BB:CC:DD:EE:FF"),
    ],
)
def test_lead_in_rejects_forbidden_field(forbidden_field, value):
    """AT-003: any of the 5 LGPD-forbidden fields must trigger Pydantic 422."""
    payload = {**VALID_LEAD, forbidden_field: value}
    with pytest.raises(ValidationError) as exc_info:
        LeadIn(**payload)
    assert "extra" in str(exc_info.value).lower() or "forbidden" in str(exc_info.value).lower()


@pytest.mark.parametrize("first_name", ["", "Jo", "  "])
def test_lead_in_rejects_short_first_name(first_name):
    payload = {**VALID_LEAD, "first_name": first_name}
    with pytest.raises(ValidationError):
        LeadIn(**payload)


@pytest.mark.parametrize("invalid_age", ["10-17", "60+", "25_34", ""])
def test_lead_in_rejects_invalid_age_band(invalid_age):
    payload = {**VALID_LEAD, "age_band": invalid_age}
    with pytest.raises(ValidationError):
        LeadIn(**payload)


@pytest.mark.parametrize("invalid_gender", ["X", "Other", "Não-binário", ""])
def test_lead_in_rejects_invalid_gender(invalid_gender):
    payload = {**VALID_LEAD, "gender": invalid_gender}
    with pytest.raises(ValidationError):
        LeadIn(**payload)


@pytest.mark.parametrize(
    "invalid_neighborhood", ["Vila Madalena", "Pinheiros", "Centro Histórico", ""],
)
def test_lead_in_rejects_invalid_neighborhood(invalid_neighborhood):
    payload = {**VALID_LEAD, "neighborhood": invalid_neighborhood}
    with pytest.raises(ValidationError):
        LeadIn(**payload)


def test_consent_requires_text_version():
    with pytest.raises(ValidationError):
        ConsentIn(accepted=True)


def test_connect_request_mac_hash_must_be_64_chars():
    """AT-006 boundary: mac_hash field is locked at sha256-hex length."""
    base = {
        "venue_id": "00000000-0000-0000-0000-000000000001",
        "device_id": "00000000-0000-0000-0000-000000000002",
        "campaign_id": "00000000-0000-0000-0000-000000000003",
        "lead": VALID_LEAD,
        "consent": {"accepted": True, "consent_text_version": "v1"},
    }
    with pytest.raises(ValidationError):
        ConnectRequest(**base, mac_hash="too_short")
    with pytest.raises(ValidationError):
        ConnectRequest(**base, mac_hash="x" * 65)
    valid = ConnectRequest(**base, mac_hash="a" * 64)
    assert len(valid.mac_hash) == 64


def test_ad_complete_default_remaining():
    from datetime import datetime, timezone
    r = AdCompleteResponse(expires_at=datetime.now(timezone.utc))
    assert r.remaining_seconds == 1800
