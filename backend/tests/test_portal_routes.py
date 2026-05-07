"""Integration tests for the 4 portal endpoints.

Maps to AT-005 (bootstrap shape), AT-007 (submit-and-close), AT-008 (renew),
AT-009 (404 unknown session). Uses the conftest.py `client` fixture.
"""
import pytest

from fixtures.portal_fixtures import CONSENT_TEXT_VERSION

VALID_BODY = {
    "venue_id": "22222222-2222-2222-2222-222222222222",
    "device_id": "00000000-0000-0000-0000-000000000099",
    "mac_hash": "a" * 64,
    "campaign_id": "33333333-3333-3333-3333-333333333333",
    "lead": {
        "first_name": "Maria",
        "age_band": "25-34",
        "gender": "Feminino",
        "neighborhood": "Centro",
    },
    "consent": {"accepted": True, "consent_text_version": CONSENT_TEXT_VERSION},
}


@pytest.mark.asyncio
async def test_bootstrap_returns_locked_fixture(client):
    """AT-005: bootstrap response shape matches the fixture."""
    r = await client.get(
        "/api/portal/bootstrap",
        params={
            "venue_id": "22222222-2222-2222-2222-222222222222",
            "device_id": "00000000-0000-0000-0000-000000000099",
            "mac_hash": "a" * 64,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["venue"]["name"] == "Praça Central"
    assert data["venue"]["pill_label"] == "PRAÇA CENTRAL · WI-FI GRATUITO"
    assert data["venue"]["branding"]["primary_color"] == "#0A84FF"
    assert data["active_campaign"]["advertiser_name"] == "Café Imperial"
    assert data["active_campaign"]["ad_seconds"] == 30
    assert len(data["form_config"]["fields"]) == 4
    assert data["form_config"]["consent_text_version"] == CONSENT_TEXT_VERSION


@pytest.mark.asyncio
async def test_connect_persists_pending_session_but_no_authorize(client):
    """AT-007: form submit creates a pending_ad session — MAC NOT authorized yet."""
    from portal_routes import SESSIONS
    r = await client.post("/api/connect", json=VALID_BODY)
    assert r.status_code == 201
    data = r.json()
    assert "session_id" in data
    assert data["redirect_to_ad"] is True
    assert data["ad_seconds"] == 30
    sid = data["session_id"]
    from uuid import UUID
    assert UUID(sid) in SESSIONS
    state = SESSIONS[UUID(sid)]
    assert state.status == "pending_ad"
    assert state.expires_at is None  # NOT authorized yet — exploit prevented


@pytest.mark.asyncio
async def test_connect_rejects_consent_not_accepted(client):
    body = {**VALID_BODY, "consent": {**VALID_BODY["consent"], "accepted": False}}
    r = await client.post("/api/connect", json=body)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_connect_rejects_forbidden_field(client):
    """AT-003 at the wire level: extra fields produce 422."""
    body = {
        **VALID_BODY,
        "lead": {**VALID_BODY["lead"], "phone": "+5511999990000"},
    }
    r = await client.post("/api/connect", json=body)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_ad_complete_grants_access(client):
    r = await client.post("/api/connect", json=VALID_BODY)
    sid = r.json()["session_id"]
    r2 = await client.post(f"/api/sessions/{sid}/ad-complete")
    assert r2.status_code == 200
    data = r2.json()
    assert data["remaining_seconds"] == 1800
    assert "expires_at" in data
    from portal_routes import SESSIONS
    from uuid import UUID
    state = SESSIONS[UUID(sid)]
    assert state.status == "authorized"
    assert state.expires_at is not None


@pytest.mark.asyncio
async def test_renew_returns_60_second_ad(client):
    """AT-008: renew returns a campaign with ad_seconds=60 and the same session id."""
    r = await client.post("/api/connect", json=VALID_BODY)
    sid = r.json()["session_id"]
    await client.post(f"/api/sessions/{sid}/ad-complete")
    r2 = await client.post(f"/api/sessions/{sid}/renew")
    assert r2.status_code == 200
    data = r2.json()
    assert data["pending_session_id"] == sid
    assert data["campaign"]["ad_seconds"] == 60
    assert data["campaign"]["advertiser_name"] == "Café Imperial"


@pytest.mark.asyncio
async def test_ad_complete_unknown_session_returns_404(client):
    """AT-009: unknown session id → 404 with structured detail."""
    r = await client.post(
        "/api/sessions/00000000-0000-0000-0000-000000000000/ad-complete"
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "session_not_found"


@pytest.mark.asyncio
async def test_renew_unknown_session_returns_404(client):
    r = await client.post(
        "/api/sessions/00000000-0000-0000-0000-000000000000/renew"
    )
    assert r.status_code == 404
