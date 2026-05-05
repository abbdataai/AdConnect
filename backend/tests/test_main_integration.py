"""Smoke tests guarding the main.py edits in Decision 1.

Ensures the legacy /api/connect deletion didn't break the admin app, and that
the portal router is properly mounted on the full FastAPI instance.
"""
import pytest


@pytest.mark.asyncio
async def test_legacy_connect_route_deleted_at_module_level():
    """Legacy POST /api/connect handler that collected phone/email is gone."""
    import main
    import inspect
    src = inspect.getsource(main)
    assert "ConnectionRequest" not in src, (
        "Legacy ConnectionRequest schema must be deleted (NFR-005 compliance)."
    )
    assert "_age_from_band" not in src, (
        "Legacy _age_from_band helper must be deleted with its caller."
    )
    assert "send_whatsapp" not in src, (
        "send_whatsapp import is now orphaned and must be removed."
    )


@pytest.mark.asyncio
async def test_legacy_form_config_returning_phone_email_deleted():
    """Legacy GET /api/connection/form returning forbidden form schema is gone."""
    import main
    import inspect
    src = inspect.getsource(main)
    # The original handler hardcoded phone+email field labels.
    assert '"Telefone (WhatsApp)"' not in src
    assert '"label":"Email"' not in src


@pytest.mark.asyncio
async def test_portal_router_is_mounted_on_main_app():
    import main
    routes = {r.path for r in main.app.routes if hasattr(r, "path")}
    assert "/api/portal/bootstrap" in routes
    assert "/api/connect" in routes
    assert "/api/sessions/{session_id}/ad-complete" in routes
    assert "/api/sessions/{session_id}/renew" in routes


@pytest.mark.asyncio
async def test_slice3_legacy_login_relocated_to_auth_routes():
    """Slice-3 Decision 7: LoginRequest, DEMO_ACCOUNTS moved out of main.py."""
    import main
    import inspect
    src = inspect.getsource(main)
    assert "class LoginRequest" not in src, (
        "LoginRequest moved to auth_routes.py in slice 3 (auth-hardening)."
    )
    assert "DEMO_ACCOUNTS = {" not in src, (
        "DEMO_ACCOUNTS moved to auth.py in slice 3 (auth-hardening)."
    )
    assert "EmailStr" not in src, (
        "EmailStr import is orphan after LoginRequest move; must be removed."
    )


@pytest.mark.asyncio
async def test_slice3_auth_router_mounted():
    """Slice-3: /api/auth/login + /api/auth/logout served by auth_router."""
    import main
    routes = {r.path for r in main.app.routes if hasattr(r, "path")}
    assert "/api/auth/login" in routes
    assert "/api/auth/logout" in routes


@pytest.mark.asyncio
async def test_slice3_admin_endpoints_have_auth_dependency():
    """Slice-3 Decision 3: every admin endpoint declares verify_token or require_role."""
    import main
    import inspect
    src = inspect.getsource(main)
    # Count occurrences — should be at least 16 across the admin endpoints.
    n_verify = src.count("Depends(verify_token)")
    n_require = src.count("Depends(require_role(")
    assert n_verify + n_require >= 16, (
        f"Expected >=16 auth-gated endpoints; got verify={n_verify} require={n_require}"
    )
