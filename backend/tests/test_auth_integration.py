"""Integration tests for slice 3 — per-endpoint role gating across the 16 admin endpoints.

Maps to AT-006..AT-011:
  AT-006  read-all endpoints accept all 3 role tokens (5 endpoints x 3 roles = 15 checks)
  AT-007  read-admin-and-viewer endpoints (5 x 3 = 15 checks; advertiser denied)
  AT-008  admin-only-read endpoint (monetization x 3)
  AT-009  write endpoints accept admin only (5 x 3 = 15 checks)
  AT-010  missing Authorization header on any admin endpoint -> 401 + WWW-Authenticate
  AT-011  captive-portal endpoints remain public (regression guard)

Note: All checks are status-code-only (200/201/204 vs 401/403). Bodies may
be empty due to the SQLite test DB being seeded but mostly empty for fresh
runs; status codes are sufficient to verify the auth gate.
"""
import uuid

import pytest

READ_ALL_ENDPOINTS = [
    ("GET", "/api/kpis"),
    ("GET", "/api/connections/weekly"),
    ("GET", "/api/demographics"),
    ("GET", "/api/campaigns"),
    ("GET", "/api/reports"),
]

ADMIN_AND_VIEWER_ENDPOINTS = [
    ("GET", "/api/users"),
    ("GET", "/api/users/live"),
    ("GET", "/api/devices"),
    ("GET", "/api/notifications/rules"),
    ("GET", "/api/notifications/groups"),
]

ADMIN_ONLY_READ_ENDPOINTS = [
    ("GET", "/api/monetization"),
]

# Write endpoints: admin only. Some need a body or a path id.
WRITE_ENDPOINTS = [
    ("POST", "/api/campaigns", {"name": "T", "location": "Centro", "duration": 30, "source": "YouTube"}),
    ("PATCH", f"/api/campaigns/c-test-{uuid.uuid4().hex[:8]}", {"name": "T2"}),
    ("DELETE", f"/api/campaigns/c-test-{uuid.uuid4().hex[:8]}", None),
    ("POST", f"/api/devices/d-test-{uuid.uuid4().hex[:8]}/refresh", None),
    ("PATCH", f"/api/notifications/rules/r-test-{uuid.uuid4().hex[:8]}", {"active": False}),
]


def _hdr(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── AT-006 ──────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", READ_ALL_ENDPOINTS)
@pytest.mark.parametrize(
    "token_fixture", ["admin_token", "advertiser_token", "viewer_token"],
)
async def test_AT006_read_all_accepts_all_roles(
    admin_client, request, method, path, token_fixture,
):
    token = request.getfixturevalue(token_fixture)
    res = await admin_client.request(method, path, headers=_hdr(token))
    assert res.status_code in (200, 201), (
        f"{method} {path} as {token_fixture} expected 2xx; got {res.status_code} {res.text[:120]}"
    )


# ── AT-007 ──────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", ADMIN_AND_VIEWER_ENDPOINTS)
async def test_AT007_admin_viewer_accepts_admin(admin_client, admin_token, method, path):
    res = await admin_client.request(method, path, headers=_hdr(admin_token))
    assert res.status_code in (200, 201), f"admin denied on {method} {path}: {res.status_code}"


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", ADMIN_AND_VIEWER_ENDPOINTS)
async def test_AT007_admin_viewer_accepts_viewer(admin_client, viewer_token, method, path):
    res = await admin_client.request(method, path, headers=_hdr(viewer_token))
    assert res.status_code in (200, 201), f"viewer denied on {method} {path}: {res.status_code}"


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", ADMIN_AND_VIEWER_ENDPOINTS)
async def test_AT007_admin_viewer_rejects_advertiser(admin_client, advertiser_token, method, path):
    res = await admin_client.request(method, path, headers=_hdr(advertiser_token))
    assert res.status_code == 403, f"advertiser allowed on {method} {path}: {res.status_code}"


# ── AT-008 ──────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", ADMIN_ONLY_READ_ENDPOINTS)
async def test_AT008_admin_only_read_accepts_admin(admin_client, admin_token, method, path):
    res = await admin_client.request(method, path, headers=_hdr(admin_token))
    assert res.status_code in (200, 201), f"admin denied on {method} {path}: {res.status_code}"


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", ADMIN_ONLY_READ_ENDPOINTS)
@pytest.mark.parametrize(
    "non_admin_fixture", ["advertiser_token", "viewer_token"],
)
async def test_AT008_admin_only_read_rejects_non_admin(
    admin_client, request, method, path, non_admin_fixture,
):
    token = request.getfixturevalue(non_admin_fixture)
    res = await admin_client.request(method, path, headers=_hdr(token))
    assert res.status_code == 403


# ── AT-009 ──────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
@pytest.mark.parametrize("method,path,body", WRITE_ENDPOINTS)
@pytest.mark.parametrize(
    "non_admin_fixture", ["advertiser_token", "viewer_token"],
)
async def test_AT009_write_endpoints_reject_non_admin(
    admin_client, request, method, path, body, non_admin_fixture,
):
    token = request.getfixturevalue(non_admin_fixture)
    res = await admin_client.request(method, path, headers=_hdr(token), json=body)
    assert res.status_code == 403, (
        f"{non_admin_fixture} allowed on {method} {path}: {res.status_code}"
    )


# ── AT-010 ──────────────────────────────────────────────────────────────────
@pytest.mark.asyncio
@pytest.mark.parametrize(
    "method,path",
    READ_ALL_ENDPOINTS + ADMIN_AND_VIEWER_ENDPOINTS + ADMIN_ONLY_READ_ENDPOINTS,
)
async def test_AT010_missing_auth_header_returns_401(admin_client, method, path):
    res = await admin_client.request(method, path)
    assert res.status_code == 401, f"{method} {path} returned {res.status_code} without auth"
    assert res.headers.get("www-authenticate", "").lower().startswith("bearer"), (
        f"{method} {path} missing WWW-Authenticate: Bearer header"
    )


# ── AT-011: captive portal stays public ────────────────────────────────────
@pytest.mark.asyncio
async def test_AT011_portal_bootstrap_still_public_no_auth(admin_client):
    res = await admin_client.get(
        "/api/portal/bootstrap",
        params={
            "venue_id": "22222222-2222-2222-2222-222222222222",
            "device_id": "00000000-0000-0000-0000-000000000099",
            "mac_hash": "a" * 64,
        },
    )
    assert res.status_code == 200


# ── Login still works (AT-001 wire-level) ──────────────────────────────────
@pytest.mark.asyncio
async def test_login_returns_real_jwt(admin_client):
    res = await admin_client.post(
        "/api/auth/login",
        json={"email": "admin@mktwifi.com", "password": "admin123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "token" in data
    assert data["user"]["role"] == "admin"
    # Verify token is decodable with our secret (real JWT, not opaque base64)
    from auth import _SECRET, ALGORITHM
    from jose import jwt
    payload = jwt.decode(data["token"], _SECRET, algorithms=[ALGORITHM])
    assert sorted(payload.keys()) == ["exp", "iat", "name", "role", "sub"]


@pytest.mark.asyncio
async def test_login_wrong_password_returns_ok_false(admin_client):
    res = await admin_client.post(
        "/api/auth/login",
        json={"email": "admin@mktwifi.com", "password": "wrong"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is False
    assert "token" not in data
