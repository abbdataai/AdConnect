"""Unit tests for backend/auth.py — slice 3 token mechanics (AT-001..AT-005).

Tests:
  AT-001  login mints valid JWT with exactly 5 claims, 7-day TTL
  AT-002  wrong password — no JWT minted (login flow integration)
  AT-003  expired token rejected with 401 token_expired
  AT-004  malformed/wrong-signature token rejected with 401 invalid_token
  AT-005  missing/unknown role claim rejected with 401 invalid_token
  +AT-020 random-secret WARNING fires when JWT_SECRET unset (manual env manipulation)
"""
import time

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from auth import (
    ALGORITHM,
    JWT_TTL_SECONDS,
    UserClaims,
    _SECRET,
    mint_token,
    require_role,
    verify_token,
)


def _bearer(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_AT001_mint_token_has_exactly_5_claims_and_7day_ttl():
    t = mint_token(sub="admin@mktwifi.com", name="Admin", role="admin")
    payload = jwt.decode(t, _SECRET, algorithms=[ALGORITHM])
    assert sorted(payload.keys()) == ["exp", "iat", "name", "role", "sub"]
    assert payload["sub"] == "admin@mktwifi.com"
    assert payload["name"] == "Admin"
    assert payload["role"] == "admin"
    assert payload["exp"] - payload["iat"] == JWT_TTL_SECONDS == 604800


def test_verify_token_happy_path_returns_userclaims():
    t = mint_token(sub="x@x.com", name="X", role="admin")
    user = verify_token(_bearer(t))
    assert isinstance(user, UserClaims)
    assert user.sub == "x@x.com"
    assert user.role == "admin"


def test_verify_token_no_credentials_raises_401_not_authenticated():
    with pytest.raises(HTTPException) as exc:
        verify_token(None)
    assert exc.value.status_code == 401
    assert exc.value.detail == "not_authenticated"
    assert exc.value.headers["WWW-Authenticate"] == 'Bearer realm="api"'


def test_verify_token_wrong_scheme_raises_401_not_authenticated():
    with pytest.raises(HTTPException) as exc:
        verify_token(HTTPAuthorizationCredentials(scheme="Basic", credentials="abc"))
    assert exc.value.status_code == 401
    assert exc.value.detail == "not_authenticated"


def test_AT003_expired_token_returns_401_token_expired(expired_token):
    with pytest.raises(HTTPException) as exc:
        verify_token(_bearer(expired_token))
    assert exc.value.status_code == 401
    assert exc.value.detail == "token_expired"


def test_AT004_malformed_token_returns_401_invalid_token(malformed_token):
    with pytest.raises(HTTPException) as exc:
        verify_token(_bearer(malformed_token))
    assert exc.value.status_code == 401
    assert exc.value.detail == "invalid_token"


def test_AT004_wrong_signature_token_returns_401_invalid_token():
    now = int(time.time())
    bad = jwt.encode(
        {"sub": "x@x.com", "name": "X", "role": "admin", "iat": now, "exp": now + 60},
        "different-secret",
        algorithm=ALGORITHM,
    )
    with pytest.raises(HTTPException) as exc:
        verify_token(_bearer(bad))
    assert exc.value.status_code == 401
    assert exc.value.detail == "invalid_token"


def test_AT005_unknown_role_returns_401_invalid_token(role_unknown_token):
    with pytest.raises(HTTPException) as exc:
        verify_token(_bearer(role_unknown_token))
    assert exc.value.status_code == 401
    assert exc.value.detail == "invalid_token"


def test_AT005_missing_role_claim_returns_401_invalid_token():
    now = int(time.time())
    no_role = jwt.encode(
        {"sub": "x@x.com", "name": "X", "iat": now, "exp": now + 60},
        _SECRET,
        algorithm=ALGORITHM,
    )
    with pytest.raises(HTTPException) as exc:
        verify_token(_bearer(no_role))
    assert exc.value.status_code == 401
    assert exc.value.detail == "invalid_token"


def test_AT005_missing_sub_claim_returns_401_invalid_token():
    now = int(time.time())
    no_sub = jwt.encode(
        {"name": "X", "role": "admin", "iat": now, "exp": now + 60},
        _SECRET,
        algorithm=ALGORITHM,
    )
    with pytest.raises(HTTPException) as exc:
        verify_token(_bearer(no_sub))
    assert exc.value.status_code == 401


def test_require_role_admin_allowed_returns_userclaims():
    t = mint_token(sub="x@x.com", name="X", role="admin")
    user = verify_token(_bearer(t))
    dep = require_role(["admin"])
    result = dep(user)
    assert result.role == "admin"


def test_require_role_mismatch_raises_403_forbidden():
    t = mint_token(sub="x@x.com", name="X", role="advertiser")
    user = verify_token(_bearer(t))
    dep = require_role(["admin"])
    with pytest.raises(HTTPException) as exc:
        dep(user)
    assert exc.value.status_code == 403
    assert exc.value.detail == "forbidden"


def test_require_role_admin_or_viewer_accepts_both():
    dep = require_role(["admin", "viewer"])

    admin_user = verify_token(_bearer(mint_token(sub="a@x.com", name="A", role="admin")))
    viewer_user = verify_token(_bearer(mint_token(sub="v@x.com", name="V", role="viewer")))
    assert dep(admin_user).role == "admin"
    assert dep(viewer_user).role == "viewer"


def test_require_role_admin_or_viewer_rejects_advertiser():
    dep = require_role(["admin", "viewer"])
    advertiser_user = verify_token(_bearer(
        mint_token(sub="ad@x.com", name="Ad", role="advertiser"),
    ))
    with pytest.raises(HTTPException) as exc:
        dep(advertiser_user)
    assert exc.value.status_code == 403


def test_AT020_random_secret_warning_fires_when_jwt_secret_unset(monkeypatch, caplog):
    """When JWT_SECRET is unset and ENVIRONMENT is dev, get_secret() emits a WARNING."""
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "dev")
    import importlib

    import auth
    with caplog.at_level("WARNING", logger="auth"):
        secret = auth.get_secret()
        assert isinstance(secret, str)
        assert len(secret) >= 30
    warned = any("JWT_SECRET unset" in rec.message for rec in caplog.records)
    assert warned, "expected WARNING about JWT_SECRET being unset"
    importlib.reload(auth)


def test_get_secret_fail_fast_in_production_when_unset(monkeypatch):
    """When JWT_SECRET is unset and ENVIRONMENT=production, get_secret() raises RuntimeError."""
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    import auth
    with pytest.raises(RuntimeError, match="JWT_SECRET must be set in production"):
        auth.get_secret()
