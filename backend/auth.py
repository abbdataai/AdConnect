"""JWT auth module — slice 3 (Decision 8 closure + NFR-016).

Exposes:
    UserClaims              dataclass (sub, name, role)
    mint_token(...)         → JWT (HS256, 7-day TTL, 5 claims)
    verify_token(...)       FastAPI Depends → UserClaims (401 on failure)
    require_role([...])     factory → Depends (403 on role mismatch)
    DEMO_ACCOUNTS           credential store (relocated from main.py)

Design references: DESIGN_AUTH_HARDENING.md Decisions 1, 4, 5, 6, 10.
"""
import logging
import os
import secrets as _secrets
import time
from dataclasses import dataclass
from typing import Callable, Literal

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError

log = logging.getLogger("auth")

Role = Literal["admin", "advertiser", "viewer"]
ALGORITHM = "HS256"
JWT_TTL_SECONDS = 7 * 24 * 3600

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class UserClaims:
    sub: str
    name: str
    role: Role


def get_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if secret:
        return secret
    env = os.environ.get("ENVIRONMENT", "dev").lower()
    if env in ("production", "prod"):
        raise RuntimeError(
            "JWT_SECRET must be set in production. Refusing to start."
        )
    secret = _secrets.token_urlsafe(32)
    log.warning(
        "JWT_SECRET unset — using random secret. "
        "All tokens invalidate on restart. "
        "Set JWT_SECRET in production."
    )
    return secret


_SECRET = get_secret()


def mint_token(*, sub: str, name: str, role: Role) -> str:
    now = int(time.time())
    payload = {
        "sub": sub,
        "name": name,
        "role": role,
        "iat": now,
        "exp": now + JWT_TTL_SECONDS,
    }
    return jwt.encode(payload, _SECRET, algorithm=ALGORITHM)


def _401(detail: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": 'Bearer realm="api"'},
    )


def verify_token(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> UserClaims:
    if creds is None or creds.scheme.lower() != "bearer":
        log.warning("auth_failed", extra={"event_type": "auth_no_token"})
        raise _401("not_authenticated")
    try:
        payload = jwt.decode(creds.credentials, _SECRET, algorithms=[ALGORITHM])
    except ExpiredSignatureError:
        log.warning("auth_failed", extra={"event_type": "auth_token_expired"})
        raise _401("token_expired")
    except JWTError:
        log.warning("auth_failed", extra={"event_type": "auth_invalid_token"})
        raise _401("invalid_token")
    role = payload.get("role")
    if role not in ("admin", "advertiser", "viewer"):
        log.warning("auth_failed", extra={"event_type": "auth_invalid_role"})
        raise _401("invalid_token")
    sub = payload.get("sub")
    name = payload.get("name")
    if not sub or not name:
        log.warning("auth_failed", extra={"event_type": "auth_missing_claim"})
        raise _401("invalid_token")
    return UserClaims(sub=sub, name=name, role=role)


def require_role(allowed: list[Role]) -> Callable[..., UserClaims]:
    def dep(claims: UserClaims = Depends(verify_token)) -> UserClaims:
        if claims.role not in allowed:
            log.warning(
                "auth_forbidden",
                extra={
                    "event_type": "auth_role_denied",
                    "user_role": claims.role,
                    "allowed": list(allowed),
                },
            )
            raise HTTPException(status_code=403, detail="forbidden")
        return claims
    return dep


DEMO_ACCOUNTS: dict[str, tuple[str, str, Role]] = {
    "admin@mktwifi.com": ("admin123", "Admin", "admin"),
    "anunciante@mktwifi.com": ("anuncio26", "Anunciante", "advertiser"),
    "viewer@mktwifi.com": ("viewer123", "Visualizador", "viewer"),
}
