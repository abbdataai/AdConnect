"""OpenAPI contract drift detection (Decision 6, AT-016).

Loads the generated OpenAPI spec for the portal-only app and asserts that the
13 model schemas have the locked field sets. If a Pydantic schema changes
without the hand-written TS types being updated, this test catches it before
the frontend breaks at runtime.
"""
import pytest

EXPECTED_PORTAL_PATHS = {
    "/api/portal/bootstrap",
    "/api/connect",
    "/api/sessions/{session_id}/ad-complete",
    "/api/sessions/{session_id}/renew",
}

EXPECTED_MODELS = {
    "AdCompleteResponse": {"expires_at", "remaining_seconds"},
    "Branding": {"logo_url", "primary_color", "secondary_color"},
    "BootstrapResponse": {"venue", "active_campaign", "form_config"},
    "CampaignAd": {"id", "advertiser_name", "advertiser_slogan", "video_url",
                   "source", "ad_seconds"},
    "ConnectRequest": {"venue_id", "device_id", "mac_hash", "campaign_id",
                       "lead", "consent"},
    "ConnectResponse": {"session_id", "redirect_to_ad", "ad_seconds"},
    "ConsentIn": {"accepted", "consent_text_version"},
    "FormConfig": {"fields", "consent_text", "consent_text_version"},
    "FormField": {"id", "label", "type", "required", "options"},
    "LeadIn": {"first_name", "age_band", "gender", "neighborhood"},
    "Organization": {"id", "slug"},
    "RenewResponse": {"campaign", "pending_session_id"},
    "Venue": {"id", "name", "pill_label", "organization", "branding",
              "legal_terms_url", "legal_privacy_url"},
}


@pytest.mark.asyncio
async def test_all_portal_paths_present(client):
    r = await client.get("/openapi.json")
    assert r.status_code == 200
    spec = r.json()
    paths = set(spec["paths"].keys())
    missing = EXPECTED_PORTAL_PATHS - paths
    assert not missing, f"Missing paths in OpenAPI: {missing}"


@pytest.mark.asyncio
async def test_paths_tagged_portal(client):
    r = await client.get("/openapi.json")
    spec = r.json()
    for path in EXPECTED_PORTAL_PATHS:
        for method, op in spec["paths"][path].items():
            assert "portal" in op.get("tags", []), (
                f"{method.upper()} {path} missing 'portal' tag"
            )


@pytest.mark.asyncio
async def test_model_field_sets_locked(client):
    """If a field is added/removed from a Pydantic schema without updating the
    TS type mirror, this fails — drift guard per Decision 6."""
    r = await client.get("/openapi.json")
    spec = r.json()
    schemas = spec.get("components", {}).get("schemas", {})
    for model_name, expected_fields in EXPECTED_MODELS.items():
        assert model_name in schemas, f"Model {model_name} missing in OpenAPI"
        actual_fields = set(schemas[model_name].get("properties", {}).keys())
        assert actual_fields == expected_fields, (
            f"{model_name} field drift — "
            f"expected {expected_fields}, got {actual_fields}"
        )


@pytest.mark.asyncio
async def test_no_any_type_in_schemas(client):
    """AT-016: no field has type 'Any' or empty schema {}."""
    r = await client.get("/openapi.json")
    spec = r.json()
    schemas = spec.get("components", {}).get("schemas", {})
    for model_name in EXPECTED_MODELS:
        for field_name, field_schema in schemas[model_name].get(
            "properties", {}
        ).items():
            assert field_schema, (
                f"{model_name}.{field_name} has empty schema (Any-typed?)"
            )
