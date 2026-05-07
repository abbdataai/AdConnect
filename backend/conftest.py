"""Shared pytest fixtures for backend tests across slices 1-3.

Module-level env-var setup runs BEFORE any imports, ensuring:
  - auth.py reads JWT_SECRET at module load (slice 3)
  - db.py creates the engine against the test SQLite (slice 3 admin tests)

Fixtures:
  app, client                    portal-only synthetic app (slice 1 tests use these)
  initialized_db                 spins up SQLite + seeds (slice 3 admin tests)
  admin_app, admin_client        full main.app with all 16 admin endpoints + auth (slice 3)
  admin_token / advertiser_token / viewer_token / expired_token / malformed_token   (slice 3)
"""
import os
import time

os.environ.setdefault("JWT_SECRET", "test-secret-for-pytest-only")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_admin_auth.db")

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from portal_routes import SESSIONS, portal_router


@pytest.fixture
def app() -> FastAPI:
    portal_app = FastAPI()
    portal_app.include_router(portal_router)
    return portal_app


@pytest_asyncio.fixture
async def client(app: FastAPI):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def clean_sessions():
    SESSIONS.clear()
    yield
    SESSIONS.clear()


@pytest_asyncio.fixture(scope="session")
async def initialized_db():
    from db import init_db, seed_if_empty
    await init_db()
    await seed_if_empty()
    yield


@pytest_asyncio.fixture
async def admin_client(initialized_db):
    import main
    transport = ASGITransport(app=main.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def admin_token() -> str:
    from auth import mint_token
    return mint_token(sub="admin@mktwifi.com", name="Admin", role="admin")


@pytest.fixture
def advertiser_token() -> str:
    from auth import mint_token
    return mint_token(sub="anunciante@mktwifi.com", name="Anunciante", role="advertiser")


@pytest.fixture
def viewer_token() -> str:
    from auth import mint_token
    return mint_token(sub="viewer@mktwifi.com", name="Visualizador", role="viewer")


@pytest.fixture
def expired_token() -> str:
    from jose import jwt
    from auth import _SECRET, ALGORITHM
    now = int(time.time())
    return jwt.encode(
        {"sub": "x@x.com", "name": "X", "role": "admin", "iat": now - 100, "exp": now - 1},
        _SECRET,
        algorithm=ALGORITHM,
    )


@pytest.fixture
def malformed_token() -> str:
    return "not-a-real-jwt-token"


@pytest.fixture
def role_unknown_token() -> str:
    from jose import jwt
    from auth import _SECRET, ALGORITHM
    now = int(time.time())
    return jwt.encode(
        {"sub": "x@x.com", "name": "X", "role": "godmode", "iat": now, "exp": now + 60},
        _SECRET,
        algorithm=ALGORITHM,
    )
